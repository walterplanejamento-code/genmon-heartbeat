

# Plano: Atualizar Configuração da VPS no Sistema

## Problema Atual

A pagina de VPS e os dados no banco estao desatualizados e inconsistentes com a configuracao real do sistema:

| Campo | Valor no Sistema | Valor Real |
|-------|-----------------|------------|
| IP VPS | 45.33.100.50 (default) | 82.25.70.90 |
| Porta | 502 (default) / 1502 (banco) | 15002 |
| Provider | Linode | Contabo (ou outro) |
| Hostname | gen-monitor-vps | 7arrowsServe |

Alem disso, o horimetro ainda mostra 0 no banco, indicando que o script v2.5.0 pode nao estar mapeando corretamente o registrador 0x000B para o campo `horimetro_horas`.

## O que sera feito

### 1. Corrigir dados da VPS no banco
Atualizar o registro em `vps_conexoes` com os valores corretos:
- IP: `82.25.70.90`
- Porta: `15002`
- Hostname: `7arrowsServe`

### 2. Atualizar defaults da pagina VPS
Arquivo: `src/pages/VPS.tsx`
- Alterar defaults do formulario para refletir a configuracao real (IP `82.25.70.90`, porta `15002`)
- Remover referencia a "Linode"

### 3. Investigar e corrigir horimetro zerado
O script v2.5.0 deveria enviar `horimetro_horas` com o valor do registrador 0x000B (~284), mas os dados no banco mostram 0. Vou:
- Revisar o script `docs/vps-modbus-reader.py` para verificar se o mapeamento do registrador 0x000B esta correto no codigo de extracao (nao apenas na definicao)
- Corrigir qualquer problema encontrado na logica de parsing

### 4. Adicionar validacao real da VPS (opcional)
Atualmente, o botao "Validar" na pagina VPS apenas simula uma validacao com `setTimeout`. Posso criar uma edge function que faca um teste real verificando se ha leituras recentes no banco para aquele gerador.

---

## Detalhes Tecnicos

### Arquivos modificados:
- `src/pages/VPS.tsx` - Defaults do formulario
- `docs/vps-modbus-reader.py` - Verificar/corrigir mapeamento do horimetro
- `supabase/functions/modbus-receiver/index.ts` - Verificar se os campos estao sendo inseridos

### Migracao de dados:
- UPDATE na tabela `vps_conexoes` para corrigir IP e porta

