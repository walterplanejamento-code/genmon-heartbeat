#!/usr/bin/env python3
"""
Scanner de Endereços Modbus para STEMAC K30XL
Varre endereços de 0 a 10 para descobrir qual está configurado no controlador.

Uso:
  1. Parar o serviço principal: sudo systemctl stop gmg-lovable
  2. Executar: python3 vps-modbus-scanner.py
  3. Após descobrir o endereço, atualizar vps-modbus-reader.py
  4. Reiniciar serviço: sudo systemctl start gmg-lovable
"""

import socket
import struct
import time
from datetime import datetime

# ============ CONFIGURAÇÃO ============
PORTA_TCP = 15002
TIMEOUT_CONEXAO = 60      # Segundos para aguardar HF2211 conectar
TIMEOUT_RESPOSTA = 3.0    # Segundos para aguardar resposta Modbus
DELAY_ENTRE_TESTES = 0.5  # Segundos entre cada teste de endereço
ENDERECO_MIN = 0
ENDERECO_MAX = 10
# ======================================


def calcular_crc16(dados: bytes) -> int:
    """Calcula CRC-16 Modbus RTU"""
    crc = 0xFFFF
    for byte in dados:
        crc ^= byte
        for _ in range(8):
            if crc & 0x0001:
                crc = (crc >> 1) ^ 0xA001
            else:
                crc >>= 1
    return crc


def montar_requisicao_modbus(endereco: int, registrador: int = 0x0000, quantidade: int = 1) -> bytes:
    """
    Monta frame Modbus RTU para leitura de holding registers (FC=0x03)
    
    Frame: [ADDR][FC=03][REG_HI][REG_LO][QTD_HI][QTD_LO][CRC_LO][CRC_HI]
    """
    frame = struct.pack('>BBHH', endereco, 0x03, registrador, quantidade)
    crc = calcular_crc16(frame)
    frame += struct.pack('<H', crc)  # CRC em little-endian
    return frame


def validar_resposta(resposta: bytes, endereco_esperado: int) -> tuple:
    """
    Valida resposta Modbus RTU
    
    Retorna: (sucesso: bool, valor: int ou None, erro: str ou None)
    
    Resposta válida FC=0x03: [ADDR][FC=03][BYTE_COUNT][DATA...][CRC_LO][CRC_HI]
    Resposta de erro: [ADDR][FC=0x83][EXCEPTION_CODE][CRC_LO][CRC_HI]
    """
    if len(resposta) < 5:
        return False, None, f"Resposta muito curta ({len(resposta)} bytes)"
    
    # Verificar endereço
    if resposta[0] != endereco_esperado:
        return False, None, f"Endereço incorreto (esperado {endereco_esperado}, recebido {resposta[0]})"
    
    # Verificar função (0x03 = sucesso, 0x83 = erro)
    if resposta[1] == 0x83:
        codigo_erro = resposta[2] if len(resposta) > 2 else 0
        erros = {
            1: "Função ilegal",
            2: "Endereço de dados ilegal",
            3: "Valor de dados ilegal",
            4: "Falha no dispositivo escravo"
        }
        return False, None, f"Exceção Modbus: {erros.get(codigo_erro, f'Código {codigo_erro}')}"
    
    if resposta[1] != 0x03:
        return False, None, f"Função incorreta (esperado 0x03, recebido 0x{resposta[1]:02X})"
    
    # Verificar CRC
    dados_sem_crc = resposta[:-2]
    crc_recebido = struct.unpack('<H', resposta[-2:])[0]
    crc_calculado = calcular_crc16(dados_sem_crc)
    
    if crc_recebido != crc_calculado:
        return False, None, f"CRC inválido (calculado 0x{crc_calculado:04X}, recebido 0x{crc_recebido:04X})"
    
    # Extrair valor (2 bytes, big-endian)
    byte_count = resposta[2]
    if byte_count >= 2 and len(resposta) >= 5:
        valor = struct.unpack('>H', resposta[3:5])[0]
        return True, valor, None
    
    return False, None, "Dados insuficientes na resposta"


def bytes_para_hex(dados: bytes) -> str:
    """Converte bytes para string hexadecimal legível"""
    return ' '.join(f'{b:02X}' for b in dados)


def log(mensagem: str):
    """Log com timestamp"""
    timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
    print(f"[{timestamp}] {mensagem}")


