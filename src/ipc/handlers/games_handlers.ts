import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../../config/supabase.config';
import type { Database } from "../../lib/supabase";
import https from 'https';
import http from 'http';
import { hasAdminPermission } from "../../utils/permissions";
import { readSettings } from "../../main/settings";

const logger = log.scope("games_handlers");
const handle = createLoggedHandler(logger);

export interface CustomGame {
  id: string;
  name: string;
  imageUrl: string;
  gameUrl: string;
  isDefault?: boolean;
  displayOrder?: number;
  viewCount?: number;
  likeCount?: number;
  userLiked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGameParams {
  name: string;
  imageUrl: string;
  gameUrl: string;
  displayOrder?: number; // Optional: if not provided, will be set to last position
}

export interface UpdateGameParams {
  id: string;
  name?: string;
  imageUrl?: string;
  gameUrl?: string;
  displayOrder?: number;
}

function getSupabaseAdminClient() {
  const serviceRoleKey = SUPABASE_CONFIG.SERVICE_ROLE_KEY;
  const supabaseUrl = SUPABASE_CONFIG.URL;

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
          .order('display_order', { ascending: true })
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
        
        // Get like counts for each game
        const gameIds = games?.map(g => g.id) || [];
        let likeCounts = new Map<string, number>();
        let userLikes = new Set<string>();
        
        if (gameIds.length > 0) {
          const { data: likes } = await adminClient
            .from('game_likes')
            .select('game_id, user_display_name')
            .in('game_id', gameIds);
          
          // Get current user's display_name for checking if they liked
          const settings = readSettings();
          const currentUserDisplayName = settings.wordpressAuth?.user?.display_name;
          
          // Map likes to games
          likes?.forEach(like => {
            likeCounts.set(like.game_id, (likeCounts.get(like.game_id) || 0) + 1);
            if (like.user_display_name === currentUserDisplayName) {
              userLikes.add(like.game_id);
            }
          });
        }
        
        return (games || []).map((game) => ({
          id: game.id,
          name: game.name,
          imageUrl: game.image_url,
          gameUrl: game.game_url,
          isDefault: game.is_default,
          displayOrder: game.display_order ?? 0,
          viewCount: game.view_count ?? 0,
          likeCount: likeCounts.get(game.id) || 0,
          userLiked: userLikes.has(game.id),
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
        // Check admin permission
        if (!hasAdminPermission()) {
          throw new Error("You do not have permission to add games. Only authorized users can perform this operation.");
        }

        if (!params.name || !params.imageUrl || !params.gameUrl) {
          throw new Error("Name, image URL, and game URL are required");
        }

        const adminClient = getSupabaseAdminClient();
        if (!adminClient) {
          throw new Error("Supabase not configured");
        }

        // If displayOrder is not provided, set it to the last position (max + 1)
        let displayOrder = params.displayOrder;
        if (displayOrder === undefined) {
          const { data: maxGames } = await adminClient
            .from('games')
            .select('display_order')
            .order('display_order', { ascending: false })
            .limit(1);
          
          const maxOrder = maxGames && maxGames.length > 0 ? maxGames[0].display_order : 0;
          displayOrder = maxOrder + 1;
        }

        const { data: game, error } = await adminClient
          .from('games')
          .insert({
            name: params.name,
            image_url: params.imageUrl,
            game_url: params.gameUrl,
            is_default: false, // Custom games are not default
            display_order: displayOrder,
            view_count: 0, // Initialize view count to 0
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
        // Check admin permission
        if (!hasAdminPermission()) {
          throw new Error("You do not have permission to edit games. Only authorized users can perform this operation.");
        }

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
        if (params.displayOrder !== undefined) updateData.display_order = params.displayOrder;

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
          displayOrder: game.display_order ?? 0,
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
        // Check admin permission
        if (!hasAdminPermission()) {
          throw new Error("You do not have permission to delete games. Only authorized users can perform this operation.");
        }

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

  // Increment view count for a game
  handle(
    "games:increment-view",
    async (_, params: { gameId: string }): Promise<void> => {
      try {
        if (!params.gameId) {
          throw new Error("Game ID is required");
        }

        const adminClient = getSupabaseAdminClient();
        if (!adminClient) {
          throw new Error("Supabase not configured");
        }

        // Get current view count and increment
        const { data: game } = await adminClient
          .from('games')
          .select('view_count')
          .eq('id', params.gameId)
          .single();

        const currentViewCount = game?.view_count ?? 0;
        
        // Increment view count
        const { error } = await adminClient
          .from('games')
          .update({ view_count: currentViewCount + 1 })
          .eq('id', params.gameId);

        if (error) {
          logger.error("Failed to increment view count:", error);
          throw error;
        }

        logger.info(`View count incremented for game: ${params.gameId}`);
      } catch (error) {
        logger.error("Failed to increment view count:", error);
        throw new Error(`Failed to increment view count: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Toggle like for a game
  handle(
    "games:toggle-like",
    async (_, params: { gameId: string; userDisplayName: string }): Promise<{ liked: boolean; likeCount: number }> => {
      try {
        if (!params.gameId || !params.userDisplayName) {
          throw new Error("Game ID and user display name are required");
        }

        const adminClient = getSupabaseAdminClient();
        if (!adminClient) {
          throw new Error("Supabase not configured");
        }

        // Check if user already liked this game
        const { data: existingLike } = await adminClient
          .from('game_likes')
          .select('id')
          .eq('game_id', params.gameId)
          .eq('user_display_name', params.userDisplayName)
          .maybeSingle();

        if (existingLike) {
          // Unlike - remove the like
          const { error } = await adminClient
            .from('game_likes')
            .delete()
            .eq('id', existingLike.id);

          if (error) {
            logger.error("Failed to remove like:", error);
            throw error;
          }
        } else {
          // Like - add the like
          const { error } = await adminClient
            .from('game_likes')
            .insert({
              game_id: params.gameId,
              user_display_name: params.userDisplayName,
            });

          if (error) {
            logger.error("Failed to add like:", error);
            throw error;
          }
        }

        // Get updated like count
        const { count } = await adminClient
          .from('game_likes')
          .select('*', { count: 'exact', head: true })
          .eq('game_id', params.gameId);

        logger.info(`Like toggled for game: ${params.gameId}, liked: ${!existingLike}, count: ${count || 0}`);
        
        return {
          liked: !existingLike,
          likeCount: count || 0,
        };
      } catch (error) {
        logger.error("Failed to toggle like:", error);
        throw new Error(`Failed to toggle like: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Test image URL accessibility
  handle(
    "games:test-image-url",
    async (_, params: { url: string }): Promise<{ accessible: boolean; statusCode?: number; error?: string }> => {
      try {
        if (!params.url) {
          throw new Error("URL is required");
        }

        const url = new URL(params.url);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        return new Promise((resolve) => {
          const request = client.request(
            url.toString(),
            {
              method: 'HEAD',
              timeout: 5000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
            },
            (response) => {
              const statusCode = response.statusCode || 0;
              const accessible = statusCode >= 200 && statusCode < 400;
              
              logger.info(`Image URL test: ${params.url} - Status: ${statusCode}, Accessible: ${accessible}`);
              
              resolve({
                accessible,
                statusCode,
              });
              
              // Consume response to free up resources
              response.on('data', () => {});
              response.on('end', () => {});
            }
          );

          request.on('error', (error) => {
            logger.warn(`Image URL test failed: ${params.url} - ${error.message}`);
            resolve({
              accessible: false,
              error: error.message,
            });
          });

          request.on('timeout', () => {
            request.destroy();
            logger.warn(`Image URL test timeout: ${params.url}`);
            resolve({
              accessible: false,
              error: 'Request timeout',
            });
          });

          request.end();
        });
      } catch (error) {
        logger.error("Failed to test image URL:", error);
        return {
          accessible: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  );

  // Test all game image URLs
  handle(
    "games:test-all-images",
    async (): Promise<Array<{ gameName: string; imageUrl: string; accessible: boolean; statusCode?: number; error?: string }>> => {
      try {
        const adminClient = getSupabaseAdminClient();
        if (!adminClient) {
          throw new Error("Supabase not configured");
        }

        const { data: games, error } = await adminClient
          .from('games')
          .select('name, image_url');

        if (error) {
          logger.error("Failed to fetch games for testing:", error);
          throw error;
        }

        logger.info(`Testing ${games?.length || 0} game image URLs...`);

        const results = await Promise.all(
          (games || []).map(async (game) => {
            const url = new URL(game.image_url);
            const isHttps = url.protocol === 'https:';
            const client = isHttps ? https : http;

            return new Promise<{ gameName: string; imageUrl: string; accessible: boolean; statusCode?: number; error?: string }>((resolve) => {
              const request = client.request(
                game.image_url,
                {
                  method: 'HEAD',
                  timeout: 5000,
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  },
                },
                (response) => {
                  const statusCode = response.statusCode || 0;
                  const accessible = statusCode >= 200 && statusCode < 400;
                  
                  logger.info(`✓ ${game.name}: ${game.image_url} - Status: ${statusCode}`);
                  
                  resolve({
                    gameName: game.name,
                    imageUrl: game.image_url,
                    accessible,
                    statusCode,
                  });
                  
                  response.on('data', () => {});
                  response.on('end', () => {});
                }
              );

              request.on('error', (error) => {
                logger.warn(`✗ ${game.name}: ${game.image_url} - ${error.message}`);
                resolve({
                  gameName: game.name,
                  imageUrl: game.image_url,
                  accessible: false,
                  error: error.message,
                });
              });

              request.on('timeout', () => {
                request.destroy();
                logger.warn(`✗ ${game.name}: ${game.image_url} - Timeout`);
                resolve({
                  gameName: game.name,
                  imageUrl: game.image_url,
                  accessible: false,
                  error: 'Request timeout',
                });
              });

              request.end();
            });
          })
        );

        const accessibleCount = results.filter(r => r.accessible).length;
        const failedCount = results.filter(r => !r.accessible).length;
        
        logger.info(`Image URL test complete: ${accessibleCount} accessible, ${failedCount} failed`);

        return results;
      } catch (error) {
        logger.error("Failed to test all image URLs:", error);
        throw new Error(`Failed to test image URLs: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}
