# GenMonitor - Sistema de Monitoramento IOT de Geradores

## Stack

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** shadcn/ui (Radix) + Tailwind CSS
- **Routing:** React Router v6
- **State:** TanStack React Query + React Context
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **Validation:** Zod + React Hook Form

## Estrutura do Projeto

```
src/
  components/
    auth/          # ProtectedRoute (guard de autenticacao)
    layout/        # Sidebar, DashboardLayout
    ui/            # Componentes shadcn/ui e customizados
  hooks/           # useAuth, useGenerator, useRealtimeReadings, etc.
  integrations/    # Cliente Supabase e tipos gerados
  lib/             # Utilitarios e formatadores
  pages/           # Paginas (Dashboard, Generator, VPS, Alerts, etc.)
supabase/
  functions/       # Edge Functions (modbus-receiver)
  migrations/      # Migracoes SQL com RLS policies
```

## Comandos

```bash
npm run dev       # Dev server (porta 8080)
npm run build     # Build de producao
npm run preview   # Preview do build
```

## Seguranca

### Variaveis de Ambiente
- **NUNCA** commitar `.env` no git. Use `.env.example` como referencia.
- Variaveis VITE_* sao expostas no client-side (apenas anon key, nunca service role).

### Autenticacao
- `ProtectedRoute` em `src/components/auth/ProtectedRoute.tsx` protege todas as rotas autenticadas.
- `useAuth` hook gerencia sessao via Supabase Auth.
- Todas as rotas exceto `/login` sao protegidas no `App.tsx`.

### Edge Functions
- `modbus-receiver` requer autenticacao via header `x-api-key` (env `MODBUS_API_KEY`) ou `Authorization: Bearer <anon-key>`.
- CORS restrito a origens especificas (nao wildcard).
- Erros sanitizados - detalhes internos nao sao expostos ao cliente.
- Inputs validados e sanitizados antes de gravar no banco.

### Row Level Security (RLS)
- Todas as tabelas tem RLS habilitado.
- Usuarios so veem/editam seus proprios dados.
- Edge function usa service role para inserir leituras.

## Convencoes

- Paginas em `src/pages/` usam `DashboardLayout` como wrapper.
- Hooks de dados em `src/hooks/` seguem padrao React Query.
- Tipos do banco gerados automaticamente em `src/integrations/supabase/types.ts`.
- **Nao editar** `client.ts` e `types.ts` em integrations (gerados pelo Lovable/Supabase).

## Edge Function: modbus-receiver

Recebe leituras Modbus da VPS e grava em `leituras_tempo_real`.
Auto-provisiona geradores quando `porta_vps` nao e encontrada.

**Envs necessarias no Supabase:**
- `SUPABASE_URL` (automatica)
- `SUPABASE_SERVICE_ROLE_KEY` (automatica)
- `MODBUS_API_KEY` (configurar manualmente para autenticacao da VPS)
- `DEFAULT_VPS_IP` (opcional, IP padrao para auto-provisionamento)
