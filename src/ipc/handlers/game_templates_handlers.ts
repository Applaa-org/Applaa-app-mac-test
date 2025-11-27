import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../../config/supabase.config';
import type { Database } from "../../lib/supabase";
import { hasAdminPermission } from "../../utils/permissions";

const logger = log.scope("game_templates_handlers");
const handle = createLoggedHandler(logger);

export interface GameTemplate {
  id: string;
  name: string;
  details: string;
  previewUrl?: string | null;
  imageUrl?: string | null;
  emoji?: string | null;
  appType: 'web' | 'expo' | 'flutter' | 'godot';
  isDefault?: boolean;
  displayOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGameTemplateParams {
  name: string;
  details: string;
  previewUrl?: string;
  imageUrl?: string;
  emoji?: string;
  appType: 'web' | 'expo' | 'flutter' | 'godot';
  displayOrder?: number;
}

export interface UpdateGameTemplateParams {
  id: string;
  name?: string;
  details?: string;
  previewUrl?: string;
  imageUrl?: string;
  emoji?: string;
  appType?: 'web' | 'expo' | 'flutter' | 'godot';
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

export function registerGameTemplatesHandlers() {
  logger.info("Registering game templates IPC handlers...");

  // List game templates by app type
  handle(
    "game-templates:list",
    async (_, params: { appType?: 'web' | 'expo' | 'flutter' | 'godot' }): Promise<GameTemplate[]> => {
      try {
        const adminClient = getSupabaseAdminClient();
        if (!adminClient) {
          logger.warn("Supabase not configured, returning empty templates list");
          return [];
        }

        let query = adminClient
          .from('game_templates')
          .select('*')
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (params.appType) {
          query = query.eq('app_type', params.appType);
        }

        const { data: templates, error } = await query;

        if (error) {
          logger.error("Failed to list game templates:", error);
          throw error;
        }

        return (templates || []).map((template) => ({
          id: template.id,
          name: template.name,
          details: template.details,
          previewUrl: template.preview_url,
          imageUrl: template.image_url,
          emoji: template.emoji,
          appType: template.app_type,
          isDefault: template.is_default,
          displayOrder: template.display_order || 0,
          createdAt: new Date(template.created_at),
          updatedAt: new Date(template.updated_at),
        }));
      } catch (error) {
        logger.error("Failed to list game templates:", error);
        throw new Error(`Failed to list game templates: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Create a new game template
  handle(
    "game-templates:create",
    async (_, params: CreateGameTemplateParams): Promise<GameTemplate> => {
      try {
        // Check admin permission
        if (!hasAdminPermission()) {
          throw new Error("You do not have permission to add game templates. Only authorized users can perform this operation.");
        }

        if (!params.name || !params.details || !params.appType) {
          throw new Error("Name, details, and app type are required");
        }

        const adminClient = getSupabaseAdminClient();
        if (!adminClient) {
          throw new Error("Supabase not configured");
        }

        const { data: template, error } = await adminClient
          .from('game_templates')
          .insert({
            name: params.name,
            details: params.details,
            preview_url: params.previewUrl || null,
            image_url: params.imageUrl || null,
            emoji: params.emoji || null,
            app_type: params.appType,
            is_default: false, // Custom templates are not default
            display_order: params.displayOrder ?? 0,
          })
          .select()
          .single();

        if (error) {
          logger.error("Failed to create game template:", error);
          throw error;
        }

        return {
          id: template.id,
          name: template.name,
          details: template.details,
          previewUrl: template.preview_url,
          imageUrl: template.image_url,
          emoji: template.emoji,
          appType: template.app_type,
          isDefault: template.is_default,
          displayOrder: template.display_order || 0,
          createdAt: new Date(template.created_at),
          updatedAt: new Date(template.updated_at),
        };
      } catch (error) {
        logger.error("Failed to create game template:", error);
        throw new Error(`Failed to create game template: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Update an existing game template
  handle(
    "game-templates:update",
    async (_, params: UpdateGameTemplateParams): Promise<GameTemplate> => {
      try {
        // Check admin permission
        if (!hasAdminPermission()) {
          throw new Error("You do not have permission to edit game templates. Only authorized users can perform this operation.");
        }

        if (!params.id) {
          throw new Error("Template ID is required");
        }

        const adminClient = getSupabaseAdminClient();
        if (!adminClient) {
          throw new Error("Supabase not configured");
        }

        const updateData: Partial<Database['public']['Tables']['game_templates']['Update']> = {};
        if (params.name !== undefined) updateData.name = params.name;
        if (params.details !== undefined) updateData.details = params.details;
        if (params.previewUrl !== undefined) updateData.preview_url = params.previewUrl || null;
        if (params.imageUrl !== undefined) updateData.image_url = params.imageUrl || null;
        if (params.emoji !== undefined) updateData.emoji = params.emoji || null;
        if (params.appType !== undefined) updateData.app_type = params.appType;
        if (params.displayOrder !== undefined) updateData.display_order = params.displayOrder;

        if (Object.keys(updateData).length === 0) {
          throw new Error("At least one field must be provided for update");
        }

        const { data: template, error } = await adminClient
          .from('game_templates')
          .update(updateData)
          .eq('id', params.id)
          .select()
          .single();

        if (error) {
          logger.error("Failed to update game template:", error);
          throw error;
        }

        if (!template) {
          throw new Error("Template not found");
        }

        return {
          id: template.id,
          name: template.name,
          details: template.details,
          previewUrl: template.preview_url,
          imageUrl: template.image_url,
          emoji: template.emoji,
          appType: template.app_type,
          isDefault: template.is_default,
          displayOrder: template.display_order || 0,
          createdAt: new Date(template.created_at),
          updatedAt: new Date(template.updated_at),
        };
      } catch (error) {
        logger.error("Failed to update game template:", error);
        throw new Error(`Failed to update game template: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Delete a game template
  handle(
    "game-templates:delete",
    async (_, params: { id: string }): Promise<{ success: boolean }> => {
      try {
        // Check admin permission
        if (!hasAdminPermission()) {
          throw new Error("You do not have permission to delete game templates. Only authorized users can perform this operation.");
        }

        if (!params.id) {
          throw new Error("Template ID is required");
        }

        const adminClient = getSupabaseAdminClient();
        if (!adminClient) {
          throw new Error("Supabase not configured");
        }

        const { error } = await adminClient
          .from('game_templates')
          .delete()
          .eq('id', params.id);

        if (error) {
          logger.error("Failed to delete game template:", error);
          throw error;
        }

        return { success: true };
      } catch (error) {
        logger.error("Failed to delete game template:", error);
        throw new Error(`Failed to delete game template: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}

