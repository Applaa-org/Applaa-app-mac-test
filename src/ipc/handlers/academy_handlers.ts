import { ipcMain } from "electron";
import { db } from "@/db";
import {
  academyLessonProgress,
  academyProjects,
  academyChallengeAttempts,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateText } from "ai";
import type { CoreMessage } from "ai";
import { getUserId } from "./credit_handlers";
import {
  getTutorAnswer,
  getLocalTutorMatch,
  APPY_TUTOR_LOCAL_STRONG_SCORE,
} from "@/data/academyTutorKnowledge";
import log from "electron-log";
import { readSettings } from "../../main/settings";
import { getModelClient } from "../utils/get_model_client";
import type { LargeLanguageModel, UserSettings } from "../../lib/schemas";

const logger = log.scope("academy-handlers");

const APPY_TUTOR_ALLOWED_PROVIDERS = new Set([
  "anthropic",
  "azure-openai",
  "openrouter",
]);

const DEFAULT_APPY_TUTOR_MODEL: LargeLanguageModel = {
  provider: "azure-openai",
  name: "gpt-5-nano",
};

function resolveAppyTutorModel(
  params: AppyTutorParams,
  settings: UserSettings,
): LargeLanguageModel {
  const candidate =
    params.model ?? settings.appyTutorModel ?? DEFAULT_APPY_TUTOR_MODEL;
  if (!APPY_TUTOR_ALLOWED_PROVIDERS.has(candidate.provider)) {
    return DEFAULT_APPY_TUTOR_MODEL;
  }
  return candidate;
}

/** User-selected model first; Azure gets a generic router fallback if the deployment fails. */
function appyTutorModelChain(primary: LargeLanguageModel): LargeLanguageModel[] {
  const chain: LargeLanguageModel[] = [primary];
  if (
    primary.provider === "azure-openai" &&
    primary.name !== "model-router"
  ) {
    chain.push({ provider: "azure-openai", name: "model-router" });
  }
  return chain;
}

export type AppyTutorParams = {
  question: string;
  code?: string;
  pageContext?: string;
  academy: "ai" | "learning";
  history?: { role: "user" | "assistant"; content: string }[];
  model?: LargeLanguageModel;
};

export type AppyTutorResult = {
  answer: string;
  source: "local" | "cloud";
};

async function getUserIdOrNull(): Promise<string | null> {
  try {
    return await getUserId();
  } catch {
    return null;
  }
}

