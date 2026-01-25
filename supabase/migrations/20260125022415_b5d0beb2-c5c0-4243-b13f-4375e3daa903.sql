
-- Alterar horas_trabalhadas para numeric para suportar decimais
ALTER TABLE public.leituras_tempo_real 
ALTER COLUMN horas_trabalhadas TYPE numeric USING horas_trabalhadas::numeric;
