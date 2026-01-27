
# Plano de Ação: Estabilização das Leituras Modbus K30XL

## Problema Atual

O horímetro continua oscilando mesmo após as correções anteriores. Isso indica que ainda há **dessincronização de bytes** no socket TCP.

## Causa Raiz Identificada

O socket TCP pode ter **bytes residuais** de leituras anteriores que "contaminam" a próxima leitura. Quando o CRC falha, descartamos, mas o próximo frame começa com os bytes residuais do anterior, causando leituras erradas com CRC que por acaso bate.

## Solução Definitiva: Modo Debug Completo (Sem Salvar no Banco)

### Correção 1: Limpar Buffer Antes de Cada Leitura

Adicionar limpeza do socket antes de enviar cada comando Modbus para evitar bytes residuais.

### Correção 2: Modo "Somente Log" (Não Envia para Backend)

Adicionar flag `--debug` que:
- Lê dados reais do controlador
- Mostra TODOS os bytes brutos no log
- **NÃO envia para o banco de dados**

### Correção 3: Validação de Valores Físicos

Adicionar verificação de faixa para detectar valores impossíveis:
- Horímetro: 0 a 999.999 horas (valor máximo físico razoável)
- Se o valor estiver fora da faixa, descarta a leitura

### Correção 4: Log Hexadecimal Completo da Resposta

Mostrar a resposta raw COMPLETA antes de processar para verificar visualmente se os dados estão corretos.

## Arquivo a Modificar

`docs/vps-modbus-reader.py`

## Alterações Específicas

### 1. Nova Variável Global (após linha 52)

```python
# Modo debug: não envia para backend, só mostra logs
MODO_DEBUG = False
```

### 2. Função de Limpeza de Buffer (antes da linha 225)

```python
def limpar_buffer_socket(self):
    """Limpa bytes residuais do socket antes de nova leitura"""
    if not self.socket_cliente:
        return
    try:
        self.socket_cliente.setblocking(False)
        while True:
            try:
                lixo = self.socket_cliente.recv(256)
                if lixo:
                    self.logger.warning(f"Bytes residuais descartados: {lixo.hex(' ').upper()}")
                else:
                    break
            except BlockingIOError:
                break
        self.socket_cliente.setblocking(True)
        self.socket_cliente.settimeout(0.5)
    except Exception as e:
        self.logger.debug(f"Erro ao limpar buffer: {e}")
```

### 3. Chamar Limpeza Antes de Cada Comando (linha 258, antes de send)

```python
# Limpa buffer antes de enviar
self.limpar_buffer_socket()
```

### 4. Validação de Horímetro (linhas 425-440)

```python
# Validar faixa física do horímetro
MAX_HORIMETRO_HORAS = 500000  # Limite razoável: ~57 anos

horimetro_big = (valores_bloco2[0] << 16) | valores_bloco2[1]
horimetro_little = (valores_bloco2[1] << 16) | valores_bloco2[0]

horas_big = horimetro_big / 3600.0
horas_little = horimetro_little / 3600.0

self.logger.info(f"  [DEBUG] Horímetro Big-Endian: {horas_big:.2f} h")
self.logger.info(f"  [DEBUG] Horímetro Little-Endian: {horas_little:.2f} h")

# Escolher a interpretação que faz sentido físico
if 0 < horas_big < MAX_HORIMETRO_HORAS:
    horas_trabalhadas = round(horas_big, 2)
elif 0 < horas_little < MAX_HORIMETRO_HORAS:
    horas_trabalhadas = round(horas_little, 2)
    self.logger.warning("Usando Little-Endian para horímetro!")
else:
    self.logger.error(f"Horímetro INVÁLIDO! Big={horas_big:.2f}h, Little={horas_little:.2f}h")
    horas_trabalhadas = None  # Não salva valor inválido

if horas_trabalhadas is not None:
    dados["horas_trabalhadas"] = horas_trabalhadas
```

### 5. Não Enviar em Modo Debug (linha 562)

```python
if dados:
    log.info(f"Dados lidos: {len(dados)} parâmetros")
    if not MODO_DEBUG:
        enviar_para_backend(porta_vps, dados)
    else:
        log.info("MODO DEBUG: Dados NÃO enviados para backend")
```

### 6. Ativar Modo Debug pelo Argumento (linhas 734-740)

```python
if __name__ == "__main__":
    import sys
    
    if "--teste" in sys.argv:
        testar_envio_simulado()
    elif "--debug" in sys.argv:
        MODO_DEBUG = True
        logger.info("*** MODO DEBUG ATIVADO - Dados NÃO serão salvos ***")
        main()
    else:
        main()
```

## Instruções de Implantação

1. Copiar o código completo atualizado para a VPS
2. Parar o serviço: `systemctl stop gmg-lovable`
3. Atualizar: `nano /root/gmg-lovable/vps-modbus-reader.py`
4. Testar em modo debug: `python3 /root/gmg-lovable/vps-modbus-reader.py --debug`
5. Monitorar os logs no terminal
6. Se os dados estabilizarem, rodar sem `--debug` para enviar ao backend

## Resultado Esperado

Com essas correções:
1. **Buffer limpo** antes de cada leitura = sem contaminação de bytes
2. **Valores impossíveis rejeitados** = só dados válidos
3. **Modo debug** = testar sem poluir o banco
4. **Logs completos** = ver exatamente o que chega do controlador
