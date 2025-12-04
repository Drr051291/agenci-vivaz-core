import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGoogleCalendar } from "./useGoogleCalendar";

interface MeetingData {
  id: string;
  title: string;
  meeting_date: string;
  participants?: string[];
  content?: string;
  client_id?: string;
}

export const useMeetingCalendarSync = () => {
  const { isConnected, createEvent, updateEvent, deleteEvent } = useGoogleCalendar();

  // Create Google Calendar event for a meeting
  const syncMeetingToCalendar = useCallback(async (meeting: MeetingData): Promise<string | null> => {
    if (!isConnected) return null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      // Calculate end time (1 hour after start)
      const startDate = new Date(meeting.meeting_date);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=create-event`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: meeting.title,
            description: `Reunião Hub Vivaz\n\nID da reunião: ${meeting.id}`,
            startDateTime: startDate.toISOString(),
            endDateTime: endDate.toISOString(),
            attendees: meeting.participants || [],
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create event");
      }

      const eventData = await response.json();
      
      // Save sync reference
      await supabase.from("google_calendar_events").insert({
        meeting_id: meeting.id,
        google_event_id: eventData.id,
        calendar_id: "primary",
      });

      return eventData.id;
    } catch (error) {
      console.error("Error syncing meeting to calendar:", error);
      return null;
    }
  }, [isConnected]);

  // Update Google Calendar event for a meeting
  const updateMeetingInCalendar = useCallback(async (meeting: MeetingData): Promise<boolean> => {
    if (!isConnected) return false;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      // Get synced event
      const { data: syncedEvent } = await supabase
        .from("google_calendar_events")
        .select("google_event_id")
        .eq("meeting_id", meeting.id)
        .single();

      if (!syncedEvent) {
        // No synced event exists, create one
        await syncMeetingToCalendar(meeting);
        return true;
      }

      // Calculate end time (1 hour after start)
      const startDate = new Date(meeting.meeting_date);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=update-event`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventId: syncedEvent.google_event_id,
            summary: meeting.title,
            description: `Reunião Hub Vivaz\n\nID da reunião: ${meeting.id}`,
            startDateTime: startDate.toISOString(),
            endDateTime: endDate.toISOString(),
            attendees: meeting.participants || [],
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update event");
      }

      // Update sync timestamp
      await supabase
        .from("google_calendar_events")
        .update({ synced_at: new Date().toISOString() })
        .eq("meeting_id", meeting.id);

      return true;
    } catch (error) {
      console.error("Error updating meeting in calendar:", error);
      return false;
    }
  }, [isConnected, syncMeetingToCalendar]);

  // Delete Google Calendar event for a meeting
  const deleteMeetingFromCalendar = useCallback(async (meetingId: string): Promise<boolean> => {
    if (!isConnected) return false;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      // Get synced event
      const { data: syncedEvent } = await supabase
        .from("google_calendar_events")
        .select("google_event_id")
        .eq("meeting_id", meetingId)
        .single();

      if (!syncedEvent) return true; // No event to delete

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=delete-event&eventId=${syncedEvent.google_event_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      // Delete sync reference regardless of API result
      await supabase
        .from("google_calendar_events")
        .delete()
        .eq("meeting_id", meetingId);

      return response.ok;
    } catch (error) {
      console.error("Error deleting meeting from calendar:", error);
      return false;
    }
  }, [isConnected]);

  // Check if meeting is synced to calendar
  const isMeetingSynced = useCallback(async (meetingId: string): Promise<boolean> => {
    const { data } = await supabase
      .from("google_calendar_events")
      .select("id")
      .eq("meeting_id", meetingId)
      .single();
    
    return !!data;
  }, []);

  // Get sync status for a meeting
  const getMeetingSyncStatus = useCallback(async (meetingId: string) => {
    const { data } = await supabase
      .from("google_calendar_events")
      .select("*")
      .eq("meeting_id", meetingId)
      .single();
    
    return data;
  }, []);

  // Sync all unsynced meetings for a client
  const syncAllMeetings = useCallback(async (clientId: string): Promise<number> => {
    if (!isConnected) return 0;

    try {
      // Get all meetings for client
      const { data: meetings } = await supabase
        .from("meeting_minutes")
        .select("id, title, meeting_date, participants")
        .eq("client_id", clientId);

      if (!meetings) return 0;

      // Get already synced meeting IDs
      const { data: syncedEvents } = await supabase
        .from("google_calendar_events")
        .select("meeting_id");

      const syncedMeetingIds = new Set(syncedEvents?.map(e => e.meeting_id) || []);

      // Sync unsynced meetings
      let syncedCount = 0;
      for (const meeting of meetings) {
        if (!syncedMeetingIds.has(meeting.id)) {
          const result = await syncMeetingToCalendar(meeting);
          if (result) syncedCount++;
        }
      }

      return syncedCount;
    } catch (error) {
      console.error("Error syncing all meetings:", error);
      return 0;
    }
  }, [isConnected, syncMeetingToCalendar]);

  return {
    isConnected,
    syncMeetingToCalendar,
    updateMeetingInCalendar,
    deleteMeetingFromCalendar,
    isMeetingSynced,
    getMeetingSyncStatus,
    syncAllMeetings,
  };
};
