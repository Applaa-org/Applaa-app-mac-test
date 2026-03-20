import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import { LearningAcademyLayout } from "@/pages/learning-academy/LearningAcademyLayout";
import { LearningAcademyDashboard } from "@/pages/learning-academy/LearningAcademyDashboard";
import { LearningAcademyCurriculum } from "@/pages/learning-academy/LearningAcademyCurriculum";
import { LearningAcademyCurriculumTopic } from "@/pages/learning-academy/LearningAcademyCurriculumTopic";
import { LearningAcademySchedule } from "@/pages/learning-academy/LearningAcademySchedule";
import { z } from "zod";

export const learningAcademyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/learning-academy",
  component: LearningAcademyLayout,
});

export const learningAcademyIndexRoute = createRoute({
  getParentRoute: () => learningAcademyRoute,
  path: "/",
  component: LearningAcademyDashboard,
});

export const learningAcademyCurriculumRoute = createRoute({
  getParentRoute: () => learningAcademyRoute,
  path: "curriculum",
  component: LearningAcademyCurriculum,
  validateSearch: z.object({
    // Used by the Topic page "Back to Subject" button to auto-expand the subject.
    subjectId: z.string().optional(),
    // Used to keep the curriculum list filtered to the correct year group.
    year: z.coerce.number().optional(),
  }),
});

export const learningAcademyCurriculumTopicRoute = createRoute({
  getParentRoute: () => learningAcademyRoute,
  path: "curriculum/$subjectId/$topicId",
  component: LearningAcademyCurriculumTopic,
});

export const learningAcademyScheduleRoute = createRoute({
  getParentRoute: () => learningAcademyRoute,
  path: "schedule",
  component: LearningAcademySchedule,
});
