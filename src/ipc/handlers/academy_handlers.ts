import { ipcMain } from "electron";
import { db } from "@/db";
import {
  academyLessonProgress,
  academyProjects,
  academyChallengeAttempts,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getUserId } from "./credit_handlers";
import { getTutorAnswer } from "@/data/academyTutorKnowledge";
import log from "electron-log";

const logger = log.scope("academy-handlers");

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
}
