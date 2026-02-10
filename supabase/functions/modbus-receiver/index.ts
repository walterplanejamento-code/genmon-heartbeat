import { createClient } from "@supabase/supabase-js";

const ALLOWED_ORIGINS = [
  "https://hwloajvxjsysutqfqpal.supabase.co",
  "https://genmonitor.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  };
}

interface ModbusReading {
  porta_vps: string;
  tensao_rede_rs?: number;
  tensao_rede_st?: number;
  tensao_rede_tr?: number;
  tensao_gmg?: number;
  corrente_fase1?: number;
  frequencia_gmg?: number;
  rpm_motor?: number;
  temperatura_agua?: number;
  tensao_bateria?: number;
  horas_trabalhadas?: number;
  numero_partidas?: number;
  nivel_combustivel?: number;
  motor_funcionando?: boolean;
  rede_ok?: boolean;
  gmg_alimentando?: boolean;
  aviso_ativo?: boolean;
  falha_ativa?: boolean;
  horimetro_horas?: number;
  horimetro_minutos?: number;
  horimetro_segundos?: number;
}

interface AlertParam {
  parametro: string;
  valor_minimo: number | null;
  valor_maximo: number | null;
  nivel: string;
  habilitado: boolean;
}

function isValidNumber(val: unknown): val is number {
  return typeof val === "number" && !isNaN(val) && isFinite(val);
}

function sanitizeReading(reading: ModbusReading): ModbusReading {
  const sanitized: ModbusReading = { porta_vps: String(reading.porta_vps).trim() };
  const numericFields = [
    "tensao_rede_rs", "tensao_rede_st", "tensao_rede_tr", "tensao_gmg",
    "corrente_fase1", "frequencia_gmg", "rpm_motor", "temperatura_agua",
    "tensao_bateria", "horas_trabalhadas", "numero_partidas", "nivel_combustivel",
    "horimetro_horas", "horimetro_minutos", "horimetro_segundos",
  ] as const;
  for (const field of numericFields) {
    if (reading[field] !== undefined && isValidNumber(reading[field])) {
      (sanitized as Record<string, unknown>)[field] = reading[field];
    }
  }
  const boolFields = [
    "motor_funcionando", "rede_ok", "gmg_alimentando", "aviso_ativo", "falha_ativa",
  ] as const;
  for (const field of boolFields) {
    if (reading[field] !== undefined) {
      (sanitized as Record<string, unknown>)[field] = Boolean(reading[field]);
    }
  }
  return sanitized;
}

