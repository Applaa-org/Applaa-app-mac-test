import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import SimStudioPage from "../pages/simstudio";

export const simStudioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/simstudio",
  component: SimStudioPage,
});

