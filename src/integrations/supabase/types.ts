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
      armazens: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          codigo: string
          criado_em: string | null
          id: number
          morada: string | null
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          codigo: string
          criado_em?: string | null
          id?: number
          morada?: string | null
          nome: string
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          codigo?: string
          criado_em?: string | null
          id?: number
          morada?: string | null
          nome?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: number
          ip_address: unknown | null
          new_data: Json | null
          old_data: Json | null
          record_id: number | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: number
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: number | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: number
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: number | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      categorias: {
        Row: {
          criado_em: string | null
          descricao: string | null
          id: number
          nome: string
        }
        Insert: {
          criado_em?: string | null
          descricao?: string | null
          id?: number
          nome: string
        }
        Update: {
          criado_em?: string | null
          descricao?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      estoques: {
        Row: {
          armazem_id: number
          atualizado_em: string | null
          id: number
          produto_id: number
          quantidade: number | null
          quantidade_reservada: number | null
        }
        Insert: {
          armazem_id: number
          atualizado_em?: string | null
          id?: number
          produto_id: number
          quantidade?: number | null
          quantidade_reservada?: number | null
        }
        Update: {
          armazem_id?: number
          atualizado_em?: string | null
          id?: number
          produto_id?: number
          quantidade?: number | null
          quantidade_reservada?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estoques_armazem_id_fkey"
            columns: ["armazem_id"]
            isOneToOne: false
            referencedRelation: "armazens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoques_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoques_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_public"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          codigo: string
          contacto_email: string | null
          contacto_telefone: string | null
          criado_em: string | null
          id: number
          morada: string | null
          nif: string | null
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          codigo: string
          contacto_email?: string | null
          contacto_telefone?: string | null
          criado_em?: string | null
          id?: number
          morada?: string | null
          nif?: string | null
          nome: string
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          codigo?: string
          contacto_email?: string | null
          contacto_telefone?: string | null
          criado_em?: string | null
          id?: number
          morada?: string | null
          nif?: string | null
          nome?: string
        }
        Relationships: []
      }
      movimentacao_estoque: {
        Row: {
          armazem_destino_id: number | null
          armazem_origem_id: number | null
          criado_em: string | null
          hash_idempotencia: string | null
          id: number
          observacoes: string | null
          produto_id: number
          quantidade: number
          sync_status: string | null
          timestamp: string | null
          tipo_movimentacao: string
          usuario: string
        }
        Insert: {
          armazem_destino_id?: number | null
          armazem_origem_id?: number | null
          criado_em?: string | null
          hash_idempotencia?: string | null
          id?: number
          observacoes?: string | null
          produto_id: number
          quantidade: number
          sync_status?: string | null
          timestamp?: string | null
          tipo_movimentacao: string
          usuario: string
        }
        Update: {
          armazem_destino_id?: number | null
          armazem_origem_id?: number | null
          criado_em?: string | null
          hash_idempotencia?: string | null
          id?: number
          observacoes?: string | null
          produto_id?: number
          quantidade?: number
          sync_status?: string | null
          timestamp?: string | null
          tipo_movimentacao?: string
          usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacao_estoque_armazem_destino_id_fkey"
            columns: ["armazem_destino_id"]
            isOneToOne: false
            referencedRelation: "armazens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacao_estoque_armazem_origem_id_fkey"
            columns: ["armazem_origem_id"]
            isOneToOne: false
            referencedRelation: "armazens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacao_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacao_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_barcodes: {
        Row: {
          criado_em: string | null
          ean: string
          id: number
          nivel: string | null
          pack_qty: number | null
          produto_id: number
        }
        Insert: {
          criado_em?: string | null
          ean: string
          id?: number
          nivel?: string | null
          pack_qty?: number | null
          produto_id: number
        }
        Update: {
          criado_em?: string | null
          ean?: string
          id?: number
          nivel?: string | null
          pack_qty?: number | null
          produto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_barcodes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_barcodes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_public"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          atualizado_em: string | null
          cor: string | null
          criado_em: string | null
          descricao: string | null
          fornecedor_id: number | null
          id: number
          marca: string | null
          nome: string
          preco_custo: number | null
          preco_venda: number | null
          sku: string
          status: string | null
          subcategoria_id: number | null
          tamanho: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cor?: string | null
          criado_em?: string | null
          descricao?: string | null
          fornecedor_id?: number | null
          id?: number
          marca?: string | null
          nome: string
          preco_custo?: number | null
          preco_venda?: number | null
          sku: string
          status?: string | null
          subcategoria_id?: number | null
          tamanho?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cor?: string | null
          criado_em?: string | null
          descricao?: string | null
          fornecedor_id?: number | null
          id?: number
          marca?: string | null
          nome?: string
          preco_custo?: number | null
          preco_venda?: number | null
          sku?: string
          status?: string | null
          subcategoria_id?: number | null
          tamanho?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "subcategorias"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategorias: {
        Row: {
          categoria_id: number | null
          criado_em: string | null
          descricao: string | null
          id: number
          nome: string
        }
        Insert: {
          categoria_id?: number | null
          criado_em?: string | null
          descricao?: string | null
          id?: number
          nome: string
        }
        Update: {
          categoria_id?: number | null
          criado_em?: string | null
          descricao?: string | null
          id?: number
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategorias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      produtos_public: {
        Row: {
          atualizado_em: string | null
          cor: string | null
          criado_em: string | null
          descricao: string | null
          fornecedor_id: number | null
          id: number | null
          marca: string | null
          nome: string | null
          sku: string | null
          status: string | null
          subcategoria_id: number | null
          tamanho: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cor?: string | null
          criado_em?: string | null
          descricao?: string | null
          fornecedor_id?: number | null
          id?: number | null
          marca?: string | null
          nome?: string | null
          sku?: string | null
          status?: string | null
          subcategoria_id?: number | null
          tamanho?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cor?: string | null
          criado_em?: string | null
          descricao?: string | null
          fornecedor_id?: number | null
          id?: number | null
          marca?: string | null
          nome?: string | null
          sku?: string | null
          status?: string | null
          subcategoria_id?: number | null
          tamanho?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "subcategorias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_product_safe: {
        Args: { p_produto_id: number }
        Returns: Json
      }
      has_elevated_access: {
        Args: { _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      processar_movimentacao: {
        Args: {
          p_destino_id: number
          p_hash_idempotencia?: string
          p_observacoes?: string
          p_origem_id: number
          p_produto_id: number
          p_quantidade: number
          p_timestamp?: string
          p_tipo: string
          p_usuario: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "operator" | "viewer"
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
      app_role: ["admin", "manager", "operator", "viewer"],
    },
  },
} as const
