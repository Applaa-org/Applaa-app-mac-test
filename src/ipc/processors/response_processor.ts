import { db } from "../../db";
import { chats, messages } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import fs from "node:fs";
import { getDyadAppPath } from "../../paths/paths";
import path from "node:path";
import git from "isomorphic-git";
import { safeJoin } from "../utils/path_utils";
import { exec } from "node:child_process";
import { promisify } from "node:util";

import log from "electron-log";
import { executeAddDependency } from "./executeAddDependency";
import {
  deleteSupabaseFunction,
  deploySupabaseFunctions,
  executeSupabaseSql,
} from "../../supabase_admin/supabase_management_client";
import { isServerFunction } from "../../supabase_admin/supabase_utils";
import { UserSettings } from "../../lib/schemas";
import { gitCommit } from "../utils/git_utils";
import { readSettings } from "@/main/settings";
import { writeMigrationFile } from "../utils/file_utils";
import {
  getDyadWriteTags,
  getDyadRenameTags,
  getDyadDeleteTags,
  getDyadAddDependencyTags,
  getDyadExecuteSqlTags,
} from "../utils/dyad_tag_parser";
import { storeDbTimestampAtCurrentVersion } from "../utils/neon_timestamp_utils";

import { FileUploadsState } from "../utils/file_uploads_state";

const readFile = fs.promises.readFile;
const logger = log.scope("response_processor");

interface Output {
  message: string;
  error: unknown;
}

function getFunctionNameFromPath(input: string): string {
  return path.basename(path.extname(input) ? path.dirname(input) : input);
}

async function readFileFromFunctionPath(input: string): Promise<string> {
  // Sometimes, the path given is a directory, sometimes it's the file itself.
  if (path.extname(input) === "") {
    return readFile(path.join(input, "index.ts"), "utf8");
  }
  return readFile(input, "utf8");
}

