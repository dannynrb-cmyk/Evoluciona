import { verificarAcceso } from "../../../lib/acceso";
// Cuando se publica un nuevo aviso en el tablero de Evoluciona, esta ruta lo
// reenvía también al grupo de Telegram vinculado (si hay uno confirmado).
// Si algo falla aquí, no pasa nada grave: el aviso ya quedó guardado en la
// plataforma de todas formas, esto es solo un aviso adicional por Telegram.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zvyuqbrvixpnggynrqfa.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || "sb_publishable_G53F0OOT0-BzQlnXmen2XA_uZ1Yn9A9";

export async function POST(request) {
  try {
    const { titulo, mensaje, nivel, autor } = await request.json();

    // Solo un Maestro aprobado y activo puede reenviar avisos al grupo del equipo.
    const acceso = await verificarAcceso(request, { requiereMaestro: true });
    if (!acceso.ok) return Response.json({ ok: false, error: acceso.error }, { status: acceso.status });

    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!TELEGRAM_TOKEN || !SERVICE_KEY) {
      return Response.json({ ok: false, error: "Faltan llaves en el servidor." }, { status: 500 });
    }

    const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/configuracion_notificaciones?select=*&limit=1`, { headers });
    const filas = res.ok ? await res.json() : [];
    const fila = filas[0];

    if (!fila?.telegram_grupo_confirmado || !fila?.telegram_grupo_chat_id) {
      return Response.json({ ok: true, enviado: false, motivo: "No hay un grupo de Telegram vinculado y confirmado todavía." });
    }

    const emoji = nivel === "importante" ? "🔴" : "📢";
    const texto = `${emoji} Nuevo aviso en Evoluciona\n\n${titulo}\n${mensaje}${autor ? `\n\n— ${autor}` : ""}`;

    const sendRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: fila.telegram_grupo_chat_id, text: texto }),
    });

    return Response.json({ ok: true, enviado: sendRes.ok });
  } catch (err) {
    console.error("Telegram avisar grupo: error ->", err);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
