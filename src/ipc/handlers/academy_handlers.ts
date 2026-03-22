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

/** Default from e44852e — Azure nano + model-router fallback matched working setups. */
const DEFAULT_APPY_TUTOR_MODEL: LargeLanguageModel = {
  provider: "azure-openai",
  name: "gpt-5-nano",
};

/** If the model call never completes, abort so the IPC handler always settles. */
const APPY_TUTOR_STREAM_TIMEOUT_MS = 120_000;

/** Building the client (DB/providers) must not hang the IPC forever. */
const APPY_TUTOR_GET_CLIENT_TIMEOUT_MS = 45_000;

/**
 * Hard cap for the whole invoke — prevents Electron "reply was never sent" if something
 * outside `streamResult.text` never settles (e.g. `reasoning` / `usage` promises on some Azure models).
 */
const APPY_TUTOR_IPC_TOTAL_TIMEOUT_MS = 8 * 60 * 1000;

function promiseWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
        ms,
      ),
    ),
  ]);
}

/** Combine user Stop + stream timeout so either aborts the request. */
function mergeAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  const Any = (
    AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }
  ).any;
  if (typeof Any === "function") {
    return Any([a, b]);
  }
  const c = new AbortController();
  if (a.aborted || b.aborted) {
    c.abort();
    return c.signal;
  }
  const onAbort = () => c.abort();
  a.addEventListener("abort", onAbort, { once: true });
  b.addEventListener("abort", onAbort, { once: true });
  return c.signal;
}

/** Resolves/rejects with `promise`, or rejects on `signal` abort — always removes the abort listener. */
function raceAbort<T>(signal: AbortSignal, promise: Promise<T>): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
    };
    promise
      .then((v) => {
        cleanup();
        resolve(v);
      })
      .catch((e) => {
        cleanup();
        reject(e);
      });
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function isAbortError(e: unknown): boolean {
  return (
    e instanceof DOMException && e.name === "AbortError"
  ) || (e instanceof Error && e.name === "AbortError");
}

let appyTutorInvokeAbort: AbortController | null = null;

function abortCurrentAppyTutorInvoke(): void {
  appyTutorInvokeAbort?.abort();
}

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

/** e44852e: user model first; Azure gets model-router fallback if the deployment fails. */
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

function firstDefinedNumber(
  o: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return undefined;
}

function normalizeStreamUsage(u: unknown): AppyTutorResult["usage"] {
  if (u == null || typeof u !== "object") return undefined;
  const o = u as Record<string, unknown>;
  const pt =
    firstDefinedNumber(o, [
      "promptTokens",
      "inputTokens",
      "prompt_token_count",
      "inputTokenCount",
    ]) ?? 0;
  const ct =
    firstDefinedNumber(o, [
      "completionTokens",
      "outputTokens",
      "completion_token_count",
      "outputTokenCount",
    ]) ?? 0;
  let tt = firstDefinedNumber(o, ["totalTokens", "total_token_count"]) ?? 0;
  if (tt <= 0 && pt + ct > 0) tt = pt + ct;
  if (tt <= 0 && pt <= 0 && ct <= 0) return undefined;
  return {
    promptTokens: Math.max(0, Math.round(pt)),
    completionTokens: Math.max(0, Math.round(ct)),
    totalTokens: Math.max(0, Math.round(tt > 0 ? tt : pt + ct)),
  };
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
  /** Present when source is cloud and the provider returned usage. */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /**
   * When true, the UI should offer Retry (stopped, all models failed, IPC error, etc.).
   * Successful offline tips and normal cloud replies omit this or set false.
   */
  retryable?: boolean;
};

function estimateTutorUsage(
  messages: CoreMessage[],
  assistantText: string,
): NonNullable<AppyTutorResult["usage"]> {
  let inputChars = 0;
  for (const m of messages) {
    if (typeof m.content === "string") inputChars += m.content.length;
  }
  const outChars = assistantText.length;
  const promptTokens = Math.max(1, Math.ceil(inputChars / 4));
  const completionTokens = Math.max(1, Math.ceil(outChars / 4));
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

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
      lastGradeScore: r.lastGradeScore ?? null,
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
        lastGradeScore: row.lastGradeScore ?? null,
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
        lastGradeScore,
      }: {
        id?: number;
        name: string;
        projectType: string;
        code: string;
        language: "python" | "javascript" | "react" | "typescript";
        /** Set when Submit & grade runs; omit to keep previous score on save */
        lastGradeScore?: number;
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
          .set({
            name,
            code,
            language,
            updatedAt: now,
            ...(typeof lastGradeScore === "number"
              ? { lastGradeScore }
              : {}),
          })
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
          ...(typeof lastGradeScore === "number" ? { lastGradeScore } : {}),
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

  // Appy Buddy: strong local match skips API; else cloud using Settings / panel model
  ipcMain.handle(
    "academy:appy-tutor",
    async (_, params: AppyTutorParams): Promise<AppyTutorResult> => {
      try {
        return await promiseWithTimeout(
          runAppyTutorCloud(params),
          APPY_TUTOR_IPC_TOTAL_TIMEOUT_MS,
          "academy:appy-tutor (overall)",
        );
      } catch (e) {
        logger.error("academy:appy-tutor fatal", e);
        const msg = e instanceof Error ? e.message : String(e);
        return {
          answer: `Something went wrong: ${msg}`,
          source: "local",
          retryable: true,
        };
      }
    },
  );

  ipcMain.handle("academy:appy-tutor-abort", () => {
    abortCurrentAppyTutorInvoke();
    return { ok: true as const };
  });
}

