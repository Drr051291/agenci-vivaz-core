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
    actionLabel: "Ver Atividade",
  },
  meeting: {
    icon: "📅",
    color: "#8B5CF6",
    label: "Reunião",
    actionLabel: "Ver Reunião",
  },
  comment: {
    icon: "💬",
    color: "#22C55E",
    label: "Comentário",
    actionLabel: "Ver Comentário",
  },
  payment: {
    icon: "💰",
    color: "#EAB308",
    label: "Pagamento",
    actionLabel: "Ver Financeiro",
  },
  invoice: {
    icon: "📄",
    color: "#F97316",
    label: "Nota Fiscal",
    actionLabel: "Ver Nota Fiscal",
  },
};

const categoryPreferenceMap: Record<string, string> = {
  task: "email_tasks",
  meeting: "email_meetings",
  comment: "email_comments",
  payment: "email_payments",
  invoice: "email_invoices",
};

function buildActionUrl(category: string, referenceId?: string, referenceType?: string): string {
  const baseUrl = "https://hub.vivazagencia.com.br";
  
  switch (category) {
    case "task":
    case "comment":
      return referenceId 
        ? `${baseUrl}/area-cliente/atividades?task=${referenceId}`
        : `${baseUrl}/area-cliente/atividades`;
    case "meeting":
      return referenceId 
        ? `${baseUrl}/area-cliente/reunioes/${referenceId}`
        : `${baseUrl}/area-cliente/reunioes`;
    case "payment":
    case "invoice":
      return `${baseUrl}/area-cliente/performance`;
    default:
      return `${baseUrl}/area-cliente`;
  }
}

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

    console.log(`Processing notification for user ${userId}, category: ${category}, referenceId: ${referenceId}`);

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
    const actionUrl = buildActionUrl(category, referenceId, referenceType);

    console.log(`Action URL: ${actionUrl}`);

    const logoUrl = "https://hub.vivazagencia.com.br/logo-vivaz.png";
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #1F1821; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #2A2330; border-radius: 16px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);">
          <!-- Header com Logo -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center; border-bottom: 1px solid #3D3347;">
              <img 
                src="${logoUrl}" 
                alt="Vivaz" 
                width="140" 
                height="auto" 
                style="display: block; margin: 0 auto 12px;"
              />
              <p style="color: #DA60F4; font-size: 11px; letter-spacing: 3px; margin: 0; font-weight: 600;">
                MARKETING E GROWTH
              </p>
            </td>
          </tr>
          
          <!-- Conteúdo Principal -->
          <tr>
            <td style="padding: 32px 40px;">
              <!-- Badge da categoria -->
              <div style="background-color: ${config.color}20; border-left: 4px solid ${config.color}; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-bottom: 28px;">
                <span style="font-size: 20px; margin-right: 10px; vertical-align: middle;">${config.icon}</span>
                <span style="color: ${config.color}; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; vertical-align: middle;">${config.label}</span>
              </div>
              
              <!-- Título -->
              <h1 style="color: #FFFFFF; font-size: 22px; font-weight: 700; margin: 0 0 16px; line-height: 1.4;">
                ${title}
              </h1>
              
              <!-- Mensagem -->
              <p style="color: #B8B0C0; font-size: 15px; line-height: 1.7; margin: 0 0 28px;">
                ${message}
              </p>
              
              <!-- Botão CTA -->
              <div style="text-align: center; margin-top: 32px;">
                <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #DA60F4, #A419BC); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(218, 96, 244, 0.3);">
                  ${config.actionLabel}
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #241E28; border-radius: 0 0 16px 16px;">
              <p style="color: #6B6372; font-size: 12px; text-align: center; margin: 0; line-height: 1.6;">
                <a href="https://hub.vivazagencia.com.br" style="color: #DA60F4; text-decoration: none; font-weight: 500;">HUB Vivaz</a>
                <span style="color: #4A4252;"> • </span>
                hub.vivazagencia.com.br
              </p>
              <p style="color: #4A4252; font-size: 11px; text-align: center; margin: 12px 0 0;">
                Você recebeu este email porque tem notificações ativadas.
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
