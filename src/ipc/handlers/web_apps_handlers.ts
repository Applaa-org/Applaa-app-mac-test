import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../../config/supabase.config';
import type { Database } from "../../lib/supabase";

const logger = log.scope("web_apps_handlers");
const handle = createLoggedHandler(logger);

export interface WebAppTemplate {
  id: string;
  name: string;
  details: string;
  category: string;
  previewUrl?: string | null;
  imageUrl?: string | null;
  emoji?: string | null;
  appType: 'web' | 'expo' | 'flutter' | 'godot';
  isDefault?: boolean;
  displayOrder?: number;
  createdAt: Date;
  updatedAt: Date;
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

export function registerWebAppsHandlers() {
  logger.info("Registering web apps IPC handlers...");

  // List web app templates by category or app type
  handle(
    "web-apps:list",
    async (_, params: { category?: string; appType?: 'web' | 'expo' | 'flutter' | 'godot' }): Promise<WebAppTemplate[]> => {
      try {
        const adminClient = getSupabaseAdminClient();
        if (!adminClient) {
          logger.warn("Supabase not configured, returning empty templates list");
          return [];
        }

        let query = adminClient
          .from('web_apps')
          .select('*')
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (params.category) {
          query = query.eq('category', params.category);
        }

        if (params.appType) {
          query = query.eq('app_type', params.appType);
        }

        const { data: templates, error } = await query;

        if (error) {
          logger.error("Failed to list web app templates:", error);
          throw error;
        }

        return (templates || []).map((template) => ({
          id: template.id,
          name: template.name,
          details: template.details,
          category: template.category,
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
        logger.error("Failed to list web app templates:", error);
        throw new Error(`Failed to list web app templates: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}
