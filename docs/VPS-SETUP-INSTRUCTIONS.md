# VPS Setup Instructions - Lovable GMG Monitoring

## Visão Geral

Este documento descreve como configurar a VPS (82.25.70.90) para o projeto Lovable de monitoramento de geradores, substituindo o sistema Malta Generator (beta).

## Arquitetura

```
[Gerador] → [K30XL] → [RS-232 @ 19200] → [HF2211] → [Internet] → [VPS:15002] → [Supabase]
```

## Pré-requisitos

- Acesso SSH à VPS: `ssh root@82.25.70.90`
- Python 3.8+ instalado
- Acesso local ao HF2211 (para configuração de baudrate)

## Passo 1: Parar Malta Generator

```bash
# Conectar à VPS
ssh root@82.25.70.90

# Parar e remover do PM2
pm2 stop hf2211-tcp
pm2 delete hf2211-tcp
pm2 save

# Verificar que a porta foi liberada
ss -tlnp | grep 15002
```

## Passo 2: Copiar Script Python

De sua máquina local:
```bash
scp docs/vps-modbus-reader.py root@82.25.70.90:/root/gmg-lovable/
```

## Passo 3: Executar Script de Setup

```bash
# Na VPS
chmod +x /root/gmg-lovable/vps-setup.sh
sudo /root/gmg-lovable/vps-setup.sh
```

Ou manualmente:

```bash
# Criar diretórios
mkdir -p /root/gmg-lovable/logs

# Criar/verificar venv
python3 -m venv /root/venv-gmg
/root/venv-gmg/bin/pip install requests

# Criar serviço systemd
cat > /etc/systemd/system/gmg-lovable.service << 'EOF'
[Unit]
Description=GMG Lovable Modbus Reader
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/gmg-lovable
ExecStart=/root/venv-gmg/bin/python /root/gmg-lovable/vps-modbus-reader.py
Restart=always
RestartSec=10
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

# Habilitar e iniciar
systemctl daemon-reload
systemctl enable gmg-lovable
systemctl start gmg-lovable
```

## Passo 4: Configurar HF2211

⚠️ **CRÍTICO**: O baudrate do HF2211 DEVE ser 19200 para comunicar com o K30XL.

1. Acesse o HF2211 na rede local: `http://192.168.16.253`
2. Vá em **Serial Settings**:
   - Baudrate: **19200**
   - Data bits: 8
   - Parity: None
   - Stop bits: 1
3. Vá em **TCP Client Mode**:
   - Remote IP: **82.25.70.90**
   - Remote Port: **15002**
4. Salve e reinicie o HF2211

## Passo 5: Verificar Funcionamento

```bash
# Ver logs em tempo real
sudo journalctl -u gmg-lovable -f

# Verificar status do serviço
sudo systemctl status gmg-lovable

# Testar envio simulado (opcional)
cd /root/gmg-lovable
/root/venv-gmg/bin/python vps-modbus-reader.py --teste
```

## Endpoints

| Componente | Endpoint |
|------------|----------|
| VPS TCP Server | `82.25.70.90:15002` |
| Health API | `http://82.25.70.90:3001/health` |
| Edge Function | `https://hwloajvxjsysutqfqpal.supabase.co/functions/v1/modbus-receiver` |

## Troubleshooting

### Porta em uso
```bash
# Verificar quem está usando a porta
ss -tlnp | grep 15002

# Matar processo se necessário
kill -9 $(lsof -t -i:15002)
```

### Timeout na leitura Modbus
1. Verificar baudrate do HF2211 (deve ser 19200)
2. Verificar conexão TCP: `ss -tlnp | grep 15002`
3. Verificar se HF2211 está conectado nos logs

### Serviço não inicia
```bash
# Ver logs detalhados
journalctl -u gmg-lovable -n 50 --no-pager

# Testar script manualmente
cd /root/gmg-lovable
/root/venv-gmg/bin/python vps-modbus-reader.py
```

## Configurações do Projeto

- **Supabase Project ID**: `hwloajvxjsysutqfqpal`
- **Edge Function**: `modbus-receiver`
- **Porta VPS**: `15002`
- **Identificador**: `porta_vps: "15002"`

## Fluxo de Dados

1. Script Python escuta na porta 15002
2. HF2211 conecta como TCP Client
3. Script faz polling Modbus RTU através da conexão
4. Dados são enviados via POST para Edge Function
5. Edge Function salva em `leituras_tempo_real`
6. Dashboard exibe dados em tempo real via Realtime subscription
