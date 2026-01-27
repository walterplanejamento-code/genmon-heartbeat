

# Configuração Completa da VPS - Do Zero

Este guia vai te ajudar a configurar toda a infraestrutura de monitoramento do gerador na VPS, começando do zero.

---

## Visão Geral do Sistema

```text
┌─────────────┐    RS-232     ┌─────────┐   Internet   ┌─────────────────┐
│  Gerador    │──────────────▶│ HF2211  │─────────────▶│  VPS:15002      │
│  MWM D229-4 │   19200 bps   │         │              │  82.25.70.90    │
│  + K30XL    │               └─────────┘              └────────┬────────┘
└─────────────┘                                                 │
                                                                ▼
┌─────────────┐    Realtime   ┌─────────────────────────────────┐
│  Dashboard  │◀──────────────│  Lovable Cloud (Backend)        │
│  Web App    │               │  Tabela: leituras_tempo_real    │
└─────────────┘               └─────────────────────────────────┘
```

---

## FASE 1: Limpar Tudo que Existe na VPS

Execute esses comandos um por um no terminal da VPS (você já está como root):

```bash
# 1.1 - Ver o que está rodando na porta 15002
ss -tlnp | grep 15002

# 1.2 - Parar o serviço se estiver rodando
systemctl stop gmg-lovable 2>/dev/null
systemctl disable gmg-lovable 2>/dev/null

# 1.3 - Parar Malta Generator antigo (se existir)
pm2 stop hf2211-tcp 2>/dev/null
pm2 delete hf2211-tcp 2>/dev/null
pm2 save 2>/dev/null

# 1.4 - Remover pasta antiga
rm -rf /root/gmg-lovable

# 1.5 - Remover serviço antigo
rm -f /etc/systemd/system/gmg-lovable.service
systemctl daemon-reload

# 1.6 - Confirmar que porta está livre
ss -tlnp | grep 15002
```

Se o último comando não mostrar nada, a porta está livre.

---

## FASE 2: Criar Estrutura de Pastas

```bash
# 2.1 - Criar pasta do projeto
mkdir -p /root/gmg-lovable

# 2.2 - Criar ambiente virtual Python
python3 -m venv /root/venv-gmg

# 2.3 - Instalar dependência (requests)
/root/venv-gmg/bin/pip install requests

# 2.4 - Verificar instalação
/root/venv-gmg/bin/pip list
```

Deve mostrar `requests` na lista.

---

## FASE 3: Criar o Script Principal

Vamos criar o arquivo `vps-modbus-reader.py`. Execute:

```bash
nano /root/gmg-lovable/vps-modbus-reader.py
```

Depois cole TODO o conteúdo do arquivo que está em `docs/vps-modbus-reader.py` no projeto Lovable.

Para colar no nano:
1. Copie o conteúdo do arquivo do projeto
2. No terminal SSH, clique com botão direito para colar
3. Pressione `Ctrl+O` para salvar
4. Pressione `Enter` para confirmar
5. Pressione `Ctrl+X` para sair

**Verificar se criou corretamente:**
```bash
head -20 /root/gmg-lovable/vps-modbus-reader.py
```

Deve mostrar as primeiras 20 linhas do script.

---

## FASE 4: Criar o Scanner de Endereços

Este é um script auxiliar para descobrir qual endereço Modbus o K30XL usa:

```bash
nano /root/gmg-lovable/vps-modbus-scanner.py
```

Cole o conteúdo de `docs/vps-modbus-scanner.py` do projeto.

---

## FASE 5: Criar o Serviço Systemd

Isso faz o script iniciar automaticamente:

```bash
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
```

```bash
# Recarregar serviços
systemctl daemon-reload

# Habilitar para iniciar no boot
systemctl enable gmg-lovable
```

---

## FASE 6: Primeiro Teste - Descobrir Endereço Modbus

Antes de iniciar o serviço principal, vamos descobrir qual endereço o K30XL responde.

**Importante:** Certifique-se que o HF2211 está configurado para conectar na VPS:
- IP: 82.25.70.90
- Porta: 15002
- Baudrate: 19200

```bash
# Executar o scanner
cd /root/gmg-lovable
/root/venv-gmg/bin/python vps-modbus-scanner.py
```

