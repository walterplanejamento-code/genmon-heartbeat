-- Update RLS policies for vps_conexoes to allow access via system generator
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view VPS connections via generator" ON public.vps_conexoes;
DROP POLICY IF EXISTS "Users can update VPS connections via generator" ON public.vps_conexoes;
DROP POLICY IF EXISTS "Users can insert VPS connections via generator" ON public.vps_conexoes;

-- Create new policies that allow access to connections for user's own generators OR the system generator
CREATE POLICY "Users can view VPS connections via generator" 
ON public.vps_conexoes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM geradores 
    WHERE geradores.id = vps_conexoes.gerador_id 
    AND (geradores.user_id = auth.uid() OR geradores.user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

CREATE POLICY "Users can update VPS connections via generator" 
ON public.vps_conexoes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM geradores 
    WHERE geradores.id = vps_conexoes.gerador_id 
    AND (geradores.user_id = auth.uid() OR geradores.user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

CREATE POLICY "Users can insert VPS connections via generator" 
ON public.vps_conexoes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM geradores 
    WHERE geradores.id = vps_conexoes.gerador_id 
    AND (geradores.user_id = auth.uid() OR geradores.user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

-- Update RLS policies for parametros_alerta to allow access via system generator
DROP POLICY IF EXISTS "Users can view alert params via generator" ON public.parametros_alerta;
DROP POLICY IF EXISTS "Users can update alert params via generator" ON public.parametros_alerta;
DROP POLICY IF EXISTS "Users can insert alert params via generator" ON public.parametros_alerta;
DROP POLICY IF EXISTS "Users can delete alert params via generator" ON public.parametros_alerta;

CREATE POLICY "Users can view alert params via generator" 
ON public.parametros_alerta 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM geradores 
    WHERE geradores.id = parametros_alerta.gerador_id 
    AND (geradores.user_id = auth.uid() OR geradores.user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

CREATE POLICY "Users can update alert params via generator" 
ON public.parametros_alerta 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM geradores 
    WHERE geradores.id = parametros_alerta.gerador_id 
    AND (geradores.user_id = auth.uid() OR geradores.user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

CREATE POLICY "Users can insert alert params via generator" 
ON public.parametros_alerta 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM geradores 
    WHERE geradores.id = parametros_alerta.gerador_id 
    AND (geradores.user_id = auth.uid() OR geradores.user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

CREATE POLICY "Users can delete alert params via generator" 
ON public.parametros_alerta 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM geradores 
    WHERE geradores.id = parametros_alerta.gerador_id 
    AND (geradores.user_id = auth.uid() OR geradores.user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

-- Update RLS policies for equipamentos_hf to allow access via system generator
DROP POLICY IF EXISTS "Users can view HF equipment via generator" ON public.equipamentos_hf;
DROP POLICY IF EXISTS "Users can update HF equipment via generator" ON public.equipamentos_hf;
DROP POLICY IF EXISTS "Users can insert HF equipment via generator" ON public.equipamentos_hf;

CREATE POLICY "Users can view HF equipment via generator" 
ON public.equipamentos_hf 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM geradores 
    WHERE geradores.id = equipamentos_hf.gerador_id 
    AND (geradores.user_id = auth.uid() OR geradores.user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

CREATE POLICY "Users can update HF equipment via generator" 
ON public.equipamentos_hf 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM geradores 
    WHERE geradores.id = equipamentos_hf.gerador_id 
    AND (geradores.user_id = auth.uid() OR geradores.user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

CREATE POLICY "Users can insert HF equipment via generator" 
ON public.equipamentos_hf 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM geradores 
    WHERE geradores.id = equipamentos_hf.gerador_id 
    AND (geradores.user_id = auth.uid() OR geradores.user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

-- Update RLS policies for leituras_tempo_real to allow access via system generator
DROP POLICY IF EXISTS "Users can view readings via generator" ON public.leituras_tempo_real;

CREATE POLICY "Users can view readings via generator" 
ON public.leituras_tempo_real 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM geradores 
    WHERE geradores.id = leituras_tempo_real.gerador_id 
    AND (geradores.user_id = auth.uid() OR geradores.user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

-- Update RLS policies for alertas to allow access via system generator
DROP POLICY IF EXISTS "Users can view alerts via generator" ON public.alertas;
DROP POLICY IF EXISTS "Users can update alerts via generator" ON public.alertas;

CREATE POLICY "Users can view alerts via generator" 
ON public.alertas 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM geradores 
    WHERE geradores.id = alertas.gerador_id 
    AND (geradores.user_id = auth.uid() OR geradores.user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

CREATE POLICY "Users can update alerts via generator" 
ON public.alertas 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM geradores 
    WHERE geradores.id = alertas.gerador_id 
    AND (geradores.user_id = auth.uid() OR geradores.user_id = '00000000-0000-0000-0000-000000000000'::uuid)
  )
);