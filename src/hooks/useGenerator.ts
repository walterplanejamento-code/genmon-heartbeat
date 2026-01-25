import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";

export interface Generator {
  id: string;
  user_id: string;
  marca: string;
  modelo: string;
  controlador: string;
  potencia_nominal: string | null;
  tensao_nominal: string | null;
  frequencia_nominal: string | null;
  combustivel: string | null;
  instrucoes: string | null;
  created_at: string;
  updated_at: string;
}

export function useGenerator() {
  const [generator, setGenerator] = useState<Generator | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGenerator = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("geradores")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching generator:", fetchError);
        setError(fetchError.message);
        return;
      }

      setGenerator(data as Generator | null);
    } catch (err) {
      console.error("Unexpected error:", err);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createGenerator = useCallback(async (data: Partial<Generator>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: newGenerator, error } = await supabase
        .from("geradores")
        .insert({
          user_id: user.id,
          marca: data.marca || "MWM",
          modelo: data.modelo || "D229-4",
          controlador: data.controlador || "STEMAC K30XL",
          potencia_nominal: data.potencia_nominal,
          tensao_nominal: data.tensao_nominal || "380",
          frequencia_nominal: data.frequencia_nominal || "60",
          combustivel: data.combustivel || "Diesel",
          instrucoes: data.instrucoes,
        })
        .select()
        .single();

      if (error) throw error;

      setGenerator(newGenerator as Generator);
      return newGenerator;
    } catch (err) {
      console.error("Error creating generator:", err);
      throw err;
    }
  }, []);

  const updateGenerator = useCallback(async (id: string, data: Partial<Generator>) => {
    try {
      const { data: updated, error } = await supabase
        .from("geradores")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setGenerator(updated as Generator);
      return updated;
    } catch (err) {
      console.error("Error updating generator:", err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchGenerator();
  }, [fetchGenerator]);

  return {
    generator,
    isLoading,
    error,
    createGenerator,
    updateGenerator,
    refetch: fetchGenerator,
  };
}
