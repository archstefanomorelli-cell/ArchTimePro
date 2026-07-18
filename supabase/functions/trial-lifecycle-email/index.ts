import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const MAX_EMAILS_PER_RUN = 100;

type LifecycleCandidate = {
  log_id: number;
  studio_id: string;
  profile_id: string;
  event_key: string;
  recipient_email: string;
  recipient_name: string | null;
  studio_name: string | null;
  days_left: number | null;
  unsubscribe_token: string;
};

type EmailCopy = {
  subject: string;
  eyebrow: string;
  title: string;
  paragraphs: string[];
  ctaLabel: string;
};

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret: ${name}`);
  return value;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function emailCopy(eventKey: string, daysLeft: number | null): EmailCopy {
  const remainingDays = Math.max(1, Number(daysLeft) || 1);
  const remainingLabel = remainingDays === 1 ? "1 giorno" : `${remainingDays} giorni`;
  const copies: Record<string, EmailCopy> = {
    no_project_24h: {
      subject: "Partiamo dalla prima commessa?",
      eyebrow: "Primo passo",
      title: "Il tuo spazio è pronto.",
      paragraphs: [
        "Per vedere Arch Time Pro al lavoro basta partire da una commessa reale.",
        "Inserisci nome, cliente e compenso: puoi affinare attività e budget anche in seguito.",
      ],
      ctaLabel: "Crea la prima commessa",
    },
    project_no_hours_48h: {
      subject: "La commessa è pronta: manca il primo dato",
      eyebrow: "Attivazione",
      title: "Fai entrare la prima ora.",
      paragraphs: [
        "Hai già creato una commessa. Ora registra una prima attività, anche manualmente.",
        "Da quel momento costi e margine iniziano ad aggiornarsi con il lavoro reale.",
      ],
      ctaLabel: "Registra la prima attività",
    },
    inactive_7d: {
      subject: "Il margine si aggiorna solo se entrano le ore",
      eyebrow: "Riprendi il controllo",
      title: "È passata una settimana dall’ultima attività.",
      paragraphs: [
        "Quando ore e spese restano aggiornate, Arch Time Pro può mostrarti subito dove una commessa sta assorbendo più del previsto.",
        "Riparti dal timer oppure inserisci il lavoro svolto manualmente.",
      ],
      ctaLabel: "Aggiorna le commesse",
    },
    trial_7d: {
      subject: `${remainingLabel} alla fine della prova`,
      eyebrow: "Prova gratuita",
      title: `Hai ancora ${remainingLabel} per valutarlo sul lavoro reale.`,
      paragraphs: [
        "Controlla almeno una commessa attiva e confronta il margine previsto con ore e spese già sostenute.",
        "Se Arch Time Pro ti è utile, puoi attivare la Tariffa Fondatori direttamente dal tuo profilo.",
      ],
      ctaLabel: "Apri Arch Time Pro",
    },
    trial_3d: {
      subject: `La prova termina tra ${remainingLabel}`,
      eyebrow: "Prova gratuita",
      title: `Mancano ${remainingLabel}.`,
      paragraphs: [
        "I dati restano nel tuo spazio, ma al termine della prova servirà la Tariffa Fondatori per continuare a lavorare.",
        "Il piano costa 19,90 € al mese per tutto lo studio, con collaboratori illimitati.",
      ],
      ctaLabel: "Controlla il tuo spazio",
    },
    trial_1d: {
      subject: "Ultimo giorno di prova gratuita",
      eyebrow: "Ultimo giorno",
      title: "La prova termina domani.",
      paragraphs: [
        "Attiva la Tariffa Fondatori per mantenere operativo lo spazio di lavoro senza interruzioni.",
        "Il piano è mensile e puoi gestirlo o annullarlo dal portale Stripe.",
      ],
      ctaLabel: "Attiva Arch Time Pro",
    },
    trial_expired: {
      subject: "La prova gratuita è terminata",
      eyebrow: "Prova conclusa",
      title: "Il tuo spazio ti aspetta.",
      paragraphs: [
        "Le tue commesse non sono state eliminate.",
        "Attiva la Tariffa Fondatori a 19,90 € al mese per tornare a registrare attività e controllare i margini.",
      ],
      ctaLabel: "Riattiva lo spazio",
    },
  };

  const copy = copies[eventKey];
  if (!copy) throw new Error(`Unsupported lifecycle event: ${eventKey}`);
  return copy;
}

function buildText(firstName: string, copy: EmailCopy, appUrl: string, unsubscribeUrl: string) {
  return [
    `Ciao ${firstName},`,
    "",
    copy.title,
    "",
    ...copy.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    `${copy.ctaLabel}: ${appUrl}`,
    "",
    "A presto,",
    "Arch Time Pro",
    "",
    `Non vuoi ricevere altri suggerimenti durante la prova? ${unsubscribeUrl}`,
  ].join("\n");
}

function buildHtml(firstName: string, copy: EmailCopy, appUrl: string, unsubscribeUrl: string) {
  const safeName = escapeHtml(firstName);
  const paragraphs = copy.paragraphs
    .map((paragraph) => `<p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.65;">${escapeHtml(paragraph)}</p>`)
    .join("");

  return `<!doctype html>
  <html lang="it">
    <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(copy.subject)}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:28px 12px;">
        <tr><td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <tr><td style="padding:24px 28px;border-bottom:1px solid #e2e8f0;font-size:18px;font-weight:800;">ARCH <span style="color:#4f46e5;">TIME</span> PRO</td></tr>
            <tr><td style="padding:30px 28px;">
              <p style="margin:0 0 10px;color:#4f46e5;font-size:12px;font-weight:800;text-transform:uppercase;">${escapeHtml(copy.eyebrow)}</p>
              <p style="margin:0 0 18px;color:#0f172a;font-size:24px;line-height:1.25;font-weight:800;">${escapeHtml(copy.title)}</p>
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.65;">Ciao ${safeName},</p>
              ${paragraphs}
              <p style="margin:24px 0 4px;"><a href="${escapeHtml(appUrl)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:13px 18px;border-radius:7px;font-size:14px;font-weight:800;">${escapeHtml(copy.ctaLabel)}</a></p>
            </td></tr>
            <tr><td style="padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.55;">
              Questa email riguarda la prova di Arch Time Pro.<br>
              <a href="${escapeHtml(unsubscribeUrl)}" style="color:#64748b;">Disattiva i suggerimenti durante la prova</a>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
  </html>`;
}

