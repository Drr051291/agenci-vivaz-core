import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ClientData {
  id: string;
  company_name: string;
  segment: string;
  contact_name: string | null;
  contract_start: string | null;
  status: string;
}

interface UseClientUserResult {
  clientId: string | null;
  clientData: ClientData | null;
  userId: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch client data for authenticated client users.
 * Uses the client_users junction table for many-to-many relationships.
 */
export function useClientUser(options?: { redirectOnFail?: boolean }): UseClientUserResult {
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const redirectOnFail = options?.redirectOnFail ?? true;

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          if (redirectOnFail) navigate("/auth");
          setLoading(false);
          return;
        }

        setUserId(session.user.id);

        // Verify user has client role
        const { data: userRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();

        if (userRole?.role !== "client") {
          if (redirectOnFail) navigate("/dashboard");
          setLoading(false);
          return;
        }

        // Fetch client via client_users junction table
        const { data: clientUserLink, error: linkError } = await supabase
          .from("client_users")
          .select(`
            client_id,
            clients (
              id,
              company_name,
              segment,
              contact_name,
              contract_start,
              status
            )
          `)
          .eq("user_id", session.user.id)
          .limit(1)
          .single();

        if (linkError || !clientUserLink) {
          console.error("Erro ao buscar vínculo de cliente:", linkError);
          setError("Nenhum cliente vinculado encontrado.");
          setLoading(false);
          return;
        }

        const client = clientUserLink.clients as unknown as ClientData;
        
        if (!client) {
          setError("Dados do cliente não encontrados.");
          setLoading(false);
          return;
        }

        setClientId(client.id);
        setClientData(client);
      } catch (err) {
        console.error("Erro ao carregar dados do cliente:", err);
        setError("Erro ao carregar dados do cliente.");
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [navigate, redirectOnFail]);

  return { clientId, clientData, userId, loading, error };
}
