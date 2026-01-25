import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { Save, Server, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function VPS() {
  const [config, setConfig] = useState({
    ipFixo: "45.33.100.50",
    porta: "502",
    hostname: "gen-monitor-vps",
    provider: "Linode",
  });

  const [validationStatus, setValidationStatus] = useState<"validated" | "not_validated" | "validating">("validated");
  const [lastValidation, setLastValidation] = useState("2024-01-15 14:30:00");

  const handleValidate = () => {
    setValidationStatus("validating");
    setTimeout(() => {
      setValidationStatus("validated");
      setLastValidation(new Date().toLocaleString("pt-BR"));
    }, 2000);
  };

  const handleSave = () => {
    console.log("Saving VPS config:", config);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Validação da VPS</h1>
            <p className="text-muted-foreground">
              Configure e valide a conexão com a VPS
            </p>
          </div>
          <StatusIndicator 
            status={validationStatus === "validated" ? "online" : validationStatus === "validating" ? "warning" : "offline"} 
            label={validationStatus === "validated" ? "Validado" : validationStatus === "validating" ? "Validando..." : "Não Validado"} 
          />
        </div>

        {/* VPS info */}
        <div className="industrial-card-glow p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Server className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {config.hostname}
              </h2>
              <p className="text-sm text-muted-foreground">
                {config.provider} • IP Fixo
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ipFixo">IP Fixo</Label>
                <Input
                  id="ipFixo"
                  value={config.ipFixo}
                  onChange={(e) => setConfig({ ...config, ipFixo: e.target.value })}
                  className="bg-input border-border font-mono"
                  placeholder="xxx.xxx.xxx.xxx"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="porta">Porta</Label>
                <Input
                  id="porta"
                  value={config.porta}
                  onChange={(e) => setConfig({ ...config, porta: e.target.value })}
                  className="bg-input border-border font-mono"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hostname">Hostname</Label>
                <Input
                  id="hostname"
                  value={config.hostname}
                  onChange={(e) => setConfig({ ...config, hostname: e.target.value })}
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider">Provedor</Label>
                <Input
                  id="provider"
                  value={config.provider}
                  onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Validation status */}
        <div className="industrial-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Status da Validação
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-lg border ${validationStatus === "validated" ? "border-data-green bg-data-green/10" : "border-border bg-secondary"}`}>
              <div className="flex items-center gap-3">
                {validationStatus === "validated" ? (
                  <CheckCircle className="w-6 h-6 text-data-green" />
                ) : (
                  <XCircle className="w-6 h-6 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">Conectividade IP</p>
                  <p className="text-xs text-muted-foreground">Ping bem-sucedido</p>
                </div>
              </div>
            </div>
            
            <div className={`p-4 rounded-lg border ${validationStatus === "validated" ? "border-data-green bg-data-green/10" : "border-border bg-secondary"}`}>
              <div className="flex items-center gap-3">
                {validationStatus === "validated" ? (
                  <CheckCircle className="w-6 h-6 text-data-green" />
                ) : (
                  <XCircle className="w-6 h-6 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">Porta Aberta</p>
                  <p className="text-xs text-muted-foreground">Porta {config.porta} acessível</p>
                </div>
              </div>
            </div>
            
            <div className={`p-4 rounded-lg border ${validationStatus === "validated" ? "border-data-green bg-data-green/10" : "border-border bg-secondary"}`}>
              <div className="flex items-center gap-3">
                {validationStatus === "validated" ? (
                  <CheckCircle className="w-6 h-6 text-data-green" />
                ) : (
                  <XCircle className="w-6 h-6 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">Modbus TCP</p>
                  <p className="text-xs text-muted-foreground">Comunicação ativa</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Última validação</p>
              <p className="text-sm font-mono text-foreground">{lastValidation}</p>
            </div>
            <Button
              onClick={handleValidate}
              disabled={validationStatus === "validating"}
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${validationStatus === "validating" ? 'animate-spin' : ''}`} />
              {validationStatus === "validating" ? 'Validando...' : 'Validar Novamente'}
            </Button>
          </div>
        </div>

        {/* Connection info */}
        <div className="industrial-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Informações da Conexão
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-secondary">
              <p className="text-xs text-muted-foreground mb-1">Latência</p>
              <p className="font-mono text-data-cyan text-lg">23ms</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary">
              <p className="text-xs text-muted-foreground mb-1">Uptime</p>
              <p className="font-mono text-data-green text-lg">99.9%</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary">
              <p className="text-xs text-muted-foreground mb-1">Pacotes Recebidos</p>
              <p className="font-mono text-foreground text-lg">1.2M</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary">
              <p className="text-xs text-muted-foreground mb-1">Erros</p>
              <p className="font-mono text-data-green text-lg">0</p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Save className="w-4 h-4 mr-2" />
            Salvar Configurações
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
