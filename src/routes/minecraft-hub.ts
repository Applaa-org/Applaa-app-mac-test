import { Route } from "@tanstack/react-router";
import MinecraftTemplateHub from "../pages/MinecraftTemplateHub";
import { rootRoute } from "./root";

export const minecraftHubRoute = new Route({
    getParentRoute: () => rootRoute,
    path: "/minecraft-hub",
    component: MinecraftTemplateHub,
});
