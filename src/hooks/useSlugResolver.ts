import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseClientSlugResult {
  clientId: string | null;
  clientSlug: string | null;
  loading: boolean;
  error: string | null;
}

interface UseMeetingSlugResult {
  meetingId: string | null;
  meetingSlug: string | null;
  loading: boolean;
  error: string | null;
}

// Check if a string is a valid UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Resolve client by slug or id
export function useClientSlugResolver(identifier: string | undefined): UseClientSlugResult {
  const [result, setResult] = useState<UseClientSlugResult>({
    clientId: null,
    clientSlug: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!identifier) {
      setResult({ clientId: null, clientSlug: null, loading: false, error: "Identificador não fornecido" });
      return;
    }

    const resolve = async () => {
      setResult(prev => ({ ...prev, loading: true, error: null }));

      try {
        // If it's a UUID, search by id
        if (isUUID(identifier)) {
          const { data, error } = await supabase
            .from("clients")
            .select("id, slug")
            .eq("id", identifier)
            .single();

          if (error) throw error;
          setResult({ clientId: data.id, clientSlug: data.slug, loading: false, error: null });
        } else {
          // Otherwise, search by slug
          const { data, error } = await supabase
            .from("clients")
            .select("id, slug")
            .eq("slug", identifier)
            .single();

          if (error) throw error;
          setResult({ clientId: data.id, clientSlug: data.slug, loading: false, error: null });
        }
      } catch (error: any) {
        console.error("Erro ao resolver cliente:", error);
        setResult({ clientId: null, clientSlug: null, loading: false, error: "Cliente não encontrado" });
      }
    };

    resolve();
  }, [identifier]);

  return result;
}

// Resolve meeting by slug or id within a client context
export function useMeetingSlugResolver(
  clientId: string | null,
  identifier: string | undefined
): UseMeetingSlugResult {
  const [result, setResult] = useState<UseMeetingSlugResult>({
    meetingId: null,
    meetingSlug: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!identifier || !clientId) {
      setResult({ meetingId: null, meetingSlug: null, loading: !identifier, error: null });
      return;
    }

    const resolve = async () => {
      setResult(prev => ({ ...prev, loading: true, error: null }));

      try {
        // If it's a UUID, search by id
        if (isUUID(identifier)) {
          const { data, error } = await supabase
            .from("meeting_minutes")
            .select("id, slug")
            .eq("id", identifier)
            .single();

          if (error) throw error;
          setResult({ meetingId: data.id, meetingSlug: data.slug, loading: false, error: null });
        } else {
          // Otherwise, search by slug within client scope
          const { data, error } = await supabase
            .from("meeting_minutes")
            .select("id, slug")
            .eq("client_id", clientId)
            .eq("slug", identifier)
            .single();

          if (error) throw error;
          setResult({ meetingId: data.id, meetingSlug: data.slug, loading: false, error: null });
        }
      } catch (error: any) {
        console.error("Erro ao resolver reunião:", error);
        setResult({ meetingId: null, meetingSlug: null, loading: false, error: "Reunião não encontrada" });
      }
    };

    resolve();
  }, [clientId, identifier]);

  return result;
}

// Get client slug by id (for navigation)
export async function getClientSlug(clientId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("clients")
      .select("slug")
      .eq("id", clientId)
      .single();

    if (error || !data?.slug) return clientId;
    return data.slug;
  } catch {
    return clientId;
  }
}

// Get meeting slug by id (for navigation)
export async function getMeetingSlug(meetingId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("meeting_minutes")
      .select("slug")
      .eq("id", meetingId)
      .single();

    if (error || !data?.slug) return meetingId;
    return data.slug;
  } catch {
    return meetingId;
  }
}

// Get meeting by share token (for public links)
export async function getMeetingByShareToken(token: string) {
  try {
    const { data, error } = await supabase
      .from("meeting_minutes")
      .select("id, slug")
      .eq("share_token", token)
      .single();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}
