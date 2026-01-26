
# Script de Diagnóstico para Varredura de Endereços Modbus

## Objetivo
Criar um script Python de diagnóstico que faz varredura dos endereços Modbus de 0 a 10 para descobrir em qual endereço o controlador K30XL está respondendo.

## Problema Atual
O script `vps-modbus-reader.py` está configurado para usar o endereço Modbus **1** (linha 72: `endereco_modbus: 1`), mas o K30XL pode estar configurado com um endereço diferente, causando os timeouts observados nos logs.

## Solução Proposta

### Arquivo a Criar
`docs/vps-modbus-scanner.py` - Script independente de diagnóstico

### Funcionalidades do Script

1. **Varredura de Endereços**: Testa endereços Modbus de 0 a 10
2. **Teste Simples**: Usa apenas o primeiro registrador (0x0000 - Tensão Rede R-S)
3. **Logging Detalhado**: Mostra exatamente o que está sendo enviado e recebido
4. **Timeout Configurável**: Permite ajustar para redes mais lentas
5. **Relatório Final**: Lista todos os endereços que responderam

### Estrutura do Script

```text
┌─────────────────────────────────────────┐
│     vps-modbus-scanner.py               │
├─────────────────────────────────────────┤
│ 1. Configuração (porta 15002, timeout)  │
│ 2. Aguarda conexão do HF2211            │
│ 3. Loop de varredura (addr 0→10):       │
│    - Monta frame Modbus RTU             │
│    - Envia requisição FC=0x03           │
│    - Aguarda resposta (3s timeout)      │
│    - Valida CRC e registra resultado    │
│ 4. Exibe relatório com endereços ativos │
└─────────────────────────────────────────┘
```

### Comandos para Execução na VPS

```bash
# Parar o serviço principal (liberar porta 15002)
sudo systemctl stop gmg-lovable

# Executar o scanner
python3 vps-modbus-scanner.py

# Após descobrir o endereço, reiniciar serviço
sudo systemctl start gmg-lovable
```

### Características Técnicas

| Parâmetro | Valor |
|-----------|-------|
| Porta TCP | 15002 |
| Função Modbus | 0x03 (Read Holding Registers) |
| Registrador Teste | 0x0000 (Tensão Rede R-S) |
| Quantidade | 1 registrador |
| Timeout por endereço | 3 segundos |
| Delay entre testes | 0.5 segundos |

### Saída Esperada

```
=== SCANNER DE ENDEREÇOS MODBUS K30XL ===
Aguardando conexão do HF2211 na porta 15002...
HF2211 conectado de (200.129.129.2, XXXX)

Testando endereço 0... Timeout
Testando endereço 1... Timeout
Testando endereço 2... RESPOSTA! Valor: 380V
...

=== RESULTADO DA VARREDURA ===
Endereços que responderam: [2]
Recomendação: Alterar endereco_modbus para 2 no script principal
```

## Detalhes Técnicos

O script será baseado na classe `ConexaoHF` existente, simplificado para:
- Aceitar apenas uma conexão
- Testar cada endereço sequencialmente
- Mostrar os bytes TX/RX em hexadecimal para debug
- Identificar qual endereço retorna uma resposta válida

Após descobrir o endereço correto, será necessário atualizar a configuração em `vps-modbus-reader.py` na linha 72.
