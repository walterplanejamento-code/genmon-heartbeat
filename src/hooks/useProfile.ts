import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProfile = useCallback(async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setProfile(data as Profile | null);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Erro ao carregar perfil");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<Profile>) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (profile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            name: data.name,
            email: data.email,
            company: data.company,
          })
          .eq("id", profile.id);

        if (updateError) throw updateError;
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            name: data.name,
            email: data.email,
            company: data.company,
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Perfil salvo",
        description: "Suas informações foram atualizadas com sucesso.",
      });

      await fetchProfile();
    } catch (err) {
      console.error("Error updating profile:", err);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o perfil.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [profile, fetchProfile, toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    isSaving,
    error,
    updateProfile,
    refetch: fetchProfile,
  };
}
