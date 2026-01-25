#!/usr/bin/env python3
"""
Script VPS - Leitor Modbus K30XL (Modo Ativo)
=============================================

Este script roda na VPS (82.25.70.90) em MODO ATIVO:
- A VPS escuta em portas TCP (15001, 15002, 15003)
- Os dispositivos HF2211 conectam como TCP Client à VPS
- A VPS faz polling Modbus através dessas conexões

Arquitetura:
    [Gerador] → [K30XL] → [RS-232] → [HF2211] → [Internet] → [VPS:15002] → [Backend]

Requisitos:
    pip install pymodbus requests

Uso:
    python vps-modbus-reader.py          # Modo produção
    python vps-modbus-reader.py --teste  # Enviar dados simulados

Autor: Sistema de Monitoramento GMG
"""

import time
import json
import socket
import logging
import threading
import requests
from typing import Dict, Any, Optional
from dataclasses import dataclass
from pymodbus.client import ModbusTcpClient
from pymodbus.server import StartTcpServer
from pymodbus.framer import ModbusSocketFramer
from pymodbus.exceptions import ModbusException

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - [%(name)s] %(message)s'
)
logger = logging.getLogger(__name__)

# =============================================================================
# CONFIGURAÇÕES
# =============================================================================

# URL da Edge Function
EDGE_FUNCTION_URL = "https://hwloajvxjsysutqfqpal.supabase.co/functions/v1/modbus-receiver"

# IP da VPS (onde este script roda)
VPS_IP = "0.0.0.0"  # Escuta em todas as interfaces

# Configurações dos geradores - MODO ATIVO
# A VPS escuta nessas portas e os HF2211 conectam como TCP Clients
GERADORES_CONFIG = {
    "15001": {
        "nome": "Gerador 1 - SmartGen",
        "controlador": "SmartGen",
        "porta_escuta": 15001,
        "endereco_modbus": 1,
        "timeout": 3.0,
        "habilitado": False,  # Desabilitado por enquanto
    },
    "15002": {
        "nome": "Gerador 2 - K30XL",
        "controlador": "K30XL",
        "porta_escuta": 15002,
        "endereco_modbus": 1,
        "timeout": 3.0,
        "habilitado": True,  # Este é o gerador ativo
    },
    "15003": {
        "nome": "Gerador 3 - SmartGen",
        "controlador": "SmartGen",
        "porta_escuta": 15003,
        "endereco_modbus": 1,
        "timeout": 3.0,
        "habilitado": False,  # Desabilitado por enquanto
    },
}

# Intervalo entre leituras (segundos)
INTERVALO_LEITURA = 10

# =============================================================================
# MAPEAMENTO DE REGISTRADORES K30XL
# =============================================================================

@dataclass
class RegistradorModbus:
    """Definição de um registrador Modbus"""
    endereco: int
    nome: str
    fator_escala: float = 1.0
    unidade: str = ""
    tipo: str = "holding"


# Registradores do K30XL (baseado na documentação STEMAC)
REGISTRADORES_K30XL = {
    # Tensões de Rede
    "tensao_rede_rs": RegistradorModbus(0, "Tensão Rede R-S", 0.1, "V"),
    "tensao_rede_st": RegistradorModbus(1, "Tensão Rede S-T", 0.1, "V"),
    "tensao_rede_tr": RegistradorModbus(2, "Tensão Rede T-R", 0.1, "V"),
    
    # Tensão do GMG
    "tensao_gmg": RegistradorModbus(10, "Tensão GMG", 0.1, "V"),
    
    # Corrente
    "corrente_fase1": RegistradorModbus(20, "Corrente Fase 1", 0.1, "A"),
    
    # Frequência
    "frequencia_gmg": RegistradorModbus(30, "Frequência GMG", 0.1, "Hz"),
    
    # Motor
    "rpm_motor": RegistradorModbus(40, "RPM Motor", 1.0, "RPM"),
    "temperatura_agua": RegistradorModbus(41, "Temperatura Água", 1.0, "°C"),
    "tensao_bateria": RegistradorModbus(42, "Tensão Bateria", 0.1, "V"),
    
    # Contadores
    "horas_trabalhadas": RegistradorModbus(50, "Horas Trabalhadas", 0.1, "h"),
    "numero_partidas": RegistradorModbus(51, "Número de Partidas", 1.0, ""),
    
    # Nível de Combustível
    "nivel_combustivel": RegistradorModbus(60, "Nível Combustível", 1.0, "%"),
}

