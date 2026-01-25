import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulated login - will be replaced with real auth
    setTimeout(() => {
      setIsLoading(false);
      navigate("/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="absolute inset-0" style={{ background: 'var(--gradient-glow)' }} />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        
        <div className="relative z-10 flex flex-col justify-center px-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center glow-cyan">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">GenMonitor</h1>
              <p className="text-muted-foreground">Sistema de Monitoramento IOT</p>
            </div>
          </div>
          
          <div className="space-y-6 max-w-md">
            <div className="industrial-card">
              <h3 className="text-sm font-medium text-foreground mb-2">Monitoramento em Tempo Real</h3>
              <p className="text-sm text-muted-foreground">
                Acompanhe todas as métricas do seu gerador MWM D229-4 com atualização instantânea.
              </p>
            </div>
            
            <div className="industrial-card">
              <h3 className="text-sm font-medium text-foreground mb-2">Alertas Inteligentes</h3>
              <p className="text-sm text-muted-foreground">
                Sistema de alertas configuráveis com análise por IA para prevenção de falhas.
              </p>
            </div>
            
            <div className="industrial-card">
              <h3 className="text-sm font-medium text-foreground mb-2">Integração Modbus</h3>
              <p className="text-sm text-muted-foreground">
                Comunicação direta com controlador STEMAC K30XL via protocolo Modbus RTU.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center glow-cyan">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">GenMonitor</h1>
              <p className="text-xs text-muted-foreground">Sistema IOT</p>
            </div>
          </div>

          <div className="industrial-card-glow p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">Entrar</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Acesse o painel de monitoramento
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-input border-border focus:border-primary focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-foreground">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-input border-border focus:border-primary focus:ring-primary"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            MWM D229-4 • STEMAC K30XL • Modbus RTU
          </p>
        </div>
      </div>
    </div>
  );
}
