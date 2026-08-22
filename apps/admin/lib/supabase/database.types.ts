/**
 * Supabase database types — HSSND Content Factory.
 *
 * NOTE: normally generated via `supabase gen types typescript` (or the
 * generate_typescript_types tool). That call failed with "No approval
 * received" in this environment (confirmed on two separate attempts,
 * against two different Supabase tools), so this file is hand-authored to
 * match the schema actually applied in migration `init`, field for field.
 * Regenerate this file for real the first time the Supabase CLI/tool is
 * available — do not hand-edit further once that's possible.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      characters: {
        Row: {
          id: string;
          name: string;
          slug: string;
          avatar_media_id: string | null;
          short_bio: string | null;
          default_style_profile: Json;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          avatar_media_id?: string | null;
          short_bio?: string | null;
          default_style_profile?: Json;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["characters"]["Insert"]>;
      };
      media_assets: {
        Row: {
          id: string;
          type: string;
          canonical_url: string;
          storage_path: string | null;
          origin: string;
          source_system_id: string | null;
          character_id: string | null;
          reference_set_id: string | null;
          motion_template_id: string | null;
          workflow_run_id: string | null;
          source_media_asset_ids: string[];
          status: string;
          meta: Json;
          width: number | null;
          height: number | null;
          duration_seconds: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          canonical_url: string;
          storage_path?: string | null;
          origin: string;
          source_system_id?: string | null;
          character_id?: string | null;
          reference_set_id?: string | null;
          motion_template_id?: string | null;
          workflow_run_id?: string | null;
          source_media_asset_ids?: string[];
          status?: string;
          meta?: Json;
          width?: number | null;
          height?: number | null;
          duration_seconds?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["media_assets"]["Insert"]>;
      };
      reference_sets: {
        Row: {
          id: string;
          character_id: string;
          name: string;
          description: string | null;
          tags: string[];
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          character_id: string;
          name: string;
          description?: string | null;
          tags?: string[];
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reference_sets"]["Insert"]>;
      };
      reference_set_items: {
        Row: {
          id: string;
          reference_set_id: string;
          media_asset_id: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          reference_set_id: string;
          media_asset_id: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reference_set_items"]["Insert"]>;
      };
      motion_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          source_video_media_id: string;
          duration_seconds: number | null;
          aspect_ratio: string | null;
          tags: string[];
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          source_video_media_id: string;
          duration_seconds?: number | null;
          aspect_ratio?: string | null;
          tags?: string[];
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["motion_templates"]["Insert"]>;
      };
      platform_accounts: {
        Row: {
          id: string;
          platform: string;
          handle: string;
          display_name: string | null;
          character_id: string | null;
          status: string;
          meta: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          platform: string;
          handle: string;
          display_name?: string | null;
          character_id?: string | null;
          status?: string;
          meta?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["platform_accounts"]["Insert"]>;
      };
      workflow_definitions: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          type: string;
          config: Json;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          type: string;
          config?: Json;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workflow_definitions"]["Insert"]>;
      };
      workflow_runs: {
        Row: {
          id: string;
          workflow_definition_id: string;
          character_id: string;
          trigger_source: string;
          input: Json;
          output: Json;
          status: string;
          error: string | null;
          started_at: string;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          workflow_definition_id: string;
          character_id: string;
          trigger_source: string;
          input?: Json;
          output?: Json;
          status?: string;
          error?: string | null;
          started_at?: string;
          finished_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["workflow_runs"]["Insert"]>;
      };
      scheduled_posts: {
        Row: {
          id: string;
          character_id: string;
          primary_media_id: string;
          caption: string | null;
          scheduled_at: string | null;
          status: string;
          source_system: string;
          provider_post_ids: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          character_id: string;
          primary_media_id: string;
          caption?: string | null;
          scheduled_at?: string | null;
          status?: string;
          source_system?: string;
          provider_post_ids?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["scheduled_posts"]["Insert"]>;
      };
      scheduled_post_targets: {
        Row: {
          id: string;
          scheduled_post_id: string;
          platform_account_id: string;
          caption_override: string | null;
          status: string;
          provider_post_id: string | null;
          published_at: string | null;
          error: string | null;
        };
        Insert: {
          id?: string;
          scheduled_post_id: string;
          platform_account_id: string;
          caption_override?: string | null;
          status?: string;
          provider_post_id?: string | null;
          published_at?: string | null;
          error?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["scheduled_post_targets"]["Insert"]>;
      };
      approval_events: {
        Row: {
          id: string;
          scheduled_post_id: string;
          action: string;
          actor_channel: string | null;
          actor_identifier: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          scheduled_post_id: string;
          action: string;
          actor_channel?: string | null;
          actor_identifier?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["approval_events"]["Insert"]>;
      };
      captions_history: {
        Row: {
          id: string;
          character_id: string;
          scheduled_post_id: string | null;
          caption: string;
          platform: string | null;
          language: string | null;
          status: string;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          character_id: string;
          scheduled_post_id?: string | null;
          caption: string;
          platform?: string | null;
          language?: string | null;
          status?: string;
          meta?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["captions_history"]["Insert"]>;
      };
      agent_action_log: {
        Row: {
          id: string;
          character_id: string | null;
          tool_name: string;
          input_summary: Json;
          result_status: string;
          result_summary: Json;
          workflow_run_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          character_id?: string | null;
          tool_name: string;
          input_summary?: Json;
          result_status: string;
          result_summary?: Json;
          workflow_run_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["agent_action_log"]["Insert"]>;
      };
    };
  };
}