async function unsubscribe(req: Request) {
  const token = new URL(req.url).searchParams.get("unsubscribe") || "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    return new Response("Link non valido.", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const { data, error } = await supabase
    .from("profiles")
    .update({ lifecycle_emails_enabled: false })
    .eq("lifecycle_email_token", token)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return new Response("Link non valido o già disattivato.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  return new Response(`<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Preferenze email</title><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;display:grid;min-height:100vh;place-items:center;padding:20px;"><main style="max-width:520px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:32px;"><h1 style="margin-top:0;">Preferenza aggiornata</h1><p style="color:#475569;line-height:1.6;">Non riceverai altri suggerimenti automatici durante la prova di Arch Time Pro. Le email indispensabili per sicurezza e account resteranno attive.</p><a href="https://www.archtimepro.it/app.html" style="color:#4f46e5;font-weight:700;">Torna ad Arch Time Pro</a></main></body></html>`, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "GET") return unsubscribe(req);
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  if (req.headers.get("x-lifecycle-email-secret") !== requiredEnv("LIFECYCLE_EMAIL_CRON_SECRET")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const { data, error } = await supabase.rpc("claim_trial_lifecycle_emails", {
    max_rows: MAX_EMAILS_PER_RUN,
  });

  if (error) {
    console.error("Unable to claim lifecycle emails", error);
    return jsonResponse({ error: "Unable to claim lifecycle emails" }, 500);
  }

  const smtpPort = Number(Deno.env.get("SMTP_PORT") || "465");
  const transporter = nodemailer.createTransport({
    host: requiredEnv("SMTP_HOST"),
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: requiredEnv("SMTP_USER"), pass: requiredEnv("SMTP_PASS") },
  });
  const senderEmail = Deno.env.get("SMTP_FROM_EMAIL") || requiredEnv("SMTP_USER");
  const senderName = Deno.env.get("SMTP_FROM_NAME") || "Arch Time Pro";
  const appUrl = Deno.env.get("APP_URL") || "https://www.archtimepro.it/app.html";
  const functionUrl = `${requiredEnv("SUPABASE_URL")}/functions/v1/trial-lifecycle-email`;

  let sent = 0;
  let failed = 0;
  const events: Record<string, number> = {};

  for (const candidate of (data || []) as LifecycleCandidate[]) {
    const email = String(candidate.recipient_email || "").trim().toLowerCase();
    const firstName = String(candidate.recipient_name || "").trim().split(/\s+/)[0] || "collega";
    const unsubscribeUrl = `${functionUrl}?unsubscribe=${encodeURIComponent(candidate.unsubscribe_token)}`;

    if (!isValidEmail(email)) {
      failed += 1;
      await supabase.from("lifecycle_email_log").delete().eq("id", candidate.log_id).eq("status", "claimed");
      continue;
    }

    try {
      const copy = emailCopy(candidate.event_key, candidate.days_left);
      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        replyTo: senderEmail,
        to: email,
        subject: copy.subject,
        text: buildText(firstName, copy, appUrl, unsubscribeUrl),
        html: buildHtml(firstName, copy, appUrl, unsubscribeUrl),
      });

      const { error: updateError } = await supabase
        .from("lifecycle_email_log")
        .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
        .eq("id", candidate.log_id)
        .eq("status", "claimed");
      if (updateError) throw updateError;

      sent += 1;
      events[candidate.event_key] = (events[candidate.event_key] || 0) + 1;
    } catch (sendError) {
      failed += 1;
      console.error(`Unable to send ${candidate.event_key} to studio ${candidate.studio_id}`, sendError);
      await supabase.from("lifecycle_email_log").delete().eq("id", candidate.log_id).eq("status", "claimed");
    }
  }

  return jsonResponse({
    ok: true,
    claimed: data?.length || 0,
    sent,
    failed,
    events,
  });
});
