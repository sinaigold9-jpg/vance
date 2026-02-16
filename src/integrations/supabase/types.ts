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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          amount: number | null
          created_at: string
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          amount?: number | null
          created_at?: string
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          amount?: number | null
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_clicks: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          points_earned: number | null
          user_id: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          points_earned?: number | null
          user_id?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          points_earned?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_clicks_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_images: {
        Row: {
          ad_id: string
          created_at: string
          display_order: number
          id: string
          image_url: string
        }
        Insert: {
          ad_id: string
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
        }
        Update: {
          ad_id?: string
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_images_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_interaction_replies: {
        Row: {
          created_at: string
          id: string
          interaction_id: string
          reply_text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_id: string
          reply_text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_id?: string
          reply_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_interaction_replies_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "ad_interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_interaction_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_interactions: {
        Row: {
          ad_id: string
          comment: string | null
          created_at: string
          id: string
          points_earned: number | null
          rating: number | null
          user_id: string
        }
        Insert: {
          ad_id: string
          comment?: string | null
          created_at?: string
          id?: string
          points_earned?: number | null
          rating?: number | null
          user_id: string
        }
        Update: {
          ad_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          points_earned?: number | null
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_interactions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_views: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_views_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisements: {
        Row: {
          ad_type: Database["public"]["Enums"]["ad_type"]
          approved_at: string | null
          approved_by: string | null
          category: Database["public"]["Enums"]["ad_category"]
          clicks_count: number
          created_at: string
          expires_at: string | null
          external_link: string | null
          full_description: string | null
          id: string
          images: string[] | null
          max_views: number | null
          priority_level: number | null
          promotion_amount: number | null
          promotion_days: number | null
          rejected_reason: string | null
          short_description: string
          status: Database["public"]["Enums"]["ad_status"]
          title: string
          updated_at: string
          user_id: string
          views_count: number
        }
        Insert: {
          ad_type?: Database["public"]["Enums"]["ad_type"]
          approved_at?: string | null
          approved_by?: string | null
          category: Database["public"]["Enums"]["ad_category"]
          clicks_count?: number
          created_at?: string
          expires_at?: string | null
          external_link?: string | null
          full_description?: string | null
          id?: string
          images?: string[] | null
          max_views?: number | null
          priority_level?: number | null
          promotion_amount?: number | null
          promotion_days?: number | null
          rejected_reason?: string | null
          short_description: string
          status?: Database["public"]["Enums"]["ad_status"]
          title: string
          updated_at?: string
          user_id: string
          views_count?: number
        }
        Update: {
          ad_type?: Database["public"]["Enums"]["ad_type"]
          approved_at?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["ad_category"]
          clicks_count?: number
          created_at?: string
          expires_at?: string | null
          external_link?: string | null
          full_description?: string | null
          id?: string
          images?: string[] | null
          max_views?: number | null
          priority_level?: number | null
          promotion_amount?: number | null
          promotion_days?: number | null
          rejected_reason?: string | null
          short_description?: string
          status?: Database["public"]["Enums"]["ad_status"]
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "advertisements_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertisements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_profiles: {
        Row: {
          advertiser_image: string | null
          advertiser_name: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          advertiser_image?: string | null
          advertiser_name: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          advertiser_image?: string | null
          advertiser_name?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          is_from_admin: boolean
          is_read: boolean
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_from_admin?: boolean
          is_read?: boolean
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_from_admin?: boolean
          is_read?: boolean
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          valid_date: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          valid_date: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          valid_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_tasks: {
        Row: {
          completed: boolean
          completed_at: string | null
          earnings: number
          id: string
          task_date: string
          task_number: number
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          earnings?: number
          id?: string
          task_date?: string
          task_number: number
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          earnings?: number
          id?: string
          task_date?: string
          task_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      download_counter: {
        Row: {
          count: number
          daily_increment_used: number
          id: string
          last_increment_date: string
          last_updated_at: string
        }
        Insert: {
          count?: number
          daily_increment_used?: number
          id?: string
          last_increment_date?: string
          last_updated_at?: string
        }
        Update: {
          count?: number
          daily_increment_used?: number
          id?: string
          last_increment_date?: string
          last_updated_at?: string
        }
        Relationships: []
      }
      export_access_keys: {
        Row: {
          access_key: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          is_revoked: boolean
          is_used: boolean
          revoked_at: string | null
          used_at: string | null
          used_ip: string | null
        }
        Insert: {
          access_key: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          is_revoked?: boolean
          is_used?: boolean
          revoked_at?: string | null
          used_at?: string | null
          used_ip?: string | null
        }
        Update: {
          access_key?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          is_revoked?: boolean
          is_used?: boolean
          revoked_at?: string | null
          used_at?: string | null
          used_ip?: string | null
        }
        Relationships: []
      }
      export_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          key_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          key_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          key_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "export_logs_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "export_access_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          related_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      package_upgrade_requests: {
        Row: {
          amount: number | null
          created_at: string
          current_package: Database["public"]["Enums"]["account_type"]
          id: string
          processed_at: string | null
          processed_by: string | null
          receipt_url: string | null
          requested_package: Database["public"]["Enums"]["account_type"]
          status: Database["public"]["Enums"]["transaction_status"]
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          current_package: Database["public"]["Enums"]["account_type"]
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          receipt_url?: string | null
          requested_package: Database["public"]["Enums"]["account_type"]
          status?: Database["public"]["Enums"]["transaction_status"]
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          current_package?: Database["public"]["Enums"]["account_type"]
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          receipt_url?: string | null
          requested_package?: Database["public"]["Enums"]["account_type"]
          status?: Database["public"]["Enums"]["transaction_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_upgrade_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_upgrade_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          daily_earnings: number
          daily_tasks: number
          has_daily_wheel: boolean
          id: string
          is_active: boolean
          min_withdrawal: number
          name: string
          price: number
          task_duration: number | null
          task_reward: number
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at?: string
          daily_earnings: number
          daily_tasks?: number
          has_daily_wheel?: boolean
          id?: string
          is_active?: boolean
          min_withdrawal: number
          name: string
          price: number
          task_duration?: number | null
          task_reward: number
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          daily_earnings?: number
          daily_tasks?: number
          has_daily_wheel?: boolean
          id?: string
          is_active?: boolean
          min_withdrawal?: number
          name?: string
          price?: number
          task_duration?: number | null
          task_reward?: number
        }
        Relationships: []
      }
      profile_change_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          field_name: string
          id: string
          new_value: string
          processed_at: string | null
          processed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          field_name: string
          id?: string
          new_value: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          field_name?: string
          id?: string
          new_value?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_change_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          balance: number
          created_at: string
          daily_attempts_count: number
          email: string | null
          full_name: string
          id: string
          is_package_activated: boolean | null
          last_attempt_date: string | null
          last_wheel_spin: string | null
          lucky_wheel_used: boolean
          membership_id: string | null
          phone: string | null
          points: number | null
          referral_code: string | null
          referred_by: string | null
          team_code: string | null
          team_members_count: number | null
          team_rank: string | null
          total_earnings: number
          trial_end_date: string | null
          updated_at: string
          withdrawal_pin: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          balance?: number
          created_at?: string
          daily_attempts_count?: number
          email?: string | null
          full_name: string
          id: string
          is_package_activated?: boolean | null
          last_attempt_date?: string | null
          last_wheel_spin?: string | null
          lucky_wheel_used?: boolean
          membership_id?: string | null
          phone?: string | null
          points?: number | null
          referral_code?: string | null
          referred_by?: string | null
          team_code?: string | null
          team_members_count?: number | null
          team_rank?: string | null
          total_earnings?: number
          trial_end_date?: string | null
          updated_at?: string
          withdrawal_pin?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          balance?: number
          created_at?: string
          daily_attempts_count?: number
          email?: string | null
          full_name?: string
          id?: string
          is_package_activated?: boolean | null
          last_attempt_date?: string | null
          last_wheel_spin?: string | null
          lucky_wheel_used?: boolean
          membership_id?: string | null
          phone?: string | null
          points?: number | null
          referral_code?: string | null
          referred_by?: string | null
          team_code?: string | null
          team_members_count?: number | null
          team_rank?: string | null
          total_earnings?: number
          trial_end_date?: string | null
          updated_at?: string
          withdrawal_pin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          buttons: Json | null
          content: string
          content_style: Json | null
          created_at: string | null
          created_by: string | null
          display_location: string
          display_order: number | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_type: string | null
          link_url: string | null
          offer_type: string | null
          starts_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          buttons?: Json | null
          content: string
          content_style?: Json | null
          created_at?: string | null
          created_by?: string | null
          display_location?: string
          display_order?: number | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_type?: string | null
          link_url?: string | null
          offer_type?: string | null
          starts_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          buttons?: Json | null
          content?: string
          content_style?: Json | null
          created_at?: string | null
          created_by?: string | null
          display_location?: string
          display_order?: number | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_type?: string | null
          link_url?: string | null
          offer_type?: string | null
          starts_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys: Json
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_reply: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          membership_id: string | null
          message: string
          phone: string
          rating: number | null
          replied_at: string | null
          replied_by: string | null
          status: string
          ticket_type: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          membership_id?: string | null
          message: string
          phone: string
          rating?: number | null
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          ticket_type: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          membership_id?: string | null
          message?: string
          phone?: string
          rating?: number | null
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          ticket_type?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_gateway: Database["public"]["Enums"]["payment_gateway"] | null
          phone_number: string | null
          processed_at: string | null
          processed_by: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_number: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
          wallet_holder_name: string | null
          wallet_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_gateway?:
            | Database["public"]["Enums"]["payment_gateway"]
            | null
          phone_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_number?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
          wallet_holder_name?: string | null
          wallet_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_gateway?:
            | Database["public"]["Enums"]["payment_gateway"]
            | null
          phone_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_number?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
          wallet_holder_name?: string | null
          wallet_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_update_user_balance: {
        Args: {
          _new_account_type?: string
          _new_balance?: number
          _new_earnings?: number
          _new_email?: string
          _new_phone?: string
          _user_id: string
        }
        Returns: undefined
      }
      generate_membership_id: { Args: never; Returns: string }
      generate_transaction_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "beginner" | "vip1" | "vip2" | "vip3"
      ad_category:
        | "clothes"
        | "services"
        | "real_estate"
        | "digital_products"
        | "cars"
        | "electronics"
        | "restaurants"
        | "travel"
        | "health_beauty"
        | "education"
        | "technology"
        | "sports"
        | "hobbies"
        | "events"
        | "entertainment"
        | "hotels"
        | "music"
        | "design"
        | "games"
        | "home_tools"
        | "decor"
        | "office_equipment"
        | "digital_apps"
        | "books"
        | "office_supplies"
        | "finance"
        | "legal_services"
        | "medical_services"
        | "social_services"
        | "cafes"
        | "beverages"
        | "fast_food"
        | "tourism"
        | "online_shopping"
        | "gifts"
        | "jewelry"
        | "accessories"
        | "fashion"
        | "fitness"
        | "mental_health"
        | "workshops"
        | "training_courses"
        | "government_services"
        | "festivals"
        | "educational_events"
        | "digital_services"
        | "seasonal_offers"
        | "jobs"
        | "charity"
        | "community"
      ad_status: "draft" | "pending" | "approved" | "rejected" | "archived"
      ad_type: "free" | "paid"
      app_role: "admin" | "user"
      payment_gateway: "vodafone" | "etisalat" | "orange" | "we"
      transaction_status: "pending" | "approved" | "rejected"
      transaction_type:
        | "deposit"
        | "withdrawal"
        | "task_earning"
        | "referral_earning"
        | "share_earning"
        | "wheel_earning"
        | "team_earning"
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
    Enums: {
      account_type: ["beginner", "vip1", "vip2", "vip3"],
      ad_category: [
        "clothes",
        "services",
        "real_estate",
        "digital_products",
        "cars",
        "electronics",
        "restaurants",
        "travel",
        "health_beauty",
        "education",
        "technology",
        "sports",
        "hobbies",
        "events",
        "entertainment",
        "hotels",
        "music",
        "design",
        "games",
        "home_tools",
        "decor",
        "office_equipment",
        "digital_apps",
        "books",
        "office_supplies",
        "finance",
        "legal_services",
        "medical_services",
        "social_services",
        "cafes",
        "beverages",
        "fast_food",
        "tourism",
        "online_shopping",
        "gifts",
        "jewelry",
        "accessories",
        "fashion",
        "fitness",
        "mental_health",
        "workshops",
        "training_courses",
        "government_services",
        "festivals",
        "educational_events",
        "digital_services",
        "seasonal_offers",
        "jobs",
        "charity",
        "community",
      ],
      ad_status: ["draft", "pending", "approved", "rejected", "archived"],
      ad_type: ["free", "paid"],
      app_role: ["admin", "user"],
      payment_gateway: ["vodafone", "etisalat", "orange", "we"],
      transaction_status: ["pending", "approved", "rejected"],
      transaction_type: [
        "deposit",
        "withdrawal",
        "task_earning",
        "referral_earning",
        "share_earning",
        "wheel_earning",
        "team_earning",
      ],
    },
  },
} as const
