import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, User, Bell, Clock, Shield } from "lucide-react";
import { useState } from "react";

export default function Settings() {
  const [userSettings, setUserSettings] = useState({
    name: "Administrador",
    email: "admin@empresa.com",
    company: "Empresa LTDA",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    criticalOnly: false,
    dailyReport: true,
  });

  const [systemSettings, setSystemSettings] = useState({
    refreshInterval: "5",
    dataRetention: "30",
    timezone: "America/Sao_Paulo",
  });

  const handleSave = () => {
    console.log("Saving settings:", { userSettings, notificationSettings, systemSettings });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema e do usuário
          </p>
        </div>

        {/* User settings */}
        <div className="industrial-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Perfil do Usuário</h2>
              <p className="text-sm text-muted-foreground">Informações da conta</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={userSettings.name}
                onChange={(e) => setUserSettings({ ...userSettings, name: e.target.value })}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={userSettings.email}
                onChange={(e) => setUserSettings({ ...userSettings, email: e.target.value })}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                value={userSettings.company}
                onChange={(e) => setUserSettings({ ...userSettings, company: e.target.value })}
                className="bg-input border-border"
              />
            </div>
          </div>
        </div>

        {/* Notification settings */}
        <div className="industrial-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Notificações</h2>
              <p className="text-sm text-muted-foreground">Configure alertas e relatórios</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.emailAlerts}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, emailAlerts: e.target.checked })}
                className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-primary"
              />
              <div>
                <p className="text-sm font-medium text-foreground">Alertas por Email</p>
                <p className="text-xs text-muted-foreground">Receba notificações de alertas por email</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.criticalOnly}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, criticalOnly: e.target.checked })}
                className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-primary"
              />
              <div>
                <p className="text-sm font-medium text-foreground">Apenas Alertas Críticos</p>
                <p className="text-xs text-muted-foreground">Filtrar notificações apenas para alertas críticos</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.dailyReport}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, dailyReport: e.target.checked })}
                className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-primary"
              />
              <div>
                <p className="text-sm font-medium text-foreground">Relatório Diário</p>
                <p className="text-xs text-muted-foreground">Receba um resumo diário do status do gerador</p>
              </div>
            </label>
          </div>
        </div>

        {/* System settings */}
        <div className="industrial-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Sistema</h2>
              <p className="text-sm text-muted-foreground">Configurações gerais do sistema</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="refreshInterval">Intervalo de Atualização (s)</Label>
              <Input
                id="refreshInterval"
                value={systemSettings.refreshInterval}
                onChange={(e) => setSystemSettings({ ...systemSettings, refreshInterval: e.target.value })}
                className="bg-input border-border font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataRetention">Retenção de Dados (dias)</Label>
              <Input
                id="dataRetention"
                value={systemSettings.dataRetention}
                onChange={(e) => setSystemSettings({ ...systemSettings, dataRetention: e.target.value })}
                className="bg-input border-border font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Fuso Horário</Label>
              <Input
                id="timezone"
                value={systemSettings.timezone}
                onChange={(e) => setSystemSettings({ ...systemSettings, timezone: e.target.value })}
                className="bg-input border-border"
              />
            </div>
          </div>
        </div>

        {/* Security info */}
        <div className="industrial-card p-6 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Segurança</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Última sessão</p>
              <p className="text-foreground font-mono">Agora</p>
            </div>
            <div>
              <p className="text-muted-foreground">IP</p>
              <p className="text-foreground font-mono">192.168.1.100</p>
            </div>
            <div>
              <p className="text-muted-foreground">Navegador</p>
              <p className="text-foreground">Chrome 120</p>
            </div>
            <div>
              <p className="text-muted-foreground">2FA</p>
              <p className="text-data-amber">Não configurado</p>
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