# Registrador de Status (bits)
REGISTRADOR_STATUS = 100


# =============================================================================
# GERENCIADOR DE CONEXÕES TCP (MODO ATIVO)
# =============================================================================

class ConexaoHF:
    """Gerencia uma conexão TCP de um HF2211"""
    
    def __init__(self, porta_vps: str, config: Dict[str, Any]):
        self.porta_vps = porta_vps
        self.config = config
        self.socket_servidor: Optional[socket.socket] = None
        self.socket_cliente: Optional[socket.socket] = None
        self.cliente_conectado = False
        self.ultimo_dado = None
        self.logger = logging.getLogger(f"HF-{porta_vps}")
    
    def iniciar_servidor(self) -> bool:
        """Inicia o servidor TCP na porta especificada"""
        try:
            self.socket_servidor = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket_servidor.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.socket_servidor.settimeout(5.0)
            self.socket_servidor.bind((VPS_IP, self.config["porta_escuta"]))
            self.socket_servidor.listen(1)
            
            self.logger.info(f"Servidor TCP iniciado na porta {self.config['porta_escuta']}")
            return True
            
        except Exception as e:
            self.logger.error(f"Erro ao iniciar servidor: {e}")
            return False
    
    def aceitar_conexao(self) -> bool:
        """Aceita conexão de um HF2211"""
        try:
            self.socket_cliente, endereco = self.socket_servidor.accept()
            self.socket_cliente.settimeout(self.config["timeout"])
            self.cliente_conectado = True
            self.logger.info(f"HF2211 conectado de {endereco}")
            return True
            
        except socket.timeout:
            return False
        except Exception as e:
            self.logger.error(f"Erro ao aceitar conexão: {e}")
            return False
    
    def enviar_comando_modbus(self, funcao: int, endereco: int, quantidade: int) -> Optional[bytes]:
        """Envia comando Modbus RTU através do socket"""
        if not self.cliente_conectado or not self.socket_cliente:
            return None
        
        # Monta frame Modbus TCP
        # Transaction ID (2 bytes) + Protocol ID (2 bytes) + Length (2 bytes) + Unit ID (1 byte) + PDU
        transaction_id = 0x0001
        protocol_id = 0x0000  # Modbus
        unit_id = self.config["endereco_modbus"]
        
        # PDU: Function code + Start address + Quantity
        pdu = bytes([
            funcao,
            (endereco >> 8) & 0xFF,
            endereco & 0xFF,
            (quantidade >> 8) & 0xFF,
            quantidade & 0xFF,
        ])
        
        length = len(pdu) + 1  # PDU + Unit ID
        
        # Monta o frame completo
        frame = bytes([
            (transaction_id >> 8) & 0xFF,
            transaction_id & 0xFF,
            (protocol_id >> 8) & 0xFF,
            protocol_id & 0xFF,
            (length >> 8) & 0xFF,
            length & 0xFF,
            unit_id,
        ]) + pdu
        
        try:
            self.socket_cliente.send(frame)
            resposta = self.socket_cliente.recv(256)
            return resposta
            
        except socket.timeout:
            self.logger.warning("Timeout na comunicação Modbus")
            return None
        except Exception as e:
            self.logger.error(f"Erro na comunicação: {e}")
            self.cliente_conectado = False
            return None
    
    def ler_registrador(self, endereco: int) -> Optional[int]:
        """Lê um registrador holding (função 0x03)"""
        resposta = self.enviar_comando_modbus(0x03, endereco, 1)
        
        if resposta and len(resposta) >= 11:
            # Resposta Modbus TCP: Header (7 bytes) + Function (1) + Byte Count (1) + Data (2)
            byte_count = resposta[8]
            if byte_count == 2:
                valor = (resposta[9] << 8) | resposta[10]
                return valor
        
        return None
    
    def ler_todos_registradores(self) -> Dict[str, Any]:
        """Lê todos os registradores K30XL"""
        dados = {}
        
        for nome, reg in REGISTRADORES_K30XL.items():
            valor_raw = self.ler_registrador(reg.endereco)
            if valor_raw is not None:
                dados[nome] = valor_raw * reg.fator_escala
                self.logger.debug(f"{reg.nome}: {dados[nome]} {reg.unidade}")
        
        # Lê status bits
        status_raw = self.ler_registrador(REGISTRADOR_STATUS)
        if status_raw is not None:
            dados.update({
                "motor_funcionando": bool(status_raw & 0x0001),
                "rede_ok": bool(status_raw & 0x0002),
                "gmg_alimentando": bool(status_raw & 0x0004),
                "aviso_ativo": bool(status_raw & 0x0008),
                "falha_ativa": bool(status_raw & 0x0010),
            })
        
        return dados
    
    def fechar(self):
        """Fecha as conexões"""
        if self.socket_cliente:
            try:
                self.socket_cliente.close()
            except:
                pass
        if self.socket_servidor:
            try:
                self.socket_servidor.close()
            except:
                pass


