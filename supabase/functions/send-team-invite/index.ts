import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret: ${name}`);
  return value;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    // Il browser manda solo l'email: l'invito personale viene creato qui, a nome di chi invita
    const { email } = await req.json();
    const recipientEmail = String(email || "").trim().toLowerCase();

    if (!isValidEmail(recipientEmail)) {
      return jsonResponse({ error: "Email non valida" }, 400);
    }

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const supabaseAnonKey = requiredEnv("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return jsonResponse({ error: "Unauthorized" }, 401);

    // Crea l'invito con i permessi di chi invita: la funzione controlla ruolo, studio e abbonamento
    const { data: invite, error: inviteError } = await userClient.rpc("create_studio_invite", {
      invite_email: recipientEmail,
    });
    const token = Array.isArray(invite) ? invite[0]?.invite_token : invite?.invite_token;
    if (inviteError || !token) {
      return jsonResponse({ error: inviteError?.message || "Invito non creato" }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, studio_id")
      .eq("id", authData.user.id)
      .single();
    const { data: studio } = await adminClient
      .from("studios")
      .select("name")
      .eq("id", profile?.studio_id)
      .single();

    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://www.archtimepro.it";
    const safeInviteUrl = `${appBaseUrl}/app.html?invite=${encodeURIComponent(token)}`;

    const smtpPort = Number(Deno.env.get("SMTP_PORT") || "465");
    const transporter = nodemailer.createTransport({
      host: requiredEnv("SMTP_HOST"),
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: requiredEnv("SMTP_USER"),
        pass: requiredEnv("SMTP_PASS"),
      },
    });

    const senderEmail = Deno.env.get("SMTP_FROM_EMAIL") || requiredEnv("SMTP_USER");
    const senderName = Deno.env.get("SMTP_FROM_NAME") || "Arch Time Pro";
    const studioName = studio?.name || "il team";
    const inviterName = profile?.full_name || "Il titolare dello studio";

    await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: recipientEmail,
      subject: `Invito a entrare in ${studioName} su Arch Time Pro`,
      text: [
        `Ciao,`,
        ``,
        `${inviterName} ti ha invitato a entrare in ${studioName} su Arch Time Pro.`,
        ``,
        `Apri questo link per registrarti come collaboratore con questo indirizzo email:`,
        safeInviteUrl,
        ``,
        `Il link è personale, vale 7 giorni e si può usare una sola volta.`,
        ``,
        `A presto,`,
        `Il team di Arch Time Pro`,
      ].join("\n"),
      html: `
        <h2>Invito su Arch Time Pro</h2>
        <p>${escapeHtml(inviterName)} ti ha invitato a entrare in <strong>${escapeHtml(studioName)}</strong>.</p>
        <p><a href="${safeInviteUrl}">Registrati come collaboratore</a></p>
        <p>Usa questo indirizzo email per registrarti. Il link è personale, vale 7 giorni e si può usare una sola volta.</p>
        <p>A presto,<br>Il team di Arch Time Pro</p>
      `,
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Invio email non riuscito" }, 500);
  }
});
