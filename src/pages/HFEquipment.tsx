import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { Save, Cpu, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function HFEquipment() {
  const [config, setConfig] = useState({
    modelo: "HF2211",
    portaSerial: "/dev/ttyUSB0",
    enderecoModbus: "001",
    portaVPS: "502",
    ipHF: "192.168.1.100",
    timeout: "1000",
  });

  const [connectionStatus, setConnectionStatus] = useState<"online" | "offline" | "warning">("online");
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const handleTestConnection = () => {
    setIsTestingConnection(true);
    setTimeout(() => {
      setIsTestingConnection(false);
      setConnectionStatus("online");
    }, 2000);
  };

  const handleSave = () => {
    console.log("Saving HF config:", config);
  };

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
          <StatusIndicator status={connectionStatus} label={connectionStatus === "online" ? "Conectado" : "Desconectado"} />
        </div>

        {/* Equipment info */}
        <div className="industrial-card-glow p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Cpu className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {config.modelo}
              </h2>
              <p className="text-sm text-muted-foreground">
                Conversor Serial-Ethernet
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo do Equipamento</Label>
                <Input
                  id="modelo"
                  value={config.modelo}
                  onChange={(e) => setConfig({ ...config, modelo: e.target.value })}
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="portaSerial">Porta Serial</Label>
                <Input
                  id="portaSerial"
                  value={config.portaSerial}
                  onChange={(e) => setConfig({ ...config, portaSerial: e.target.value })}
                  className="bg-input border-border font-mono"
                  placeholder="/dev/ttyUSB0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="enderecoModbus">Endereço Modbus</Label>
                <Input
                  id="enderecoModbus"
                  value={config.enderecoModbus}
                  onChange={(e) => setConfig({ ...config, enderecoModbus: e.target.value })}
                  className="bg-input border-border font-mono"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ipHF">IP do HF</Label>
                <Input
                  id="ipHF"
                  value={config.ipHF}
                  onChange={(e) => setConfig({ ...config, ipHF: e.target.value })}
                  className="bg-input border-border font-mono"
                  placeholder="192.168.1.100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="portaVPS">Porta VPS</Label>
                <Input
                  id="portaVPS"
                  value={config.portaVPS}
                  onChange={(e) => setConfig({ ...config, portaVPS: e.target.value })}
                  className="bg-input border-border font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (ms)</Label>
                <Input
                  id="timeout"
                  value={config.timeout}
                  onChange={(e) => setConfig({ ...config, timeout: e.target.value })}
                  className="bg-input border-border font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Connection status */}
        <div className="industrial-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Status da Conexão
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-secondary">
              <div className="flex items-center gap-2 mb-2">
                <StatusIndicator status="online" size="sm" />
                <p className="text-xs text-muted-foreground">Serial</p>
              </div>
              <p className="font-mono text-foreground text-sm">{config.portaSerial}</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <div className="flex items-center gap-2 mb-2">
                <StatusIndicator status="online" size="sm" />
                <p className="text-xs text-muted-foreground">Modbus</p>
              </div>
              <p className="font-mono text-foreground text-sm">Addr {config.enderecoModbus}</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <div className="flex items-center gap-2 mb-2">
                <StatusIndicator status={connectionStatus} size="sm" />
                <p className="text-xs text-muted-foreground">Ethernet</p>
              </div>
              <p className="font-mono text-foreground text-sm">{config.ipHF}</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <div className="flex items-center gap-2 mb-2">
                <StatusIndicator status={connectionStatus} size="sm" />
                <p className="text-xs text-muted-foreground">Porta</p>
              </div>
              <p className="font-mono text-foreground text-sm">{config.portaVPS}</p>
            </div>
          </div>

          <Button
            onClick={handleTestConnection}
            disabled={isTestingConnection}
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isTestingConnection ? 'animate-spin' : ''}`} />
            {isTestingConnection ? 'Testando...' : 'Testar Conexão'}
          </Button>
        </div>

        {/* Communication flow */}
        <div className="industrial-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Fluxo de Comunicação
          </h3>
          <div className="flex items-center justify-between text-sm overflow-x-auto">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div className="px-3 py-2 rounded bg-secondary text-foreground">Gerador</div>
              <span className="text-muted-foreground">→</span>
              <div className="px-3 py-2 rounded bg-secondary text-foreground">K30XL</div>
              <span className="text-muted-foreground">→</span>
              <div className="px-3 py-2 rounded bg-secondary text-foreground">RS-232</div>
              <span className="text-muted-foreground">→</span>
              <div className="px-3 py-2 rounded bg-primary/20 text-primary font-medium">HF2211</div>
              <span className="text-muted-foreground">→</span>
              <div className="px-3 py-2 rounded bg-secondary text-foreground">Internet</div>
              <span className="text-muted-foreground">→</span>
              <div className="px-3 py-2 rounded bg-secondary text-foreground">VPS</div>
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
