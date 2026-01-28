#!/usr/bin/env python3
"""
Script VPS - Leitor Modbus K30XL (Modo Ativo) v2.5.0
=====================================================

Este script roda na VPS (82.25.70.90) em MODO ATIVO:
- A VPS escuta em portas TCP (15001, 15002, 15003)
- Os dispositivos HF2211 conectam como TCP Client à VPS
- A VPS faz polling Modbus através dessas conexões

IMPORTANTE: Configuração do HF2211
- Baudrate: 19200 (conforme manual STEMAC K30XL)
- Data bits: 8
- Paridade: Nenhuma
- Stop bits: 1

Arquitetura:
    [Gerador] → [K30XL] → [RS-232] → [HF2211] → [Internet] → [VPS:15002] → [Backend]

CORREÇÃO v2.5.0: Horímetro correto em 0x000B
- Confirmado via scan: Reg 0x000B = horas do horímetro (284 = ~285h)
- Reg 0x0010 = Partidas (626) ✓
- Reg 0x000D oscila - NÃO é horímetro, é contador interno
- Novo payload: horimetro_horas, horimetro_minutos (0), horimetro_segundos (0)

HISTÓRICO:
- v2.4.1: Corrige race condition no scan
- v2.4.0: Scan extendido para descoberta
- v2.3.0: Mapeamento partidas corrigido
- v2.2.0: Sincronização de frames

Requisitos:
    pip install requests

Uso:
    python vps-modbus-reader.py          # Modo produção (envia para backend)
    python vps-modbus-reader.py --debug  # Modo debug (NÃO envia para backend)
    python vps-modbus-reader.py --teste  # Enviar dados simulados
    python vps-modbus-reader.py --scan   # Scan EXTENDIDO 0x0000-0x003F (64 regs)

Autor: Sistema de Monitoramento GMG
Baseado no Manual STEMAC K30XL versão 1.0 a 3.01
"""

import time
import json
import socket
import logging
import threading
import requests
from typing import Dict, Any, Optional
from dataclasses import dataclass

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

# Modo debug: não envia para backend, só mostra logs
MODO_DEBUG = False

# Modo scan: apenas varre registradores
MODO_SCAN = False

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
        "timeout": 5.0,  # Aumentado para sincronização
        "habilitado": False,
    },
    "15002": {
        "nome": "Gerador 2 - K30XL",
        "controlador": "K30XL",
        "porta_escuta": 15002,
        "endereco_modbus": 1,
        "timeout": 5.0,  # Aumentado para sincronização
        "habilitado": True,
    },
    "15003": {
        "nome": "Gerador 3 - SmartGen",
        "controlador": "SmartGen",
        "porta_escuta": 15003,
        "endereco_modbus": 1,
        "timeout": 5.0,
        "habilitado": False,
    },
}

# Intervalo entre leituras (segundos)
INTERVALO_LEITURA = 10

# CORREÇÃO: Delay entre leitura dos blocos (ms)
DELAY_ENTRE_BLOCOS = 0.5  # 500ms

# Limite máximo razoável para horímetro (em horas)
MAX_HORIMETRO_HORAS = 500000  # ~57 anos

# =============================================================================
# MAPEAMENTO DE REGISTRADORES K30XL - CORRIGIDO v2.5.0
# =============================================================================
# 
# MAPEAMENTO CONFIRMADO VIA SCAN v2.4.0:
# Display físico: Partidas = 626, Horímetro = 285:30:15
# 
# End.Protocolo  Parâmetro                 Valor Scan       Status
# -------------------------------------------------------------------------
# 0x0000         Tensão Rede R-S           0                OK
# 0x0001         Tensão Rede S-T           218              OK
# 0x0002         Tensão Rede T-R           215              OK
# 0x0003         Tensão GMG U-V            218              OK
# 0x0004         Corrente Fase 1           0                OK
# 0x0005         Frequência GMG            19 (1.9Hz)       OK (0.1 Hz)
# 0x0006         RPM Motor                 0                OK
# 0x0007         Tensão Bateria            0                OK (0.1 V)
# 0x0008         Temperatura Água          130              OK
# 0x000A         ???                       180              DESCONHECIDO
# 0x000B         HORÍMETRO HORAS           284 ✓            CONFIRMADO!
# 0x000C         ???                       3866             DESCONHECIDO
# 0x000D         Contador Interno          VARIA            NÃO É HORÍMETRO!
# 0x0010         PARTIDAS                  626 ✓            CONFIRMADO!
# 0x0013         Nível Combustível         0%               OK
#
# =============================================================================

