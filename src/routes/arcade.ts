import { Route } from "@tanstack/react-router";
import { rootRoute } from "./root";
import ArcadePage from "@/pages/arcade";

export const arcadeRoute = new Route({
    getParentRoute: () => rootRoute,
    path: "/arcade",
    component: ArcadePage,
});
