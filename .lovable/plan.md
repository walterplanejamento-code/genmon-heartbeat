
# Plano: Descoberta do Horímetro Real - Scan Extendido

## Problema Identificado

O Reg 0x000D está variando a cada leitura mesmo com o gerador desligado, indicando que **não é o horímetro**. O horímetro real de 285:30h deve estar em outro registrador.

| Leitura | Reg 0x000D | Observação |
|---------|------------|------------|
| 18:31:19 | 0x0829 (2089) | Byte LOW 0x29 fixo |
| 18:31:31 | 0x1529 (5417) | Byte LOW 0x29 fixo |
| 18:31:43 | 0x2129 (8489) | Byte LOW 0x29 fixo |

O valor 0x29 (41 decimal) repetido no byte LOW sugere que pode ser um formato de **timestamp interno** (ex: segundos ou contador de ciclo).

---

## Solução Proposta

### 1. Atualizar Script para Scan Extendido (0x0000-0x003F)

Expandir a varredura para 64 registradores para encontrar onde o horímetro realmente está armazenado:

```text
Bloco A: 0x0000-0x000F (16 regs) → Parâmetros elétricos
Bloco B: 0x0010-0x001F (16 regs) → Partidas e status
Bloco C: 0x0020-0x002F (16 regs) → Possível horímetro aqui?
Bloco D: 0x0030-0x003F (16 regs) → Reservado/outros
```

### 2. Adicionar Formato BCD (Binary Coded Decimal)

Alguns controladores industriais armazenam valores no formato BCD. Por exemplo:
- 285:30 poderia ser armazenado como 0x0285 (hex) ou 0x2853 (hhmm invertido)

### 3. Corrigir Versionamento

Garantir que o script na VPS seja atualizado para a versão v2.4.0 com o scan extendido.

---

## Arquivo a Modificar

| Arquivo | Ação |
|---------|------|
| `docs/vps-modbus-reader.py` | Expandir scan para 64 registradores (4 blocos de 16) |
| `docs/vps-modbus-reader.py` | Adicionar análise de formato BCD |
| `docs/vps-modbus-reader.py` | Corrigir versão para v2.4.0 |

---

## Código: Função scan_registradores Atualizada

```python
def scan_registradores(self) -> None:
    """
    MODO SCAN v2.4.0: Lê registradores de 0x0000 a 0x003F (64 regs)
    """
    self.logger.info("=" * 70)
    self.logger.info("=== MODO SCAN EXTENDIDO: 0x0000-0x003F (64 regs) ===")
    self.logger.info("=" * 70)
    
    # Ler 4 blocos de 16 registradores cada
    for bloco_num in range(4):
        endereco_base = bloco_num * 16
        self.logger.info(f">>> Bloco {bloco_num+1}: 0x{endereco_base:04X}-0x{endereco_base+15:04X}")
        
        valores = self.ler_bloco_registradores(endereco_base, 16)
        
        if valores:
            for i, val in enumerate(valores):
                endereco = endereco_base + i
                # Mostrar também interpretação BCD
                bcd_str = f"{(val >> 12) & 0xF}{(val >> 8) & 0xF}:{(val >> 4) & 0xF}{val & 0xF}"
                self.logger.info(
                    f"  0x{endereco:04X}: {val:6d} (0x{val:04X}) BCD={bcd_str}"
                )
        
        time.sleep(0.5)  # Delay entre blocos
    
    # Análise especial: buscar valor próximo de 285
    self.logger.info("=" * 70)
    self.logger.info("=== ANÁLISE: Buscando valores ~285 ===")
    # [código de análise]
```

---

## Próximos Passos

1. Atualizar o script `docs/vps-modbus-reader.py` para v2.4.0
2. Você copia o novo script para a VPS
3. Rodar: `python3 /root/gmg-lovable/vps-modbus-reader.py --scan`
4. Com os 64 registradores visíveis, identificamos exatamente onde está o horímetro de 285h

---

## Seção Técnica

### Por que o Reg 0x000D está variando?

Algumas possibilidades:
1. **Contador de ciclos internos**: Incrementa a cada execução do loop do controlador
2. **Timestamp de comunicação**: Marca temporal da última requisição
3. **Watchdog timer**: Contador que reseta periodicamente

### Onde o horímetro pode estar?

Baseado em manuais de controladores similares:
- **0x0020-0x0021**: Horímetro em alguns controladores
- **0x0100+**: Área de parâmetros de configuração
- O valor 285:30h = 17130 minutos = 0x42EA ou em formato especial

### Interpretação do valor 625 (Partidas)

Confirmado que 0x0010 = 0x0271 = 625 está correto e estável. Este mapeamento será mantido.
