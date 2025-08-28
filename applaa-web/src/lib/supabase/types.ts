export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          skill_level: 'beginner' | 'intermediate' | 'advanced'
          subscription_tier: 'free' | 'pro' | 'team'
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          skill_level?: 'beginner' | 'intermediate' | 'advanced'
          subscription_tier?: 'free' | 'pro' | 'team'
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          skill_level?: 'beginner' | 'intermediate' | 'advanced'
          subscription_tier?: 'free' | 'pro' | 'team'
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      apps: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          type: 'web' | 'expo' | 'flutter'
          template_id: string | null
          status: 'creating' | 'ready' | 'building' | 'error'
          preview_url: string | null
          repository_url: string | null
          deployment_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          type: 'web' | 'expo' | 'flutter'
          template_id?: string | null
          status?: 'creating' | 'ready' | 'building' | 'error'
          preview_url?: string | null
          repository_url?: string | null
          deployment_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          type?: 'web' | 'expo' | 'flutter'
          template_id?: string | null
          status?: 'creating' | 'ready' | 'building' | 'error'
          preview_url?: string | null
          repository_url?: string | null
          deployment_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      app_files: {
        Row: {
          id: string
          app_id: string
          path: string
          content: string | null
          size: number
          mime_type: string
          hash: string
          storage_path: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          app_id: string
          path: string
          content?: string | null
          size: number
          mime_type: string
          hash: string
          storage_path: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          app_id?: string
          path?: string
          content?: string | null
          size?: number
          mime_type?: string
          hash?: string
          storage_path?: string
          created_at?: string
          updated_at?: string
        }
      }
      chats: {
        Row: {
          id: string
          app_id: string
          user_id: string
          title: string
          agent_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          app_id: string
          user_id: string
          title: string
          agent_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          app_id?: string
          user_id?: string
          title?: string
          agent_type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          chat_id: string
          role: 'user' | 'assistant'
          content: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          role: 'user' | 'assistant'
          content: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          role?: 'user' | 'assistant'
          content?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      user_agents: {
        Row: {
          id: string
          user_id: string
          agent_type: string
          configuration: Json
          is_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          agent_type: string
          configuration: Json
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          agent_type?: string
          configuration?: Json
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      dev_environments: {
        Row: {
          id: string
          app_id: string
          container_id: string | null
          status: 'starting' | 'running' | 'stopped' | 'error'
          preview_url: string | null
          port: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          app_id: string
          container_id?: string | null
          status?: 'starting' | 'running' | 'stopped' | 'error'
          preview_url?: string | null
          port?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          app_id?: string
          container_id?: string | null
          status?: 'starting' | 'running' | 'stopped' | 'error'
          preview_url?: string | null
          port?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      mcp_service_logs: {
        Row: {
          id: string
          app_id: string
          service_type: 'playwright' | 'semgrep' | 'flutter'
          operation: string
          status: 'pending' | 'running' | 'completed' | 'failed'
          input_data: Json
          output_data: Json | null
          error_message: string | null
          duration_ms: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          app_id: string
          service_type: 'playwright' | 'semgrep' | 'flutter'
          operation: string
          status?: 'pending' | 'running' | 'completed' | 'failed'
          input_data: Json
          output_data?: Json | null
          error_message?: string | null
          duration_ms?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          app_id?: string
          service_type?: 'playwright' | 'semgrep' | 'flutter'
          operation?: string
          status?: 'pending' | 'running' | 'completed' | 'failed'
          input_data?: Json
          output_data?: Json | null
          error_message?: string | null
          duration_ms?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          app_id: string
          user_id: string
          role: 'owner' | 'editor' | 'viewer'
          invited_by: string
          invited_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string
          app_id: string
          user_id: string
          role: 'owner' | 'editor' | 'viewer'
          invited_by: string
          invited_at?: string
          accepted_at?: string | null
        }
        Update: {
          id?: string
          app_id?: string
          user_id?: string
          role?: 'owner' | 'editor' | 'viewer'
          invited_by?: string
          invited_at?: string
          accepted_at?: string | null
        }
      }
      usage_analytics: {
        Row: {
          id: string
          user_id: string
          app_id: string | null
          event_type: string
          event_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          app_id?: string | null
          event_type: string
          event_data: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          app_id?: string | null
          event_type?: string
          event_data?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}