# =============================================================================
# FUNÇÃO DE ENVIO PARA BACKEND
# =============================================================================

def enviar_para_backend(porta_vps: str, dados: Dict[str, Any]) -> bool:
    """
    Envia os dados lidos para a edge function via HTTP POST
    
    O campo 'porta_vps' identifica qual gerador está enviando os dados
    """
    payload = {
        "porta_vps": porta_vps,
        **dados
    }
    
    try:
        logger.info(f"Enviando dados do gerador porta {porta_vps}")
        logger.debug(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            EDGE_FUNCTION_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"✓ Dados enviados! Reading ID: {result.get('reading_id')}")
            return True
        else:
            logger.error(f"✗ Erro ao enviar: {response.status_code} - {response.text}")
            return False
            
    except requests.RequestException as e:
        logger.error(f"✗ Erro de conexão: {e}")
        return False


# =============================================================================
# WORKER THREAD PARA CADA GERADOR
# =============================================================================

def worker_gerador(porta_vps: str, config: Dict[str, Any]):
    """Thread que gerencia a conexão e leitura de um gerador"""
    log = logging.getLogger(f"Worker-{porta_vps}")
    log.info(f"Iniciando worker para {config['nome']}")
    
    conexao = ConexaoHF(porta_vps, config)
    
    if not conexao.iniciar_servidor():
        log.error("Falha ao iniciar servidor, encerrando worker")
        return
    
    while True:
        try:
            # Aguarda conexão do HF2211
            if not conexao.cliente_conectado:
                log.info("Aguardando conexão do HF2211...")
                if not conexao.aceitar_conexao():
                    continue
            
            # Faz polling dos registradores
            log.info("Lendo registradores Modbus...")
            dados = conexao.ler_todos_registradores()
            
            if dados:
                log.info(f"Dados lidos: {len(dados)} parâmetros")
                enviar_para_backend(porta_vps, dados)
            else:
                log.warning("Nenhum dado lido, conexão pode ter sido perdida")
                conexao.cliente_conectado = False
            
            # Intervalo entre leituras
            time.sleep(INTERVALO_LEITURA)
            
        except KeyboardInterrupt:
            break
        except Exception as e:
            log.error(f"Erro no worker: {e}")
            conexao.cliente_conectado = False
            time.sleep(5)
    
    conexao.fechar()
    log.info("Worker encerrado")


