import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import LibraryPageDisabled from "../app/library/page";

export const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/library",
  component: LibraryPageDisabled,
});