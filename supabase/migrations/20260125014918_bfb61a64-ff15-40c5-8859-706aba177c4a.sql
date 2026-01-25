-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  company TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tabela de geradores
CREATE TABLE public.geradores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marca TEXT NOT NULL DEFAULT 'MWM',
  modelo TEXT NOT NULL DEFAULT 'D229-4',
  controlador TEXT NOT NULL DEFAULT 'STEMAC K30XL',
  potencia_nominal TEXT,
  tensao_nominal TEXT DEFAULT '380',
  frequencia_nominal TEXT DEFAULT '60',
  combustivel TEXT DEFAULT 'Diesel',
  instrucoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.geradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generators" ON public.geradores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own generators" ON public.geradores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own generators" ON public.geradores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own generators" ON public.geradores FOR DELETE USING (auth.uid() = user_id);

-- Tabela de equipamentos HF
CREATE TABLE public.equipamentos_hf (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gerador_id UUID NOT NULL REFERENCES public.geradores(id) ON DELETE CASCADE,
  modelo TEXT NOT NULL DEFAULT 'HF2211',
  porta_serial TEXT DEFAULT '/dev/ttyUSB0',
  endereco_modbus TEXT DEFAULT '001',
  ip_hf TEXT,
  porta_vps TEXT DEFAULT '502',
  timeout_ms INTEGER DEFAULT 1000,
  status TEXT DEFAULT 'offline',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.equipamentos_hf ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view HF equipment via generator" ON public.equipamentos_hf 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.geradores WHERE geradores.id = equipamentos_hf.gerador_id AND geradores.user_id = auth.uid())
);
CREATE POLICY "Users can insert HF equipment via generator" ON public.equipamentos_hf 
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.geradores WHERE geradores.id = equipamentos_hf.gerador_id AND geradores.user_id = auth.uid())
);
CREATE POLICY "Users can update HF equipment via generator" ON public.equipamentos_hf 
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.geradores WHERE geradores.id = equipamentos_hf.gerador_id AND geradores.user_id = auth.uid())
);

-- Tabela de conexões VPS
CREATE TABLE public.vps_conexoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gerador_id UUID NOT NULL REFERENCES public.geradores(id) ON DELETE CASCADE,
  ip_fixo TEXT NOT NULL,
  porta TEXT DEFAULT '502',
  hostname TEXT,
  provider TEXT,
  validado BOOLEAN DEFAULT false,
  ultima_validacao TIMESTAMP WITH TIME ZONE,
  latencia_ms INTEGER,
  uptime_percent NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vps_conexoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view VPS connections via generator" ON public.vps_conexoes 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.geradores WHERE geradores.id = vps_conexoes.gerador_id AND geradores.user_id = auth.uid())
);
CREATE POLICY "Users can insert VPS connections via generator" ON public.vps_conexoes 
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.geradores WHERE geradores.id = vps_conexoes.gerador_id AND geradores.user_id = auth.uid())
);
CREATE POLICY "Users can update VPS connections via generator" ON public.vps_conexoes 
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.geradores WHERE geradores.id = vps_conexoes.gerador_id AND geradores.user_id = auth.uid())
);

-- Tabela de leituras em tempo real
CREATE TABLE public.leituras_tempo_real (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gerador_id UUID NOT NULL REFERENCES public.geradores(id) ON DELETE CASCADE,
  tensao_rede_rs NUMERIC(8,2),
  tensao_rede_st NUMERIC(8,2),
  tensao_rede_tr NUMERIC(8,2),
  tensao_gmg NUMERIC(8,2),
  corrente_fase1 NUMERIC(8,2),
  frequencia_gmg NUMERIC(6,2),
  rpm_motor INTEGER,
  temperatura_agua NUMERIC(5,2),
  tensao_bateria NUMERIC(5,2),
  horas_trabalhadas INTEGER,
  numero_partidas INTEGER,
  nivel_combustivel INTEGER,
  motor_funcionando BOOLEAN DEFAULT false,
  rede_ok BOOLEAN DEFAULT false,
  gmg_alimentando BOOLEAN DEFAULT false,
  aviso_ativo BOOLEAN DEFAULT false,
  falha_ativa BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leituras_tempo_real ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view readings via generator" ON public.leituras_tempo_real 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.geradores WHERE geradores.id = leituras_tempo_real.gerador_id AND geradores.user_id = auth.uid())
);
CREATE POLICY "Allow insert from edge function" ON public.leituras_tempo_real 
FOR INSERT WITH CHECK (true);