# =============================================================================
# LOOP PRINCIPAL
# =============================================================================

def main():
    """Inicia threads para cada gerador habilitado"""
    logger.info("=" * 60)
    logger.info("VPS Modbus Reader - Modo ATIVO (Polling)")
    logger.info(f"Edge Function: {EDGE_FUNCTION_URL}")
    logger.info("=" * 60)
    
    # Lista geradores habilitados
    geradores_ativos = {
        porta: config for porta, config in GERADORES_CONFIG.items()
        if config.get("habilitado", False)
    }
    
    if not geradores_ativos:
        logger.error("Nenhum gerador habilitado! Configure GERADORES_CONFIG.")
        return
    
    logger.info(f"Geradores habilitados: {len(geradores_ativos)}")
    for porta, config in geradores_ativos.items():
        logger.info(f"  - Porta {porta}: {config['nome']} ({config['controlador']})")
    
    logger.info("=" * 60)
    
    # Inicia threads
    threads = []
    for porta_vps, config in geradores_ativos.items():
        t = threading.Thread(
            target=worker_gerador,
            args=(porta_vps, config),
            daemon=True,
            name=f"Worker-{porta_vps}"
        )
        t.start()
        threads.append(t)
        logger.info(f"Thread iniciada para porta {porta_vps}")
    
    # Health check API (porta 3001)
    logger.info("Iniciando Health API na porta 3001...")
    iniciar_health_api()
    
    # Mantém o programa rodando
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Encerrando...")


# =============================================================================
# HEALTH CHECK API
# =============================================================================

def iniciar_health_api():
    """Inicia um servidor HTTP simples para health check"""
    import http.server
    import socketserver
    
    class HealthHandler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path == "/health":
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                
                status = {
                    "status": "ok",
                    "service": "vps-modbus-reader",
                    "geradores": list(GERADORES_CONFIG.keys()),
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                }
                self.wfile.write(json.dumps(status).encode())
            else:
                self.send_response(404)
                self.end_headers()
        
        def log_message(self, format, *args):
            pass  # Silencia logs HTTP
    
    def run_server():
        with socketserver.TCPServer(("0.0.0.0", 3001), HealthHandler) as httpd:
            httpd.serve_forever()
    
    thread = threading.Thread(target=run_server, daemon=True)
    thread.start()


# =============================================================================
# MODO DE TESTE
# =============================================================================

def testar_envio_simulado():
    """
    Testa o envio para o backend com dados simulados do K30XL
    """
    logger.info("=" * 60)
    logger.info("MODO DE TESTE - Enviando dados simulados")
    logger.info("=" * 60)
    
    # Dados simulados de um K30XL em standby (rede OK, motor parado)
    dados_simulados = {
        "tensao_rede_rs": 220.5,
        "tensao_rede_st": 221.0,
        "tensao_rede_tr": 219.8,
        "tensao_gmg": 0.0,
        "corrente_fase1": 0.0,
        "frequencia_gmg": 0.0,
        "rpm_motor": 0,
        "temperatura_agua": 25,
        "tensao_bateria": 12.8,
        "horas_trabalhadas": 1234.5,
        "numero_partidas": 567,
        "nivel_combustivel": 85,
        "motor_funcionando": False,
        "rede_ok": True,
        "gmg_alimentando": False,
        "aviso_ativo": False,
        "falha_ativa": False,
    }
    
    # Usa porta 15002 (K30XL configurado)
    porta_teste = "15002"
    
    logger.info(f"Enviando para porta VPS: {porta_teste}")
    logger.info(f"Dados: {json.dumps(dados_simulados, indent=2)}")
    
    sucesso = enviar_para_backend(porta_teste, dados_simulados)
    
    if sucesso:
        logger.info("✓ Teste de envio bem-sucedido!")
    else:
        logger.error("✗ Teste de envio falhou!")
    
    return sucesso


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--teste":
        testar_envio_simulado()
    else:
        main()
