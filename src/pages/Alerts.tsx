import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertBadge } from "@/components/ui/AlertBadge";
import { Save, Plus, Trash2, Brain } from "lucide-react";
import { useState } from "react";

interface AlertRule {
  id: string;
  parameter: string;
  minValue: string;
  maxValue: string;
  level: "info" | "warning" | "critical";
  enabled: boolean;
}

const defaultRules: AlertRule[] = [
  { id: "1", parameter: "Tensão GMG", minValue: "370", maxValue: "400", level: "warning", enabled: true },
  { id: "2", parameter: "Temperatura Água", minValue: "0", maxValue: "95", level: "critical", enabled: true },
  { id: "3", parameter: "Nível Combustível", minValue: "20", maxValue: "100", level: "warning", enabled: true },
  { id: "4", parameter: "Tensão Bateria", minValue: "22", maxValue: "28", level: "critical", enabled: true },
  { id: "5", parameter: "Frequência GMG", minValue: "59", maxValue: "61", level: "warning", enabled: true },
];

const activeAlerts = [
  { level: "info" as const, message: "Sistema operando dentro dos parâmetros normais", timestamp: "10:45:23", source: "rule" as const },
  { level: "warning" as const, message: "Nível de combustível em 75% - considerar reabastecimento", timestamp: "09:30:15", source: "ai" as const },
];

export default function Alerts() {
  const [rules, setRules] = useState<AlertRule[]>(defaultRules);

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

  const handleSave = () => {
    console.log("Saving alert rules:", rules);
  };

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
          <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Save className="w-4 h-4 mr-2" />
            Salvar Configurações
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
