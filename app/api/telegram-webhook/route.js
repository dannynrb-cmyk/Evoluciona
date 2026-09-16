// Recibe cada mensaje enviado al bot de Telegram. Cuando alguien toca el
// enlace de vinculación desde Evoluciona, Telegram le manda al bot
// "/start CODIGO" automáticamente — aquí lo emparejamos con la persona
// correspondiente en "personal" y guardamos su chat_id para poder
// escribirle después con los recordatorios de turno.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zvyuqbrvixpnggynrqfa.supabase.co";
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function enviarMensaje(chatId, texto) {
  if (!TELEGRAM_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: texto }),
    });
  } catch (_) { /* si falla el envío de la confirmación, no hay más que hacer aquí */ }
}

export async function POST(request) {
  try {
    // Verifica que el mensaje realmente venga de Telegram y no de cualquiera
    // que descubra la URL (Telegram manda este encabezado si se configuró
    // un "secret_token" al registrar el webhook).
    const secretoEsperado = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secretoEsperado) {
      const secretoRecibido = request.headers.get("x-telegram-bot-api-secret-token");
      if (secretoRecibido !== secretoEsperado) {
        return Response.json({ ok: false }, { status: 401 });
      }
    }

    const update = await request.json();
    const mensaje = update?.message;
    if (!mensaje?.chat?.id) {
      return Response.json({ ok: true }); // nada que hacer (ej. un "sticker" o similar)
    }

    // Si el mensaje viene de un grupo (no de un chat privado), se registra
    // como "grupo detectado" para poder vincularlo desde Configuración —
    // sin importar qué haya escrito, cualquier mensaje sirve para detectarlo.
    if (mensaje.chat.type === "group" || mensaje.chat.type === "supergroup") {
      const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" };
      try {
        const filaRes = await fetch(`${SUPABASE_URL}/rest/v1/configuracion_notificaciones?select=id,telegram_grupo_chat_id,telegram_grupo_confirmado&limit=1`, { headers });
        const filas = filaRes.ok ? await filaRes.json() : [];
        if (filas[0]) {
          await fetch(`${SUPABASE_URL}/rest/v1/configuracion_notificaciones?id=eq.${filas[0].id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({
              telegram_grupo_chat_id: String(mensaje.chat.id),
              telegram_grupo_nombre: mensaje.chat.title || "Grupo sin nombre",
              telegram_grupo_detectado_en: new Date().toISOString(),
              // Si el chat_id cambia (ej. se probó con otro grupo), se pierde la confirmación anterior.
              telegram_grupo_confirmado: filas[0].telegram_grupo_chat_id === String(mensaje.chat.id) ? filas[0].telegram_grupo_confirmado : false,
            }),
          });
        }
      } catch (err) {
        console.error("Telegram webhook: fallo detectando grupo ->", err);
      }
      return Response.json({ ok: true });
    }

    if (!mensaje?.text) {
      return Response.json({ ok: true });
    }

    const chatId = mensaje.chat.id;
    const texto = mensaje.text.trim();

    if (!texto.startsWith("/start")) {
      await enviarMensaje(chatId, "Hola, soy el bot de recordatorios de Evoluciona. Para vincularte, usa el botón de \"Vincular Telegram\" desde la sección de Personal en la plataforma.");
      return Response.json({ ok: true });
    }

    const codigo = texto.replace("/start", "").trim().toUpperCase();
    if (!codigo) {
      await enviarMensaje(chatId, "Para vincularte, usa el botón de \"Vincular Telegram\" desde Evoluciona — te va a llevar directo aquí con el código correcto.");
      return Response.json({ ok: true });
    }

    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

    const buscarRes = await fetch(
      `${SUPABASE_URL}/rest/v1/personal?telegram_link_code=eq.${encodeURIComponent(codigo)}&select=id,nombre,telegram_link_expira`,
      { headers }
    );
    const candidatos = buscarRes.ok ? await buscarRes.json() : [];
    const persona = candidatos[0];

    if (!persona || (persona.telegram_link_expira && new Date(persona.telegram_link_expira) < new Date())) {
      await enviarMensaje(chatId, "Ese código no es válido o ya venció. Pide uno nuevo desde Evoluciona (Personal → Vincular Telegram) e inténtalo de nuevo.");
      return Response.json({ ok: true });
    }

    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/personal?id=eq.${persona.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ telegram_chat_id: String(chatId), telegram_link_code: null, telegram_link_expira: null }),
    });

    if (!patchRes.ok) {
      const detalle = await patchRes.text().catch(() => "");
      console.error("Telegram webhook: fallo guardando vínculo ->", patchRes.status, detalle);
      await enviarMensaje(chatId, "Hubo un problema técnico guardando tu vinculación. Pide un código nuevo desde Evoluciona (Personal → Vincular Telegram) e inténtalo de nuevo. Si sigue fallando, avísale al administrador.");
      return Response.json({ ok: false, error: detalle }, { status: 500 });
    }

    await enviarMensaje(chatId, `¡Listo, ${persona.nombre}! Quedaste vinculado a Evoluciona. Te voy a escribir aquí cuando tengas un turno programado para el día siguiente.`);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook: error ->", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
