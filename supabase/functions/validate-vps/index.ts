import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { gerador_id } = await req.json();

    if (!gerador_id) {
      return new Response(
        JSON.stringify({ error: "gerador_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Check recent readings
    const { data: readings, error: readError } = await supabase
      .from("leituras_tempo_real")
      .select("id, created_at, tensao_rede_rs, tensao_gmg")
      .eq("gerador_id", gerador_id)
      .gte("created_at", fiveMinutesAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    if (readError) {
      console.error("Error querying readings:", readError);
      return new Response(
        JSON.stringify({ error: "Database error", details: readError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check HF equipment status
    const { data: hfEquip } = await supabase
      .from("equipamentos_hf")
      .select("status, updated_at, last_connection_ip, last_connection_port")
      .eq("gerador_id", gerador_id)
      .maybeSingle();

    // Get last reading regardless of time window
    const { data: lastReading } = await supabase
      .from("leituras_tempo_real")
      .select("created_at")
      .eq("gerador_id", gerador_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const hasRecentData = readings && readings.length > 0;
    const readingsCount = readings?.length ?? 0;

    // Calculate estimated latency from last reading timestamp
    let latenciaEstimada: number | null = null;
    if (hasRecentData && readings[0]?.created_at) {
      const lastTs = new Date(readings[0].created_at).getTime();
      latenciaEstimada = Math.max(1, Math.round((now.getTime() - lastTs) / 1000));
    }

    const result = {
      validado: hasRecentData,
      timestamp: now.toISOString(),
      checks: {
        dados_recentes: {
          ok: hasRecentData,
          leituras_5min: readingsCount,
          descricao: hasRecentData
            ? `${readingsCount} leitura(s) nos últimos 5 minutos`
            : "Nenhuma leitura nos últimos 5 minutos",
        },
        equipamento_hf: {
          ok: hfEquip?.status === "online",
          status: hfEquip?.status ?? "desconhecido",
          ultimo_update: hfEquip?.updated_at ?? null,
          ip_conexao: hfEquip?.last_connection_ip ?? null,
        },
        ultima_leitura: {
          timestamp: lastReading?.created_at ?? null,
          idade_segundos: lastReading?.created_at
            ? Math.round((now.getTime() - new Date(lastReading.created_at).getTime()) / 1000)
            : null,
        },
      },
      latencia_estimada_s: latenciaEstimada,
    };

    // Update vps_conexoes with validation result
    await supabase
      .from("vps_conexoes")
      .update({
        validado: hasRecentData,
        ultima_validacao: now.toISOString(),
        latencia_ms: latenciaEstimada ? latenciaEstimada * 1000 : null,
      })
      .eq("gerador_id", gerador_id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
