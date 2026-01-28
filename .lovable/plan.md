
# Plano: Corrigir Exibição de Horas Trabalhadas (Formato 00285:30:15)

## ✅ IMPLEMENTADO COMPLETO

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
- `src/pages/Dashboard.tsx` - Exibe no formato `00285:00:00`

### Parte 4: VPS Script v2.5.0 ✅
Arquivo: `docs/vps-modbus-reader.py`
Alterações:
- Bloco 1 expandido: 0x0000-0x000B (12 registradores)
- Horímetro confirmado em 0x000B (horas inteiras)
- Bloco 2 reduzido: 0x0010-0x0013 (4 registradores)
- Envia: `horimetro_horas`, `horimetro_minutos=0`, `horimetro_segundos=0`

## Próximo Passo

Copiar o script v2.5.0 para a VPS e reiniciar o serviço:

```bash
# Na VPS
rm /root/gmg-lovable/vps-modbus-reader.py
nano /root/gmg-lovable/vps-modbus-reader.py
# Colar conteúdo do arquivo docs/vps-modbus-reader.py

# Verificar
wc -l /root/gmg-lovable/vps-modbus-reader.py  # Esperado: ~1000+ linhas

# Reiniciar
sudo systemctl restart gmg-lovable
sudo systemctl status gmg-lovable
```

## Resultado Esperado

- Visor físico: `00285:30:15`
- Dashboard: `00284:00:00` (horas corretas, minutos/segundos zerados por enquanto)
- Banco de dados: `horimetro_horas=284, horimetro_minutos=0, horimetro_segundos=0`