function authenticateRequest(req: Request): boolean {
  const apiKey = req.headers.get("x-api-key");
  const expectedKey = Deno.env.get("MODBUS_API_KEY");

  // If no MODBUS_API_KEY is configured, fall back to checking the Supabase anon key
  if (!expectedKey) {
    const authHeader = req.headers.get("authorization");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (authHeader && anonKey) {
      return authHeader === `Bearer ${anonKey}`;
    }
    // If neither key is set, reject - secure by default
    return false;
  }

  return apiKey === expectedKey;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate the request
  if (!authenticateRequest(req)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === "POST") {
      const rawReading: ModbusReading = await req.json();

      if (!rawReading.porta_vps) {
        return new Response(
          JSON.stringify({ error: "porta_vps is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const reading = sanitizeReading(rawReading);

      // Find generator by VPS port
      let { data: equipamentoHF, error: hfError } = await supabase
        .from("equipamentos_hf")
        .select("gerador_id, geradores(id, marca, modelo)")
        .eq("porta_vps", reading.porta_vps)
        .maybeSingle();

      if (hfError) {
        console.error("Error finding HF equipment:", hfError);
        return new Response(
          JSON.stringify({ error: "Failed to find equipment" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Auto-provision generator if not found
      if (!equipamentoHF) {
        const systemUserId = "00000000-0000-0000-0000-000000000000";

        const { data: newGerador, error: geradorError } = await supabase
          .from("geradores")
          .insert({
            user_id: systemUserId,
            marca: "MWM",
            modelo: "D229-4",
            controlador: "STEMAC K30XL",
            potencia_nominal: "75 kVA",
            tensao_nominal: "220V",
            frequencia_nominal: "60Hz",
            combustivel: "Diesel",
          })
          .select()
          .single();

        if (geradorError) {
          console.error("Error creating generator:", geradorError);
          return new Response(
            JSON.stringify({ error: "Failed to auto-provision generator" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: hfCreateError } = await supabase
          .from("equipamentos_hf")
          .insert({
            gerador_id: newGerador.id,
            modelo: "HF2211",
            porta_vps: reading.porta_vps,
            ip_vps: Deno.env.get("DEFAULT_VPS_IP") || "0.0.0.0",
            porta_tcp_local: "502",
            endereco_modbus: "001",
            status: "online",
          })
          .select()
          .single();

        if (hfCreateError) {
          console.error("Error creating HF equipment:", hfCreateError);
          return new Response(
            JSON.stringify({ error: "Failed to create HF equipment" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        equipamentoHF = { gerador_id: newGerador.id, geradores: newGerador };
      }

      const geradorId = equipamentoHF.gerador_id;

      // Update HF equipment status
      await supabase
        .from("equipamentos_hf")
        .update({ status: "online", updated_at: new Date().toISOString() })
        .eq("porta_vps", reading.porta_vps);

      // Insert reading
      const { data: leitura, error: leituraError } = await supabase
        .from("leituras_tempo_real")
        .insert({
          gerador_id: geradorId,
          tensao_rede_rs: reading.tensao_rede_rs,
          tensao_rede_st: reading.tensao_rede_st,
          tensao_rede_tr: reading.tensao_rede_tr,
          tensao_gmg: reading.tensao_gmg,
          corrente_fase1: reading.corrente_fase1,
          frequencia_gmg: reading.frequencia_gmg,
          rpm_motor: reading.rpm_motor,
          temperatura_agua: reading.temperatura_agua,
          tensao_bateria: reading.tensao_bateria,
          horas_trabalhadas: reading.horas_trabalhadas,
          numero_partidas: reading.numero_partidas,
          nivel_combustivel: reading.nivel_combustivel,
          motor_funcionando: reading.motor_funcionando,
          rede_ok: reading.rede_ok,
          gmg_alimentando: reading.gmg_alimentando,
          aviso_ativo: reading.aviso_ativo,
          falha_ativa: reading.falha_ativa,
          horimetro_horas: reading.horimetro_horas,
          horimetro_minutos: reading.horimetro_minutos,
          horimetro_segundos: reading.horimetro_segundos,
        })
        .select()
        .single();

      if (leituraError) {
        console.error("Error inserting reading:", leituraError);
        return new Response(
          JSON.stringify({ error: "Failed to insert reading" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check alert parameters
      const { data: alertParams, error: alertError } = await supabase
        .from("parametros_alerta")
        .select("*")
        .eq("gerador_id", geradorId)
        .eq("habilitado", true);

      if (!alertError && alertParams) {
        const alertsToInsert: Array<{
          gerador_id: string;
          leitura_id: string;
          nivel: string;
          mensagem: string;
          origem: string;
        }> = [];

        const parameterMap: Record<string, number | undefined> = {
          "Tensão GMG": reading.tensao_gmg,
          "Tensão Rede R-S": reading.tensao_rede_rs,
          "Tensão Rede S-T": reading.tensao_rede_st,
          "Tensão Rede T-R": reading.tensao_rede_tr,
          "Corrente Fase 1": reading.corrente_fase1,
          "Frequência GMG": reading.frequencia_gmg,
          "RPM Motor": reading.rpm_motor,
          "Temperatura Água": reading.temperatura_agua,
          "Tensão Bateria": reading.tensao_bateria,
          "Nível Combustível": reading.nivel_combustivel,
        };

        for (const param of alertParams as AlertParam[]) {
          const value = parameterMap[param.parametro];

          if (value !== undefined) {
            let alertMessage: string | null = null;

            if (param.valor_minimo !== null && value < param.valor_minimo) {
              alertMessage = `${param.parametro} abaixo do limite: ${value} (mínimo: ${param.valor_minimo})`;
            } else if (param.valor_maximo !== null && value > param.valor_maximo) {
              alertMessage = `${param.parametro} acima do limite: ${value} (máximo: ${param.valor_maximo})`;
            }

            if (alertMessage) {
              alertsToInsert.push({
                gerador_id: geradorId,
                leitura_id: leitura.id,
                nivel: param.nivel,
                mensagem: alertMessage,
                origem: "rule",
              });
            }
          }
        }

        if (reading.aviso_ativo) {
          alertsToInsert.push({
            gerador_id: geradorId,
            leitura_id: leitura.id,
            nivel: "warning",
            mensagem: "Aviso ativo no controlador K30XL",
            origem: "rule",
          });
        }

        if (reading.falha_ativa) {
          alertsToInsert.push({
            gerador_id: geradorId,
            leitura_id: leitura.id,
            nivel: "critical",
            mensagem: "Falha ativa no controlador K30XL",
            origem: "rule",
          });
        }

        if (alertsToInsert.length > 0) {
          const { error: insertAlertError } = await supabase
            .from("alertas")
            .insert(alertsToInsert);

          if (insertAlertError) {
            console.error("Error inserting alerts:", insertAlertError);
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          gerador_id: geradorId,
          reading_id: leitura.id,
          timestamp: leitura.created_at,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET - latest reading
    if (req.method === "GET") {
      const url = new URL(req.url);
      const portaVps = url.searchParams.get("porta_vps");
      const geradorId = url.searchParams.get("gerador_id");

      if (!portaVps && !geradorId) {
        return new Response(
          JSON.stringify({ error: "porta_vps or gerador_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let targetGeradorId = geradorId;

      if (portaVps && !geradorId) {
        const { data: equipamentoHF } = await supabase
          .from("equipamentos_hf")
          .select("gerador_id")
          .eq("porta_vps", portaVps)
          .maybeSingle();

        if (!equipamentoHF) {
          return new Response(
            JSON.stringify({ error: "Generator not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        targetGeradorId = equipamentoHF.gerador_id;
      }

      const { data, error } = await supabase
        .from("leituras_tempo_real")
        .select("*")
        .eq("gerador_id", targetGeradorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching reading:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch reading" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
