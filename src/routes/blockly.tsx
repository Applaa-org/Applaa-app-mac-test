import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import BlocklyPage from "../pages/blockly";
import { z } from "zod";

export const blocklyRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/blockly",
    component: BlocklyPage,
    validateSearch: z.object({
        id: z.number(),
    }),
});
