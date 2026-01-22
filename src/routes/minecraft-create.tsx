import { Route } from "@tanstack/react-router";
import MinecraftCreationStudio from "../components/minecraft/MinecraftCreationStudio";
import { rootRoute } from "./root";

export const minecraftCreateRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/minecraft-create",
  component: MinecraftCreationStudio,
});
