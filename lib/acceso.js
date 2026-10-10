// Verificación de acceso para las rutas del servidor (app/api/*).
// Antes, las rutas solo revisaban que hubiera una sesión válida — o sea, que
// cualquier persona que se registrara podía usar a Evo o mandar avisos al
// grupo de Telegram. Ahora además se revisa, en la tabla "usuarios", que la
// cuenta esté aprobada y activa (y, si se pide, que sea Maestro).

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zvyuqbrvixpnggynrqfa.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || "sb_publishable_G53F0OOT0-BzQlnXmen2XA_uZ1Yn9A9";

export async function verificarAcceso(request, { requiereMaestro = false } = {}) {
  const authHeader = request.headers.get("authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) return { ok: false, status: 401, error: "Debes iniciar sesión." };

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) return { ok: false, status: 401, error: "Tu sesión expiró o no es válida. Cierra sesión y vuelve a entrar." };
  const user = await userRes.json().catch(() => null);
  if (!user?.id) return { ok: false, status: 401, error: "Sesión inválida." };

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) return { ok: false, status: 500, error: "Faltan llaves en el servidor." };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?id=eq.${user.id}&select=*&limit=1`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  const filas = res.ok ? await res.json() : [];
  const usuario = filas[0];
  if (!usuario) return { ok: false, status: 403, error: "Tu cuenta no está registrada en Evoluciona." };
  if (usuario.activo === false) return { ok: false, status: 403, error: "Tu cuenta fue desactivada." };
  // "aprobado" puede no existir si aún no se corrió el SQL de la etapa 1: en ese caso no se bloquea.
  if (usuario.aprobado === false) return { ok: false, status: 403, error: "Tu cuenta está pendiente de aprobación." };
  if (requiereMaestro && usuario.rol !== "maestro") return { ok: false, status: 403, error: "Solo un Maestro puede hacer esto." };

  return { ok: true, usuario };
}
