import { supabase } from "@/integrations/supabase/client";

export type NotificationCategory = "task" | "meeting" | "comment" | "payment" | "invoice";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  referenceId?: string;
  referenceType?: string;
  clientId?: string;
  sendEmail?: boolean;
}

export async function createNotification({
  userId,
  title,
  message,
  category,
  referenceId,
  referenceType,
  clientId,
  sendEmail = false, // Temporariamente desabilitado
}: CreateNotificationParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Insert notification into database
    const { error: insertError } = await supabase.from("notifications").insert({
      user_id: userId,
      title,
      message,
      category,
      reference_id: referenceId || null,
      reference_type: referenceType || null,
      type: "info",
      is_read: false,
    });

    if (insertError) {
      console.error("Error inserting notification:", insertError);
      return { success: false, error: insertError.message };
    }

    // Send email notification if enabled
    if (sendEmail) {
      try {
        const { error: emailError } = await supabase.functions.invoke(
          "send-notification-email",
          {
            body: {
              userId,
              title,
              message,
              category,
              referenceId,
              referenceType,
              clientId,
            },
          }
        );

        if (emailError) {
          console.error("Error sending notification email:", emailError);
          // Don't fail the whole operation if email fails
        }
      } catch (emailError) {
        console.error("Error calling email function:", emailError);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error creating notification:", error);
    return { success: false, error: error.message };
  }
}

export async function getClientUserId(clientId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("clients")
      .select("user_id")
      .eq("id", clientId)
      .single();

    if (error || !data?.user_id) {
      return null;
    }

    return data.user_id;
  } catch (error) {
    console.error("Error getting client user_id:", error);
    return null;
  }
}

export async function getClientIdFromUserId(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (error || !data?.id) {
      return null;
    }

    return data.id;
  } catch (error) {
    console.error("Error getting client_id from user_id:", error);
    return null;
  }
}