-- Tabela de parâmetros de alerta
CREATE TABLE public.parametros_alerta (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gerador_id UUID NOT NULL REFERENCES public.geradores(id) ON DELETE CASCADE,
  parametro TEXT NOT NULL,
  valor_minimo NUMERIC(10,2),
  valor_maximo NUMERIC(10,2),
  nivel TEXT NOT NULL DEFAULT 'warning' CHECK (nivel IN ('info', 'warning', 'critical')),
  habilitado BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.parametros_alerta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alert params via generator" ON public.parametros_alerta 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.geradores WHERE geradores.id = parametros_alerta.gerador_id AND geradores.user_id = auth.uid())
);
CREATE POLICY "Users can insert alert params via generator" ON public.parametros_alerta 
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.geradores WHERE geradores.id = parametros_alerta.gerador_id AND geradores.user_id = auth.uid())
);
CREATE POLICY "Users can update alert params via generator" ON public.parametros_alerta 
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.geradores WHERE geradores.id = parametros_alerta.gerador_id AND geradores.user_id = auth.uid())
);
CREATE POLICY "Users can delete alert params via generator" ON public.parametros_alerta 
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.geradores WHERE geradores.id = parametros_alerta.gerador_id AND geradores.user_id = auth.uid())
);

-- Tabela de alertas gerados
CREATE TABLE public.alertas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gerador_id UUID NOT NULL REFERENCES public.geradores(id) ON DELETE CASCADE,
  leitura_id UUID REFERENCES public.leituras_tempo_real(id) ON DELETE SET NULL,
  nivel TEXT NOT NULL DEFAULT 'info' CHECK (nivel IN ('info', 'warning', 'critical')),
  mensagem TEXT NOT NULL,
  origem TEXT NOT NULL DEFAULT 'rule' CHECK (origem IN ('rule', 'ai')),
  resolvido BOOLEAN DEFAULT false,
  resolvido_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alerts via generator" ON public.alertas 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.geradores WHERE geradores.id = alertas.gerador_id AND geradores.user_id = auth.uid())
);
CREATE POLICY "Allow insert alerts from edge function" ON public.alertas 
FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update alerts via generator" ON public.alertas 
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.geradores WHERE geradores.id = alertas.gerador_id AND geradores.user_id = auth.uid())
);

-- Tabela de manuais
CREATE TABLE public.manuais_gerador (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gerador_id UUID NOT NULL REFERENCES public.geradores(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  modelo_identificado TEXT,
  tamanho TEXT,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.manuais_gerador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view manuals via generator" ON public.manuais_gerador 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.geradores WHERE geradores.id = manuais_gerador.gerador_id AND geradores.user_id = auth.uid())
);
CREATE POLICY "Users can insert manuals via generator" ON public.manuais_gerador 
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.geradores WHERE geradores.id = manuais_gerador.gerador_id AND geradores.user_id = auth.uid())
);
CREATE POLICY "Users can delete manuals via generator" ON public.manuais_gerador 
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.geradores WHERE geradores.id = manuais_gerador.gerador_id AND geradores.user_id = auth.uid())
);

-- Tabela de registros Modbus K30XL
CREATE TABLE public.modbus_registros_k30xl (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco INTEGER NOT NULL,
  descricao TEXT,
  unidade TEXT,
  fator_escala NUMERIC(10,4) DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.modbus_registros_k30xl ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view Modbus registers" ON public.modbus_registros_k30xl FOR SELECT USING (true);

-- Inserir registros padrão do K30XL
INSERT INTO public.modbus_registros_k30xl (nome, endereco, descricao, unidade, fator_escala) VALUES
('tensao_rede_rs', 40001, 'Tensão Rede R-S', 'V', 1),
('tensao_rede_st', 40002, 'Tensão Rede S-T', 'V', 1),
('tensao_rede_tr', 40003, 'Tensão Rede T-R', 'V', 1),
('tensao_gmg', 40004, 'Tensão do GMG', 'V', 1),
('corrente_fase1', 40005, 'Corrente Fase 1', 'A', 0.1),
('frequencia_gmg', 40006, 'Frequência do GMG', 'Hz', 0.1),
('rpm_motor', 40007, 'RPM do Motor', 'rpm', 1),
('temperatura_agua', 40008, 'Temperatura da Água', '°C', 1),
('tensao_bateria', 40009, 'Tensão da Bateria', 'V', 0.1),
('horas_trabalhadas', 40010, 'Horas Trabalhadas', 'h', 1),
('numero_partidas', 40011, 'Número de Partidas', '', 1),
('nivel_combustivel', 40012, 'Nível de Combustível', '%', 1),
('status_bits', 40013, 'Registro de Status', '', 1);

-- Habilitar realtime para leituras
ALTER PUBLICATION supabase_realtime ADD TABLE public.leituras_tempo_real;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alertas;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_geradores_updated_at BEFORE UPDATE ON public.geradores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_equipamentos_hf_updated_at BEFORE UPDATE ON public.equipamentos_hf FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vps_conexoes_updated_at BEFORE UPDATE ON public.vps_conexoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_parametros_alerta_updated_at BEFORE UPDATE ON public.parametros_alerta FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();