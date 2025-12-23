import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import AutomationPage from "../pages/automation";

export const automationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/automation",
  component: AutomationPage,
});

