
# Plano: Correção do Mapeamento de Registradores K30XL

## Problema Identificado

A sincronização v2.2.0 está funcionando corretamente (CRC OK, frames válidos), mas o **mapeamento dos registradores está incorreto** para este controlador K30XL específico.

### Evidência Concreta

| Display Físico | Log VPS | Conclusão |
|----------------|---------|-----------|
| Partidas: **625** | Reg 0x0010 = 0x0271 = **625** | ✅ Reg 0x0010 = Partidas (não Status!) |
| Horímetro: **285:30h** | 266221.8 h | ❌ Interpretação errada |

O valor 0x0271 = 625 decimal está no **Reg 0x0010**, mas o script interpreta esse registrador como "Status Bits".

### Análise do Horímetro

Valor recebido: `Reg 0x000D = 0x3920 = 14624`

Possíveis interpretações:
- Em segundos: 14624 / 3600 = 4.06h ❌
- Em minutos: 14624 / 60 = 243.7h (próximo de 285h, mas não exato)
- Formato BCD ou diferente?

---

## Solução Proposta

### 1. Corrigir Mapeamento do Bloco 2

Ajustar a interpretação dos registradores no script:

```text
ATUAL (Errado):
  Índice 0-1: Horímetro (0x000D-0x000E) em segundos
  Índice 2:   Partidas (0x000F)
  Índice 3:   Status Bits (0x0010)

PROPOSTO (Baseado nas evidências):
  Índice 0-1: Horímetro (0x000D-0x000E) em MINUTOS (não segundos!)
  Índice 3:   Partidas (0x0010) → 625 ✓
  Índice ?:   Status Bits (outro registrador?)
```

### 2. Testar Horímetro em Minutos

Se `14624 minutos / 60 = 243.7 horas`, está próximo mas não exato.

Vamos testar também se é **décimos de minuto**:
- 14624 * 0.1 min / 60 = 24.37h ❌

Ou se os dois words (0x3920 + 0x0000) devem ser lidos como **word-swap**:
- 0x00003920 / 60 = 243.73h (ainda não bate)

**Hipótese mais provável**: O valor pode estar em um formato proprietário STEMAC que precisa de validação adicional.

### 3. Adicionar Scan de Registradores

Criar função para ler TODOS os registradores de 0x0000 a 0x0020 e mostrar os valores para descobrir onde realmente está cada dado.

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `docs/vps-modbus-reader.py` | Corrigir mapeamento: 0x0010 = Partidas |
| `docs/vps-modbus-reader.py` | Testar horímetro em minutos em vez de segundos |
| `docs/vps-modbus-reader.py` | Adicionar modo `--scan` para varrer registradores |

---

## Código: Correção Principal

```python
# ANTES (linha 557-559):
# Índice 2: Partidas (0x000F)
if len(valores_bloco2) >= 3:
    dados["numero_partidas"] = valores_bloco2[2]

# DEPOIS (correção):
# Índice 3: Partidas (0x0010) - CONFIRMADO pelo display físico!
if len(valores_bloco2) >= 4:
    dados["numero_partidas"] = valores_bloco2[3]  # Era valores_bloco2[2]
    self.logger.info(f"  Reg 0x0010 (Partidas): {valores_bloco2[3]}")
```

```python
# ANTES: Horímetro em segundos
horas_big = horimetro_big / 3600.0

# DEPOIS: Testar horímetro em minutos
horas_big = horimetro_big / 60.0  # Assumindo valor em minutos
```

---

## Código: Modo Scan de Registradores

Adicionar novo argumento `--scan` para fazer varredura completa:

```python
def scan_registradores(self) -> None:
    """Lê registradores de 0x0000 a 0x001F e mostra todos os valores"""
    self.logger.info("=" * 60)
    self.logger.info("=== SCAN DE REGISTRADORES 0x0000-0x001F ===")
    
    valores = self.ler_bloco_registradores(0x0000, 32)  # 32 registradores
    
    if valores:
        for i, val in enumerate(valores):
            self.logger.info(f"  Reg 0x{i:04X}: {val:5d} (0x{val:04X})")
    
    self.logger.info("=" * 60)
```

Isso vai mostrar TODOS os valores para você identificar exatamente onde está cada dado.

---

## Resultado Esperado

1. **Partidas corrigidas**: Vai mostrar 625 corretamente
2. **Scan de registradores**: Você poderá ver todos os valores e confirmar o mapeamento
3. **Horímetro**: Após o scan, vamos identificar o formato correto

---

## Próximos Passos Após Aprovação

1. Atualizar script com correção de partidas (0x0010)
2. Adicionar modo `--scan` 
3. Você roda `python3 vps-modbus-reader.py --scan` na VPS
4. Com os 32 registradores visíveis, identificamos o formato do horímetro

---

## Seção Técnica

### Por que o mapeamento está diferente do manual?

O manual STEMAC K30XL pode ter variações entre versões (1.0 a 3.01). O controlador no campo pode estar usando um layout de registradores ligeiramente diferente do documentado.

### Bytes do Bloco 2 decomposto:

```text
RX: 01 03 0E 39 20 00 00 00 00 02 71 00 00 00 00 00 00 49 92
    │  │  │  └──────────────────────────────────────┘  └───┘
    │  │  │         14 bytes de dados (7 regs)          CRC
    │  │  └── Byte count = 14
    │  └── Function code = 03
    └── Slave = 01

Dados:
  39 20 = Reg 0x000D = 0x3920 = 14624 (Horímetro?)
  00 00 = Reg 0x000E = 0x0000 = 0
  00 00 = Reg 0x000F = 0x0000 = 0
  02 71 = Reg 0x0010 = 0x0271 = 625 (PARTIDAS! ✓)
  00 00 = Reg 0x0011 = 0
  00 00 = Reg 0x0012 = 0
  00 00 = Reg 0x0013 = 0 (Combustível)
```

O valor 625 está definitivamente em 0x0010, confirmando que o script estava interpretando errado.
