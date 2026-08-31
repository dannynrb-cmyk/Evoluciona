// Ruta de servidor (nunca se ejecuta en el navegador) para el asistente "Evo".
// Aquí es seguro usar la llave de servicio de Supabase y la llave de Gemini,
// porque este archivo nunca se envía al cliente — solo vive en Vercel.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zvyuqbrvixpnggynrqfa.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;

export async function POST(request) {
  try {
    const { pregunta, servicioId, historial } = await request.json();
    if (!pregunta || typeof pregunta !== "string") {
      return Response.json({ error: "Falta la pregunta." }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return Response.json({ error: "Debes iniciar sesión para usar a Evo." }, { status: 401 });
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!GEMINI_KEY || !SERVICE_KEY) {
      return Response.json({ error: "Evo todavía no está configurado en el servidor (faltan llaves)." }, { status: 500 });
    }

    // Verifica que el token realmente pertenezca a una sesión válida de Evoluciona
    // (evita que cualquiera fuera de la app use la cuota gratuita de Evo).
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) {
      return Response.json({ error: "Tu sesión no es válida. Vuelve a iniciar sesión." }, { status: 401 });
    }

    // Trae el contenido de Evoluciona con la llave de servicio (sin restricción de
    // RLS, porque ya confirmamos arriba que quien pregunta es un usuario real).
    const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
    const bibUrl = servicioId
      ? `${SUPABASE_URL}/rest/v1/biblioteca_actividades?select=*&servicio_id=eq.${servicioId}`
      : `${SUPABASE_URL}/rest/v1/biblioteca_actividades?select=*`;
    const temaUrl = servicioId
      ? `${SUPABASE_URL}/rest/v1/temas_biblioteca?select=*&servicio_id=eq.${servicioId}`
      : `${SUPABASE_URL}/rest/v1/temas_biblioteca?select=*`;

    const [bibRes, temaRes, formRes] = await Promise.all([
      fetch(bibUrl, { headers }),
      fetch(temaUrl, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/formacion_continua?select=*`, { headers }),
    ]);
    const biblioteca = bibRes.ok ? await bibRes.json() : [];
    const temas = temaRes.ok ? await temaRes.json() : [];
    const formacion = formRes.ok ? await formRes.json() : [];

    const temaPorId = Object.fromEntries((temas || []).map((t) => [t.id, t.nombre]));

    let contexto = "";
    if ((biblioteca || []).length > 0) {
      contexto += "=== BIBLIOTECA DE ACTIVIDADES ===\n";
      biblioteca.forEach((b) => {
        contexto += `\n· Actividad: "${b.nombre}"${b.tema_id ? ` (Tema: ${temaPorId[b.tema_id] || "sin nombre"})` : ""}\n  Tipo: ${b.tipo}\n  Metodología: ${b.metodologia || "—"}\n  Objetivos: ${b.objetivos || "—"}\n`;
      });
    }
    if ((formacion || []).length > 0) {
      contexto += "\n\n=== FORMACIÓN CONTINUA (infografías, videos, artículos/PDF) ===\n";
      formacion.forEach((f) => {
        contexto += `\n· "${f.titulo}" (${f.tipo})\n  Descripción: ${f.descripcion || "—"}\n`;
      });
    }
    if (!contexto) {
      contexto = "(Todavía no hay contenido cargado en la Biblioteca de actividades ni en Formación Continua.)";
    }

    const systemInstruction = `Eres "Evo", el asistente de formación y apoyo terapéutico dentro de Evoluciona, una plataforma de planificación de actividades y turnos para un equipo de salud/terapéutico.

Reglas estrictas que debes seguir siempre:
1. Responde ÚNICAMENTE usando el contenido de Evoluciona que aparece abajo. No uses conocimiento general externo aunque lo sepas, y no inventes nada.
2. Si la respuesta no está en ese contenido, dilo explícitamente y con naturalidad: por ejemplo "No tengo esa información dentro de Evoluciona todavía." No intentes adivinar ni completar con suposiciones.
3. Sé breve, claro y práctico — quien te consulta suele estar trabajando en ese momento.
4. Cuando tu respuesta se base en una actividad o contenido específico, menciona su nombre exacto (tal como aparece abajo) para que la persona pueda encontrarlo en la plataforma.
5. Escribe en español, con un tono cercano y profesional.

Contenido disponible actualmente en Evoluciona:
${contexto}`;

    const contents = [
      ...(Array.isArray(historial) ? historial : []).slice(-10).map((m) => ({
        role: m.role === "evo" ? "model" : "user",
        parts: [{ text: String(m.text || "").slice(0, 4000) }],
      })),
      { role: "user", parts: [{ text: pregunta.slice(0, 4000) }] },
    ];

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
        }),
      }
    );
    const geminiData = await geminiRes.json();
    if (!geminiRes.ok) {
      const msg = geminiData?.error?.message || `Error ${geminiRes.status} al consultar la IA.`;
      return Response.json({ error: msg }, { status: 502 });
    }
    const respuesta = geminiData.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim()
      || "No pude generar una respuesta en este momento.";

    return Response.json({ respuesta });
  } catch (err) {
    return Response.json({ error: err.message || "Error inesperado en Evo." }, { status: 500 });
  }
}
