#!/bin/bash
# =============================================================================
# VPS Setup Script - Lovable GMG Monitoring
# =============================================================================
# 
# Este script configura a VPS para o projeto Lovable de monitoramento de geradores.
# Substitui o Malta Generator (beta) pelo nosso sistema de produção.
#
# Uso:
#   chmod +x vps-setup.sh
#   sudo ./vps-setup.sh
#
# =============================================================================

set -e

echo "=========================================="
echo "VPS Setup - Lovable GMG Monitoring"
echo "=========================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =============================================================================
# FASE 1: Parar Malta Generator
# =============================================================================
echo -e "\n${YELLOW}[FASE 1]${NC} Parando Malta Generator..."

if command -v pm2 &> /dev/null; then
    pm2 stop hf2211-tcp 2>/dev/null || echo "hf2211-tcp não está rodando"
    pm2 delete hf2211-tcp 2>/dev/null || echo "hf2211-tcp não existe no PM2"
    pm2 save 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Malta Generator parado"
else
    echo -e "${YELLOW}!${NC} PM2 não instalado, pulando..."
fi

# Verificar se a porta 15002 foi liberada
sleep 2
if ss -tlnp | grep -q ":15002"; then
    echo -e "${RED}✗${NC} ERRO: Porta 15002 ainda está em uso!"
    ss -tlnp | grep ":15002"
    exit 1
else
    echo -e "${GREEN}✓${NC} Porta 15002 liberada"
fi

# =============================================================================
# FASE 2: Configurar ambiente Python
# =============================================================================
echo -e "\n${YELLOW}[FASE 2]${NC} Configurando ambiente Python..."

# Criar diretório se não existir
mkdir -p /root/gmg-lovable
mkdir -p /root/gmg-lovable/logs

# Verificar se venv existe, senão criar
if [ ! -d "/root/venv-gmg" ]; then
    echo "Criando ambiente virtual Python..."
    python3 -m venv /root/venv-gmg
fi

# Instalar dependências
echo "Instalando dependências..."
/root/venv-gmg/bin/pip install --upgrade pip
/root/venv-gmg/bin/pip install requests

echo -e "${GREEN}✓${NC} Ambiente Python configurado"

# =============================================================================
# FASE 3: Copiar script Python
# =============================================================================
echo -e "\n${YELLOW}[FASE 3]${NC} Instalando script de leitura Modbus..."

# O script deve ser copiado manualmente ou via SCP
SCRIPT_PATH="/root/gmg-lovable/vps-modbus-reader.py"

if [ -f "$SCRIPT_PATH" ]; then
    echo -e "${GREEN}✓${NC} Script encontrado em $SCRIPT_PATH"
else
    echo -e "${YELLOW}!${NC} Script não encontrado. Copie o arquivo vps-modbus-reader.py para:"
    echo "    $SCRIPT_PATH"
    echo ""
    echo "Use: scp docs/vps-modbus-reader.py root@82.25.70.90:/root/gmg-lovable/"
fi

# =============================================================================
# FASE 4: Criar serviço systemd
# =============================================================================
echo -e "\n${YELLOW}[FASE 4]${NC} Criando serviço systemd..."

cat > /etc/systemd/system/gmg-lovable.service << 'EOF'
[Unit]
Description=GMG Lovable Modbus Reader
Documentation=https://docs.lovable.dev
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/gmg-lovable
ExecStart=/root/venv-gmg/bin/python /root/gmg-lovable/vps-modbus-reader.py
Restart=always
RestartSec=10

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=gmg-lovable

# Security
NoNewPrivileges=true

# Environment
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✓${NC} Serviço systemd criado"

# =============================================================================
# FASE 5: Habilitar e iniciar serviço
# =============================================================================
echo -e "\n${YELLOW}[FASE 5]${NC} Habilitando serviço..."

systemctl daemon-reload
systemctl enable gmg-lovable

if [ -f "$SCRIPT_PATH" ]; then
    echo "Iniciando serviço..."
    systemctl start gmg-lovable
    sleep 3
    
    if systemctl is-active --quiet gmg-lovable; then
        echo -e "${GREEN}✓${NC} Serviço iniciado com sucesso!"
    else
        echo -e "${RED}✗${NC} Erro ao iniciar serviço. Verificando logs..."
        journalctl -u gmg-lovable -n 20 --no-pager
    fi
else
    echo -e "${YELLOW}!${NC} Serviço não iniciado (script não encontrado)"
    echo "    Após copiar o script, execute:"
    echo "    sudo systemctl start gmg-lovable"
fi

# =============================================================================
# FASE 6: Comandos úteis
# =============================================================================
echo ""
echo "=========================================="
echo -e "${GREEN}Setup concluído!${NC}"
echo "=========================================="
echo ""
echo "Comandos úteis:"
echo "  Ver status:      sudo systemctl status gmg-lovable"
echo "  Ver logs:        sudo journalctl -u gmg-lovable -f"
echo "  Reiniciar:       sudo systemctl restart gmg-lovable"
echo "  Parar:           sudo systemctl stop gmg-lovable"
echo ""
echo "Verificar porta 15002:"
echo "  ss -tlnp | grep 15002"
echo ""
echo "Testar envio simulado:"
echo "  cd /root/gmg-lovable && /root/venv-gmg/bin/python vps-modbus-reader.py --teste"
echo ""
echo "=========================================="
echo "Próximo passo: Configurar HF2211"
echo "=========================================="
echo "1. Acesse http://192.168.16.253 (rede local do gerador)"
echo "2. Configure Serial Settings:"
echo "   - Baudrate: 19200"
echo "   - Data bits: 8"
echo "   - Parity: None"
echo "   - Stop bits: 1"
echo "3. Configure TCP Client Mode:"
echo "   - Remote IP: 82.25.70.90"
echo "   - Remote Port: 15002"
echo "4. Salve e reinicie o HF2211"
echo ""