async function runAppyTutorCloud(
  params: AppyTutorParams,
): Promise<AppyTutorResult> {
      const question = params.question?.trim() ?? "";
      if (!question) {
        throw new Error("Ask a question to get help.");
      }

      const local = getLocalTutorMatch(question);
      if (local.score >= APPY_TUTOR_LOCAL_STRONG_SCORE) {
        return { answer: local.answer, source: "local" as const, retryable: false };
      }

      const invokeAbort = new AbortController();
      appyTutorInvokeAbort = invokeAbort;
      try {
        return await runAppyTutorCloudInner(params, question, local, invokeAbort);
      } finally {
        appyTutorInvokeAbort = null;
      }
}

async function runAppyTutorCloudInner(
  params: AppyTutorParams,
  question: string,
  local: ReturnType<typeof getLocalTutorMatch>,
  invokeAbort: AbortController,
): Promise<AppyTutorResult> {
      const settings = readSettings();
      const primaryModel = resolveAppyTutorModel(params, settings);
      const modelChain = appyTutorModelChain(primaryModel);
      const systemAi =
        "You are Appy Buddy, a friendly study buddy inside Applaa AI Academy. Help with coding (Python, JavaScript, HTML/CSS, React, TypeScript), debugging, and CS/AI concepts. Be concise, use markdown for structure, and give examples when helpful. Do not invent file paths or pretend to run code.";
      const systemLearning =
        "You are Appy Buddy, a friendly study buddy inside Applaa Learning Academy. Help with study skills, curriculum topics, and general school subjects (e.g. maths, science, English). Be accurate, concise, and use markdown. If a question is beyond general guidance, suggest how the student might check with their teacher or textbook.";

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
        if (invokeAbort.signal.aborted) {
          return {
            answer: "Request stopped.",
            source: "local" as const,
            retryable: true,
          };
        }
        try {
          const { modelClient } = await promiseWithTimeout(
            getModelClient(model, settings),
            APPY_TUTOR_GET_CLIENT_TIMEOUT_MS,
            `getModelClient(${model.provider}/${model.name})`,
          );
          const timeoutAbort = new AbortController();
          const timeoutId = setTimeout(() => {
            timeoutAbort.abort();
          }, APPY_TUTOR_STREAM_TIMEOUT_MS);
          try {
            // Restored from e44852e: simple generateText (was reliable). Stream + heavy
            // providerOptions regressed some tutor setups.
            const genPromise = generateText({
              model: modelClient.model,
              system,
              messages,
              maxTokens: 2048,
              temperature: 0.4,
              maxRetries:
                modelClient.builtinProviderId === "openrouter" ? 5 : 2,
              abortSignal: mergeAbortSignals(
                invokeAbort.signal,
                timeoutAbort.signal,
              ),
            });
            const result = await raceAbort(invokeAbort.signal, genPromise);
            const text =
              result.text?.trim() ||
              (typeof result.reasoning === "string"
                ? result.reasoning.trim()
                : "");
            if (text) {
              logger.info(
                `academy:appy-tutor cloud ok model=${model.provider}/${model.name}`,
              );
              let usage = normalizeStreamUsage(result.usage);
              if (!usage) {
                usage = estimateTutorUsage(messages, text);
              }
              return {
                answer: text,
                source: "cloud" as const,
                usage,
                retryable: false,
              };
            }
            lastError = new Error(
              `Empty response from ${model.provider}/${model.name}`,
            );
            logger.warn(
              `academy:appy-tutor model ${model.provider}/${model.name} returned no text`,
            );
          } finally {
            clearTimeout(timeoutId);
          }
        } catch (e) {
          if (invokeAbort.signal.aborted || isAbortError(e)) {
            return {
              answer: "Request stopped.",
              source: "local" as const,
              retryable: true,
            };
          }
          lastError = e;
          logger.warn(
            `academy:appy-tutor model ${model.provider}/${model.name} failed`,
            e,
          );
        }
      }

      logger.error("academy:appy-tutor all cloud models failed", lastError);
      const detail =
        lastError instanceof Error
          ? lastError.message
          : lastError != null
            ? String(lastError)
            : "";
      const hint = detail ? `\n\n**Last error:** ${detail}` : "";
      return {
        answer:
          local.score > 0
            ? `${local.answer}\n\n---\n*(Appy Buddy couldn’t reach the cloud — check **Settings → Providers** for API keys and model names. Showing the closest offline tip above.)*${hint}`
            : `Appy Buddy couldn’t reach the cloud. Add your API keys in **Settings → Providers** and pick a model in the Buddy panel.\n\n**Tip:** Many common questions match offline tips; try words like “explain”, “loop”, or “study”.${hint}`,
        source: "local" as const,
        retryable: true,
      };
}
