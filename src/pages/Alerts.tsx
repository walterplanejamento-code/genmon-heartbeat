import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertBadge } from "@/components/ui/AlertBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Plus, Trash2, Brain } from "lucide-react";
import { useGenerator } from "@/hooks/useGenerator";
import { useAlertParams, AlertRule } from "@/hooks/useAlertParams";
import { useRealtimeAlerts } from "@/hooks/useRealtimeReadings";

export default function Alerts() {
  const { generator, isLoading: generatorLoading } = useGenerator();
  const { rules, setRules, isLoading, isSaving, saveRules } = useAlertParams(generator?.id || null);
  const { alerts } = useRealtimeAlerts(generator?.id || null);

  const addRule = () => {
    const newRule: AlertRule = {
      id: Date.now().toString(),
      parameter: "",
      minValue: "",
      maxValue: "",
      level: "warning",
      enabled: true,
    };
    setRules([...rules, newRule]);
  };

  const removeRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  const updateRule = (id: string, field: keyof AlertRule, value: string | boolean) => {
    setRules(
      rules.map((r) =>
        r.id === id ? { ...r, [field]: value } : r
      )
    );
  };

  const handleSave = async () => {
    await saveRules(rules);
  };

  if (generatorLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!generator) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Brain className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Nenhum Gerador Configurado
          </h2>
          <p className="text-muted-foreground max-w-md">
            Configure primeiro um gerador na página de configurações para depois
            configurar os alertas.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Convert realtime alerts to display format
  const activeAlerts = alerts.map(alert => ({
    level: alert.nivel as "info" | "warning" | "critical",
    message: alert.mensagem,
    timestamp: new Date(alert.created_at).toLocaleTimeString("pt-BR"),
    source: alert.origem as "rule" | "ai",
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuração de Alertas</h1>
            <p className="text-muted-foreground">
              Configure regras de alerta e visualize alertas ativos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active alerts */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Alertas Ativos
            </h2>
            <div className="space-y-3">
              {activeAlerts.length > 0 ? (
                activeAlerts.map((alert, index) => (
                  <AlertBadge key={index} {...alert} />
                ))
              ) : (
                <div className="industrial-card p-6 text-center text-muted-foreground">
                  Nenhum alerta ativo
                </div>
              )}
            </div>

            {/* AI Analysis */}
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Análise por IA
              </h2>
              <div className="industrial-card-glow p-4">
                <p className="text-sm text-foreground mb-2">
                  Sistema de análise inteligente ativo
                </p>
                <p className="text-xs text-muted-foreground">
                  A IA monitora correlações entre métricas para detectar anomalias antes que se tornem problemas críticos.
                </p>
                <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-primary font-medium">
                    Última análise: Sem anomalias detectadas
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Alert rules */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Regras de Alerta
              </h2>
              <Button onClick={addRule} size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10">
                <Plus className="w-4 h-4 mr-1" />
                Nova Regra
              </Button>
            </div>

            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="industrial-card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => updateRule(rule.id, "enabled", e.target.checked)}
                        className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-primary"
                      />
                      <select
                        value={rule.level}
                        onChange={(e) => updateRule(rule.id, "level", e.target.value)}
                        className="text-xs px-2 py-1 rounded bg-secondary border-none text-foreground"
                      >
                        <option value="info">Info</option>
                        <option value="warning">Aviso</option>
                        <option value="critical">Crítico</option>
                      </select>
                    </div>
                    <Button
                      onClick={() => removeRule(rule.id)}
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-data-red"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Parâmetro</Label>
                      <Input
                        value={rule.parameter}
                        onChange={(e) => updateRule(rule.id, "parameter", e.target.value)}
                        placeholder="Ex: Tensão GMG"
                        className="bg-input border-border text-sm h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Mínimo</Label>
                      <Input
                        value={rule.minValue}
                        onChange={(e) => updateRule(rule.id, "minValue", e.target.value)}
                        placeholder="0"
                        className="bg-input border-border text-sm h-9 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Máximo</Label>
                      <Input
                        value={rule.maxValue}
                        onChange={(e) => updateRule(rule.id, "maxValue", e.target.value)}
                        placeholder="100"
                        className="bg-input border-border text-sm h-9 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
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
