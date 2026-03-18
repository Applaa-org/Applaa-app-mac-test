import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import { LearningAcademyLayout } from "@/pages/learning-academy/LearningAcademyLayout";
import { LearningAcademyDashboard } from "@/pages/learning-academy/LearningAcademyDashboard";
import { LearningAcademyCurriculum } from "@/pages/learning-academy/LearningAcademyCurriculum";
import { LearningAcademyCurriculumTopic } from "@/pages/learning-academy/LearningAcademyCurriculumTopic";
import { LearningAcademySchedule } from "@/pages/learning-academy/LearningAcademySchedule";

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
