import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
// 🚀 CRITICAL: Lazy load BlocklyPage to prevent blocking app startup
// Blockly library is huge and should only load when user navigates to Blockly
import { lazy, Suspense } from "react";
const BlocklyPageLazy = lazy(() => import("../pages/blockly"));
import { z } from "zod";

// Wrapper component with Suspense
const BlocklyPage = () => (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
        <BlocklyPageLazy />
    </Suspense>
);

export const blocklyRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/blockly",
    component: BlocklyPage,
    validateSearch: z.object({
        id: z.number(),
    }),
});
