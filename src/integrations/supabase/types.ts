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
      blog_posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      burden_circles: {
        Row: {
          burden_id: string
          created_at: string
          ends_at: string | null
          id: string
          status: string
        }
        Insert: {
          burden_id: string
          created_at?: string
          ends_at?: string | null
          id?: string
          status?: string
        }
        Update: {
          burden_id?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "burden_circles_burden_id_fkey"
            columns: ["burden_id"]
            isOneToOne: true
            referencedRelation: "burdens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "burden_circles_burden_id_fkey"
            columns: ["burden_id"]
            isOneToOne: true
            referencedRelation: "burdens_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      burden_sitters: {
        Row: {
          burden_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          burden_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          burden_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "burden_sitters_burden_id_fkey"
            columns: ["burden_id"]
            isOneToOne: false
            referencedRelation: "burdens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "burden_sitters_burden_id_fkey"
            columns: ["burden_id"]
            isOneToOne: false
            referencedRelation: "burdens_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      burdens: {
        Row: {
          body: string
          created_at: string
          id: string
          is_anonymous: boolean
          lifted_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          lifted_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          lifted_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      circle_members: {
        Row: {
          circle_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          circle_id: string
          id?: string
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          circle_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "burden_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_messages: {
        Row: {
          body: string
          circle_id: string
          created_at: string
          id: string
          is_update: boolean
          user_id: string
        }
        Insert: {
          body: string
          circle_id: string
          created_at?: string
          id?: string
          is_update?: boolean
          user_id: string
        }
        Update: {
          body?: string
          circle_id?: string
          created_at?: string
          id?: string
          is_update?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_messages_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "burden_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_prayers: {
        Row: {
          circle_id: string
          id: string
          prayed_on: string
          user_id: string
        }
        Insert: {
          circle_id: string
          id?: string
          prayed_on?: string
          user_id: string
        }
        Update: {
          circle_id?: string
          id?: string
          prayed_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_prayers_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "burden_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_reports: {
        Row: {
          circle_id: string
          created_at: string
          id: string
          message_id: string
          reporter_id: string
        }
        Insert: {
          circle_id: string
          created_at?: string
          id?: string
          message_id: string
          reporter_id: string
        }
        Update: {
          circle_id?: string
          created_at?: string
          id?: string
          message_id?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_reports_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "burden_circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "circle_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_usage: {
        Row: {
          discernment_count: number
          id: string
          thinkers_count: number
          usage_date: string
          user_id: string
        }
        Insert: {
          discernment_count?: number
          id?: string
          thinkers_count?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          discernment_count?: number
          id?: string
          thinkers_count?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      discernment_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discernment_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discernment_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "discernment_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_archive: {
        Row: {
          ai_analysis: string
          attack_rating: number
          id: string
          original_thought: string
          saved_at: string
          title: string
          user_id: string
        }
        Insert: {
          ai_analysis: string
          attack_rating: number
          id?: string
          original_thought: string
          saved_at?: string
          title: string
          user_id: string
        }
        Update: {
          ai_analysis?: string
          attack_rating?: number
          id?: string
          original_thought?: string
          saved_at?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_style: number
          created_at: string
          current_streak: number
          display_name: string | null
          id: string
          is_public: boolean
          last_active_date: string | null
          theme_preference: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_style?: number
          created_at?: string
          current_streak?: number
          display_name?: string | null
          id?: string
          is_public?: boolean
          last_active_date?: string | null
          theme_preference?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_style?: number
          created_at?: string
          current_streak?: number
          display_name?: string | null
          id?: string
          is_public?: boolean
          last_active_date?: string | null
          theme_preference?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      testimonies: {
        Row: {
          body: string
          burden_id: string | null
          created_at: string
          id: string
          is_public: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          burden_id?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          burden_id?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonies_burden_id_fkey"
            columns: ["burden_id"]
            isOneToOne: false
            referencedRelation: "burdens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonies_burden_id_fkey"
            columns: ["burden_id"]
            isOneToOne: false
            referencedRelation: "burdens_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      testimony_reactions: {
        Row: {
          created_at: string
          id: string
          testimony_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          testimony_id: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          testimony_id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      thinker_posts: {
        Row: {
          ai_analysis: string
          attack_rating: number
          body: string
          created_at: string
          id: string
          is_public: boolean
          post_type: string
          score: number | null
          tags: string[]
          title: string | null
          user_id: string
        }
        Insert: {
          ai_analysis?: string
          attack_rating?: number
          body: string
          created_at?: string
          id?: string
          is_public?: boolean
          post_type?: string
          score?: number | null
          tags?: string[]
          title?: string | null
          user_id: string
        }
        Update: {
          ai_analysis?: string
          attack_rating?: number
          body?: string
          created_at?: string
          id?: string
          is_public?: boolean
          post_type?: string
          score?: number | null
          tags?: string[]
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      thinker_responses: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          scripture_reference: string | null
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          scripture_reference?: string | null
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          scripture_reference?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thinker_responses_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "thinker_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      thinker_votes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "thinker_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "thinker_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verse_comments: {
        Row: {
          book: string
          chapter: number
          comment_body: string
          created_at: string
          id: string
          is_public: boolean
          user_id: string
          verse: number | null
        }
        Insert: {
          book: string
          chapter: number
          comment_body: string
          created_at?: string
          id?: string
          is_public?: boolean
          user_id: string
          verse?: number | null
        }
        Update: {
          book?: string
          chapter?: number
          comment_body?: string
          created_at?: string
          id?: string
          is_public?: boolean
          user_id?: string
          verse?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      burdens_feed: {
        Row: {
          body: string | null
          created_at: string | null
          id: string | null
          is_anonymous: boolean | null
          is_mine: boolean | null
          lifted_at: string | null
          testimony_id: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          is_mine?: never
          lifted_at?: string | null
          testimony_id?: never
          user_id?: never
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          is_mine?: never
          lifted_at?: string | null
          testimony_id?: never
          user_id?: never
        }
        Relationships: []
      }
    }
    Functions: {
      can_join_circle: { Args: { circle: string }; Returns: boolean }
      circle_is_active: { Args: { circle: string }; Returns: boolean }
      circle_member_count: { Args: { circle: string }; Returns: number }
      extend_circle: { Args: { circle: string }; Returns: string }
      get_circle_members: {
        Args: { circle: string }
        Returns: {
          avatar_url: string
          display_name: string
          is_masked: boolean
          is_me: boolean
          member_id: string
          role: string
        }[]
      }
      get_circle_messages: {
        Args: { circle: string }
        Returns: {
          avatar_url: string
          body: string
          created_at: string
          display_name: string
          id: string
          is_author: boolean
          is_masked: boolean
          is_mine: boolean
          is_update: boolean
        }[]
      }
      get_circle_overview: {
        Args: { circle: string }
        Returns: {
          burden_body: string
          ends_at: string
          i_prayed: boolean
          is_anonymous: boolean
          is_author: boolean
          prayed_today: number
          status: string
        }[]
      }
      get_daily_usage: {
        Args: { _user_id: string }
        Returns: {
          discernment_count: number
          thinkers_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage: {
        Args: { _field: string; _user_id: string }
        Returns: number
      }
      is_burden_author: { Args: { _burden: string }; Returns: boolean }
      is_circle_author: { Args: { circle: string }; Returns: boolean }
      is_circle_member: { Args: { circle: string }; Returns: boolean }
      lift_burden: { Args: { _burden: string }; Returns: string }
      lift_circle_burden: { Args: { circle: string }; Returns: string }
      update_user_streak: {
        Args: { p_user_id: string }
        Returns: {
          current_streak: number
          last_active_date: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
