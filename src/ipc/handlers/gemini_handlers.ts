import { ipcMain } from "electron";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAuth } from "google-auth-library";
import { readSettings } from "../../main/settings";
import { getValidAccessToken } from "./gemini_auth_handlers";
import log from "electron-log";

const logger = log.scope("gemini-api");

// Gemini model configurations
const GEMINI_MODELS = [
  {
    name: "gemini-1.5-pro",
    displayName: "Gemini 1.5 Pro",
    description: "Most capable model for complex reasoning tasks",
    maxOutputTokens: 8192,
    contextWindow: 2000000, // 2M tokens
    temperature: 0.7,
  },
  {
    name: "gemini-1.5-flash",
    displayName: "Gemini 1.5 Flash",
    description: "Fast and efficient model for most tasks",
    maxOutputTokens: 8192,
    contextWindow: 1000000, // 1M tokens
    temperature: 0.7,
  },
  {
    name: "gemini-1.5-flash-8b",
    displayName: "Gemini 1.5 Flash-8B",
    description: "Lightweight model for simple tasks",
    maxOutputTokens: 8192,
    contextWindow: 1000000, // 1M tokens
    temperature: 0.7,
  },
];

interface GeminiMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface GeminiCompletionRequest {
  messages: GeminiMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

interface GeminiCompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Get authenticated Gemini client based on current auth mode
 */
async function getGeminiClient(): Promise<{ client: GoogleGenerativeAI; isVertex: boolean }> {
  const settings = readSettings();
  
  if (!settings.enableGemini) {
    throw new Error("Gemini integration is disabled");
  }

  // Check for API key fallback (development only)
  if (process.env.NODE_ENV === "development" && settings.providerSettings?.gemini?.apiKey?.value) {
    logger.info("Using Gemini API key for development");
    const client = new GoogleGenerativeAI(settings.providerSettings.gemini.apiKey.value);
    return { client, isVertex: false };
  }

  // Use OAuth tokens for production
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error("No valid authentication found. Please sign in to Google.");
  }

  // Determine if using Vertex AI or AI Studio
  const isVertex = !!(settings.gemini?.projectId && settings.gemini?.region);
  
