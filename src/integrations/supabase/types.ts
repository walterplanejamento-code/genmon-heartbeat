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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alertas: {
        Row: {
          created_at: string
          gerador_id: string
          id: string
          leitura_id: string | null
          mensagem: string
          nivel: string
          origem: string
          resolvido: boolean | null
          resolvido_em: string | null
        }
        Insert: {
          created_at?: string
          gerador_id: string
          id?: string
          leitura_id?: string | null
          mensagem: string
          nivel?: string
          origem?: string
          resolvido?: boolean | null
          resolvido_em?: string | null
        }
        Update: {
          created_at?: string
          gerador_id?: string
          id?: string
          leitura_id?: string | null
          mensagem?: string
          nivel?: string
          origem?: string
          resolvido?: boolean | null
          resolvido_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alertas_gerador_id_fkey"
            columns: ["gerador_id"]
            isOneToOne: false
            referencedRelation: "geradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_leitura_id_fkey"
            columns: ["leitura_id"]
            isOneToOne: false
            referencedRelation: "leituras_tempo_real"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos_hf: {
        Row: {
          created_at: string
          endereco_modbus: string | null
          gerador_id: string
          id: string
          ip_hf: string | null
          ip_vps: string | null
          modelo: string
          porta_serial: string | null
          porta_tcp_local: string | null
          porta_vps: string | null
          status: string | null
          timeout_ms: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          endereco_modbus?: string | null
          gerador_id: string
          id?: string
          ip_hf?: string | null
          ip_vps?: string | null
          modelo?: string
          porta_serial?: string | null
          porta_tcp_local?: string | null
          porta_vps?: string | null
          status?: string | null
          timeout_ms?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          endereco_modbus?: string | null
          gerador_id?: string
          id?: string
          ip_hf?: string | null
          ip_vps?: string | null
          modelo?: string
          porta_serial?: string | null
          porta_tcp_local?: string | null
          porta_vps?: string | null
          status?: string | null
          timeout_ms?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_hf_gerador_id_fkey"
            columns: ["gerador_id"]
            isOneToOne: false
            referencedRelation: "geradores"
            referencedColumns: ["id"]
          },
        ]
      }
      geradores: {
        Row: {
          combustivel: string | null
          controlador: string
          created_at: string
          frequencia_nominal: string | null
          id: string
          instrucoes: string | null
          marca: string
          modelo: string
          potencia_nominal: string | null
          tensao_nominal: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          combustivel?: string | null
          controlador?: string
          created_at?: string
          frequencia_nominal?: string | null
          id?: string
          instrucoes?: string | null
          marca?: string
          modelo?: string
          potencia_nominal?: string | null
          tensao_nominal?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          combustivel?: string | null
          controlador?: string
          created_at?: string
          frequencia_nominal?: string | null
          id?: string
          instrucoes?: string | null
          marca?: string
          modelo?: string
          potencia_nominal?: string | null
          tensao_nominal?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leituras_tempo_real: {
        Row: {
          aviso_ativo: boolean | null
          corrente_fase1: number | null
          created_at: string
          falha_ativa: boolean | null
          frequencia_gmg: number | null
          gerador_id: string
          gmg_alimentando: boolean | null
          horas_trabalhadas: number | null
          id: string
          motor_funcionando: boolean | null
          nivel_combustivel: number | null
          numero_partidas: number | null
          rede_ok: boolean | null
          rpm_motor: number | null
          temperatura_agua: number | null
          tensao_bateria: number | null
          tensao_gmg: number | null
          tensao_rede_rs: number | null
          tensao_rede_st: number | null
          tensao_rede_tr: number | null
        }
        Insert: {
          aviso_ativo?: boolean | null
          corrente_fase1?: number | null
          created_at?: string
          falha_ativa?: boolean | null
          frequencia_gmg?: number | null
          gerador_id: string
          gmg_alimentando?: boolean | null
          horas_trabalhadas?: number | null
          id?: string
          motor_funcionando?: boolean | null
          nivel_combustivel?: number | null
          numero_partidas?: number | null
          rede_ok?: boolean | null
          rpm_motor?: number | null
          temperatura_agua?: number | null
          tensao_bateria?: number | null
          tensao_gmg?: number | null
          tensao_rede_rs?: number | null
          tensao_rede_st?: number | null
          tensao_rede_tr?: number | null
        }
        Update: {
          aviso_ativo?: boolean | null
          corrente_fase1?: number | null
          created_at?: string
          falha_ativa?: boolean | null
          frequencia_gmg?: number | null
          gerador_id?: string
          gmg_alimentando?: boolean | null
          horas_trabalhadas?: number | null
          id?: string
          motor_funcionando?: boolean | null
          nivel_combustivel?: number | null
          numero_partidas?: number | null
          rede_ok?: boolean | null
          rpm_motor?: number | null
          temperatura_agua?: number | null
          tensao_bateria?: number | null
          tensao_gmg?: number | null
          tensao_rede_rs?: number | null
          tensao_rede_st?: number | null
          tensao_rede_tr?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leituras_tempo_real_gerador_id_fkey"
            columns: ["gerador_id"]
            isOneToOne: false
            referencedRelation: "geradores"
            referencedColumns: ["id"]
          },
        ]
      }
      manuais_gerador: {
        Row: {
          created_at: string
          gerador_id: string
          id: string
          modelo_identificado: string | null
          nome_arquivo: string
          tamanho: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          gerador_id: string
          id?: string
          modelo_identificado?: string | null
          nome_arquivo: string
          tamanho?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          gerador_id?: string
          id?: string
          modelo_identificado?: string | null
          nome_arquivo?: string
          tamanho?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manuais_gerador_gerador_id_fkey"
            columns: ["gerador_id"]
            isOneToOne: false
            referencedRelation: "geradores"
            referencedColumns: ["id"]
          },
        ]
      }
      modbus_registros_k30xl: {
        Row: {
          created_at: string
          descricao: string | null
          endereco: number
          fator_escala: number | null
          id: string
          nome: string
          unidade: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          endereco: number
          fator_escala?: number | null
          id?: string
          nome: string
          unidade?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          endereco?: number
          fator_escala?: number | null
          id?: string
          nome?: string
          unidade?: string | null
        }
        Relationships: []
      }
      parametros_alerta: {
        Row: {
          created_at: string
          gerador_id: string
          habilitado: boolean | null
          id: string
          nivel: string
          parametro: string
          updated_at: string
          valor_maximo: number | null
          valor_minimo: number | null
        }
        Insert: {
          created_at?: string
          gerador_id: string
          habilitado?: boolean | null
          id?: string
          nivel?: string
          parametro: string
          updated_at?: string
          valor_maximo?: number | null
          valor_minimo?: number | null
        }
        Update: {
          created_at?: string
          gerador_id?: string
          habilitado?: boolean | null
          id?: string
          nivel?: string
          parametro?: string
          updated_at?: string
          valor_maximo?: number | null
          valor_minimo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parametros_alerta_gerador_id_fkey"
            columns: ["gerador_id"]
            isOneToOne: false
            referencedRelation: "geradores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vps_conexoes: {
        Row: {
          created_at: string
          gerador_id: string
          hostname: string | null
          id: string
          ip_fixo: string
          latencia_ms: number | null
          porta: string | null
          provider: string | null
          ultima_validacao: string | null
          updated_at: string
          uptime_percent: number | null
          validado: boolean | null
        }
        Insert: {
          created_at?: string
          gerador_id: string
          hostname?: string | null
          id?: string
          ip_fixo: string
          latencia_ms?: number | null
          porta?: string | null
          provider?: string | null
          ultima_validacao?: string | null
          updated_at?: string
          uptime_percent?: number | null
          validado?: boolean | null
        }
        Update: {
          created_at?: string
          gerador_id?: string
          hostname?: string | null
          id?: string
          ip_fixo?: string
          latencia_ms?: number | null
          porta?: string | null
          provider?: string | null
          ultima_validacao?: string | null
          updated_at?: string
          uptime_percent?: number | null
          validado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "vps_conexoes_gerador_id_fkey"
            columns: ["gerador_id"]
            isOneToOne: false
            referencedRelation: "geradores"
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
