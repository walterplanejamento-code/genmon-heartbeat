#!/usr/bin/env python3
"""
Script de exemplo para VPS - Leitor Modbus K30XL
================================================

Este script roda na VPS (82.25.70.90) e:
1. Conecta aos dispositivos HF2211 via Modbus TCP
2. Lê os registradores do controlador K30XL
3. Envia os dados para a edge function via HTTP POST

Requisitos:
    pip install pymodbus requests

Autor: Sistema de Monitoramento GMG
"""

import time
import json
import logging
import requests
from typing import Dict, Any, Optional
from dataclasses import dataclass
from pymodbus.client import ModbusTcpClient
from pymodbus.exceptions import ModbusException

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =============================================================================
# CONFIGURAÇÕES
# =============================================================================

# URL da Edge Function (substitua pelo seu projeto)
EDGE_FUNCTION_URL = "https://hwloajvxjsysutqfqpal.supabase.co/functions/v1/modbus-receiver"

# Configurações dos geradores (porta VPS -> configuração do HF)
# A porta VPS é o identificador único de cada gerador
GERADORES_CONFIG = {
    "5001": {  # Porta VPS para Gerador 1
        "nome": "Gerador 1 - Sede",
        "ip_hf": "192.168.1.100",  # IP local do HF2211 (ou IP público se acessível)
        "porta_tcp": 502,
        "endereco_modbus": 1,
        "timeout": 3.0,
    },
    "5002": {  # Porta VPS para Gerador 2
        "nome": "Gerador 2 - Filial",
        "ip_hf": "192.168.1.101",
        "porta_tcp": 502,
        "endereco_modbus": 1,
        "timeout": 3.0,
    },
    # Adicione mais geradores conforme necessário
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
    tipo: str = "holding"  # holding ou input


# Registradores do K30XL (baseado na documentação)
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

# Registradores de Status (bits)
REGISTRADOR_STATUS = 100  # Endereço do registrador de status


# =============================================================================
# FUNÇÕES DE LEITURA MODBUS
# =============================================================================

def conectar_modbus(ip: str, porta: int, timeout: float) -> Optional[ModbusTcpClient]:
    """Conecta ao dispositivo Modbus TCP"""
    try:
        client = ModbusTcpClient(
            host=ip,
            port=porta,
            timeout=timeout
        )
        if client.connect():
            logger.info(f"Conectado ao Modbus TCP em {ip}:{porta}")
            return client
        else:
            logger.error(f"Falha ao conectar em {ip}:{porta}")
            return None
    except Exception as e:
        logger.error(f"Erro ao conectar: {e}")
        return None


def ler_registrador(client: ModbusTcpClient, reg: RegistradorModbus, 
                    endereco_escravo: int) -> Optional[float]:
    """Lê um registrador Modbus e aplica o fator de escala"""
    try:
        response = client.read_holding_registers(
            address=reg.endereco,
            count=1,
            slave=endereco_escravo
        )
        
        if response.isError():
            logger.warning(f"Erro ao ler {reg.nome}: {response}")
            return None
        
        valor_raw = response.registers[0]
        valor = valor_raw * reg.fator_escala
        
        logger.debug(f"{reg.nome}: {valor} {reg.unidade}")
        return valor
        
    except ModbusException as e:
        logger.error(f"Exceção Modbus ao ler {reg.nome}: {e}")
        return None


def ler_status_bits(client: ModbusTcpClient, endereco_escravo: int) -> Dict[str, bool]:
    """Lê o registrador de status e extrai os bits"""
    try:
        response = client.read_holding_registers(
            address=REGISTRADOR_STATUS,
            count=1,
            slave=endereco_escravo
        )
        
        if response.isError():
            logger.warning(f"Erro ao ler status: {response}")
            return {}
        
        status = response.registers[0]
        
        # Mapeia os bits para os campos (ajuste conforme documentação K30XL)
        return {
            "motor_funcionando": bool(status & 0x0001),  # Bit 0
            "rede_ok": bool(status & 0x0002),            # Bit 1
            "gmg_alimentando": bool(status & 0x0004),    # Bit 2
            "aviso_ativo": bool(status & 0x0008),        # Bit 3
            "falha_ativa": bool(status & 0x0010),        # Bit 4
        }
        
    except ModbusException as e:
        logger.error(f"Exceção Modbus ao ler status: {e}")
        return {}


def ler_todos_dados(client: ModbusTcpClient, endereco_escravo: int) -> Dict[str, Any]:
    """Lê todos os registradores e retorna um dicionário com os dados"""
    dados = {}
    
    # Lê registradores numéricos
    for nome, reg in REGISTRADORES_K30XL.items():
        valor = ler_registrador(client, reg, endereco_escravo)
        if valor is not None:
            dados[nome] = valor
    
    # Lê status bits
    status = ler_status_bits(client, endereco_escravo)
    dados.update(status)
    
    return dados


# =============================================================================
# FUNÇÃO DE ENVIO PARA BACKEND
# =============================================================================

def enviar_para_backend(porta_vps: str, dados: Dict[str, Any]) -> bool:
    """
    Envia os dados lidos para a edge function via HTTP POST
    
    O campo 'porta_vps' é crucial - identifica qual gerador está enviando os dados
    """
    # Monta o payload com a porta VPS como identificador
    payload = {
        "porta_vps": porta_vps,  # Identificador único do gerador
        **dados  # Dados lidos do Modbus
    }
    
    try:
        logger.info(f"Enviando dados para gerador na porta {porta_vps}")
        logger.debug(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            EDGE_FUNCTION_URL,
            json=payload,
            headers={
                "Content-Type": "application/json",
            },
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"Dados enviados com sucesso! Reading ID: {result.get('reading_id')}")
            return True
        else:
            logger.error(f"Erro ao enviar: {response.status_code} - {response.text}")
            return False
            
    except requests.RequestException as e:
        logger.error(f"Erro de conexão: {e}")
        return False


# =============================================================================
# LOOP PRINCIPAL
# =============================================================================

def processar_gerador(porta_vps: str, config: Dict[str, Any]) -> None:
    """Processa um gerador: conecta, lê dados e envia para o backend"""
    logger.info(f"Processando: {config['nome']} (Porta VPS: {porta_vps})")
    
    # Conecta ao HF2211
    client = conectar_modbus(
        ip=config["ip_hf"],
        porta=config["porta_tcp"],
        timeout=config["timeout"]
    )
    
    if not client:
        logger.error(f"Não foi possível conectar ao {config['nome']}")
        return
    
    try:
        # Lê todos os dados
        dados = ler_todos_dados(client, config["endereco_modbus"])
        
        if dados:
            # Envia para o backend com a porta VPS como identificador
            enviar_para_backend(porta_vps, dados)
        else:
            logger.warning(f"Nenhum dado lido de {config['nome']}")
            
    finally:
        client.close()


def main():
    """Loop principal do script"""
    logger.info("=" * 60)
    logger.info("Iniciando VPS Modbus Reader para K30XL")
    logger.info(f"Edge Function: {EDGE_FUNCTION_URL}")
    logger.info(f"Geradores configurados: {len(GERADORES_CONFIG)}")
    logger.info("=" * 60)
    
    while True:
        try:
            for porta_vps, config in GERADORES_CONFIG.items():
                processar_gerador(porta_vps, config)
            
            logger.info(f"Aguardando {INTERVALO_LEITURA}s até próxima leitura...")
            time.sleep(INTERVALO_LEITURA)
            
        except KeyboardInterrupt:
            logger.info("Interrompido pelo usuário")
            break
        except Exception as e:
            logger.error(f"Erro no loop principal: {e}")
            time.sleep(5)


# =============================================================================
# MODO DE TESTE
# =============================================================================

def testar_envio_simulado():
    """
    Testa o envio para o backend com dados simulados
    Útil para testar a edge function sem ter o hardware real
    """
    logger.info("Modo de teste - Enviando dados simulados")
    
    # Dados simulados de um K30XL
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
    
    # Envia com porta VPS de teste
    porta_teste = "5001"
    sucesso = enviar_para_backend(porta_teste, dados_simulados)
    
    if sucesso:
        logger.info("Teste de envio bem-sucedido!")
    else:
        logger.error("Teste de envio falhou!")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--teste":
        testar_envio_simulado()
    else:
        main()