@dataclass
class RegistradorModbus:
    """Definição de um registrador Modbus"""
    endereco: int
    nome: str
    fator_escala: float = 1.0
    unidade: str = ""
    tipo: str = "holding"


# Bloco 1: Registradores 0x0000 a 0x000B (12 registradores)
# CORREÇÃO v2.5.0: Expandido para incluir horímetro em 0x000B
BLOCO1_ENDERECO = 0x0000
BLOCO1_QUANTIDADE = 12  # Aumentado de 9 para 12
BLOCO1_REGISTRADORES = [
    RegistradorModbus(0x0000, "tensao_rede_rs", 1.0, "V"),
    RegistradorModbus(0x0001, "tensao_rede_st", 1.0, "V"),
    RegistradorModbus(0x0002, "tensao_rede_tr", 1.0, "V"),
    RegistradorModbus(0x0003, "tensao_gmg", 1.0, "V"),
    RegistradorModbus(0x0004, "corrente_fase1", 1.0, "A"),
    RegistradorModbus(0x0005, "frequencia_gmg", 0.1, "Hz"),  # 0.1 Hz por bit
    RegistradorModbus(0x0006, "rpm_motor", 1.0, "RPM"),
    RegistradorModbus(0x0007, "tensao_bateria", 0.1, "V"),  # 0.1 V por bit
    RegistradorModbus(0x0008, "temperatura_agua", 1.0, "°C"),
    RegistradorModbus(0x0009, "reservado_09", 1.0, ""),     # Reservado
    RegistradorModbus(0x000A, "reservado_0a", 1.0, ""),     # Reservado
    RegistradorModbus(0x000B, "horimetro_horas", 1.0, "h"), # ✓ HORÍMETRO CONFIRMADO!
]

