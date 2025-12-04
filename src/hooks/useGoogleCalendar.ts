import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  attendees?: Array<{ email: string }>;
  htmlLink: string;
}

export const useGoogleCalendar = () => {
  const queryClient = useQueryClient();

  // Check if user is connected to Google Calendar
  const { data: isConnected, isLoading: isCheckingConnection } = useQuery({
    queryKey: ["google-calendar-connection"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("google_calendar_tokens")
          .select("id")
          .single();

        // PGRST116 = no rows returned, which means not connected
        if (error && error.code === "PGRST116") {
          return false;
        }

        if (error) {
          console.error("Error checking Google Calendar connection:", error);
          return false;
        }

        return !!data;
      } catch (error) {
        console.error("Failed to check connection:", error);
        return false;
      }
    },
  });

  // Get authorization URL
  const connectMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=auth`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to get auth URL");
      
      const data = await response.json();
      return data.authUrl;
    },
    onSuccess: (authUrl: string) => {
      window.location.href = authUrl;
    },
    onError: (error: Error) => {
      toast.error("Erro ao conectar: " + error.message);
    },
  });

  // Disconnect from Google Calendar
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=disconnect`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar-connection"] });
      toast.success("Desconectado do Google Calendar");
    },
    onError: (error: Error) => {
      toast.error("Erro ao desconectar: " + error.message);
    },
  });

  // List events from Google Calendar
  const { data: events, isLoading: isLoadingEvents, refetch: refetchEvents } = useQuery({
    queryKey: ["google-calendar-events"],
    queryFn: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=list-events`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch events");
        }
        
        const data = await response.json();
        return data.items as GoogleCalendarEvent[];
      } catch (error) {
        console.error("Error fetching calendar events:", error);
        throw error;
      }
    },
    enabled: !!isConnected,
    retry: false,
  });

  // Create event in Google Calendar
  const createEventMutation = useMutation({
    mutationFn: async ({
      summary,
      description,
      startDateTime,
      endDateTime,
      attendees,
      recurrence,
    }: {
      summary: string;
      description?: string;
      startDateTime: string;
      endDateTime: string;
      attendees?: string[];
      recurrence?: string[];
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=create-event`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary,
            description,
            startDateTime,
            endDateTime,
            attendees,
            recurrence,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to create event");
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar-events"] });
      toast.success("Evento criado no Google Calendar");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar evento: " + error.message);
    },
  });

  // Update event in Google Calendar
  const updateEventMutation = useMutation({
    mutationFn: async ({
      eventId,
      summary,
      description,
      startDateTime,
      endDateTime,
      attendees,
    }: {
      eventId: string;
      summary: string;
      description?: string;
      startDateTime: string;
      endDateTime: string;
      attendees?: string[];
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=update-event`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventId,
            summary,
            description,
            startDateTime,
            endDateTime,
            attendees,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update event");
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar-events"] });
      toast.success("Evento atualizado no Google Calendar");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar evento: " + error.message);
    },
  });

  // Delete event from Google Calendar
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=delete-event&eventId=${eventId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete event");
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar-events"] });
      toast.success("Evento excluído do Google Calendar");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir evento: " + error.message);
    },
  });

  return {
    isConnected,
    isCheckingConnection,
    connect: connectMutation.mutate,
    isConnecting: connectMutation.isPending,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    events,
    isLoadingEvents,
    refetchEvents,
    createEvent: createEventMutation.mutate,
    isCreatingEvent: createEventMutation.isPending,
    updateEvent: updateEventMutation.mutate,
    isUpdatingEvent: updateEventMutation.isPending,
    deleteEvent: deleteEventMutation.mutate,
    isDeletingEvent: deleteEventMutation.isPending,
  };
};
