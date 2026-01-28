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
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          sources: Json | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          sources?: Json | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          sources?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          client_id: string
          context_summary: string | null
          created_at: string
          created_by: string | null
          id: string
          last_message_at: string | null
          message_count: number | null
          title: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          context_summary?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          context_summary?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_knowledge_base: {
        Row: {
          added_by: string | null
          client_id: string
          content_text: string
          created_at: string
          embedding: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          source_name: string
          source_reference: string | null
          source_type: string
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          client_id: string
          content_text: string
          created_at?: string
          embedding?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          source_name: string
          source_reference?: string | null
          source_type: string
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          client_id?: string
          content_text?: string
          created_at?: string
          embedding?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          source_name?: string
          source_reference?: string | null
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_base_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_knowledge_base_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_config: {
        Row: {
          api_key_encrypted: string
          created_at: string | null
          environment: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string | null
          environment?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string | null
          environment?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      asaas_customer_links: {
        Row: {
          asaas_customer_cpf_cnpj: string | null
          asaas_customer_email: string | null
          asaas_customer_id: string
          asaas_customer_name: string | null
          client_id: string
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          asaas_customer_cpf_cnpj?: string | null
          asaas_customer_email?: string | null
          asaas_customer_id: string
          asaas_customer_name?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          asaas_customer_cpf_cnpj?: string | null
          asaas_customer_email?: string | null
          asaas_customer_id?: string
          asaas_customer_name?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asaas_customer_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_dashboards: {
        Row: {
          client_id: string
          config: Json | null
          created_at: string
          dashboard_type: string
          embed_url: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          client_id: string
          config?: Json | null
          created_at?: string
          dashboard_type: string
          embed_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          config?: Json | null
          created_at?: string
          dashboard_type?: string
          embed_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_dashboards_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_performance_entries: {
        Row: {
          channel: string | null
          client_id: string
          created_at: string
          created_by: string | null
          diagnostic_id: string | null
          entry_type: string
          id: string
          period_end: string | null
          period_start: string | null
          summary: Json
        }
        Insert: {
          channel?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          diagnostic_id?: string | null
          entry_type?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          summary?: Json
        }
        Update: {
          channel?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          diagnostic_id?: string | null
          entry_type?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "client_performance_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_performance_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_performance_entries_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "inside_sales_diagnostics"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          client_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          cnpj: string | null
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contract_start: string | null
          created_at: string
          id: string
          monthly_fee: number | null
          notes: string | null
          sales_channels: string[] | null
          segment: string
          status: string
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_start?: string | null
          created_at?: string
          id?: string
          monthly_fee?: number | null
          notes?: string | null
          sales_channels?: string[] | null
          segment?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_start?: string | null
          created_at?: string
          id?: string
          monthly_fee?: number | null
          notes?: string | null
          sales_channels?: string[] | null
          segment?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_integrations: {
        Row: {
          api_key_encrypted: string
          client_id: string
          created_at: string
          crm_type: string
          domain: string | null
          id: string
          is_active: boolean
          last_sync_at: string | null
          updated_at: string
        }
        Insert: {
          api_key_encrypted: string
          client_id: string
          created_at?: string
          crm_type: string
          domain?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string
          client_id?: string
          created_at?: string
          crm_type?: string
          domain?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_integrations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      dre_simulations: {
        Row: {
          base_month: string
          client_id: string | null
          cmv_base: number
          cmv_scaling: string
          comissao_base: number
          comissao_scaling: string
          created_at: string
          custos_fixos_base: number
          d_roas: number
          ebitda_minimo: number | null
          frete_base: number
          frete_scaling: string
          g_fix: number
          g_mkt: number
          g_rev: number
          g_ticket: number
          horizon_months: number
          id: string
          imposto_pct: number
          investimento_base: number
          margem_minima: number | null
          model: string
          name: string
          pedidos_base: number
          projection_json: Json | null
          receita_base: number
          retorno_pct: number
          roas_minimo: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          base_month: string
          client_id?: string | null
          cmv_base?: number
          cmv_scaling?: string
          comissao_base?: number
          comissao_scaling?: string
          created_at?: string
          custos_fixos_base?: number
          d_roas?: number
          ebitda_minimo?: number | null
          frete_base?: number
          frete_scaling?: string
          g_fix?: number
          g_mkt?: number
          g_rev?: number
          g_ticket?: number
          horizon_months?: number
          id?: string
          imposto_pct?: number
          investimento_base?: number
          margem_minima?: number | null
          model: string
          name: string
          pedidos_base?: number
          projection_json?: Json | null
          receita_base?: number
          retorno_pct?: number
          roas_minimo?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          base_month?: string
          client_id?: string | null
          cmv_base?: number
          cmv_scaling?: string
          comissao_base?: number
          comissao_scaling?: string
          created_at?: string
          custos_fixos_base?: number
          d_roas?: number
          ebitda_minimo?: number | null
          frete_base?: number
          frete_scaling?: string
          g_fix?: number
          g_mkt?: number
          g_rev?: number
          g_ticket?: number
          horizon_months?: number
          id?: string
          imposto_pct?: number
          investimento_base?: number
          margem_minima?: number | null
          model?: string
          name?: string
          pedidos_base?: number
          projection_json?: Json | null
          receita_base?: number
          retorno_pct?: number
          roas_minimo?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dre_simulations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_diagnostics: {
        Row: {
          carrinhos: number | null
          client_id: string | null
          compras: number | null
          cpc_facebook: number | null
          cpc_google: number | null
          created_at: string
          ctr_facebook: number | null
          ctr_google: number | null
          diagnostico_json: Json | null
          faturamento: number | null
          id: string
          invest_facebook: number | null
          invest_google: number | null
          name: string
          period_label: string | null
          roas: number | null
          status_carrinho_compra: string | null
          status_compra_pagamento: string | null
          status_trafego: string | null
          status_visitante_carrinho: string | null
          taxa_carrinho_compra: number | null
          taxa_compra_pagamento: number | null
          taxa_visitante_carrinho: number | null
          ticket_medio: number | null
          updated_at: string
          user_id: string
          vendas_pagas: number | null
          visitantes: number | null
        }
        Insert: {
          carrinhos?: number | null
          client_id?: string | null
          compras?: number | null
          cpc_facebook?: number | null
          cpc_google?: number | null
          created_at?: string
          ctr_facebook?: number | null
          ctr_google?: number | null
          diagnostico_json?: Json | null
          faturamento?: number | null
          id?: string
          invest_facebook?: number | null
          invest_google?: number | null
          name: string
          period_label?: string | null
          roas?: number | null
          status_carrinho_compra?: string | null
          status_compra_pagamento?: string | null
          status_trafego?: string | null
          status_visitante_carrinho?: string | null
          taxa_carrinho_compra?: number | null
          taxa_compra_pagamento?: number | null
          taxa_visitante_carrinho?: number | null
          ticket_medio?: number | null
          updated_at?: string
          user_id: string
          vendas_pagas?: number | null
          visitantes?: number | null
        }
        Update: {
          carrinhos?: number | null
          client_id?: string | null
          compras?: number | null
          cpc_facebook?: number | null
          cpc_google?: number | null
          created_at?: string
          ctr_facebook?: number | null
          ctr_google?: number | null
          diagnostico_json?: Json | null
          faturamento?: number | null
          id?: string
          invest_facebook?: number | null
          invest_google?: number | null
          name?: string
          period_label?: string | null
          roas?: number | null
          status_carrinho_compra?: string | null
          status_compra_pagamento?: string | null
          status_trafego?: string | null
          status_visitante_carrinho?: string | null
          taxa_carrinho_compra?: number | null
          taxa_compra_pagamento?: number | null
          taxa_visitante_carrinho?: number | null
          ticket_medio?: number | null
          updated_at?: string
          user_id?: string
          vendas_pagas?: number | null
          visitantes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_diagnostics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_events: {
        Row: {
          calendar_id: string
          google_event_id: string
          id: string
          meeting_id: string | null
          synced_at: string | null
        }
        Insert: {
          calendar_id: string
          google_event_id: string
          id?: string
          meeting_id?: string | null
          synced_at?: string | null
        }
        Update: {
          calendar_id?: string
          google_event_id?: string
          id?: string
          meeting_id?: string | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_events_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string | null
          id: string
          refresh_token: string
          token_expiry: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          refresh_token: string
          token_expiry?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          refresh_token?: string
          token_expiry?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inside_sales_diagnostics: {
        Row: {
          channel: string | null
          client_id: string | null
          client_name: string | null
          created_at: string
          created_by: string | null
          id: string
          inputs: Json
          outputs: Json
          period_label: string | null
          stage_status: Json
          targets: Json
          updated_at: string
        }
        Insert: {
          channel?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inputs?: Json
          outputs?: Json
          period_label?: string | null
          stage_status?: Json
          targets?: Json
          updated_at?: string
        }
        Update: {
          channel?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inputs?: Json
          outputs?: Json
          period_label?: string | null
          stage_status?: Json
          targets?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inside_sales_diagnostics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      inside_sales_matrix_rules: {
        Row: {
          action: string
          created_at: string
          id: string
          metric_key: string
          metric_label: string
          situation: string
          sort_order: number
          stage: string
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metric_key: string
          metric_label: string
          situation: string
          sort_order?: number
          stage: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metric_key?: string
          metric_label?: string
          situation?: string
          sort_order?: number
          stage?: string
          updated_at?: string
        }
        Relationships: []
      }
      inside_sales_targets: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          is_default: boolean
          name: string
          targets: Json
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          targets?: Json
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          targets?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inside_sales_targets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_action_links: {
        Row: {
          action_item: Json
          created_at: string
          id: string
          is_task_created: boolean | null
          meeting_id: string
          performance_entry_id: string | null
          task_id: string | null
        }
        Insert: {
          action_item: Json
          created_at?: string
          id?: string
          is_task_created?: boolean | null
          meeting_id: string
          performance_entry_id?: string | null
          task_id?: string | null
        }
        Update: {
          action_item?: Json
          created_at?: string
          id?: string
          is_task_created?: boolean | null
          meeting_id?: string
          performance_entry_id?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_links_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_links_performance_entry_id_fkey"
            columns: ["performance_entry_id"]
            isOneToOne: false
            referencedRelation: "client_performance_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_approval_items: {
        Row: {
          approved_by_client: boolean | null
          created_at: string
          details: string | null
          id: string
          is_approved: boolean | null
          item_type: string
          label: string
          meeting_id: string
          owner_type: string | null
          sort_order: number | null
          task_id: string | null
          value: number | null
        }
        Insert: {
          approved_by_client?: boolean | null
          created_at?: string
          details?: string | null
          id?: string
          is_approved?: boolean | null
          item_type: string
          label: string
          meeting_id: string
          owner_type?: string | null
          sort_order?: number | null
          task_id?: string | null
          value?: number | null
        }
        Update: {
          approved_by_client?: boolean | null
          created_at?: string
          details?: string | null
          id?: string
          is_approved?: boolean | null
          item_type?: string
          label?: string
          meeting_id?: string
          owner_type?: string | null
          sort_order?: number | null
          task_id?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_approval_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_approval_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          id: string
          meeting_id: string
          notes: string | null
          requested_at: string
          requested_by: string | null
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          meeting_id: string
          notes?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          meeting_id?: string
          notes?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_approvals_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_approvals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_channels: {
        Row: {
          channel: string
          clicks: number | null
          conversions: number | null
          cpa: number | null
          cpl: number | null
          created_at: string
          id: string
          impressions: number | null
          investment: number | null
          leads: number | null
          meeting_id: string
          notes: string | null
          revenue: number | null
          roas: number | null
          what_to_adjust: string | null
          what_worked: string | null
        }
        Insert: {
          channel: string
          clicks?: number | null
          conversions?: number | null
          cpa?: number | null
          cpl?: number | null
          created_at?: string
          id?: string
          impressions?: number | null
          investment?: number | null
          leads?: number | null
          meeting_id: string
          notes?: string | null
          revenue?: number | null
          roas?: number | null
          what_to_adjust?: string | null
          what_worked?: string | null
        }
        Update: {
          channel?: string
          clicks?: number | null
          conversions?: number | null
          cpa?: number | null
          cpl?: number | null
          created_at?: string
          id?: string
          impressions?: number | null
          investment?: number | null
          leads?: number | null
          meeting_id?: string
          notes?: string | null
          revenue?: number | null
          roas?: number | null
          what_to_adjust?: string | null
          what_worked?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_channels_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_experiments: {
        Row: {
          created_at: string
          deadline: string | null
          effort: string | null
          how_to_measure: string | null
          id: string
          idea: string
          impact: string | null
          meeting_id: string
          objective: string | null
          responsible_id: string | null
          sort_order: number | null
          task_id: string | null
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          effort?: string | null
          how_to_measure?: string | null
          id?: string
          idea: string
          impact?: string | null
          meeting_id: string
          objective?: string | null
          responsible_id?: string | null
          sort_order?: number | null
          task_id?: string | null
        }
        Update: {
          created_at?: string
          deadline?: string | null
          effort?: string | null
          how_to_measure?: string | null
          id?: string
          idea?: string
          impact?: string | null
          meeting_id?: string
          objective?: string | null
          responsible_id?: string | null
          sort_order?: number | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_experiments_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_experiments_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_experiments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          meeting_id: string
          mime_type: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          meeting_id: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          meeting_id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_files_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_metrics: {
        Row: {
          actual_value: number | null
          created_at: string
          id: string
          meeting_id: string
          metric_key: string
          metric_label: string
          quick_note: string | null
          sort_order: number | null
          target_value: number | null
          unit: string | null
          variation_pct: number | null
        }
        Insert: {
          actual_value?: number | null
          created_at?: string
          id?: string
          meeting_id: string
          metric_key: string
          metric_label: string
          quick_note?: string | null
          sort_order?: number | null
          target_value?: number | null
          unit?: string | null
          variation_pct?: number | null
        }
        Update: {
          actual_value?: number | null
          created_at?: string
          id?: string
          meeting_id?: string
          metric_key?: string
          metric_label?: string
          quick_note?: string | null
          sort_order?: number | null
          target_value?: number | null
          unit?: string | null
          variation_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_metrics_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_minutes: {
        Row: {
          action_items: string[] | null
          analysis_period_end: string | null
          analysis_period_start: string | null
          client_id: string
          content: string
          created_at: string
          created_by: string | null
          duration_min: number | null
          focus_channels: string[] | null
          google_event_id: string | null
          id: string
          linked_dashboards: string[] | null
          linked_tasks: string[] | null
          meeting_date: string
          meeting_link: string | null
          next_period_priority: string | null
          participants: string[] | null
          project_id: string | null
          responsible_id: string | null
          share_token: string | null
          status: string | null
          tags: string[] | null
          template_id: string | null
          template_version: string | null
          title: string
          updated_at: string
        }
        Insert: {
          action_items?: string[] | null
          analysis_period_end?: string | null
          analysis_period_start?: string | null
          client_id: string
          content: string
          created_at?: string
          created_by?: string | null
          duration_min?: number | null
          focus_channels?: string[] | null
          google_event_id?: string | null
          id?: string
          linked_dashboards?: string[] | null
          linked_tasks?: string[] | null
          meeting_date: string
          meeting_link?: string | null
          next_period_priority?: string | null
          participants?: string[] | null
          project_id?: string | null
          responsible_id?: string | null
          share_token?: string | null
          status?: string | null
          tags?: string[] | null
          template_id?: string | null
          template_version?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          action_items?: string[] | null
          analysis_period_end?: string | null
          analysis_period_start?: string | null
          client_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          duration_min?: number | null
          focus_channels?: string[] | null
          google_event_id?: string | null
          id?: string
          linked_dashboards?: string[] | null
          linked_tasks?: string[] | null
          meeting_date?: string
          meeting_link?: string | null
          next_period_priority?: string | null
          participants?: string[] | null
          project_id?: string | null
          responsible_id?: string | null
          share_token?: string | null
          status?: string | null
          tags?: string[] | null
          template_id?: string | null
          template_version?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_minutes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "meeting_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_client: boolean | null
          meeting_id: string
          name: string
          role: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_client?: boolean | null
          meeting_id: string
          name: string
          role?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_client?: boolean | null
          meeting_id?: string
          name?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_sections: {
        Row: {
          content_json: Json | null
          created_at: string
          id: string
          is_collapsed: boolean | null
          meeting_id: string
          metadata: Json | null
          section_key: string
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          content_json?: Json | null
          created_at?: string
          id?: string
          is_collapsed?: boolean | null
          meeting_id: string
          metadata?: Json | null
          section_key: string
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          content_json?: Json | null
          created_at?: string
          id?: string
          is_collapsed?: boolean | null
          meeting_id?: string
          metadata?: Json | null
          section_key?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_sections_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_templates: {
        Row: {
          created_at: string
          description: string | null
          estimated_time_min: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          schema_json: Json | null
          template_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_time_min?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          schema_json?: Json | null
          template_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_time_min?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          schema_json?: Json | null
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          project_id: string | null
          recipient_id: string
          sender_id: string
          subject: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          project_id?: string | null
          recipient_id: string
          sender_id: string
          subject: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          project_id?: string | null
          recipient_id?: string
          sender_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_pricing_simulations: {
        Row: {
          ads_cost: number
          client_id: string | null
          cogs: number
          commission_pct: number
          created_at: string
          fixed_fee: number
          has_free_shipping: boolean
          id: string
          listing_type: string
          mode: string
          name: string
          other_cost: number
          packaging_cost: number
          platform_cost: number
          product_condition: string | null
          sale_price: number | null
          shipping_cost: number
          sku: string | null
          target_type: string | null
          target_value: number | null
          tax_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ads_cost?: number
          client_id?: string | null
          cogs?: number
          commission_pct?: number
          created_at?: string
          fixed_fee?: number
          has_free_shipping?: boolean
          id?: string
          listing_type: string
          mode: string
          name: string
          other_cost?: number
          packaging_cost?: number
          platform_cost?: number
          product_condition?: string | null
          sale_price?: number | null
          shipping_cost?: number
          sku?: string | null
          target_type?: string | null
          target_value?: number | null
          tax_pct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ads_cost?: number
          client_id?: string | null
          cogs?: number
          commission_pct?: number
          created_at?: string
          fixed_fee?: number
          has_free_shipping?: boolean
          id?: string
          listing_type?: string
          mode?: string
          name?: string
          other_cost?: number
          packaging_cost?: number
          platform_cost?: number
          product_condition?: string | null
          sale_price?: number | null
          shipping_cost?: number
          sku?: string | null
          target_type?: string | null
          target_value?: number | null
          tax_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_pricing_simulations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_comments: boolean
          email_invoices: boolean
          email_meetings: boolean
          email_payments: boolean
          email_tasks: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_comments?: boolean
          email_invoices?: boolean
          email_meetings?: boolean
          email_payments?: boolean
          email_tasks?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_comments?: boolean
          email_invoices?: boolean
          email_meetings?: boolean
          email_payments?: boolean
          email_tasks?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_invoices: {
        Row: {
          client_id: string
          file_name: string
          file_path: string
          id: string
          payment_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          file_name: string
          file_path: string
          id?: string
          payment_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          file_name?: string
          file_path?: string
          id?: string
          payment_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_matrix_diagnostics: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          inputs: Json
          insights: Json
          name: string
          notes: string | null
          outputs: Json
          period_label: string | null
          setor: string
          simulation_data: Json | null
          status: string | null
          tool_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          inputs?: Json
          insights?: Json
          name: string
          notes?: string | null
          outputs?: Json
          period_label?: string | null
          setor: string
          simulation_data?: Json | null
          status?: string | null
          tool_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          inputs?: Json
          insights?: Json
          name?: string
          notes?: string | null
          outputs?: Json
          period_label?: string | null
          setor?: string
          simulation_data?: Json | null
          status?: string | null
          tool_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_matrix_diagnostics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_matrix_diagnostics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_simulation_scenarios: {
        Row: {
          benchmark_data: Json | null
          client_id: string | null
          created_at: string
          created_by: string | null
          current_results: Json
          id: string
          inputs: Json
          name: string
          notes: string | null
          setor: string
          simulated_rates: Json
          simulated_results: Json
          updated_at: string
        }
        Insert: {
          benchmark_data?: Json | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          current_results?: Json
          id?: string
          inputs?: Json
          name: string
          notes?: string | null
          setor: string
          simulated_rates?: Json
          simulated_results?: Json
          updated_at?: string
        }
        Update: {
          benchmark_data?: Json | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          current_results?: Json
          id?: string
          inputs?: Json
          name?: string
          notes?: string | null
          setor?: string
          simulated_rates?: Json
          simulated_results?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_simulation_scenarios_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_simulation_scenarios_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      projections: {
        Row: {
          channel: string
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          inputs: Json
          mode: string
          outputs: Json
          period_label: string | null
          updated_at: string
        }
        Insert: {
          channel: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inputs?: Json
          mode: string
          outputs?: Json
          period_label?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inputs?: Json
          mode?: string
          outputs?: Json
          period_label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          client_id: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          client_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          client_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reportei_clients: {
        Row: {
          client_id: string
          created_at: string
          id: string
          reportei_client_id: string
          reportei_client_name: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          reportei_client_id: string
          reportei_client_name: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          reportei_client_id?: string
          reportei_client_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reportei_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reportei_integrations: {
        Row: {
          channel_name: string | null
          channel_type: string
          created_at: string
          id: string
          is_active: boolean | null
          reportei_client_link_id: string
          reportei_integration_id: string
          updated_at: string
        }
        Insert: {
          channel_name?: string | null
          channel_type: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          reportei_client_link_id: string
          reportei_integration_id: string
          updated_at?: string
        }
        Update: {
          channel_name?: string | null
          channel_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          reportei_client_link_id?: string
          reportei_integration_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reportei_integrations_reportei_client_link_id_fkey"
            columns: ["reportei_client_link_id"]
            isOneToOne: false
            referencedRelation: "reportei_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reportei_metrics: {
        Row: {
          created_at: string
          fetched_at: string
          id: string
          integration_id: string
          metric_type: string | null
          metric_value: number | null
          metric_value_text: string | null
          period_end: string
          period_start: string
          raw_data: Json | null
          widget_id: string
          widget_name: string | null
        }
        Insert: {
          created_at?: string
          fetched_at?: string
          id?: string
          integration_id: string
          metric_type?: string | null
          metric_value?: number | null
          metric_value_text?: string | null
          period_end: string
          period_start: string
          raw_data?: Json | null
          widget_id: string
          widget_name?: string | null
        }
        Update: {
          created_at?: string
          fetched_at?: string
          id?: string
          integration_id?: string
          metric_type?: string | null
          metric_value?: number | null
          metric_value_text?: string | null
          period_end?: string
          period_start?: string
          raw_data?: Json | null
          widget_id?: string
          widget_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reportei_metrics_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "reportei_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          category: string
          client_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          meeting_excluded_from: string[] | null
          owner_type: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          source: string | null
          source_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          meeting_excluded_from?: string[] | null
          owner_type?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          source?: string | null
          source_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          meeting_excluded_from?: string[] | null
          owner_type?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          source?: string | null
          source_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          role: Database["public"]["Enums"]["app_role"]
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
      vivaz_dashboard_config: {
        Row: {
          client_id: string
          created_at: string
          ga4_property_id: string | null
          google_ads_account_id: string | null
          id: string
          is_active: boolean
          meta_ad_account_id: string | null
          updated_at: string
          webhook_token: string
        }
        Insert: {
          client_id: string
          created_at?: string
          ga4_property_id?: string | null
          google_ads_account_id?: string | null
          id?: string
          is_active?: boolean
          meta_ad_account_id?: string | null
          updated_at?: string
          webhook_token?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          ga4_property_id?: string | null
          google_ads_account_id?: string | null
          id?: string
          is_active?: boolean
          meta_ad_account_id?: string | null
          updated_at?: string
          webhook_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "vivaz_dashboard_config_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      vivaz_metrics: {
        Row: {
          channel: string
          clicks: number | null
          client_id: string
          conversions: number | null
          cost: number | null
          cpc: number | null
          created_at: string
          ctr: number | null
          id: string
          impressions: number | null
          metadata: Json | null
          metric_date: string
          reach: number | null
          updated_at: string
        }
        Insert: {
          channel: string
          clicks?: number | null
          client_id: string
          conversions?: number | null
          cost?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number | null
          metadata?: Json | null
          metric_date: string
          reach?: number | null
          updated_at?: string
        }
        Update: {
          channel?: string
          clicks?: number | null
          client_id?: string
          conversions?: number | null
          cost?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number | null
          metadata?: Json | null
          metric_date?: string
          reach?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vivaz_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_client_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_collaborator: { Args: { _user_id: string }; Returns: boolean }
      is_task_assignee: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "collaborator" | "client"
      approval_status: "pending" | "approved" | "rejected"
      client_segment:
        | "inside_sales"
        | "ecommerce"
        | "marketplace"
        | "local_business"
        | "social_commerce"
      meeting_status: "rascunho" | "em_revisao" | "aprovado"
      task_owner_type: "vivaz" | "cliente"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status:
        | "pending"
        | "in_progress"
        | "review"
        | "completed"
        | "cancelled"
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
      app_role: ["admin", "collaborator", "client"],
      approval_status: ["pending", "approved", "rejected"],
      client_segment: [
        "inside_sales",
        "ecommerce",
        "marketplace",
        "local_business",
        "social_commerce",
      ],
      meeting_status: ["rascunho", "em_revisao", "aprovado"],
      task_owner_type: ["vivaz", "cliente"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: [
        "pending",
        "in_progress",
        "review",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