O scanner vai:
1. Aguardar o HF2211 conectar (até 60 segundos)
2. Testar endereços de 0 a 10
3. Mostrar qual respondeu

**Se um endereço responder (ex: endereço 3):**
```bash
# Editar o script principal
nano /root/gmg-lovable/vps-modbus-reader.py

# Encontrar a linha 72 e alterar:
# De: "endereco_modbus": 1,
# Para: "endereco_modbus": 3,  (ou o número que respondeu)
```

---

## FASE 7: Iniciar o Serviço

```bash
# Iniciar
systemctl start gmg-lovable

# Ver status
systemctl status gmg-lovable

# Ver logs em tempo real
journalctl -u gmg-lovable -f
```

Nos logs você deve ver mensagens como:
- "Servidor TCP iniciado na porta 15002"
- "HF2211 conectado de ..."
- "LEITURA K30XL COMPLETA"

---

## Comandos Úteis (Referência)

| Ação | Comando |
|------|---------|
| Ver status | `systemctl status gmg-lovable` |
| Ver logs | `journalctl -u gmg-lovable -f` |
| Reiniciar | `systemctl restart gmg-lovable` |
| Parar | `systemctl stop gmg-lovable` |
| Ver porta | `ss -tlnp \| grep 15002` |
| Testar manual | `cd /root/gmg-lovable && /root/venv-gmg/bin/python vps-modbus-reader.py` |
| Modo teste | `/root/venv-gmg/bin/python vps-modbus-reader.py --teste` |

---

## Configuração do HF2211 (Lado do Gerador)

Se precisar reconfigurar o HF2211:

1. Conecte na rede local do gerador
2. Acesse: `http://192.168.16.253` (IP padrão do HF2211)
3. Configure **Serial Settings**:
   - Baudrate: **19200**
   - Data bits: 8
   - Parity: None
   - Stop bits: 1
4. Configure **TCP Client Mode**:
   - Remote IP: **82.25.70.90**
   - Remote Port: **15002**
5. Salve e reinicie o HF2211

---

## Detalhes Técnicos

### Arquivos no Projeto Lovable

| Arquivo | Descrição |
|---------|-----------|
| `docs/vps-modbus-reader.py` | Script principal de leitura Modbus |
| `docs/vps-modbus-scanner.py` | Scanner para descobrir endereço |
| `docs/VPS-SETUP-INSTRUCTIONS.md` | Documentação completa |
| `docs/vps-setup.sh` | Script automático de setup |
| `supabase/functions/modbus-receiver/index.ts` | Backend que recebe os dados |

### Arquivos na VPS

| Caminho | Descrição |
|---------|-----------|
| `/root/gmg-lovable/vps-modbus-reader.py` | Script principal |
| `/root/gmg-lovable/vps-modbus-scanner.py` | Scanner de endereços |
| `/root/venv-gmg/` | Ambiente Python virtual |
| `/etc/systemd/system/gmg-lovable.service` | Configuração do serviço |

### Fluxo de Dados

1. **VPS** escuta na porta 15002
2. **HF2211** conecta como TCP Client
3. **Script Python** envia comandos Modbus RTU pelo socket
4. **K30XL** responde com dados do gerador
5. **Script** processa e envia para a **Edge Function**
6. **Backend** salva na tabela `leituras_tempo_real`
7. **Dashboard** recebe via Realtime subscription

### Registradores Modbus K30XL

| Endereço | Parâmetro | Unidade |
|----------|-----------|---------|
| 0x0000 | Tensão Rede R-S | V |
| 0x0001 | Tensão Rede S-T | V |
| 0x0002 | Tensão Rede T-R | V |
| 0x0003 | Tensão GMG | V |
| 0x0004 | Corrente Fase 1 | A |
| 0x0005 | Frequência | Hz (×0.1) |
| 0x0006 | RPM Motor | RPM |
| 0x0007 | Tensão Bateria | V (×0.1) |
| 0x0008 | Temperatura Água | °C |
| 0x000D-E | Horímetro | segundos (32-bit) |
| 0x000F | Partidas | count |
| 0x0010 | Status Bits | flags |
| 0x0013 | Nível Combustível | % |

