
-- Remove a FK constraint de user_id para permitir geradores criados pelo sistema
ALTER TABLE public.geradores DROP CONSTRAINT IF EXISTS geradores_user_id_fkey;

-- Adicionar policy para edge function inserir geradores
CREATE POLICY "Allow edge function to insert generators"
ON public.geradores FOR INSERT
WITH CHECK (true);

-- Adicionar policy para edge function inserir equipamentos HF
CREATE POLICY "Allow edge function to insert HF equipment"
ON public.equipamentos_hf FOR INSERT
WITH CHECK (true);
