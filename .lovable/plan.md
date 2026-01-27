
# Plano: Corrigir Fluxo de Conexão no Script v2.4.0

## Problema Identificado

O script v2.4.0 está tentando ler registradores **ANTES** do HF2211 conectar. Compare os logs:

| Versão | Comportamento |
|--------|---------------|
| v2.2.0 | `Servidor iniciado` → `HF2211 conectado de (200.129.129.2)` → `Lendo Bloco 1` |
| v2.4.0 | `Servidor iniciado` → `Lendo Bloco 1` → `Falha na leitura` ← HF nunca conectou! |

A raiz do problema: O método `scan_registradores` loga "Lendo Bloco 1" (linha 498) mesmo quando `socket_cliente` é `None`, porque não verifica a conexão antes de tentar.

---

## Solução

### 1. Adicionar Verificação de Conexão em `ler_bloco_registradores`

O método precisa retornar `None` imediatamente se não houver conexão ativa, com log informativo:

```python
def ler_bloco_registradores(self, endereco_inicial: int, quantidade: int) -> Optional[list]:
    """Lê um bloco de registradores holding (função 0x03)"""
    # CORREÇÃO: Verificar conexão antes de tentar ler
    if not self.cliente_conectado or not self.socket_cliente:
        self.logger.warning("Sem conexão - aguardando HF2211...")
        return None
    
    resposta = self.enviar_comando_modbus_rtu(0x03, endereco_inicial, quantidade)
    # ... resto do código
```

### 2. Aguardar Conexão Explicitamente no Modo SCAN

Modificar o worker para garantir que a conexão seja estabelecida antes de chamar `scan_registradores`:

```python
# No worker_gerador (linha 809):
if MODO_SCAN:
    # Aguardar conexão antes do scan
    while not conexao.cliente_conectado:
        log.info("Aguardando HF2211 conectar para iniciar scan...")
        if conexao.aceitar_conexao():
            break
        time.sleep(1)
    
    conexao.scan_registradores()
    log.info("Scan completo. Encerrando...")
    break
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `docs/vps-modbus-reader.py` | Linha ~405: Adicionar log de "sem conexão" |
| `docs/vps-modbus-reader.py` | Linha ~809: Aguardar conexão antes do scan |

---

## Fluxo Corrigido

```text
1. Script inicia servidor TCP na porta 15002
2. Script exibe "Aguardando HF2211 conectar para iniciar scan..."
3. HF2211 reconecta (~10-20 segundos após porta ficar disponível)
4. Script exibe "HF2211 conectado de (IP)"
5. Script executa scan_registradores() com 4 blocos de 16 regs
6. Resultado: 64 registradores lidos com interpretação BCD
```

---

## Após a Correção

Depois de aplicar as correções e rodar o scan:

```bash
# Na VPS
sudo systemctl stop gmg-lovable
python3 /root/gmg-lovable/vps-modbus-reader.py --scan
```

Você verá:
```
Servidor TCP iniciado na porta 15002
Aguardando HF2211 conectar para iniciar scan...
HF2211 conectado de ('200.129.129.2', 5663)
=== MODO SCAN EXTENDIDO v2.4.0 ===
>>> BLOCO 1: 0x0000-0x000F
  0x0000:      0 (0x0000)  BCD=00:00  HHMM=  0h00m
  0x0001:    219 (0x00DB)  BCD=00:DB  HHMM=  2h19m
  ... (64 registradores)
=== ANÁLISE: BUSCANDO HORÍMETRO 285:30h ===
CANDIDATOS A HORÍMETRO:
  0x00XX: 285 (horas_direto)
```

---

## Seção Técnica

### Por que o HF2211 não conectou a tempo?

1. Quando você para o serviço `gmg-lovable`, a conexão TCP é fechada
2. O HF2211 detecta a desconexão e entra em modo de reconexão
3. O HF2211 tipicamente demora 10-30 segundos para tentar reconectar
4. O script v2.4.0 não estava esperando essa reconexão

### Timeout do Servidor

O `socket_servidor.settimeout(5.0)` na linha 193 faz com que `accept()` bloqueie por apenas 5 segundos. Se o HF2211 não conectar nesse tempo, retorna `False` e o script deveria tentar novamente - mas o código de scan não estava respeitando esse loop.