  if (isVertex) {
    logger.info(`Using Vertex AI: ${settings.gemini.projectId}@${settings.gemini.region}`);
    // For Vertex AI, we need to use the Google Auth client
    const auth = new GoogleAuth({
      credentials: {
        type: "external_account",
        token: accessToken,
      } as any, // Type assertion for OAuth token
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    
    // Create Vertex AI client (this is a simplified approach)
    // In practice, you'd use the Vertex AI SDK
    const client = new GoogleGenerativeAI(accessToken);
    return { client, isVertex: true };
  } else {
    logger.info("Using AI Studio");
    const client = new GoogleGenerativeAI(accessToken);
    return { client, isVertex: false };
  }
}

/**
 * Convert messages to Gemini format
 */
function convertMessagesToGeminiFormat(messages: GeminiMessage[]): any[] {
  const geminiMessages = [];
  
  for (const message of messages) {
    if (message.role === "system") {
      // System messages are handled differently in Gemini
      geminiMessages.push({
        role: "user",
        parts: [{ text: `System: ${message.content}` }],
      });
    } else {
      geminiMessages.push({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      });
    }
  }
  
  return geminiMessages;
}

// IPC Handlers

/**
 * List available Gemini models
 */
ipcMain.handle("gemini-list-models", async (): Promise<typeof GEMINI_MODELS> => {
  try {
    const settings = readSettings();
    
    if (!settings.enableGemini) {
      return [];
    }

    // TODO: In the future, we could dynamically fetch available models
    // For now, return our predefined list
    logger.info("Returning available Gemini models");
    return GEMINI_MODELS;
  } catch (error) {
    logger.error("Failed to list Gemini models:", error);
    throw new Error(`Failed to list models: ${(error as Error).message}`);
  }
});

/**
 * Complete text using Gemini (non-streaming)
 */
ipcMain.handle("gemini-complete", async (
  _event,
  request: GeminiCompletionRequest
): Promise<GeminiCompletionResponse> => {
  try {
    const { client, isVertex } = await getGeminiClient();
    
    const model = client.getGenerativeModel({ 
      model: request.model || "gemini-1.5-flash",
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.maxTokens || 8192,
      },
    });

    const geminiMessages = convertMessagesToGeminiFormat(request.messages);
    
    // For single-turn conversations, use generateContent
    if (geminiMessages.length === 1) {
      const result = await model.generateContent(geminiMessages[0].parts[0].text);
      const response = await result.response;
      
      return {
        content: response.text(),
        usage: {
          promptTokens: 0, // Gemini doesn't provide token counts in the same way
          completionTokens: 0,
          totalTokens: 0,
        },
      };
    }
    
    // For multi-turn conversations, use chat
    const chat = model.startChat({
      history: geminiMessages.slice(0, -1),
    });
    
    const lastMessage = geminiMessages[geminiMessages.length - 1];
    const result = await chat.sendMessage(lastMessage.parts[0].text);
    const response = await result.response;
    
    logger.info(`Gemini completion successful (${isVertex ? 'Vertex' : 'AI Studio'})`);
    
    return {
      content: response.text(),
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  } catch (error) {
    logger.error("Gemini completion failed:", error);
    throw new Error(`Completion failed: ${(error as Error).message}`);
  }
});

/**
 * Stream text completion using Gemini
 */
ipcMain.handle("gemini-complete-stream", async (
  event,
  request: GeminiCompletionRequest
): Promise<void> => {
  try {
    const { client, isVertex } = await getGeminiClient();
    
    const model = client.getGenerativeModel({ 
      model: request.model || "gemini-1.5-flash",
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.maxTokens || 8192,
      },
    });

    const geminiMessages = convertMessagesToGeminiFormat(request.messages);
    
    // For single-turn conversations
    if (geminiMessages.length === 1) {
      const result = await model.generateContentStream(geminiMessages[0].parts[0].text);
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          event.sender.send("gemini-stream-chunk", { content: chunkText });
        }
      }
    } else {
      // For multi-turn conversations
      const chat = model.startChat({
        history: geminiMessages.slice(0, -1),
      });
      
      const lastMessage = geminiMessages[geminiMessages.length - 1];
      const result = await chat.sendMessageStream(lastMessage.parts[0].text);
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          event.sender.send("gemini-stream-chunk", { content: chunkText });
        }
      }
    }
    
    // Send completion signal
    event.sender.send("gemini-stream-complete");
    logger.info(`Gemini streaming completion successful (${isVertex ? 'Vertex' : 'AI Studio'})`);
  } catch (error) {
    logger.error("Gemini streaming failed:", error);
    event.sender.send("gemini-stream-error", { error: (error as Error).message });
  }
});

/**
 * Health check for Gemini API
 */
ipcMain.handle("gemini-health-check", async (): Promise<{ 
  status: "healthy" | "unhealthy"; 
  error?: string; 
  authMode?: string;
  models?: number;
}> => {
  try {
    const settings = readSettings();
    
    if (!settings.enableGemini) {
      return { status: "unhealthy", error: "Gemini integration is disabled" };
    }

    const { client, isVertex } = await getGeminiClient();
    
    // Try a simple model list or minimal request to verify connectivity
    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Simple test request
    const result = await model.generateContent("Hello");
    const response = await result.response;
    
    if (response.text()) {
      return { 
        status: "healthy", 
        authMode: isVertex ? "vertex" : "ai-studio",
        models: GEMINI_MODELS.length,
      };
    } else {
      return { status: "unhealthy", error: "No response from Gemini API" };
    }
  } catch (error) {
    logger.error("Gemini health check failed:", error);
    return { status: "unhealthy", error: (error as Error).message };
  }
});

/**
 * Register all Gemini API IPC handlers
 */
export function registerGeminiHandlers() {
  // Handlers are already registered above via ipcMain.handle calls
  logger.info("Gemini API handlers registered");
}

// Export models for use in other parts of the app
export { GEMINI_MODELS };
