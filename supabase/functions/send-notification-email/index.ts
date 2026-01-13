import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  userId: string;
  title: string;
  message: string;
  category: "task" | "meeting" | "comment" | "payment" | "invoice";
  referenceId?: string;
  referenceType?: string;
}

const categoryConfig = {
  task: {
    icon: "✓",
    color: "#3B82F6",
    label: "Tarefa",
  },
  meeting: {
    icon: "📅",
    color: "#8B5CF6",
    label: "Reunião",
  },
  comment: {
    icon: "💬",
    color: "#22C55E",
    label: "Comentário",
  },
  payment: {
    icon: "💰",
    color: "#EAB308",
    label: "Pagamento",
  },
  invoice: {
    icon: "📄",
    color: "#F97316",
    label: "Nota Fiscal",
  },
};

const categoryPreferenceMap: Record<string, string> = {
  task: "email_tasks",
  meeting: "email_meetings",
  comment: "email_comments",
  payment: "email_payments",
  invoice: "email_invoices",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-notification-email function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, title, message, category, referenceId, referenceType }: NotificationEmailRequest = await req.json();

    console.log(`Processing notification for user ${userId}, category: ${category}`);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check user notification preferences
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    const preferenceField = categoryPreferenceMap[category];
    
    // If no preferences exist or the specific email preference is disabled, skip email
    if (preferences && preferences[preferenceField] === false) {
      console.log(`Email notifications disabled for ${category}, skipping`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Email disabled for category" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const config = categoryConfig[category];
    const appUrl = Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovable.app") || "https://app.vivazagencia.com.br";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #6D28D9); padding: 12px 24px; border-radius: 8px;">
                  <span style="color: #ffffff; font-weight: 700; font-size: 20px;">VIVAZ</span>
                </div>
              </div>
              
              <div style="background-color: ${config.color}15; border-left: 4px solid ${config.color}; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <span style="font-size: 24px; margin-right: 8px;">${config.icon}</span>
                <span style="color: ${config.color}; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">${config.label}</span>
              </div>
              
              <h1 style="color: #1a1a2e; font-size: 24px; font-weight: 700; margin: 0 0 16px; line-height: 1.3;">
                ${title}
              </h1>
              
              <p style="color: #4a4a68; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                ${message}
              </p>
              
              <div style="text-align: center; margin-top: 32px;">
                <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #6D28D9); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  Acessar Plataforma
                </a>
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 24px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px;">
              <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
                Você recebeu este email porque tem notificações ativadas para ${config.label.toLowerCase()}s.
                <br>
                Gerencie suas preferências de notificação na plataforma.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    console.log(`Sending email to ${profile.email}`);

    // Send email using Resend API directly via fetch
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Vivaz Agência <notificacoes@hub.vivazagencia.com.br>",
        to: [profile.email],
        subject: `${config.icon} ${title}`,
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      // Log the error but don't fail the notification - email is optional enhancement
      console.warn("Email sending failed (domain not verified or other issue):", emailData);
      console.warn("To fix: Verify your domain at https://resend.com/domains");
      
      // Return success with warning - notification was still created in DB
      return new Response(
        JSON.stringify({ 
          success: true, 
          emailSent: false, 
          emailError: emailData.message || "Email sending failed - domain not verified",
          hint: "Verify your domain at https://resend.com/domains to enable email notifications"
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, emailSent: true, emailId: emailData?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-notification-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
