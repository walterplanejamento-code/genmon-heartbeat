import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Server, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useGenerator } from "@/hooks/useGenerator";
import { useVPSConnection } from "@/hooks/useVPSConnection";

export default function VPS() {
  const { generator, isLoading: generatorLoading } = useGenerator();
  const {
    connection,
    isLoading,
    isSaving,
    updateConnection,
    createConnection,
    validateConnection,
  } = useVPSConnection(generator?.id || null);

  const [config, setConfig] = useState({
    ipFixo: "82.25.70.90",
    porta: "15002",
    hostname: "7arrowsServe",
    provider: "Contabo",
  });

  const [isValidating, setIsValidating] = useState(false);

  // Sync form with database
  useEffect(() => {
    if (connection) {
      setConfig({
        ipFixo: connection.ip_fixo || "82.25.70.90",
        porta: connection.porta || "15002",
        hostname: connection.hostname || "7arrowsServe",
        provider: connection.provider || "Contabo",
      });
    }
  }, [connection]);

  const handleValidate = async () => {
    setIsValidating(true);
    await validateConnection();
    setIsValidating(false);
  };

  const handleSave = async () => {
    if (connection) {
      await updateConnection({
        ip_fixo: config.ipFixo,
        porta: config.porta,
        hostname: config.hostname,
        provider: config.provider,
      });
    } else if (generator?.id) {
      await createConnection(generator.id, {
        ip_fixo: config.ipFixo,
        porta: config.porta,
        hostname: config.hostname,
        provider: config.provider,
      });
    }
  };

  const validationStatus = connection?.validado ? "validated" : "not_validated";
  const lastValidation = connection?.ultima_validacao 
    ? new Date(connection.ultima_validacao).toLocaleString("pt-BR")
    : "Nunca validado";

  if (generatorLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!generator) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Server className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Nenhum Gerador Configurado
          </h2>
          <p className="text-muted-foreground max-w-md">
            Configure primeiro um gerador na página de configurações para depois
            configurar a VPS.
          </p>
        </div>
      </DashboardLayout>
    );
  }

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
            status={validationStatus === "validated" ? "online" : isValidating ? "warning" : "offline"} 
            label={validationStatus === "validated" ? "Validado" : isValidating ? "Validando..." : "Não Validado"} 
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
              disabled={isValidating || isSaving}
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
              {isValidating ? 'Validando...' : 'Validar Novamente'}
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
              <p className="font-mono text-data-cyan text-lg">
                {connection?.latencia_ms ? `${connection.latencia_ms}ms` : "--"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-secondary">
              <p className="text-xs text-muted-foreground mb-1">Uptime</p>
              <p className="font-mono text-data-green text-lg">
                {connection?.uptime_percent ? `${connection.uptime_percent}%` : "--"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-secondary">
              <p className="text-xs text-muted-foreground mb-1">Pacotes Recebidos</p>
              <p className="font-mono text-foreground text-lg">--</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary">
              <p className="text-xs text-muted-foreground mb-1">Erros</p>
              <p className="font-mono text-data-green text-lg">0</p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
