
# Plano: Corrigir Exibição de Horas Trabalhadas (Formato 00285:30:15)

## Problema Atual

O visor físico do gerador mostra `00285:30:15` (285 horas, 30 minutos, 15 segundos), mas o sistema:

1. Lê o registrador errado (0x000D oscila aleatoriamente)
2. Armazena apenas um número decimal (ex: 167.08)
3. Exibe apenas "1,250 h" no Dashboard

## Solução em 4 Partes

### Parte 1: Expandir Schema do Banco de Dados

Adicionar campos para armazenar horas, minutos e segundos separadamente:

```sql
ALTER TABLE leituras_tempo_real
ADD COLUMN horimetro_horas integer DEFAULT 0,
ADD COLUMN horimetro_minutos integer DEFAULT 0,
ADD COLUMN horimetro_segundos integer DEFAULT 0;

COMMENT ON COLUMN leituras_tempo_real.horimetro_horas IS 'Horas do horímetro (ex: 285)';
COMMENT ON COLUMN leituras_tempo_real.horimetro_minutos IS 'Minutos do horímetro (ex: 30)';
COMMENT ON COLUMN leituras_tempo_real.horimetro_segundos IS 'Segundos do horímetro (ex: 15)';
```

### Parte 2: Atualizar VPS Script

Depois que o scan identificar os registradores corretos, modificar `ler_todos_registradores()` para:

```python
# Exemplo: Se horímetro estiver em 3 registradores BCD
dados["horimetro_horas"] = bcd_to_int(reg_horas)      # 285
dados["horimetro_minutos"] = bcd_to_int(reg_minutos)  # 30
dados["horimetro_segundos"] = bcd_to_int(reg_segundos) # 15
```

### Parte 3: Atualizar Edge Function

Modificar `modbus-receiver/index.ts` para aceitar e salvar os novos campos:

```typescript
interface ModbusReading {
  // ... campos existentes ...
  horimetro_horas?: number;
  horimetro_minutos?: number;
  horimetro_segundos?: number;
}

// Na inserção:
horimetro_horas: reading.horimetro_horas,
horimetro_minutos: reading.horimetro_minutos,
horimetro_segundos: reading.horimetro_segundos,
```

### Parte 4: Atualizar Dashboard

Criar função helper para formatar e exibir corretamente:

```typescript
// src/lib/formatters.ts
export function formatHorimetro(
  horas: number, 
  minutos: number, 
  segundos: number
): string {
  const h = String(horas).padStart(5, '0');
  const m = String(minutos).padStart(2, '0');
  const s = String(segundos).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// Resultado: "00285:30:15"
```

No Dashboard.tsx:
```tsx
<MetricCard
  label="Horas Trabalhadas"
  value={formatHorimetro(
    readings.horimetro_horas ?? 0,
    readings.horimetro_minutos ?? 0,
    readings.horimetro_segundos ?? 0
  )}
  icon={<Clock className="w-5 h-5" />}
/>
```

## Pré-Requisito: Descobrir Registradores Corretos

Antes de implementar, você precisa rodar o scan v2.4.1 com sucesso:

1. Copiar o script completo para a VPS (1036 linhas)
2. Parar o serviço: `sudo systemctl stop gmg-lovable`
3. Rodar: `python3 /root/gmg-lovable/vps-modbus-reader.py --scan`
4. Aguardar HF2211 conectar (10-30 segundos)
5. Analisar os 64 registradores buscando valor ~285

O scan vai mostrar candidatos a horímetro com interpretação BCD. Uma vez identificado, atualizamos o script VPS e implementamos este plano.

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `migration` | Adicionar 3 colunas (horas, minutos, segundos) |
| `supabase/functions/modbus-receiver/index.ts` | Aceitar novos campos |
| `docs/vps-modbus-reader.py` | Ler registradores corretos |
| `src/hooks/useRealtimeReadings.ts` | Incluir novos campos na interface |
| `src/lib/formatters.ts` | Nova função `formatHorimetro()` |
| `src/pages/Dashboard.tsx` | Usar formatador |

## Resultado Esperado

Após implementação:
- Visor físico: `00285:30:15`
- Dashboard: `00285:30:15`
- Banco de dados: `horimetro_horas=285, horimetro_minutos=30, horimetro_segundos=15`
