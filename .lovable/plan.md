
# Plano: Corrigir Exibição de Horas Trabalhadas (Formato 00285:30:15)

## ✅ IMPLEMENTADO

### Parte 1: Schema do Banco de Dados ✅
Colunas adicionadas em `leituras_tempo_real`:
- `horimetro_horas` (integer)
- `horimetro_minutos` (integer)  
- `horimetro_segundos` (integer)

### Parte 2: Edge Function ✅
Arquivo: `supabase/functions/modbus-receiver/index.ts`
- Interface `ModbusReading` expandida com novos campos
- Inserção no banco inclui os 3 campos

### Parte 3: Frontend ✅
Arquivos modificados:
- `src/lib/formatters.ts` - Nova função `formatHorimetro()`
- `src/hooks/useRealtimeReadings.ts` - Interface `Reading` expandida
- `src/pages/Dashboard.tsx` - Exibe no formato `00285:30:15`

## ⏳ PENDENTE: VPS Script

Você precisa atualizar o script `vps-modbus-reader.py` na VPS para enviar os novos campos:

```python
# Em ler_todos_registradores(), após identificar os registradores corretos:
dados["horimetro_horas"] = valor_horas      # ex: 285
dados["horimetro_minutos"] = valor_minutos  # ex: 30
dados["horimetro_segundos"] = valor_segundos # ex: 15
```

## Próximo Passo

1. Rodar o scan v2.4.1 na VPS: `python3 vps-modbus-reader.py --scan`
2. Identificar quais registradores contêm o horímetro (~285:30)
3. Atualizar o script VPS para ler esses registradores
4. Os dados fluirão automaticamente para o Dashboard no formato correto