def main():
    print("\n" + "=" * 60)
    print("       SCANNER DE ENDEREÇOS MODBUS - STEMAC K30XL")
    print("=" * 60)
    print(f"Porta TCP: {PORTA_TCP}")
    print(f"Faixa de endereços: {ENDERECO_MIN} a {ENDERECO_MAX}")
    print(f"Timeout por endereço: {TIMEOUT_RESPOSTA}s")
    print("=" * 60 + "\n")
    
    # Criar socket servidor
    servidor = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    servidor.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    try:
        servidor.bind(('0.0.0.0', PORTA_TCP))
        servidor.listen(1)
        servidor.settimeout(TIMEOUT_CONEXAO)
        log(f"Aguardando conexão do HF2211 na porta {PORTA_TCP}...")
        log("(Certifique-se de que o serviço gmg-lovable está parado)")
        
        # Aguardar conexão
        try:
            conexao, endereco_cliente = servidor.accept()
            log(f"✓ HF2211 conectado de {endereco_cliente}")
        except socket.timeout:
            log("✗ Timeout aguardando conexão do HF2211")
            log("  Verifique se o HF2211 está configurado para conectar nesta porta")
            return
        
        conexao.settimeout(TIMEOUT_RESPOSTA)
        
        # Limpar buffer de entrada
        conexao.setblocking(False)
        try:
            while True:
                lixo = conexao.recv(1024)
                if not lixo:
                    break
        except:
            pass
        conexao.setblocking(True)
        conexao.settimeout(TIMEOUT_RESPOSTA)
        
        log("\nIniciando varredura de endereços...\n")
        
        enderecos_ativos = []
        
        # Varrer endereços
        for endereco in range(ENDERECO_MIN, ENDERECO_MAX + 1):
            requisicao = montar_requisicao_modbus(endereco, registrador=0x0000, quantidade=1)
            
            print(f"Endereço {endereco:2d}: ", end="", flush=True)
            print(f"TX [{bytes_para_hex(requisicao)}] ", end="", flush=True)
            
            try:
                # Enviar requisição
                conexao.send(requisicao)
                
                # Aguardar resposta
                resposta = b''
                tempo_inicio = time.time()
                
                while time.time() - tempo_inicio < TIMEOUT_RESPOSTA:
                    try:
                        chunk = conexao.recv(256)
                        if chunk:
                            resposta += chunk
                            # Resposta mínima válida: 5 bytes
                            if len(resposta) >= 5:
                                break
                    except socket.timeout:
                        break
                
                if not resposta:
                    print("→ Timeout (sem resposta)")
                else:
                    print(f"RX [{bytes_para_hex(resposta)}] ", end="")
                    
                    sucesso, valor, erro = validar_resposta(resposta, endereco)
                    
                    if sucesso:
                        print(f"→ ✓ RESPOSTA! Valor: {valor}")
                        enderecos_ativos.append((endereco, valor))
                    else:
                        print(f"→ ✗ {erro}")
                        
            except socket.timeout:
                print("→ Timeout")
            except Exception as e:
                print(f"→ Erro: {e}")
            
            time.sleep(DELAY_ENTRE_TESTES)
        
        # Relatório final
        print("\n" + "=" * 60)
        print("                    RESULTADO DA VARREDURA")
        print("=" * 60)
        
        if enderecos_ativos:
            print(f"\n✓ Endereços que responderam: {len(enderecos_ativos)}\n")
            for endereco, valor in enderecos_ativos:
                print(f"   Endereço {endereco}: Tensão R-S = {valor}V")
            
            endereco_recomendado = enderecos_ativos[0][0]
            print(f"\n{'=' * 60}")
            print(f"RECOMENDAÇÃO: Alterar endereco_modbus para {endereco_recomendado}")
            print(f"              no arquivo vps-modbus-reader.py (linha 72)")
            print(f"{'=' * 60}")
        else:
            print("\n✗ Nenhum endereço respondeu!\n")
            print("Possíveis causas:")
            print("  1. Cabo RS-232 com RX/TX invertidos")
            print("  2. Baudrate do HF2211 diferente de 19200")
            print("  3. K30XL com Modbus RTU desabilitado")
            print("  4. Problema na alimentação do K30XL")
            print("  5. Endereço fora da faixa testada (0-10)")
            print("\nVerifique o menu SETUP → COMUNICAÇÃO do K30XL")
        
        print("\n")
        conexao.close()
        
    except OSError as e:
        if "Address already in use" in str(e):
            log(f"✗ Porta {PORTA_TCP} já está em uso!")
            log("  Execute: sudo systemctl stop gmg-lovable")
        else:
            log(f"✗ Erro de socket: {e}")
    except KeyboardInterrupt:
        log("\nVarredura interrompida pelo usuário")
    finally:
        servidor.close()


if __name__ == "__main__":
    main()
