import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { AlertBadge } from "@/components/ui/AlertBadge";
import {
  Zap,
  Thermometer,
  Gauge,
  Battery,
  Clock,
  Fuel,
  Activity,
  RotateCw,
} from "lucide-react";

// Simulated real-time data - will be replaced with actual Modbus data
const mockData = {
  generatorStatus: "online" as const,
  networkStatus: true,
  gmgFeeding: true,
  motorRunning: true,
  warningActive: false,
  failureActive: false,
  readings: {
    tensaoRedeRS: 380,
    tensaoRedeST: 382,
    tensaoRedeTR: 379,
    tensaoGMG: 381,
    correnteFase1: 45.2,
    frequenciaGMG: 60.1,
    rpmMotor: 1800,
    temperaturaAgua: 78,
    tensaoBateria: 24.5,
    horasTrabalhadas: 1250,
    numeroPartidas: 342,
    nivelCombustivel: 75,
  },
};

export default function Dashboard() {
  const { readings, generatorStatus } = mockData;

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
              <StatusIndicator status={generatorStatus} />
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
                {new Date().toLocaleTimeString("pt-BR")}
              </p>
            </div>
          </div>
        </div>

        {/* Status bits */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="industrial-card flex items-center gap-3">
            <StatusIndicator status={mockData.motorRunning ? "online" : "offline"} size="sm" />
            <span className="text-sm text-foreground">Motor</span>
          </div>
          <div className="industrial-card flex items-center gap-3">
            <StatusIndicator status={mockData.networkStatus ? "online" : "offline"} size="sm" />
            <span className="text-sm text-foreground">Rede OK</span>
          </div>
          <div className="industrial-card flex items-center gap-3">
            <StatusIndicator status={mockData.gmgFeeding ? "online" : "offline"} size="sm" />
            <span className="text-sm text-foreground">GMG Alimentando</span>
          </div>
          <div className="industrial-card flex items-center gap-3">
            <StatusIndicator status={mockData.warningActive ? "warning" : "online"} size="sm" />
            <span className="text-sm text-foreground">Aviso</span>
          </div>
          <div className="industrial-card flex items-center gap-3">
            <StatusIndicator status={mockData.failureActive ? "error" : "online"} size="sm" />
            <span className="text-sm text-foreground">Falha</span>
          </div>
          <div className="industrial-card flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse-glow" />
            <span className="text-sm text-foreground">Modbus OK</span>
          </div>
        </div>

        {/* Main metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Tensão Rede R-S"
            value={readings.tensaoRedeRS}
            unit="V"
            icon={<Zap className="w-5 h-5" />}
          />
          <MetricCard
            label="Tensão Rede S-T"
            value={readings.tensaoRedeST}
            unit="V"
            icon={<Zap className="w-5 h-5" />}
          />
          <MetricCard
            label="Tensão Rede T-R"
            value={readings.tensaoRedeTR}
            unit="V"
            icon={<Zap className="w-5 h-5" />}
          />
          <MetricCard
            label="Tensão GMG"
            value={readings.tensaoGMG}
            unit="V"
            icon={<Zap className="w-5 h-5" />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Corrente Fase 1"
            value={readings.correnteFase1}
            unit="A"
            icon={<Activity className="w-5 h-5" />}
          />
          <MetricCard
            label="Frequência GMG"
            value={readings.frequenciaGMG}
            unit="Hz"
            icon={<Gauge className="w-5 h-5" />}
          />
          <MetricCard
            label="RPM Motor"
            value={readings.rpmMotor}
            unit="rpm"
            icon={<RotateCw className="w-5 h-5" />}
          />
          <MetricCard
            label="Temperatura Água"
            value={readings.temperaturaAgua}
            unit="°C"
            status={readings.temperaturaAgua > 90 ? "warning" : "normal"}
            icon={<Thermometer className="w-5 h-5" />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Tensão Bateria"
            value={readings.tensaoBateria}
            unit="V"
            icon={<Battery className="w-5 h-5" />}
          />
          <MetricCard
            label="Horas Trabalhadas"
            value={readings.horasTrabalhadas.toLocaleString()}
            unit="h"
            icon={<Clock className="w-5 h-5" />}
          />
          <MetricCard
            label="Número de Partidas"
            value={readings.numeroPartidas}
            icon={<RotateCw className="w-5 h-5" />}
          />
          <MetricCard
            label="Nível Combustível"
            value={readings.nivelCombustivel}
            unit="%"
            status={readings.nivelCombustivel < 20 ? "warning" : "normal"}
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
              <AlertBadge
                level="info"
                message="Sistema operando normalmente"
                timestamp="10:45:23"
                source="rule"
              />
              <AlertBadge
                level="warning"
                message="Nível de combustível abaixo de 80%"
                timestamp="09:30:15"
                source="ai"
              />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Informações do Gerador
            </h2>
            <div className="industrial-card space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Marca</span>
                <span className="text-sm font-medium text-foreground">MWM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Modelo</span>
                <span className="text-sm font-medium text-foreground">D229-4</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Controlador</span>
                <span className="text-sm font-medium text-foreground">STEMAC K30XL</span>
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
