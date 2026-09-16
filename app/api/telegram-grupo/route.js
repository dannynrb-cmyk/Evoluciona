// Consulta y confirma el grupo de Telegram vinculado al tablero de avisos.
// GET  -> devuelve el estado actual (vinculado o solo detectado, pendiente).
// POST -> el Maestro confirma que el grupo detectado es el correcto.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zvyuqbrvixpnggynrqfa.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || "sb_publishable_G53F0OOT0-BzQlnXmen2XA_uZ1Yn9A9";

async function verificarSesion(request) {
  const authHeader = request.headers.get("authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) return { ok: false, status: 401, error: "Debes iniciar sesión." };
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) return { ok: false, status: 401, error: "Tu sesión expiró o no es válida." };
  return { ok: true };
}

function headersServicio() {
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
}

export async function GET(request) {
  const sesion = await verificarSesion(request);
  if (!sesion.ok) return Response.json({ error: sesion.error }, { status: sesion.status });

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/configuracion_notificaciones?select=*&limit=1`, { headers: headersServicio() });
    const filas = res.ok ? await res.json() : [];
    return Response.json({ configuracion: filas[0] || null });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const sesion = await verificarSesion(request);
  if (!sesion.ok) return Response.json({ error: sesion.error }, { status: sesion.status });

  try {
    const headers = headersServicio();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/configuracion_notificaciones?select=*&limit=1`, { headers });
    const filas = res.ok ? await res.json() : [];
    const fila = filas[0];
    if (!fila?.telegram_grupo_chat_id) {
      return Response.json({ error: "Todavía no se ha detectado ningún grupo. Envía un mensaje en el grupo primero." }, { status: 400 });
    }

    await fetch(`${SUPABASE_URL}/rest/v1/configuracion_notificaciones?id=eq.${fila.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ telegram_grupo_confirmado: true }),
    });

    // Avisa en el propio grupo que quedó vinculado.
    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (TELEGRAM_TOKEN) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: fila.telegram_grupo_chat_id, text: "✅ Este grupo quedó vinculado al tablero de avisos de Evoluciona. Aquí llegará cada aviso nuevo que se publique." }),
      });
    }

    return Response.json({ ok: true, nombre: fila.telegram_grupo_nombre });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
