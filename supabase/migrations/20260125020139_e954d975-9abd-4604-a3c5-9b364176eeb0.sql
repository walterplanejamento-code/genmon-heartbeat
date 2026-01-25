-- Adicionar novos campos para configuração do HF
ALTER TABLE public.equipamentos_hf 
  ADD COLUMN IF NOT EXISTS ip_vps TEXT DEFAULT '82.25.70.90',
  ADD COLUMN IF NOT EXISTS porta_tcp_local TEXT DEFAULT '502';

-- Renomear porta_vps para garantir consistência (já existe, só precisamos garantir que não é null)
-- A porta_vps identifica o gerador