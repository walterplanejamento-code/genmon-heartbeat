import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { AlertBadge } from "@/components/ui/AlertBadge";
import { useRealtimeReadings, useRealtimeAlerts } from "@/hooks/useRealtimeReadings";
import { useGenerator } from "@/hooks/useGenerator";
import { useAuth } from "@/hooks/useAuth";
import { formatHorimetro, horasDecimaisParaFormato } from "@/lib/formatters";
import {
  Zap,
  Thermometer,
  Gauge,
  Battery,
  Clock,
  Fuel,
  Activity,
  RotateCw,
  Loader2,
} from "lucide-react";

export default function Dashboard() {
  const { isLoading: authLoading } = useAuth();
  const { generator, isLoading: generatorLoading } = useGenerator();
  const { latestReading, isConnected } = useRealtimeReadings(generator?.id || null);
  const { alerts } = useRealtimeAlerts(generator?.id || null);

  if (authLoading || generatorLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Use real data or fallback to mock data for demo
  const readings = latestReading || {
    tensao_rede_rs: 380,
    tensao_rede_st: 382,
    tensao_rede_tr: 379,
    tensao_gmg: 381,
    corrente_fase1: 45.2,
    frequencia_gmg: 60.1,
    rpm_motor: 1800,
    temperatura_agua: 78,
    tensao_bateria: 24.5,
    horas_trabalhadas: 1250,
    numero_partidas: 342,
    nivel_combustivel: 75,
    motor_funcionando: true,
    rede_ok: true,
    gmg_alimentando: true,
    aviso_ativo: false,
    falha_ativa: false,
    created_at: new Date().toISOString(),
    // Mock para horímetro no formato correto
    horimetro_horas: 285,
    horimetro_minutos: 30,
    horimetro_segundos: 15,
  };

  // Formatar horímetro: usa campos separados se disponíveis, senão converte horas decimais
  const horasTrabalhadasFormatado = 
    readings.horimetro_horas !== null && readings.horimetro_horas !== undefined
      ? formatHorimetro(
          readings.horimetro_horas ?? 0,
          readings.horimetro_minutos ?? 0,
          readings.horimetro_segundos ?? 0
        )
      : readings.horas_trabalhadas !== null
        ? horasDecimaisParaFormato(readings.horas_trabalhadas)
        : "00000:00:00";

  const generatorStatus = isConnected && latestReading ? "online" : generator ? "online" : "offline";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Monitoramento em tempo real do gerador
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="industrial-card py-2 px-4 flex items-center gap-3">
              <StatusIndicator status={generatorStatus as "online" | "offline"} />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-medium text-foreground">
                  {generatorStatus === "online" ? "Operando" : "Offline"}
                </p>
              </div>
            </div>
            <div className="industrial-card py-2 px-4">
              <p className="text-xs text-muted-foreground">Última leitura</p>
              <p className="text-sm font-mono text-data-cyan">
                {latestReading
                  ? new Date(latestReading.created_at).toLocaleTimeString("pt-BR")
                  : new Date().toLocaleTimeString("pt-BR")}
              </p>
            </div>
          </div>
        </div>

        {/* Status bits */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="industrial-card flex items-center gap-3">
            <StatusIndicator status={readings.motor_funcionando ? "online" : "offline"} size="sm" />
            <span className="text-sm text-foreground">Motor</span>
          </div>
          <div className="industrial-card flex items-center gap-3">
            <StatusIndicator status={readings.rede_ok ? "online" : "offline"} size="sm" />
            <span className="text-sm text-foreground">Rede OK</span>
          </div>
          <div className="industrial-card flex items-center gap-3">
            <StatusIndicator status={readings.gmg_alimentando ? "online" : "offline"} size="sm" />
            <span className="text-sm text-foreground">GMG Alimentando</span>
          </div>
          <div className="industrial-card flex items-center gap-3">
            <StatusIndicator status={readings.aviso_ativo ? "warning" : "online"} size="sm" />
            <span className="text-sm text-foreground">Aviso</span>
          </div>
          <div className="industrial-card flex items-center gap-3">
            <StatusIndicator status={readings.falha_ativa ? "error" : "online"} size="sm" />
            <span className="text-sm text-foreground">Falha</span>
          </div>
          <div className="industrial-card flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-primary animate-pulse-glow" : "bg-muted-foreground"}`} />
            <span className="text-sm text-foreground">Realtime</span>
          </div>
        </div>

        {/* Main metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Tensão Rede R-S"
            value={readings.tensao_rede_rs ?? "-"}
            unit="V"
            icon={<Zap className="w-5 h-5" />}
          />
          <MetricCard
            label="Tensão Rede S-T"
            value={readings.tensao_rede_st ?? "-"}
            unit="V"
            icon={<Zap className="w-5 h-5" />}
          />
          <MetricCard
            label="Tensão Rede T-R"
            value={readings.tensao_rede_tr ?? "-"}
            unit="V"
            icon={<Zap className="w-5 h-5" />}
          />
          <MetricCard
            label="Tensão GMG"
            value={readings.tensao_gmg ?? "-"}
            unit="V"
            icon={<Zap className="w-5 h-5" />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Corrente Fase 1"
            value={readings.corrente_fase1 ?? "-"}
            unit="A"
            icon={<Activity className="w-5 h-5" />}
          />
          <MetricCard
            label="Frequência GMG"
            value={readings.frequencia_gmg ?? "-"}
            unit="Hz"
            icon={<Gauge className="w-5 h-5" />}
          />
          <MetricCard
            label="RPM Motor"
            value={readings.rpm_motor ?? "-"}
            unit="rpm"
            icon={<RotateCw className="w-5 h-5" />}
          />
          <MetricCard
            label="Temperatura Água"
            value={readings.temperatura_agua ?? "-"}
            unit="°C"
            status={(readings.temperatura_agua ?? 0) > 90 ? "warning" : "normal"}
            icon={<Thermometer className="w-5 h-5" />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Tensão Bateria"
            value={readings.tensao_bateria ?? "-"}
            unit="V"
            icon={<Battery className="w-5 h-5" />}
          />
          <MetricCard
            label="Horas Trabalhadas"
            value={horasTrabalhadasFormatado}
            icon={<Clock className="w-5 h-5" />}
          />
          <MetricCard
            label="Número de Partidas"
            value={readings.numero_partidas ?? "-"}
            icon={<RotateCw className="w-5 h-5" />}
          />
          <MetricCard
            label="Nível Combustível"
            value={readings.nivel_combustivel ?? "-"}
            unit="%"
            status={(readings.nivel_combustivel ?? 100) < 20 ? "warning" : "normal"}
            icon={<Fuel className="w-5 h-5" />}
          />
        </div>

        {/* Alerts section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Alertas Ativos
            </h2>
            <div className="space-y-3">
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <AlertBadge
                    key={alert.id}
                    level={alert.nivel}
                    message={alert.mensagem}
                    timestamp={new Date(alert.created_at).toLocaleTimeString("pt-BR")}
                    source={alert.origem}
                  />
                ))
              ) : (
                <AlertBadge
                  level="info"
                  message="Sistema operando normalmente"
                  timestamp={new Date().toLocaleTimeString("pt-BR")}
                  source="rule"
                />
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Informações do Gerador
            </h2>
            <div className="industrial-card space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Marca</span>
                <span className="text-sm font-medium text-foreground">
                  {generator?.marca || "MWM"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Modelo</span>
                <span className="text-sm font-medium text-foreground">
                  {generator?.modelo || "D229-4"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Controlador</span>
                <span className="text-sm font-medium text-foreground">
                  {generator?.controlador || "STEMAC K30XL"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Protocolo</span>
                <span className="text-sm font-medium text-foreground">Modbus RTU</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Interface</span>
                <span className="text-sm font-medium text-foreground">RS-232</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
