/**
 * Supabase database types — HSSND Content Factory.
 *
 * Generated via the generate_typescript_types tool (this succeeded on this
 * regeneration, unlike an earlier session's attempt noted in prior history —
 * see git blame if that context matters). Regenerate after any schema
 * migration by re-running that tool and overwriting this file.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_action_log: {
        Row: {
          character_id: string | null
          created_at: string
          id: string
          input_summary: Json
          result_status: string
          result_summary: Json
          tool_name: string
          workflow_run_id: string | null
        }
        Insert: {
          character_id?: string | null
          created_at?: string
          id?: string
          input_summary?: Json
          result_status: string
          result_summary?: Json
          tool_name: string
          workflow_run_id?: string | null
        }
        Update: {
          character_id?: string | null
          created_at?: string
          id?: string
          input_summary?: Json
          result_status?: string
          result_summary?: Json
          tool_name?: string
          workflow_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_action_log_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_action_log_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_events: {
        Row: {
          action: string
          actor_channel: string | null
          actor_identifier: string | null
          created_at: string
          id: string
          note: string | null
          scheduled_post_id: string
        }
        Insert: {
          action: string
          actor_channel?: string | null
          actor_identifier?: string | null
          created_at?: string
          id?: string
          note?: string | null
          scheduled_post_id: string
        }
        Update: {
          action?: string
          actor_channel?: string | null
          actor_identifier?: string | null
          created_at?: string
          id?: string
          note?: string | null
          scheduled_post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_events_scheduled_post_id_fkey"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      captions_history: {
        Row: {
          caption: string
          character_id: string
          created_at: string
          id: string
          language: string | null
          meta: Json
          platform: string | null
          scheduled_post_id: string | null
          status: string
        }
        Insert: {
          caption: string
          character_id: string
          created_at?: string
          id?: string
          language?: string | null
          meta?: Json
          platform?: string | null
          scheduled_post_id?: string | null
          status?: string
        }
        Update: {
          caption?: string
          character_id?: string
          created_at?: string
          id?: string
          language?: string | null
          meta?: Json
          platform?: string | null
          scheduled_post_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "captions_history_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captions_history_scheduled_post_id_fkey"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      character_uploads: {
        Row: {
          character_id: string
          created_at: string
          file_name: string
          file_size_bytes: number | null
          id: string
          mime_type: string
          status: string
          storage_path: string
        }
        Insert: {
          character_id: string
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          id?: string
          mime_type: string
          status?: string
          storage_path: string
        }
        Update: {
          character_id?: string
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string
          status?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_uploads_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          avatar_media_id: string | null
          created_at: string
          default_style_profile: Json
          id: string
          name: string
          short_bio: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          avatar_media_id?: string | null
          created_at?: string
          default_style_profile?: Json
          id?: string
          name: string
          short_bio?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_media_id?: string | null
          created_at?: string
          default_style_profile?: Json
          id?: string
          name?: string
          short_bio?: string | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_characters_avatar"
            columns: ["avatar_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          character_id: string
          cost_usd: number | null
          created_at: string
          error: string | null
          fal_endpoint: string
          fal_request_id: string | null
          id: string
          lora_model_id: string | null
          prompt_key: string
          prompt_text: string
          provider: string
          result_media_asset_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          character_id: string
          cost_usd?: number | null
          created_at?: string
          error?: string | null
          fal_endpoint?: string
          fal_request_id?: string | null
          id?: string
          lora_model_id?: string | null
          prompt_key: string
          prompt_text: string
          provider?: string
          result_media_asset_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          character_id?: string
          cost_usd?: number | null
          created_at?: string
          error?: string | null
          fal_endpoint?: string
          fal_request_id?: string | null
          id?: string
          lora_model_id?: string | null
          prompt_key?: string
          prompt_text?: string
          provider?: string
          result_media_asset_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_lora_model_id_fkey"
            columns: ["lora_model_id"]
            isOneToOne: false
            referencedRelation: "lora_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_result_media_asset_id_fkey"
            columns: ["result_media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      lora_models: {
        Row: {
          base_model: string
          character_id: string
          created_at: string
          error: string | null
          fal_request_id: string | null
          id: string
          provider: string
          status: string
          training_completed_at: string | null
          training_started_at: string | null
          trigger_word: string | null
          updated_at: string
          weights_url: string | null
        }
        Insert: {
          base_model?: string
          character_id: string
          created_at?: string
          error?: string | null
          fal_request_id?: string | null
          id?: string
          provider?: string
          status?: string
          training_completed_at?: string | null
          training_started_at?: string | null
          trigger_word?: string | null
          updated_at?: string
          weights_url?: string | null
        }
        Update: {
          base_model?: string
          character_id?: string
          created_at?: string
          error?: string | null
          fal_request_id?: string | null
          id?: string
          provider?: string
          status?: string
          training_completed_at?: string | null
          training_started_at?: string | null
          trigger_word?: string | null
          updated_at?: string
          weights_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lora_models_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          canonical_url: string
          character_id: string | null
          created_at: string
          duration_seconds: number | null
          height: number | null
          id: string
          meta: Json
          motion_template_id: string | null
          origin: string
          reference_set_id: string | null
          source_media_asset_ids: string[]
          source_system_id: string | null
          status: string
          storage_path: string | null
          type: string
          updated_at: string
          width: number | null
          workflow_run_id: string | null
        }
        Insert: {
          canonical_url: string
          character_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          meta?: Json
          motion_template_id?: string | null
          origin: string
          reference_set_id?: string | null
          source_media_asset_ids?: string[]
          source_system_id?: string | null
          status?: string
          storage_path?: string | null
          type: string
          updated_at?: string
          width?: number | null
          workflow_run_id?: string | null
        }
        Update: {
          canonical_url?: string
          character_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          meta?: Json
          motion_template_id?: string | null
          origin?: string
          reference_set_id?: string | null
          source_media_asset_ids?: string[]
          source_system_id?: string | null
          status?: string
          storage_path?: string | null
          type?: string
          updated_at?: string
          width?: number | null
          workflow_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_media_assets_motion_template"
            columns: ["motion_template_id"]
            isOneToOne: false
            referencedRelation: "motion_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_media_assets_reference_set"
            columns: ["reference_set_id"]
            isOneToOne: false
            referencedRelation: "reference_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_media_assets_workflow_run"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      motion_templates: {
        Row: {
          aspect_ratio: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          name: string
          source_video_media_id: string
          status: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          aspect_ratio?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          name: string
          source_video_media_id: string
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          aspect_ratio?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          name?: string
          source_video_media_id?: string
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "motion_templates_source_video_media_id_fkey"
            columns: ["source_video_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_accounts: {
        Row: {
          character_id: string | null
          created_at: string
          display_name: string | null
          handle: string
          id: string
          meta: Json
          platform: string
          status: string
          updated_at: string
        }
        Insert: {
          character_id?: string | null
          created_at?: string
          display_name?: string | null
          handle: string
          id?: string
          meta?: Json
          platform: string
          status?: string
          updated_at?: string
        }
        Update: {
          character_id?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string
          id?: string
          meta?: Json
          platform?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_accounts_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_set_items: {
        Row: {
          created_at: string
          id: string
          media_asset_id: string
          reference_set_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          media_asset_id: string
          reference_set_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          media_asset_id?: string
          reference_set_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "reference_set_items_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_set_items_reference_set_id_fkey"
            columns: ["reference_set_id"]
            isOneToOne: false
            referencedRelation: "reference_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_sets: {
        Row: {
          character_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          character_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          character_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_sets_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_post_targets: {
        Row: {
          caption_override: string | null
          error: string | null
          id: string
          platform_account_id: string
          provider_post_id: string | null
          published_at: string | null
          scheduled_post_id: string
          status: string
        }
        Insert: {
          caption_override?: string | null
          error?: string | null
          id?: string
          platform_account_id: string
          provider_post_id?: string | null
          published_at?: string | null
          scheduled_post_id: string
          status?: string
        }
        Update: {
          caption_override?: string | null
          error?: string | null
          id?: string
          platform_account_id?: string
          provider_post_id?: string | null
          published_at?: string | null
          scheduled_post_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_post_targets_platform_account_id_fkey"
            columns: ["platform_account_id"]
            isOneToOne: false
            referencedRelation: "platform_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_post_targets_scheduled_post_id_fkey"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          caption: string | null
          character_id: string
          created_at: string
          id: string
          primary_media_id: string
          provider_post_ids: Json
          scheduled_at: string | null
          source_system: string
          status: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          character_id: string
          created_at?: string
          id?: string
          primary_media_id: string
          provider_post_ids?: Json
          scheduled_at?: string | null
          source_system?: string
          status?: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          character_id?: string
          created_at?: string
          id?: string
          primary_media_id?: string
          provider_post_ids?: Json
          scheduled_at?: string | null
          source_system?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_primary_media_id_fkey"
            columns: ["primary_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_definitions: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      workflow_runs: {
        Row: {
          character_id: string
          error: string | null
          finished_at: string | null
          id: string
          input: Json
          output: Json
          started_at: string
          status: string
          trigger_source: string
          workflow_definition_id: string
        }
        Insert: {
          character_id: string
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json
          output?: Json
          started_at?: string
          status?: string
          trigger_source: string
          workflow_definition_id: string
        }
        Update: {
          character_id?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json
          output?: Json
          started_at?: string
          status?: string
          trigger_source?: string
          workflow_definition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workflow_definition_id_fkey"
            columns: ["workflow_definition_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
