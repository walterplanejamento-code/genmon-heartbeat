import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DiagnosticReading {
  id: string;
  created_at: string;
  horas_trabalhadas: number | null;
  tensao_rede_rs: number | null;
  tensao_gmg: number | null;
  motor_funcionando: boolean | null;
  rede_ok: boolean | null;
  numero_partidas: number | null;
  nivel_combustivel: number | null;
}

interface ReadingWithDelta extends DiagnosticReading {
  delta_horimetro: number | null;
  delta_tempo_ms: number;
  is_anomaly: boolean;
}

export default function Diagnostics() {
  const [readings, setReadings] = useState<ReadingWithDelta[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    anomalies: 0,
    avgDelta: 0,
    stability: 100,
  });

  const fetchReadings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leituras_tempo_real")
        .select("id, created_at, horas_trabalhadas, tensao_rede_rs, tensao_gmg, motor_funcionando, rede_ok, numero_partidas, nivel_combustivel")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching readings:", error);
        return;
      }

      if (data && data.length > 0) {
        // Calculate deltas between consecutive readings
        const withDeltas: ReadingWithDelta[] = data.map((reading, index) => {
          const prevReading = data[index + 1];
          let delta_horimetro: number | null = null;
          let delta_tempo_ms = 0;
          let is_anomaly = false;

          if (prevReading && reading.horas_trabalhadas !== null && prevReading.horas_trabalhadas !== null) {
            delta_horimetro = reading.horas_trabalhadas - prevReading.horas_trabalhadas;
            delta_tempo_ms = new Date(reading.created_at).getTime() - new Date(prevReading.created_at).getTime();

            // Anomaly: horímetro changed by more than 10 hours in a single reading
            // or decreased (physically impossible)
            if (Math.abs(delta_horimetro) > 10 || delta_horimetro < -0.01) {
              is_anomaly = true;
            }
          }

          return {
            ...reading,
            delta_horimetro,
            delta_tempo_ms,
            is_anomaly,
          };
        });

        setReadings(withDeltas);

        // Calculate stats
        const anomalies = withDeltas.filter((r) => r.is_anomaly).length;
        const validDeltas = withDeltas
          .filter((r) => r.delta_horimetro !== null && !r.is_anomaly)
          .map((r) => r.delta_horimetro as number);
        
        const avgDelta = validDeltas.length > 0
          ? validDeltas.reduce((a, b) => a + b, 0) / validDeltas.length
          : 0;

        const stability = withDeltas.length > 0 
          ? ((withDeltas.length - anomalies) / withDeltas.length) * 100 
          : 100;

        setStats({
          total: withDeltas.length,
          anomalies,
          avgDelta: Math.abs(avgDelta),
          stability: Math.round(stability),
        });

        setLastUpdate(new Date());
        setIsConnected(true);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReadings();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("diagnostics-readings")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leituras_tempo_real",
        },
        () => {
          fetchReadings();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReadings]);

  const getStabilityColor = (stability: number) => {
    if (stability >= 90) return "text-data-green";
    if (stability >= 70) return "text-data-amber";
    return "text-data-red";
  };

  const formatDelta = (delta: number | null) => {
    if (delta === null) return "-";
    const sign = delta >= 0 ? "+" : "";
    return `${sign}${delta.toFixed(2)} h`;
  };

  const formatTimeDelta = (ms: number) => {
    if (ms === 0) return "-";
    const seconds = Math.round(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Diagnóstico Modbus</h1>
            <p className="text-muted-foreground">
              Monitoramento de qualidade dos dados recebidos
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Badge className="bg-data-green/20 text-data-green border-data-green/30">
                  <Activity className="w-3 h-3 mr-1 animate-pulse" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 mr-1" />
                  Desconectado
                </Badge>
              )}
            </div>
            <Button onClick={fetchReadings} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardDescription>Estabilidade</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-bold", getStabilityColor(stats.stability))}>
                {stats.stability}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total} leituras analisadas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardDescription>Anomalias Detectadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-bold", stats.anomalies > 0 ? "text-data-red" : "text-data-green")}>
                {stats.anomalies}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Variações suspeitas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardDescription>Variação Média</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-data-cyan">
                {stats.avgDelta.toFixed(4)}h
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Entre leituras válidas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardDescription>Última Atualização</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-foreground">
                {lastUpdate ? format(lastUpdate, "HH:mm:ss") : "-"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {lastUpdate ? format(lastUpdate, "dd/MM/yyyy") : "Aguardando..."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Readings Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Últimas Leituras
            </CardTitle>
            <CardDescription>
              Histórico das últimas 20 leituras com análise de variação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Status</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Horímetro</TableHead>
                  <TableHead>Δ Horímetro</TableHead>
                  <TableHead>Δ Tempo</TableHead>
                  <TableHead>Tensão Rede</TableHead>
                  <TableHead>Motor</TableHead>
                  <TableHead>Rede OK</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readings.map((reading, index) => (
                  <TableRow
                    key={reading.id}
                    className={cn(
                      reading.is_anomaly && "bg-data-red/10 border-data-red/30"
                    )}
                  >
                    <TableCell>
                      {reading.is_anomaly ? (
                        <AlertTriangle className="w-4 h-4 text-data-red" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-data-green" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(reading.created_at), "HH:mm:ss")}
                      <span className="text-muted-foreground ml-1">
                        {format(new Date(reading.created_at), "dd/MM")}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono font-bold">
                      {reading.horas_trabalhadas?.toFixed(2) ?? "-"} h
                    </TableCell>
                    <TableCell
                      className={cn(
                        "font-mono",
                        reading.is_anomaly
                          ? "text-data-red font-bold"
                          : reading.delta_horimetro !== null && reading.delta_horimetro < 0
                          ? "text-data-amber"
                          : "text-muted-foreground"
                      )}
                    >
                      {formatDelta(reading.delta_horimetro)}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {formatTimeDelta(reading.delta_tempo_ms)}
                    </TableCell>
                    <TableCell>
                      {reading.tensao_rede_rs ?? "-"} V
                    </TableCell>
                    <TableCell>
                      {reading.motor_funcionando ? (
                        <Badge className="bg-data-green/20 text-data-green border-data-green/30">
                          Ligado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Desligado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {reading.rede_ok ? (
                        <CheckCircle className="w-4 h-4 text-data-green" />
                      ) : (
                        <XCircle className="w-4 h-4 text-data-red" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {readings.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma leitura encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm">Legenda</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-data-green" />
              <span>Leitura normal</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-data-red" />
              <span>Anomalia (variação &gt; 10h ou valor negativo)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-data-cyan font-mono">Δ</span>
              <span>Diferença em relação à leitura anterior</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
