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
        `Tipologia: ${studioType}`,
        `ID studio: ${studioId || "Non disponibile"}`,
        `Data: ${createdAt}`,
        "",
        "Questa notifica contiene solo dati anagrafici minimi e non include dati economici, progetti o attività.",
      ].join("\n"),
      html: `
        <h2>Nuova registrazione Arch Time Pro</h2>
        <p><strong>Nome:</strong> ${escapeHtml(studioName)}</p>
        <p><strong>Tipologia:</strong> ${escapeHtml(studioType)}</p>
        <p><strong>ID studio:</strong> ${escapeHtml(studioId || "Non disponibile")}</p>
        <p><strong>Data:</strong> ${escapeHtml(createdAt)}</p>
        <p style="color:#64748b;font-size:13px">
          Questa notifica contiene solo dati anagrafici minimi e non include dati economici, progetti o attività.
        </p>
      `,
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Invio notifica non riuscito" }, 500);
  }
});
