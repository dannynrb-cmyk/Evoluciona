// Verificación de acceso para las rutas del servidor (app/api/*).
// Las rutas usan la llave de servicio (que se salta las reglas de la base de
// datos), así que aquí se revisa a mano lo mismo que revisa la base de datos:
// cuenta aprobada y activa, y —según la ruta— que sea Maestro o que pertenezca
// al servicio que pide.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zvyuqbrvixpnggynrqfa.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || "sb_publishable_G53F0OOT0-BzQlnXmen2XA_uZ1Yn9A9";

export async function verificarAcceso(request, { requiereMaestro = false, servicioId = null } = {}) {
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
  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

  const [resUsuario, resMiembros] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/usuarios?id=eq.${user.id}&select=*&limit=1`, { headers }),
    fetch(`${SUPABASE_URL}/rest/v1/miembros?usuario_id=eq.${user.id}&select=servicio_id,rol`, { headers }),
  ]);
  const usuario = (resUsuario.ok ? await resUsuario.json() : [])[0];
  // Si la tabla "miembros" aún no existe (SQL de la etapa 2 sin correr), se usa el rol global.
  const miembrosTablaExiste = resMiembros.ok;
  const miembros = miembrosTablaExiste ? await resMiembros.json() : [];

  if (!usuario) return { ok: false, status: 403, error: "Tu cuenta no está registrada en Evoluciona." };
  if (usuario.activo === false) return { ok: false, status: 403, error: "Tu cuenta fue desactivada." };
  if (usuario.aprobado === false) return { ok: false, status: 403, error: "Tu cuenta está pendiente de aprobación." };

  const esSuperadmin = usuario.es_superadmin === true;
  const esMaestroEnAlguno = esSuperadmin || (miembrosTablaExiste ? miembros.some((m) => m.rol === "maestro") : usuario.rol === "maestro");
  if (requiereMaestro && !esMaestroEnAlguno) return { ok: false, status: 403, error: "Solo un Maestro puede hacer esto." };

  if (servicioId && miembrosTablaExiste && !esSuperadmin && !miembros.some((m) => m.servicio_id === servicioId)) {
    return { ok: false, status: 403, error: "No perteneces a este servicio." };
  }

  return { ok: true, usuario, miembros, esSuperadmin };
}
