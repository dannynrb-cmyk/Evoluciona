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
    if (!mensaje?.text || !mensaje?.chat?.id) {
      return Response.json({ ok: true }); // nada que hacer (ej. un "sticker" o similar)
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

    await fetch(`${SUPABASE_URL}/rest/v1/personal?id=eq.${persona.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ telegram_chat_id: String(chatId), telegram_link_code: null, telegram_link_expira: null }),
    });

    await enviarMensaje(chatId, `¡Listo, ${persona.nombre}! Quedaste vinculado a Evoluciona. Te voy a escribir aquí cuando tengas un turno programado para el día siguiente.`);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook: error ->", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
