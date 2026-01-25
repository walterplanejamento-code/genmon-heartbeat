import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Cpu, RefreshCw, Info, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useHFEquipment, ConnectionStatus } from "@/hooks/useHFEquipment";
import { useGenerator } from "@/hooks/useGenerator";

export default function HFEquipment() {
  const { generator, isLoading: generatorLoading } = useGenerator();
  const {
    equipment,
    connectionStatus,
    timeSinceUpdate,
    isLoading,
    isSaving,
    error,
    updateConfig,
    createEquipment,
  } = useHFEquipment(generator?.id || null);

  const [formData, setFormData] = useState({
    modelo: "HF2211",
    ipVPS: "82.25.70.90",
    portaVPS: "15002",
    portaTcpLocal: "502",
    portaSerial: "/dev/ttyUSB0",
    enderecoModbus: "001",
    timeout: "1000",
    baudRate: "19200",
    dataBits: "8",
    parity: "None",
    stopBits: "1",
  });

  // Sync form data with equipment from database
  useEffect(() => {
    if (equipment) {
      setFormData({
        modelo: equipment.modelo || "HF2211",
        ipVPS: equipment.ip_vps || "82.25.70.90",
        portaVPS: equipment.porta_vps || "15002",
        portaTcpLocal: equipment.porta_tcp_local || "502",
        portaSerial: equipment.porta_serial || "/dev/ttyUSB0",
        enderecoModbus: equipment.endereco_modbus || "001",
        timeout: String(equipment.timeout_ms || 1000),
        baudRate: String(equipment.baud_rate || 19200),
        dataBits: String(equipment.data_bits || 8),
        parity: equipment.parity || "None",
        stopBits: String(equipment.stop_bits || 1),
      });
    }
  }, [equipment]);

  const handleSave = async () => {
    await updateConfig({
      modelo: formData.modelo,
      ip_vps: formData.ipVPS,
      porta_vps: formData.portaVPS,
      porta_tcp_local: formData.portaTcpLocal,
      porta_serial: formData.portaSerial,
      endereco_modbus: formData.enderecoModbus,
      timeout_ms: parseInt(formData.timeout) || 1000,
      baud_rate: parseInt(formData.baudRate) || 19200,
      data_bits: parseInt(formData.dataBits) || 8,
      parity: formData.parity,
      stop_bits: parseInt(formData.stopBits) || 1,
    });
  };

  const handleCreateEquipment = async () => {
    if (generator?.id) {
      await createEquipment(generator.id);
    }
  };

  const getStatusLabel = (status: ConnectionStatus): string => {
    switch (status) {
      case "online":
        return "Conectado";
      case "warning":
        return "Instável";
      case "offline":
        return "Desconectado";
    }
  };

  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case "online":
        return <Wifi className="w-5 h-5 text-emerald-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "offline":
        return <WifiOff className="w-5 h-5 text-destructive" />;
    }
  };

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
          <Cpu className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Nenhum Gerador Configurado
          </h2>
          <p className="text-muted-foreground max-w-md">
            Configure primeiro um gerador na página de configurações para depois
            configurar o equipamento HF2211.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (!equipment) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Cpu className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Equipamento HF Não Configurado
          </h2>
          <p className="text-muted-foreground max-w-md mb-6">
            O gerador "{generator.marca} {generator.modelo}" ainda não possui um
            equipamento HF2211 configurado.
          </p>
          <Button onClick={handleCreateEquipment} disabled={isSaving}>
            <Cpu className="w-4 h-4 mr-2" />
            {isSaving ? "Criando..." : "Configurar HF2211"}
          </Button>
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
            <h1 className="text-2xl font-bold text-foreground">Equipamento HF</h1>
            <p className="text-muted-foreground">
              Configure o conversor serial-ethernet HF2211
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusIcon(connectionStatus)}
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {getStatusLabel(connectionStatus)}
              </p>
              <p className="text-xs text-muted-foreground">{timeSinceUpdate}</p>
            </div>
          </div>
        </div>

        {/* Connection Status Card */}
        <div className={`industrial-card-glow p-6 border-l-4 ${
          connectionStatus === "online" 
            ? "border-l-emerald-500" 
            : connectionStatus === "warning" 
            ? "border-l-amber-500" 
            : "border-l-destructive"
        }`}>
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              connectionStatus === "online" 
                ? "bg-emerald-500/20" 
                : connectionStatus === "warning" 
                ? "bg-amber-500/20" 
                : "bg-destructive/20"
            }`}>
              <Cpu className={`w-6 h-6 ${
                connectionStatus === "online" 
                  ? "text-emerald-500" 
                  : connectionStatus === "warning" 
                  ? "text-amber-500" 
                  : "text-destructive"
              }`} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                {formData.modelo}
              </h2>
              <p className="text-sm text-muted-foreground">
                Conversor Serial-Ethernet • {generator.marca} {generator.modelo}
              </p>
            </div>
            {connectionStatus === "online" && (
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-sm text-emerald-500 font-medium">Recebendo dados</span>
              </div>
            )}
          </div>

          {/* Connection Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-secondary">
              <div className="flex items-center gap-2 mb-2">
                <StatusIndicator status={connectionStatus} size="sm" />
                <p className="text-xs text-muted-foreground">Serial</p>
              </div>
              <p className="font-mono text-foreground text-sm">{formData.portaSerial}</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <div className="flex items-center gap-2 mb-2">
                <StatusIndicator status={connectionStatus} size="sm" />
                <p className="text-xs text-muted-foreground">Modbus</p>
              </div>
              <p className="font-mono text-foreground text-sm">Addr {formData.enderecoModbus}</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <div className="flex items-center gap-2 mb-2">
                <StatusIndicator status={connectionStatus} size="sm" />
                <p className="text-xs text-muted-foreground">VPS</p>
              </div>
              <p className="font-mono text-foreground text-sm">{formData.ipVPS}</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <div className="flex items-center gap-2 mb-2">
                <StatusIndicator status={connectionStatus} size="sm" />
                <p className="text-xs text-muted-foreground">Porta VPS</p>
              </div>
              <p className="font-mono text-primary text-sm font-bold">{formData.portaVPS}</p>
            </div>
          </div>

          {/* Last Connection Info */}
          {equipment.last_connection_ip && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Última conexão de: <span className="font-mono text-foreground">{equipment.last_connection_ip}</span>
                {equipment.last_connection_port && (
                  <span className="font-mono text-foreground">:{equipment.last_connection_port}</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* VPS Configuration */}
        <div className="industrial-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Configuração de Destino (VPS)
            </h3>
            <div className="group relative">
              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              <div className="absolute left-0 top-6 w-64 p-2 bg-popover border border-border rounded-lg text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10">
                O HF envia os dados para a VPS. A porta na VPS identifica qual gerador está enviando.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="ipVPS">IP da VPS (Destino)</Label>
              <Input
                id="ipVPS"
                value={formData.ipVPS}
                onChange={(e) => setFormData({ ...formData, ipVPS: e.target.value })}
                className="bg-input border-border font-mono"
                placeholder="82.25.70.90"
              />
              <p className="text-xs text-muted-foreground">
                IP fixo do servidor VPS que recebe os dados
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="portaVPS">Porta na VPS (Identifica o Gerador)</Label>
              <Input
                id="portaVPS"
                value={formData.portaVPS}
                onChange={(e) => setFormData({ ...formData, portaVPS: e.target.value })}
                className="bg-input border-border font-mono"
                placeholder="15002"
              />
              <p className="text-xs text-muted-foreground">
                Cada gerador usa uma porta única na VPS
              </p>
            </div>
          </div>
        </div>

        {/* Serial Configuration - NEW */}
        <div className="industrial-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Configuração Serial (RS-232)
            </h3>
            <div className="group relative">
              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              <div className="absolute left-0 top-6 w-72 p-2 bg-popover border border-border rounded-lg text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10">
                Configurações da porta serial do HF2211. Deve corresponder às configurações do controlador K30XL.
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm text-amber-500 font-medium">Importante</p>
                <p className="text-xs text-muted-foreground">
                  Estas configurações devem corresponder exatamente às do controlador K30XL. 
                  O K30XL usa: <span className="font-mono text-foreground">19200, 8, None, 1</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baudRate">Baud Rate</Label>
              <Select
                value={formData.baudRate}
                onValueChange={(value) => setFormData({ ...formData, baudRate: value })}
              >
                <SelectTrigger className="bg-input border-border font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9600">9600</SelectItem>
                  <SelectItem value="19200">19200</SelectItem>
                  <SelectItem value="38400">38400</SelectItem>
                  <SelectItem value="57600">57600</SelectItem>
                  <SelectItem value="115200">115200</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataBits">Data Bits</Label>
              <Select
                value={formData.dataBits}
                onValueChange={(value) => setFormData({ ...formData, dataBits: value })}
              >
                <SelectTrigger className="bg-input border-border font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parity">Paridade</Label>
              <Select
                value={formData.parity}
                onValueChange={(value) => setFormData({ ...formData, parity: value })}
              >
                <SelectTrigger className="bg-input border-border font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Even">Even</SelectItem>
                  <SelectItem value="Odd">Odd</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stopBits">Stop Bits</Label>
              <Select
                value={formData.stopBits}
                onValueChange={(value) => setFormData({ ...formData, stopBits: value })}
              >
                <SelectTrigger className="bg-input border-border font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Local HF Configuration */}
        <div className="industrial-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Configuração Local do HF
            </h3>
            <div className="group relative">
              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              <div className="absolute left-0 top-6 w-64 p-2 bg-popover border border-border rounded-lg text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10">
                Configurações internas do equipamento HF2211 para comunicação com o controlador K30XL.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="portaTcpLocal">Porta TCP Local</Label>
              <Input
                id="portaTcpLocal"
                value={formData.portaTcpLocal}
                onChange={(e) => setFormData({ ...formData, portaTcpLocal: e.target.value })}
                className="bg-input border-border font-mono"
                placeholder="502"
              />
              <p className="text-xs text-muted-foreground">
                Porta TCP do HF para Modbus TCP (geralmente 502)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="portaSerial">Porta Serial</Label>
              <Input
                id="portaSerial"
                value={formData.portaSerial}
                onChange={(e) => setFormData({ ...formData, portaSerial: e.target.value })}
                className="bg-input border-border font-mono"
                placeholder="/dev/ttyUSB0"
              />
              <p className="text-xs text-muted-foreground">
                Interface RS-232 conectada ao K30XL
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="enderecoModbus">Endereço Modbus</Label>
              <Input
                id="enderecoModbus"
                value={formData.enderecoModbus}
                onChange={(e) => setFormData({ ...formData, enderecoModbus: e.target.value })}
                className="bg-input border-border font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Endereço do dispositivo Modbus (padrão: 001)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (ms)</Label>
              <Input
                id="timeout"
                value={formData.timeout}
                onChange={(e) => setFormData({ ...formData, timeout: e.target.value })}
                className="bg-input border-border font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Tempo limite de resposta em milissegundos
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelo">Modelo do Equipamento</Label>
              <Input
                id="modelo"
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                className="bg-input border-border"
              />
            </div>
          </div>
        </div>

        {/* Communication flow */}
        <div className="industrial-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Fluxo de Comunicação
          </h3>
          <div className="flex items-center justify-between text-sm overflow-x-auto pb-2">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div className="px-3 py-2 rounded bg-secondary text-foreground">Gerador</div>
              <span className="text-muted-foreground">→</span>
              <div className="px-3 py-2 rounded bg-secondary text-foreground">K30XL</div>
              <span className="text-muted-foreground">→</span>
              <div className="px-3 py-2 rounded bg-secondary text-foreground">RS-232</div>
              <span className="text-muted-foreground">→</span>
              <div className="px-3 py-2 rounded bg-primary/20 text-primary font-medium border border-primary/30">
                HF2211 (:{formData.portaTcpLocal})
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="px-3 py-2 rounded bg-secondary text-foreground">Internet</div>
              <span className="text-muted-foreground">→</span>
              <div className="px-3 py-2 rounded bg-primary/20 text-primary font-medium border border-primary/30">
                VPS (:{formData.portaVPS})
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="px-3 py-2 rounded bg-secondary text-foreground">Backend</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            A porta <span className="font-mono text-primary">{formData.portaVPS}</span> na VPS identifica este gerador no backend
          </p>
        </div>

        {/* Save button */}
        <div className="flex justify-end gap-3">
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
