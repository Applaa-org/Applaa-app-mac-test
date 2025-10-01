import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import ChatPage from "../pages/chat";
import { z } from "zod";
import type { FileAttachment } from "@/ipc/ipc_types";

export const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat",
  component: ChatPage,
  validateSearch: z.object({
    id: z.number().optional(),
    // 🚀 NEW: Support initial prompt submission from app creation
    initialPrompt: z.string().optional(),
    initialAttachments: z.string().optional(), // JSON string
  }),
});
