import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Zap, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useGenerator } from "@/hooks/useGenerator";
import { useToast } from "@/hooks/use-toast";

export default function Generator() {
  const { generator, isLoading, createGenerator, updateGenerator } = useGenerator();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [config, setConfig] = useState({
    marca: "MWM",
    modelo: "D229-4",
    controlador: "STEMAC K30XL",
    potenciaNominal: "100",
    tensaoNominal: "380",
    frequenciaNominal: "60",
    combustivel: "Diesel",
    instrucoes: "Verificar nível de óleo antes de cada partida. Realizar manutenção preventiva a cada 250 horas.",
  });

  // Sync form with database data
  useEffect(() => {
    if (generator) {
      setConfig({
        marca: generator.marca || "MWM",
        modelo: generator.modelo || "D229-4",
        controlador: generator.controlador || "STEMAC K30XL",
        potenciaNominal: generator.potencia_nominal || "100",
        tensaoNominal: generator.tensao_nominal || "380",
        frequenciaNominal: generator.frequencia_nominal || "60",
        combustivel: generator.combustivel || "Diesel",
        instrucoes: generator.instrucoes || "",
      });
    }
  }, [generator]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (generator) {
        // Update existing generator
        await updateGenerator(generator.id, {
          marca: config.marca,
          modelo: config.modelo,
          controlador: config.controlador,
          potencia_nominal: config.potenciaNominal,
          tensao_nominal: config.tensaoNominal,
          frequencia_nominal: config.frequenciaNominal,
          combustivel: config.combustivel,
          instrucoes: config.instrucoes,
        });
        toast({
          title: "Configurações salvas",
          description: "Os dados do gerador foram atualizados com sucesso.",
        });
      } else {
        // Create new generator
        await createGenerator({
          marca: config.marca,
          modelo: config.modelo,
          controlador: config.controlador,
          potencia_nominal: config.potenciaNominal,
          tensao_nominal: config.tensaoNominal,
          frequencia_nominal: config.frequenciaNominal,
          combustivel: config.combustivel,
          instrucoes: config.instrucoes,
        });
        toast({
          title: "Gerador criado",
          description: "O gerador foi configurado com sucesso.",
        });
      }
    } catch (err) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuração do Gerador</h1>
            <p className="text-muted-foreground">
              Configure os parâmetros do gerador {config.marca} {config.modelo}
            </p>
          </div>
          <StatusIndicator status={generator ? "online" : "offline"} label={generator ? "Configurado" : "Não configurado"} />
        </div>

        {/* Info card */}
        <div className="industrial-card-glow p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {config.marca} {config.modelo}
              </h2>
              <p className="text-sm text-muted-foreground">
                Controlador: {config.controlador}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="marca">Marca</Label>
                <Input
                  id="marca"
                  value={config.marca}
                  onChange={(e) => setConfig({ ...config, marca: e.target.value })}
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo</Label>
                <Input
                  id="modelo"
                  value={config.modelo}
                  onChange={(e) => setConfig({ ...config, modelo: e.target.value })}
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="controlador">Controlador</Label>
                <Input
                  id="controlador"
                  value={config.controlador}
                  onChange={(e) => setConfig({ ...config, controlador: e.target.value })}
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="combustivel">Combustível</Label>
                <Input
                  id="combustivel"
                  value={config.combustivel}
                  onChange={(e) => setConfig({ ...config, combustivel: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="potencia">Potência Nominal (kVA)</Label>
                <Input
                  id="potencia"
                  value={config.potenciaNominal}
                  onChange={(e) => setConfig({ ...config, potenciaNominal: e.target.value })}
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tensao">Tensão Nominal (V)</Label>
                <Input
                  id="tensao"
                  value={config.tensaoNominal}
                  onChange={(e) => setConfig({ ...config, tensaoNominal: e.target.value })}
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequencia">Frequência Nominal (Hz)</Label>
                <Input
                  id="frequencia"
                  value={config.frequenciaNominal}
                  onChange={(e) => setConfig({ ...config, frequenciaNominal: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="industrial-card p-6">
          <Label htmlFor="instrucoes" className="text-lg font-semibold mb-4 block">
            Instruções de Operação
          </Label>
          <textarea
            id="instrucoes"
            value={config.instrucoes}
            onChange={(e) => setConfig({ ...config, instrucoes: e.target.value })}
            className="w-full h-32 p-3 rounded-lg bg-input border border-border text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Modbus Configuration */}
        <div className="industrial-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Configuração Modbus RTU
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-secondary">
              <p className="text-xs text-muted-foreground mb-1">Baud Rate</p>
              <p className="font-mono text-foreground">19200</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary">
              <p className="text-xs text-muted-foreground mb-1">Data Bits</p>
              <p className="font-mono text-foreground">8</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary">
              <p className="text-xs text-muted-foreground mb-1">Paridade</p>
              <p className="font-mono text-foreground">Nenhuma</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary">
              <p className="text-xs text-muted-foreground mb-1">Stop Bits</p>
              <p className="font-mono text-foreground">1</p>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-secondary inline-block">
            <p className="text-xs text-muted-foreground mb-1">Endereço Modbus</p>
            <p className="font-mono text-primary text-lg">001</p>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSaving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