# Bloco 2: Registradores 0x0010 a 0x0013 (4 registradores)
# CORREÇÃO v2.5.0: Começa direto em Partidas (0x0010)
BLOCO2_ENDERECO = 0x0010
BLOCO2_QUANTIDADE = 4
# Estrutura v2.5.0:
#   [0x0010] = PARTIDAS → 626 confirmado ✓
#   [0x0011] = Reservado ou Status?
#   [0x0012] = Reservado
#   [0x0013] = Nível Combustível


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
    
    def calcular_crc16(self, dados: bytes) -> int:
        """
        Calcula CRC-16 Modbus (polinômio 0xA001).
        Usado para frames Modbus RTU.
        """
        crc = 0xFFFF
        for byte in dados:
            crc ^= byte
            for _ in range(8):
                if crc & 0x0001:
                    crc = (crc >> 1) ^ 0xA001
                else:
                    crc >>= 1
        return crc
    
    def limpar_buffer_socket(self):
        """
        Limpa bytes residuais do socket antes de nova leitura.
        """
        if not self.socket_cliente:
            return
        
        try:
            self.socket_cliente.setblocking(False)
            bytes_descartados = 0
            while True:
                try:
                    lixo = self.socket_cliente.recv(256)
                    if lixo:
                        bytes_descartados += len(lixo)
                        self.logger.warning(f"Lixo no buffer (pré-comando): {lixo.hex(' ').upper()}")
                    else:
                        break
                except BlockingIOError:
                    break
            
            self.socket_cliente.setblocking(True)
            self.socket_cliente.settimeout(self.config["timeout"])
            
            if bytes_descartados > 0:
                self.logger.warning(f"Total de {bytes_descartados} bytes residuais limpos")
                
        except Exception as e:
            self.logger.debug(f"Erro ao limpar buffer: {e}")

    def sincronizar_resposta(self, slave_addr: int, tamanho_dados: int) -> Optional[bytes]:
        """
        CORREÇÃO v2.2.0: Sincroniza a leitura buscando o padrão de início Modbus.
        Descarta bytes de lixo até encontrar: [ADDR][FC=03][BYTECOUNT]
        
        Args:
            slave_addr: Endereço do escravo Modbus (geralmente 1)
            tamanho_dados: Quantidade de bytes de dados esperados (qty * 2)
        
        Returns:
            Frame Modbus completo ou None em caso de erro
        """
        if not self.socket_cliente:
            return None
        
        buffer = bytearray()
        lixo_descartado = 0
        tempo_inicio = time.time()
        tamanho_total = 3 + tamanho_dados + 2  # ADDR + FC + BYTECOUNT + DATA + CRC
        
        self.logger.debug(f"Sincronizando resposta (esperando {tamanho_total} bytes)...")
        
        while time.time() - tempo_inicio < self.config["timeout"]:
            try:
                byte = self.socket_cliente.recv(1)
                if not byte:
                    time.sleep(0.01)
                    continue
                    
                buffer.append(byte[0])
                
                # Procura padrão de início: [ADDR] [0x03]
                if len(buffer) >= 2:
                    # Verifica se os últimos 2 bytes são o início válido
                    if buffer[-2] == slave_addr and buffer[-1] == 0x03:
                        # Calcula lixo descartado
                        if len(buffer) > 2:
                            lixo_descartado = len(buffer) - 2
                            lixo_bytes = bytes(buffer[:-2])
                            self.logger.warning(f"Bytes de LIXO descartados ({lixo_descartado}): {lixo_bytes.hex(' ').upper()}")
                            buffer = bytearray([slave_addr, 0x03])
                        
                        # Lê o byte count
                        byte_count_raw = self.socket_cliente.recv(1)
                        if not byte_count_raw:
                            self.logger.error("Falha ao ler byte count")
                            return None
                        
                        byte_count = byte_count_raw[0]
                        buffer.append(byte_count)
                        
                        # Verifica se byte count faz sentido
                        if byte_count != tamanho_dados:
                            self.logger.warning(f"Byte count diferente: recebido={byte_count}, esperado={tamanho_dados}")
                        
                        # Lê dados + CRC
                        restante = byte_count + 2  # dados + 2 bytes CRC
                        dados_crc = b''
                        tempo_dados = time.time()
                        
                        while len(dados_crc) < restante and time.time() - tempo_dados < 2.0:
                            chunk = self.socket_cliente.recv(restante - len(dados_crc))
                            if chunk:
                                dados_crc += chunk
                            else:
                                time.sleep(0.01)
                        
                        if len(dados_crc) < restante:
                            self.logger.error(f"Dados incompletos: {len(dados_crc)}/{restante}")
                            return None
                        
                        buffer.extend(dados_crc)
                        frame_completo = bytes(buffer)
                        
                        self.logger.info(f"RX RTU ({len(frame_completo)} bytes): {frame_completo.hex(' ').upper()}")
                        
                        if lixo_descartado > 0:
                            self.logger.info(f">>> Frame sincronizado após descartar {lixo_descartado} bytes de lixo")
                        
                        return frame_completo
                
                # Limite de segurança
                if len(buffer) > 100:
                    self.logger.error(f"Muitos bytes ({len(buffer)}) sem encontrar padrão válido")
                    self.logger.error(f"Buffer: {bytes(buffer).hex(' ').upper()}")
                    return None
                    
            except socket.timeout:
                continue
            except Exception as e:
                self.logger.error(f"Erro na sincronização: {e}")
                return None
        
        self.logger.error("Timeout na sincronização")
        return None
    
    def enviar_comando_modbus_rtu(self, funcao: int, endereco: int, quantidade: int) -> Optional[bytes]:
        """
        Envia comando Modbus RTU e recebe resposta sincronizada.
        
        CORREÇÃO v2.2.0: Usa sincronização por marcador em vez de leitura direta.
        """
        if not self.cliente_conectado or not self.socket_cliente:
            return None
        
        slave_addr = self.config["endereco_modbus"]
        
        # Monta frame: Slave + FC + Addr(Hi) + Addr(Lo) + Qty(Hi) + Qty(Lo)
        pdu = bytes([
            slave_addr,
            funcao,
            (endereco >> 8) & 0xFF,
            endereco & 0xFF,
            (quantidade >> 8) & 0xFF,
            quantidade & 0xFF,
        ])
        
        # Calcula e adiciona CRC-16 (little-endian)
        crc = self.calcular_crc16(pdu)
        frame = pdu + bytes([crc & 0xFF, (crc >> 8) & 0xFF])
        
        try:
            # Limpa buffer antes de enviar
            self.limpar_buffer_socket()
            
            self.logger.info(f"TX RTU: {frame.hex(' ').upper()}")
            self.socket_cliente.send(frame)
            
            # CORREÇÃO: Usa sincronização por marcador
            resposta = self.sincronizar_resposta(slave_addr, quantidade * 2)
            
            return resposta
            
        except socket.timeout:
            self.logger.error("Erro Modbus: timed out")
            return None
        except Exception as e:
            self.logger.error(f"Erro na comunicação: {e}")
            self.cliente_conectado = False
            return None
    
    def ler_bloco_registradores(self, endereco_inicial: int, quantidade: int) -> Optional[list]:
        """
        Lê um bloco de registradores holding (função 0x03) usando Modbus RTU.
        Retorna lista de valores inteiros ou None em caso de erro.
        
        CORREÇÃO v2.4.1: Verifica conexão antes de tentar ler
        """
        # CORREÇÃO v2.4.1: Verificar conexão antes de tentar ler
        if not self.cliente_conectado or not self.socket_cliente:
            self.logger.warning("Sem conexão - aguardando HF2211...")
            return None
        
        resposta = self.enviar_comando_modbus_rtu(0x03, endereco_inicial, quantidade)
        
        if not resposta:
            return None
        
        # Resposta Modbus RTU: [Slave (1)] [FC (1)] [ByteCount (1)] [Data (N*2)] [CRC (2)]
        if len(resposta) < 5:
            self.logger.error(f"Resposta muito curta: {len(resposta)} bytes")
            return None
        
        slave_addr = resposta[0]
        function_code = resposta[1]
        
        # Verificar erro Modbus (function code com bit 7 setado)
        if function_code & 0x80:
            error_code = resposta[2] if len(resposta) > 2 else 0
            self.logger.error(f"Exceção Modbus: FC=0x{function_code:02X}, EC=0x{error_code:02X}")
            return None
        
        byte_count = resposta[2]
        expected_bytes = quantidade * 2
        
        self.logger.debug(f"Slave={slave_addr}, FC=0x{function_code:02X}, ByteCount={byte_count}")
        
        # Verificar CRC da resposta
        dados_sem_crc = resposta[:-2]
        crc_recebido = resposta[-2] | (resposta[-1] << 8)
        crc_calculado = self.calcular_crc16(dados_sem_crc)
        
        if crc_recebido != crc_calculado:
            self.logger.error(f"CRC INVÁLIDO: recebido=0x{crc_recebido:04X}, calculado=0x{crc_calculado:04X}")
            self.logger.error(f"Resposta DESCARTADA: {resposta.hex(' ').upper()}")
            return None
        
        self.logger.info(f"CRC OK: 0x{crc_recebido:04X}")
        
        # Extrair valores (big-endian unsigned 16-bit)
        valores = []
        dados = resposta[3:3 + byte_count]
        
        for i in range(0, len(dados), 2):
            if i + 1 < len(dados):
                valor = (dados[i] << 8) | dados[i + 1]
                valores.append(valor)
        
        return valores
    
    def extrair_status_bits(self, status_word: int) -> Dict[str, bool]:
        """
        Extrai os bits de status conforme manual K30XL (registro 00017 / 0x0010)
        NOTA: Após correção v2.3.0, status pode estar em outro registrador
        """
        return {
            "modo_automatico": bool(status_word & 0x0001),      # Bit 0
            "modo_manual": bool(status_word & 0x0002),          # Bit 1
            "modo_inibido": bool(status_word & 0x0004),         # Bit 2
            "rede_alimentando": bool(status_word & 0x0008),     # Bit 3
            "gmg_alimentando": bool(status_word & 0x0010),      # Bit 4
            "aviso_ativo": bool(status_word & 0x0020),          # Bit 5
            "falha_ativa": bool(status_word & 0x0040),          # Bit 6
            "motor_funcionando": bool(status_word & 0x0100),    # Bit 8
            "tensao_gmg_ok": bool(status_word & 0x0400),        # Bit 10
            "rede_ok": bool(status_word & 0x1000),              # Bit 12 = Tensão Rede OK
        }
    
    def scan_registradores(self) -> None:
        """
        MODO SCAN v2.4.0: Lê registradores de 0x0000 a 0x003F (64 regs) em 4 blocos.
        Adiciona interpretação BCD para formatos industriais.
        
        O objetivo é descobrir onde está o horímetro real (285:30h).
        O Reg 0x000D foi identificado como um contador variável (não é horímetro).
        """
        self.logger.info("=" * 70)
        self.logger.info("=" * 70)
        self.logger.info("=== MODO SCAN EXTENDIDO v2.4.0: 0x0000-0x003F (64 regs) ===")
        self.logger.info("=== Buscando horímetro real de 285:30h ===")
        self.logger.info("=" * 70)
        
        todos_valores = {}  # Armazena todos os valores lidos
        
        # Ler 4 blocos de 16 registradores cada
        for bloco_num in range(4):
            endereco_base = bloco_num * 16
            self.logger.info("-" * 60)
            self.logger.info(f">>> BLOCO {bloco_num + 1}: 0x{endereco_base:04X}-0x{endereco_base + 15:04X}")
            self.logger.info("-" * 60)
            
            valores = self.ler_bloco_registradores(endereco_base, 16)
            
            if valores:
                for i, val in enumerate(valores):
                    endereco = endereco_base + i
                    todos_valores[endereco] = val
                    
                    # Interpretação BCD: extrai cada nibble como dígito decimal
                    bcd_d3 = (val >> 12) & 0xF
                    bcd_d2 = (val >> 8) & 0xF
                    bcd_d1 = (val >> 4) & 0xF
                    bcd_d0 = val & 0xF
                    bcd_str = f"{bcd_d3}{bcd_d2}:{bcd_d1}{bcd_d0}"
                    
                    # Também mostrar como HH:MM se for formato horário
                    hhmm_h = val // 100
                    hhmm_m = val % 100
                    
                    self.logger.info(
                        f"  0x{endereco:04X}: {val:6d} (0x{val:04X})  "
                        f"BCD={bcd_str}  HHMM={hhmm_h:3d}h{hhmm_m:02d}m"
                    )
            else:
                self.logger.error(f"Falha ao ler bloco {bloco_num + 1}")
            
            # Delay entre blocos
            time.sleep(DELAY_ENTRE_BLOCOS)
        
        # ============================================
        # ANÁLISE ESPECIAL: Buscar valores próximos de 285
        # ============================================
        self.logger.info("=" * 70)
        self.logger.info("=== ANÁLISE: BUSCANDO HORÍMETRO 285:30h ===")
        self.logger.info("=" * 70)
        
        # Valores possíveis para horímetro de 285:30h:
        # - 285 (horas inteiras)
        # - 28530 (formato HHMM: 285h 30m)
        # - 17130 (minutos totais: 285*60 + 30)
        # - 0x011D = 285 em hex
        # - 0x42EA = 17130 em hex
        # - BCD: 0x0285 ou 0x2853
        
        candidatos_horimetro = []
        
        for endereco, val in todos_valores.items():
            notas = []
            
            # Valor próximo de 285 (horas)
            if 280 <= val <= 290:
                notas.append(f"~285h direto")
                candidatos_horimetro.append((endereco, val, "horas_direto"))
            
            # Valor próximo de 17130 (minutos totais)
            if 17000 <= val <= 17200:
                notas.append(f"~17130 min = 285.5h")
                candidatos_horimetro.append((endereco, val, "minutos_totais"))
            
            # Formato HHMM (28530 = 285h30m)
            if 28000 <= val <= 29000:
                notas.append(f"formato HHMM?")
                candidatos_horimetro.append((endereco, val, "hhmm"))
            
            # BCD 0x0285 = 645 decimal
            if val == 645:
                notas.append(f"BCD 0x0285?")
                candidatos_horimetro.append((endereco, val, "bcd_0285"))
            
            # BCD 0x2853 = 10323 decimal
            if val == 10323:
                notas.append(f"BCD 0x2853?")
                candidatos_horimetro.append((endereco, val, "bcd_2853"))
            
            # Valor estável e não-zero (potencial candidato)
            if val > 0 and val < 1000 and val != 625:  # 625 é partidas
                notas.append(f"valor baixo estável?")
            
            if notas:
                self.logger.info(f"  0x{endereco:04X}: {val:6d} → {', '.join(notas)}")
        
        # Relatório de partidas (confirmado em 0x0010 = 625)
        self.logger.info("-" * 60)
        if 0x0010 in todos_valores:
            self.logger.info(f"PARTIDAS (confirmado): Reg 0x0010 = {todos_valores[0x0010]} ✓")
        
        # Candidatos ao horímetro
        self.logger.info("-" * 60)
        if candidatos_horimetro:
            self.logger.info("CANDIDATOS A HORÍMETRO:")
            for end, val, tipo in candidatos_horimetro:
                self.logger.info(f"  0x{end:04X}: {val} ({tipo})")
        else:
            self.logger.warning("NENHUM CANDIDATO ÓBVIO ENCONTRADO PARA HORÍMETRO")
            self.logger.info("Verifique manualmente os valores estáveis no scan acima.")
        
        # Verificar registrador 0x000D (que estava sendo usado como horímetro)
        self.logger.info("-" * 60)
        if 0x000D in todos_valores:
            val_0d = todos_valores[0x000D]
            self.logger.info(f"NOTA: Reg 0x000D = {val_0d} (0x{val_0d:04X})")
            self.logger.info(f"  Este valor VARIA a cada leitura - NÃO é horímetro!")
            self.logger.info(f"  Provavelmente é timestamp/contador interno do controlador.")
        
        self.logger.info("=" * 70)
        self.logger.info("=== FIM DO SCAN EXTENDIDO v2.4.0 ===")
        self.logger.info("=" * 70)
    
    def ler_todos_registradores(self) -> Dict[str, Any]:
        """
        Lê todos os registradores K30XL em duas requisições (blocos).
        
        CORREÇÃO v2.5.0: Horímetro confirmado em 0x000B
        """
        dados = {}
        
        # =========================================
        # BLOCO 1: Parâmetros Elétricos, Motor e HORÍMETRO
        # =========================================
        self.logger.info("=" * 50)
        self.logger.info("=== Lendo Bloco 1 (0x0000-0x000B) - v2.5.0 ===")
        valores_bloco1 = self.ler_bloco_registradores(BLOCO1_ENDERECO, BLOCO1_QUANTIDADE)
        
        if not valores_bloco1:
            self.logger.error("Falha na leitura do Bloco 1")
            return dados
        
        self.logger.info(f"Bloco 1 RAW: {[f'0x{v:04X}' for v in valores_bloco1]}")
        
        # Mapear valores do Bloco 1 (0x0000 a 0x0008)
        for i, reg in enumerate(BLOCO1_REGISTRADORES[:9]):  # Só os primeiros 9
            if i < len(valores_bloco1):
                valor_raw = valores_bloco1[i]
                valor = valor_raw * reg.fator_escala
                dados[reg.nome] = round(valor, 2) if reg.fator_escala != 1.0 else valor
        
        # =========================================
        # HORÍMETRO - Registrador 0x000B (índice 11)
        # CORREÇÃO v2.5.0: Confirmado via scan!
        # =========================================
        if len(valores_bloco1) >= 12:
            horimetro_horas = valores_bloco1[11]  # Índice 11 = 0x000B
            self.logger.info(f"  ★ Reg 0x000B (HORÍMETRO): {horimetro_horas} horas ✓")
            
            # Novos campos separados para o backend
            dados["horimetro_horas"] = horimetro_horas
            dados["horimetro_minutos"] = 0  # Por enquanto, não identificado
            dados["horimetro_segundos"] = 0  # Por enquanto, não identificado
            
            # Manter compatibilidade com campo antigo
            dados["horas_trabalhadas"] = float(horimetro_horas)
        
        # CORREÇÃO v2.2.0: Delay maior entre blocos para buffer limpar
        self.logger.info(f"Aguardando {DELAY_ENTRE_BLOCOS}s para buffer limpar...")
        time.sleep(DELAY_ENTRE_BLOCOS)
        
        # =========================================
        # BLOCO 2: Partidas e Combustível
        # =========================================
        self.logger.info("=== Lendo Bloco 2 (0x0010-0x0013) - v2.5.0 ===")
        valores_bloco2 = self.ler_bloco_registradores(BLOCO2_ENDERECO, BLOCO2_QUANTIDADE)
        
        if not valores_bloco2:
            self.logger.error("Falha na leitura do Bloco 2")
            return dados
        
        self.logger.info(f"Bloco 2 RAW: {[f'0x{v:04X}' for v in valores_bloco2]}")
        
        # CORREÇÃO v2.5.0: Índice 0 = PARTIDAS (0x0010)
        if len(valores_bloco2) >= 1:
            dados["numero_partidas"] = valores_bloco2[0]
            self.logger.info(f"  ★ Reg 0x0010 (PARTIDAS): {valores_bloco2[0]} ✓")
        
        # Índice 1-2: Reservados (0x0011, 0x0012)
        if len(valores_bloco2) >= 2:
            self.logger.info(f"  Reg 0x0011: {valores_bloco2[1]} (0x{valores_bloco2[1]:04X})")
        if len(valores_bloco2) >= 3:
            self.logger.info(f"  Reg 0x0012: {valores_bloco2[2]} (0x{valores_bloco2[2]:04X})")
        
        # Índice 3: Nível Combustível (0x0013)
        if len(valores_bloco2) >= 4:
            dados["nivel_combustivel"] = valores_bloco2[3]
            self.logger.info(f"  Reg 0x0013 (Combustível): {valores_bloco2[3]}%")
        
        # Status bits: Inferidos a partir dos valores lidos
        tensao_rede = dados.get("tensao_rede_rs", 0)
        dados["rede_ok"] = tensao_rede > 180
        dados["motor_funcionando"] = dados.get("rpm_motor", 0) > 100
        dados["gmg_alimentando"] = dados.get("tensao_gmg", 0) > 180
        dados["aviso_ativo"] = False
        dados["falha_ativa"] = False
        
        # =========================================
        # LOG RESUMIDO
        # =========================================
        self.logger.info("=" * 50)
        self.logger.info("RESUMO LEITURA v2.5.0:")
        self.logger.info(f"  ★ Horímetro: {dados.get('horimetro_horas', 'N/A')}h (formato: {dados.get('horimetro_horas', 0):05d}:00:00)")
        self.logger.info(f"  ★ Partidas: {dados.get('numero_partidas', 'N/A')}")
        self.logger.info(f"  Tensão Rede: {dados.get('tensao_rede_rs', 'N/A')} V")
        self.logger.info(f"  Motor: {dados.get('motor_funcionando', 'N/A')}")
        self.logger.info("=" * 50)
        
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
    """
    payload = {
        "porta_vps": porta_vps,
        **dados
    }
    
    try:
        logger.info(f"Enviando dados do gerador porta {porta_vps}")
        
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
            
            # Modo SCAN: apenas varre e sai
            if MODO_SCAN:
                conexao.scan_registradores()
                log.info("Scan completo. Encerrando...")
                break
            
            # Faz polling dos registradores
            dados = conexao.ler_todos_registradores()
            
            if dados:
                log.info(f"Dados lidos: {len(dados)} parâmetros")
                
                if MODO_DEBUG:
                    log.info("*** MODO DEBUG: NÃO enviando para banco ***")
                else:
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
    logger.info("VPS Modbus Reader - K30XL v2.5.0 (Horímetro Corrigido)")
    logger.info("IMPORTANTE: Configure HF2211 com baudrate 19200!")
    logger.info(f"Edge Function: {EDGE_FUNCTION_URL}")
    
    if MODO_DEBUG:
        logger.info("*" * 60)
        logger.info("*** MODO DEBUG ATIVADO - DADOS NÃO SERÃO SALVOS ***")
        logger.info("*" * 60)
    
    if MODO_SCAN:
        logger.info("*" * 60)
        logger.info("*** MODO SCAN ATIVADO - VARREDURA DE REGISTRADORES ***")
        logger.info("*" * 60)
    
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
    
    # No modo scan, aguarda a thread terminar
    if MODO_SCAN:
        for t in threads:
            t.join()
        logger.info("Scan finalizado.")
        return
    
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

from http.server import HTTPServer, BaseHTTPRequestHandler

class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {
                "status": "ok",
                "service": "vps-modbus-reader",
                "version": "2.4.0",
                "protocol": "Modbus RTU (K30XL - Scan Extendido)",
                "debug_mode": MODO_DEBUG,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass


def iniciar_health_api():
    """Inicia servidor HTTP para health checks"""
    try:
        server = HTTPServer(('0.0.0.0', 3001), HealthHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        logger.info("Health API rodando em http://0.0.0.0:3001/health")
    except Exception as e:
        logger.error(f"Erro ao iniciar Health API: {e}")


# =============================================================================
# MODO TESTE (ENVIO SIMULADO)
# =============================================================================

def testar_envio_simulado():
    """Envia dados simulados para testar a edge function"""
    logger.info("=" * 60)
    logger.info("MODO TESTE - Enviando dados simulados K30XL")
    logger.info("=" * 60)
    
    dados_simulados = {
        "tensao_rede_rs": 220,
        "tensao_rede_st": 218,
        "tensao_rede_tr": 222,
        "tensao_gmg": 0,
        "corrente_fase1": 0,
        "frequencia_gmg": 0.0,
        "rpm_motor": 0,
        "tensao_bateria": 12.8,
        "temperatura_agua": 25,
        "horas_trabalhadas": 285.5,
        "numero_partidas": 625,
        "nivel_combustivel": 78,
        "modo_automatico": True,
        "modo_manual": False,
        "modo_inibido": False,
        "rede_alimentando": True,
        "gmg_alimentando": False,
        "aviso_ativo": False,
        "falha_ativa": False,
        "motor_funcionando": False,
        "tensao_gmg_ok": False,
        "rede_ok": True,
    }
    
    logger.info("Dados simulados:")
    for chave, valor in dados_simulados.items():
        logger.info(f"  {chave}: {valor}")
    
    sucesso = enviar_para_backend("15002", dados_simulados)
    
    if sucesso:
        logger.info("✓ Teste concluído com sucesso!")
    else:
        logger.error("✗ Falha no teste")
    
    return sucesso


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    import sys
    
    if "--teste" in sys.argv:
        testar_envio_simulado()
    elif "--scan" in sys.argv:
        MODO_SCAN = True
        MODO_DEBUG = True  # Scan sempre em debug
        logger.info("*" * 60)
        logger.info("*** MODO SCAN EXTENDIDO v2.4.0 ***")
        logger.info("*** VARREDURA DE 64 REGISTRADORES: 0x0000-0x003F ***")
        logger.info("*** BUSCANDO HORÍMETRO REAL DE 285:30h ***")
        logger.info("*" * 60)
        main()
    elif "--debug" in sys.argv:
        MODO_DEBUG = True
        logger.info("*" * 60)
        logger.info("*** MODO DEBUG ATIVADO VIA ARGUMENTO ***")
        logger.info("*** DADOS NÃO SERÃO SALVOS NO BANCO ***")
        logger.info("*" * 60)
        main()
    else:
        main()
