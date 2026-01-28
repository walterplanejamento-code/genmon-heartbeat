-- Adicionar campos separados para horímetro (horas, minutos, segundos)
ALTER TABLE leituras_tempo_real
ADD COLUMN IF NOT EXISTS horimetro_horas integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS horimetro_minutos integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS horimetro_segundos integer DEFAULT 0;

COMMENT ON COLUMN leituras_tempo_real.horimetro_horas IS 'Horas do horímetro (ex: 285)';
COMMENT ON COLUMN leituras_tempo_real.horimetro_minutos IS 'Minutos do horímetro (ex: 30)';
COMMENT ON COLUMN leituras_tempo_real.horimetro_segundos IS 'Segundos do horímetro (ex: 15)';