export async function processFullResponseActions(
  fullResponse: string,
  chatId: number,
  {
    chatSummary,
    messageId,
  }: {
    chatSummary: string | undefined;
    messageId: number;
  },
): Promise<{
  updatedFiles?: boolean;
  error?: string;
  extraFiles?: string[];
  extraFilesError?: string;
}> {
  const fileUploadsState = FileUploadsState.getInstance();
  const fileUploadsMap = fileUploadsState.getFileUploadsForChat(chatId);
  fileUploadsState.clear();
  logger.log("processFullResponseActions for chatId", chatId);
  // Get the app associated with the chat with legacy fallback
  let chatWithApp: any;
  try {
    chatWithApp = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
      with: {
        app: true,
      },
    });
  } catch (err) {
    logger.warn(
      "response_processor.processFullResponseActions: falling back to legacy SELECT due to:",
      err,
    );
    // Fallback to raw SQL for legacy compatibility
    const chatRow = db.$client
      .prepare("SELECT id, title, app_id as appId, created_at as createdAt FROM chats WHERE id = ?")
      .get(chatId) as any;
    
    if (chatRow) {
      const appRow = db.$client
        .prepare(
          "SELECT id, name, path, created_at as createdAt, " +
            "github_org as githubOrg, github_repo as githubRepo, github_branch as githubBranch, " +
            "supabase_project_id as supabaseProjectId, neon_project_id as neonProjectId, " +
            "neon_development_branch_id as neonDevelopmentBranchId, neon_preview_branch_id as neonPreviewBranchId, " +
            "vercel_project_id as vercelProjectId, vercel_project_name as vercelProjectName, vercel_team_id as vercelTeamId, " +
            "vercel_deployment_url as vercelDeploymentUrl, chat_context as chatContext FROM apps WHERE id = ?"
        )
        .get(chatRow.appId) as any;
      
      if (appRow) {
        if (appRow.createdAt && typeof appRow.createdAt === "number") {
          appRow.createdAt = new Date(appRow.createdAt * 1000);
        }
        // Set missing columns to undefined for compatibility
        appRow.updatedAt = undefined;
        appRow.displayName = undefined;
        appRow.packageId = undefined;
        appRow.slug = undefined;
        
        // Handle chat row timestamps and missing columns
        if (chatRow.createdAt && typeof chatRow.createdAt === "number") {
          chatRow.createdAt = new Date(chatRow.createdAt * 1000);
        }
        chatRow.updatedAt = undefined; // Set missing column to undefined
        
        chatWithApp = {
          ...chatRow,
          app: appRow,
        };
      }
    }
  }
  if (!chatWithApp || !chatWithApp.app) {
    logger.error(`No app found for chat ID: ${chatId}`);
    return {};
  }

  if (
    chatWithApp.app.neonProjectId &&
    chatWithApp.app.neonDevelopmentBranchId
  ) {
    try {
      await storeDbTimestampAtCurrentVersion({
        appId: chatWithApp.app.id,
      });
    } catch (error) {
      logger.error("Error creating Neon branch at current version:", error);
      throw new Error(
        "Could not create Neon branch; database versioning functionality is not working: " +
          error,
      );
    }
  }

  const settings: UserSettings = readSettings();
  const appPath = getDyadAppPath(chatWithApp.app.path);
  const writtenFiles: string[] = [];
  const renamedFiles: string[] = [];
  const deletedFiles: string[] = [];
  let hasChanges = false;

  const warnings: Output[] = [];
  const errors: Output[] = [];

  try {
    // Extract all tags
    const dyadWriteTags = getDyadWriteTags(fullResponse);
    const dyadRenameTags = getDyadRenameTags(fullResponse);
    const dyadDeletePaths = getDyadDeleteTags(fullResponse);
    const dyadAddDependencyPackages = getDyadAddDependencyTags(fullResponse);
    const dyadExecuteSqlQueries = chatWithApp.app.supabaseProjectId
      ? getDyadExecuteSqlTags(fullResponse)
      : [];

    let message: any;
    try {
      message = await db.query.messages.findFirst({
        where: and(
          eq(messages.id, messageId),
          eq(messages.role, "assistant"),
          eq(messages.chatId, chatId),
        ),
      });
    } catch (err) {
      logger.warn(
        "response_processor.processFullResponseActions: falling back to legacy message SELECT due to:",
        err,
      );
      // Fallback to raw SQL for legacy compatibility
      message = db.$client
        .prepare(
          "SELECT id, role, content, chat_id as chatId, created_at as createdAt, " +
            "approval_state as approvalState, commit_hash as commitHash FROM messages " +
            "WHERE id = ? AND role = ? AND chat_id = ?"
        )
        .get(messageId, "assistant", chatId) as any;
      
      if (message) {
        if (message.createdAt && typeof message.createdAt === "number") {
          message.createdAt = new Date(message.createdAt * 1000);
        }
        // Set missing column to undefined for compatibility
        message.updatedAt = undefined;
      }
    }

    if (!message) {
      logger.error(`No message found for ID: ${messageId}`);
      return {};
    }

    // Handle SQL execution tags
    if (dyadExecuteSqlQueries.length > 0) {
      for (const query of dyadExecuteSqlQueries) {
        try {
          await executeSupabaseSql({
            supabaseProjectId: chatWithApp.app.supabaseProjectId!,
            query: query.content,
          });

          // Only write migration file if SQL execution succeeded
          if (settings.enableSupabaseWriteSqlMigration) {
            try {
              const migrationFilePath = await writeMigrationFile(
                appPath,
                query.content,
                query.description,
              );
              writtenFiles.push(migrationFilePath);
            } catch (error) {
              errors.push({
                message: `Failed to write SQL migration file for: ${query.description}`,
                error: error,
              });
            }
          }
        } catch (error) {
          errors.push({
            message: `Failed to execute SQL query: ${query.content}`,
            error: error,
          });
        }
      }
      logger.log(`Executed ${dyadExecuteSqlQueries.length} SQL queries`);
    }

    // TODO: Handle add dependency tags
    if (dyadAddDependencyPackages.length > 0) {
      try {
        await executeAddDependency({
          packages: dyadAddDependencyPackages,
          message: message,
          appPath,
        });
      } catch (error) {
        errors.push({
          message: `Failed to add dependencies: ${dyadAddDependencyPackages.join(
            ", ",
          )}`,
          error: error,
        });
      }
      writtenFiles.push("package.json");
      const pnpmFilename = "pnpm-lock.yaml";
      if (fs.existsSync(safeJoin(appPath, pnpmFilename))) {
        writtenFiles.push(pnpmFilename);
      }
      const packageLockFilename = "package-lock.json";
      if (fs.existsSync(safeJoin(appPath, packageLockFilename))) {
        writtenFiles.push(packageLockFilename);
      }
    }

    //////////////////////
    // File operations //
    // Do it in this order:
    // 1. Deletes
    // 2. Renames
    // 3. Writes
    //
    // Why?
    // - Deleting first avoids path conflicts before the other operations.
    // - LLMs like to rename and then edit the same file.
    //////////////////////

    // Process all file deletions
    for (const filePath of dyadDeletePaths) {
      const fullFilePath = safeJoin(appPath, filePath);

      // Delete the file if it exists
      if (fs.existsSync(fullFilePath)) {
        if (fs.lstatSync(fullFilePath).isDirectory()) {
          fs.rmdirSync(fullFilePath, { recursive: true });
        } else {
          fs.unlinkSync(fullFilePath);
        }
        logger.log(`Successfully deleted file: ${fullFilePath}`);
        deletedFiles.push(filePath);

        // Remove the file from git
        try {
          await git.remove({
            fs,
            dir: appPath,
            filepath: filePath,
          });
        } catch (error) {
          logger.warn(`Failed to git remove deleted file ${filePath}:`, error);
          // Continue even if remove fails as the file was still deleted
        }
      } else {
        logger.warn(`File to delete does not exist: ${fullFilePath}`);
      }
      if (isServerFunction(filePath)) {
        try {
          await deleteSupabaseFunction({
            supabaseProjectId: chatWithApp.app.supabaseProjectId!,
            functionName: getFunctionNameFromPath(filePath),
          });
        } catch (error) {
          errors.push({
            message: `Failed to delete Supabase function: ${filePath}`,
            error: error,
          });
        }
      }
    }

    // Process all file renames
    for (const tag of dyadRenameTags) {
      const fromPath = safeJoin(appPath, tag.from);
      const toPath = safeJoin(appPath, tag.to);

      // Ensure target directory exists
      const dirPath = path.dirname(toPath);
      fs.mkdirSync(dirPath, { recursive: true });

      // Rename the file
      if (fs.existsSync(fromPath)) {
        fs.renameSync(fromPath, toPath);
        logger.log(`Successfully renamed file: ${fromPath} -> ${toPath}`);
        renamedFiles.push(tag.to);

        // Add the new file and remove the old one from git
        await git.add({
          fs,
          dir: appPath,
          filepath: tag.to,
        });
        try {
          await git.remove({
            fs,
            dir: appPath,
            filepath: tag.from,
          });
        } catch (error) {
          logger.warn(`Failed to git remove old file ${tag.from}:`, error);
          // Continue even if remove fails as the file was still renamed
        }
      } else {
        logger.warn(`Source file for rename does not exist: ${fromPath}`);
      }
      if (isServerFunction(tag.from)) {
        try {
          await deleteSupabaseFunction({
            supabaseProjectId: chatWithApp.app.supabaseProjectId!,
            functionName: getFunctionNameFromPath(tag.from),
          });
        } catch (error) {
          warnings.push({
            message: `Failed to delete Supabase function: ${tag.from} as part of renaming ${tag.from} to ${tag.to}`,
            error: error,
          });
        }
      }
      if (isServerFunction(tag.to)) {
        try {
          await deploySupabaseFunctions({
            supabaseProjectId: chatWithApp.app.supabaseProjectId!,
            functionName: getFunctionNameFromPath(tag.to),
            content: await readFileFromFunctionPath(toPath),
          });
        } catch (error) {
          errors.push({
            message: `Failed to deploy Supabase function: ${tag.to} as part of renaming ${tag.from} to ${tag.to}`,
            error: error,
          });
        }
      }
    }

    // Process all file writes
    for (const tag of dyadWriteTags) {
      const filePath = tag.path;
      let content: string | Buffer = tag.content;
      const fullFilePath = safeJoin(appPath, filePath);

      // Check if content (stripped of whitespace) exactly matches a file ID and replace with actual file content
      if (fileUploadsMap) {
        const trimmedContent = tag.content.trim();
        const fileInfo = fileUploadsMap.get(trimmedContent);
        if (fileInfo) {
          try {
            const fileContent = await readFile(fileInfo.filePath);
            content = fileContent;
            logger.log(
              `Replaced file ID ${trimmedContent} with content from ${fileInfo.originalName}`,
            );
          } catch (error) {
            logger.error(
              `Failed to read uploaded file ${fileInfo.originalName}:`,
              error,
            );
            errors.push({
              message: `Failed to read uploaded file: ${fileInfo.originalName}`,
              error: error,
            });
          }
        }
      }

      // Ensure directory exists
      const dirPath = path.dirname(fullFilePath);
      fs.mkdirSync(dirPath, { recursive: true });

      // Write file content
      fs.writeFileSync(fullFilePath, content);
      logger.log(`Successfully wrote file: ${fullFilePath}`);
      writtenFiles.push(filePath);
      if (isServerFunction(filePath) && typeof content === "string") {
        try {
          await deploySupabaseFunctions({
            supabaseProjectId: chatWithApp.app.supabaseProjectId!,
            functionName: path.basename(path.dirname(filePath)),
            content: content,
          });
        } catch (error) {
          errors.push({
            message: `Failed to deploy Supabase function: ${filePath}`,
            error: error,
          });
        }
      }
    }

    // If we have any file changes, commit them all at once
    hasChanges =
      writtenFiles.length > 0 ||
      renamedFiles.length > 0 ||
      deletedFiles.length > 0 ||
      dyadAddDependencyPackages.length > 0;

    logger.log(`hasChanges: ${hasChanges}, writtenFiles: ${writtenFiles.length}, renamedFiles: ${renamedFiles.length}, deletedFiles: ${deletedFiles.length}, addDeps: ${dyadAddDependencyPackages.length}`);

    let uncommittedFiles: string[] = [];
    let extraFilesError: string | undefined;

    if (hasChanges) {
      logger.log(`About to stage ${writtenFiles.length} files:`, writtenFiles);
      
      // If there are no files to stage but hasChanges is true, we might have only dependencies or SQL changes
      if (writtenFiles.length === 0) {
        logger.log("No files to stage, but hasChanges is true due to other operations (dependencies, SQL, etc.)");
        // In this case, we should still commit but won't stage any files
      }
      
      // Initialize git repository if it doesn't exist
      const gitDir = path.join(appPath, '.git');
      if (!fs.existsSync(gitDir)) {
        logger.log(`Git repository not found at: ${gitDir}, initializing...`);
        try {
          // Initialize git repo
          await git.init({
            fs,
            dir: appPath,
            defaultBranch: "main",
          });

          // Stage all existing files
          await git.add({
            fs,
            dir: appPath,
            filepath: ".",
          });

          // Create initial commit
          await gitCommit({
            path: appPath,
            message: "Init Applaa app",
          });
          
          logger.log(`Successfully initialized git repository at: ${gitDir}`);
        } catch (error) {
          logger.error(`Failed to initialize git repository at ${gitDir}:`, error);
          throw new Error(`Failed to initialize git repository: ${error}`);
        }
      }
      
      // Only stage files if there are files to stage
      if (writtenFiles.length > 0) {
        // Verify files exist before staging
        for (const file of writtenFiles) {
          const fullPath = path.join(appPath, file);
          if (!fs.existsSync(fullPath)) {
            logger.error(`File does not exist for staging: ${fullPath}`);
            throw new Error(`Cannot stage file that doesn't exist: ${file}`);
          }
          logger.log(`Verified file exists: ${fullPath}`);
        }
        
        // Stage all written files using the same git implementation that will be used for commit
        const settings = readSettings();
        const execAsync = promisify(exec);
        
        if (settings.enableNativeGit) {
          logger.log("Using native git for staging");
          // Use native git to stage files
          for (const file of writtenFiles) {
            try {
              logger.log(`Staging file with native git: ${file}`);
              await execAsync(`git -C "${appPath}" add "${file.replace(/"/g, '\\"')}"`);
            } catch (error) {
              logger.error(`Failed to stage file ${file}:`, error);
              throw new Error(`Failed to stage file ${file}: ${error}`);
            }
          }
        } else {
          logger.log("Using isomorphic-git for staging");
          // Use isomorphic-git to stage files
          for (const file of writtenFiles) {
            try {
              logger.log(`Staging file with isomorphic-git: ${file}`);
              await git.add({
                fs,
                dir: appPath,
                filepath: file,
              });
            } catch (error) {
              logger.error(`Failed to stage file ${file}:`, error);
              throw new Error(`Failed to stage file ${file}: ${error}`);
            }
          }
        }
        
        logger.log("All files staged successfully");
      } else {
        logger.log("No files to stage, skipping staging process");
      }
      
      // Check git status before committing
      const settings = readSettings();
      const execAsync = promisify(exec);
      
      if (settings.enableNativeGit) {
        try {
          const { stdout } = await execAsync(`git -C "${appPath}" status --porcelain`);
          logger.log("Git status before commit:", stdout);
          if (!stdout.trim()) {
            logger.warn("No staged changes detected before commit");
          }
        } catch (error) {
          logger.error("Failed to check git status:", error);
        }
      } else {
        try {
          // Limit status check to the files we touched to avoid traversing node_modules
          const filepathsToCheck = Array.from(new Set([...writtenFiles, ...renamedFiles]));
          if (filepathsToCheck.length > 0) {
            const statusMatrix = await git.statusMatrix({ fs, dir: appPath, filepaths: filepathsToCheck });
            const stagedFiles = statusMatrix.filter(row => row[2] !== row[3]).map(row => row[0]);
            logger.log("Staged files:", stagedFiles);
            if (stagedFiles.length === 0) {
              logger.warn("No staged changes detected before commit");
            }
          }
        } catch (error) {
          // Do not fail the flow if status inspection hits transient files under node_modules
          logger.warn("Skipping broad git status scan due to error:", error);
        }
      }

      // Create commit with details of all changes
      const changes = [];
      if (writtenFiles.length > 0)
        changes.push(`wrote ${writtenFiles.length} file(s)`);
      if (renamedFiles.length > 0)
        changes.push(`renamed ${renamedFiles.length} file(s)`);
      if (deletedFiles.length > 0)
        changes.push(`deleted ${deletedFiles.length} file(s)`);
      if (dyadAddDependencyPackages.length > 0)
        changes.push(
          `added ${dyadAddDependencyPackages.join(", ")} package(s)`,
        );
      if (dyadExecuteSqlQueries.length > 0)
        changes.push(`executed ${dyadExecuteSqlQueries.length} SQL queries`);

      let message = chatSummary
        ? `[dyad] ${chatSummary} - ${changes.join(", ")}`
        : `[dyad] ${changes.join(", ")}`;
      // Use chat summary, if provided, or default for commit message
      let commitHash = await gitCommit({
        path: appPath,
        message,
      });
      logger.log(`Successfully committed changes: ${changes.join(", ")}`);

      // Check for any uncommitted changes after the commit (limit scope to touched files)
      try {
        const filepathsToCheck = Array.from(new Set([...writtenFiles, ...renamedFiles]));
        if (filepathsToCheck.length > 0) {
          const statusMatrix = await git.statusMatrix({ fs, dir: appPath, filepaths: filepathsToCheck });
          uncommittedFiles = statusMatrix
            .filter((row) => row[1] !== 1 || row[2] !== 1 || row[3] !== 1)
            .map((row) => row[0]);
        } else {
          uncommittedFiles = [];
        }
      } catch (error) {
        logger.warn("Skipping post-commit status scan due to error:", error);
        uncommittedFiles = [];
      }

      if (uncommittedFiles.length > 0) {
        // Stage all changes
        await git.add({
          fs,
          dir: appPath,
          filepath: ".",
        });
        try {
          commitHash = await gitCommit({
            path: appPath,
            message: message + " + extra files edited outside of Applaa",
            amend: true,
          });
          logger.log(
            `Amend commit with changes outside of dyad: ${uncommittedFiles.join(", ")}`,
          );
        } catch (error) {
          // Just log, but don't throw an error because the user can still
          // commit these changes outside of Applaa if needed.
          logger.error(
            `Failed to commit changes outside of dyad: ${uncommittedFiles.join(
              ", ",
            )}`,
          );
          extraFilesError = (error as any).toString();
        }
      }

      // Save the commit hash to the message
      await db
        .update(messages)
        .set({
          commitHash: commitHash,
        })
        .where(eq(messages.id, messageId));
    }
    logger.log("mark as approved: hasChanges", hasChanges);
    // Update the message to approved
    await db
      .update(messages)
      .set({
        approvalState: "approved",
      })
      .where(eq(messages.id, messageId));

    return {
      updatedFiles: hasChanges,
      extraFiles: uncommittedFiles.length > 0 ? uncommittedFiles : undefined,
      extraFilesError,
    };
  } catch (error: unknown) {
    logger.error("Error processing files:", error);
    return { error: (error as any).toString() };
  } finally {
    const appendedContent = `
    ${warnings
      .map(
        (warning) =>
          `<dyad-output type="warning" message="${warning.message}">${warning.error}</dyad-output>`,
      )
      .join("\n")}
    ${errors
      .map(
        (error) =>
          `<dyad-output type="error" message="${error.message}">${error.error}</dyad-output>`,
      )
      .join("\n")}
    `;
    if (appendedContent.length > 0) {
      await db
        .update(messages)
        .set({
          content: fullResponse + "\n\n" + appendedContent,
        })
        .where(eq(messages.id, messageId));
    }
  }
}
