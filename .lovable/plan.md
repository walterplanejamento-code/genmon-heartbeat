
# Correção do Timeout no vps-modbus-reader.py

## Problema Identificado

O scanner funciona porque usa um loop de recebimento com timeout de 3 segundos, enquanto o reader principal usa apenas um delay fixo de 0.1s antes de tentar ler a resposta.

**Scanner (linha 173-182):**
```python
while time.time() - tempo_inicio < TIMEOUT_RESPOSTA:
    chunk = conexao.recv(256)
    if chunk:
        resposta += chunk
        if len(resposta) >= 5:
            break
```

**Reader (linha 255-257):**
```python
time.sleep(0.1)  # Muito curto!
resposta = self.socket_cliente.recv(256)
```

## Correção Necessária

Modificar o método `enviar_comando_modbus_rtu` no arquivo `vps-modbus-reader.py` para usar o mesmo padrão de recebimento gradual do scanner.

### Alterações no arquivo docs/vps-modbus-reader.py

**Linhas 255-260** - Substituir o recebimento simples por um loop com timeout:

```python
# De:
time.sleep(0.1)  # Delay para resposta do K30XL
resposta = self.socket_cliente.recv(256)

# Para:
tempo_inicio = time.time()
resposta = b''
while time.time() - tempo_inicio < self.config["timeout"]:
    try:
        chunk = self.socket_cliente.recv(256)
        if chunk:
            resposta += chunk
            # Resposta mínima válida: 5 bytes (addr + fc + bytecount + data + crc)
            if len(resposta) >= 5:
                break
    except socket.timeout:
        break
    time.sleep(0.05)  # Pequeno delay entre tentativas
```

## Passos para Implementar

1. **Atualizar o arquivo** `docs/vps-modbus-reader.py` no projeto Lovable
2. **Copiar para a VPS** novamente:
   ```bash
   nano /root/gmg-lovable/vps-modbus-reader.py
   # Colar o conteúdo corrigido
   ```
3. **Reiniciar o serviço**:
   ```bash
   systemctl restart gmg-lovable
   journalctl -u gmg-lovable -f
   ```

## Resultado Esperado

Com essa correção, o reader vai:
- Esperar até 3 segundos (configurável) para a resposta
- Acumular dados gradualmente (como o scanner faz)
- Parar assim que tiver dados suficientes

Os logs devem mostrar:
- "Lendo Bloco 1 (0x0000-0x0008)..."
- "Bloco 1: 9 registradores lidos"
- "LEITURA K30XL COMPLETA"
