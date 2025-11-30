import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    
    // Get the origin from the request to build the correct redirect URI
    const origin = req.headers.get('origin') || 'https://hub-vivaz.lovable.app';
    const REDIRECT_URI = `${origin}/google-calendar/callback`;

    console.log('Google Calendar action:', action);

    // OAuth flow - Get authorization URL
    if (action === 'auth') {
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID!);
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', user.id);

      return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // OAuth callback - Exchange code for tokens
    if (action === 'callback' && req.method === 'POST') {
      const body = await req.json();
      const code = body.code;

      if (!code) {
        return new Response(JSON.stringify({ error: 'Missing authorization code' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      const tokens: GoogleTokenResponse = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Token exchange error:', tokens);
        return new Response(JSON.stringify({ error: 'Token exchange failed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Save tokens to database
      const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);
      const { error: dbError } = await supabaseClient
        .from('google_calendar_tokens')
        .upsert({
          user_id: user.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || '',
          token_expiry: tokenExpiry.toISOString(),
        });

      if (dbError) {
        console.error('Database error:', dbError);
        return new Response(JSON.stringify({ error: 'Failed to save tokens' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get events from Google Calendar
    if (action === 'list-events') {
      const { data: tokenData } = await supabaseClient
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!tokenData) {
        return new Response(JSON.stringify({ error: 'Not connected to Google Calendar' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if token is expired and refresh if needed
      let accessToken = tokenData.access_token;
      if (new Date(tokenData.token_expiry) < new Date()) {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID!,
            client_secret: GOOGLE_CLIENT_SECRET!,
            refresh_token: tokenData.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        const newTokens: GoogleTokenResponse = await refreshResponse.json();
        accessToken = newTokens.access_token;

        const tokenExpiry = new Date(Date.now() + newTokens.expires_in * 1000);
        await supabaseClient
          .from('google_calendar_tokens')
          .update({
            access_token: newTokens.access_token,
            token_expiry: tokenExpiry.toISOString(),
          })
          .eq('user_id', user.id);
      }

      // Fetch events from Google Calendar
      const timeMin = new Date();
      timeMin.setMonth(timeMin.getMonth() - 1); // Last month
      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 3); // Next 3 months

      const eventsUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
      eventsUrl.searchParams.set('timeMin', timeMin.toISOString());
      eventsUrl.searchParams.set('timeMax', timeMax.toISOString());
      eventsUrl.searchParams.set('singleEvents', 'true');
      eventsUrl.searchParams.set('orderBy', 'startTime');

      const eventsResponse = await fetch(eventsUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const eventsData = await eventsResponse.json();

      return new Response(JSON.stringify(eventsData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create event in Google Calendar
    if (action === 'create-event' && req.method === 'POST') {
      const body = await req.json();
      const { summary, description, startDateTime, endDateTime, attendees, recurrence } = body;

      const { data: tokenData } = await supabaseClient
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!tokenData) {
        return new Response(JSON.stringify({ error: 'Not connected to Google Calendar' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Refresh token if expired
      let accessToken = tokenData.access_token;
      if (new Date(tokenData.token_expiry) < new Date()) {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID!,
            client_secret: GOOGLE_CLIENT_SECRET!,
            refresh_token: tokenData.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        const newTokens: GoogleTokenResponse = await refreshResponse.json();
        accessToken = newTokens.access_token;

        const tokenExpiry = new Date(Date.now() + newTokens.expires_in * 1000);
        await supabaseClient
          .from('google_calendar_tokens')
          .update({
            access_token: newTokens.access_token,
            token_expiry: tokenExpiry.toISOString(),
          })
          .eq('user_id', user.id);
      }

      // Create event
      const event = {
        summary,
        description,
        start: {
          dateTime: startDateTime,
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'America/Sao_Paulo',
        },
        attendees: attendees?.map((email: string) => ({ email })) || [],
        recurrence: recurrence || [],
      };

      const createResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      const createdEvent = await createResponse.json();

      if (!createResponse.ok) {
        console.error('Event creation error:', createdEvent);
        return new Response(JSON.stringify({ error: 'Failed to create event' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(createdEvent), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Disconnect Google Calendar
    if (action === 'disconnect' && req.method === 'DELETE') {
      const { error } = await supabaseClient
        .from('google_calendar_tokens')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        return new Response(JSON.stringify({ error: 'Failed to disconnect' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
