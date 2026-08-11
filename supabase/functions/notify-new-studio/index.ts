import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

type StudioRecord = {
  id?: string;
  name?: string;
  business_type?: string;
  created_at?: string;
};

type WebhookPayload = {
  type?: string;
  table?: string;
  record?: StudioRecord;
};

type SignupAttribution = {
  landing_page?: string;
  signup_page?: string;
  previous_page?: string;
  first_referrer?: string;
  source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret: ${name}`);
  return value;
}

function businessTypeLabel(value?: string) {
  if (value === "company") return "Impresa";
  if (value === "studio") return "Studio tecnico";
  return value || "Non indicato";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayValue(value?: string, fallback = "Non disponibile") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function campaignLabel(attribution: SignupAttribution) {
  const parts = [
    attribution.utm_source && `source=${attribution.utm_source}`,
    attribution.utm_medium && `medium=${attribution.utm_medium}`,
    attribution.utm_campaign && `campaign=${attribution.utm_campaign}`,
    attribution.utm_content && `content=${attribution.utm_content}`,
  ].filter(Boolean);
  return parts.length ? parts.join(" | ") : "Nessuna campagna UTM";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const webhookSecret = Deno.env.get("NEW_STUDIO_WEBHOOK_SECRET");
    if (webhookSecret) {
      const receivedSecret = req.headers.get("x-archtime-webhook-secret");
      if (receivedSecret !== webhookSecret) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
    }

    const payload = (await req.json()) as WebhookPayload;
    const studio = payload.record || {};
    const studioName = String(studio.name || "Nuovo spazio senza nome").trim();
    const studioId = String(studio.id || "").trim();
    const studioType = businessTypeLabel(studio.business_type);
    const createdAt = studio.created_at
      ? new Date(studio.created_at).toLocaleString("it-IT", { timeZone: "Europe/Rome" })
      : new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });

    let ownerEmail = "Non disponibile";
    let ownerName = "Non disponibile";
    let attribution: SignupAttribution = {};

    if (studioId) {
      const adminClient = createClient(
        requiredEnv("SUPABASE_URL"),
        requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      );
      const { data: owners, error: ownerError } = await adminClient
        .from("profiles")
        .select("id, email, full_name, is_owner, role")
        .eq("studio_id", studioId)
        .order("is_owner", { ascending: false })
        .limit(5);

      if (ownerError) console.warn("Owner lookup failed", ownerError.message);
      const owner = owners?.find((profile) => profile.is_owner || profile.role === "admin") || owners?.[0];
      if (owner) {
        ownerEmail = displayValue(owner.email);
        ownerName = displayValue(owner.full_name);
        const { data: authData, error: authError } = await adminClient.auth.admin.getUserById(owner.id);
        if (authError) console.warn("Auth metadata lookup failed", authError.message);
        attribution = (authData?.user?.user_metadata?.signup_attribution || {}) as SignupAttribution;
      }
    }

    const landingPage = displayValue(attribution.landing_page);
    const signupPage = displayValue(attribution.signup_page, "/app.html");
    const previousPage = displayValue(
      attribution.previous_page || attribution.first_referrer,
      "Accesso diretto o non disponibile",
    );
    const trafficSource = displayValue(attribution.source);
    const campaign = campaignLabel(attribution);

    const smtpPort = Number(Deno.env.get("SMTP_PORT") || "587");
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
    const notificationEmail = requiredEnv("NEW_STUDIO_NOTIFICATION_EMAIL");

    await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: notificationEmail,
      subject: `Nuova registrazione Arch Time Pro: ${studioName}`,
      text: [
        "Nuova registrazione Arch Time Pro",
        "",
        `Nome: ${studioName}`,
        `Referente: ${ownerName}`,
        `Email registrata: ${ownerEmail}`,
        `Tipologia: ${studioType}`,
        `Data: ${createdAt}`,
        `Pagina di ingresso: ${landingPage}`,
        `Pagina di registrazione: ${signupPage}`,
        `Pagina/provenienza precedente: ${previousPage}`,
        `Sorgente: ${trafficSource}`,
        `Campagna: ${campaign}`,
        `ID tecnico studio: ${studioId || "Non disponibile"}`,
        "",
        "Questa notifica non include dati economici, progetti o attività.",
      ].join("\n"),
      html: `
        <h2>Nuova registrazione Arch Time Pro</h2>
        <p><strong>Nome:</strong> ${escapeHtml(studioName)}</p>
        <p><strong>Referente:</strong> ${escapeHtml(ownerName)}</p>
        <p><strong>Email registrata:</strong> ${escapeHtml(ownerEmail)}</p>
        <p><strong>Tipologia:</strong> ${escapeHtml(studioType)}</p>
        <p><strong>Data:</strong> ${escapeHtml(createdAt)}</p>
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0">
        <h3 style="margin-bottom:10px">Provenienza</h3>
        <p><strong>Pagina di ingresso:</strong> ${escapeHtml(landingPage)}</p>
        <p><strong>Pagina di registrazione:</strong> ${escapeHtml(signupPage)}</p>
        <p><strong>Pagina/provenienza precedente:</strong> ${escapeHtml(previousPage)}</p>
        <p><strong>Sorgente:</strong> ${escapeHtml(trafficSource)}</p>
        <p><strong>Campagna:</strong> ${escapeHtml(campaign)}</p>
        <p style="color:#94a3b8;font-size:12px"><strong>ID tecnico studio:</strong> ${escapeHtml(studioId || "Non disponibile")}</p>
        <p style="color:#64748b;font-size:13px">
          Questa notifica non include dati economici, progetti o attività.
        </p>
      `,
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Invio notifica non riuscito" }, 500);
  }
});
