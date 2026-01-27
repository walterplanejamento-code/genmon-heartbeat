
# Plano: Página de Diagnóstico Modbus + Correção do Script VPS

## Resumo do Problema

Os dados estão chegando ao banco de dados com valores de horímetro completamente errados e oscilantes. O problema está no script da VPS que não está sincronizando corretamente a leitura dos bytes.

---

## Parte 1: Criar Página de Diagnóstico no Sistema

Criar uma nova página "Diagnóstico" que mostra:
- Bytes RAW recebidos do Modbus (em hexadecimal)
- Histórico das últimas 10 leituras com timestamp
- Comparação visual entre valores estáveis e instáveis
- Indicador de qualidade dos dados

### Novo Arquivo: `src/pages/Diagnostics.tsx`

Uma página completa com:
- Tabela mostrando últimas leituras do banco
- Destaque visual quando valores mudam muito entre leituras
- Botão para limpar dados antigos do banco (opcional)
- Exibição do tempo entre leituras

### Atualizar: `src/App.tsx`

Adicionar rota `/diagnostics` para a nova página.

### Atualizar: `src/components/layout/Sidebar.tsx`

Adicionar link "Diagnóstico" no menu lateral.

---

## Parte 2: Correção Definitiva do Script VPS

O problema real identificado nos logs:

```
Bloco 2 RAW: ['0x0306', ...] → Horímetro: 14090 h
Bloco 2 RAW: ['0x0E06', ...] → Horímetro: 65353 h
```

O primeiro byte (0x03 vs 0x0E) está mudando! Isso indica que o frame Modbus está começando em posições diferentes do buffer.

### Solução: Sincronização por Marcador de Início

Em vez de confiar que o primeiro byte recebido é sempre o endereço do dispositivo, vamos:
1. Descartar bytes até encontrar o padrão esperado: `01 03 XX`
2. Ler o byte count para saber quantos bytes esperar
3. Validar CRC antes de processar

### Correções no Script (`docs/vps-modbus-reader.py`):

1. **Nova função `sincronizar_resposta()`**
   - Busca o padrão `01 03` no buffer
   - Descarta bytes anteriores (lixo)
   - Lê a quantidade correta de bytes baseada no byte count

2. **Aumentar delay entre blocos**
   - Adicionar 500ms entre leitura do Bloco 1 e Bloco 2
   - Dar tempo para o buffer limpar completamente

3. **Log de bytes descartados**
   - Mostrar quantos bytes de lixo foram descartados
   - Isso ajuda a identificar se há problema no HF2211

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/Diagnostics.tsx` | **CRIAR** - Página de diagnóstico |
| `src/App.tsx` | Adicionar rota `/diagnostics` |
| `src/components/layout/Sidebar.tsx` | Adicionar link no menu |
| `docs/vps-modbus-reader.py` | Sincronização por marcador + delay entre blocos |

---

## Código da Página de Diagnóstico

A página vai:
1. Buscar as últimas 20 leituras do banco
2. Mostrar em tabela com destaque para valores que mudam muito
3. Calcular a variação percentual entre leituras consecutivas
4. Mostrar status de conexão em tempo real

---

## Código Atualizado do Script VPS

A correção principal será:

```python
def sincronizar_resposta(self, tamanho_esperado: int) -> bytes:
    """
    Sincroniza a leitura buscando o padrão de início Modbus.
    Descarta bytes de lixo até encontrar: [ADDR=01][FC=03][BYTECOUNT]
    """
    buffer = bytearray()
    lixo_descartado = 0
    
    while True:
        byte = self.socket_cliente.recv(1)
        if not byte:
            break
            
        buffer.append(byte[0])
        
        # Procura padrão de início: 01 03
        if len(buffer) >= 2:
            # Encontrou início válido
            if buffer[-2] == 0x01 and buffer[-1] == 0x03:
                # Descarta lixo anterior
                if len(buffer) > 2:
                    lixo_descartado = len(buffer) - 2
                    self.logger.warning(f"Bytes de lixo descartados: {lixo_descartado}")
                    buffer = buffer[-2:]
                
                # Lê o resto do frame
                byte_count = self.socket_cliente.recv(1)[0]
                buffer.append(byte_count)
                
                # Lê dados + CRC
                restante = byte_count + 2  # dados + 2 bytes CRC
                dados = self.socket_cliente.recv(restante)
                buffer.extend(dados)
                
                return bytes(buffer)
        
        # Limite de segurança
        if len(buffer) > 100:
            self.logger.error("Muitos bytes sem encontrar padrão válido")
            return bytes()
    
    return bytes(buffer)
```

---

## Resultado Esperado

1. **Página de Diagnóstico**: Você verá em tempo real se os dados estão estáveis ou oscilando
2. **Script VPS**: A sincronização por marcador vai garantir que sempre lemos do início correto do frame
3. **Dados Confiáveis**: O horímetro vai estabilizar no valor real do gerador

---

## Passos de Implantação

1. Aprovar este plano para eu criar a página de diagnóstico
2. Copiar o script atualizado para a VPS
3. Parar serviço: `systemctl stop gmg-lovable`
4. Executar em modo debug: `python3 vps-modbus-reader.py --debug`
5. Acompanhar na página de diagnóstico se os dados estabilizam