export function registerAcademyHandlers() {
  // Get progress for current user (lessons completed per track)
  ipcMain.handle(
    "academy:get-progress",
    async (): Promise<{
      pythonCompleted: string[];
      javascriptCompleted: string[];
      projectCount: number;
    }> => {
      const userId = await getUserIdOrNull();
      if (!userId) {
        return { pythonCompleted: [], javascriptCompleted: [], projectCount: 0 };
      }
      try {
        const [lessonRows, projectRows] = await Promise.all([
          db
            .select()
            .from(academyLessonProgress)
            .where(eq(academyLessonProgress.userId, userId)),
          db
            .select({ id: academyProjects.id })
            .from(academyProjects)
            .where(eq(academyProjects.userId, userId)),
        ]);
        const pythonCompleted = lessonRows
          .filter((r) => r.track === "python")
          .map((r) => r.lessonId);
        const javascriptCompleted = lessonRows
          .filter((r) => r.track === "javascript")
          .map((r) => r.lessonId);
        const projectCount = projectRows.length;
        return {
          pythonCompleted,
          javascriptCompleted,
          projectCount,
        };
      } catch (err) {
        logger.error("academy:get-progress error", err);
        return { pythonCompleted: [], javascriptCompleted: [], projectCount: 0 };
      }
    }
  );

  // Mark a lesson as completed
  ipcMain.handle(
    "academy:complete-lesson",
    async (
      _,
      { track, lessonId }: { track: "python" | "javascript"; lessonId: string }
    ) => {
      const userId = await getUserId();
      await db.insert(academyLessonProgress).values({
        userId,
        track,
        lessonId,
      });
      return { success: true };
    }
  );

  // Record challenge attempt (optional)
  ipcMain.handle(
    "academy:record-challenge-attempt",
    async (
      _,
      {
        track,
        lessonId,
        passed,
      }: { track: "python" | "javascript"; lessonId: string; passed: boolean }
    ) => {
      const userId = await getUserIdOrNull();
      if (!userId) return { success: true };
      await db.insert(academyChallengeAttempts).values({
        userId,
        track,
        lessonId,
        passed,
      });
      return { success: true };
    }
  );

  // List projects for current user
  ipcMain.handle("academy:list-projects", async () => {
    const userId = await getUserIdOrNull();
    if (!userId) return [];
    const rows = await db
      .select()
      .from(academyProjects)
      .where(eq(academyProjects.userId, userId))
      .orderBy(desc(academyProjects.updatedAt));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      projectType: r.projectType,
      code: r.code,
      language: r.language,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  });

  // Get single project
  ipcMain.handle(
    "academy:get-project",
    async (_, { id }: { id: number }) => {
      const userId = await getUserIdOrNull();
      if (!userId) throw new Error("Sign in to view projects");
      const rows = await db
        .select()
        .from(academyProjects)
        .where(
          and(
            eq(academyProjects.id, id),
            eq(academyProjects.userId, userId)
          )
        );
      const row = rows[0];
      if (!row) throw new Error("Project not found");
      return {
        id: row.id,
        name: row.name,
        projectType: row.projectType,
        code: row.code,
        language: row.language,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }
  );

  // Save project (create or update)
  ipcMain.handle(
    "academy:save-project",
    async (
      _,
      {
        id,
        name,
        projectType,
        code,
        language,
      }: {
        id?: number;
        name: string;
        projectType: string;
        code: string;
        language: "python" | "javascript" | "react" | "typescript";
      }
    ) => {
      const userId = await getUserId();
      const now = new Date();
      if (id != null) {
        const existing = await db
          .select()
          .from(academyProjects)
          .where(
            and(
              eq(academyProjects.id, id),
              eq(academyProjects.userId, userId)
            )
          );
        if (existing.length === 0) throw new Error("Project not found");
        await db
          .update(academyProjects)
          .set({ name, code, language, updatedAt: now })
          .where(eq(academyProjects.id, id));
        return { id, success: true };
      }
      const [inserted] = await db
        .insert(academyProjects)
        .values({
          userId,
          name,
          projectType,
          code,
          language,
        })
        .returning({ id: academyProjects.id });
      return { id: inserted!.id, success: true };
    }
  );

  // Delete project
  ipcMain.handle("academy:delete-project", async (_, { id }: { id: number }) => {
    const userId = await getUserId();
    await db
      .delete(academyProjects)
      .where(
        and(
          eq(academyProjects.id, id),
          eq(academyProjects.userId, userId)
        )
      );
    return { success: true };
  });

  // AI Tutor: offline knowledge base – no LLM, works fully offline
  ipcMain.handle(
    "academy:ai-tutor",
    async (
      _,
      { code, question }: { code: string; question: string }
    ): Promise<{ answer: string }> => {
      const answer = getTutorAnswer(question, code);
      return { answer };
    }
  );

  // Appy Tutor: strong local match skips API; else cloud using Settings / panel model
  ipcMain.handle(
    "academy:appy-tutor",
    async (_, params: AppyTutorParams): Promise<AppyTutorResult> => {
      const question = params.question?.trim() ?? "";
      if (!question) {
        throw new Error("Ask a question to get help.");
      }

      const local = getLocalTutorMatch(question);
      if (local.score >= APPY_TUTOR_LOCAL_STRONG_SCORE) {
        return { answer: local.answer, source: "local" };
      }

      const settings = readSettings();
      const primaryModel = resolveAppyTutorModel(params, settings);
      const modelChain = appyTutorModelChain(primaryModel);
      const systemAi =
        "You are Appy Tutor, a friendly tutor inside Applaa AI Academy. Help with coding (Python, JavaScript, HTML/CSS, React, TypeScript), debugging, and CS/AI concepts. Be concise, use markdown for structure, and give examples when helpful. Do not invent file paths or pretend to run code.";
      const systemLearning =
        "You are Appy Tutor, a friendly tutor inside Applaa Learning Academy. Help with study skills, curriculum topics, and general school subjects (e.g. maths, science, English). Be accurate, concise, and use markdown. If a question is beyond general guidance, suggest how the student might check with their teacher or textbook.";

      const system = params.academy === "learning" ? systemLearning : systemAi;
      const ctxParts: string[] = [];
      if (params.pageContext) {
        ctxParts.push(`Current page/path: ${params.pageContext}`);
      }
      if (params.code?.trim()) {
        ctxParts.push(
          `Optional code from the learner (may be empty):\n\`\`\`\n${params.code.trim().slice(0, 12_000)}\n\`\`\``
        );
      }
      if (local.score >= 1) {
        ctxParts.push(
          `Related offline tip (may be partial — expand or correct as needed):\n${local.answer}`
        );
      }
      const contextBlock =
        ctxParts.length > 0 ? `\n\nContext:\n${ctxParts.join("\n\n")}` : "";

      const history = (params.history ?? []).filter(
        (m) =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim()
      );
      const recent = history.slice(-10);
      const messages: CoreMessage[] = [
        ...recent.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content.trim(),
        })),
        {
          role: "user" as const,
          content: `${question}${contextBlock}`,
        },
      ];

      let lastError: unknown;
      for (const model of modelChain) {
        try {
          const { modelClient } = await getModelClient(model, settings);
          const result = await generateText({
            model: modelClient.model,
            system,
            messages,
            maxTokens: 2048,
            temperature: 0.4,
          });
          const text = result.text?.trim();
          if (text) {
            logger.info(
              `academy:appy-tutor cloud ok model=${model.provider}/${model.name}`,
            );
            return { answer: text, source: "cloud" };
          }
        } catch (e) {
          lastError = e;
          logger.warn(
            `academy:appy-tutor model ${model.provider}/${model.name} failed`,
            e,
          );
        }
      }

      logger.error("academy:appy-tutor all cloud models failed", lastError);
      return {
        answer:
          local.score > 0
            ? `${local.answer}\n\n---\n*(Appy Tutor couldn’t reach the cloud — check **Settings → Providers** for API keys and model names. Showing the closest offline tip above.)*`
            : `Appy Tutor couldn’t reach the cloud. Add your API keys in **Settings → Providers** and pick a model in the tutor panel.\n\n**Tip:** Many common questions match offline tips; try words like “explain”, “loop”, or “study”.`,
        source: "local",
      };
    }
  );
}
