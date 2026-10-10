// Estado de una licencia de institución. Debe dar lo mismo que la función
// estado_licencia() de la base de datos (etapa 3):
//   activa       → normal
//   por_vencer   → faltan 30 días o menos (aviso solo a Maestros)
//   solo_lectura → venció hace 15 días o menos (se ve, no se edita)
//   bloqueada    → venció hace más de 15 días (no se entra; los datos se conservan)
export const DIAS_AVISO = 30;
export const DIAS_SOLO_LECTURA = 15;

// Fecha de hoy en Colombia como "AAAA-MM-DD".
export function hoyColombiaISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function diasEntre(desdeISO, hastaISO) {
  return Math.round((new Date(`${hastaISO}T00:00:00Z`) - new Date(`${desdeISO}T00:00:00Z`)) / 86400000);
}

export function estadoLicencia(licencia, hoyISO = hoyColombiaISO()) {
  if (!licencia || !licencia.vence) return "activa";
  const faltan = diasEntre(hoyISO, licencia.vence); // negativo = ya venció
  if (faltan < -DIAS_SOLO_LECTURA) return "bloqueada";
  if (faltan < 0) return "solo_lectura";
  if (faltan <= DIAS_AVISO) return "por_vencer";
  return "activa";
}

export function diasParaVencer(licencia, hoyISO = hoyColombiaISO()) {
  if (!licencia || !licencia.vence) return null;
  return diasEntre(hoyISO, licencia.vence);
}

// Fecha en que se bloquea el acceso (vencimiento + días de solo lectura).
export function fechaBloqueoISO(licencia) {
  if (!licencia || !licencia.vence) return null;
  const d = new Date(`${licencia.vence}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + DIAS_SOLO_LECTURA + 1);
  return d.toISOString().slice(0, 10);
}
