// Vercel la llama automáticamente una vez al día (ver vercel.json). Revisa
// los turnos de "mañana" en TODOS los servicios, y le escribe por Telegram
// a cada persona que ya vinculó su cuenta.

export const maxDuration = 30;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zvyuqbrvixpnggynrqfa.supabase.co";

function fmtHora(h) {
  const hh = Math.floor(((h % 24) + 24) % 24);
  const mm = Math.round((h % 1) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function mananaISO() {
  // Colombia no tiene horario de verano: siempre UTC-5. Se calcula la fecha
  // de "mañana" en hora de Colombia, sin depender de la zona horaria del
  // servidor donde corre la función.
  const ahoraUTC = new Date();
  const colombiaAhora = new Date(ahoraUTC.getTime() - 5 * 60 * 60 * 1000);
  const manana = new Date(Date.UTC(colombiaAhora.getUTCFullYear(), colombiaAhora.getUTCMonth(), colombiaAhora.getUTCDate() + 1));
  return manana.toISOString().slice(0, 10);
}

async function enviarMensaje(token, chatId, texto) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: texto }),
  });
  return res.ok;
}

export async function GET(request) {
  // Si Vercel manda su propio secreto de cron, lo verificamos (evita que
  // cualquiera con la URL dispare recordatorios a destiempo).
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }
  }

  const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!TELEGRAM_TOKEN || !SERVICE_KEY) {
    return Response.json({ ok: false, error: "Faltan llaves en el servidor (TELEGRAM_BOT_TOKEN / SUPABASE_SERVICE_ROLE_KEY)." }, { status: 500 });
  }

  try {
    const fecha = mananaISO();
    const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

    const turnosRes = await fetch(
      `${SUPABASE_URL}/rest/v1/turnos?select=*&fecha=eq.${fecha}&personal_id=not.is.null`,
      { headers }
    );
    const turnos = turnosRes.ok ? await turnosRes.json() : [];
    if (turnos.length === 0) {
      return Response.json({ ok: true, fecha, enviados: 0, mensaje: "No hay turnos asignados para mañana." });
    }

    const idsPersonal = [...new Set(turnos.map((t) => t.personal_id))];
    const personalRes = await fetch(
      `${SUPABASE_URL}/rest/v1/personal?select=id,nombre,telegram_chat_id&id=in.(${idsPersonal.join(",")})`,
      { headers }
    );
    const personal = personalRes.ok ? await personalRes.json() : [];
    const personaPorId = Object.fromEntries(personal.map((p) => [p.id, p]));

    const fechaLegible = new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

    let enviados = 0;
    let sinVincular = 0;
    for (const personaId of idsPersonal) {
      const persona = personaPorId[personaId];
      if (!persona) continue;
      const susTurnos = turnos.filter((t) => t.personal_id === personaId);
      if (!persona.telegram_chat_id) { sinVincular++; continue; }

      const detalle = susTurnos
        .map((t) => `• ${t.tipo_turno === "noche" ? "Turno Noche" : "Turno Día"}: ${fmtHora(t.hora_inicio)} — ${fmtHora(t.hora_fin)}${t.hora_fin > 24 ? " (+1 día)" : ""}`)
        .join("\n");

      const texto = `🔔 Recordatorio Evoluciona\n\nHola ${persona.nombre}, mañana (${fechaLegible}) tienes:\n${detalle}\n\n¡Que tengas un buen turno!`;
      const ok = await enviarMensaje(TELEGRAM_TOKEN, persona.telegram_chat_id, texto);
      if (ok) enviados++;
    }

    return Response.json({ ok: true, fecha, personasConTurno: idsPersonal.length, enviados, sinVincular });
  } catch (err) {
    console.error("Recordatorios de turno: error ->", err);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
