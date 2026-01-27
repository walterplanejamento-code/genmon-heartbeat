
# Plano de Correção: Leituras Modbus K30XL

## Diagnóstico dos Problemas

### Problema 1: Recebimento Incompleto de Dados
O loop de recebimento para quando recebe **5 bytes**, mas as respostas Modbus são maiores:
- **Bloco 1** (9 registradores): 1 + 1 + 1 + 18 + 2 = **23 bytes**
- **Bloco 2** (7 registradores): 1 + 1 + 1 + 14 + 2 = **19 bytes**

Isso explica porque o horímetro oscila - às vezes recebe bytes completos, às vezes parciais.

### Problema 2: Partidas Não Aparecendo
O log de partidas usa `logger.debug()` que não é exibido. Além disso, se os dados estão incompletos (problema 1), o valor pode estar corrompido.

### Problema 3: CRC Ignorado
Dados com CRC inválido são processados mesmo assim, causando valores aleatórios.

---

## Solução Proposta

### Correção 1: Calcular Tamanho Esperado da Resposta

Modificar o método `enviar_comando_modbus_rtu` para:
1. Calcular o tamanho exato esperado da resposta baseado na quantidade de registradores
2. Aguardar até receber todos os bytes ou timeout
3. Log dos bytes brutos recebidos para debug

```python
# Antes (linha 258-265):
if len(resposta) >= 5:
    break

# Depois:
# Calcular tamanho esperado: addr(1) + fc(1) + bytecount(1) + data(qty*2) + crc(2)
tamanho_esperado = 5 + (quantidade * 2)
if len(resposta) >= tamanho_esperado:
    break
```

### Correção 2: Rejeitar Dados com CRC Inválido

Modificar `ler_bloco_registradores` para:
1. Rejeitar respostas com CRC inválido (retornar None)
2. Forçar nova tentativa na próxima iteração

```python
# Antes (linha 322-324):
if crc_recebido != crc_calculado:
    self.logger.warning(f"CRC inválido...")
    # Continua mesmo com CRC errado para debug

# Depois:
if crc_recebido != crc_calculado:
    self.logger.error(f"CRC inválido: recebido=0x{crc_recebido:04X}, calculado=0x{crc_calculado:04X}")
    self.logger.error(f"Resposta descartada: {resposta.hex(' ').upper()}")
    return None  # Rejeita dados corrompidos
```

### Correção 3: Log Detalhado de Partidas

Mudar o log de partidas de `debug` para `info`:

```python
# Antes (linha 432):
self.logger.debug(f"  [0x000F] Partidas: {valores_bloco2[2]}")

# Depois:
self.logger.info(f"  [DEBUG] Reg 0x000F (Partidas) raw: {valores_bloco2[2]}")
```

### Correção 4: Log dos Bytes Brutos do Bloco 2

Adicionar log de todos os bytes brutos recebidos para diagnóstico:

```python
# Após linha 408, adicionar:
self.logger.info(f"  [DEBUG] Bloco 2 raw bytes: {[f'0x{v:04X}' for v in valores_bloco2]}")
```

---

## Arquivos a Modificar

| Arquivo | Linhas | Alteração |
|---------|--------|-----------|
| `docs/vps-modbus-reader.py` | 234-275 | Modificar `enviar_comando_modbus_rtu` para receber quantidade e calcular tamanho esperado |
| `docs/vps-modbus-reader.py` | 285-290 | Passar quantidade para o método de envio |
| `docs/vps-modbus-reader.py` | 322-325 | Rejeitar CRC inválido |
| `docs/vps-modbus-reader.py` | 408-432 | Adicionar logs DEBUG detalhados |

---

## Resultado Esperado

Após as correções:
1. **Horímetro estável** - Dados completos e validados por CRC
2. **Partidas visíveis** - Logs mostrarão o valor real do registrador 0x000F
3. **Dados confiáveis** - Apenas leituras com CRC válido serão processadas

---

## Passos de Implementação

1. Atualizar `docs/vps-modbus-reader.py` com todas as correções
2. Copiar para a VPS: `nano /root/gmg-lovable/vps-modbus-reader.py`
3. Reiniciar serviço: `systemctl restart gmg-lovable`
4. Verificar logs: `journalctl -u gmg-lovable -f`

Os logs agora mostrarão:
```
[DEBUG] Bloco 2 raw bytes: [0x0000, 0x1A2B, 0x001F, 0x0050, ...]
[DEBUG] Reg 0x000D (raw): 0 (0x0000)
[DEBUG] Reg 0x000E (raw): 6699 (0x1A2B)
[DEBUG] Reg 0x000F (Partidas) raw: 31
```

Com esses valores brutos, poderemos identificar a ordem correta dos bytes e confirmar se as partidas estão sendo lidas.
