import { verificarAcceso } from "../../../lib/acceso";
// Cuando se publica un aviso en el tablero de Evoluciona, esta ruta lo reenvía
// al grupo de Telegram del servicio (o, si el aviso es para toda la
// institución, a los grupos de todos sus servicios). Si algo falla aquí no
// pasa nada grave: el aviso ya quedó guardado en la plataforma.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zvyuqbrvixpnggynrqfa.supabase.co";

export async function POST(request) {
  try {
    const { avisoId } = await request.json();
    if (!avisoId || !/^[0-9a-f-]{36}$/i.test(avisoId)) {
      return Response.json({ ok: false, error: "Falta el aviso." }, { status: 400 });
    }

    const acceso = await verificarAcceso(request, { requiereMaestro: true });
    if (!acceso.ok) return Response.json({ ok: false, error: acceso.error }, { status: acceso.status });

    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!TELEGRAM_TOKEN || !SERVICE_KEY) {
      return Response.json({ ok: false, error: "Faltan llaves en el servidor." }, { status: 500 });
    }
    const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

    const avisoRes = await fetch(`${SUPABASE_URL}/rest/v1/avisos_tablero?id=eq.${avisoId}&select=*`, { headers });
    const aviso = (avisoRes.ok ? await avisoRes.json() : [])[0];
    if (!aviso) return Response.json({ ok: false, error: "No se encontró el aviso." }, { status: 404 });

    // ¿A qué servicios va? Uno solo, o todos los activos de la institución.
    const filtroServicios = aviso.servicio_id
      ? `id=eq.${aviso.servicio_id}`
      : `institucion_id=eq.${aviso.institucion_id}&activo=is.true`;
    const servRes = await fetch(`${SUPABASE_URL}/rest/v1/servicios?${filtroServicios}&select=id,nombre,institucion_id,instituciones(nombre)`, { headers });
    const servicios = servRes.ok ? await servRes.json() : [];
    if (servicios.length === 0) return Response.json({ ok: true, enviado: false, motivo: "Sin servicios de destino." });

    // Quien lo envía debe ser Maestro de ese servicio (o de algún servicio de la institución).
    if (!acceso.esSuperadmin) {
      const susMaestrias = new Set(acceso.miembros.filter((m) => m.rol === "maestro").map((m) => m.servicio_id));
      let autorizado = false;
      if (aviso.servicio_id) {
        autorizado = susMaestrias.has(aviso.servicio_id);
      } else {
        const todos = await fetch(`${SUPABASE_URL}/rest/v1/servicios?institucion_id=eq.${aviso.institucion_id}&select=id`, { headers });
        autorizado = (todos.ok ? await todos.json() : []).some((s) => susMaestrias.has(s.id));
      }
      if (!autorizado) return Response.json({ ok: false, error: "No eres Maestro de ese servicio." }, { status: 403 });
    }

    const ids = servicios.map((s) => s.id).join(",");
    const gruposRes = await fetch(`${SUPABASE_URL}/rest/v1/servicio_telegram?servicio_id=in.(${ids})&chat_id=not.is.null&select=servicio_id,chat_id`, { headers });
    const grupos = gruposRes.ok ? await gruposRes.json() : [];
    // Un mismo grupo puede estar vinculado a varios servicios: se envía una sola vez.
    const chats = [...new Set(grupos.map((g) => g.chat_id))];
    if (chats.length === 0) {
      return Response.json({ ok: true, enviado: false, motivo: "Ningún servicio de destino tiene grupo de Telegram vinculado." });
    }

    const emoji = aviso.nivel === "importante" ? "🔴" : "📢";
    const destino = aviso.servicio_id
      ? servicios[0]?.nombre
      : `toda ${servicios[0]?.instituciones?.nombre || "la institución"}`;
    const texto = `${emoji} Nuevo aviso en Evoluciona — ${destino}\n\n${aviso.titulo}\n${aviso.mensaje}${aviso.autor ? `\n\n— ${aviso.autor}` : ""}`;

    let enviados = 0;
    for (const chatId of chats) {
      try {
        const sendRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: texto }),
        });
        if (sendRes.ok) enviados++;
      } catch (err) {
        console.error("Telegram avisar grupo: fallo enviando a un grupo ->", err.message);
      }
    }
    return Response.json({ ok: true, enviado: enviados > 0, grupos: enviados });
  } catch (err) {
    console.error("Telegram avisar grupo: error ->", err);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
