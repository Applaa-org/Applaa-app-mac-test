import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import { AcademyLayout } from "@/pages/academy/AcademyLayout";
import { AcademyDashboard } from "@/pages/academy/AcademyDashboard";
import { AcademyLearn } from "@/pages/academy/AcademyLearn";
import { AcademyPlayground } from "@/pages/academy/AcademyPlayground";
import { AcademyChallenges } from "@/pages/academy/AcademyChallenges";
import { AcademyProjects } from "@/pages/academy/AcademyProjects";
import { AcademyProjectDetail } from "@/pages/academy/AcademyProjectDetail";
import { z } from "zod";

export const academyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/academy",
  component: AcademyLayout,
});

export const academyIndexRoute = createRoute({
  getParentRoute: () => academyRoute,
  path: "/",
  component: AcademyDashboard,
});

const academyLearnSearchSchema = z.object({
  track: z.enum(["basics", "python", "javascript", "html", "react", "typescript", "cpp", "ai"]).optional(),
  lessonId: z.string().optional(),
  subTopicId: z.string().optional(),
});

const academyChallengesSearchSchema = z.object({
  track: z.enum(["python", "javascript", "html", "react", "typescript", "ai"]).optional(),
  lessonId: z.string().optional(),
  challengeId: z.string().optional(),
});

export const academyLearnRoute = createRoute({
  getParentRoute: () => academyRoute,
  path: "learn",
  component: AcademyLearn,
  validateSearch: academyLearnSearchSchema,
});

export const academyPlaygroundRoute = createRoute({
  getParentRoute: () => academyRoute,
  path: "playground",
  component: AcademyPlayground,
});

export const academyChallengesRoute = createRoute({
  getParentRoute: () => academyRoute,
  path: "challenges",
  component: AcademyChallenges,
  validateSearch: academyChallengesSearchSchema,
});

export const academyProjectsRoute = createRoute({
  getParentRoute: () => academyRoute,
  path: "projects",
  component: AcademyProjects,
});

export const academyProjectDetailRoute = createRoute({
  getParentRoute: () => academyRoute,
  path: "projects/$projectId",
  component: AcademyProjectDetail,
});

