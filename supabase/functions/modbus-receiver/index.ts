import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface ModbusReading {
  // Identificação do gerador pela porta da VPS
  porta_vps: string;
  
  // Leituras Modbus
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
}

interface AlertParam {
  parametro: string;
  valor_minimo: number | null;
  valor_maximo: number | null;
  nivel: string;
  habilitado: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create Supabase client with service role for inserting data
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === "POST") {
      const reading: ModbusReading = await req.json();
      
      console.log("Received Modbus reading:", JSON.stringify(reading));

      // Validate required field - porta_vps identifica o gerador
      if (!reading.porta_vps) {
        return new Response(
          JSON.stringify({ error: "porta_vps is required to identify the generator" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find generator by VPS port via equipamentos_hf
      const { data: equipamentoHF, error: hfError } = await supabase
        .from("equipamentos_hf")
        .select("gerador_id, geradores(id, marca, modelo)")
        .eq("porta_vps", reading.porta_vps)
        .maybeSingle();

      if (hfError) {
        console.error("Error finding HF equipment:", hfError);
        return new Response(
          JSON.stringify({ error: "Database error finding equipment", details: hfError }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!equipamentoHF) {
        console.error(`No generator found for VPS port: ${reading.porta_vps}`);
        return new Response(
          JSON.stringify({ error: `No generator configured for VPS port ${reading.porta_vps}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const geradorId = equipamentoHF.gerador_id;
      console.log(`Found generator ${geradorId} for VPS port ${reading.porta_vps}`);

      // Update HF equipment status to online
      await supabase
        .from("equipamentos_hf")
        .update({ status: "online", updated_at: new Date().toISOString() })
        .eq("porta_vps", reading.porta_vps);

      // Insert the reading
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
        })
        .select()
        .single();

      if (leituraError) {
        console.error("Error inserting reading:", leituraError);
        return new Response(
          JSON.stringify({ error: "Failed to insert reading", details: leituraError }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Reading inserted successfully:", leitura.id);

      // Check alert parameters and generate alerts
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

        // Check status bits for alerts
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

        // Insert all alerts
        if (alertsToInsert.length > 0) {
          const { error: insertAlertError } = await supabase
            .from("alertas")
            .insert(alertsToInsert);

          if (insertAlertError) {
            console.error("Error inserting alerts:", insertAlertError);
          } else {
            console.log(`Inserted ${alertsToInsert.length} alerts`);
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          gerador_id: geradorId,
          reading_id: leitura.id,
          timestamp: leitura.created_at 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET method - return latest reading for a generator by VPS port
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

      // If porta_vps provided, find the generator
      if (portaVps && !geradorId) {
        const { data: equipamentoHF } = await supabase
          .from("equipamentos_hf")
          .select("gerador_id")
          .eq("porta_vps", portaVps)
          .maybeSingle();

        if (!equipamentoHF) {
          return new Response(
            JSON.stringify({ error: `No generator found for VPS port ${portaVps}` }),
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
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
