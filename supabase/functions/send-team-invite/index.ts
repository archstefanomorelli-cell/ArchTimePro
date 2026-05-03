import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

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

    const { email, inviteCode, inviteUrl } = await req.json();
    const recipientEmail = String(email || "").trim().toLowerCase();
    const code = String(inviteCode || "").trim();
    const url = String(inviteUrl || "").trim();

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

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, full_name, studio_id, role, is_owner")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile?.studio_id) {
      return jsonResponse({ error: "Profilo non trovato" }, 404);
    }

    if (!(profile.is_owner || profile.role === "admin")) {
      return jsonResponse({ error: "Solo admin e owner possono invitare collaboratori" }, 403);
    }

    if (code !== profile.studio_id) {
      return jsonResponse({ error: "Codice invito non valido" }, 400);
    }

    const { data: studio } = await adminClient
      .from("studios")
      .select("name")
      .eq("id", profile.studio_id)
      .single();

    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://www.archtimepro.it";
    const safeInviteUrl = url.startsWith(appBaseUrl)
      ? url
      : `${appBaseUrl}/app.html?invite=${encodeURIComponent(code)}`;

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
    const inviterName = profile.full_name || "Il tuo manager";

    await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: recipientEmail,
      subject: `Invito a entrare in ${studioName} su Arch Time Pro`,
      text: [
        `Ciao,`,
        ``,
        `${inviterName} ti ha invitato a entrare in ${studioName} su Arch Time Pro.`,
        ``,
        `Apri questo link per registrarti come collaboratore:`,
        safeInviteUrl,
        ``,
        `Codice invito: ${code}`,
        ``,
        `A presto,`,
        `Il team di Arch Time Pro`,
      ].join("\n"),
      html: `
        <h2>Invito su Arch Time Pro</h2>
        <p>${inviterName} ti ha invitato a entrare in <strong>${studioName}</strong>.</p>
        <p><a href="${safeInviteUrl}">Registrati come collaboratore</a></p>
        <p>Se il link non funziona, usa questo codice invito:</p>
        <p><strong>${code}</strong></p>
        <p>A presto,<br>Il team di Arch Time Pro</p>
      `,
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Invio email non riuscito" }, 500);
  }
});
