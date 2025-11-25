import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";
import { createClient } from '@supabase/supabase-js';
import type { Database } from "../../lib/supabase";

const logger = log.scope("games_handlers");
const handle = createLoggedHandler(logger);

export interface CustomGame {
  id: string;
  name: string;
  imageUrl: string;
  gameUrl: string;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGameParams {
  name: string;
  imageUrl: string;
  gameUrl: string;
}

export interface UpdateGameParams {
  id: string;
  name?: string;
  imageUrl?: string;
  gameUrl?: string;
}

function getSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return null;
  }

  return createClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export function registerGamesHandlers() {
  logger.info("Registering games IPC handlers...");

  // List all games (shared for all users)
  handle(
    "games:list",
    async (): Promise<CustomGame[]> => {
      try {
        const adminClient = getSupabaseAdminClient();
        if (!adminClient) {
          logger.warn("Supabase not configured - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
          return [];
        }

        logger.info("Fetching games from Supabase...");
        const { data: games, error } = await adminClient
          .from('games')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          logger.error("Failed to list games from Supabase:", error);
          logger.error("Error code:", error.code);
          logger.error("Error message:", error.message);
          logger.error("Error details:", error.details);
          logger.error("Error hint:", error.hint);
          throw error;
        }

        logger.info(`Successfully fetched ${games?.length || 0} games from Supabase`);
        return (games || []).map((game) => ({
          id: game.id,
          name: game.name,
          imageUrl: game.image_url,
          gameUrl: game.game_url,
          isDefault: game.is_default,
          createdAt: new Date(game.created_at),
          updatedAt: new Date(game.updated_at),
        }));
      } catch (error) {
        logger.error("Failed to list games:", error);
        throw new Error(`Failed to list games: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Create a new game (shared for all users)
  handle(
    "games:create",
    async (_, params: CreateGameParams): Promise<CustomGame> => {
      try {
        if (!params.name || !params.imageUrl || !params.gameUrl) {
          throw new Error("Name, image URL, and game URL are required");
        }

        const adminClient = getSupabaseAdminClient();
        if (!adminClient) {
          throw new Error("Supabase not configured");
        }

        const { data: game, error } = await adminClient
          .from('games')
          .insert({
            name: params.name,
            image_url: params.imageUrl,
            game_url: params.gameUrl,
            is_default: false, // Custom games are not default
          })
          .select()
          .single();

        if (error) {
          logger.error("Failed to create game:", error);
          throw error;
        }

        return {
          id: game.id,
          name: game.name,
          imageUrl: game.image_url,
          gameUrl: game.game_url,
          isDefault: game.is_default,
          createdAt: new Date(game.created_at),
          updatedAt: new Date(game.updated_at),
        };
      } catch (error) {
        logger.error("Failed to create game:", error);
        throw new Error(`Failed to create game: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Update an existing game
  handle(
    "games:update",
    async (_, params: UpdateGameParams): Promise<CustomGame> => {
      try {
        if (!params.id) {
          throw new Error("Game ID is required");
        }

        const adminClient = getSupabaseAdminClient();
        if (!adminClient) {
          throw new Error("Supabase not configured");
        }

        const updateData: Partial<Database['public']['Tables']['games']['Update']> = {};
        if (params.name !== undefined) updateData.name = params.name;
        if (params.imageUrl !== undefined) updateData.image_url = params.imageUrl;
        if (params.gameUrl !== undefined) updateData.game_url = params.gameUrl;

        if (Object.keys(updateData).length === 0) {
          throw new Error("At least one field must be provided for update");
        }

        const { data: game, error } = await adminClient
          .from('games')
          .update(updateData)
          .eq('id', params.id)
          .select()
          .single();

        if (error) {
          logger.error("Failed to update game:", error);
          throw error;
        }

        if (!game) {
          throw new Error("Game not found");
        }

        return {
          id: game.id,
          name: game.name,
          imageUrl: game.image_url,
          gameUrl: game.game_url,
          isDefault: game.is_default,
          createdAt: new Date(game.created_at),
          updatedAt: new Date(game.updated_at),
        };
      } catch (error) {
        logger.error("Failed to update game:", error);
        throw new Error(`Failed to update game: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Delete a game
  handle(
    "games:delete",
    async (_, params: { id: string }): Promise<{ success: boolean }> => {
      try {
        if (!params.id) {
          throw new Error("Game ID is required");
        }

        const adminClient = getSupabaseAdminClient();
        if (!adminClient) {
          throw new Error("Supabase not configured");
        }

        const { error } = await adminClient
          .from('games')
          .delete()
          .eq('id', params.id);

        if (error) {
          logger.error("Failed to delete game:", error);
          throw error;
        }

        return { success: true };
      } catch (error) {
        logger.error("Failed to delete game:", error);
        throw new Error(`Failed to delete game: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}
