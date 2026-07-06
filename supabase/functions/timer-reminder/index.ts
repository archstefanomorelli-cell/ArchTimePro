import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
const MAX_PROFILES_PER_RUN = 500;

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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

  if (req.headers.get("x-timer-reminder-secret") !== requiredEnv("TIMER_REMINDER_CRON_SECRET")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );

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
  const appUrl = Deno.env.get("APP_URL") || "https://www.archtimepro.it/app.html";
  const threshold = Date.now() - EIGHT_HOURS_MS;

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email, active_timer_start")
    .not("active_timer_start", "is", null)
    .is("active_timer_reminder_sent_at", null)
    .limit(MAX_PROFILES_PER_RUN);

  if (profilesError) {
    console.error("Unable to load active timers", profilesError);
    return jsonResponse({ error: "Unable to load active timers" }, 500);
  }

  let sent = 0;
  let failed = 0;
  const candidates = (profiles || []).filter((profile) => {
    const startedAt = Number(profile.active_timer_start);
    return Number.isFinite(startedAt) && startedAt > 0 && startedAt <= threshold;
  });

  for (const profile of candidates) {
    const recipientEmail = String(profile.email || "").trim().toLowerCase();
    if (!isValidEmail(recipientEmail)) {
      console.warn(`Invalid email for profile ${profile.id}`);
      failed += 1;
      continue;
    }

    const claimedAt = new Date().toISOString();
    const { data: claimed, error: claimError } = await supabase
      .from("profiles")
      .update({ active_timer_reminder_sent_at: claimedAt })
      .eq("id", profile.id)
      .eq("active_timer_start", profile.active_timer_start)
      .is("active_timer_reminder_sent_at", null)
      .select("id")
      .maybeSingle();

    if (claimError || !claimed) {
      if (claimError) console.error(`Unable to claim profile ${profile.id}`, claimError);
      continue;
    }

    const firstName = String(profile.full_name || "").trim().split(/\s+/)[0] || "ciao";
    const safeFirstName = escapeHtml(firstName);

    try {
      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: recipientEmail,
        subject: "Il timer è ancora attivo?",
        text: [
          `Ciao ${firstName},`,
          ``,
          `il tuo timer su Arch Time Pro è attivo da più di 8 ore.`,
          ``,
          `Giornata intensa oppure hai dimenticato di fermarlo?`,
          `Accedi ad Arch Time Pro per controllare e, se necessario, correggere l'attività registrata.`,
          ``,
          appUrl,
          ``,
          `A presto,`,
          `Arch Time Pro`,
        ].join("\n"),
        html: `
          <p>Ciao ${safeFirstName},</p>
          <p>il tuo timer su <strong>Arch Time Pro</strong> è attivo da più di 8 ore.</p>
          <p>Giornata intensa oppure hai dimenticato di fermarlo?</p>
          <p>Accedi ad Arch Time Pro per controllare e, se necessario, correggere l'attività registrata.</p>
          <p><a href="${appUrl}">Controlla il timer</a></p>
          <p>A presto,<br>Arch Time Pro</p>
        `,
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(`Unable to send reminder to profile ${profile.id}`, error);
      await supabase
        .from("profiles")
        .update({ active_timer_reminder_sent_at: null })
        .eq("id", profile.id)
        .eq("active_timer_reminder_sent_at", claimedAt);
    }
  }

  return jsonResponse({
    ok: true,
    checked: profiles?.length || 0,
    eligible: candidates.length,
    sent,
    failed,
  });
});
