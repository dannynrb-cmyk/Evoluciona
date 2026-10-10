"use client";
"use client";
import React, { useMemo, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Clock,
  FileBarChart,
  Settings,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  Trash2,
  Pencil,
  Sparkles,
  ArrowRight,
  BookOpen,
  Lock,
  Shield,
  UserX,
  Sun,
  Moon,
  Copy,
  Megaphone,
  GraduationCap,
  Building2,
  ChevronDown,
  Search,
  FileText,
  Bot,
  HeartPulse,
  ClipboardList,
  Users2,
  List,
  LayoutGrid,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { estadoLicencia, diasParaVencer, fechaBloqueoISO } from "../lib/licencia";

/* ============================== LOGO ============================== */
// "Cometa": un destello que deja una estela en espiral — progreso + continuidad.
function LogoMark({ size = 16 }) {
  return (
    <img
      src="/icons/logo-mark.png"
      alt="Evoluciona"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain", display: "block" }}
    />
  );
}

/* ============================== TOKENS ============================== */
const T = {
  ink: "var(--ev-ink)",
  base: "var(--ev-base)",
  surface: "var(--ev-surface)",
  primary: "var(--ev-primary)",
  primaryDark: "var(--ev-primary-dark)",
  primarySoft: "var(--ev-primary-soft)",
  accent: "var(--ev-accent)",
  accentSoft: "var(--ev-accent-soft)",
  accentInk: "var(--ev-accent-ink)",
  border: "var(--ev-border)",
  muted: "var(--ev-muted)",
  danger: "var(--ev-danger)",
  dangerSoft: "var(--ev-danger-soft)",
  shadow: "var(--ev-shadow)",
};

// Estilo de tema claro (por defecto) y oscuro. Se inyectan como variables CSS
// para que toda la app (que ya usa T.xxx en línea) cambie de tema sin tocar
// cada pantalla — solo cambia el valor detrás de la variable.
const THEME_CSS = `
  .ev-root {
    --ev-ink: #0F172A; --ev-base: #F8FAFC; --ev-surface: #FFFFFF;
    --ev-primary: #2563EB; --ev-primary-dark: #1D4ED8; --ev-primary-soft: #EFF6FF;
    --ev-accent: #3B82F6; --ev-accent-soft: #EFF6FF; --ev-accent-ink: #1D4ED8;
    --ev-border: #E2E8F0; --ev-muted: #64748B;
    --ev-danger: #EF4444; --ev-danger-soft: #FEF2F2;
    --ev-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.06);
  }
  .ev-root[data-theme="dark"] {
    --ev-ink: #E2E8F0; --ev-base: #0B1220; --ev-surface: #131C2E;
    --ev-primary: #3B82F6; --ev-primary-dark: #60A5FA; --ev-primary-soft: #1E293B;
    --ev-accent: #60A5FA; --ev-accent-soft: #1E293B; --ev-accent-ink: #93C5FD;
    --ev-border: #253248; --ev-muted: #8DA0BC;
    --ev-danger: #F87171; --ev-danger-soft: #3A1E1E;
    --ev-shadow: 0 1px 2px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.4);
  }
`;
// El tema elegido (claro/oscuro) se guarda en el dispositivo. Si la persona
// nunca lo ha cambiado, se usa el del sistema (celular o computador).
const TEMA_LOCAL_KEY = "evoluciona_tema";
function useTheme() {
  const [theme, setThemeState] = useState("light");
  React.useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(TEMA_LOCAL_KEY);
      if (guardado === "light" || guardado === "dark") { setThemeState(guardado); return; }
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) setThemeState("dark");
    } catch (_) {}
  }, []);
  function setTheme(valor) {
    setThemeState((actual) => {
      const nuevo = typeof valor === "function" ? valor(actual) : valor;
      try { window.localStorage.setItem(TEMA_LOCAL_KEY, nuevo); } catch (_) {}
      return nuevo;
    });
  }
  return [theme, setTheme];
}
function ThemeToggle({ theme, setTheme, compact }) {
  return (
    <button
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      aria-label="Cambiar tema"
      className="ev-btn p-2 rounded-lg"
      style={{ border: `1px solid ${T.border}`, color: T.muted }}
    >
      {theme === "dark" ? <Sun size={compact ? 14 : 16} /> : <Moon size={compact ? 14 : 16} />}
    </button>
  );
}

function ServicioSelector({ ctx }) {
  const { servicios, instituciones, servicioActualId, cambiarServicio, servicioSelectorAbierto, setServicioSelectorAbierto, esSuperadmin, setView } = ctx;
  const actual = servicios.find((s) => s.id === servicioActualId);
  const disponibles = servicios.filter((s) => s.activo);
  if (disponibles.length === 0) return null;
  const variasInstituciones = instituciones.length > 1;
  const institucionDe = (sv) => instituciones.find((i) => i.id === sv.institucionId);
  const soloUno = disponibles.length === 1 && !esSuperadmin;
  // Agrupa por institución (lo usa sobre todo el superadmin).
  const grupos = [];
  disponibles.forEach((sv) => {
    const inst = institucionDe(sv);
    const key = inst?.id || "sin";
    let g = grupos.find((x) => x.key === key);
    if (!g) { g = { key, nombre: inst?.nombre || "", items: [] }; grupos.push(g); }
    g.items.push(sv);
  });
  const etiqueta = actual ? `${variasInstituciones && institucionDe(actual) ? `${institucionDe(actual).nombre} · ` : ""}${actual.nombre}` : "Servicio";
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => !soloUno && setServicioSelectorAbierto((v) => !v)}
        className="ev-btn flex items-center gap-1.5 px-2.5 py-1.5 text-[12.5px] font-medium"
        style={{ border: `1px solid ${T.border}`, color: T.ink, cursor: soloUno ? "default" : "pointer" }}
      >
        <Building2 size={13} style={{ color: T.primary }} />
        <span className="max-w-[180px] truncate">{etiqueta}</span>
        {!soloUno && <ChevronDown size={13} style={{ color: T.muted }} />}
      </button>
      {servicioSelectorAbierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setServicioSelectorAbierto(false)} />
          <div className="absolute left-0 top-full mt-1.5 z-50 w-72 ev-card p-1.5 max-h-[70vh] overflow-y-auto ev-scroll" style={{ background: T.surface }}>
            {grupos.map((g) => (
              <div key={g.key}>
                {(variasInstituciones || esSuperadmin) && g.nombre && (
                  <p className="px-3 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: T.muted }}>{g.nombre}</p>
                )}
                {g.items.map((sv) => (
                  <button
                    key={sv.id}
                    onClick={() => cambiarServicio(sv.id)}
                    className="w-full text-left px-3 py-2 rounded-lg text-[13px] flex items-center justify-between"
                    style={{ background: sv.id === servicioActualId ? T.primarySoft : "transparent", color: sv.id === servicioActualId ? T.primaryDark : T.ink }}
                  >
                    {sv.nombre}
                    {sv.id === servicioActualId && <CheckCircle2 size={14} />}
                  </button>
                ))}
              </div>
            ))}
            {esSuperadmin && (
              <button
                onClick={() => { setServicioSelectorAbierto(false); setView("panel"); }}
                className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium mt-1 border-t pt-2.5"
                style={{ color: T.primary, borderColor: T.border }}
              >
                <Shield size={13} className="inline -mt-0.5 mr-1" /> Administrar en el Panel de control
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const TELEGRAM_BOT_USERNAME = "EvolucionaTurnosBot";

function TelegramVinculoModal({ ctx, onClose }) {
  const { telegramVinculoModal } = ctx;
  const { persona, codigo } = telegramVinculoModal;
  const enlace = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${codigo}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ev-card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px]">Vincular Telegram — {persona.nombre}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <p className="text-[13px] mb-4" style={{ color: T.muted }}>
          Pídele a <strong style={{ color: T.ink }}>{persona.nombre}</strong> que abra este enlace desde su celular (o que escanee el código si se lo compartes en pantalla) y toque "Iniciar" en Telegram:
        </p>
        <a
          href={enlace}
          target="_blank"
          rel="noopener noreferrer"
          className="ev-btn w-full justify-center px-4 py-2.5 text-[13px] text-white mb-3"
          style={{ background: "#229ED9" }}
        >
          Abrir en Telegram
        </a>
        <p className="text-[11.5px] text-center mb-1" style={{ color: T.muted }}>o, si prefiere escribirlo a mano en el bot @{TELEGRAM_BOT_USERNAME}:</p>
        <p className="ev-mono text-center text-[20px] font-bold tracking-widest py-2 rounded-lg" style={{ background: T.base, color: T.primaryDark }}>{codigo}</p>
        <p className="text-[11px] text-center mt-2" style={{ color: T.muted }}>Este código es válido por 20 minutos.</p>
        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function ServicioModal({ ctx, onClose }) {
  const { servicios, servicioActualId, crearServicio, renombrarServicio, saving } = ctx;
  const actual = servicios.find((s) => s.id === servicioActualId);
  const [modo, setModo] = useState("crear"); // 'crear' | 'renombrar'
  const [nombre, setNombre] = useState("");
  const [renombrando, setRenombrando] = useState(actual?.nombre || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ev-card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px]">Servicios</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg mb-4" style={{ background: T.base, border: `1px solid ${T.border}` }}>
          {[["crear", "Nuevo servicio"], ["renombrar", `Renombrar "${actual?.nombre || ""}"`]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setModo(key)}
              className="ev-btn flex-1 justify-center px-2 py-1.5 text-[12px]"
              style={{ background: modo === key ? T.primary : "transparent", color: modo === key ? "#fff" : T.ink }}
            >
              {label}
            </button>
          ))}
        </div>

        {modo === "crear" ? (
          <>
            <Field label="Nombre del nuevo servicio">
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Hospitalización" style={inputStyle} />
            </Field>
            <p className="text-[11.5px] mt-2" style={{ color: T.muted }}>
              Empieza sin personal ni turnos — con sus propias reglas configurables (horas, mínimos de personal) desde cero.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
              <button onClick={() => crearServicio(nombre)} disabled={!nombre || saving} className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40" style={{ background: T.primary }}>
                {saving ? "Creando…" : "Crear servicio"}
              </button>
            </div>
          </>
        ) : (
          <>
            <Field label="Nuevo nombre">
              <input value={renombrando} onChange={(e) => setRenombrando(e.target.value)} style={inputStyle} />
            </Field>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
              <button
                onClick={() => { renombrarServicio(servicioActualId, renombrando); onClose(); }}
                disabled={!renombrando || saving}
                className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40"
                style={{ background: T.primary }}
              >
                Guardar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const APP_BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  * { font-family: 'Inter', -apple-system, sans-serif; }
  .ev-mono { font-family:'JetBrains Mono', monospace; }
  .ev-display { font-family:'Inter', sans-serif; font-weight:700; letter-spacing:-0.015em; }
  .ev-scroll::-webkit-scrollbar{ width:8px; height:8px; }
  .ev-scroll::-webkit-scrollbar-thumb{ background:${T.border}; border-radius:8px; }
  .ev-card{
    background:${T.surface}; border:1px solid ${T.border}; border-radius:16px;
    box-shadow:${T.shadow};
    transition: box-shadow .2s ease, transform .2s ease, background-color .2s ease, border-color .2s ease;
  }
  .ev-card-hover:hover{ box-shadow: 0 2px 6px rgba(15,23,42,0.06), 0 10px 28px rgba(15,23,42,0.08); transform: translateY(-1px); }
  .ev-btn{ display:inline-flex; align-items:center; gap:6px; border-radius:10px; font-weight:600; transition: filter .18s ease, transform .18s ease, background-color .18s ease, border-color .18s ease; cursor:pointer; }
  .ev-btn:not(:disabled):hover{ filter:brightness(0.96); transform: translateY(-1px); }
  .ev-btn:not(:disabled):active{ transform: translateY(0); filter:brightness(0.92); }
  .ev-nav-item{ transition: background-color .18s ease, color .18s ease; }
  .ev-nav-item:hover{ background:${T.primarySoft}; }
  input, select, textarea { transition: border-color .18s ease, box-shadow .18s ease; }
  input:focus, select:focus, textarea:focus { outline:none; border-color:${T.primary} !important; box-shadow:0 0 0 3px color-mix(in srgb, ${T.primary} 15%, transparent); }
  .ev-card table thead th{ font-weight:600; letter-spacing:0.03em; }
  .ev-card table tbody tr{ transition: background-color .15s ease; }
  .ev-card table tbody tr:hover{ background: color-mix(in srgb, ${T.primary} 4%, ${T.surface}); }
  @keyframes ev-fade-in { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform: translateY(0); } }
  .ev-fade-in { animation: ev-fade-in .2s ease; }
  @media (max-width: 639px) { .ev-sheet { border-bottom-left-radius:0; border-bottom-right-radius:0; } }
`;

const ACTIVITY_TYPES = {
  terapeutico: { label: "Grupo Terapéutico", color: "#0891B2", icon: HeartPulse },
  turno_dia: { label: "Turno Día", color: "#CA8A04", icon: Sun },
  turno_noche: { label: "Turno Noche", color: "#4F46E5", icon: Moon },
  administrativo: { label: "Administrativo", color: "#64748B", icon: ClipboardList },
  capacitacion: { label: "Capacitación", color: "#EA580C", icon: GraduationCap },
  reunion: { label: "Reunión", color: "#78716C", icon: Users2 },
};

/* ============================== SUPABASE ============================== */
// Llave "publishable" (equivalente a anon/public) — segura para el frontend.
// Con las políticas de security_update.sql, esta llave sola ya NO alcanza
// para leer ni escribir: cada request usa además el token de la persona
// que inició sesión (ver ACCESS_TOKEN más abajo).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zvyuqbrvixpnggynrqfa.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || "sb_publishable_G53F0OOT0-BzQlnXmen2XA_uZ1Yn9A9";
let ACCESS_TOKEN = null; // token de sesión de Supabase Auth; null = sin iniciar sesión
let REFRESH_TOKEN = null; // se usa para renovar ACCESS_TOKEN sin pedir contraseña de nuevo
const SESION_LOCAL_KEY = "evoluciona_sesion";
// Guarda los tokens en el dispositivo para que, si el sistema operativo del
// celular "mata" la app en segundo plano (algo muy común en PWAs móviles),
// al volver a abrirla se recupere la sesión sola en vez de pedir clave de nuevo.
function guardarSesionLocal() {
  try {
    if (typeof window !== "undefined" && ACCESS_TOKEN && REFRESH_TOKEN) {
      window.localStorage.setItem(SESION_LOCAL_KEY, JSON.stringify({ access_token: ACCESS_TOKEN, refresh_token: REFRESH_TOKEN }));
    }
  } catch (_) { /* si el navegador bloquea localStorage, simplemente no persiste */ }
}
function borrarSesionLocal() {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(SESION_LOCAL_KEY);
  } catch (_) {}
}
function leerSesionLocal() {
  try {
    if (typeof window === "undefined") return null;
    return JSON.parse(window.localStorage.getItem(SESION_LOCAL_KEY) || "null");
  } catch (_) {
    return null;
  }
}
let onSesionExpirada = () => {}; // la app raíz la reemplaza para cerrar sesión si el refresh también falla
let refrescoEnCurso = null; // evita refrescar varias veces en paralelo
let SERVICIO_ACTUAL = null;
let INSTITUCION_ACTUAL = null; // institución del servicio seleccionado (avisos, formación y festivos compartidos) // id del servicio seleccionado; lo usan los inserts para etiquetar los datos nuevos

async function refrescarSesion() {
  if (!REFRESH_TOKEN) throw new Error("Sin token de refresco");
  if (!refrescoEnCurso) {
    refrescoEnCurso = authRequest("token?grant_type=refresh_token", { refresh_token: REFRESH_TOKEN })
      .then((data) => {
        ACCESS_TOKEN = data.access_token;
        REFRESH_TOKEN = data.refresh_token;
        guardarSesionLocal();
        return data;
      })
      .finally(() => { refrescoEnCurso = null; });
  }
  return refrescoEnCurso;
}

async function sb(path, options = {}, _reintentado = false) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: options.method || "GET",
    body: options.body,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${ACCESS_TOKEN || SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const esTokenVencido = res.status === 401 && /JWT expired|invalid JWT|PGRST303/i.test(text);
    if (esTokenVencido && !_reintentado) {
      try {
        await refrescarSesion();
        return sb(path, options, true); // reintenta una sola vez con el token renovado
      } catch (_) {
        onSesionExpirada();
        throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
      }
    }
    throw new Error(`Supabase (${path}) respondió ${res.status}: ${text.slice(0, 180)}`);
  }
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}

async function authRequest(endpoint, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.msg || data.error || "Error de autenticación");
  return data;
}
const authSignIn = (email, password) => authRequest("token?grant_type=password", { email, password });
const authSignUp = (email, password) => authRequest("signup", { email, password });
const authRecover = (email, redirectTo) => authRequest(`recover?redirect_to=${encodeURIComponent(redirectTo)}`, { email });
async function authUpdatePassword(accessToken, newPassword) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ password: newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.msg || data.error || "No se pudo actualizar la contraseña");
  return data;
}


function mapActividad(row) {
  return {
    id: row.id, table: "actividades", date: row.fecha, title: row.nombre, type: row.tipo,
    start: Number(row.hora_inicio), end: Number(row.hora_fin), personalId: row.responsable_id,
    metodologia: row.metodologia || "", objetivos: row.objetivos || "",
  };
}
function mapTurno(row) {
  return {
    id: row.id, table: "turnos", date: row.fecha,
    title: row.tipo_turno === "dia" ? "Turno Día" : "Turno Noche",
    type: row.tipo_turno === "dia" ? "turno_dia" : "turno_noche",
    start: Number(row.hora_inicio), end: Number(row.hora_fin), personalId: row.personal_id,
  };
}
function mapPersonal(row) {
  return {
    id: row.id, nombre: row.nombre, cargo: row.cargo, area: row.area,
    tipoContrato: row.tipo_contrato, horas: Number(row.horas_semana),
    disponibilidad: row.disponibilidad, estado: row.estado,
    telegramVinculado: !!row.telegram_chat_id,
  };
}
function mapBiblioteca(row) {
  return { id: row.id, nombre: row.nombre, tipo: row.tipo, metodologia: row.metodologia || "", objetivos: row.objetivos || "", temaId: row.tema_id || null };
}
function mapTema(row) {
  return { id: row.id, nombre: row.nombre };
}
async function fetchTemas() {
  const rows = await sb("temas_biblioteca?select=*&order=nombre");
  return rows.map(mapTema);
}
async function insertTemaRemote(nombre) {
  const [row] = await sb("temas_biblioteca", { method: "POST", body: JSON.stringify({ nombre, servicio_id: SERVICIO_ACTUAL }) });
  return mapTema(row);
}
async function deleteTemaRemote(id) {
  await sb(`temas_biblioteca?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
}

const FORMACION_BUCKET = "formacion-continua";
async function subirArchivoFormacion(file) {
  const path = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${FORMACION_BUCKET}/${encodeURIComponent(path)}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${ACCESS_TOKEN || SUPABASE_KEY}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`No se pudo subir el archivo (${res.status}): ${text.slice(0, 180)}`);
  }
  return { path, url: `${SUPABASE_URL}/storage/v1/object/public/${FORMACION_BUCKET}/${path}` };
}
function mapFormacion(row) {
  return { id: row.id, titulo: row.titulo, descripcion: row.descripcion || "", tipo: row.tipo, archivoPath: row.archivo_path, archivoUrl: row.archivo_url, autor: row.autor || "", createdAt: row.created_at, contenidoTexto: row.contenido_texto || "", servicioId: row.servicio_id || null, institucionId: row.institucion_id || null };
}
async function fetchFormacion() {
  const rows = await sb("formacion_continua?select=*&order=created_at.desc");
  return rows.map(mapFormacion);
}
async function insertFormacionRemote(form) {
  const [row] = await sb("formacion_continua", {
    method: "POST",
    body: JSON.stringify({ titulo: form.titulo, descripcion: form.descripcion || null, tipo: form.tipo, archivo_path: form.archivoPath, archivo_url: form.archivoUrl, autor: form.autor || null, contenido_texto: form.contenidoTexto || null, ...(INSTITUCION_ACTUAL ? camposAlcance(form.alcance) : {}) }),
  });
  return mapFormacion(row);
}
async function deleteFormacionRemote(item) {
  await sb(`formacion_continua?id=eq.${item.id}`, { method: "DELETE", prefer: "return=minimal" });
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${FORMACION_BUCKET}/${encodeURIComponent(item.archivoPath)}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${ACCESS_TOKEN || SUPABASE_KEY}` },
    });
  } catch (_) { /* si falla borrar el archivo físico, el registro igual desaparece de la lista */ }
}

function mapVisto(row) {
  return { id: row.id, formacionId: row.formacion_id, usuarioId: row.usuario_id, fecha: row.fecha };
}
async function fetchVistos() {
  const rows = await sb("formacion_vistos?select=*");
  return rows.map(mapVisto);
}
async function marcarVistoRemote(formacionId, usuarioId) {
  const [row] = await sb("formacion_vistos", { method: "POST", body: JSON.stringify({ formacion_id: formacionId, usuario_id: usuarioId }) });
  return mapVisto(row);
}

function mapPregunta(row) {
  return { id: row.id, formacionId: row.formacion_id, pregunta: row.pregunta, opciones: row.opciones || [], respuestaCorrecta: row.respuesta_correcta, orden: row.orden };
}
async function fetchPreguntas() {
  const rows = await sb("formacion_preguntas?select=*&order=orden");
  return rows.map(mapPregunta);
}
async function insertPreguntaRemote(form) {
  const [row] = await sb("formacion_preguntas", {
    method: "POST",
    body: JSON.stringify({ formacion_id: form.formacionId, pregunta: form.pregunta, opciones: form.opciones, respuesta_correcta: form.respuestaCorrecta, orden: form.orden || 0 }),
  });
  return mapPregunta(row);
}
async function deletePreguntaRemote(id) {
  await sb(`formacion_preguntas?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
}

function mapResultado(row) {
  return { id: row.id, formacionId: row.formacion_id, usuarioId: row.usuario_id, correctas: row.correctas, total: row.total, calificacion: Number(row.calificacion), fecha: row.fecha };
}
async function fetchResultados() {
  const rows = await sb("formacion_resultados?select=*");
  return rows.map(mapResultado);
}
async function guardarResultadoRemote(form, existente) {
  const body = { formacion_id: form.formacionId, usuario_id: form.usuarioId, correctas: form.correctas, total: form.total, calificacion: form.calificacion, fecha: new Date().toISOString() };
  if (existente) {
    const [row] = await sb(`formacion_resultados?id=eq.${existente.id}`, { method: "PATCH", body: JSON.stringify(body) });
    return mapResultado(row);
  }
  const [row] = await sb("formacion_resultados", { method: "POST", body: JSON.stringify(body) });
  return mapResultado(row);
}

function mapUsuario(row) {
  return {
    id: row.id, nombre: row.nombre, correo: row.correo, rol: row.rol, activo: row.activo !== false,
    // Si la columna aún no existe (SQL de la etapa 1 sin correr), se trata como aprobado.
    aprobado: row.aprobado !== false, createdAt: row.created_at, esSuperadmin: row.es_superadmin === true,
  };
}
function sesionDesdeUsuario(propio, emailRespaldo) {
  return {
    id: propio?.id, email: propio?.correo || emailRespaldo, rol: propio?.rol || "lector",
    aprobado: propio ? propio.aprobado !== false : false, esSuperadmin: !!propio?.esSuperadmin, nombre: propio?.nombre || "",
  };
}

/* ---------- Invitaciones (etapa 1: acceso controlado) ---------- */
const INVITACION_LOCAL_KEY = "evoluciona_invitacion";
function leerCodigoInvitacionDeUrl() {
  try {
    if (typeof window === "undefined") return "";
    const codigo = new URLSearchParams(window.location.search).get("invitacion") || "";
    if (codigo) window.localStorage.setItem(INVITACION_LOCAL_KEY, codigo.trim().toUpperCase());
    return codigo.trim().toUpperCase();
  } catch (_) {
    return "";
  }
}
function codigoInvitacionGuardado() {
  try { return typeof window !== "undefined" ? window.localStorage.getItem(INVITACION_LOCAL_KEY) || "" : ""; } catch (_) { return ""; }
}
function olvidarCodigoInvitacion() {
  try { if (typeof window !== "undefined") window.localStorage.removeItem(INVITACION_LOCAL_KEY); } catch (_) {}
}
async function canjearInvitacionRemote(codigo) {
  const res = await sb("rpc/canjear_invitacion", { method: "POST", body: JSON.stringify({ p_codigo: codigo }) });
  return res || { ok: false, error: "No hubo respuesta del servidor." };
}
function generarCodigoInvitacion() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin O/0/I/1, para que no se confundan al escribirlo
  let out = "";
  const azar = new Uint32Array(8);
  try { window.crypto.getRandomValues(azar); } catch (_) { for (let i = 0; i < 8; i++) azar[i] = Math.floor(Math.random() * 1e9); }
  for (let i = 0; i < 8; i++) out += chars[azar[i] % chars.length];
  return out;
}
function mapInvitacion(row) {
  return {
    id: row.id, codigo: row.codigo, servicioId: row.servicio_id || null, nota: row.nota || "",
    usosMax: row.usos_max, usos: row.usos, expiraEn: row.expira_en, activa: row.activa, createdAt: row.created_at, rol: row.rol || "lector",
  };
}
function estadoInvitacion(inv) {
  if (!inv.activa) return { texto: "Desactivado", tono: "off" };
  if (inv.expiraEn && new Date(inv.expiraEn) < new Date()) return { texto: "Vencido", tono: "off" };
  if (inv.usos >= inv.usosMax) return { texto: "Agotado", tono: "off" };
  return { texto: "Vigente", tono: "ok" };
}

// Funciones que se pueden activar o apagar en cada servicio (etapa 2).
// "Dashboard" y "Configuración" siempre están.
const MODULOS = [
  { key: "actividades", label: "Actividades", desc: "Calendario de actividades terapéuticas" },
  { key: "turnos", label: "Turnos", desc: "Programación y generador de turnos" },
  { key: "novedades", label: "Novedades", desc: "Incapacidades, permisos y turnos extra" },
  { key: "biblioteca", label: "Biblioteca", desc: "Índice de actividades por tema" },
  { key: "formacion", label: "Formación Continua", desc: "Infografías, videos, PDFs y tests" },
  { key: "evo", label: "Evo", desc: "Asistente de IA" },
  { key: "personal", label: "Personal", desc: "Equipo del servicio y Telegram" },
  { key: "reportes", label: "Reportes", desc: "Exportar a Excel y PDF" },
];
const MODULOS_TODOS = Object.fromEntries(MODULOS.map((m) => [m.key, true]));
function normalizarModulos(m) {
  return { ...MODULOS_TODOS, ...(m && typeof m === "object" ? m : {}) };
}

function mapServicio(row) {
  return {
    id: row.id, nombre: row.nombre, institucionId: row.institucion_id || null,
    activo: row.activo !== false, modulos: normalizarModulos(row.modulos), createdAt: row.created_at,
  };
}
async function fetchServicios() {
  const rows = await sb("servicios?select=*&order=created_at");
  return rows.map(mapServicio);
}
async function insertServicioRemote(nombre, institucionId, modulos) {
  const body = { nombre };
  if (institucionId) body.institucion_id = institucionId;
  if (modulos) body.modulos = modulos;
  const [row] = await sb("servicios", { method: "POST", body: JSON.stringify(body) });
  return mapServicio(row);
}
async function actualizarServicioRemote(id, cambios) {
  const [row] = await sb(`servicios?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(cambios) });
  return mapServicio(row);
}
function mapLicencia(row) {
  return {
    institucionId: row.institucion_id, plan: row.plan || "", inicio: row.inicio || null, vence: row.vence || null,
    maxPersonas: row.max_personas ?? null, maxServicios: row.max_servicios ?? null,
    modulos: normalizarModulos(row.modulos), notas: row.notas || "",
  };
}
// Devuelve null si la tabla "licencias" aún no existe (SQL de la etapa 3 sin correr).
async function fetchLicencias() {
  try {
    const rows = await sb("licencias?select=*");
    return rows.map(mapLicencia);
  } catch (_) {
    return null;
  }
}
async function fetchMisLicencias() {
  try {
    return (await sb("rpc/mis_licencias", { method: "POST", body: "{}" })) || [];
  } catch (_) {
    return [];
  }
}
// Fechas de la licencia en palabras: "31 de diciembre de 2026".
function fechaLarga(iso) {
  return iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) : "";
}

// Los archivos de Formación son privados (etapa 3): para mostrarlos se pide a
// Supabase un enlace temporal (1 hora) que solo se entrega a quien pertenece
// al servicio. Si el almacenamiento aún es público, se usa el enlace de siempre.
const VIGENCIA_ENLACE_ARCHIVO = 3600;
async function firmarArchivosFormacion(items) {
  const conRuta = items.filter((f) => f.archivoPath);
  if (conRuta.length === 0) return items;
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${FORMACION_BUCKET}`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${ACCESS_TOKEN || SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: VIGENCIA_ENLACE_ARCHIVO, paths: conRuta.map((f) => f.archivoPath) }),
    });
    if (!res.ok) return items;
    const firmas = await res.json();
    const porRuta = Object.fromEntries((firmas || []).filter((x) => x.signedURL).map((x) => [x.path, `${SUPABASE_URL}/storage/v1${x.signedURL}`]));
    return items.map((f) => (porRuta[f.archivoPath] ? { ...f, archivoUrl: porRuta[f.archivoPath] } : f));
  } catch (_) {
    return items;
  }
}

function mapInstitucion(row) {
  return { id: row.id, nombre: row.nombre, activa: row.activa !== false, createdAt: row.created_at };
}
async function fetchInstituciones() {
  const rows = await sb("instituciones?select=*&order=created_at");
  return rows.map(mapInstitucion);
}
function mapMiembro(row) {
  return { id: row.id, usuarioId: row.usuario_id, servicioId: row.servicio_id, rol: row.rol };
}
// Devuelve null si la tabla "miembros" aún no existe (SQL de la etapa 2 sin correr).
async function fetchMisMiembros(uid) {
  try {
    const rows = await sb(`miembros?usuario_id=eq.${uid}&select=*`);
    return rows.map(mapMiembro);
  } catch (_) {
    return null;
  }
}
async function renombrarServicioRemote(id, nombre) {
  const [row] = await sb(`servicios?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ nombre }) });
  return mapServicio(row);
}

async function fetchAllRemote(servicioId, institucionId) {
  const s = `servicio_id=eq.${servicioId}`;
  const alcance = filtroAlcance(servicioId, institucionId);
  const inst = institucionId ? `institucion_id=eq.${institucionId}&` : "";
  const [personalRows, actRows, turnRows, bibRows, reglasRow, festivoRows, novedadRows, reglaPersonalRows, plantillaRows, plantillaItemRows, avisoRows, temaRows, formacionRows, vistoRows, preguntaRows, resultadoRows, turnoExtraRows] = await Promise.all([
    sb(`personal?${s}&select=*&order=nombre`),
    sb(`actividades?${s}&select=*`),
    sb(`turnos?${s}&select=*`),
    sb(`biblioteca_actividades?${s}&select=*&order=nombre`),
    sb(`reglas_turnos?${s}&select=*&limit=1`),
    sb(`festivos?${inst}select=*&order=fecha`),
    sb(`novedades?${s}&select=*&order=fecha_inicio.desc`),
    sb(`reglas_personal?${s}&select=*`),
    sb(`plantillas_semanales?${s}&select=*&order=nombre`),
    sb("plantilla_actividades?select=*"),
    sb(`avisos_tablero?${alcance}select=*&order=created_at.desc`),
    sb(`temas_biblioteca?${s}&select=*&order=nombre`),
    sb(`formacion_continua?${alcance}select=*&order=created_at.desc`),
    sb("formacion_vistos?select=*"),
    sb("formacion_preguntas?select=*&order=orden"),
    sb("formacion_resultados?select=*"),
    sb(`turnos_extra?${s}&select=*&order=fecha.desc`),
  ]);
  return {
    personal: personalRows.map(mapPersonal),
    events: [...actRows.map(mapActividad), ...turnRows.map(mapTurno)],
    biblioteca: bibRows.map(mapBiblioteca),
    reglas: reglasRow && reglasRow[0] ? mapReglas(reglasRow[0]) : null,
    festivos: festivoRows.map(mapFestivo),
    novedades: novedadRows.map(mapNovedad),
    reglasPersonal: reglaPersonalRows.map(mapReglaPersonal),
    plantillas: plantillaRows.map(mapPlantilla),
    plantillaItems: plantillaItemRows.map(mapPlantillaItem),
    avisos: avisoRows.map(mapAviso),
    temas: temaRows.map(mapTema),
    formacion: formacionRows.map(mapFormacion),
    vistos: vistoRows.map(mapVisto),
    preguntas: preguntaRows.map(mapPregunta),
    resultados: resultadoRows.map(mapResultado),
    turnosExtra: turnoExtraRows.map(mapTurnoExtra),
  };
}
async function fetchEventsRemote(servicioId) {
  const s = `servicio_id=eq.${servicioId}`;
  const [actRows, turnRows] = await Promise.all([sb(`actividades?${s}&select=*`), sb(`turnos?${s}&select=*`)]);
  return [...actRows.map(mapActividad), ...turnRows.map(mapTurno)];
}
function eventPayload(form) {
  const isTurno = form.type === "turno_dia" || form.type === "turno_noche";
  return isTurno
    ? { fecha: form.date, tipo_turno: form.type === "turno_dia" ? "dia" : "noche", hora_inicio: form.start, hora_fin: form.end, personal_id: form.personalId || null, servicio_id: SERVICIO_ACTUAL }
    : { nombre: form.title, tipo: form.type, fecha: form.date, hora_inicio: form.start, hora_fin: form.end, responsable_id: form.personalId || null, metodologia: form.metodologia || null, objetivos: form.objetivos || null, servicio_id: SERVICIO_ACTUAL };
}
async function insertEventRemote(form) {
  const isTurno = form.type === "turno_dia" || form.type === "turno_noche";
  const table = isTurno ? "turnos" : "actividades";
  const [row] = await sb(table, { method: "POST", body: JSON.stringify(eventPayload(form)) });
  return isTurno ? mapTurno(row) : mapActividad(row);
}
async function updateEventRemote(form) {
  const isTurno = form.type === "turno_dia" || form.type === "turno_noche";
  const table = isTurno ? "turnos" : "actividades";
  const [row] = await sb(`${table}?id=eq.${form.id}`, { method: "PATCH", body: JSON.stringify(eventPayload(form)) });
  return isTurno ? mapTurno(row) : mapActividad(row);
}
async function deleteEventRemote(event) {
  const table = event.table || (event.type.startsWith("turno_") ? "turnos" : "actividades");
  await sb(`${table}?id=eq.${event.id}`, { method: "DELETE", prefer: "return=minimal" });
}
async function toggleEstadoRemote(id, current) {
  const [row] = await sb(`personal?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ estado: current === "activo" ? "inactivo" : "activo" }) });
  return mapPersonal(row);
}
function generarCodigoAleatorio() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin O/0/I/1, para que no se confundan al escribirlo
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
async function generarVinculoTelegramRemote(id) {
  const codigo = generarCodigoAleatorio();
  const expira = new Date(Date.now() + 20 * 60 * 1000).toISOString(); // válido 20 minutos
  await sb(`personal?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ telegram_link_code: codigo, telegram_link_expira: expira }) });
  return codigo;
}
async function desvincularTelegramRemote(id) {
  const [row] = await sb(`personal?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ telegram_chat_id: null, telegram_link_code: null, telegram_link_expira: null }) });
  return mapPersonal(row);
}
function personalPayload(form) {
  return {
    nombre: form.nombre, cargo: form.cargo, area: form.area,
    tipo_contrato: form.tipoContrato || "Término indefinido",
    horas_semana: Number(form.horas) || 0,
    disponibilidad: form.disponibilidad || "Completa",
    estado: form.estado || "activo",
    servicio_id: SERVICIO_ACTUAL,
  };
}
async function insertPersonalRemote(form) {
  const [row] = await sb("personal", { method: "POST", body: JSON.stringify(personalPayload(form)) });
  return mapPersonal(row);
}
async function updatePersonalRemote(form) {
  const [row] = await sb(`personal?id=eq.${form.id}`, { method: "PATCH", body: JSON.stringify(personalPayload(form)) });
  return mapPersonal(row);
}
async function deletePersonalRemote(id) {
  await sb(`personal?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
}
async function insertBibliotecaRemote(form) {
  const [row] = await sb("biblioteca_actividades", { method: "POST", body: JSON.stringify({ nombre: form.nombre, tipo: form.tipo, metodologia: form.metodologia || null, objetivos: form.objetivos || null, tema_id: form.temaId || null, servicio_id: SERVICIO_ACTUAL }) });
  return mapBiblioteca(row);
}
async function updateBibliotecaRemote(form) {
  const [row] = await sb(`biblioteca_actividades?id=eq.${form.id}`, { method: "PATCH", body: JSON.stringify({ nombre: form.nombre, tipo: form.tipo, metodologia: form.metodologia || null, objetivos: form.objetivos || null, tema_id: form.temaId || null }) });
  return mapBiblioteca(row);
}
async function deleteBibliotecaRemote(id) {
  await sb(`biblioteca_actividades?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
}
function uidDelToken(token) {
  try {
    let p = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    p += "===".slice((p.length + 3) % 4);
    return JSON.parse(atob(p)).sub || null;
  } catch (_) {
    return null;
  }
}
async function fetchOwnUsuario() {
  const uid = ACCESS_TOKEN ? uidDelToken(ACCESS_TOKEN) : null;
  const rows = await sb(uid ? `usuarios?id=eq.${uid}&select=*&limit=1` : "usuarios?select=*&limit=1");
  return rows && rows[0] ? mapUsuario(rows[0]) : null;
}
async function fetchUsuarios() {
  const rows = await sb("usuarios?select=*&order=correo");
  return rows.map(mapUsuario);
}
async function updateUsuarioRolRemote(id, rol) {
  const [row] = await sb(`usuarios?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ rol }) });
  return mapUsuario(row);
}
async function updateUsuarioActivoRemote(id, activo) {
  const [row] = await sb(`usuarios?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ activo }) });
  return mapUsuario(row);
}

function mapReglas(row) {
  return {
    id: row.id,
    horasSemanaObjetivo: Number(row.horas_semana_objetivo),
    personalMinTurnoDia: Number(row.personal_min_turno_dia),
    personalMinTurnoNoche: Number(row.personal_min_turno_noche),
    personalMinFinSemanaFestivo: Number(row.personal_min_fin_semana_festivo),
    descansoMinHoras: Number(row.descanso_min_horas),
    cargosTurno: row.cargos_turno || [],
    turnosDiaIdeal: Number(row.turnos_dia_ideal),
    turnosNocheIdeal: Number(row.turnos_noche_ideal),
    turnosDiaAlterno: Number(row.turnos_dia_alterno),
    turnosNocheAlterno: Number(row.turnos_noche_alterno),
    finesSemanaLibresMes: Number(row.fines_semana_libres_mes),
    cargoOperador: row.cargo_operador || "operador terapéutico",
    cargoAuxiliar: row.cargo_auxiliar || "auxiliar de enfermería",
    operadorRequiereAuxiliar: row.operador_requiere_auxiliar !== false,
    diasRefuerzo: Array.isArray(row.dias_refuerzo) && row.dias_refuerzo.length ? row.dias_refuerzo : [5, 6],
  };
}
async function fetchReglas() {
  const rows = await sb("reglas_turnos?select=*&limit=1");
  return rows && rows[0] ? mapReglas(rows[0]) : null;
}
async function updateReglasRemote(form) {
  const body = {
    horas_semana_objetivo: Number(form.horasSemanaObjetivo),
    personal_min_turno_dia: Number(form.personalMinTurnoDia),
    personal_min_turno_noche: Number(form.personalMinTurnoNoche),
    personal_min_fin_semana_festivo: Number(form.personalMinFinSemanaFestivo),
    descanso_min_horas: Number(form.descansoMinHoras),
    cargos_turno: form.cargosTurno,
    turnos_dia_ideal: Number(form.turnosDiaIdeal),
    turnos_noche_ideal: Number(form.turnosNocheIdeal),
    turnos_dia_alterno: Number(form.turnosDiaAlterno),
    turnos_noche_alterno: Number(form.turnosNocheAlterno),
    fines_semana_libres_mes: Number(form.finesSemanaLibresMes),
    cargo_operador: form.cargoOperador,
    cargo_auxiliar: form.cargoAuxiliar,
    operador_requiere_auxiliar: !!form.operadorRequiereAuxiliar,
    dias_refuerzo: form.diasRefuerzo || [5, 6],
    updated_at: new Date().toISOString(),
  };
  const [row] = await sb(`reglas_turnos?id=eq.${form.id}`, { method: "PATCH", body: JSON.stringify(body) });
  return mapReglas(row);
}
async function insertReglasDefaultRemote(servicioId) {
  // Se apoya en los valores por defecto ya definidos en la base de datos
  // (44h, mínimos de personal, cargos, etc.) — solo etiqueta la fila con el
  // servicio nuevo.
  const [row] = await sb("reglas_turnos", { method: "POST", body: JSON.stringify({ servicio_id: servicioId }) });
  return mapReglas(row);
}
function mapFestivo(row) {
  return { id: row.id, fecha: row.fecha, nombre: row.nombre };
}
async function fetchFestivos() {
  const rows = await sb("festivos?select=*&order=fecha");
  return rows.map(mapFestivo);
}
async function insertFestivoRemote(form) {
  const [row] = await sb("festivos", { method: "POST", body: JSON.stringify({ fecha: form.fecha, nombre: form.nombre, ...(INSTITUCION_ACTUAL ? { institucion_id: INSTITUCION_ACTUAL } : {}) }) });
  return mapFestivo(row);
}
async function deleteFestivoRemote(id) {
  await sb(`festivos?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
}

function mapNovedad(row) {
  return { id: row.id, personalId: row.personal_id, fechaInicio: row.fecha_inicio, fechaFin: row.fecha_fin, tipo: row.tipo, motivo: row.motivo || "" };
}
async function fetchNovedades() {
  const rows = await sb("novedades?select=*&order=fecha_inicio.desc");
  return rows.map(mapNovedad);
}
async function insertNovedadRemote(form) {
  const [row] = await sb("novedades", { method: "POST", body: JSON.stringify({ personal_id: form.personalId, fecha_inicio: form.fechaInicio, fecha_fin: form.fechaFin, tipo: form.tipo, motivo: form.motivo || null, servicio_id: SERVICIO_ACTUAL }) });
  return mapNovedad(row);
}
async function deleteNovedadRemote(id) {
  await sb(`novedades?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
}

function mapTurnoExtra(row) {
  return {
    id: row.id, turnoId: row.turno_id, personalId: row.personal_id, fecha: row.fecha,
    tipoTurno: row.tipo_turno === "dia" ? "turno_dia" : "turno_noche", horas: Number(row.horas),
    cubrePersonalId: row.cubre_personal_id || null, motivo: row.motivo || "",
  };
}
async function fetchTurnosExtra() {
  const rows = await sb("turnos_extra?select=*&order=fecha.desc");
  return rows.map(mapTurnoExtra);
}
async function insertTurnoExtraRemote(form) {
  const [row] = await sb("turnos_extra", {
    method: "POST",
    body: JSON.stringify({
      turno_id: form.turnoId, personal_id: form.personalId, fecha: form.fecha,
      tipo_turno: form.tipoTurno === "turno_noche" ? "noche" : "dia", horas: form.horas,
      cubre_personal_id: form.cubrePersonalId || null, motivo: form.motivo || null, servicio_id: SERVICIO_ACTUAL,
    }),
  });
  return mapTurnoExtra(row);
}
async function deleteTurnoExtraRemote(id) {
  await sb(`turnos_extra?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
}

function mapReglaPersonal(row) {
  return { id: row.id, personalId: row.personal_id, diaSemana: row.dia_semana, tipoTurno: row.tipo_turno === "dia" ? "turno_dia" : "turno_noche", tipoRegla: row.tipo_regla || "siempre" };
}
async function fetchReglasPersonal() {
  const rows = await sb("reglas_personal?select=*");
  return rows.map(mapReglaPersonal);
}
async function insertReglaPersonalRemote(form) {
  const [row] = await sb("reglas_personal", { method: "POST", body: JSON.stringify({ personal_id: form.personalId, dia_semana: Number(form.diaSemana), tipo_turno: form.tipoTurno === "turno_dia" ? "dia" : "noche", tipo_regla: form.tipoRegla || "siempre", servicio_id: SERVICIO_ACTUAL }) });
  return mapReglaPersonal(row);
}
async function deleteReglaPersonalRemote(id) {
  await sb(`reglas_personal?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
}

function mapPlantilla(row) {
  return { id: row.id, nombre: row.nombre };
}
async function fetchPlantillas() {
  const rows = await sb("plantillas_semanales?select=*&order=nombre");
  return rows.map(mapPlantilla);
}
async function insertPlantillaRemote(nombre) {
  const [row] = await sb("plantillas_semanales", { method: "POST", body: JSON.stringify({ nombre, servicio_id: SERVICIO_ACTUAL }) });
  return mapPlantilla(row);
}
async function deletePlantillaRemote(id) {
  await sb(`plantillas_semanales?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
}

function mapPlantillaItem(row) {
  return {
    id: row.id, plantillaId: row.plantilla_id, diaSemana: row.dia_semana, nombre: row.nombre, tipo: row.tipo,
    horaInicio: Number(row.hora_inicio), horaFin: Number(row.hora_fin), responsableId: row.responsable_id,
    metodologia: row.metodologia || "", objetivos: row.objetivos || "",
  };
}
async function fetchPlantillaItems() {
  const rows = await sb("plantilla_actividades?select=*");
  return rows.map(mapPlantillaItem);
}
async function insertPlantillaItemRemote(form) {
  const [row] = await sb("plantilla_actividades", {
    method: "POST",
    body: JSON.stringify({
      plantilla_id: form.plantillaId, dia_semana: Number(form.diaSemana), nombre: form.nombre, tipo: form.tipo,
      hora_inicio: Number(form.horaInicio), hora_fin: Number(form.horaFin), responsable_id: form.responsableId || null,
      metodologia: form.metodologia || null, objetivos: form.objetivos || null,
    }),
  });
  return mapPlantillaItem(row);
}
async function deletePlantillaItemRemote(id) {
  await sb(`plantilla_actividades?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
}

function mapAviso(row) {
  return {
    id: row.id, titulo: row.titulo, mensaje: row.mensaje, nivel: row.nivel, autor: row.autor || "", fechaExpira: row.fecha_expira, createdAt: row.created_at,
    servicioId: row.servicio_id || null, institucionId: row.institucion_id || null,
  };
}
// Alcance de avisos y Formación: "servicio" (solo el servicio actual) o
// "institucion" (todos los servicios de la institución).
function camposAlcance(alcance) {
  if (alcance === "institucion" && INSTITUCION_ACTUAL) return { servicio_id: null, institucion_id: INSTITUCION_ACTUAL };
  return { servicio_id: SERVICIO_ACTUAL, institucion_id: INSTITUCION_ACTUAL || null };
}
// Filtro para traer lo del servicio actual + lo compartido con su institución.
function filtroAlcance(servicioId, institucionId) {
  if (!institucionId) return "";
  return `or=(servicio_id.eq.${servicioId},and(servicio_id.is.null,institucion_id.eq.${institucionId}))&`;
}
async function fetchAvisos() {
  const rows = await sb("avisos_tablero?select=*&order=created_at.desc");
  return rows.map(mapAviso);
}
async function insertAvisoRemote(form) {
  const [row] = await sb("avisos_tablero", {
    method: "POST",
    body: JSON.stringify({ titulo: form.titulo, mensaje: form.mensaje, nivel: form.nivel, autor: form.autor || null, fecha_expira: form.fechaExpira || null, ...(INSTITUCION_ACTUAL ? camposAlcance(form.alcance) : {}) }),
  });
  return mapAviso(row);
}
async function deleteAvisoRemote(id) {
  await sb(`avisos_tablero?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
}

/* ============================== DATA ============================== */
const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })(); // fecha real de hoy
let PERSONAL_STATE = []; // se llena al cargar desde Supabase; usado por personName/personById

function toISO(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function getMonday(d) {
  const r = new Date(d);
  const day = r.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  return addDays(r, diff);
}
const monday = getMonday(TODAY);
const iso = (n) => toISO(addDays(monday, n));

let _id = 1;
const nid = () => `tmp${_id++}`; // solo para el formulario mientras se guarda en Supabase

const NAV = [
  { key: "panel", label: "Panel de control", icon: Shield, soloSuperadmin: true },
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "actividades", label: "Actividades", icon: CalendarDays, modulo: "actividades" },
  { key: "turnos", label: "Turnos", icon: Clock, modulo: "turnos" },
  { key: "novedades", label: "Novedades", icon: UserX, modulo: "novedades" },
  { key: "biblioteca", label: "Biblioteca", icon: BookOpen, modulo: "biblioteca" },
  { key: "formacion", label: "Formación Continua", icon: GraduationCap, modulo: "formacion" },
  { key: "evo", label: "Evo", icon: Bot, modulo: "evo" },
  { key: "personal", label: "Personal", icon: Users, soloMaestro: true, modulo: "personal" },
  { key: "reportes", label: "Reportes", icon: FileBarChart, soloMaestro: true, modulo: "reportes" },
  { key: "configuracion", label: "Configuración", icon: Settings, soloMaestro: true },
];
const SERVICIO_LOCAL_KEY = "evoluciona_servicio";
function navVisible(n, { isMaestro, esSuperadmin, modulos }) {
  if (n.soloSuperadmin) return esSuperadmin;
  if (n.soloMaestro && !isMaestro) return false;
  if (n.modulo && modulos && modulos[n.modulo] === false) return false;
  return true;
}
const TURNO_TYPES = ["turno_dia", "turno_noche"];
const ACTIVIDAD_TYPES = Object.keys(ACTIVITY_TYPES).filter((k) => !TURNO_TYPES.includes(k));
// Valores por defecto si aún no cargaron las reglas desde Supabase.
const TURNO_CARGOS_DEFAULT = ["operador terapéutico", "auxiliar de enfermería"];
// Normaliza texto para comparar cargos sin que un tilde de más/de menos
// o un espacio extra haga que alguien no aparezca para asignar turno.
function normalizarTexto(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita tildes
    .trim()
    .replace(/\s+/g, " ");
}
function esCargoDeTurno(cargo, cargosTurno) {
  const c = normalizarTexto(cargo);
  const lista = (cargosTurno && cargosTurno.length ? cargosTurno : TURNO_CARGOS_DEFAULT).map(normalizarTexto);
  return lista.some((t) => t && c.includes(t));
}

/* ============================== HELPERS ============================== */
const DIA_LABEL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DIA_LABEL_LARGO = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábados", "domingos"];
const MES_LABEL = [
  "enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre",
];

function fmtHour(h) {
  const hh = Math.floor(((h % 24) + 24) % 24);
  const mm = Math.round((h % 1) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function fmtRange(s, e) {
  return `${fmtHour(s)} – ${fmtHour(e)}${e > 24 ? " +1" : ""}`;
}
// Para los <input type="time"> de Actividades (permiten medias horas, cuartos, etc.)
function horaATimeValue(h) {
  return fmtHour(h);
}
function timeValueAHora(v) {
  const [hh, mm] = v.split(":").map(Number);
  return hh + mm / 60;
}
// Horas que realmente cuentan para el pago/control: el turno noche
// tiene 2 horas de descanso, así que sus 14h de reloj cuentan como 12h.
const DESCANSO_NOCHE = 2;
function horasEfectivas(e) {
  const bruto = e.end - e.start;
  return e.type === "turno_noche" ? bruto - DESCANSO_NOCHE : bruto;
}
function personName(id) {
  return PERSONAL_STATE.find((p) => p.id === id)?.nombre || "Sin asignar";
}
function personById(id) {
  return PERSONAL_STATE.find((p) => p.id === id);
}

/* ============================== TOAST ============================== */
function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, tone = "ok") => {
    setToast({ msg, tone, key: Date.now() });
    setTimeout(() => setToast(null), 2600);
  };
  return [toast, show];
}

/* ============================== ROOT ============================== */
export default function EvolucionaApp() {
  const [theme, setTheme] = useTheme();
  const [session, setSession] = useState(null); // { email, rol }
  const [recuperandoSesion, setRecuperandoSesion] = useState(true);
  const [codigoInvitacionUrl] = useState(() => leerCodigoInvitacionDeUrl());
  const [mostrarLanding, setMostrarLanding] = useState(() => !codigoInvitacionUrl);

  // Al abrir la app (o volver a ella tras haber estado en segundo plano en
  // el celular, donde el sistema operativo suele "matar" la pestaña de la
  // PWA), intenta recuperar la sesión guardada en el dispositivo en vez de
  // pedir la clave de nuevo cada vez.
  React.useEffect(() => {
    (async () => {
      try {
        const guardada = leerSesionLocal();
        if (guardada?.access_token && guardada?.refresh_token) {
          ACCESS_TOKEN = guardada.access_token;
          REFRESH_TOKEN = guardada.refresh_token;
          let propio = await fetchOwnUsuario().catch(() => null);
          if (!propio) {
            // El token de acceso ya venció (pasa si la app estuvo cerrada
            // más de una hora); se intenta renovar una vez con el de refresco.
            try {
              await refrescarSesion();
              propio = await fetchOwnUsuario().catch(() => null);
            } catch (_) {
              propio = null;
            }
          }
          if (propio && propio.activo !== false) {
            setSession(sesionDesdeUsuario(propio));
          } else {
            ACCESS_TOKEN = null;
            REFRESH_TOKEN = null;
            borrarSesionLocal();
          }
        }
      } catch (_) { /* si algo falla, simplemente se pide iniciar sesión normalmente */ }
      setRecuperandoSesion(false);
    })();
  }, []);
  const [servicios, setServicios] = useState([]);
  const [instituciones, setInstituciones] = useState([]);
  const [licencias, setLicencias] = useState(null); // null = tabla aún no existe
  const [misLicencias, setMisLicencias] = useState([]);
  const [misMiembros, setMisMiembros] = useState(null); // null = tabla "miembros" aún no existe
  const [servicioActualId, setServicioActualId] = useState(null);
  const [servicioModal, setServicioModal] = useState(false);
  const [servicioSelectorAbierto, setServicioSelectorAbierto] = useState(false);
  React.useEffect(() => {
    SERVICIO_ACTUAL = servicioActualId;
    INSTITUCION_ACTUAL = servicios.find((s) => s.id === servicioActualId)?.institucionId || null;
  }, [servicioActualId, servicios]);
  const [recoveryToken, setRecoveryToken] = useState(undefined); // undefined = aún sin revisar; null = no hay; string = token de recuperación
  React.useEffect(() => {
    try {
      const hash = window.location.hash || "";
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      if (params.get("type") === "recovery" && params.get("access_token")) {
        setRecoveryToken(params.get("access_token"));
      } else {
        setRecoveryToken(null);
      }
    } catch (_) {
      setRecoveryToken(null);
    }
  }, []);
  const [view, setView] = useState("dashboard");
  const panelInicialMostrado = React.useRef(false);
  React.useEffect(() => {
    if (session?.esSuperadmin && !panelInicialMostrado.current) { panelInicialMostrado.current = true; setView("panel"); }
    if (!session) panelInicialMostrado.current = false;
  }, [session]);
  const [events, setEvents] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [biblioteca, setBiblioteca] = useState([]);
  const [reglas, setReglas] = useState(null);
  const [festivos, setFestivos] = useState([]);
  const [novedades, setNovedades] = useState([]);
  const [turnosExtra, setTurnosExtra] = useState([]);
  const [reglasPersonal, setReglasPersonal] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [plantillaItems, setPlantillaItems] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [usuariosLista, setUsuariosLista] = useState([]);
  const [temas, setTemas] = useState([]);
  const [temaModal, setTemaModal] = useState(false);
  const [formacion, setFormacion] = useState([]);
  const formacionRef = React.useRef([]);
  React.useEffect(() => { formacionRef.current = formacion; }, [formacion]);
  const [formacionModal, setFormacionModal] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [vistos, setVistos] = useState([]);
  const [preguntas, setPreguntas] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [testModal, setTestModal] = useState(null); // formacion sobre la que se presenta el test
  const [gestionarTestModal, setGestionarTestModal] = useState(null); // formacion que el Maestro está editando
  const [participacionModal, setParticipacionModal] = useState(null); // formacion a revisar
  const [avisoModal, setAvisoModal] = useState(false);
  const [plantillaModal, setPlantillaModal] = useState(false); // modal para crear una nueva plantilla
  const [plantillaEditorId, setPlantillaEditorId] = useState(null); // id de la plantilla que se está editando
  const [aplicarPlantillaModal, setAplicarPlantillaModal] = useState(null); // {plantillaId}
  const [weekOffset, setWeekOffset] = useState(0);
  const [calMode, setCalMode] = useState("semana");
  const [monthOffset, setMonthOffset] = useState(0);
  const [modal, setModal] = useState(null); // {mode:'new'|'edit', event}
  const [detail, setDetail] = useState(null); // event being viewed
  const [personalModal, setPersonalModal] = useState(null); // {mode, person}
  const [telegramVinculoModal, setTelegramVinculoModal] = useState(null); // {persona, codigo}
  const [bibModal, setBibModal] = useState(null); // {mode, item}
  const [festivoModal, setFestivoModal] = useState(false);
  const [reglaPersonalModal, setReglaPersonalModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, showToast] = useToast();

  const esSuperadmin = !!session?.esSuperadmin;
  const servicioActual = servicios.find((s) => s.id === servicioActualId) || null;
  const institucionActual = instituciones.find((i) => i.id === servicioActual?.institucionId) || null;
  const licenciaActual = (licencias || []).find((l) => l.institucionId === servicioActual?.institucionId) || null;
  const estadoLic = estadoLicencia(licenciaActual);
  // Funciones visibles = las del servicio Y las incluidas en la licencia.
  const modulosServicio = servicioActual?.modulos || MODULOS_TODOS;
  const modulos = Object.fromEntries(MODULOS.map((m) => [m.key, modulosServicio[m.key] !== false && (!licenciaActual || licenciaActual.modulos[m.key] !== false)]));
  // Maestro se es POR SERVICIO. Si la tabla de miembros aún no existe, se usa el rol de antes.
  const rolEnServicio = misMiembros ? misMiembros.find((m) => m.servicioId === servicioActualId)?.rol : null;
  const esMaestroDelServicio = misMiembros ? rolEnServicio === "maestro" : session?.rol === "maestro";
  // Con la licencia vencida (solo lectura) nadie edita, salvo el superadmin.
  const isMaestro = esSuperadmin || (esMaestroDelServicio && estadoLic !== "solo_lectura");

  React.useEffect(() => {
    PERSONAL_STATE = personal;
  }, [personal]);
  React.useEffect(() => {
    if (!session) return;
    const id = setInterval(async () => {
      setFormacion(await firmarArchivosFormacion(formacionRef.current));
    }, 50 * 60 * 1000);
    return () => clearInterval(id);
  }, [session]);

  async function loadAll(forzarServicioId) {
    setLoading(true);
    setLoadError(null);
    try {
      const [listaServicios, listaInstituciones, miembrosPropios, listaLicencias, licenciasPropias] = await Promise.all([
        fetchServicios(),
        fetchInstituciones().catch(() => []),
        session?.id ? fetchMisMiembros(session.id) : Promise.resolve(null),
        fetchLicencias(),
        fetchMisLicencias(),
      ]);
      setLicencias(listaLicencias);
      setMisLicencias(licenciasPropias);
      setServicios(listaServicios);
      setInstituciones(listaInstituciones);
      setMisMiembros(miembrosPropios);
      // Solo se entra a servicios activos (el superadmin los reactiva desde el Panel).
      const disponibles = listaServicios.filter((s) => s.activo);
      let guardado = null;
      try { guardado = window.localStorage.getItem(SERVICIO_LOCAL_KEY); } catch (_) {}
      const preferido = forzarServicioId !== undefined ? forzarServicioId : (servicioActualId || guardado);
      const idAUsar = (preferido && disponibles.some((s) => s.id === preferido))
        ? preferido
        : disponibles[0]?.id || null;
      setServicioActualId(idAUsar);
      SERVICIO_ACTUAL = idAUsar;
      INSTITUCION_ACTUAL = listaServicios.find((s) => s.id === idAUsar)?.institucionId || null;
      try { if (idAUsar) window.localStorage.setItem(SERVICIO_LOCAL_KEY, idAUsar); } catch (_) {}

      if (!idAUsar) {
        // No hay ningún servicio todavía (no debería pasar si corriste la migración,
        // pero por si acaso no dejamos la app en blanco sin explicación).
        setPersonal([]); setEvents([]); setBiblioteca([]); setReglas(null); setFestivos([]);
        setNovedades([]); setReglasPersonal([]); setPlantillas([]); setPlantillaItems([]);
        setAvisos([]); setTemas([]); setFormacion([]); setVistos([]); setPreguntas([]); setResultados([]); setTurnosExtra([]);
        setLoading(false);
        return;
      }

      const data = await fetchAllRemote(idAUsar, INSTITUCION_ACTUAL);
      setPersonal(data.personal);
      setEvents(data.events);
      setBiblioteca(data.biblioteca);
      setReglas(data.reglas);
      setFestivos(data.festivos);
      setNovedades(data.novedades);
      setTurnosExtra(data.turnosExtra);
      setReglasPersonal(data.reglasPersonal);
      setPlantillas(data.plantillas);
      setPlantillaItems(data.plantillaItems);
      setAvisos(data.avisos);
      setTemas(data.temas);
      setFormacion(await firmarArchivosFormacion(data.formacion));
      setVistos(data.vistos);
      setPreguntas(data.preguntas);
      setResultados(data.resultados);
      try { setUsuariosLista(await fetchUsuarios()); } catch (_) { setUsuariosLista([]); }
    } catch (err) {
      setLoadError(err.message || "No se pudo conectar a Supabase.");
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => { if (session && session.aprobado !== false) loadAll(); }, [session]);

  async function cambiarServicio(id) {
    if (id === servicioActualId) { setServicioSelectorAbierto(false); return; }
    setServicioSelectorAbierto(false);
    await loadAll(id);
  }
  async function crearServicio(nombre, institucionId, modulosElegidos) {
    setSaving(true);
    try {
      const nuevo = await insertServicioRemote(nombre, institucionId || INSTITUCION_ACTUAL, modulosElegidos);
      await insertReglasDefaultRemote(nuevo.id);
      setServicios((prev) => [...prev, nuevo]);
      setServicioModal(false);
      showToast(`Servicio "${nombre}" creado`);
      return nuevo;
    } catch (err) {
      showToast(`No se pudo crear: ${err.message}`, "warn");
      return null;
    } finally {
      setSaving(false);
    }
  }
  async function entrarAServicio(id, vista = "dashboard") {
    setView(vista);
    if (id !== servicioActualId) await loadAll(id);
  }
  async function renombrarServicio(id, nombre) {
    try {
      const actualizado = await renombrarServicioRemote(id, nombre);
      setServicios((prev) => prev.map((s) => (s.id === id ? actualizado : s)));
      showToast("Servicio renombrado");
    } catch (err) {
      showToast(`No se pudo renombrar: ${err.message}`, "warn");
    }
  }

  // Si el refresco del token llega a fallar (ej. la sesión fue revocada),
  // cerramos sesión localmente para que la persona vuelva a entrar.
  React.useEffect(() => {
    onSesionExpirada = () => {
      ACCESS_TOKEN = null;
      REFRESH_TOKEN = null;
      borrarSesionLocal();
      setSession(null);
      showToast("Tu sesión expiró, vuelve a iniciar sesión", "warn");
    };
    return () => { onSesionExpirada = () => {}; };
  }, []);

  // Renueva el token de acceso cada 45 minutos mientras haya sesión activa,
  // para que nunca llegue a vencerse en medio de un guardado (por defecto
  // Supabase los vence cada hora).
  React.useEffect(() => {
    if (!session) return;
    const id = setInterval(() => { refrescarSesion().catch(() => {}); }, 45 * 60 * 1000);
    return () => clearInterval(id);
  }, [session]);

  // Revisa cada 5 minutos si un Maestro desactivó esta cuenta mientras
  // tenía la sesión abierta, para cerrarla de inmediato.
  React.useEffect(() => {
    if (!session) return;
    const id = setInterval(async () => {
      try {
        const propio = await fetchOwnUsuario();
        if (propio && propio.activo === false) onSesionExpirada();
      } catch (_) {}
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [session]);

  function handleLogout() {
    ACCESS_TOKEN = null;
    REFRESH_TOKEN = null;
    borrarSesionLocal();
    setSession(null);
    setEvents([]);
    setPersonal([]);
    setBiblioteca([]);
    setLoadError(null);
  }

  if (recoveryToken) {
    return <ResetPasswordScreen token={recoveryToken} theme={theme} setTheme={setTheme} onDone={() => { window.location.hash = ""; setRecoveryToken(null); }} />;
  }

  if (recuperandoSesion) {
    return (
      <div data-theme={theme} style={{ background: T.base, color: T.ink, fontFamily: "'Inter', sans-serif" }} className="ev-root relative w-full min-h-[720px] flex items-center justify-center transition-colors duration-200">
        <style>{THEME_CSS}</style>
        <style>{APP_BASE_CSS}</style>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center animate-pulse" style={{ background: T.primarySoft }}>
          <LogoMark size={18} />
        </div>
      </div>
    );
  }

  if (!session) {
    if (mostrarLanding) {
      return <LandingPage onComenzar={() => setMostrarLanding(false)} theme={theme} setTheme={setTheme} />;
    }
    return <LoginScreen onLogin={(s) => setSession(s)} onVolver={() => setMostrarLanding(true)} theme={theme} setTheme={setTheme} codigoInicial={codigoInvitacionUrl} />;
  }

  if (session.aprobado === false) {
    return <PendienteScreen session={session} theme={theme} setTheme={setTheme} onAprobado={(s) => setSession(s)} onLogout={handleLogout} />;
  }

  const weekStart = addDays(monday, weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  async function saveEvent(form) {
    setSaving(true);
    try {
      if (modal?.mode === "edit") {
        await updateEventRemote(form);
      } else if (TURNO_TYPES.includes(form.type) && form.personalIds?.length > 0) {
        for (const pid of form.personalIds) {
          await insertEventRemote({ ...form, personalId: pid });
        }
      } else {
        await insertEventRemote(form);
      }
      setEvents(await fetchEventsRemote(SERVICIO_ACTUAL));
      setModal(null);
      showToast(modal?.mode === "edit" ? "Actualizado en Supabase" : "Guardado en Supabase");
    } catch (err) {
      showToast(`No se pudo guardar: ${err.message}`, "warn");
    } finally {
      setSaving(false);
    }
  }
  async function deleteEvent(event) {
    try {
      await deleteEventRemote(event);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      setDetail(null);
      showToast("Eliminado de Supabase", "warn");
    } catch (err) {
      showToast(`No se pudo eliminar: ${err.message}`, "warn");
    }
  }
  async function eliminarTurnosDeFechas(fechasISO) {
    const aBorrar = events.filter((e) => TURNO_TYPES.includes(e.type) && fechasISO.includes(e.date));
    if (aBorrar.length === 0) {
      showToast("No hay turnos en ese rango para borrar", "warn");
      return;
    }
    setSaving(true);
    try {
      for (const ev of aBorrar) {
        await deleteEventRemote(ev);
      }
      setEvents((prev) => prev.filter((e) => !(TURNO_TYPES.includes(e.type) && fechasISO.includes(e.date))));
      showToast(`${aBorrar.length} turno(s) eliminado(s)`, "warn");
    } catch (err) {
      showToast(`No se pudo borrar todo: ${err.message}`, "warn");
      setEvents(await fetchEventsRemote(SERVICIO_ACTUAL));
    } finally {
      setSaving(false);
    }
  }
  async function toggleEstado(id) {
    const current = personal.find((p) => p.id === id)?.estado;
    try {
      const updated = await toggleEstadoRemote(id, current);
      setPersonal((prev) => prev.map((p) => (p.id === id ? updated : p)));
      showToast("Estado actualizado en Supabase");
    } catch (err) {
      showToast(`No se pudo actualizar: ${err.message}`, "warn");
    }
  }
  async function generarVinculoTelegram(persona) {
    try {
      const codigo = await generarVinculoTelegramRemote(persona.id);
      setTelegramVinculoModal({ persona, codigo });
    } catch (err) {
      showToast(`No se pudo generar el código: ${err.message}`, "warn");
    }
  }
  async function desvincularTelegram(id) {
    try {
      const updated = await desvincularTelegramRemote(id);
      setPersonal((prev) => prev.map((p) => (p.id === id ? updated : p)));
      showToast("Telegram desvinculado", "warn");
    } catch (err) {
      showToast(`No se pudo desvincular: ${err.message}`, "warn");
    }
  }
  async function savePersonal(form) {
    setSaving(true);
    try {
      const saved = personalModal?.mode === "edit" ? await updatePersonalRemote(form) : await insertPersonalRemote(form);
      setPersonal((prev) => {
        const exists = prev.some((p) => p.id === saved.id);
        return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved].sort((a, b) => a.nombre.localeCompare(b.nombre));
      });
      setPersonalModal(null);
      showToast(personalModal?.mode === "edit" ? "Persona actualizada" : "Persona registrada");
    } catch (err) {
      showToast(`No se pudo guardar: ${err.message}`, "warn");
    } finally {
      setSaving(false);
    }
  }
  async function deletePersonal(id) {
    try {
      await deletePersonalRemote(id);
      setPersonal((prev) => prev.filter((p) => p.id !== id));
      showToast("Persona eliminada de Supabase", "warn");
    } catch (err) {
      showToast(`No se pudo eliminar: ${err.message}`, "warn");
    }
  }
  async function saveBiblioteca(form) {
    setSaving(true);
    try {
      const saved = bibModal?.mode === "edit" ? await updateBibliotecaRemote(form) : await insertBibliotecaRemote(form);
      setBiblioteca((prev) => {
        const exists = prev.some((b) => b.id === saved.id);
        return exists ? prev.map((b) => (b.id === saved.id ? saved : b)) : [...prev, saved];
      });
      setBibModal(null);
      showToast(bibModal?.mode === "edit" ? "Plantilla actualizada" : "Plantilla guardada");
    } catch (err) {
      showToast(`No se pudo guardar: ${err.message}`, "warn");
    } finally {
      setSaving(false);
    }
  }
  async function deleteBiblioteca(id) {
    try {
      await deleteBibliotecaRemote(id);
      setBiblioteca((prev) => prev.filter((b) => b.id !== id));
      showToast("Plantilla eliminada", "warn");
    } catch (err) {
      showToast(`No se pudo eliminar: ${err.message}`, "warn");
    }
  }
  async function saveReglas(form) {
    setSaving(true);
    try {
      const saved = await updateReglasRemote(form);
      setReglas(saved);
      showToast("Reglas actualizadas");
    } catch (err) {
      showToast(`No se pudo guardar: ${err.message}`, "warn");
    } finally {
      setSaving(false);
    }
  }
  async function addFestivo(form) {
    setSaving(true);
    try {
      const saved = await insertFestivoRemote(form);
      setFestivos((prev) => [...prev, saved].sort((a, b) => a.fecha.localeCompare(b.fecha)));
      setFestivoModal(false);
      showToast("Festivo agregado");
    } catch (err) {
      showToast(`No se pudo guardar: ${err.message}`, "warn");
    } finally {
      setSaving(false);
    }
  }
  async function deleteFestivo(id) {
    try {
      await deleteFestivoRemote(id);
      setFestivos((prev) => prev.filter((f) => f.id !== id));
      showToast("Festivo eliminado", "warn");
    } catch (err) {
      showToast(`No se pudo eliminar: ${err.message}`, "warn");
    }
  }
  async function confirmarPropuestaTurnos(propuestas) {
    setSaving(true);
    try {
      for (const p of propuestas) {
        await insertEventRemote(p);
      }
      setEvents(await fetchEventsRemote(SERVICIO_ACTUAL));
      showToast(`${propuestas.length} turno(s) guardado(s) en Supabase`);
    } catch (err) {
      showToast(`Se guardó parcialmente: ${err.message}`, "warn");
      setEvents(await fetchEventsRemote(SERVICIO_ACTUAL));
    } finally {
      setSaving(false);
    }
  }
  async function saveNovedad(form) {
    setSaving(true);
    try {
      const saved = await insertNovedadRemote(form);
      setNovedades((prev) => [saved, ...prev]);
      showToast("Novedad registrada");
    } catch (err) {
      showToast(`No se pudo guardar: ${err.message}`, "warn");
    } finally {
      setSaving(false);
    }
  }
  async function deleteNovedad(id) {
    try {
      await deleteNovedadRemote(id);
      setNovedades((prev) => prev.filter((n) => n.id !== id));
      showToast("Novedad eliminada", "warn");
    } catch (err) {
      showToast(`No se pudo eliminar: ${err.message}`, "warn");
    }
  }
  async function agregarTurnoExtra(form) {
    setSaving(true);
    try {
      if (!form.personalId) throw new Error("Falta elegir la persona.");
      if (!form.fecha) throw new Error("Falta la fecha.");
      if (!form.horas || Number(form.horas) <= 0) throw new Error("Las horas deben ser mayores a 0.");
      // Si por casualidad existe un turno real ese día/tipo para esa persona,
      // se enlaza (útil para reportes), pero nunca es obligatorio — la fecha,
      // el tipo de turno y las horas las decide quien registra, manualmente.
      const turnoReal = events.find((e) => e.personalId === form.personalId && e.date === form.fecha && e.type === form.tipoTurno);
      const saved = await insertTurnoExtraRemote({
        turnoId: turnoReal ? turnoReal.id : null, personalId: form.personalId, fecha: form.fecha,
        tipoTurno: form.tipoTurno, horas: Number(form.horas),
        cubrePersonalId: form.cubrePersonalId || null, motivo: form.motivo || "",
      });
      setTurnosExtra((prev) => [saved, ...prev]);
      showToast("Turno extra registrado");
      return true;
    } catch (err) {
      showToast(`No se pudo registrar: ${err.message}`, "warn");
      return false;
    } finally {
      setSaving(false);
    }
  }
  async function eliminarTurnoExtra(id) {
    try {
      await deleteTurnoExtraRemote(id);
      setTurnosExtra((prev) => prev.filter((t) => t.id !== id));
      showToast("Turno extra eliminado", "warn");
    } catch (err) {
      showToast(`No se pudo eliminar: ${err.message}`, "warn");
    }
  }
  async function saveReglaPersonal(form) {
    setSaving(true);
    try {
      const saved = await insertReglaPersonalRemote(form);
      setReglasPersonal((prev) => [...prev, saved]);
      showToast("Regla fija guardada");
    } catch (err) {
      showToast(`No se pudo guardar: ${err.message}`, "warn");
    } finally {
      setSaving(false);
    }
  }
  async function deleteReglaPersonal(id) {
    try {
      await deleteReglaPersonalRemote(id);
      setReglasPersonal((prev) => prev.filter((r) => r.id !== id));
      showToast("Regla fija eliminada", "warn");
    } catch (err) {
      showToast(`No se pudo eliminar: ${err.message}`, "warn");
    }
  }
  async function crearPlantilla(nombre) {
    setSaving(true);
    try {
      const saved = await insertPlantillaRemote(nombre);
      setPlantillas((prev) => [...prev, saved].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setPlantillaModal(false);
      setPlantillaEditorId(saved.id);
      showToast("Plantilla creada");
    } catch (err) {
      showToast(`No se pudo crear: ${err.message}`, "warn");
    } finally {
      setSaving(false);
    }
  }
  async function eliminarPlantilla(id) {
    try {
      await deletePlantillaRemote(id);
      setPlantillas((prev) => prev.filter((p) => p.id !== id));
      setPlantillaItems((prev) => prev.filter((it) => it.plantillaId !== id));
      showToast("Plantilla eliminada", "warn");
    } catch (err) {
      showToast(`No se pudo eliminar: ${err.message}`, "warn");
    }
  }
  async function agregarPlantillaItem(form) {
    setSaving(true);
    try {
      const saved = await insertPlantillaItemRemote(form);
      setPlantillaItems((prev) => [...prev, saved]);
      showToast("Actividad agregada a la plantilla");
    } catch (err) {
      showToast(`No se pudo guardar: ${err.message}`, "warn");
    } finally {
      setSaving(false);
    }
  }
  async function eliminarPlantillaItem(id) {
    try {
      await deletePlantillaItemRemote(id);
      setPlantillaItems((prev) => prev.filter((it) => it.id !== id));
      showToast("Actividad quitada de la plantilla", "warn");
    } catch (err) {
      showToast(`No se pudo eliminar: ${err.message}`, "warn");
    }
  }
  async function aplicarPlantilla(plantillaId, mondayISO) {
    const items = plantillaItems.filter((it) => it.plantillaId === plantillaId);
    if (items.length === 0) return;
    setSaving(true);
    try {
      for (const it of items) {
        const fecha = toISO(addDays(new Date(`${mondayISO}T00:00:00`), it.diaSemana));
        await insertEventRemote({
          type: it.tipo, title: it.nombre, date: fecha, start: it.horaInicio, end: it.horaFin,
          personalId: it.responsableId || "", metodologia: it.metodologia, objetivos: it.objetivos,
        });
      }
      setEvents(await fetchEventsRemote(SERVICIO_ACTUAL));
      setAplicarPlantillaModal(null);
      showToast(`${items.length} actividad(es) creada(s) para esa semana`);
    } catch (err) {
      showToast(`No se pudo aplicar la plantilla: ${err.message}`, "warn");
    } finally {
      setSaving(false);
    }
  }
  async function crearAviso(form) {
    setSaving(true);
    try {
      const saved = await insertAvisoRemote({ ...form, autor: session?.email || "" });
      setAvisos((prev) => [saved, ...prev]);
      setAvisoModal(false);
      showToast("Aviso publicado");
      fetch("/api/telegram-avisar-grupo", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ACCESS_TOKEN}` },
        body: JSON.stringify({ avisoId: saved.id }),
      }).catch(() => {}); // si falla el envío a Telegram, el aviso ya quedó publicado igual
    } catch (err) {
      showToast(`No se pudo publicar: ${err.message}`, "warn");
    } finally {
      setSaving(false);
    }
  }
  async function eliminarAviso(id) {
    try {
      await deleteAvisoRemote(id);
      setAvisos((prev) => prev.filter((a) => a.id !== id));
      showToast("Aviso eliminado", "warn");
    } catch (err) {
      showToast(`No se pudo eliminar: ${err.message}`, "warn");
    }
  }
  async function cambiarRolUsuario(id, rol) {
    try {
      const actualizado = await updateUsuarioRolRemote(id, rol);
      setUsuariosLista((prev) => prev.map((u) => (u.id === id ? actualizado : u)));
      showToast("Rol actualizado");
    } catch (err) {
      showToast(`No se pudo actualizar: ${err.message}`, "warn");
    }
  }
  async function aprobarUsuario(id, servicioId, rol = "lector") {
    try {
      if (servicioId && misMiembros) {
        await sb("miembros?on_conflict=usuario_id,servicio_id", {
          method: "POST", prefer: "resolution=merge-duplicates,return=minimal",
          body: JSON.stringify({ usuario_id: id, servicio_id: servicioId, rol }),
        });
      }
      const [row] = await sb(`usuarios?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ aprobado: true, activo: true }) });
      const actualizado = mapUsuario(row);
      if (!actualizado.aprobado) throw new Error("la base de datos no permitió el cambio");
      setUsuariosLista((prev) => prev.map((u) => (u.id === id ? actualizado : u)));
      showToast(`Acceso aprobado para ${actualizado.correo}`);
    } catch (err) {
      showToast(`No se pudo aprobar: ${err.message}`, "warn");
    }
  }
  async function toggleActivoUsuario(id, actual) {
    try {
      const actualizado = await updateUsuarioActivoRemote(id, !actual);
      setUsuariosLista((prev) => prev.map((u) => (u.id === id ? actualizado : u)));
      showToast(actual ? "Usuario desactivado" : "Usuario reactivado", actual ? "warn" : "ok");
    } catch (err) {
      showToast(`No se pudo actualizar: ${err.message}`, "warn");
    }
  }
  async function crearTema(nombre) {
    setSaving(true);
    try {
      const saved = await insertTemaRemote(nombre);
      setTemas((prev) => [...prev, saved].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setTemaModal(false);
      showToast("Tema creado");
    } catch (err) {
      showToast(`No se pudo crear: ${err.message}`, "warn");
    } finally {
      setSaving(false);
    }
  }
  async function eliminarTema(id) {
    if (!window.confirm("¿Eliminar este tema? Las actividades que tenía quedarán sin tema, no se borran.")) return;
    try {
      await deleteTemaRemote(id);
      setTemas((prev) => prev.filter((t) => t.id !== id));
      setBiblioteca((prev) => prev.map((b) => (b.temaId === id ? { ...b, temaId: null } : b)));
      showToast("Tema eliminado", "warn");
    } catch (err) {
      showToast(`No se pudo eliminar: ${err.message}`, "warn");
    }
  }
  async function subirFormacion(form, file) {
    setSubiendoArchivo(true);
    try {
      const { path, url } = await subirArchivoFormacion(file);
      const saved = await insertFormacionRemote({ ...form, archivoPath: path, archivoUrl: url, autor: session?.email || "" });
      const [firmado] = await firmarArchivosFormacion([saved]);
      setFormacion((prev) => [firmado, ...prev]);
      setFormacionModal(false);
      showToast("Contenido publicado");
    } catch (err) {
      showToast(`No se pudo subir: ${err.message}`, "warn");
    } finally {
      setSubiendoArchivo(false);
    }
  }
  async function eliminarFormacion(item) {
    if (!window.confirm(`¿Eliminar "${item.titulo}"? Esto borra también el archivo.`)) return;
    try {
      await deleteFormacionRemote(item);
      setFormacion((prev) => prev.filter((f) => f.id !== item.id));
      showToast("Contenido eliminado", "warn");
    } catch (err) {
      showToast(`No se pudo eliminar: ${err.message}`, "warn");
    }
  }
  async function marcarVisto(formacionId) {
    if (!session?.id) return;
    if (vistos.some((v) => v.formacionId === formacionId && v.usuarioId === session.id)) return;
    try {
      const saved = await marcarVistoRemote(formacionId, session.id);
      setVistos((prev) => [...prev, saved]);
      showToast("Marcado como visto");
    } catch (err) {
      showToast(`No se pudo registrar: ${err.message}`, "warn");
    }
  }
  async function guardarPregunta(form) {
    setSaving(true);
    try {
      const saved = await insertPreguntaRemote(form);
      setPreguntas((prev) => [...prev, saved]);
      showToast("Pregunta agregada");
    } catch (err) {
      showToast(`No se pudo guardar: ${err.message}`, "warn");
    } finally {
      setSaving(false);
    }
  }
  async function eliminarPregunta(id) {
    try {
      await deletePreguntaRemote(id);
      setPreguntas((prev) => prev.filter((p) => p.id !== id));
      showToast("Pregunta eliminada", "warn");
    } catch (err) {
      showToast(`No se pudo eliminar: ${err.message}`, "warn");
    }
  }
  async function enviarResultado(formacionId, correctas, total) {
    if (!session?.id) return;
    setSaving(true);
    try {
      const existente = resultados.find((r) => r.formacionId === formacionId && r.usuarioId === session.id);
      const calificacion = total > 0 ? Math.round((correctas / total) * 100) : 0;
      const saved = await guardarResultadoRemote({ formacionId, usuarioId: session.id, correctas, total, calificacion }, existente);
      setResultados((prev) => {
        const exists = prev.some((r) => r.id === saved.id);
        return exists ? prev.map((r) => (r.id === saved.id ? saved : r)) : [...prev, saved];
      });
      showToast(`Test enviado — obtuviste ${calificacion}%`);
      return calificacion;
    } catch (err) {
      showToast(`No se pudo enviar: ${err.message}`, "warn");
    } finally {
      setSaving(false);
    }
  }
  async function reemplazarTurno(turno, nuevoPersonalId) {
    setSaving(true);
    try {
      await updateEventRemote({ ...turno, personalId: nuevoPersonalId });
      setEvents(await fetchEventsRemote(SERVICIO_ACTUAL));
      showToast("Reemplazo confirmado");
    } catch (err) {
      showToast(`No se pudo reemplazar: ${err.message}`, "warn");
    } finally {
      setSaving(false);
    }
  }

  const ctx = {
    events, setEvents, personal, setPersonal, biblioteca, weekStart, weekDays, weekOffset, setWeekOffset,
    calMode, setCalMode, monthOffset, setMonthOffset, setModal, detail, setDetail, deleteEvent,
    toggleEstado, showToast, setView, saving, isMaestro, session, eliminarTurnosDeFechas,
    generarVinculoTelegram, desvincularTelegram, telegramVinculoModal, setTelegramVinculoModal,
    servicios, servicioActualId, servicioModal, setServicioModal, servicioSelectorAbierto, setServicioSelectorAbierto,
    cambiarServicio, crearServicio, renombrarServicio,
    personalModal, setPersonalModal, savePersonal, deletePersonal,
    bibModal, setBibModal, saveBiblioteca, deleteBiblioteca,
    reglas, saveReglas, festivos, addFestivo, deleteFestivo, festivoModal, setFestivoModal,
    confirmarPropuestaTurnos,
    novedades, saveNovedad, deleteNovedad,
    turnosExtra, agregarTurnoExtra, eliminarTurnoExtra,
    reglasPersonal, saveReglaPersonal, deleteReglaPersonal,
    plantillas, plantillaItems, plantillaModal, setPlantillaModal, plantillaEditorId, setPlantillaEditorId,
    crearPlantilla, eliminarPlantilla, agregarPlantillaItem, eliminarPlantillaItem,
    aplicarPlantillaModal, setAplicarPlantillaModal, aplicarPlantilla,
    avisos, avisoModal, setAvisoModal, crearAviso, eliminarAviso,
    usuariosLista, cambiarRolUsuario, toggleActivoUsuario, aprobarUsuario,
    temas, temaModal, setTemaModal, crearTema, eliminarTema,
    formacion, formacionModal, setFormacionModal, subiendoArchivo, subirFormacion, eliminarFormacion,
    vistos, preguntas, resultados, marcarVisto, guardarPregunta, eliminarPregunta, enviarResultado,
    testModal, setTestModal, gestionarTestModal, setGestionarTestModal, participacionModal, setParticipacionModal,
    reglaPersonalModal, setReglaPersonalModal,
    reemplazarTurno,
    esSuperadmin, servicioActual, institucionActual, instituciones, setInstituciones, setServicios, modulos,
    misMiembros, entrarAServicio, loadAll,
    licencias, setLicencias, licenciaActual, estadoLic, esMaestroDelServicio,
  };

  if (loading) {
    return (
      <div data-theme={theme} style={{ background: T.base, color: T.muted }} className="ev-root w-full min-h-[720px] flex items-center justify-center text-[13.5px]">
        <style>{THEME_CSS}</style>
        Conectando con Supabase…
      </div>
    );
  }
  if (loadError) {
    return (
      <div data-theme={theme} style={{ background: T.base }} className="ev-root w-full min-h-[720px] flex items-center justify-center p-6">
        <style>{THEME_CSS}</style>
        <style>{APP_BASE_CSS}</style>
        <div className="ev-card p-6 max-w-md text-center" style={{ background: T.surface }}>
          <AlertTriangle size={22} style={{ color: T.danger }} className="mx-auto mb-3" />
          <p className="font-semibold mb-2" style={{ color: T.ink }}>No se pudo conectar a Supabase</p>
          <p className="text-[12.5px] mb-4" style={{ color: T.muted }}>{loadError}</p>
          <p className="text-[11.5px] mb-4" style={{ color: T.muted }}>
            Verifica que ejecutaste schema.sql en el SQL Editor de tu proyecto y que la URL/llave son correctas.
          </p>
          <button onClick={loadAll} className="ev-btn px-4 py-2 text-[13px] text-white" style={{ background: T.primary }}>Reintentar</button>
        </div>
      </div>
    );
  }

  const licenciaBloqueada = (misLicencias || []).find((l) => l.estado === "bloqueada");
  if (!servicioActualId && !esSuperadmin && licenciaBloqueada) {
    return <LicenciaVencidaScreen licencia={licenciaBloqueada} session={session} theme={theme} setTheme={setTheme} onLogout={handleLogout} />;
  }
  if (!servicioActualId && !esSuperadmin) {
    return <SinServicioScreen session={session} theme={theme} setTheme={setTheme} onReintentar={() => loadAll()} onLogout={handleLogout} />;
  }

  return (
    <div
      data-theme={theme}
      style={{ background: T.base, color: T.ink, fontFamily: "'Inter', sans-serif" }}
      className="ev-root w-full min-h-[720px] flex text-[14px] transition-colors duration-200"
    >
      <style>{THEME_CSS}</style>
      <style>{APP_BASE_CSS}</style>
      <style>{`
        @media print {
          .no-print{ display:none !important; }
          .print-area{ box-shadow:none !important; border:none !important; }
        }
      `}</style>

      {/* Sidebar */}
      <aside
        className={`no-print group flex-col justify-between border-r transition-[width] duration-200 ease-in-out ${sidebarOpen ? "flex fixed inset-y-0 left-0 z-40 w-64" : "hidden"} lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-16 lg:hover:w-60 lg:overflow-hidden`}
        style={{ background: T.surface, borderColor: T.border, boxShadow: "1px 0 0 rgba(15,23,42,0.02)" }}
      >
        <div>
          <div className="px-5 pt-6 pb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ background: T.primarySoft }}>
                <LogoMark size={20} />
              </div>
              <span className="ev-display text-[19px] tracking-tight font-bold whitespace-nowrap lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150" style={{ color: T.ink }}>EVOLUCIONA</span>
            </div>
            <p className="text-[11px] mt-1 leading-snug whitespace-nowrap lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150" style={{ color: T.muted }}>
              Sistema inteligente de planificación de actividades y turnos
            </p>
          </div>
          <nav className="px-3 flex flex-col gap-1">
            {NAV.filter((n) => navVisible(n, { isMaestro, esSuperadmin, modulos })).map((n) => {
              const Icon = n.icon;
              const active = view === n.key;
              return (
                <button
                  key={n.key}
                  onClick={() => { setView(n.key); setSidebarOpen(false); }}
                  title={n.label}
                  className="ev-nav-item text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-[13.5px] font-medium"
                  style={{
                    background: active ? T.primarySoft : "transparent",
                    color: active ? T.primary : T.muted,
                  }}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="whitespace-nowrap lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150">{n.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="px-4 pb-5 pt-4 border-t lg:hidden lg:group-hover:block" style={{ borderColor: T.border }}>
          <div className="rounded-lg p-3 whitespace-nowrap" style={{ background: T.primarySoft }}>
            <p className="text-[11px] font-semibold" style={{ color: T.primary }}>V1.0 · MVP</p>
            <p className="text-[10.5px] mt-1" style={{ color: T.muted }}>
              V2 traerá asignación automática de turnos. V3, IA integrada.
            </p>
          </div>
        </div>
      </aside>
      {sidebarOpen && (
        <div className="no-print fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-16">
        <header
          className="no-print flex items-center justify-between px-5 lg:px-8 py-4 border-b"
          style={{ background: T.surface, borderColor: T.border }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden ev-btn p-2 rounded-lg" style={{ border: `1px solid ${T.border}` }} onClick={() => setSidebarOpen(true)}>
              <CalendarDays size={16} />
            </button>
            <h1 className="ev-display text-[20px] font-semibold truncate">{NAV.find((n) => n.key === view)?.label || "Dashboard"}</h1>
            <ServicioSelector ctx={ctx} />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: isMaestro ? T.primarySoft : T.accentSoft, color: isMaestro ? T.primaryDark : T.accentInk }}
            >
              {isMaestro ? <Shield size={11} /> : <Lock size={11} />} {esSuperadmin ? "Superadmin" : isMaestro ? "Maestro" : "Lector"}
            </span>
            <div className="hidden sm:flex items-center gap-2 pl-3 pr-1 py-1 rounded-full" style={{ border: `1px solid ${T.border}` }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold" style={{ background: T.primary }}>
                {session.email.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-[12.5px] font-medium pr-2">{session.email}</span>
            </div>
            <button onClick={handleLogout} className="ev-btn px-3 py-2 text-[12.5px]" style={{ border: `1px solid ${T.border}` }}>
              Cerrar sesión
            </button>
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto ev-scroll p-5 lg:p-8">
          <AvisoLicencia estado={estadoLic} licencia={licenciaActual} institucion={institucionActual} esMaestro={esMaestroDelServicio || esSuperadmin} />
          {view === "panel" && esSuperadmin && <PanelControl ctx={ctx} />}
          {(view === "dashboard" || NAV.some((n) => n.key === view && !navVisible(n, { isMaestro, esSuperadmin, modulos }))) && <Dashboard ctx={ctx} />}
          {view === "actividades" && modulos.actividades && <ActividadesCalendario ctx={ctx} />}
          {view === "turnos" && modulos.turnos && <TurnosCalendario ctx={ctx} />}
          {view === "novedades" && modulos.novedades && <Novedades ctx={ctx} />}
          {view === "biblioteca" && modulos.biblioteca && <Biblioteca ctx={ctx} />}
          {view === "formacion" && modulos.formacion && <FormacionContinua ctx={ctx} />}
          {view === "evo" && modulos.evo && <EvoChat ctx={ctx} />}
          {view === "personal" && isMaestro && modulos.personal && <Personal ctx={ctx} />}
          {view === "reportes" && isMaestro && modulos.reportes && <Reportes ctx={ctx} />}
          {view === "configuracion" && isMaestro && <Configuracion ctx={ctx} />}
        </main>
      </div>

      {modal && <EventModal ctx={ctx} onClose={() => setModal(null)} onSave={saveEvent} initial={modal} />}
      {detail && <DetailDrawer ctx={ctx} event={detail} onClose={() => setDetail(null)} onEdit={() => { setModal({ mode: "edit", event: detail }); setDetail(null); }} onDelete={() => deleteEvent(detail)} />}
      {personalModal && <PersonalModal ctx={ctx} onClose={() => setPersonalModal(null)} initial={personalModal} />}
      {bibModal && <BibliotecaModal ctx={ctx} onClose={() => setBibModal(null)} initial={bibModal} />}
      {plantillaModal && <NuevaPlantillaModal ctx={ctx} onClose={() => setPlantillaModal(false)} />}
      {temaModal && <TemaModal ctx={ctx} onClose={() => setTemaModal(false)} />}
      {servicioModal && <ServicioModal ctx={ctx} onClose={() => setServicioModal(false)} />}
      {telegramVinculoModal && <TelegramVinculoModal ctx={ctx} onClose={() => setTelegramVinculoModal(null)} />}
      {formacionModal && <FormacionModal ctx={ctx} onClose={() => setFormacionModal(false)} />}
      {testModal && <TestModal ctx={ctx} onClose={() => setTestModal(null)} />}
      {gestionarTestModal && <GestionarTestModal ctx={ctx} onClose={() => setGestionarTestModal(null)} />}
      {participacionModal && <ParticipacionModal ctx={ctx} onClose={() => setParticipacionModal(null)} />}
      {aplicarPlantillaModal && <AplicarPlantillaModal ctx={ctx} onClose={() => setAplicarPlantillaModal(null)} />}
      {avisoModal && <AvisoModal ctx={ctx} onClose={() => setAvisoModal(false)} />}
      {toast && <Toast toast={toast} />}
    </div>
  );
}

/* ============================== LOGIN ============================== */
const CARACTERISTICAS_LANDING = [
  { icon: CalendarDays, titulo: "Programador de actividades", texto: "Calendario semanal y mensual para organizar la jornada terapéutica día a día, con actividades simultáneas lado a lado y horarios en fracciones de hora." },
  { icon: Clock, titulo: "Turnos y generación automática", texto: "Arma el mes de turnos con un clic, respetando horas contratadas, descansos obligatorios, mínimos de personal y acompañamiento operador-auxiliar." },
  { icon: BookOpen, titulo: "Biblioteca de actividades", texto: "Plantillas reutilizables organizadas por tema, con buscador, para no reinventar la metodología de cada actividad cada semana." },
  { icon: GraduationCap, titulo: "Formación continua", texto: "Infografías, videos y PDFs para el equipo, con seguimiento de quién los vio y tests cortos de comprensión." },
  { icon: Bot, titulo: "Evo, tu asistente de IA", texto: "Responde preguntas usando solo el contenido real de tu plataforma — nunca inventa — y ayuda a redactar notas de actividad." },
  { icon: Megaphone, titulo: "Avisos y recordatorios por Telegram", texto: "Cada persona recibe un recordatorio de su turno del día siguiente, y el equipo completo puede recibir los avisos del tablero en su propio grupo." },
  { icon: Building2, titulo: "Multi-servicio", texto: "Administra varias sedes o unidades desde una sola cuenta, cada una con su propio personal y sus propias reglas de turno." },
  { icon: FileBarChart, titulo: "Reportes listos para presentar", texto: "Exporta a Excel o PDF el resumen de turnos y de personal, con el calendario incluido." },
];

function LandingPage({ onComenzar, theme, setTheme }) {
  return (
    <div data-theme={theme} style={{ background: T.base, color: T.ink, fontFamily: "'Inter', sans-serif" }} className="ev-root relative w-full min-h-[720px] transition-colors duration-200">
      <style>{THEME_CSS}</style>
      <style>{APP_BASE_CSS}</style>

      <header className="flex items-center justify-between px-6 lg:px-12 py-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: T.primarySoft }}>
            <LogoMark size={20} />
          </div>
          <span className="ev-display text-[18px] font-bold">EVOLUCIONA</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <button onClick={onComenzar} className="ev-btn px-4 py-2 text-[13px] text-white" style={{ background: T.primary }}>
            Iniciar sesión
          </button>
        </div>
      </header>

      <main className="px-6 lg:px-12 pb-16">
        <section className="max-w-2xl mx-auto text-center pt-10 pb-14">
          <span className="inline-block px-3 py-1 rounded-full text-[11.5px] font-semibold mb-4" style={{ background: T.primarySoft, color: T.primaryDark }}>
            Sistema inteligente de planificación
          </span>
          <h1 className="ev-display text-[32px] sm:text-[38px] font-bold leading-tight mb-3">
            La operación diaria de tu equipo terapéutico, en un solo lugar
          </h1>
          <p className="text-[15px] leading-relaxed mb-7" style={{ color: T.muted }}>
            Evoluciona organiza actividades, turnos, formación continua y comunicación con tu equipo —
            con generación automática de turnos e IA integrada, pensado para instituciones de salud y bienestar.
          </p>
          <button onClick={onComenzar} className="ev-btn px-6 py-3 text-[14px] text-white" style={{ background: T.primary }}>
            Iniciar sesión <ArrowRight size={16} />
          </button>
        </section>

        <section className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CARACTERISTICAS_LANDING.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.titulo} className="ev-card ev-card-hover p-5 flex flex-col gap-2.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: T.primarySoft }}>
                  <Icon size={18} style={{ color: T.primary }} />
                </div>
                <h3 className="font-semibold text-[13.5px]">{c.titulo}</h3>
                <p className="text-[12px] leading-relaxed" style={{ color: T.muted }}>{c.texto}</p>
              </div>
            );
          })}
        </section>

        <section className="max-w-2xl mx-auto text-center pt-16">
          <p className="text-[13px] mb-4" style={{ color: T.muted }}>¿Ya tienes cuenta en tu institución?</p>
          <button onClick={onComenzar} className="ev-btn px-5 py-2.5 text-[13px]" style={{ border: `1px solid ${T.border}` }}>
            Iniciar sesión o crear cuenta
          </button>
        </section>
      </main>

      <footer className="text-center py-6 text-[11.5px]" style={{ color: T.muted }}>
        EVOLUCIONA — Tecnología que acompaña el progreso
      </footer>
    </div>
  );
}

// Si la cuenta está pendiente y hay un código de invitación (escrito al
// registrarse o recibido por enlace), intenta canjearlo. Devuelve el usuario
// actualizado, o el mismo si no había código o no fue válido.
async function intentarCanjeAutomatico(propio, codigo) {
  if (!propio || propio.aprobado || !codigo) return { propio, errorCodigo: null };
  try {
    const r = await canjearInvitacionRemote(codigo);
    if (r.ok) {
      olvidarCodigoInvitacion();
      return { propio: (await fetchOwnUsuario()) || propio, errorCodigo: null };
    }
    return { propio, errorCodigo: r.error || "El código no es válido." };
  } catch (err) {
    return { propio, errorCodigo: err.message };
  }
}

function LoginScreen({ onLogin, onVolver, theme, setTheme, codigoInicial }) {
  const [mode, setMode] = useState(codigoInicial ? "signup" : "signin"); // 'signin' | 'signup' | 'recover'
  const [form, setForm] = useState({ nombre: "", correo: "", password: "", codigo: codigoInicial || codigoInvitacionGuardado() });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "recover") {
        await authRecover(form.correo, window.location.origin);
        setNotice("Si ese correo está registrado, te llegará un enlace para crear una nueva contraseña. Revisa también spam.");
      } else if (mode === "signup") {
        const res = await authSignUp(form.correo, form.password);
        // Supabase responde "ok" aunque el correo ya exista (para no revelar qué
        // correos están registrados), pero sin identidades: así se detecta.
        const usuarioCreado = res.user || res;
        if (!res.access_token && Array.isArray(usuarioCreado?.identities) && usuarioCreado.identities.length === 0) {
          setError("Ese correo ya tiene una cuenta en Evoluciona. Inicia sesión, o usa \"¿Olvidaste tu contraseña?\" si no la recuerdas.");
          setMode("signin");
          return;
        }
        if (res.access_token) {
          ACCESS_TOKEN = res.access_token;
          REFRESH_TOKEN = res.refresh_token;
          guardarSesionLocal();
          try {
            await sb("usuarios", {
              method: "POST",
              body: JSON.stringify({ id: res.user?.id, nombre: form.nombre || form.correo, correo: form.correo, rol: "lector" }),
            });
          } catch (_) { /* la cuenta ya quedó creada; el registro en "usuarios" se puede reintentar luego */ }
          const { propio } = await intentarCanjeAutomatico(await fetchOwnUsuario(), form.codigo.trim());
          onLogin(sesionDesdeUsuario(propio, form.correo));
        } else {
          // El código se guarda en el dispositivo para canjearlo en el primer inicio de sesión.
          if (form.codigo.trim()) { try { window.localStorage.setItem(INVITACION_LOCAL_KEY, form.codigo.trim().toUpperCase()); } catch (_) {} }
          setNotice("Cuenta creada. Si tu proyecto exige confirmar el correo, revisa tu bandeja y luego inicia sesión aquí.");
          setMode("signin");
        }
      } else {
        const res = await authSignIn(form.correo, form.password);
        ACCESS_TOKEN = res.access_token;
        REFRESH_TOKEN = res.refresh_token;
        guardarSesionLocal();
        let propio = await fetchOwnUsuario();
        if (!propio) {
          // Pasa cuando el registro exigió confirmar el correo: la fila en
          // "usuarios" no se pudo crear en ese momento porque aún no había
          // sesión activa. La creamos ahora, en el primer inicio de sesión real.
          try {
            await sb("usuarios", {
              method: "POST",
              body: JSON.stringify({ id: res.user?.id, nombre: form.correo, correo: form.correo, rol: "lector" }),
            });
          } catch (_) { /* si falla, sigue como lector hasta que un maestro la revise */ }
          propio = await fetchOwnUsuario();
        }
        if (propio && propio.activo === false) {
          ACCESS_TOKEN = null;
          REFRESH_TOKEN = null;
          borrarSesionLocal();
          setError("Tu cuenta fue desactivada por un administrador. Contacta a un usuario Maestro.");
          return;
        }
        ({ propio } = await intentarCanjeAutomatico(propio, codigoInvitacionGuardado()));
        onLogin(sesionDesdeUsuario(propio, form.correo));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-theme={theme} style={{ background: T.base, color: T.ink, fontFamily: "'Inter', sans-serif" }} className="ev-root relative w-full min-h-[720px] flex items-center justify-center p-6 transition-colors duration-200">
      <style>{THEME_CSS}</style>
      <style>{APP_BASE_CSS}</style>
      <div className="absolute top-5 left-5">
        {onVolver && (
          <button onClick={onVolver} className="ev-btn px-3 py-1.5 text-[12.5px]" style={{ border: `1px solid ${T.border}`, color: T.muted }}>
            <ChevronLeft size={14} /> Volver
          </button>
        )}
      </div>
      <div className="absolute top-5 right-5">
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
      <form onSubmit={submit} className="ev-card w-full max-w-sm p-6" style={{ background: T.surface }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: T.primarySoft }}>
            <LogoMark size={20} />
          </div>
          <span className="ev-display text-[19px] font-bold" style={{ color: T.ink }}>EVOLUCIONA</span>
        </div>
        <p className="text-[12px] mb-5" style={{ color: T.muted }}>
          {mode === "signin" ? "Inicia sesión para continuar" : mode === "signup" ? "Crea tu cuenta. Un Maestro debe aprobarla, o puedes usar un código de invitación." : "Te enviaremos un enlace para restablecer tu contraseña"}
        </p>

        {mode === "signup" && (
          <Field label="Nombre completo">
            <input required value={form.nombre} onChange={(e) => set("nombre", e.target.value)} style={inputStyle} placeholder="Diana Silva" />
          </Field>
        )}
        <div className="mt-3">
          <Field label="Correo">
            <input required type="email" value={form.correo} onChange={(e) => set("correo", e.target.value)} style={inputStyle} placeholder="tu@institucion.com" />
          </Field>
        </div>
        {mode !== "recover" && (
          <div className="mt-3">
            <Field label="Contraseña">
              <input required type="password" minLength={6} value={form.password} onChange={(e) => set("password", e.target.value)} style={inputStyle} placeholder="Mínimo 6 caracteres" />
            </Field>
          </div>
        )}
        {mode === "signup" && (
          <div className="mt-3">
            <Field label="Código de invitación (opcional)">
              <input
                value={form.codigo}
                onChange={(e) => set("codigo", e.target.value.toUpperCase())}
                style={{ ...inputStyle, letterSpacing: "0.12em" }}
                className="ev-mono"
                placeholder="Ej. K7MP2QXA"
                autoCapitalize="characters"
              />
            </Field>
            <p className="text-[11.5px] mt-1" style={{ color: T.muted }}>Si te lo dieron, tu cuenta queda activa al instante. Si no, un Maestro la revisará.</p>
          </div>
        )}

        {error && <p className="text-[12px] mt-3 rounded-lg px-3 py-2" style={{ background: T.dangerSoft, color: T.danger }}>{error}</p>}
        {notice && <p className="text-[12px] mt-3 rounded-lg px-3 py-2" style={{ background: T.accentSoft, color: T.accentInk }}>{notice}</p>}

        <button type="submit" disabled={loading} className="ev-btn w-full justify-center px-4 py-2.5 text-[13px] text-white mt-4 disabled:opacity-50" style={{ background: T.primary }}>
          {loading ? "Un momento…" : mode === "signin" ? "Iniciar sesión" : mode === "signup" ? "Crear cuenta" : "Enviar enlace de recuperación"}
        </button>

        {mode === "signin" && (
          <button
            type="button"
            onClick={() => { setMode("recover"); setError(null); setNotice(null); }}
            className="w-full text-center text-[12px] mt-2.5"
            style={{ color: T.muted }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}

        <button
          type="button"
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setNotice(null); }}
          className="w-full text-center text-[12.5px] mt-3 font-medium"
          style={{ color: T.primary }}
        >
          {mode === "recover" ? "¿Ya la recordaste? Inicia sesión" : mode === "signin" ? "¿No tienes cuenta? Crear una" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </form>
    </div>
  );
}

function ResetPasswordScreen({ token, theme, setTheme, onDone }) {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (password !== password2) { setError("Las dos contraseñas no coinciden."); return; }
    setLoading(true);
    try {
      await authUpdatePassword(token, password);
      setOk(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-theme={theme} style={{ background: T.base, color: T.ink, fontFamily: "'Inter', sans-serif" }} className="ev-root relative w-full min-h-[720px] flex items-center justify-center p-6 transition-colors duration-200">
      <style>{THEME_CSS}</style>
      <style>{APP_BASE_CSS}</style>
      <div className="absolute top-5 right-5">
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
      <div className="ev-card w-full max-w-sm p-6" style={{ background: T.surface }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: T.primarySoft }}>
            <LogoMark size={20} />
          </div>
          <span className="ev-display text-[19px] font-bold" style={{ color: T.ink }}>EVOLUCIONA</span>
        </div>

        {ok ? (
          <>
            <p className="text-[13px] mt-4 mb-5" style={{ color: T.muted }}>Tu contraseña quedó actualizada. Ya puedes iniciar sesión con la nueva.</p>
            <button onClick={onDone} className="ev-btn w-full justify-center px-4 py-2.5 text-[13px] text-white" style={{ background: T.primary }}>
              Ir a iniciar sesión
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="text-[12px] mb-5" style={{ color: T.muted }}>Crea una nueva contraseña para tu cuenta.</p>
            <Field label="Nueva contraseña">
              <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} placeholder="Mínimo 6 caracteres" />
            </Field>
            <div className="mt-3">
              <Field label="Confirmar contraseña">
                <input required type="password" minLength={6} value={password2} onChange={(e) => setPassword2(e.target.value)} style={inputStyle} placeholder="Repite la contraseña" />
              </Field>
            </div>
            {error && <p className="text-[12px] mt-3 rounded-lg px-3 py-2" style={{ background: T.dangerSoft, color: T.danger }}>{error}</p>}
            <button type="submit" disabled={loading} className="ev-btn w-full justify-center px-4 py-2.5 text-[13px] text-white mt-4 disabled:opacity-50" style={{ background: T.primary }}>
              {loading ? "Guardando…" : "Guardar nueva contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ============================== CUENTA PENDIENTE ============================== */
// Lo que ve una persona que creó su cuenta pero todavía no tiene acceso: puede
// esperar a que un Maestro la apruebe, o escribir un código de invitación.
function PendienteScreen({ session, theme, setTheme, onAprobado, onLogout }) {
  const [codigo, setCodigo] = useState(() => codigoInvitacionGuardado());
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  async function revisarDeNuevo() {
    setCargando(true);
    setError(null);
    setAviso(null);
    try {
      const propio = await fetchOwnUsuario();
      if (propio && propio.activo === false) {
        setError("Tu cuenta fue desactivada. Contacta a un Maestro de tu institución.");
      } else if (propio && propio.aprobado) {
        onAprobado(sesionDesdeUsuario(propio));
      } else {
        setAviso("Tu cuenta sigue pendiente. Te avisaremos aquí apenas la aprueben.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function canjear(e) {
    e.preventDefault();
    if (!codigo.trim()) return;
    setCargando(true);
    setError(null);
    setAviso(null);
    try {
      const r = await canjearInvitacionRemote(codigo.trim());
      if (!r.ok) {
        setError(r.error || "Ese código no es válido.");
        return;
      }
      olvidarCodigoInvitacion();
      const propio = await fetchOwnUsuario();
      onAprobado(sesionDesdeUsuario(propio));
    } catch (err) {
      setError(/canjear_invitacion/i.test(err.message) ? "Los códigos de invitación aún no están habilitados. Pide a un Maestro que apruebe tu cuenta." : err.message);
    } finally {
      setCargando(false);
    }
  }

  // Revisa sola cada 30 segundos, por si un Maestro la aprueba mientras espera.
  React.useEffect(() => {
    const id = setInterval(async () => {
      try {
        const propio = await fetchOwnUsuario();
        if (propio && propio.aprobado && propio.activo !== false) onAprobado(sesionDesdeUsuario(propio));
      } catch (_) {}
    }, 30 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div data-theme={theme} style={{ background: T.base, color: T.ink, fontFamily: "'Inter', sans-serif" }} className="ev-root relative w-full min-h-[720px] flex items-center justify-center p-6 transition-colors duration-200">
      <style>{THEME_CSS}</style>
      <style>{APP_BASE_CSS}</style>
      <div className="absolute top-5 right-5">
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
      <div className="ev-card w-full max-w-sm p-6" style={{ background: T.surface }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: T.primarySoft }}>
            <LogoMark size={20} />
          </div>
          <span className="ev-display text-[19px] font-bold" style={{ color: T.ink }}>EVOLUCIONA</span>
        </div>

        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: T.primarySoft }}>
          <Clock size={20} style={{ color: T.primary }} />
        </div>
        <h2 className="ev-display text-[18px] font-bold mb-1.5">Tu cuenta está pendiente</h2>
        <p className="text-[13px] leading-relaxed" style={{ color: T.muted }}>
          Creaste tu cuenta con <strong style={{ color: T.ink }}>{session.email}</strong>. Para proteger la información de la institución, un Maestro debe aprobarla antes de que puedas entrar.
        </p>

        <form onSubmit={canjear} className="mt-5 pt-5 border-t" style={{ borderColor: T.border }}>
          <Field label="¿Tienes un código de invitación?">
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ej. K7MP2QXA"
              autoCapitalize="characters"
              className="ev-mono"
              style={{ ...inputStyle, letterSpacing: "0.12em" }}
            />
          </Field>
          <button type="submit" disabled={cargando || !codigo.trim()} className="ev-btn w-full justify-center px-4 py-2.5 text-[13px] text-white mt-3 disabled:opacity-50" style={{ background: T.primary }}>
            {cargando ? "Un momento…" : "Activar con este código"}
          </button>
        </form>

        {error && <p className="text-[12px] mt-3 rounded-lg px-3 py-2" style={{ background: T.dangerSoft, color: T.danger }}>{error}</p>}
        {aviso && <p className="text-[12px] mt-3 rounded-lg px-3 py-2" style={{ background: T.accentSoft, color: T.accentInk }}>{aviso}</p>}

        <div className="flex gap-2 mt-4">
          <button onClick={revisarDeNuevo} disabled={cargando} className="ev-btn flex-1 justify-center px-3 py-2 text-[12.5px] disabled:opacity-50" style={{ border: `1px solid ${T.border}` }}>
            Ya me aprobaron
          </button>
          <button onClick={onLogout} className="ev-btn flex-1 justify-center px-3 py-2 text-[12.5px]" style={{ border: `1px solid ${T.border}`, color: T.muted }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

function SinServicioScreen({ session, theme, setTheme, onReintentar, onLogout }) {
  return (
    <div data-theme={theme} style={{ background: T.base, color: T.ink, fontFamily: "'Inter', sans-serif" }} className="ev-root relative w-full min-h-[720px] flex items-center justify-center p-6">
      <style>{THEME_CSS}</style>
      <style>{APP_BASE_CSS}</style>
      <div className="absolute top-5 right-5"><ThemeToggle theme={theme} setTheme={setTheme} /></div>
      <div className="ev-card w-full max-w-sm p-6" style={{ background: T.surface }}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: T.primarySoft }}>
          <Building2 size={20} style={{ color: T.primary }} />
        </div>
        <h2 className="ev-display text-[18px] font-bold mb-1.5">Aún no tienes un servicio asignado</h2>
        <p className="text-[13px] leading-relaxed" style={{ color: T.muted }}>
          Tu cuenta <strong style={{ color: T.ink }}>{session.email}</strong> está aprobada, pero todavía no pertenece a ningún servicio. Pídele a un Maestro de tu servicio que te agregue, o usa un código de invitación.
        </p>
        <div className="flex gap-2 mt-5">
          <button onClick={onReintentar} className="ev-btn flex-1 justify-center px-3 py-2 text-[12.5px] text-white" style={{ background: T.primary }}>Volver a revisar</button>
          <button onClick={onLogout} className="ev-btn flex-1 justify-center px-3 py-2 text-[12.5px]" style={{ border: `1px solid ${T.border}`, color: T.muted }}>Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}

/* ============================== LICENCIA ============================== */
// Franja informativa según el estado de la licencia de la institución:
// por vencer → solo la ven los Maestros; solo lectura → la ven todos.
function AvisoLicencia({ estado, licencia, institucion, esMaestro }) {
  if (!licencia || estado === "activa" || estado === "bloqueada") return null;
  if (estado === "por_vencer" && !esMaestro) return null;
  const nombre = institucion?.nombre || "tu institución";
  const faltan = diasParaVencer(licencia);
  const porVencer = estado === "por_vencer";
  return (
    <div
      role="status"
      className="mb-5 flex items-start gap-3 rounded-xl px-4 py-3 text-[13px]"
      style={{
        background: porVencer ? T.accentSoft : T.dangerSoft,
        color: porVencer ? T.accentInk : T.danger,
        border: `1px solid color-mix(in srgb, ${porVencer ? T.primary : T.danger} 25%, transparent)`,
      }}
    >
      {porVencer ? <Clock size={16} className="shrink-0 mt-0.5" /> : <Lock size={16} className="shrink-0 mt-0.5" />}
      <p className="leading-relaxed">
        {porVencer ? (
          <>
            <strong>La licencia de {nombre} vence el {fechaLarga(licencia.vence)}</strong> ({faltan === 0 ? "hoy" : faltan === 1 ? "mañana" : `en ${faltan} días`}).
            {" "}Después habrá 15 días de solo lectura y luego se bloqueará el acceso. La información no se borra. Contacta al administrador para renovarla.
          </>
        ) : (
          <>
            <strong>La licencia de {nombre} venció el {fechaLarga(licencia.vence)}.</strong>
            {" "}Estás en modo solo lectura: puedes consultar todo, pero no crear ni editar. El {fechaLarga(fechaBloqueoISO(licencia))} se bloqueará el acceso. La información se conserva; contacta al administrador para renovarla.
          </>
        )}
      </p>
    </div>
  );
}

function LicenciaVencidaScreen({ licencia, session, theme, setTheme, onLogout }) {
  return (
    <div data-theme={theme} style={{ background: T.base, color: T.ink, fontFamily: "'Inter', sans-serif" }} className="ev-root relative w-full min-h-[720px] flex items-center justify-center p-6">
      <style>{THEME_CSS}</style>
      <style>{APP_BASE_CSS}</style>
      <div className="absolute top-5 right-5"><ThemeToggle theme={theme} setTheme={setTheme} /></div>
      <div className="ev-card w-full max-w-sm p-6" style={{ background: T.surface }}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: T.dangerSoft }}>
          <Lock size={20} style={{ color: T.danger }} />
        </div>
        <h2 className="ev-display text-[18px] font-bold mb-1.5">La licencia de {licencia.institucion} está vencida</h2>
        <p className="text-[13px] leading-relaxed" style={{ color: T.muted }}>
          {licencia.vence ? `Venció el ${fechaLarga(licencia.vence)}. ` : ""}
          Por eso el acceso está suspendido. <strong style={{ color: T.ink }}>Toda la información del servicio se conserva</strong> y vuelve a estar disponible apenas se renueve la licencia.
        </p>
        <p className="text-[12.5px] mt-3" style={{ color: T.muted }}>Contacta al administrador de Evoluciona o al responsable de tu institución.</p>
        <button onClick={onLogout} className="ev-btn w-full justify-center px-3 py-2.5 text-[13px] mt-5" style={{ border: `1px solid ${T.border}` }}>
          Cerrar sesión ({session.email})
        </button>
      </div>
    </div>
  );
}

/* ============================== TELEGRAM POR SERVICIO ============================== */
function TelegramServicioConfig({ ctx }) {
  const { servicioActualId, servicioActual, showToast, isMaestro } = ctx;
  const [fila, setFila] = useState(undefined); // undefined = cargando; null = sin fila
  const [error, setError] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  async function cargar() {
    setError(null);
    try {
      const rows = await sb(`servicio_telegram?servicio_id=eq.${servicioActualId}&select=*`);
      setFila(rows[0] || null);
    } catch (err) {
      setFila(null);
      setError(/servicio_telegram/i.test(err.message) ? "Falta correr el SQL de la etapa 3 en Supabase." : err.message);
    }
  }
  React.useEffect(() => { cargar(); }, [servicioActualId]);

  async function generarCodigo() {
    setTrabajando(true);
    try {
      const codigo = generarCodigoAleatorio();
      const expira = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const [row] = await sb("servicio_telegram?on_conflict=servicio_id", {
        method: "POST", prefer: "resolution=merge-duplicates,return=representation",
        body: JSON.stringify({ servicio_id: servicioActualId, codigo, codigo_expira: expira }),
      });
      setFila(row);
    } catch (err) {
      showToast(`No se pudo generar el código: ${err.message}`, "warn");
    } finally {
      setTrabajando(false);
    }
  }
  async function desvincular() {
    if (!window.confirm(`¿Desvincular el grupo "${fila.chat_nombre}" de ${servicioActual?.nombre}? Los avisos dejarán de llegar a ese grupo.`)) return;
    try {
      const [row] = await sb(`servicio_telegram?servicio_id=eq.${servicioActualId}`, { method: "PATCH", body: JSON.stringify({ chat_id: null, chat_nombre: null, vinculado_en: null }) });
      setFila(row);
      showToast("Grupo desvinculado", "warn");
    } catch (err) {
      showToast(`No se pudo desvincular: ${err.message}`, "warn");
    }
  }
  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); showToast("Copiado"); } catch (_) { window.prompt("Copia esto:", texto); }
  }

  const vinculado = fila?.chat_id;
  const codigoVigente = fila?.codigo && fila?.codigo_expira && new Date(fila.codigo_expira) > new Date();
  const comando = codigoVigente ? `/vincular@${TELEGRAM_BOT_USERNAME} ${fila.codigo}` : "";

  return (
    <div className="ev-card p-5">
      <h3 className="ev-display font-semibold text-[15px] mb-1">Grupo de Telegram de {servicioActual?.nombre || "este servicio"}</h3>
      <p className="text-[12px] mb-4" style={{ color: T.muted }}>
        Los avisos del tablero de este servicio también llegan a este grupo, y los que publiques para toda la institución llegan a los grupos de todos sus servicios. Es opcional: si el equipo usa WhatsApp, los avisos igual se ven aquí en el tablero.
      </p>

      {fila === undefined && <p className="text-[12.5px]" style={{ color: T.muted }}>Cargando…</p>}
      {error && <p className="text-[12.5px]" style={{ color: T.danger }}>{error}</p>}

      {fila !== undefined && !error && vinculado && (
        <div className="flex items-center justify-between gap-3 flex-wrap px-3.5 py-3 rounded-xl" style={{ background: T.primarySoft }}>
          <span className="flex items-center gap-2 text-[13px]" style={{ color: T.primaryDark }}>
            <CheckCircle2 size={16} /> Vinculado a <strong>"{fila.chat_nombre}"</strong>
          </span>
          {isMaestro && (
            <span className="flex gap-2">
              <button onClick={generarCodigo} disabled={trabajando} className="ev-btn px-3 py-1.5 text-[12px] disabled:opacity-40" style={{ border: `1px solid ${T.border}`, background: T.surface }}>Cambiar de grupo</button>
              <button onClick={desvincular} className="ev-btn px-3 py-1.5 text-[12px]" style={{ background: T.surface, color: T.danger, border: `1px solid ${T.border}` }}>Desvincular</button>
            </span>
          )}
        </div>
      )}

      {fila !== undefined && !error && isMaestro && (!vinculado || codigoVigente) && (
        <div className={vinculado ? "mt-4" : ""}>
          {!codigoVigente ? (
            <button onClick={generarCodigo} disabled={trabajando} className="ev-btn px-3.5 py-2 text-[12.5px] text-white disabled:opacity-40" style={{ background: "#229ED9" }}>
              {trabajando ? "Generando…" : "Vincular un grupo de Telegram"}
            </button>
          ) : (
            <ol className="flex flex-col gap-3 text-[13px]">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0" style={{ background: T.primarySoft, color: T.primaryDark }}>1</span>
                <span>En Telegram, agrega a <strong>@{TELEGRAM_BOT_USERNAME}</strong> al grupo del equipo de {servicioActual?.nombre} (o crea el grupo si aún no existe).</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0" style={{ background: T.primarySoft, color: T.primaryDark }}>2</span>
                <span className="min-w-0 flex-1">
                  Escribe en ese grupo exactamente esto:
                  <span className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <code className="ev-mono text-[13px] px-2.5 py-1.5 rounded-lg break-all" style={{ background: T.base, border: `1px solid ${T.border}`, color: T.primaryDark }}>{comando}</code>
                    <button onClick={() => copiar(comando)} className="ev-btn px-2.5 py-1.5 text-[12px]" style={{ border: `1px solid ${T.border}` }}><Copy size={12} /> Copiar</button>
                  </span>
                  <span className="block text-[11.5px] mt-1" style={{ color: T.muted }}>El código vence a las {new Date(fila.codigo_expira).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}. El bot responderá "Listo" en el grupo.</span>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0" style={{ background: T.primarySoft, color: T.primaryDark }}>3</span>
                <span>Cuando el bot confirme, toca <button onClick={cargar} className="font-semibold underline" style={{ color: T.primary }}>revisar de nuevo</button>.</span>
              </li>
            </ol>
          )}
        </div>
      )}
      {fila !== undefined && !error && !isMaestro && !vinculado && (
        <p className="text-[12.5px]" style={{ color: T.muted }}>Este servicio no tiene grupo de Telegram vinculado.</p>
      )}
    </div>
  );
}

/* ============================== TOAST UI ============================== */
function Toast({ toast }) {
  const bg = toast.tone === "warn" ? T.dangerSoft : T.primarySoft;
  const fg = toast.tone === "warn" ? T.danger : T.primaryDark;
  return (
    <div className="no-print fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-[13px] font-medium" style={{ background: bg, color: fg }}>
      <CheckCircle2 size={16} />
      {toast.msg}
    </div>
  );
}

/* ============================== DASHBOARD ============================== */
// Alertas reales del dashboard: turnos próximos sin cubrir, personal que
// supera sus horas semanales, y personal inactivo con algo asignado.
function calcularAlertasDashboard(events, personal, reglas) {
  const alerts = [];
  const todayISO = toISO(TODAY);
  const monday = getMonday(TODAY);
  const semanaISO = Array.from({ length: 7 }, (_, i) => toISO(addDays(monday, i)));
  const proximos7ISO = Array.from({ length: 7 }, (_, i) => toISO(addDays(TODAY, i)));

  events
    .filter((e) => TURNO_TYPES.includes(e.type) && !e.personalId && proximos7ISO.includes(e.date))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)
    .slice(0, 5)
    .forEach((e) => {
      const diaTxt = new Date(`${e.date}T00:00:00`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "short" });
      alerts.push({ level: "danger", text: `${ACTIVITY_TYPES[e.type].label} del ${diaTxt} sin responsable asignado` });
    });

  personal
    .filter((p) => p.estado === "activo")
    .forEach((p) => {
      const horas = events
        .filter((e) => TURNO_TYPES.includes(e.type) && e.personalId === p.id && semanaISO.includes(e.date))
        .reduce((a, e) => a + horasEfectivas(e), 0);
      const limite = p.horas || reglas?.horasSemanaObjetivo || 44;
      if (horas > limite) {
        alerts.push({ level: "warn", text: `${p.nombre} supera las ${limite} horas semanales asignadas (${horas}h)` });
      }
    });

  personal
    .filter((p) => p.estado === "inactivo")
    .forEach((p) => {
      const tieneAsignado = events.some((e) => e.personalId === p.id && e.date >= todayISO);
      if (tieneAsignado) {
        alerts.push({ level: "warn", text: `${p.nombre} está inactivo y aparece en una actividad o turno próximo` });
      }
    });

  return alerts;
}

function Dashboard({ ctx }) {
  const { events, personal, reglas, setView, setModal, avisos, isMaestro, setAvisoModal, eliminarAviso, formacion } = ctx;
  const todayISO = toISO(TODAY);
  const todayEvents = events.filter((e) => e.date === todayISO).sort((a, b) => a.start - b.start);
  const activos = personal.filter((p) => p.estado === "activo").length;
  const turnosHoy = todayEvents.filter((e) => e.type === "turno_dia" || e.type === "turno_noche").length;
  const avisosVigentes = avisos.filter((a) => !a.fechaExpira || a.fechaExpira >= todayISO);

  const alerts = calcularAlertasDashboard(events, personal, reglas);

  const proximas = events
    .filter((e) => e.date >= todayISO)
    .sort((a, b) => (a.date + String(a.start).padStart(5, "0")).localeCompare(b.date + String(b.start).padStart(5, "0")))
    .slice(0, 6);

  const horasData = personal
    .filter((p) => p.estado === "activo")
    .map((p) => {
      const asignadas = events
        .filter((e) => e.personalId === p.id && (e.type === "turno_dia" || e.type === "turno_noche"))
        .reduce((acc, e) => acc + horasEfectivas(e), 0);
      return { nombre: p.nombre.split(" ")[0], Contratadas: p.horas, Asignadas: Math.round(asignadas) };
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Actividades hoy" value={todayEvents.length} icon={CalendarDays} />
        <StatCard label="Personal activo" value={activos} icon={Users} />
        <StatCard label="Turnos en curso" value={turnosHoy} icon={Clock} />
        <StatCard label="Alertas" value={alerts.length} icon={AlertTriangle} tone="warn" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="ev-card p-6 lg:col-span-2" style={{ border: `1px solid ${T.primary}30` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="ev-display font-bold text-[19px] flex items-center gap-2">
              <Megaphone size={20} style={{ color: T.primary }} /> Tablero de avisos
            </h3>
            {isMaestro && (
              <button onClick={() => setAvisoModal(true)} className="ev-btn px-3.5 py-2 text-[12.5px] text-white shrink-0" style={{ background: T.primary }}>
                <Plus size={15} /> Nuevo aviso
              </button>
            )}
          </div>
          <p className="text-[12.5px] mb-4" style={{ color: T.muted }}>Información puntual para el equipo: novedades de un paciente, avisos generales, etc.</p>
          <div className="grid sm:grid-cols-2 gap-3 overflow-y-auto ev-scroll" style={{ maxHeight: 360 }}>
            {avisosVigentes.map((a) => (
              <div key={a.id} className="rounded-xl p-4 flex flex-col gap-1.5" style={{ background: a.nivel === "importante" ? T.dangerSoft : T.primarySoft }}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-[14.5px]" style={{ color: a.nivel === "importante" ? T.danger : T.primaryDark }}>{a.titulo}</p>
                  {isMaestro && (
                    <button onClick={() => eliminarAviso(a.id)} className="shrink-0" style={{ color: T.muted }}><X size={14} /></button>
                  )}
                </div>
                <p className="text-[13px] leading-snug" style={{ color: T.ink }}>{a.mensaje}</p>
                {!a.servicioId && a.institucionId && <div><EtiquetaInstitucion item={a} ctx={ctx} /></div>}
                <p className="text-[10.5px] mt-0.5" style={{ color: T.muted }}>
                  {a.autor ? `${a.autor} · ` : ""}{new Date(a.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                </p>
              </div>
            ))}
            {avisosVigentes.length === 0 && (
              <p className="text-[12.5px] col-span-full text-center py-8" style={{ color: T.muted }}>No hay avisos publicados.</p>
            )}
          </div>
        </div>

        <div className="ev-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="ev-display font-semibold text-[15px]">Próximas actividades</h3>
            <button onClick={() => setView("actividades")} className="text-[12.5px] font-semibold flex items-center gap-1" style={{ color: T.primary }}>
              Ver calendario <ArrowRight size={13} />
            </button>
          </div>
          <div className="flex flex-col divide-y" style={{ borderColor: T.border }}>
            {proximas.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-3" style={{ borderColor: T.border }}>
                <span className="w-2 h-9 rounded-full shrink-0" style={{ background: ACTIVITY_TYPES[e.type].color }} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[13.5px] truncate">{e.title}</p>
                  <p className="text-[12px]" style={{ color: T.muted }}>
                    {ACTIVITY_TYPES[e.type].label} · {personName(e.personalId)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="ev-mono text-[12.5px] font-medium">{fmtRange(e.start, e.end)}</p>
                  <p className="text-[11px]" style={{ color: T.muted }}>
                    {e.date === todayISO ? "Hoy" : new Date(`${e.date}T00:00:00`).toLocaleDateString("es-CO", { weekday: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="ev-card px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-[12px] font-semibold shrink-0" style={{ color: T.muted }}>
              <AlertTriangle size={13} style={{ color: T.danger }} /> Alertas:
            </span>
            {alerts.map((a, i) => (
              <span key={i} className="rounded-full px-2.5 py-1 text-[11.5px]" style={{ background: a.level === "danger" ? T.dangerSoft : T.accentSoft, color: a.level === "danger" ? T.danger : T.accentInk }}>
                {a.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {ctx.modulos?.formacion !== false && (
      <div className="ev-card p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="ev-display font-semibold text-[15px] flex items-center gap-2">
            <GraduationCap size={15} style={{ color: T.primary }} /> Formación continua
          </h3>
          <button onClick={() => setView("formacion")} className="text-[12.5px] font-semibold flex items-center gap-1" style={{ color: T.primary }}>
            Ver todo <ArrowRight size={13} />
          </button>
        </div>
        <p className="text-[12px] mb-4" style={{ color: T.muted }}>Infografías, mapas mentales y videos cortos disponibles para el equipo</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {formacion.slice(0, 3).map((f) => (
            <button key={f.id} onClick={() => setView("formacion")} className="ev-card overflow-hidden text-left hover:shadow-md transition-shadow" style={{ border: `1px solid ${T.border}` }}>
              <div className="w-full flex items-center justify-center overflow-hidden" style={{ height: 90, background: T.base }}>
                {f.tipo === "video" ? (
                  <video src={f.archivoUrl} className="w-full h-full object-cover" />
                ) : f.tipo === "pdf" ? (
                  <FileText size={28} style={{ color: T.primaryDark }} />
                ) : (
                  <img src={f.archivoUrl} alt={f.titulo} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-2.5">
                <p className="text-[12px] font-semibold truncate">{f.titulo}</p>
                <p className="text-[10.5px]" style={{ color: T.muted }}>{TIPO_FORMACION[f.tipo] || f.tipo}</p>
              </div>
            </button>
          ))}
          {formacion.length === 0 && (
            <p className="text-[12.5px] col-span-full text-center py-6" style={{ color: T.muted }}>Todavía no hay contenido publicado.</p>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="ev-card p-4 flex items-start justify-between">
      <div>
        <p className="text-[12px] font-medium" style={{ color: T.muted }}>{label}</p>
        <p className="ev-display text-[26px] font-semibold mt-1">{value}</p>
      </div>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: tone === "warn" ? T.dangerSoft : T.primarySoft }}>
        <Icon size={16} style={{ color: tone === "warn" ? T.danger : T.primary }} />
      </div>
    </div>
  );
}

/* ============================== ACTIVIDADES (calendario) ============================== */
function ActividadesCalendario({ ctx }) {
  const { calMode, setCalMode, isMaestro } = ctx;
  return (
    <div className="flex flex-col gap-4">
      <ReadOnlyBanner isMaestro={isMaestro} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          {["semana", "mes"].map((m) => (
            <button
              key={m}
              onClick={() => setCalMode(m)}
              className="ev-btn px-3.5 py-1.5 text-[12.5px] capitalize"
              style={{ background: calMode === m ? T.primary : "transparent", color: calMode === m ? "#fff" : T.ink }}
            >
              {m}
            </button>
          ))}
        </div>
        <Legend types={ACTIVIDAD_TYPES} />
        {isMaestro && (
          <button
            onClick={() => ctx.setModal({ mode: "new", event: null, defaultType: ACTIVIDAD_TYPES[0] })}
            className="ev-btn px-3.5 py-2 text-[12.5px] text-white"
            style={{ background: T.primary }}
          >
            <Plus size={14} /> Nueva actividad
          </button>
        )}
      </div>
      {calMode === "semana" ? <WeekView ctx={ctx} types={ACTIVIDAD_TYPES} /> : <MonthView ctx={ctx} types={ACTIVIDAD_TYPES} />}
    </div>
  );
}

function esFinDeSemanaOFestivo(dISO, festivoSet, diasRefuerzo) {
  const dow = new Date(`${dISO}T00:00:00`).getDay();
  const nuestroDia = (dow + 6) % 7; // 0=lunes ... 6=domingo
  const dias = diasRefuerzo && diasRefuerzo.length ? diasRefuerzo : [5, 6]; // por defecto: sábado y domingo
  return dias.includes(nuestroDia) || festivoSet.has(dISO);
}
function minRequeridoTurno(dISO, tipo, reglas, festivoSet) {
  if (!reglas) return tipo === "turno_noche" ? 2 : 1;
  const base = tipo === "turno_noche" ? reglas.personalMinTurnoNoche : reglas.personalMinTurnoDia;
  return esFinDeSemanaOFestivo(dISO, festivoSet, reglas.diasRefuerzo) ? Math.max(base, reglas.personalMinFinSemanaFestivo) : base;
}

function esOperador(cargo, reglas) {
  return normalizarTexto(cargo).includes(normalizarTexto(reglas?.cargoOperador || "operador terapéutico"));
}
function esAuxiliar(cargo, reglas) {
  return normalizarTexto(cargo).includes(normalizarTexto(reglas?.cargoAuxiliar || "auxiliar de enfermería"));
}

/* ============================== MOTOR DE GENERACIÓN AUTOMÁTICA (borrador) ============================== */
// Heurística: recorre día por día, cubre primero lo obligatorio (mínimos de
// personal, cargo válido, tope de horas semanales, descanso mínimo), y entre
// los candidatos válidos prioriza a quien lleve menos turnos de ese tipo y
// menos horas acumuladas en la semana (reparto justo). No guarda nada por sí
// sola: devuelve una propuesta para que el Maestro la revise y confirme.
function estaAusente(personalId, dISO, novedades) {
  return (novedades || []).some((n) => n.personalId === personalId && dISO >= n.fechaInicio && dISO <= n.fechaFin);
}
function finesDeSemanaDelMes(anio, mes) {
  const out = [];
  const ultimo = new Date(anio, mes + 1, 0).getDate();
  for (let dia = 1; dia <= ultimo; dia++) {
    const d = new Date(anio, mes, dia);
    if (d.getDay() === 6) out.push({ sabado: toISO(d), domingo: toISO(addDays(d, 1)) });
  }
  return out;
}

// Genera un número "semilla" a partir de un texto (ej. la fecha del lunes de
// la semana), para poder mezclar listas de forma determinista: mismos datos
// de entrada siempre dan el mismo resultado, pero cada semana se ve distinta.
function hashSeed(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mezclarConSemilla(arr, semilla) {
  const a = [...arr];
  let s = semilla || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generarPropuestaTurnos({ personal, eventosExistentes, reglas, festivos, novedades, reglasPersonal, fechaInicioISO, semanas }) {
  const festivoSet = new Set((festivos || []).map((f) => f.fecha));
  const elegibles = personal.filter((p) => p.estado === "activo" && esCargoDeTurno(p.cargo, reglas?.cargosTurno));
  const inicio = getMonday(new Date(`${fechaInicioISO}T00:00:00`));
  const totalDias = semanas * 7;
  const dias = Array.from({ length: totalDias }, (_, i) => addDays(inicio, i));

  const propuestas = [];
  const faltantes = [];
  const asignadoHoy = {}; // dISO -> Set(personalId)
  const nocheAyer = {}; // dISO -> Set(personalId) que salieron de turno noche esa madrugada
  const descansoAsignadoMes = {}; // `${personalId}|${mesKey}` -> true si ya tiene garantizado su fin de semana libre ese mes
  const descansoFinDeSemana = {}; // dISO -> personalId excluido ese día por su descanso mensual

  // Revisa en lo que YA existe en Supabase (de meses/semanas anteriores a esta corrida)
  // si alguien ya tuvo un fin de semana completo libre este mes, para no exigirle otro.
  const mesesCubiertos = new Set(dias.map((d) => `${d.getFullYear()}-${d.getMonth()}`));
  mesesCubiertos.forEach((mesKey) => {
    const [anio, mes] = mesKey.split("-").map(Number);
    finesDeSemanaDelMes(anio, mes).forEach(({ sabado, domingo }) => {
      const seProgramoEseFin = eventosExistentes.some((e) => (e.date === sabado || e.date === domingo) && TURNO_TYPES.includes(e.type) && e.personalId);
      if (!seProgramoEseFin) return; // fin de semana aún sin programar, no cuenta ni a favor ni en contra
      elegibles.forEach((p) => {
        const key = `${p.id}|${mesKey}`;
        if (descansoAsignadoMes[key]) return;
        const ocupado = eventosExistentes.some((e) => e.personalId === p.id && (e.date === sabado || e.date === domingo) && TURNO_TYPES.includes(e.type));
        if (!ocupado) descansoAsignadoMes[key] = true;
      });
    });
  });

  for (let semanaIdx = 0; semanaIdx < semanas; semanaIdx++) {
    const diasSemana = dias.slice(semanaIdx * 7, semanaIdx * 7 + 7);
    // Mezcla el orden del personal cada semana (con semilla fija = la fecha del
    // lunes de esa semana) para que, en caso de empate en horas/turnos, no
    // siempre gane la misma persona ni se repita el mismo patrón semana a semana.
    const elegiblesSemana = mezclarConSemilla(elegibles, hashSeed(toISO(diasSemana[0])));
    // Contadores por persona, reiniciados cada semana (el objetivo es semanal)
    const conteo = {};
    elegibles.forEach((p) => { conteo[p.id] = { turno_dia: 0, turno_noche: 0, horas: 0 }; });
    // Semillar con lo que ya existe en Supabase para esa semana (manual o de una corrida previa)
    diasSemana.forEach((d) => {
      const dISO = toISO(d);
      eventosExistentes.filter((e) => e.date === dISO && TURNO_TYPES.includes(e.type) && e.personalId && conteo[e.personalId]).forEach((e) => {
        conteo[e.personalId][e.type] += 1;
        conteo[e.personalId].horas += horasEfectivas(e);
        (asignadoHoy[dISO] ||= new Set()).add(e.personalId);
      });
    });

    diasSemana.forEach((d, diaIdx) => {
      const dISO = toISO(d);
      const diaAnteriorISO = diaIdx > 0 ? toISO(diasSemana[diaIdx - 1]) : toISO(addDays(d, -1));
      const nuestroDia = (d.getDay() + 6) % 7; // 0=lunes ... 6=domingo

      // Al llegar al sábado, decide quién se gana el descanso de fin de semana
      // de este mes (preferencia configurable, no obligatoria): prioriza a
      // quien más horas lleve acumuladas esta semana entre quienes aún no
      // han tenido su fin de semana libre este mes.
      if (diaIdx === 5 && (reglas.finesSemanaLibresMes || 0) > 0) {
        const mesKey = `${d.getFullYear()}-${d.getMonth()}`;
        const domingoISO = toISO(diasSemana[6]);
        // No fuerces el descanso de nadie si el fin de semana ya está corto de
        // personal por vacaciones/incapacidades: primero se cubre el mínimo.
        const ausentesEsteFin = new Set(
          elegibles.filter((p) => estaAusente(p.id, dISO, novedades) || estaAusente(p.id, domingoISO, novedades)).map((p) => p.id)
        );
        const disponiblesEsteFin = elegibles.length - ausentesEsteFin.size;
        const margenMinimo = (reglas.personalMinFinSemanaFestivo || 2) + 1; // deja al menos 1 de colchón
        const candidatosDescanso = elegiblesSemana.filter((p) => !ausentesEsteFin.has(p.id) && !descansoAsignadoMes[`${p.id}|${mesKey}`]);
        // Si ya hay alguien de baja ese fin de semana (vacaciones/incapacidad), no se
        // suma un segundo ausente "por preferencia": primero se cubre el mínimo.
        if (ausentesEsteFin.size === 0 && disponiblesEsteFin > margenMinimo && candidatosDescanso.length > 0) {
          candidatosDescanso.sort((a, b) => (conteo[b.id]?.horas || 0) - (conteo[a.id]?.horas || 0));
          const elegido = candidatosDescanso[0];
          descansoAsignadoMes[`${elegido.id}|${mesKey}`] = true;
          descansoFinDeSemana[dISO] = elegido.id;
          descansoFinDeSemana[domingoISO] = elegido.id;
        }
      }
      ["turno_dia", "turno_noche"].forEach((tipo) => {
        const yaExiste = eventosExistentes.some((e) => e.date === dISO && e.type === tipo);
        if (yaExiste) return; // no se toca lo que ya está manualmente cubierto
        const requerido = minRequeridoTurno(dISO, tipo, reglas, festivoSet);
        const start = tipo === "turno_dia" ? 7 : 17;
        const end = tipo === "turno_dia" ? 17 : 31;

        // Reglas fijas por persona: "siempre" fuerza la asignación, "nunca" la excluye
        const fijos = [];
        (reglasPersonal || []).filter((r) => r.diaSemana === nuestroDia && r.tipoTurno === tipo && r.tipoRegla === "siempre").forEach((r) => {
          const persona = elegibles.find((p) => p.id === r.personalId);
          if (!persona || asignadoHoy[dISO]?.has(persona.id)) return;
          if (descansoFinDeSemana[dISO] === persona.id) {
            faltantes.push({ date: dISO, type: tipo, faltan: 0, motivo: `regla fija de ${persona.nombre} no aplicada (le tocó su descanso de fin de semana este mes)` });
            return;
          }
          if (estaAusente(persona.id, dISO, novedades)) {
            faltantes.push({ date: dISO, type: tipo, faltan: 0, motivo: `regla fija de ${persona.nombre} no aplicada (tiene una novedad activa)` });
            return;
          }
          if (tipo === "turno_dia" && nocheAyer[diaAnteriorISO]?.has(persona.id)) {
            faltantes.push({ date: dISO, type: tipo, faltan: 0, motivo: `regla fija de ${persona.nombre} no aplicada (venía de turno noche)` });
            return;
          }
          if (conteo[persona.id].horas + horasEfectivas({ type: tipo, start, end }) > (persona.horas || reglas.horasSemanaObjetivo)) {
            faltantes.push({ date: dISO, type: tipo, faltan: 0, motivo: `regla fija de ${persona.nombre} no aplicada (supera las horas semanales)` });
            return;
          }
          fijos.push(persona);
        });
        const excluidosPorRegla = new Set(
          (reglasPersonal || []).filter((r) => r.diaSemana === nuestroDia && r.tipoTurno === tipo && r.tipoRegla === "nunca").map((r) => r.personalId)
        );

        const candidatos = elegiblesSemana
          .filter((p) => !fijos.some((f) => f.id === p.id))
          .filter((p) => !excluidosPorRegla.has(p.id)) // regla "nunca" para este día/turno
          .filter((p) => descansoFinDeSemana[dISO] !== p.id) // le tocó su descanso de fin de semana este mes
          .filter((p) => !estaAusente(p.id, dISO, novedades)) // sin novedad activa ese día
          .filter((p) => !(asignadoHoy[dISO]?.has(p.id))) // no dos turnos el mismo día
          .filter((p) => !(tipo === "turno_dia" && nocheAyer[diaAnteriorISO]?.has(p.id))) // descanso tras turno noche
          .filter((p) => conteo[p.id].horas + horasEfectivas({ type: tipo, start, end }) <= (p.horas || reglas.horasSemanaObjetivo))
          .sort((a, b) => {
            const ca = conteo[a.id], cb = conteo[b.id];
            // Reparto por TOTAL de turnos de la semana (día+noche), no solo del
            // mismo tipo: así un cargo escaso (ej. un solo operador) no se agota
            // cubriendo únicamente turnos de día los primeros días, dejando la
            // segunda mitad de la semana sin nadie de ese cargo disponible.
            const totalA = ca.turno_dia + ca.turno_noche, totalB = cb.turno_dia + cb.turno_noche;
            if (totalA !== totalB) return totalA - totalB;
            if (ca[tipo] !== cb[tipo]) return ca[tipo] - cb[tipo];
            return ca.horas - cb.horas;
          });

        let elegidos = [...fijos, ...candidatos.slice(0, Math.max(0, requerido - fijos.length))];

        if (reglas.operadorRequiereAuxiliar) {
          // Regla real (aplica siempre, sin importar el mínimo de personal del
          // turno): nunca dos operadores terapéuticos juntos, y un operador
          // JAMÁS puede quedar solo sin un auxiliar de compañía — así el
          // mínimo normal sea 1, en ese caso se suma un auxiliar de más. Si no
          // hay ningún operador disponible, dos (o más) auxiliares solos es
          // perfectamente válido — no se exige operador en cada turno.
          const operadoresEnTurno = elegidos.filter((p) => esOperador(p.cargo, reglas));

          if (operadoresEnTurno.length > 1) {
            // Sobran operadores: se reemplazan los excedentes por quien no sea
            // operador (idealmente un auxiliar), priorizando quitar a quien no
            // tenga una asignación fija.
            let excedentes = operadoresEnTurno.slice(1); // se conserva solo el primero
            excedentes.forEach((exceso) => {
              if (fijos.some((f) => f.id === exceso.id)) return; // una regla fija "siempre" no se quita
              const reemplazo = candidatos.find((p) => !esOperador(p.cargo, reglas) && !elegidos.includes(p));
              if (reemplazo) {
                elegidos = [...elegidos.filter((p) => p.id !== exceso.id), reemplazo];
              } else {
                elegidos = elegidos.filter((p) => p.id !== exceso.id);
                faltantes.push({ date: dISO, type: tipo, faltan: 1, motivo: "se quitó un segundo operador (no pueden estar dos juntos) y no había con quién reemplazarlo" });
              }
            });
          }

          const hayOperadorAhora = elegidos.some((p) => esOperador(p.cargo, reglas));
          const hayAuxiliarAhora = elegidos.some((p) => esAuxiliar(p.cargo, reglas));
          if (hayOperadorAhora && !hayAuxiliarAhora) {
            const refuerzo = candidatos.find((p) => esAuxiliar(p.cargo, reglas) && !elegidos.includes(p));
            if (refuerzo) {
              // Siempre se SUMA el auxiliar (nunca se reemplaza al operador),
              // aunque eso implique pasarse del mínimo normal del turno — un
              // operador solo, sin compañía, no es una opción válida.
              elegidos = [...elegidos, refuerzo];
            } else {
              faltantes.push({ date: dISO, type: tipo, faltan: 1, motivo: "sin auxiliar de compañía para el operador" });
            }
          }
        }

        elegidos.forEach((p) => {
          const ev = { id: nid(), date: dISO, type: tipo, personalId: p.id, start, end, title: tipo === "turno_dia" ? "Turno Día" : "Turno Noche" };
          propuestas.push(ev);
          conteo[p.id][tipo] += 1;
          conteo[p.id].horas += horasEfectivas(ev);
          (asignadoHoy[dISO] ||= new Set()).add(p.id);
          if (tipo === "turno_noche") (nocheAyer[dISO] ||= new Set()).add(p.id);
        });
        if (elegidos.length < requerido) {
          faltantes.push({ date: dISO, type: tipo, faltan: requerido - elegidos.length });
        }
      });
    });
  }

  return { propuestas, faltantes, elegiblesCount: elegibles.length };
}

// Sugiere quién puede cubrir un turno puntual (usado por el módulo de Novedades).
// Prioriza a alguien del mismo rol (operador/auxiliar) que la persona ausente,
// para no romper la regla de acompañamiento, y luego por reparto justo.
function sugerirReemplazo({ turno, personal, eventosExistentes, reglas, novedades }) {
  const original = personal.find((p) => p.id === turno.personalId);
  const elegibles = personal.filter((p) => p.estado === "activo" && esCargoDeTurno(p.cargo, reglas?.cargosTurno) && p.id !== turno.personalId);
  const monday = getMonday(new Date(`${turno.date}T00:00:00`));
  const weekDates = Array.from({ length: 7 }, (_, i) => toISO(addDays(monday, i)));
  const conteo = {};
  elegibles.forEach((p) => { conteo[p.id] = { turno_dia: 0, turno_noche: 0, horas: 0 }; });
  eventosExistentes.filter((e) => weekDates.includes(e.date) && TURNO_TYPES.includes(e.type) && e.personalId && conteo[e.personalId]).forEach((e) => {
    conteo[e.personalId][e.type] += 1;
    conteo[e.personalId].horas += horasEfectivas(e);
  });
  const diaAnteriorISO = toISO(addDays(new Date(`${turno.date}T00:00:00`), -1));
  const ocupadosEseDia = new Set(eventosExistentes.filter((e) => e.date === turno.date && e.personalId && e.id !== turno.id).map((e) => e.personalId));
  const nocheAyerSet = new Set(eventosExistentes.filter((e) => e.date === diaAnteriorISO && e.type === "turno_noche" && e.personalId).map((e) => e.personalId));

  const candidatos = elegibles
    .filter((p) => !estaAusente(p.id, turno.date, novedades))
    .filter((p) => !ocupadosEseDia.has(p.id))
    .filter((p) => !(turno.type === "turno_dia" && nocheAyerSet.has(p.id)))
    .filter((p) => conteo[p.id].horas + horasEfectivas(turno) <= (p.horas || reglas?.horasSemanaObjetivo || 44))
    .sort((a, b) => {
      const mismoRolA = original ? (esOperador(a.cargo, reglas) === esOperador(original.cargo, reglas) ? 0 : 1) : 0;
      const mismoRolB = original ? (esOperador(b.cargo, reglas) === esOperador(original.cargo, reglas) ? 0 : 1) : 0;
      if (mismoRolA !== mismoRolB) return mismoRolA - mismoRolB;
      const ca = conteo[a.id], cb = conteo[b.id];
      if (ca[turno.type] !== cb[turno.type]) return ca[turno.type] - cb[turno.type];
      return ca.horas - cb.horas;
    });

  return candidatos[0] || null;
}

function TurnosMesGrid({ ctx, filtroPersonalId }) {
  const { isMaestro, events, monthOffset, setMonthOffset, setDetail, reglas, festivos, eliminarTurnosDeFechas, novedades } = ctx;
  const turnos = events.filter((e) => TURNO_TYPES.includes(e.type) && (!filtroPersonalId || e.personalId === filtroPersonalId));
  const festivoSet = new Set((festivos || []).map((f) => f.fecha));
  const base = new Date(TODAY.getFullYear(), TODAY.getMonth() + monthOffset, 1);
  const gridStart = getMonday(new Date(base.getFullYear(), base.getMonth(), 1));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const todayISO = toISO(TODAY);
  const lastCellInMonth = cells.reduce((acc, d, i) => (d.getMonth() === base.getMonth() ? i : acc), 0);
  const visibleCells = cells.slice(0, Math.ceil((lastCellInMonth + 1) / 7) * 7);
  const semanas = [];
  for (let i = 0; i < visibleCells.length; i += 7) semanas.push(visibleCells.slice(i, i + 7));

  function chipsFor(dISO, tipo) {
    return turnos.filter((t) => t.date === dISO && t.type === tipo);
  }
  // Novedades a resaltar en la casilla del día: incapacidad/permiso/etc.,
  // capacitación programada ese día, y turnos con más gente de la mínima
  // requerida ("turno extra"). Solo se muestra si aplica alguna.
  function novedadesDelDia(dISO, dia, noche) {
    const NOMBRES_NOVEDAD = { incapacidad: "Incapacidad", permiso: "Permiso", vacaciones: "Vacaciones", otro: "Novedad" };
    const ausencias = (novedades || []).filter((n) => dISO >= n.fechaInicio && dISO <= n.fechaFin);
    const capacitaciones = events.filter((e) => e.type === "capacitacion" && e.date === dISO);
    const minDia = minRequeridoTurno(dISO, "turno_dia", reglas, festivoSet);
    const minNoche = minRequeridoTurno(dISO, "turno_noche", reglas, festivoSet);
    const excesoHeadcount = Math.max(0, dia.length - minDia) + Math.max(0, noche.length - minNoche);
    // "Turno extra" solo cuenta si además hay una ausencia ese día: es decir,
    // hay más gente de la mínima Y probablemente sea para cubrir a alguien
    // que no pudo asistir. Si no hay ausencia registrada, no se muestra.
    const extra = ausencias.length > 0 ? excesoHeadcount : 0;
    return { ausencias, capacitaciones, extra, NOMBRES_NOVEDAD };
  }
  function borrarDia(dISO) {
    if (window.confirm(`¿Borrar todos los turnos del ${new Date(`${dISO}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long" })}?`)) {
      eliminarTurnosDeFechas([dISO]);
    }
  }
  function borrarSemana(semana) {
    const rango = `${semana[0].toLocaleDateString("es-CO", { day: "numeric", month: "short" })} – ${semana[6].toLocaleDateString("es-CO", { day: "numeric", month: "short" })}`;
    if (window.confirm(`¿Borrar todos los turnos de la semana del ${rango}? Esta acción no se puede deshacer.`)) {
      eliminarTurnosDeFechas(semana.map(toISO));
    }
  }

  return (
    <div className="ev-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: T.border }}>
        <button className="p-1.5 rounded-lg no-print" style={{ border: `1px solid ${T.border}` }} onClick={() => setMonthOffset((m) => m - 1)}>
          <ChevronLeft size={16} />
        </button>
        <p className="ev-display font-semibold text-[14px] capitalize">{MES_LABEL[base.getMonth()]} {base.getFullYear()}</p>
        <button className="p-1.5 rounded-lg no-print" style={{ border: `1px solid ${T.border}` }} onClick={() => setMonthOffset((m) => m + 1)}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center py-2 border-b" style={{ borderColor: T.border }}>
        {DIA_LABEL.map((d) => <p key={d} className="text-[11px] font-medium" style={{ color: T.muted }}>{d}</p>)}
      </div>
      <div className="overflow-x-auto ev-scroll">
        <div style={{ minWidth: 900 }}>
        {semanas.map((semana, semIdx) => (
          <div key={semIdx}>
            {isMaestro && (
              <div className="no-print flex justify-end px-3 py-1 border-b" style={{ borderColor: T.border, background: `${T.danger}08` }}>
                <button onClick={() => borrarSemana(semana)} className="flex items-center gap-1 text-[10.5px] font-medium" style={{ color: T.danger }}>
                  <Trash2 size={11} /> Borrar turnos de esta semana
                </button>
              </div>
            )}
            <div className="grid grid-cols-7">
              {semana.map((d, i) => {
                const dISO = toISO(d);
                const inMonth = d.getMonth() === base.getMonth();
                const dia = chipsFor(dISO, "turno_dia");
                const noche = chipsFor(dISO, "turno_noche");
                const festivoNombre = festivoSet.has(dISO) ? festivos.find((f) => f.fecha === dISO)?.nombre : null;
                const hayTurnos = dia.length > 0 || noche.length > 0;
                const { ausencias, capacitaciones, extra, NOMBRES_NOVEDAD } = novedadesDelDia(dISO, dia, noche);
                const hayNovedad = ausencias.length > 0 || capacitaciones.length > 0;
                return (
                  <div
                    key={i}
                    onClick={() => isMaestro && ctx.setModal({ mode: "new", event: null, defaultType: "turno_dia", prefill: { date: dISO, start: 7, end: 17 } })}
                    className={`border-b border-r p-1.5 flex flex-col gap-1 min-h-[112px] ${isMaestro ? "cursor-pointer hover:bg-black/[0.02]" : ""}`}
                    style={{ borderColor: T.border, opacity: inMonth ? 1 : 0.4, background: festivoNombre ? T.accentSoft : "transparent" }}
                    title={festivoNombre || undefined}
                  >
                    <div className="flex items-center justify-between">
                      <span className="ev-display text-[12px] font-semibold w-5 h-5 flex items-center justify-center rounded-full shrink-0" style={{ background: dISO === todayISO ? T.primary : "transparent", color: dISO === todayISO ? "#fff" : T.ink }}>
                        {d.getDate()}
                      </span>
                      {isMaestro && hayTurnos && (
                        <button onClick={(ev) => { ev.stopPropagation(); borrarDia(dISO); }} title="Borrar turnos de este día" style={{ color: T.muted }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    {hayNovedad && (
                      <div className="flex items-center gap-1 flex-wrap" onClick={(ev) => ev.stopPropagation()}>
                        {ausencias.map((n) => (
                          <span
                            key={n.id}
                            title={`${personName(n.personalId)} · ${NOMBRES_NOVEDAD[n.tipo] || "Novedad"}`}
                            className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium max-w-full truncate"
                            style={{ background: T.dangerSoft, color: T.danger }}
                          >
                            <UserX size={9} className="shrink-0" /> <span className="truncate">{NOMBRES_NOVEDAD[n.tipo] || "Novedad"}: {personName(n.personalId)}</span>
                          </span>
                        ))}
                        {capacitaciones.map((c) => (
                          <span
                            key={c.id}
                            title={`Capacitación: ${c.title}${c.personalId ? " · " + personName(c.personalId) : ""}`}
                            className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium max-w-full truncate"
                            style={{ background: T.primarySoft, color: T.primaryDark }}
                          >
                            <BookOpen size={9} className="shrink-0" /> <span className="truncate">Capacitación{c.personalId ? `: ${personName(c.personalId)}` : ""}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    <TurnoMiniBox tipo="turno_dia" chips={dia} onChipClick={setDetail} min={filtroPersonalId ? undefined : minRequeridoTurno(dISO, "turno_dia", reglas, festivoSet)} reglas={filtroPersonalId ? null : reglas} marcarExtra={ausencias.length > 0} />
                    <TurnoMiniBox tipo="turno_noche" chips={noche} onChipClick={setDetail} min={filtroPersonalId ? undefined : minRequeridoTurno(dISO, "turno_noche", reglas, festivoSet)} reglas={filtroPersonalId ? null : reglas} marcarExtra={ausencias.length > 0} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        </div>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 text-[11px] border-t" style={{ borderColor: T.border, color: T.muted }}>
        <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: T.accentSoft }} /> Día festivo
        <span className="mx-1">·</span>
        <AlertTriangle size={11} style={{ color: T.danger }} /> Falta personal mínimo o falta acompañamiento (operador sin auxiliar)
      </div>
    </div>
  );
}

/* ============================== TURNOS (calendario) ============================== */
// ============================================================================
// LIQUIDACIÓN ESTIMADA (solo Maestro) — convierte los turnos en una estimación
// económica del periodo. Es una ESTIMACIÓN: no reemplaza la nómina ni la factura.
// Los porcentajes vienen de `liquidacion_config` y son editables.
// ============================================================================
const LIQ_CONFIG_DEFAULT = {
  nocheInicio: 19, nocheFin: 6, divisorMensual: 210, jornadaSemanalMax: 42,
  pctRecargoNocturno: 35, pctExtraDiurna: 25, pctExtraNocturna: 75, pctRecargoDominical: 90,
  pctPsNocturno: 35, pctPsDominical: 90, pctPsNoctDominical: 125,
  descontarDescanso: false, extrasPorExceso: false,
  smmlv: 1750905, auxilioTransporte: 249095, pctSalud: 4, pctPension: 4,
};
function mapLiqConfig(row) {
  if (!row) return null;
  return {
    id: row.id,
    nocheInicio: Number(row.noche_inicio), nocheFin: Number(row.noche_fin),
    divisorMensual: Number(row.divisor_mensual), jornadaSemanalMax: Number(row.jornada_semanal_max),
    pctRecargoNocturno: Number(row.pct_recargo_nocturno), pctExtraDiurna: Number(row.pct_extra_diurna),
    pctExtraNocturna: Number(row.pct_extra_nocturna), pctRecargoDominical: Number(row.pct_recargo_dominical),
    pctPsNocturno: Number(row.pct_ps_nocturno), pctPsDominical: Number(row.pct_ps_dominical),
    pctPsNoctDominical: Number(row.pct_ps_noct_dominical),
    descontarDescanso: row.descontar_descanso === true, extrasPorExceso: row.extras_por_exceso === true,
    smmlv: Number(row.smmlv ?? 1750905), auxilioTransporte: Number(row.auxilio_transporte ?? 249095),
    pctSalud: Number(row.pct_salud ?? 4), pctPension: Number(row.pct_pension ?? 4),
  };
}
function liqConfigPayload(f) {
  return {
    noche_inicio: Number(f.nocheInicio), noche_fin: Number(f.nocheFin),
    divisor_mensual: Number(f.divisorMensual), jornada_semanal_max: Number(f.jornadaSemanalMax),
    pct_recargo_nocturno: Number(f.pctRecargoNocturno), pct_extra_diurna: Number(f.pctExtraDiurna),
    pct_extra_nocturna: Number(f.pctExtraNocturna), pct_recargo_dominical: Number(f.pctRecargoDominical),
    pct_ps_nocturno: Number(f.pctPsNocturno), pct_ps_dominical: Number(f.pctPsDominical),
    pct_ps_noct_dominical: Number(f.pctPsNoctDominical),
    descontar_descanso: !!f.descontarDescanso, extras_por_exceso: !!f.extrasPorExceso,
    smmlv: Number(f.smmlv), auxilio_transporte: Number(f.auxilioTransporte),
    pct_salud: Number(f.pctSalud), pct_pension: Number(f.pctPension), updated_at: new Date().toISOString(),
  };
}
function useLiquidacionDatos() {
  const [config, setConfig] = useState(null);
  const [rem, setRem] = useState({});
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const recargar = React.useCallback(async () => {
    setCargando(true);
    try {
      const [cfgRows, remRows] = await Promise.all([sb("liquidacion_config?select=*&limit=1"), sb("liquidacion_personal?select=*")]);
      setConfig(mapLiqConfig(cfgRows?.[0]));
      const m = {};
      (remRows || []).forEach((r) => { m[r.personal_id] = { modalidad: r.modalidad, salarioBase: Number(r.salario_base) || 0, valorHora: Number(r.valor_hora) || 0 }; });
      setRem(m);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);
  React.useEffect(() => { recargar(); }, [recargar]);
  return { config, rem, error, cargando, recargar };
}
const fmtCOP = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Math.round(n || 0));
const fmtH = (n) => (Math.round((n || 0) * 100) / 100).toLocaleString("es-CO");

// Divide un turno en tramos de 1 hora y clasifica cada uno (noche / domingo-festivo).
// `horas` = horas de reloj; `efec` = horas efectivas (descontando el descanso del turno noche, repartido proporcionalmente).
function segmentosDeTurno(t, cfg, festivoSet) {
  const bruto = t.end - t.start;
  const factor = bruto > 0 ? horasEfectivas(t) / bruto : 1;
  const out = [];
  for (let h = t.start; h < t.end - 1e-9; h += 1) {
    const tramo = Math.min(1, t.end - h);
    const medio = h + tramo / 2;
    const hd = ((Math.floor(medio) % 24) + 24) % 24;
    const noche = cfg.nocheInicio > cfg.nocheFin ? (hd >= cfg.nocheInicio || hd < cfg.nocheFin) : (hd >= cfg.nocheInicio && hd < cfg.nocheFin);
    const fechaReal = toISO(addDays(new Date(`${t.date}T00:00:00`), Math.floor(medio / 24)));
    const dom = new Date(`${fechaReal}T00:00:00`).getDay() === 0 || festivoSet.has(fechaReal);
    out.push({ noche, dom, horas: tramo, efec: tramo * factor });
  }
  return out;
}
const LIQ_CLASES = [
  { k: "D", nombre: "Diurna ordinaria" },
  { k: "N", nombre: "Nocturna" },
  { k: "DF", nombre: "Dominical / festiva diurna" },
  { k: "NF", nombre: "Nocturna dominical / festiva" },
];
function claveClase(noche, dom) { return `${noche ? "N" : "D"}${dom ? "F" : ""}`; }

function calcularLiquidacion({ persona, rem, config, turnos, turnosExtra, festivoSet, desde, hasta }) {
  const cfg = config || LIQ_CONFIG_DEFAULT;
  const modalidad = rem?.modalidad || "laboral";
  const horasOrd = { D: 0, N: 0, DF: 0, NF: 0 };
  const horasExt = { D: 0, N: 0, DF: 0, NF: 0 };
  const umbral = modalidad === "laboral" ? (persona.horas > 0 ? persona.horas : cfg.jornadaSemanalMax) : Infinity;
  const acumSemana = {};
  const suyos = turnos.filter((t) => t.personalId === persona.id).sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
  const extrasOn = modalidad === "laboral" && cfg.extrasPorExceso;
  suyos.forEach((t) => {
    const semana = toISO(getMonday(new Date(`${t.date}T00:00:00`)));
    segmentosDeTurno(t, cfg, festivoSet).forEach((s) => {
      const antes = acumSemana[semana] || 0;
      acumSemana[semana] = antes + s.efec;
      if (t.date < desde || t.date > hasta) return;
      const ordEfec = extrasOn ? Math.max(0, Math.min(s.efec, umbral - antes)) : s.efec;
      const fracExtra = s.efec > 0 ? (s.efec - ordEfec) / s.efec : 0;
      const hBase = cfg.descontarDescanso ? s.efec : s.horas;
      const k = claveClase(s.noche, s.dom);
      horasOrd[k] += hBase * (1 - fracExtra);
      horasExt[k] += hBase * fracExtra;
    });
  });
  // Turnos extra registrados manualmente en Novedades: todas sus horas son adicionales.
  const extrasRegistrados = (turnosExtra || []).filter((x) => x.personalId === persona.id && x.fecha >= desde && x.fecha <= hasta);
  let horasExtraRegistradas = 0;
  extrasRegistrados.forEach((x) => {
    const dom = new Date(`${x.fecha}T00:00:00`).getDay() === 0 || festivoSet.has(x.fecha);
    const k = claveClase(x.tipoTurno === "turno_noche", dom);
    horasExt[k] += x.horas;
    horasExtraRegistradas += x.horas;
  });

  const lineas = [];
  let total = 0;
  const totalHoras = Object.values(horasOrd).reduce((a, b) => a + b, 0) + Object.values(horasExt).reduce((a, b) => a + b, 0);
  const dom = cfg.pctRecargoDominical / 100;

  if (modalidad === "prestacion") {
    const vh = rem?.valorHora || 0;
    const mult = { D: 1, N: 1 + cfg.pctPsNocturno / 100, DF: 1 + cfg.pctPsDominical / 100, NF: 1 + cfg.pctPsNoctDominical / 100 };
    LIQ_CLASES.forEach(({ k, nombre }) => {
      const h = horasOrd[k] + horasExt[k];
      const valor = h * vh * mult[k];
      total += valor;
      lineas.push({ concepto: `Horas ${nombre.toLowerCase()}`, horas: h, valor, nota: `${fmtCOP(vh * mult[k])} por hora` });
    });
    return { modalidad, lineas, total, totalHoras, horasExtraRegistradas, configurado: vh > 0, subtotalBase: 0 };
  }

  // Contrato laboral
  const salario = rem?.salarioBase || 0;
  const vh = salario / (cfg.divisorMensual || 210);
  // El salario base SIEMPRE es el del mes completo (1.º al último día) del mes en que termina el corte;
  // los recargos sí usan las fechas de corte elegidas.
  const refFin = new Date(`${hasta}T00:00:00`);
  const mesRef = `${MES_LABEL[refFin.getMonth()].toLowerCase()} ${refFin.getFullYear()}`;
  lineas.push({ concepto: `Salario base (${mesRef}, mes completo)`, horas: null, valor: salario, nota: `Valor hora ordinaria ${fmtCOP(vh)}` });
  total += salario;
  const recargos = [
    ["N", "Recargo nocturno", cfg.pctRecargoNocturno / 100],
    ["DF", "Recargo dominical / festivo", dom],
    ["NF", "Recargo nocturno dominical / festivo", cfg.pctRecargoNocturno / 100 + dom],
  ];
  recargos.forEach(([k, nombre, p]) => {
    const h = horasOrd[k];
    const valor = h * vh * p;
    total += valor;
    lineas.push({ concepto: nombre, horas: h, valor, nota: `${Math.round(p * 100)}% sobre la hora ordinaria` });
  });
  const extras = [
    ["D", "Horas extra diurnas", 1 + cfg.pctExtraDiurna / 100],
    ["N", "Horas extra nocturnas", 1 + cfg.pctExtraNocturna / 100],
    ["DF", "Horas extra diurnas dominical / festivo", 1 + cfg.pctExtraDiurna / 100 + dom],
    ["NF", "Horas extra nocturnas dominical / festivo", 1 + cfg.pctExtraNocturna / 100 + dom],
  ];
  extras.forEach(([k, nombre, m]) => {
    const h = horasExt[k];
    const valor = h * vh * m;
    if (h <= 0 && !extrasOn && horasExtraRegistradas <= 0) return; // no llenar la tabla de ceros
    total += valor;
    lineas.push({ concepto: nombre, horas: h, valor, nota: `${Math.round(m * 100)}% de la hora ordinaria` });
  });
  // Deducciones de ley (salud y pensión) sobre salario + recargos + extras.
  const baseDeduc = total;
  if (salario > 0 && salario <= 2 * cfg.smmlv && cfg.auxilioTransporte > 0) {
    lineas.push({ concepto: "Auxilio de transporte", horas: null, valor: cfg.auxilioTransporte, nota: "Aplica por devengar hasta 2 salarios mínimos" });
    total += cfg.auxilioTransporte;
  }
  [["Salud", cfg.pctSalud], ["Pensión", cfg.pctPension]].forEach(([nombre, pct]) => {
    const valor = baseDeduc * pct / 100;
    total -= valor;
    lineas.push({ concepto: `${nombre} (${pct}%)`, horas: null, valor: -valor, nota: "Sobre salario + recargos y extras", deduccion: true });
  });
  return { modalidad, lineas, total, totalHoras, horasExtraRegistradas, configurado: salario > 0, subtotalBase: salario };
}

// ---------- PDF de la liquidación estimada ----------
// Genera un documento (una página por persona) con encabezado
// "Sistema de Liquidación Evoluciona", servicio e institución, las fechas
// (periodo del salario, corte de recargos/extras y fecha de pago), el detalle
// de conceptos, el total, las notas y espacios de firma.
const fechaCorta = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
function rangoMesCompleto(hastaISO) {
  const f = new Date(`${hastaISO}T00:00:00`);
  return { ini: toISO(new Date(f.getFullYear(), f.getMonth(), 1)), fin: toISO(new Date(f.getFullYear(), f.getMonth() + 1, 0)) };
}
function generarPdfLiquidacion({ items, servicioNombre, institucionNombre, desde, hasta, fechaPago, config }) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const m = 40;
  const azul = [37, 99, 235];
  const gris = [100, 116, 139];
  const tinta = [15, 23, 42];
  const mes = rangoMesCompleto(hasta);
  const generado = new Date().toLocaleString("es-CO", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });
  const subtitulo = `Liquidación de ${servicioNombre || "servicio"}${institucionNombre ? ` de ${institucionNombre}` : ""}`;

  items.forEach(({ p, r, bonif = 0, desc = 0 }, idx) => {
    if (idx > 0) doc.addPage();
    const esPS = r.modalidad === "prestacion";
    // Encabezado
    doc.setFillColor(...azul);
    doc.rect(0, 0, W, 6, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...azul);
    doc.text("SISTEMA DE LIQUIDACIÓN EVOLUCIONA", m, m);
    doc.setFontSize(17); doc.setTextColor(...tinta);
    doc.text(subtitulo, m, m + 22);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...gris);
    doc.text(esPS ? "Cuenta de cobro estimada · Prestación de servicios" : "Liquidación estimada · Contrato laboral", m, m + 38);

    // Datos de la persona
    let y = m + 64;
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(m, y, W - m * 2, 46, 6, 6, "FD");
    doc.setFontSize(8.5); doc.setTextColor(...gris);
    doc.text("COLABORADOR", m + 12, y + 16);
    doc.text("CARGO", m + (W - m * 2) * 0.55, y + 16);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11.5); doc.setTextColor(...tinta);
    doc.text(p.nombre || "-", m + 12, y + 33);
    doc.text(p.cargo || "-", m + (W - m * 2) * 0.55, y + 33);

    // Fechas
    y += 62;
    const fechas = esPS
      ? [["Periodo liquidado (horas)", `${fechaCorta(desde)} – ${fechaCorta(hasta)}`], ["Fecha de pago", fechaPago ? fechaCorta(fechaPago) : "Por definir"]]
      : [
          ["Salario base (mes completo)", `${fechaCorta(mes.ini)} – ${fechaCorta(mes.fin)}`],
          ["Corte de recargos, nocturnas y extras", `${fechaCorta(desde)} – ${fechaCorta(hasta)}`],
          ["Fecha de pago", fechaPago ? fechaCorta(fechaPago) : "Por definir"],
        ];
    autoTable(doc, {
      startY: y,
      head: [["Fechas", ""]],
      body: fechas,
      theme: "plain",
      headStyles: { fontStyle: "bold", textColor: azul, fontSize: 9 },
      styles: { fontSize: 10, cellPadding: { top: 3, bottom: 3, left: 0, right: 0 }, textColor: tinta },
      columnStyles: { 0: { textColor: gris, cellWidth: 210 }, 1: { fontStyle: "bold" } },
      margin: { left: m, right: m },
    });

    // Detalle
    y = doc.lastAutoTable.finalY + 14;
    const cuerpo = r.lineas.map((l) => [
      l.nota ? `${l.concepto}\n${l.nota}` : l.concepto,
      l.horas == null ? "—" : fmtH(l.horas),
      l.valor < 0 ? `(${fmtCOP(-l.valor)})` : fmtCOP(l.valor),
    ]);
    if (bonif) cuerpo.push(["Bonificaciones", "—", fmtCOP(bonif)]);
    if (desc) cuerpo.push(["Descuentos", "—", `(${fmtCOP(desc)})`]);
    const totalFinal = r.total + bonif - desc;
    autoTable(doc, {
      startY: y,
      head: [["Concepto", "Horas", "Valor"]],
      body: cuerpo,
      foot: [[esPS ? "Total bruto estimado a facturar" : "Total neto estimado a recibir", fmtH(r.totalHoras) + " h", fmtCOP(totalFinal)]],
      theme: "grid",
      headStyles: { fillColor: azul, textColor: 255, fontSize: 9.5 },
      footStyles: { fillColor: [239, 246, 255], textColor: [29, 78, 216], fontStyle: "bold", fontSize: 11 },
      styles: { fontSize: 9.5, lineColor: [226, 232, 240], textColor: tinta, cellPadding: 6 },
      columnStyles: { 1: { halign: "right", cellWidth: 70 }, 2: { halign: "right", cellWidth: 120 } },
      didParseCell: (d) => {
        if (d.section === "body" && d.column.index === 2 && String(d.cell.raw).startsWith("(")) d.cell.styles.textColor = [220, 38, 38];
        if ((d.section === "foot" || d.section === "head") && d.column.index > 0) d.cell.styles.halign = "right";
      },
      margin: { left: m, right: m },
    });

    // Notas
    y = doc.lastAutoTable.finalY + 16;
    const notas = [];
    if (r.horasExtraRegistradas > 0) notas.push(`Incluye ${fmtH(r.horasExtraRegistradas)} h de turnos extra registrados en Novedades.`);
    if (esPS) {
      notas.push("Valor bruto: horas trabajadas en el corte × valor hora pactado, con los recargos acordados para horas nocturnas y dominicales/festivas.");
    } else {
      notas.push("El salario base corresponde al mes completo (del 1.º al último día). Los recargos, nocturnas y extras se calculan con las fechas de corte indicadas.");
      notas.push(config?.extrasPorExceso
        ? `Se cuentan como extra las horas que superan ${fmtH(p.horas > 0 ? p.horas : config.jornadaSemanalMax)} h semanales y los turnos extra registrados.`
        : "Solo se pagan como extra los turnos extra registrados en Novedades.");
      notas.push("Salud y pensión se calculan sobre salario + recargos y extras.");
    }
    notas.push("Documento estimado para validación: no reemplaza la nómina ni la facturación oficial.");
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...gris);
    notas.forEach((n) => {
      const lineas = doc.splitTextToSize(`• ${n}`, W - m * 2);
      if (y + lineas.length * 11 > H - 120) { doc.addPage(); y = m; }
      doc.text(lineas, m, y);
      y += lineas.length * 11 + 2;
    });

    // Firmas
    let yf = Math.max(y + 50, H - 110);
    if (yf > H - 60) { doc.addPage(); yf = m + 60; }
    const anchoFirma = (W - m * 2 - 40) / 2;
    doc.setDrawColor(...gris);
    [[m, esPS ? "Contratista" : "Elaboró"], [m + anchoFirma + 40, "Revisó · Talento Humano"]].forEach(([x, rotulo]) => {
      doc.line(x, yf, x + anchoFirma, yf);
      doc.setFontSize(9); doc.setTextColor(...gris);
      doc.text(rotulo, x, yf + 13);
    });

    // Pie
    doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
    doc.text(`Generado en Evoluciona · ${generado}`, m, H - 22);
    doc.text(`${idx + 1} / ${items.length}`, W - m, H - 22, { align: "right" });
  });
  return doc;
}
function nombreArchivoSeguro(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase();
}

function LiquidacionPanel({ ctx, turnos, personas, filtroPersonal, setFiltroPersonal, desde, hasta, festivoSet, etiquetaPeriodo }) {
  const { config, rem, error, cargando } = useLiquidacionDatos();
  const [bonif, setBonif] = useState("");
  const [desc, setDesc] = useState("");
  const [fechaPago, setFechaPago] = useState(() => rangoMesCompleto(hasta).fin);
  React.useEffect(() => { setFechaPago(rangoMesCompleto(hasta).fin); }, [hasta]);
  const turnosExtra = ctx.turnosExtra;
  const filas = personas.map((p) => ({ p, r: calcularLiquidacion({ persona: p, rem: rem[p.id], config, turnos, turnosExtra, festivoSet, desde, hasta }) }));
  const sel = filtroPersonal ? filas.find((f) => f.p.id === filtroPersonal) : null;
  const totalGeneral = filas.reduce((a, f) => a + f.r.total, 0);
  const servicioNombre = ctx.servicioActual?.nombre || "";
  const institucionNombre = ctx.institucionActual?.nombre || "";

  function exportarPdf(items, sufijo) {
    try {
      const doc = generarPdfLiquidacion({ items, servicioNombre, institucionNombre, desde, hasta, fechaPago, config });
      doc.save(`liquidacion_${nombreArchivoSeguro(servicioNombre)}_${nombreArchivoSeguro(sufijo)}_${hasta}.pdf`);
      ctx.showToast("PDF de liquidación descargado");
    } catch (e) {
      ctx.showToast(`No se pudo generar el PDF: ${e.message}`, "warn");
    }
  }
  const campoFechaPago = (
    <label className="flex items-center gap-2 text-[12px]" style={{ color: T.muted }}>
      Fecha de pago
      <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} style={{ ...inputStyle, width: 150, padding: "5px 8px" }} />
    </label>
  );
  return (
    <div className="ev-card overflow-hidden max-w-3xl">
      <div className="px-4 py-3 border-b flex items-start justify-between gap-3 flex-wrap" style={{ borderColor: T.border }}>
        <div>
          <h3 className="ev-display font-semibold text-[13.5px] flex items-center gap-1.5"><FileBarChart size={14} /> Resumen de liquidación estimada · {etiquetaPeriodo}</h3>
          <p className="text-[11.5px]" style={{ color: T.muted }}>
            Solo visible para el Maestro. Es una estimación para consulta y validación previa; no reemplaza la nómina ni la facturación oficial.
          </p>
        </div>
        {!cargando && config && !sel && filas.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {campoFechaPago}
            <button onClick={() => exportarPdf(filas.map(({ p, r }) => ({ p, r })), "todos")} className="ev-btn px-3 py-1.5 text-[12px]" style={{ border: `1px solid ${T.primary}`, color: T.primary }}>
              <Download size={13} /> PDF de todos
            </button>
          </div>
        )}
      </div>
      {cargando && <p className="px-4 py-4 text-[12.5px]" style={{ color: T.muted }}>Cargando parámetros…</p>}
      {!cargando && (error || !config) && (
        <p className="px-4 py-4 text-[12.5px]" style={{ color: T.danger }}>
          No se pudieron leer los parámetros de liquidación{error ? ` (${error})` : ""}. Revisa que ya corriste el archivo <strong>liquidacion.sql</strong> en Supabase.
        </p>
      )}
      {!cargando && config && !sel && (
        <div className="overflow-x-auto ev-scroll">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left" style={{ color: T.muted }}>
                <th className="px-4 py-2 font-medium text-[12px] uppercase tracking-wide">Colaborador</th>
                <th className="px-3 py-2 font-medium text-[12px] uppercase tracking-wide">Modalidad</th>
                <th className="px-3 py-2 font-medium text-[12px] uppercase tracking-wide text-right">Horas</th>
                <th className="px-3 py-2 font-medium text-[12px] uppercase tracking-wide text-right">Total estimado</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filas.map(({ p, r }) => (
                <tr key={p.id} className="border-t" style={{ borderColor: T.border }}>
                  <td className="px-4 py-2.5 font-medium">{p.nombre}</td>
                  <td className="px-3 py-2.5" style={{ color: T.muted }}>{r.modalidad === "prestacion" ? "Prestación de servicios" : "Contrato laboral"}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtH(r.totalHoras)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                    {r.configurado ? fmtCOP(r.total) : <span style={{ color: T.muted }} className="font-normal">Sin configurar</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => setFiltroPersonal(p.id)} className="text-[12px] font-semibold" style={{ color: T.primary }}>Ver detalle</button>
                  </td>
                </tr>
              ))}
              {filas.length > 0 && (
                <tr className="border-t" style={{ borderColor: T.border }}>
                  <td className="px-4 py-2.5 font-semibold" colSpan={3}>Total del servicio (estimado)</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{fmtCOP(totalGeneral)}</td>
                  <td />
                </tr>
              )}
              {filas.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-5 text-center" style={{ color: T.muted }}>No hay colaboradores para mostrar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {!cargando && config && sel && (() => {
        const b = Number(String(bonif).replace(/[^\d.]/g, "")) || 0;
        const d = Number(String(desc).replace(/[^\d.]/g, "")) || 0;
        const r = sel.r;
        const totalFinal = r.total + b - d;
        return (
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="font-semibold text-[14px]">{sel.p.nombre}</p>
                <p className="text-[12px]" style={{ color: T.muted }}>
                  {r.modalidad === "prestacion" ? "Prestación de servicios" : "Contrato laboral"} · {fmtH(r.totalHoras)} h de reloj en el periodo
                  {r.horasExtraRegistradas > 0 ? ` (incluye ${fmtH(r.horasExtraRegistradas)} h de turnos extra registrados)` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {campoFechaPago}
                <button
                  onClick={() => exportarPdf([{ p: sel.p, r, bonif: b, desc: d }], sel.p.nombre)}
                  className="ev-btn px-3 py-1.5 text-[12px] text-white"
                  style={{ background: T.primary }}
                >
                  <Download size={13} /> Exportar PDF
                </button>
                <button onClick={() => setFiltroPersonal("")} className="ev-btn px-3 py-1.5 text-[12px]" style={{ border: `1px solid ${T.border}` }}>Ver a todos</button>
              </div>
            </div>
            {!r.configurado && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px]" style={{ background: T.accentSoft, color: T.accentInk }}>
                <AlertTriangle size={14} /> Falta configurar {r.modalidad === "prestacion" ? "el valor de la hora" : "el salario base"} de esta persona en Configuración → Parámetros de liquidación.
              </div>
            )}
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-left" style={{ color: T.muted }}>
                  <th className="py-1.5 font-medium text-[12px] uppercase tracking-wide">Concepto</th>
                  <th className="py-1.5 font-medium text-[12px] uppercase tracking-wide text-right">Horas</th>
                  <th className="py-1.5 font-medium text-[12px] uppercase tracking-wide text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {r.lineas.map((l, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: T.border }}>
                    <td className="py-2">
                      {l.concepto}
                      {l.nota && <span className="block text-[11px]" style={{ color: T.muted }}>{l.nota}</span>}
                    </td>
                    <td className="py-2 text-right tabular-nums">{l.horas == null ? "—" : fmtH(l.horas)}</td>
                    <td className="py-2 text-right tabular-nums" style={l.deduccion ? { color: T.danger } : undefined}>{l.valor < 0 ? `(${fmtCOP(-l.valor)})` : fmtCOP(l.valor)}</td>
                  </tr>
                ))}
                <tr className="border-t" style={{ borderColor: T.border }}>
                  <td className="py-2">Bonificaciones <span className="text-[11px]" style={{ color: T.muted }}>(opcional, no se guarda)</span></td>
                  <td />
                  <td className="py-1.5 text-right"><input value={bonif} onChange={(e) => setBonif(e.target.value)} placeholder="0" inputMode="numeric" style={{ ...inputStyle, width: 130, padding: "6px 10px", textAlign: "right" }} /></td>
                </tr>
                <tr className="border-t" style={{ borderColor: T.border }}>
                  <td className="py-2">Descuentos <span className="text-[11px]" style={{ color: T.muted }}>(opcional, no se guarda)</span></td>
                  <td />
                  <td className="py-1.5 text-right"><input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="0" inputMode="numeric" style={{ ...inputStyle, width: 130, padding: "6px 10px", textAlign: "right" }} /></td>
                </tr>
                <tr className="border-t-2" style={{ borderColor: T.border }}>
                  <td className="py-2.5 font-semibold" colSpan={2}>{r.modalidad === "prestacion" ? "Total estimado a facturar" : "Total neto estimado a recibir"}</td>
                  <td className="py-2.5 text-right tabular-nums font-semibold text-[15px]" style={{ color: T.primaryDark }}>{fmtCOP(totalFinal)}</td>
                </tr>
              </tbody>
            </table>
            {r.modalidad === "laboral" && (
              <p className="text-[11.5px]" style={{ color: T.muted }}>
                El salario es el del mes completo del corte (hasta el {new Date(`${hasta}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long" })}); los recargos usan las fechas de corte elegidas arriba. Las horas ordinarias ya van dentro del salario: aquí solo se suman recargos y extras.
                {config.extrasPorExceso ? ` Se cuentan como extra las horas sobre ${fmtH(sel.p.horas > 0 ? sel.p.horas : config.jornadaSemanalMax)} h semanales y los turnos extra registrados en Novedades.` : " Solo se pagan como extra los turnos extra registrados en Novedades."}
                {" "}Salud y pensión se calculan sobre salario + recargos. Estimación; no reemplaza la nómina oficial.
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function LiquidacionConfigCard({ ctx }) {
  const { personal, showToast } = ctx;
  const { config, rem, error, cargando, recargar } = useLiquidacionDatos();
  const [form, setForm] = useState(null);
  const [filas, setFilas] = useState({});
  const [guardando, setGuardando] = useState(false);
  React.useEffect(() => { if (config) setForm({ ...config }); }, [config]);
  React.useEffect(() => { setFilas(JSON.parse(JSON.stringify(rem))); }, [rem]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const fila = (id) => filas[id] || { modalidad: "laboral", salarioBase: 0, valorHora: 0 };
  const setFila = (id, patch) => setFilas((f) => ({ ...f, [id]: { ...fila(id), ...patch } }));

  async function guardar() {
    setGuardando(true);
    try {
      await sb(`liquidacion_config?id=eq.${form.id}`, { method: "PATCH", body: JSON.stringify(liqConfigPayload(form)) });
      const cuerpo = personal.map((p) => {
        const f = fila(p.id);
        return { personal_id: p.id, modalidad: f.modalidad, salario_base: Number(f.salarioBase) || 0, valor_hora: Number(f.valorHora) || 0, updated_at: new Date().toISOString() };
      });
      if (cuerpo.length) await sb("liquidacion_personal", { method: "POST", body: JSON.stringify(cuerpo), prefer: "resolution=merge-duplicates,return=minimal" });
      await recargar();
      showToast("Parámetros de liquidación guardados");
    } catch (e) {
      showToast(`No se pudo guardar: ${e.message}`, "warn");
    } finally {
      setGuardando(false);
    }
  }
  const num = (k, label, sufijo) => (
    <Field label={label}>
      <div className="flex items-center gap-1.5">
        <input type="number" step="any" value={form[k]} onChange={(e) => set(k, e.target.value)} style={inputStyle} />
        {sufijo && <span className="text-[12px]" style={{ color: T.muted }}>{sufijo}</span>}
      </div>
    </Field>
  );
  return (
    <div className="ev-card p-5 flex flex-col gap-4">
      <div>
        <h3 className="ev-display font-semibold text-[14px]">Parámetros de liquidación</h3>
        <p className="text-[12px]" style={{ color: T.muted }}>
          Solo el Maestro los ve. Los valores iniciales siguen la normativa colombiana (recargo nocturno desde las 7 p. m.; recargo dominical/festivo 90 % desde el 1 de julio de 2026 y 100 % desde julio de 2027; jornada de 42 h desde el 15 de julio de 2026). Verifica siempre con tu área legal o contable: son editables por si cambian.
        </p>
      </div>
      {cargando && <p className="text-[12.5px]" style={{ color: T.muted }}>Cargando…</p>}
      {!cargando && (error || !form) && (
        <p className="text-[12.5px]" style={{ color: T.danger }}>No se pudo leer la configuración{error ? ` (${error})` : ""}. Corre primero el archivo <strong>liquidacion.sql</strong> en Supabase.</p>
      )}
      {form && (
        <>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide mb-2" style={{ color: T.muted }}>Horarios y jornada</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {num("nocheInicio", "Inicio recargo nocturno", "h (0-24)")}
              {num("nocheFin", "Fin recargo nocturno", "h (0-24)")}
              {num("jornadaSemanalMax", "Jornada semanal máxima", "h")}
              {num("divisorMensual", "Horas mensuales (divisor)", "h")}
            </div>
            <p className="text-[11.5px] mt-1.5" style={{ color: T.muted }}>Los festivos se toman de la lista de festivos de Configuración; los domingos cuentan siempre como dominical.</p>
            <div className="flex flex-col gap-1.5 mt-3">
              <label className="flex items-start gap-2 text-[13px]">
                <input type="checkbox" className="mt-0.5" checked={!!form.descontarDescanso} onChange={(e) => set("descontarDescanso", e.target.checked)} />
                <span>Descontar el descanso del turno noche al calcular recargos <span className="text-[11.5px]" style={{ color: T.muted }}>(apagado = se cuentan todas las horas de reloj del turno, como en la colilla actual)</span></span>
              </label>
              <label className="flex items-start gap-2 text-[13px]">
                <input type="checkbox" className="mt-0.5" checked={!!form.extrasPorExceso} onChange={(e) => set("extrasPorExceso", e.target.checked)} />
                <span>Pagar como hora extra lo que supere las horas semanales de cada persona <span className="text-[11.5px]" style={{ color: T.muted }}>(apagado = solo cuentan como extra los turnos extra registrados en Novedades)</span></span>
              </label>
            </div>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide mb-2" style={{ color: T.muted }}>Auxilio de transporte y deducciones (contrato laboral)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {num("smmlv", "Salario mínimo (SMMLV)", "$")}
              {num("auxilioTransporte", "Auxilio de transporte", "$")}
              {num("pctSalud", "Salud (trabajador)", "%")}
              {num("pctPension", "Pensión (trabajador)", "%")}
            </div>
            <p className="text-[11.5px] mt-1.5" style={{ color: T.muted }}>El auxilio aplica a quien devenga hasta 2 salarios mínimos. Salud y pensión se descuentan sobre salario + recargos.</p>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide mb-2" style={{ color: T.muted }}>Contrato laboral (% sobre la hora ordinaria)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {num("pctRecargoNocturno", "Recargo nocturno", "%")}
              {num("pctRecargoDominical", "Recargo dominical / festivo", "%")}
              {num("pctExtraDiurna", "Hora extra diurna", "%")}
              {num("pctExtraNocturna", "Hora extra nocturna", "%")}
            </div>
            <p className="text-[11.5px] mt-1.5" style={{ color: T.muted }}>El recargo nocturno dominical y las extras dominicales se calculan sumando estos porcentajes.</p>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide mb-2" style={{ color: T.muted }}>Prestación de servicios (valor adicional pactado sobre la hora)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {num("pctPsNocturno", "Hora nocturna", "%")}
              {num("pctPsDominical", "Hora dominical / festiva", "%")}
              {num("pctPsNoctDominical", "Nocturna dominical / festiva", "%")}
            </div>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide mb-2" style={{ color: T.muted }}>Contratación y valores por colaborador (servicio actual)</p>
            <div className="overflow-x-auto ev-scroll">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left" style={{ color: T.muted }}>
                    <th className="py-1.5 pr-3 font-medium text-[12px]">Colaborador</th>
                    <th className="py-1.5 pr-3 font-medium text-[12px]">Modalidad</th>
                    <th className="py-1.5 pr-3 font-medium text-[12px]">Salario base mensual</th>
                    <th className="py-1.5 font-medium text-[12px]">Valor hora (prestación)</th>
                  </tr>
                </thead>
                <tbody>
                  {personal.map((p) => {
                    const f = fila(p.id);
                    const esPS = f.modalidad === "prestacion";
                    return (
                      <tr key={p.id} className="border-t" style={{ borderColor: T.border }}>
                        <td className="py-2 pr-3 font-medium">{p.nombre}</td>
                        <td className="py-2 pr-3">
                          <select value={f.modalidad} onChange={(e) => setFila(p.id, { modalidad: e.target.value })} style={{ ...inputStyle, padding: "6px 10px" }}>
                            <option value="laboral">Contrato laboral</option>
                            <option value="prestacion">Prestación de servicios</option>
                          </select>
                        </td>
                        <td className="py-2 pr-3"><input type="number" min={0} disabled={esPS} value={f.salarioBase || ""} onChange={(e) => setFila(p.id, { salarioBase: e.target.value })} placeholder="0" style={{ ...inputStyle, padding: "6px 10px", opacity: esPS ? 0.5 : 1 }} /></td>
                        <td className="py-2"><input type="number" min={0} disabled={!esPS} value={f.valorHora || ""} onChange={(e) => setFila(p.id, { valorHora: e.target.value })} placeholder="0" style={{ ...inputStyle, padding: "6px 10px", opacity: !esPS ? 0.5 : 1 }} /></td>
                      </tr>
                    );
                  })}
                  {personal.length === 0 && <tr><td colSpan={4} className="py-4 text-center" style={{ color: T.muted }}>No hay personal en este servicio.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <button onClick={guardar} disabled={guardando} className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-60" style={{ background: T.primary }}>
              {guardando ? "Guardando…" : "Guardar parámetros de liquidación"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TurnosCalendario({ ctx }) {
  const { isMaestro, events, personal, monthOffset, setMonthOffset, setDetail, reglas, festivos, novedades, turnosExtra } = ctx;
  const turnos = events.filter((e) => TURNO_TYPES.includes(e.type));
  const festivoSet = new Set((festivos || []).map((f) => f.fecha));
  const elegibles = personal.filter((p) => esCargoDeTurno(p.cargo, reglas?.cargosTurno));
  const [generarOpen, setGenerarOpen] = useState(false);

  const baseParaResumen = elegibles.length > 0 ? elegibles : personal;

  const base = new Date(TODAY.getFullYear(), TODAY.getMonth() + monthOffset, 1);
  const gridStart = getMonday(new Date(base.getFullYear(), base.getMonth(), 1));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const todayISO = toISO(TODAY);
  const lastCellInMonth = cells.reduce((acc, d, i) => (d.getMonth() === base.getMonth() ? i : acc), 0);
  const visibleCells = cells.slice(0, Math.ceil((lastCellInMonth + 1) / 7) * 7);
  const semanasDelMes = [];
  for (let i = 0; i < visibleCells.length; i += 7) semanasDelMes.push(visibleCells.slice(i, i + 7));

  // Rango personalizado para las tablas de resumen (independiente del mes que se esté viendo en el calendario)
  const [usarRango, setUsarRango] = useState(false);
  const [filtroPersonal, setFiltroPersonal] = useState(""); // "" = todos
  const [rangoDesde, setRangoDesde] = useState(toISO(new Date(base.getFullYear(), base.getMonth(), 1)));
  const [rangoHasta, setRangoHasta] = useState(toISO(new Date(base.getFullYear(), base.getMonth() + 1, 0)));

  const primerDiaResumen = usarRango ? rangoDesde : toISO(new Date(base.getFullYear(), base.getMonth(), 1));
  const ultimoDiaResumen = usarRango ? rangoHasta : toISO(new Date(base.getFullYear(), base.getMonth() + 1, 0));

  const semanasResumen = usarRango
    ? (() => {
        const inicio = getMonday(new Date(`${rangoDesde}T00:00:00`));
        const fin = new Date(`${rangoHasta}T00:00:00`);
        const totalDias = Math.round((fin - inicio) / 86400000) + 1;
        const numSemanas = Math.max(1, Math.ceil(totalDias / 7));
        return Array.from({ length: numSemanas }, (_, i) => Array.from({ length: 7 }, (_, j) => addDays(inicio, i * 7 + j)));
      })()
    : semanasDelMes;

  const personasParaTablas = filtroPersonal ? baseParaResumen.filter((p) => p.id === filtroPersonal) : baseParaResumen;

  const horasPorSemana = personasParaTablas.map((p) => {
    const porSemana = semanasResumen.map((semana) => {
      const fechas = semana.map(toISO).filter((f) => f >= primerDiaResumen && f <= ultimoDiaResumen);
      return turnos.filter((t) => t.personalId === p.id && fechas.includes(t.date)).reduce((a, t) => a + horasEfectivas(t), 0);
    });
    return { ...p, porSemana };
  });

  const turnosDelRango = turnos.filter((t) => t.date >= primerDiaResumen && t.date <= ultimoDiaResumen);
  const resumenPorPersona = personasParaTablas.map((p) => {
    const suyos = turnosDelRango.filter((t) => t.personalId === p.id);
    const esDomingo = (t) => new Date(`${t.date}T00:00:00`).getDay() === 0;
    return {
      ...p,
      dia: suyos.filter((t) => t.type === "turno_dia").length,
      noche: suyos.filter((t) => t.type === "turno_noche").length,
      domingoDia: suyos.filter((t) => t.type === "turno_dia" && esDomingo(t)).length,
      domingoNoche: suyos.filter((t) => t.type === "turno_noche" && esDomingo(t)).length,
      festivoDia: suyos.filter((t) => t.type === "turno_dia" && festivoSet.has(t.date)).length,
      festivoNoche: suyos.filter((t) => t.type === "turno_noche" && festivoSet.has(t.date)).length,
    };
  });

  // Novedades (incapacidad/permiso/vacaciones) que se cruzan con el periodo del resumen.
  const NOMBRES_NOVEDAD_RESUMEN = { incapacidad: "Incapacidad", permiso: "Permiso", vacaciones: "Vacaciones", otro: "Novedad" };
  const novedadesDelRango = (novedades || [])
    .filter((n) => n.fechaInicio <= ultimoDiaResumen && n.fechaFin >= primerDiaResumen)
    .filter((n) => !filtroPersonal || n.personalId === filtroPersonal)
    .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));

  // Turnos extra dentro del periodo: los que el Maestro registró manualmente
  // en Novedades (ya no se intenta adivinar comparando contra el mínimo).
  const turnosExtraDelRango = (turnosExtra || [])
    .filter((t) => t.fecha >= primerDiaResumen && t.fecha <= ultimoDiaResumen)
    .filter((t) => !filtroPersonal || t.personalId === filtroPersonal);

  const eventosNovedadesYExtras = [
    ...novedadesDelRango.map((n) => ({
      key: `n-${n.id}`, orden: n.fechaInicio,
      texto: `${NOMBRES_NOVEDAD_RESUMEN[n.tipo] || "Novedad"}: ${personName(n.personalId)} — del ${new Date(`${n.fechaInicio}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" })} al ${new Date(`${n.fechaFin}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}${n.motivo ? ` (${n.motivo})` : ""}`,
      tipo: "novedad",
    })),
    ...turnosExtraDelRango.map((t) => ({
      key: `e-${t.id}`, orden: t.fecha,
      texto: `Turno extra: ${personName(t.personalId)} — ${new Date(`${t.fecha}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}, ${ACTIVITY_TYPES[t.tipoTurno].label.toLowerCase()}, ${t.horas}h${t.cubrePersonalId ? ` (cubriendo a ${personName(t.cubrePersonalId)})` : ""}${t.motivo ? ` · ${t.motivo}` : ""}`,
      tipo: "extra",
    })),
  ].sort((a, b) => a.orden.localeCompare(b.orden));

  function chipsFor(dISO, tipo) {
    return turnos.filter((t) => t.date === dISO && t.type === tipo);
  }

  return (
    <div className="flex flex-col gap-4">
      <ReadOnlyBanner isMaestro={isMaestro} />
      {elegibles.length === 0 && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-[12.5px]" style={{ background: T.accentSoft, color: T.accentInk }}>
          <AlertTriangle size={14} /> Ningún colaborador tiene alguno de los cargos configurados para turnos — revísalos en Configuración o edítalos en Personal.
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Legend types={TURNO_TYPES} />
          <select
            value={filtroPersonal}
            onChange={(e) => setFiltroPersonal(e.target.value)}
            className="text-[12.5px] rounded-lg px-2.5 py-1.5"
            style={{ border: `1px solid ${T.border}`, background: T.surface, color: T.ink }}
          >
            <option value="">Todo el personal</option>
            {baseParaResumen.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        {isMaestro && (
          <div className="flex gap-2">
            <button
              onClick={() => setGenerarOpen(true)}
              className="ev-btn px-3.5 py-2 text-[12.5px]"
              style={{ border: `1px solid ${T.primary}`, color: T.primary }}
            >
              <Sparkles size={14} /> Generar automáticamente
            </button>
            <button
              onClick={() => ctx.setModal({ mode: "new", event: null, defaultType: "turno_dia" })}
              className="ev-btn px-3.5 py-2 text-[12.5px] text-white"
              style={{ background: T.primary }}
            >
              <Plus size={14} /> Nuevo turno
            </button>
          </div>
        )}
      </div>
      {generarOpen && <GenerarTurnosModal ctx={ctx} onClose={() => setGenerarOpen(false)} />}

      <TurnosMesGrid ctx={ctx} filtroPersonalId={filtroPersonal} />

      <div className="ev-card p-4 max-w-3xl">
        <label className="flex items-center gap-2 text-[13px] font-medium mb-1">
          <input type="checkbox" checked={usarRango} onChange={(e) => setUsarRango(e.target.checked)} />
          Usar un rango de fechas personalizado para los resúmenes de abajo
        </label>
        {usarRango && (
          <div className="grid grid-cols-2 gap-3 mt-2 max-w-sm">
            <Field label="Desde">
              <input type="date" value={rangoDesde} onChange={(e) => setRangoDesde(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Hasta">
              <input type="date" value={rangoHasta} min={rangoDesde} onChange={(e) => setRangoHasta(e.target.value)} style={inputStyle} />
            </Field>
          </div>
        )}
      </div>

      <div className="ev-card overflow-hidden max-w-2xl">
        <div className="px-4 py-3 border-b" style={{ borderColor: T.border }}>
          <h3 className="ev-display font-semibold text-[13.5px]">
            {filtroPersonal ? `Horas de ${personById(filtroPersonal)?.nombre}` : "Horas por colaborador"} · {usarRango
              ? `${new Date(`${rangoDesde}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" })} – ${new Date(`${rangoHasta}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}`
              : `por semana de ${MES_LABEL[base.getMonth()]}`}
          </h3>
        </div>
        <div className="overflow-x-auto ev-scroll">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left" style={{ color: T.muted }}>
                <th className="px-4 py-2 font-medium text-[12px] uppercase tracking-wide">Colaborador</th>
                {semanasResumen.map((semana, i) => (
                  <th key={i} className="px-3 py-2 font-medium text-[12px] uppercase tracking-wide text-right">
                    {usarRango
                      ? `${semana[0].toLocaleDateString("es-CO", { day: "numeric", month: "short" })}–${semana[6].toLocaleDateString("es-CO", { day: "numeric", month: "short" })}`
                      : `Semana ${i + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {horasPorSemana.map((p) => (
                <tr key={p.id} className="border-t" style={{ borderColor: T.border }}>
                  <td className="px-4 py-2 font-medium">{p.nombre}</td>
                  {p.porSemana.map((h, i) => {
                    const over = h > (p.horas || reglas?.horasSemanaObjetivo || 44);
                    return (
                      <td key={i} className="px-3 py-2 text-right ev-mono" style={{ color: over ? T.danger : T.muted }}>
                        {h}h
                      </td>
                    );
                  })}
                </tr>
              ))}
              {horasPorSemana.length === 0 && (
                <tr><td colSpan={semanasResumen.length + 1} className="px-4 py-5 text-center" style={{ color: T.muted }}>No hay colaboradores registrados para turnos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ev-card overflow-hidden max-w-3xl">
        <div className="px-4 py-3 border-b" style={{ borderColor: T.border }}>
          <h3 className="ev-display font-semibold text-[13.5px]">
            {filtroPersonal ? `Resumen de turnos de ${personById(filtroPersonal)?.nombre}` : "Resumen de turnos"} · {usarRango
              ? `${new Date(`${rangoDesde}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" })} – ${new Date(`${rangoHasta}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}`
              : `${MES_LABEL[base.getMonth()]} ${base.getFullYear()}`}
          </h3>
          <p className="text-[11.5px]" style={{ color: T.muted }}>Número de turnos por persona en el mes, separados por tipo.</p>
        </div>
        <div className="overflow-x-auto ev-scroll">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left" style={{ color: T.muted }}>
                <th rowSpan={2} className="px-4 py-2 font-medium text-[12px] uppercase tracking-wide align-bottom">Colaborador</th>
                <th colSpan={2} className="px-3 py-1 font-medium text-[11.5px] uppercase tracking-wide text-center border-b" style={{ borderColor: T.border }}>Total</th>
                <th colSpan={2} className="px-3 py-1 font-medium text-[11.5px] uppercase tracking-wide text-center border-b" style={{ borderColor: T.border }}>Domingo</th>
                <th colSpan={2} className="px-3 py-1 font-medium text-[11.5px] uppercase tracking-wide text-center border-b" style={{ borderColor: T.border }}>Festivo</th>
              </tr>
              <tr className="text-left" style={{ color: T.muted }}>
                <th className="px-3 py-1.5 font-medium text-[12px] uppercase tracking-wide text-right">Día</th>
                <th className="px-3 py-1.5 font-medium text-[12px] uppercase tracking-wide text-right">Noche</th>
                <th className="px-3 py-1.5 font-medium text-[12px] uppercase tracking-wide text-right">Día</th>
                <th className="px-3 py-1.5 font-medium text-[12px] uppercase tracking-wide text-right">Noche</th>
                <th className="px-3 py-1.5 font-medium text-[12px] uppercase tracking-wide text-right">Día</th>
                <th className="px-3 py-1.5 font-medium text-[12px] uppercase tracking-wide text-right">Noche</th>
              </tr>
            </thead>
            <tbody>
              {resumenPorPersona.map((p) => (
                <tr key={p.id} className="border-t" style={{ borderColor: T.border }}>
                  <td className="px-4 py-2 font-medium">{p.nombre}</td>
                  <td className="px-3 py-2 text-right ev-mono" style={{ color: T.muted }}>{p.dia}</td>
                  <td className="px-3 py-2 text-right ev-mono" style={{ color: T.muted }}>{p.noche}</td>
                  <td className="px-3 py-2 text-right ev-mono" style={{ color: p.domingoDia > 0 ? T.danger : T.muted }}>{p.domingoDia}</td>
                  <td className="px-3 py-2 text-right ev-mono" style={{ color: p.domingoNoche > 0 ? T.danger : T.muted }}>{p.domingoNoche}</td>
                  <td className="px-3 py-2 text-right ev-mono" style={{ color: p.festivoDia > 0 ? T.danger : T.muted }}>{p.festivoDia}</td>
                  <td className="px-3 py-2 text-right ev-mono" style={{ color: p.festivoNoche > 0 ? T.danger : T.muted }}>{p.festivoNoche}</td>
                </tr>
              ))}
              {resumenPorPersona.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-5 text-center" style={{ color: T.muted }}>No hay colaboradores registrados para turnos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isMaestro && (
        <LiquidacionPanel
          ctx={ctx} turnos={turnos} personas={personasParaTablas}
          filtroPersonal={filtroPersonal} setFiltroPersonal={setFiltroPersonal}
          desde={primerDiaResumen} hasta={ultimoDiaResumen} festivoSet={festivoSet}
          etiquetaPeriodo={usarRango
            ? `${new Date(`${rangoDesde}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" })} – ${new Date(`${rangoHasta}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}`
            : MES_LABEL[base.getMonth()]}
        />
      )}

      <div className="ev-card overflow-hidden max-w-3xl">
        <div className="px-4 py-3 border-b" style={{ borderColor: T.border }}>
          <h3 className="ev-display font-semibold text-[13.5px]">Novedades y turnos extra del periodo</h3>
          <p className="text-[11.5px]" style={{ color: T.muted }}>
            Incapacidades, permisos y vacaciones, junto con los turnos extra que hayas registrado manualmente — todo se toma directo de lo que registres en Novedades.
          </p>
        </div>
        <div className="flex flex-col divide-y" style={{ borderColor: T.border }}>
          {eventosNovedadesYExtras.map((e) => (
            <div key={e.key} className="flex items-center gap-2.5 px-4 py-2.5 text-[13px]">
              {e.tipo === "novedad" ? (
                <UserX size={14} className="shrink-0" style={{ color: T.danger }} />
              ) : (
                <Plus size={14} className="shrink-0" style={{ color: T.accentInk }} />
              )}
              <span>{e.texto}</span>
            </div>
          ))}
          {eventosNovedadesYExtras.length === 0 && (
            <p className="px-4 py-5 text-center text-[12.5px]" style={{ color: T.muted }}>Sin novedades ni turnos extra en este periodo.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TurnoMiniBox({ tipo, chips, onChipClick, min, reglas, marcarExtra }) {
  const color = ACTIVITY_TYPES[tipo].color;
  const Icon = ACTIVITY_TYPES[tipo].icon;
  const falta = typeof min === "number" && chips.length < min;
  const personasDelTurno = chips.map((c) => personById(c.personalId)).filter(Boolean);
  const operadoresEnTurno = personasDelTurno.filter((p) => esOperador(p.cargo, reglas));
  const dosOperadoresJuntos = reglas?.operadorRequiereAuxiliar && operadoresEnTurno.length > 1;
  const sinAcompanamiento = reglas?.operadorRequiereAuxiliar
    && operadoresEnTurno.length === 1
    && !personasDelTurno.some((p) => esAuxiliar(p.cargo, reglas));
  return (
    <div
      className="rounded-lg px-2 py-1.5"
      style={{
        background: (falta || sinAcompanamiento || dosOperadoresJuntos) ? T.dangerSoft : `color-mix(in srgb, ${color} 6%, ${T.surface})`,
        borderLeft: `3px solid ${(falta || sinAcompanamiento || dosOperadoresJuntos) ? T.danger : color}`,
        outline: "none",
      }}
    >
      <p className="text-[10.5px] font-semibold uppercase tracking-wide flex items-center gap-1" style={{ color }}>
        <Icon size={11} />
        {tipo === "turno_dia" ? "Día" : "Noche"}
        {(falta || sinAcompanamiento || dosOperadoresJuntos) && <AlertTriangle size={10} style={{ color: T.danger }} />}
      </p>
      {chips.length === 0 && <p className="text-[11px]" style={{ color: T.muted }}>—</p>}
      {chips.map((c, idx) => {
        const esExtra = marcarExtra && typeof min === "number" && idx >= min;
        return (
          <button
            key={c.id}
            onClick={(ev) => { ev.stopPropagation(); onChipClick(c); }}
            className="block w-full text-left leading-snug truncate hover:underline"
            style={{ color: T.ink }}
            title={`${personName(c.personalId)} · ${fmtRange(c.start, c.end)} · ${horasEfectivas(c)}h${esExtra ? " · Turno extra por ausencia" : ""}`}
          >
            <span className="text-[13px] font-semibold">{personName(c.personalId)}</span>{" "}
            {esExtra && <span className="text-[10px] font-bold" style={{ color: T.danger }}>+E</span>}{" "}
            <span className="ev-mono text-[11px]" style={{ color: T.muted }}>{horasEfectivas(c)}h</span>
          </button>
        );
      })}
      {falta && <p className="text-[10px] font-medium" style={{ color: T.danger }}>Faltan {min - chips.length}</p>}
      {!falta && dosOperadoresJuntos && <p className="text-[10px] font-medium" style={{ color: T.danger }}>2 operadores juntos</p>}
      {!falta && !dosOperadoresJuntos && sinAcompanamiento && <p className="text-[10px] font-medium" style={{ color: T.danger }}>Sin auxiliar</p>}
    </div>
  );
}

/* ============================== MODAL: GENERAR TURNOS AUTOMÁTICAMENTE ============================== */
function GenerarTurnosModal({ ctx, onClose }) {
  const { personal, events, reglas, festivos, saving, confirmarPropuestaTurnos, showToast } = ctx;
  const [fechaInicio, setFechaInicio] = useState(toISO(getMonday(TODAY)));
  const [semanas, setSemanas] = useState(1);
  const [resultado, setResultado] = useState(null); // { propuestas, faltantes, elegiblesCount }
  const [excluidos, setExcluidos] = useState(new Set());

  function generar() {
    const r = generarPropuestaTurnos({ personal, eventosExistentes: events, reglas, festivos, novedades: ctx.novedades, reglasPersonal: ctx.reglasPersonal, fechaInicioISO: fechaInicio, semanas: Number(semanas) });
    setResultado(r);
    setExcluidos(new Set());
  }

  function toggleExcluir(id) {
    setExcluidos((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function confirmar() {
    const finales = resultado.propuestas.filter((p) => !excluidos.has(p.id));
    if (finales.length === 0) { showToast("No hay turnos para guardar", "warn"); return; }
    await confirmarPropuestaTurnos(finales);
    onClose();
  }

  const porDia = {};
  (resultado?.propuestas || []).forEach((p) => { (porDia[p.date] ||= []).push(p); });
  const fechasOrdenadas = Object.keys(porDia).sort();
  const totalIncluidos = (resultado?.propuestas || []).filter((p) => !excluidos.has(p.id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ev-card w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto ev-scroll">
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px] flex items-center gap-2">
            <Sparkles size={16} style={{ color: T.primary }} /> Generar turnos automáticamente
          </h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        {!resultado && (
          <>
            {!reglas && (
              <p className="text-[12.5px] mb-4 px-3 py-2 rounded-lg" style={{ background: T.dangerSoft, color: T.danger }}>
                No hay reglas configuradas. Ve a Configuración y corre primero la migración de reglas de turnos.
              </p>
            )}
            <p className="text-[12.5px] mb-4" style={{ color: T.muted }}>
              Se completan solo los días y turnos que hoy están vacíos — nada de lo ya asignado manualmente se toca. Usa las reglas definidas en Configuración.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Semana de inicio (lunes)">
                <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(toISO(getMonday(new Date(`${e.target.value}T00:00:00`))))} style={inputStyle} />
              </Field>
              <Field label="Cuántas semanas">
                <select value={semanas} onChange={(e) => setSemanas(e.target.value)} style={inputStyle}>
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} semana{n > 1 ? "s" : ""}</option>)}
                </select>
              </Field>
            </div>
            <button onClick={generar} disabled={!reglas} className="ev-btn w-full justify-center px-4 py-2.5 text-[13px] text-white disabled:opacity-40" style={{ background: T.primary }}>
              Generar propuesta
            </button>
          </>
        )}

        {resultado && (
          <>
            {resultado.elegiblesCount === 0 && (
              <p className="text-[12.5px] mb-3 px-3 py-2 rounded-lg" style={{ background: T.dangerSoft, color: T.danger }}>
                No hay colaboradores activos con los cargos configurados para turnos.
              </p>
            )}
            {resultado.faltantes.length > 0 && (
              <div className="mb-3 px-3 py-2.5 rounded-lg text-[12px]" style={{ background: T.accentSoft, color: T.accentInk }}>
                <p className="font-semibold mb-1">No alcanzó el personal para {resultado.faltantes.length} turno(s):</p>
                {resultado.faltantes.slice(0, 6).map((f, i) => (
                  <p key={i}>{new Date(`${f.date}T00:00:00`).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })} · {ACTIVITY_TYPES[f.type].label} · {f.motivo || `faltan ${f.faltan}`}</p>
                ))}
                {resultado.faltantes.length > 6 && <p>y {resultado.faltantes.length - 6} más…</p>}
              </div>
            )}
            <p className="text-[12px] mb-2" style={{ color: T.muted }}>
              Destilda los que no quieras guardar. Se van a crear <strong style={{ color: T.ink }}>{totalIncluidos}</strong> turno(s).
            </p>
            <div className="flex flex-col gap-3 max-h-80 overflow-y-auto ev-scroll">
              {fechasOrdenadas.map((dISO) => (
                <div key={dISO}>
                  <p className="text-[11.5px] font-semibold mb-1 capitalize" style={{ color: T.muted }}>
                    {new Date(`${dISO}T00:00:00`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                  {porDia[dISO].map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-[12.5px] py-1">
                      <input type="checkbox" checked={!excluidos.has(p.id)} onChange={() => toggleExcluir(p.id)} />
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ACTIVITY_TYPES[p.type].color }} />
                      {p.title} — {personName(p.personalId)}
                    </label>
                  ))}
                </div>
              ))}
              {fechasOrdenadas.length === 0 && <p className="text-[12.5px] text-center py-4" style={{ color: T.muted }}>Todos los turnos de este rango ya están cubiertos.</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setResultado(null)} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Volver</button>
              <button onClick={confirmar} disabled={saving || totalIncluidos === 0} className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40" style={{ background: T.primary }}>
                {saving ? "Guardando…" : `Confirmar y guardar (${totalIncluidos})`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ReadOnlyBanner({ isMaestro }) {
  if (isMaestro) return null;
  return (
    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-[12.5px]" style={{ background: T.accentSoft, color: T.accentInk }}>
      <Lock size={14} /> Estás en modo lectura. Solo un usuario Maestro puede crear, editar o eliminar registros.
    </div>
  );
}

function Legend({ types }) {
  const entries = types ? types.map((k) => [k, ACTIVITY_TYPES[k]]) : Object.entries(ACTIVITY_TYPES);
  return (
    <div className="hidden xl:flex items-center gap-3 flex-wrap">
      {entries.map(([k, v]) => {
        const Icon = v.icon;
        return (
          <span key={k} className="flex items-center gap-1.5 text-[12.5px]" style={{ color: T.muted }}>
            <Icon size={13} style={{ color: v.color }} /> {v.label}
          </span>
        );
      })}
    </div>
  );
}

const HOUR_START = 6;
const HOUR_END = 24;
const ROW_H = 60;

// Cuando dos o más actividades coinciden en el mismo horario (ej. dos grupos
// distintos a las 8am), esta función les asigna columnas para mostrarse una
// junto a la otra en vez de encimarse.
function calcularColumnasSolapadas(eventosDia) {
  const ordenados = [...eventosDia].sort((a, b) => a.start - b.start || a.end - b.end);
  const resultado = [];
  let cluster = [];
  let finCluster = -Infinity;

  function procesarCluster(grupo) {
    const columnas = []; // guarda el "end" ocupado por cada columna
    const conCol = grupo.map((ev) => {
      let colIdx = columnas.findIndex((finCol) => finCol <= ev.start);
      if (colIdx === -1) { columnas.push(ev.end); colIdx = columnas.length - 1; }
      else columnas[colIdx] = ev.end;
      return { ...ev, col: colIdx };
    });
    const totalCols = columnas.length;
    conCol.forEach((ev) => resultado.push({ ...ev, totalCols }));
  }

  ordenados.forEach((ev) => {
    if (cluster.length === 0 || ev.start < finCluster) {
      cluster.push(ev);
      finCluster = Math.max(finCluster, ev.end);
    } else {
      procesarCluster(cluster);
      cluster = [ev];
      finCluster = ev.end;
    }
  });
  if (cluster.length) procesarCluster(cluster);

  return resultado;
}

function WeekView({ ctx, types }) {
  const { weekDays, weekOffset, setWeekOffset, events, setDetail, setModal, isMaestro } = ctx;
  const todayISO = toISO(TODAY);
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const filtered = events.filter((e) => types.includes(e.type));
  const [vistaLista, setVistaLista] = useState(false);

  return (
    <div className="ev-card overflow-hidden print-area">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: T.border }}>
        <div className="no-print flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: T.base, border: `1px solid ${T.border}` }}>
          <button
            onClick={() => setVistaLista(false)}
            title="Vista de cuadrícula (por hora)"
            className="p-1.5 rounded-md"
            style={{ background: !vistaLista ? T.surface : "transparent", boxShadow: !vistaLista ? T.shadow : "none" }}
          >
            <LayoutGrid size={14} style={{ color: !vistaLista ? T.primary : T.muted }} />
          </button>
          <button
            onClick={() => setVistaLista(true)}
            title="Vista de lista (compacta, sin espacios vacíos)"
            className="p-1.5 rounded-md"
            style={{ background: vistaLista ? T.surface : "transparent", boxShadow: vistaLista ? T.shadow : "none" }}
          >
            <List size={14} style={{ color: vistaLista ? T.primary : T.muted }} />
          </button>
        </div>
        <p className="ev-display font-semibold text-[14px]">
          {weekDays[0].toLocaleDateString("es-CO", { day: "numeric", month: "short" })} – {weekDays[6].toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
        </p>
        <div className="no-print flex items-center gap-2">
          <button className="p-1.5 rounded-lg" style={{ border: `1px solid ${T.border}` }} onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft size={16} />
          </button>
          <button className="p-1.5 rounded-lg" style={{ border: `1px solid ${T.border}` }} onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      {vistaLista ? (
        <ListaSemanal weekDays={weekDays} filtered={filtered} todayISO={todayISO} setDetail={setDetail} />
      ) : (
      <div className="overflow-x-auto ev-scroll">
        <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, minmax(190px, 1fr))", minWidth: 1400 }}>
          <div />
          {weekDays.map((d, i) => (
            <div key={i} className="px-2 py-2 text-center border-l" style={{ borderColor: T.border, background: toISO(d) === todayISO ? T.primarySoft : "transparent" }}>
              <p className="text-[11px] font-medium" style={{ color: T.muted }}>{DIA_LABEL[i]}</p>
              <p className="ev-display font-semibold text-[15px]">{d.getDate()}</p>
            </div>
          ))}

          <div className="relative" style={{ height: hours.length * ROW_H }}>
            {hours.map((h) => (
              <div key={h} className="ev-mono text-[10.5px] pr-2 text-right absolute w-full" style={{ top: (h - HOUR_START) * ROW_H - 7, color: T.muted }}>
                {String(h % 24).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {weekDays.map((d, dayIdx) => {
            const dISO = toISO(d);
            const dayEvents = filtered.filter((e) => e.date === dISO);
            return (
              <div
                key={dayIdx}
                className="relative border-l ev-scroll"
                style={{ height: hours.length * ROW_H, borderColor: T.border }}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    onClick={() => isMaestro && ctx.setModal({ mode: "new", event: null, defaultType: types[0], prefill: { date: dISO, start: h, end: h + 1 } })}
                    className={`absolute w-full border-t ${isMaestro ? "hover:bg-black/[0.02] cursor-pointer" : ""}`}
                    style={{ top: (h - HOUR_START) * ROW_H, height: ROW_H, borderColor: T.border }}
                  />
                ))}
                {calcularColumnasSolapadas(dayEvents).map((e) => {
                  const top = (Math.max(e.start, HOUR_START) - HOUR_START) * ROW_H;
                  const bottom = (Math.min(e.end, HOUR_END) - HOUR_START) * ROW_H;
                  const color = ACTIVITY_TYPES[e.type].color;
                  const Icon = ACTIVITY_TYPES[e.type].icon;
                  const anchoPct = 100 / e.totalCols;
                  const alto = Math.max(bottom - top, 32);
                  return (
                    <div
                      key={e.id}
                      onClick={(ev) => { ev.stopPropagation(); setDetail(e); }}
                      className="absolute rounded-md px-2 py-1 cursor-pointer overflow-hidden hover:shadow-md hover:z-10 transition-shadow"
                      style={{
                        top, height: alto,
                        left: `calc(${e.col * anchoPct}% + 2px)`,
                        width: `calc(${anchoPct}% - 4px)`,
                        background: `color-mix(in srgb, ${color} 10%, ${T.surface})`, borderLeft: `3px solid ${color}`,
                      }}
                    >
                      <p className="text-[12.5px] font-semibold leading-snug line-clamp-2 flex items-start gap-1" style={{ color: T.ink }}>
                        <Icon size={12} className="shrink-0 mt-[2.5px]" style={{ color }} />
                        <span>{e.title}</span>
                      </p>
                      {alto >= 40 && <p className="text-[11px] truncate mt-0.5" style={{ color: T.muted }}>{personName(e.personalId)}</p>}
                      {e.end > HOUR_END && <p className="text-[9.5px] font-medium" style={{ color }}>continúa mañana ↴</p>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}

function ListaSemanal({ weekDays, filtered, todayISO, setDetail }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 divide-x" style={{ borderColor: T.border }}>
      {weekDays.map((d, i) => {
        const dISO = toISO(d);
        const dayEvents = filtered
          .filter((e) => e.date === dISO)
          .sort((a, b) => a.start - b.start);
        return (
          <div key={i} className="flex flex-col" style={{ background: dISO === todayISO ? T.primarySoft : "transparent" }}>
            <div className="px-3 py-2 text-center border-b" style={{ borderColor: T.border }}>
              <p className="text-[11px] font-medium" style={{ color: T.muted }}>{DIA_LABEL[i]}</p>
              <p className="ev-display font-semibold text-[15px]">{d.getDate()}</p>
            </div>
            <div className="flex flex-col gap-1.5 p-2">
              {dayEvents.map((e) => {
                const color = ACTIVITY_TYPES[e.type].color;
                const Icon = ACTIVITY_TYPES[e.type].icon;
                return (
                  <button
                    key={e.id}
                    onClick={() => setDetail(e)}
                    className="text-left rounded-md px-2 py-1.5 hover:shadow-sm transition-shadow"
                    style={{ background: `color-mix(in srgb, ${color} 10%, ${T.surface})`, borderLeft: `3px solid ${color}` }}
                  >
                    <p className="ev-mono text-[10px]" style={{ color: T.muted }}>{fmtRange(e.start, e.end)}</p>
                    <p className="text-[12px] font-semibold leading-snug flex items-start gap-1" style={{ color: T.ink }}>
                      <Icon size={11} className="shrink-0 mt-[2.5px]" style={{ color }} />
                      <span>{e.title}</span>
                    </p>
                    {e.personalId && <p className="text-[10.5px] truncate" style={{ color: T.muted }}>{personName(e.personalId)}</p>}
                  </button>
                );
              })}
              {dayEvents.length === 0 && (
                <p className="text-[11.5px] text-center py-4" style={{ color: T.muted }}>Sin actividades.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ ctx, types }) {
  const { monthOffset, setMonthOffset, events, setCalMode, setWeekOffset } = ctx;
  const base = new Date(TODAY.getFullYear(), TODAY.getMonth() + monthOffset, 1);
  const firstOfMonth = new Date(base.getFullYear(), base.getMonth(), 1);
  const gridStart = getMonday(firstOfMonth);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const todayISO = toISO(TODAY);
  const filtered = events.filter((e) => types.includes(e.type));

  function jumpToWeek(d) {
    const diffDays = Math.round((getMonday(d) - monday) / 86400000);
    setWeekOffset(diffDays / 7);
    setCalMode("semana");
  }

  return (
    <div className="ev-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: T.border }}>
        <button className="p-1.5 rounded-lg" style={{ border: `1px solid ${T.border}` }} onClick={() => setMonthOffset((m) => m - 1)}>
          <ChevronLeft size={16} />
        </button>
        <p className="ev-display font-semibold text-[14px] capitalize">{MES_LABEL[base.getMonth()]} {base.getFullYear()}</p>
        <button className="p-1.5 rounded-lg" style={{ border: `1px solid ${T.border}` }} onClick={() => setMonthOffset((m) => m + 1)}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center py-2 border-b" style={{ borderColor: T.border }}>
        {DIA_LABEL.map((d) => <p key={d} className="text-[11px] font-medium" style={{ color: T.muted }}>{d}</p>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const dISO = toISO(d);
          const inMonth = d.getMonth() === base.getMonth();
          const dayEvents = filtered.filter((e) => e.date === dISO);
          return (
            <button
              key={i}
              onClick={() => jumpToWeek(d)}
              className="text-left border-b border-r p-2 h-24 flex flex-col gap-1 hover:bg-black/[0.02]"
              style={{ borderColor: T.border, opacity: inMonth ? 1 : 0.35 }}
            >
              <span className="ev-display text-[12.5px] font-semibold w-6 h-6 flex items-center justify-center rounded-full" style={{ background: dISO === todayISO ? T.primary : "transparent", color: dISO === todayISO ? "#fff" : T.ink }}>
                {d.getDate()}
              </span>
              <div className="flex flex-wrap gap-1">
                {dayEvents.slice(0, 4).map((e) => (
                  <span key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ background: ACTIVITY_TYPES[e.type].color }} />
                ))}
                {dayEvents.length > 4 && <span className="text-[9.5px]" style={{ color: T.muted }}>+{dayEvents.length - 4}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== PERSONAL ============================== */
function Personal({ ctx }) {
  const { personal, toggleEstado, isMaestro, setPersonalModal, deletePersonal, generarVinculoTelegram, desvincularTelegram } = ctx;
  function confirmDelete(p) {
    if (window.confirm(`¿Eliminar a ${p.nombre}? Sus turnos y actividades pasadas quedarán sin responsable asignado.`)) {
      deletePersonal(p.id);
    }
  }
  function confirmDesvincular(p) {
    if (window.confirm(`¿Desvincular Telegram de ${p.nombre}? Dejará de recibir recordatorios de turno hasta que se vincule de nuevo.`)) {
      desvincularTelegram(p.id);
    }
  }
  return (
    <div className="ev-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: T.border }}>
        <div>
          <h3 className="ev-display font-semibold text-[15px]">Personal registrado</h3>
          <span className="text-[12px]" style={{ color: T.muted }}>{personal.length} personas</span>
        </div>
        {isMaestro && (
          <button onClick={() => setPersonalModal({ mode: "new", person: null })} className="ev-btn px-3.5 py-2 text-[12.5px] text-white" style={{ background: T.primary }}>
            <Plus size={14} /> Nueva persona
          </button>
        )}
      </div>
      {!isMaestro && (
        <div className="flex items-center gap-2 px-5 py-2.5 text-[12px]" style={{ background: T.accentSoft, color: T.accentInk }}>
          <Lock size={13} /> Modo lectura: solo un usuario Maestro puede registrar o editar personal. Sí puedes vincular o desvincular Telegram para recibir recordatorios de turno.
        </div>
      )}
      <div className="overflow-x-auto ev-scroll">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left" style={{ color: T.muted }}>
              {["Nombre", "Cargo", "Área", "Horas/sem", "Estado", "Recordatorios", ""].map((h) => (
                <th key={h} className="px-5 py-2 font-medium text-[11.5px] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {personal.map((p) => (
              <tr key={p.id} className="border-t" style={{ borderColor: T.border }}>
                <td className="px-5 py-3 font-medium">{p.nombre}</td>
                <td className="px-5 py-3" style={{ color: T.muted }}>{p.cargo}</td>
                <td className="px-5 py-3" style={{ color: T.muted }}>{p.area}</td>
                <td className="px-5 py-3 ev-mono">{p.horas}h</td>
                <td className="px-5 py-3">
                  <span className="px-2.5 py-1 rounded-full text-[11.5px] font-semibold" style={{ background: p.estado === "activo" ? T.primarySoft : T.dangerSoft, color: p.estado === "activo" ? T.primaryDark : T.danger }}>
                    {p.estado}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {p.telegramVinculado ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-semibold w-fit" style={{ background: T.primarySoft, color: T.primaryDark }}>
                      <CheckCircle2 size={12} /> Telegram vinculado
                    </span>
                  ) : (
                    <span className="text-[11.5px]" style={{ color: T.muted }}>Sin vincular</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex justify-end gap-2 flex-wrap">
                    {isMaestro && (
                      <>
                        <button onClick={() => setPersonalModal({ mode: "edit", person: p })} className="ev-btn text-[12px] px-2.5 py-1" style={{ border: `1px solid ${T.border}` }}>
                          <Pencil size={12} /> Editar
                        </button>
                        <button onClick={() => toggleEstado(p.id)} className="ev-btn text-[12px] px-2.5 py-1" style={{ border: `1px solid ${T.border}` }}>
                          {p.estado === "activo" ? "Desactivar" : "Activar"}
                        </button>
                      </>
                    )}
                    {p.telegramVinculado ? (
                      <button onClick={() => confirmDesvincular(p)} className="ev-btn text-[12px] px-2.5 py-1" style={{ border: `1px solid ${T.border}` }}>
                        Desvincular Telegram
                      </button>
                    ) : (
                      <button onClick={() => generarVinculoTelegram(p)} className="ev-btn text-[12px] px-2.5 py-1 text-white" style={{ background: "#229ED9" }}>
                        Vincular Telegram
                      </button>
                    )}
                    {isMaestro && (
                      <button onClick={() => confirmDelete(p)} className="ev-btn text-[12px] px-2.5 py-1" style={{ background: T.dangerSoft, color: T.danger }}>
                        <Trash2 size={12} /> Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================== REPORTES ============================== */
function Reportes({ ctx }) {
  const { events, personal, showToast, weekDays } = ctx;
  const actividadesRef = React.useRef(null);
  const turnosRef = React.useRef(null);
  const [generando, setGenerando] = useState(false);

  async function capturarImagen(ref) {
    const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: null, useCORS: true });
    return canvas;
  }

  function descargarLibro(nombreArchivo, hojas) {
    const wb = XLSX.utils.book_new();
    hojas.forEach(({ nombre, filas, anchos }) => {
      const ws = XLSX.utils.json_to_sheet(filas);
      if (anchos) ws["!cols"] = anchos.map((wch) => ({ wch }));
      XLSX.utils.book_append_sheet(wb, ws, nombre);
    });
    XLSX.writeFile(wb, nombreArchivo);
  }

  function exportTurnosXLSX() {
    const filas = events
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)
      .map((e) => {
        const p = personById(e.personalId);
        return {
          Fecha: e.date,
          Tipo: ACTIVITY_TYPES[e.type].label,
          Inicio: fmtHour(e.start),
          Fin: fmtHour(e.end),
          "Horas de jornada": horasEfectivas(e),
          Responsable: p?.nombre || "Sin asignar",
          Cargo: p?.cargo || "-",
          Área: p?.area || "-",
        };
      });
    descargarLibro("evoluciona_turnos.xlsx", [{ nombre: "Turnos", filas, anchos: [12, 20, 8, 8, 15, 22, 24, 14] }]);
    showToast("Excel de turnos descargado (.xlsx)");
  }
  function exportPersonalXLSX() {
    const filas = personal.map((p) => ({
      Nombre: p.nombre,
      Cargo: p.cargo,
      Área: p.area,
      "Horas/semana": p.horas,
      Estado: p.estado,
    }));
    descargarLibro("evoluciona_personal.xlsx", [{ nombre: "Personal", filas, anchos: [22, 24, 14, 12, 10] }]);
    showToast("Reporte de personal descargado (.xlsx)");
  }
  async function exportPDF() {
    setGenerando(true);
    showToast("Generando PDF…");
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 28;
      const usableW = pageW - margin * 2;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("EVOLUCIONA", margin, margin);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(
        `Programación semanal · ${weekDays[0].toLocaleDateString("es-CO", { day: "numeric", month: "long" })} – ${weekDays[6].toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}`,
        margin, margin + 14
      );

      // Espera un instante a que los calendarios ocultos terminen de pintar
      await new Promise((r) => setTimeout(r, 50));

      async function pegarImagenEnPaginas(ref, titulo, esPrimera) {
        const canvas = await capturarImagen(ref);
        const imgData = canvas.toDataURL("image/png");
        const imgWpt = usableW;
        const imgHpt = (canvas.height * imgWpt) / canvas.width;
        if (!esPrimera) doc.addPage();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(titulo, margin, esPrimera ? margin + 34 : margin);
        const tituloOffset = esPrimera ? 46 : 12;
        const maxHpt = pageH - margin - (margin + tituloOffset);
        if (imgHpt <= maxHpt) {
          doc.addImage(imgData, "PNG", margin, margin + tituloOffset, imgWpt, imgHpt);
        } else {
          // La imagen es más alta que una página: la reparte en varias, cortando por franjas.
          const franjasPx = Math.ceil(imgHpt / maxHpt);
          const franjaAltoPx = canvas.height / franjasPx;
          for (let i = 0; i < franjasPx; i++) {
            if (i > 0) doc.addPage();
            const recorte = document.createElement("canvas");
            recorte.width = canvas.width;
            recorte.height = franjaAltoPx;
            recorte.getContext("2d").drawImage(canvas, 0, i * franjaAltoPx, canvas.width, franjaAltoPx, 0, 0, canvas.width, franjaAltoPx);
            const franjaData = recorte.toDataURL("image/png");
            const franjaHpt = (franjaAltoPx * imgWpt) / canvas.width;
            doc.addImage(franjaData, "PNG", margin, i === 0 ? margin + tituloOffset : margin, imgWpt, franjaHpt);
          }
        }
      }

      await pegarImagenEnPaginas(actividadesRef, "Actividades — vista semana", true);
      await pegarImagenEnPaginas(turnosRef, "Turnos — vista mes", false);

      const semanaISO = weekDays.map(toISO);
      const eventosSemana = events.filter((e) => semanaISO.includes(e.date));
      const actividades = eventosSemana
        .filter((e) => ACTIVIDAD_TYPES.includes(e.type))
        .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
      const turnos = eventosSemana
        .filter((e) => TURNO_TYPES.includes(e.type))
        .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
      const diaNombre = (dISO) => new Date(`${dISO}T00:00:00`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "short" });

      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Detalle · Actividades de la semana", margin, margin);
      autoTable(doc, {
        startY: margin + 8,
        head: [["Día", "Actividad", "Tipo", "Horario", "Responsable"]],
        body: actividades.length
          ? actividades.map((e) => [diaNombre(e.date), e.title, ACTIVITY_TYPES[e.type].label, fmtRange(e.start, e.end), personName(e.personalId)])
          : [["—", "Sin actividades programadas esta semana", "", "", ""]],
        headStyles: { fillColor: [27, 110, 88] },
        styles: { fontSize: 9 },
        margin: { left: margin, right: margin },
      });

      const y2 = (doc.lastAutoTable?.finalY || margin) + 20;
      doc.setFontSize(12);
      doc.text("Detalle · Turnos de la semana", margin, y2);
      autoTable(doc, {
        startY: y2 + 8,
        head: [["Día", "Turno", "Horario", "Horas", "Responsable"]],
        body: turnos.length
          ? turnos.map((e) => [diaNombre(e.date), e.title, fmtRange(e.start, e.end), `${horasEfectivas(e)}h`, personName(e.personalId)])
          : [["—", "Sin turnos programados esta semana", "", "", ""]],
        headStyles: { fillColor: [27, 110, 88] },
        styles: { fontSize: 9 },
        margin: { left: margin, right: margin },
      });

      doc.save(`evoluciona_programacion_${weekDays[0].toISOString().slice(0, 10)}.pdf`);
      showToast("PDF de la programación semanal descargado");
    } catch (err) {
      showToast(`No se pudo generar el PDF: ${err.message}`, "warn");
    } finally {
      setGenerando(false);
    }
  }

  const cards = [
    { title: "Programación semanal (PDF)", desc: `Actividades y turnos de la semana del ${weekDays[0].toLocaleDateString("es-CO", { day: "numeric", month: "short" })} al ${weekDays[6].toLocaleDateString("es-CO", { day: "numeric", month: "short" })}`, action: exportPDF, icon: Printer },
    { title: "Turnos (Excel)", desc: "Listado completo de turnos asignados con responsable, cargo y área", action: exportTurnosXLSX, icon: Download },
    { title: "Personal asignado", desc: "Reporte de todo el personal registrado, su cargo, área y estado", action: exportPersonalXLSX, icon: Download },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.title} className="ev-card p-5 flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: T.primarySoft }}>
              <c.icon size={16} style={{ color: T.primary }} />
            </div>
            <h3 className="ev-display font-semibold text-[14.5px] mb-1">{c.title}</h3>
            <p className="text-[12.5px]" style={{ color: T.muted }}>{c.desc}</p>
          </div>
          <button
            onClick={c.action}
            disabled={c.title.includes("PDF") && generando}
            className="ev-btn mt-4 px-3.5 py-2 text-[12.5px] text-white justify-center disabled:opacity-60"
            style={{ background: T.primary }}
          >
            {c.title.includes("PDF") && generando ? "Generando…" : "Generar"}
          </button>
        </div>
      ))}

      {/* Copias ocultas de los calendarios, solo para capturarlas como imagen en el PDF */}
      <div style={{ position: "fixed", top: 0, left: -10000, width: 1000, background: T.base, padding: 16 }} aria-hidden="true">
        <div ref={actividadesRef}>
          <WeekView ctx={ctx} types={ACTIVIDAD_TYPES} />
        </div>
      </div>
      <div style={{ position: "fixed", top: 0, left: -10000, width: 1000, background: T.base, padding: 16 }} aria-hidden="true">
        <div ref={turnosRef}>
          <TurnosMesGrid ctx={ctx} />
        </div>
      </div>
    </div>
  );
}

/* ============================== CONFIGURACIÓN ============================== */
function Configuracion({ ctx }) {
  const { reglas, saveReglas, isMaestro, saving, festivos, festivoModal, setFestivoModal, addFestivo, deleteFestivo, esSuperadmin, servicioActual, modulos } = ctx;
  const [form, setForm] = useState(null);
  const conTurnos = modulos?.turnos !== false;

  React.useEffect(() => {
    if (reglas && !form) setForm({ ...reglas, cargosTexto: reglas.cargosTurno.join(", ") });
  }, [reglas]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const numField = (key, label, hint) => (
    <Field label={label}>
      <input type="number" min={0} value={form[key]} disabled={!isMaestro} onChange={(e) => set(key, e.target.value)} style={{ ...inputStyle, opacity: isMaestro ? 1 : 0.7 }} />
      {hint && <span className="text-[11px]" style={{ color: T.muted }}>{hint}</span>}
    </Field>
  );

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {!isMaestro && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-[12.5px]" style={{ background: T.accentSoft, color: T.accentInk }}>
          <Lock size={14} /> Modo lectura: solo un usuario Maestro puede cambiar estas reglas.
        </div>
      )}

      {/* Acceso: quién entra a este servicio */}
      {isMaestro && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: T.muted }}>Acceso a {servicioActual?.nombre || "este servicio"}</p>
          <div className="flex flex-col gap-5">
            <SolicitudesPendientes ctx={ctx} />
            <PersonasDelServicio ctx={ctx} />
            <InvitacionesConfig ctx={ctx} />
          </div>
        </div>
      )}

      {conTurnos && (!reglas || !form) && (
        <p className="text-[13px]" style={{ color: T.muted }}>Este servicio aún no tiene reglas de turnos configuradas.</p>
      )}
      {conTurnos && reglas && form && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] -mb-2 mt-2" style={{ color: T.muted }}>Turnos</p>
      <div className="ev-card p-5">
        <h3 className="ev-display font-semibold text-[15px] mb-1">Reglas obligatorias</h3>
        <p className="text-[12px] mb-4" style={{ color: T.muted }}>Nunca se pueden incumplir al programar turnos.</p>
        <div className="grid sm:grid-cols-2 gap-3.5">
          {numField("horasSemanaObjetivo", "Horas máx. por semana (respaldo, si alguien no tiene horas puestas en Personal)")}
          {numField("descansoMinHoras", "Descanso mínimo entre turnos (h)")}
          {numField("personalMinTurnoDia", "Personas mínimas · turno día")}
          {numField("personalMinTurnoNoche", "Personas mínimas · turno noche")}
          {numField("personalMinFinSemanaFestivo", "Personas mínimas · fin de semana/festivo")}
        </div>
        <div className="mt-3.5">
          <Field label="Días que usan ese mínimo reforzado (además de los festivos)">
            <div className="flex flex-wrap gap-1.5">
              {DIA_LABEL.map((label, idx) => {
                const activo = (form.diasRefuerzo || [5, 6]).includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={!isMaestro}
                    onClick={() => {
                      const actuales = form.diasRefuerzo || [5, 6];
                      const nuevos = activo ? actuales.filter((d) => d !== idx) : [...actuales, idx].sort();
                      setForm((f) => ({ ...f, diasRefuerzo: nuevos }));
                    }}
                    className="ev-btn px-3 py-1.5 text-[12.5px]"
                    style={{ background: activo ? T.primary : "transparent", color: activo ? "#fff" : T.ink, border: `1px solid ${activo ? T.primary : T.border}`, opacity: isMaestro ? 1 : 0.7 }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: T.muted }}>
              Por defecto: sábado y domingo. Actívalo también, por ejemplo, un viernes si ese día necesita el mismo refuerzo de personal.
            </p>
          </Field>
        </div>
        <div className="mt-3.5">
          <Field label="Cargos habilitados para turnos (separados por coma)">
            <input value={form.cargosTexto} disabled={!isMaestro} onChange={(e) => set("cargosTexto", e.target.value)} style={{ ...inputStyle, opacity: isMaestro ? 1 : 0.7 }} />
          </Field>
        </div>

        <div className="mt-4 pt-4 border-t" style={{ borderColor: T.border }}>
          <div className="flex items-center justify-between mb-3">
            <div className="pr-4">
              <p className="font-medium text-[13.5px]">El operador terapéutico siempre va acompañado</p>
              <p className="text-[12px]" style={{ color: T.muted }}>El auxiliar sí puede cubrir un turno día solo. Se aplica en el generador automático y en las alertas del calendario.</p>
            </div>
            <button
              onClick={() => isMaestro && set("operadorRequiereAuxiliar", !form.operadorRequiereAuxiliar)}
              className="w-10 h-6 rounded-full relative shrink-0"
              style={{ background: form.operadorRequiereAuxiliar ? T.primary : T.border, opacity: isMaestro ? 1 : 0.6 }}
            >
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: form.operadorRequiereAuxiliar ? 18 : 2 }} />
            </button>
          </div>
          {form.operadorRequiereAuxiliar && (
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="Texto que identifica al operador">
                <input value={form.cargoOperador} disabled={!isMaestro} onChange={(e) => set("cargoOperador", e.target.value)} style={{ ...inputStyle, opacity: isMaestro ? 1 : 0.7 }} />
              </Field>
              <Field label="Texto que identifica al auxiliar">
                <input value={form.cargoAuxiliar} disabled={!isMaestro} onChange={(e) => set("cargoAuxiliar", e.target.value)} style={{ ...inputStyle, opacity: isMaestro ? 1 : 0.7 }} />
              </Field>
            </div>
          )}
        </div>
      </div>

      <div className="ev-card p-5">
        <h3 className="ev-display font-semibold text-[15px] mb-1">Preferencias</h3>
        <p className="text-[12px] mb-4" style={{ color: T.muted }}>Se intentan cumplir, pero pueden relajarse si no alcanza.</p>
        <div className="grid sm:grid-cols-2 gap-3.5">
          {numField("turnosDiaIdeal", "Turnos día ideales / semana")}
          {numField("turnosNocheIdeal", "Turnos noche ideales / semana")}
          {numField("turnosDiaAlterno", "Turnos día · patrón alterno")}
          {numField("turnosNocheAlterno", "Turnos noche · patrón alterno")}
          {numField("finesSemanaLibresMes", "Fines de semana libres al mes")}
        </div>
      </div>

      {isMaestro && (
        <div>
          <button
            onClick={() => saveReglas({ ...form, cargosTurno: form.cargosTexto.split(",").map((s) => s.trim()).filter(Boolean) })}
            disabled={saving}
            className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-50"
            style={{ background: T.primary }}
          >
            {saving ? "Guardando…" : "Guardar reglas"}
          </button>
        </div>
      )}

      <div className="ev-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: T.border }}>
          <h3 className="ev-display font-semibold text-[15px]">Festivos</h3>
          {isMaestro && (
            <button onClick={() => setFestivoModal(true)} className="ev-btn px-3 py-1.5 text-[12px] text-white" style={{ background: T.primary }}>
              <Plus size={13} /> Agregar
            </button>
          )}
        </div>
        <div className="divide-y max-h-72 overflow-y-auto ev-scroll" style={{ borderColor: T.border }}>
          {festivos.map((f) => (
            <div key={f.id} className="flex items-center justify-between px-5 py-2.5 text-[13px]">
              <span>{new Date(`${f.fecha}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })} — {f.nombre}</span>
              {isMaestro && (
                <button onClick={() => deleteFestivo(f.id)} className="ev-btn text-[11.5px] px-2 py-1" style={{ background: T.dangerSoft, color: T.danger }}>
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          ))}
          {festivos.length === 0 && <p className="px-5 py-6 text-[12.5px] text-center" style={{ color: T.muted }}>No hay festivos registrados.</p>}
        </div>
      </div>

      <div className="ev-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: T.border }}>
          <div>
            <h3 className="ev-display font-semibold text-[15px]">Reglas por persona</h3>
            <p className="text-[12px]" style={{ color: T.muted }}>Ej. "Javier siempre turno día los miércoles" o "Javier nunca turno noche los martes". El generador automático las respeta.</p>
          </div>
          {isMaestro && (
            <button onClick={() => ctx.setReglaPersonalModal(true)} className="ev-btn px-3 py-1.5 text-[12px] text-white shrink-0" style={{ background: T.primary }}>
              <Plus size={13} /> Agregar
            </button>
          )}
        </div>
        <div className="divide-y" style={{ borderColor: T.border }}>
          {ctx.reglasPersonal.map((r) => {
            const persona = personById(r.personalId);
            return (
              <div key={r.id} className="flex items-center justify-between px-5 py-2.5 text-[13px]">
                <span>
                  {persona?.nombre || "Persona eliminada"} — {r.tipoRegla === "nunca" ? "nunca" : "siempre"} {ACTIVITY_TYPES[r.tipoTurno].label.toLowerCase()} los {DIA_LABEL_LARGO[r.diaSemana]}
                </span>
                {isMaestro && (
                  <button onClick={() => ctx.deleteReglaPersonal(r.id)} className="ev-btn text-[11.5px] px-2 py-1" style={{ background: T.dangerSoft, color: T.danger }}>
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            );
          })}
          {ctx.reglasPersonal.length === 0 && <p className="px-5 py-6 text-[12.5px] text-center" style={{ color: T.muted }}>No hay reglas fijas por persona.</p>}
        </div>
      </div>

        </>
      )}

      {isMaestro && conTurnos && <LiquidacionConfigCard ctx={ctx} />}
      {(isMaestro || esSuperadmin) && <TelegramServicioConfig ctx={ctx} />}
      {esSuperadmin && <CronEjecucionesLog />}

      {festivoModal && <FestivoModal ctx={ctx} onClose={() => setFestivoModal(false)} />}
      {ctx.reglaPersonalModal && <ReglaPersonalModal ctx={ctx} onClose={() => ctx.setReglaPersonalModal(false)} />}
    </div>
  );
}

/* ============================== PANEL DE CONTROL (superadministrador) ============================== */
const MODULO_ICONO = {
  actividades: CalendarDays, turnos: Clock, novedades: UserX, biblioteca: BookOpen,
  formacion: GraduationCap, evo: Bot, personal: Users, reportes: FileBarChart,
};

function PanelControl({ ctx }) {
  const { instituciones, setInstituciones, servicios, setServicios, usuariosLista, showToast, entrarAServicio, servicioActualId, crearServicio, toggleActivoUsuario, loadAll, licencias, setLicencias } = ctx;
  const [editorLicencia, setEditorLicencia] = useState(null); // institución cuya licencia se edita
  const licenciaDe = (iid) => (licencias || []).find((l) => l.institucionId === iid) || null;
  // Personas que ocupan cupo: activas, aprobadas, con acceso a algún servicio de la institución.
  function personasEn(iid) {
    const ids = new Set(servicios.filter((sv) => sv.institucionId === iid).map((sv) => sv.id));
    const usuarios = new Set((miembros || []).filter((m) => ids.has(m.servicioId)).map((m) => m.usuarioId));
    return usuariosLista.filter((u) => usuarios.has(u.id) && u.activo && u.aprobado && !u.esSuperadmin).length;
  }
  async function guardarLicencia(iid, datos) {
    try {
      const [row] = await sb("licencias?on_conflict=institucion_id", {
        method: "POST", prefer: "resolution=merge-duplicates,return=representation",
        body: JSON.stringify({
          institucion_id: iid, plan: datos.plan || null, inicio: datos.inicio || undefined, vence: datos.vence || null,
          max_personas: datos.maxPersonas ? Number(datos.maxPersonas) : null,
          max_servicios: datos.maxServicios ? Number(datos.maxServicios) : null,
          modulos: datos.modulos, notas: datos.notas || null, updated_at: new Date().toISOString(),
        }),
      });
      const lic = mapLicencia(row);
      setLicencias((prev) => [...(prev || []).filter((l) => l.institucionId !== iid), lic]);
      setEditorLicencia(null);
      showToast("Licencia guardada");
    } catch (err) {
      showToast(`No se pudo guardar la licencia: ${err.message}`, "warn");
    }
  }
  const [miembros, setMiembros] = useState(null);
  const [errorMiembros, setErrorMiembros] = useState(null);
  const [editorServicio, setEditorServicio] = useState(null); // { modo: 'crear'|'editar', servicio?, institucionId? }
  const [nuevaInstitucion, setNuevaInstitucion] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  async function cargarMiembros() {
    try {
      const rows = await sb("miembros?select=*");
      setMiembros(rows.map(mapMiembro));
      setErrorMiembros(null);
    } catch (err) {
      setErrorMiembros(/miembros/i.test(err.message) ? "Falta correr el SQL de la etapa 2 en Supabase." : err.message);
      setMiembros([]);
    }
  }
  React.useEffect(() => { cargarMiembros(); }, []);

  const pendientes = usuariosLista.filter((u) => !u.aprobado && u.activo).length;
  const personasActivas = usuariosLista.filter((u) => u.aprobado && u.activo).length;
  const serviciosActivos = servicios.filter((sv) => sv.activo).length;

  async function alternarModulo(sv, key) {
    const lic = licenciaDe(sv.institucionId);
    if (lic && lic.modulos[key] === false) {
      showToast(`${MODULOS.find((m) => m.key === key)?.label} no está incluido en la licencia. Actívalo primero en la licencia.`, "warn");
      return;
    }
    const modulos = { ...sv.modulos, [key]: !sv.modulos[key] };
    setServicios((prev) => prev.map((x) => (x.id === sv.id ? { ...x, modulos } : x)));
    try {
      const actualizado = await actualizarServicioRemote(sv.id, { modulos });
      setServicios((prev) => prev.map((x) => (x.id === sv.id ? actualizado : x)));
      const nombre = MODULOS.find((m) => m.key === key)?.label;
      showToast(`${nombre} ${modulos[key] ? "activado" : "desactivado"} en ${sv.nombre}`);
    } catch (err) {
      setServicios((prev) => prev.map((x) => (x.id === sv.id ? sv : x)));
      showToast(`No se pudo cambiar: ${err.message}`, "warn");
    }
  }
  async function renombrarInstitucion(inst) {
    const nombre = window.prompt("Nuevo nombre de la institución:", inst.nombre);
    if (!nombre || nombre.trim() === inst.nombre) return;
    try {
      const [row] = await sb(`instituciones?id=eq.${inst.id}`, { method: "PATCH", body: JSON.stringify({ nombre: nombre.trim() }) });
      setInstituciones((prev) => prev.map((i) => (i.id === inst.id ? mapInstitucion(row) : i)));
      showToast("Institución renombrada");
    } catch (err) {
      showToast(`No se pudo renombrar: ${err.message}`, "warn");
    }
  }
  async function crearInstitucion(nombre) {
    try {
      const [row] = await sb("instituciones", { method: "POST", body: JSON.stringify({ nombre: nombre.trim() }) });
      const inst = mapInstitucion(row);
      setInstituciones((prev) => [...prev, inst]);
      setNuevaInstitucion(false);
      showToast(`Institución "${inst.nombre}" creada. Ahora agrégale su primer servicio.`);
      setEditorServicio({ modo: "crear", institucionId: inst.id });
    } catch (err) {
      showToast(`No se pudo crear: ${err.message}`, "warn");
    }
  }
  async function guardarServicio({ nombre, institucionId, modulos, activo }) {
    if (editorServicio.modo === "crear") {
      const nuevo = await crearServicio(nombre.trim(), institucionId, modulos);
      if (nuevo) setEditorServicio(null);
      return;
    }
    try {
      const actualizado = await actualizarServicioRemote(editorServicio.servicio.id, { nombre: nombre.trim(), modulos, activo });
      setServicios((prev) => prev.map((x) => (x.id === actualizado.id ? actualizado : x)));
      setEditorServicio(null);
      showToast("Servicio actualizado");
      if (!activo && actualizado.id === servicioActualId) loadAll();
    } catch (err) {
      showToast(`No se pudo guardar: ${err.message}`, "warn");
    }
  }
  async function quitarMembresia(m) {
    const u = usuariosLista.find((x) => x.id === m.usuarioId);
    const sv = servicios.find((x) => x.id === m.servicioId);
    if (!window.confirm(`¿Quitar a ${u?.correo} de ${sv?.nombre}?`)) return;
    try {
      await sb(`miembros?id=eq.${m.id}`, { method: "DELETE", prefer: "return=minimal" });
      setMiembros((prev) => prev.filter((x) => x.id !== m.id));
      showToast(`Quitado de ${sv?.nombre}`, "warn");
    } catch (err) {
      showToast(`No se pudo quitar: ${err.message}`, "warn");
    }
  }
  async function agregarMembresia(usuarioId, servicioId, rol) {
    try {
      const [row] = await sb("miembros?on_conflict=usuario_id,servicio_id", {
        method: "POST", prefer: "resolution=merge-duplicates,return=representation",
        body: JSON.stringify({ usuario_id: usuarioId, servicio_id: servicioId, rol }),
      });
      const nuevo = mapMiembro(row);
      setMiembros((prev) => [...prev.filter((x) => !(x.usuarioId === usuarioId && x.servicioId === servicioId)), nuevo]);
      showToast("Acceso actualizado");
    } catch (err) {
      showToast(`No se pudo agregar: ${err.message}`, "warn");
    }
  }

  const term = normalizarTexto(busqueda);
  const personas = usuariosLista
    .filter((u) => u.aprobado || !u.activo)
    .filter((u) => !term || normalizarTexto(u.correo).includes(term) || normalizarTexto(u.nombre).includes(term))
    .sort((a, b) => a.correo.localeCompare(b.correo));

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[14px]" style={{ color: T.muted }}>
            {instituciones.length} {instituciones.length === 1 ? "institución" : "instituciones"}, {serviciosActivos} {serviciosActivos === 1 ? "servicio activo" : "servicios activos"} y {personasActivas} personas con acceso.
            {pendientes > 0 && <> <strong style={{ color: T.primaryDark }}>{pendientes} {pendientes === 1 ? "solicitud espera" : "solicitudes esperan"} tu aprobación.</strong></>}
          </p>
        </div>
        <button onClick={() => setNuevaInstitucion(true)} className="ev-btn px-3.5 py-2 text-[12.5px]" style={{ border: `1px solid ${T.border}`, background: T.surface }}>
          <Plus size={14} /> Nueva institución
        </button>
      </div>

      {pendientes > 0 && <SolicitudesPendientes ctx={ctx} />}

      {instituciones.map((inst) => {
        const susServicios = servicios.filter((sv) => sv.institucionId === inst.id);
        return (
          <section key={inst.id} className="ev-card overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b flex-wrap" style={{ borderColor: T.border }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.primarySoft }}>
                  <Building2 size={17} style={{ color: T.primary }} />
                </div>
                <div className="min-w-0">
                  <h2 className="ev-display text-[17px] font-bold truncate">{inst.nombre}</h2>
                  <ResumenLicencia licencia={licenciaDe(inst.id)} personas={miembros === null ? null : personasEn(inst.id)} servicios={susServicios.length} tablaExiste={licencias !== null} />
                </div>
                <button onClick={() => renombrarInstitucion(inst)} title="Renombrar institución" className="p-1.5 rounded-md" style={{ color: T.muted }}>
                  <Pencil size={13} />
                </button>
              </div>
              <div className="flex gap-2">
                {licencias !== null && (
                  <button onClick={() => setEditorLicencia(inst)} className="ev-btn px-3 py-1.5 text-[12.5px]" style={{ border: `1px solid ${T.border}` }}>
                    <Shield size={13} /> Licencia
                  </button>
                )}
                <button onClick={() => setEditorServicio({ modo: "crear", institucionId: inst.id })} className="ev-btn px-3 py-1.5 text-[12.5px] text-white" style={{ background: T.primary }}>
                  <Plus size={13} /> Nuevo servicio
                </button>
              </div>
            </div>

            <div className="flex flex-col">
              {susServicios.map((sv) => {
                const deEste = (miembros || []).filter((m) => m.servicioId === sv.id);
                const nMaestros = deEste.filter((m) => m.rol === "maestro").length;
                const nLectores = deEste.length - nMaestros;
                return (
                  <div key={sv.id} className="grid gap-3 px-5 sm:px-6 py-4 border-b last:border-b-0 lg:grid-cols-[minmax(150px,1.1fr)_auto_minmax(120px,0.9fr)_auto] lg:items-center" style={{ borderColor: T.border, opacity: sv.activo ? 1 : 0.6 }}>
                    <div className="min-w-0">
                      <p className="font-semibold text-[15px] truncate flex items-center gap-2">
                        {sv.nombre}
                        {sv.id === servicioActualId && <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: T.primarySoft, color: T.primaryDark }}>Abierto ahora</span>}
                        {!sv.activo && <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: T.dangerSoft, color: T.danger }}>Desactivado</span>}
                      </p>
                    </div>

                    {/* Tira de funciones: un clic activa o apaga cada una */}
                    <div className="flex items-center gap-1 flex-wrap" role="group" aria-label={`Funciones de ${sv.nombre}`}>
                      {MODULOS.map((m) => {
                        const Icono = MODULO_ICONO[m.key];
                        const lic = licenciaDe(sv.institucionId);
                        const incluido = !lic || lic.modulos[m.key] !== false;
                        const on = incluido && sv.modulos[m.key] !== false;
                        if (!incluido) {
                          return (
                            <span key={m.key} title={`${m.label}: no incluido en la licencia`} className="relative w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: T.muted, border: `1px dashed ${T.border}`, opacity: 0.45 }}>
                              <Icono size={15} />
                              <Lock size={9} className="absolute -right-0.5 -bottom-0.5" style={{ background: T.surface, borderRadius: 4 }} />
                            </span>
                          );
                        }
                        return (
                          <button
                            key={m.key}
                            onClick={() => alternarModulo(sv, m.key)}
                            aria-pressed={on}
                            title={`${m.label}: ${on ? "activado" : "apagado"} — clic para ${on ? "apagar" : "activar"}`}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                            style={{
                              background: on ? T.primarySoft : "transparent",
                              color: on ? T.primary : T.muted,
                              border: `1px solid ${on ? "transparent" : T.border}`,
                              opacity: on ? 1 : 0.55,
                            }}
                          >
                            <Icono size={15} />
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-[12.5px]" style={{ color: T.muted }}>
                      {miembros === null ? "…" : (
                        <>
                          {nMaestros} {nMaestros === 1 ? "Maestro" : "Maestros"}, {nLectores} {nLectores === 1 ? "Lector" : "Lectores"}
                          {nMaestros === 0 && sv.activo && <span className="block text-[11.5px]" style={{ color: T.danger }}>Sin Maestro asignado</span>}
                        </>
                      )}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap lg:justify-end">
                      <button onClick={() => entrarAServicio(sv.id, "dashboard")} disabled={!sv.activo} className="ev-btn px-3 py-1.5 text-[12px] text-white disabled:opacity-40" style={{ background: T.primary }}>
                        Entrar
                      </button>
                      <button onClick={() => entrarAServicio(sv.id, "configuracion")} disabled={!sv.activo} title="Personas, códigos y reglas del servicio" className="ev-btn px-2.5 py-1.5 text-[12px] disabled:opacity-40" style={{ border: `1px solid ${T.border}` }}>
                        <Settings size={13} /> Configuración
                      </button>
                      {sv.modulos.personal !== false && (
                        <button onClick={() => entrarAServicio(sv.id, "personal")} disabled={!sv.activo} className="ev-btn px-2.5 py-1.5 text-[12px] disabled:opacity-40" style={{ border: `1px solid ${T.border}` }}>
                          <Users size={13} /> Personal
                        </button>
                      )}
                      <button onClick={() => setEditorServicio({ modo: "editar", servicio: sv })} title="Editar nombre, funciones o desactivar" className="ev-btn px-2 py-1.5 text-[12px]" style={{ border: `1px solid ${T.border}`, color: T.muted }}>
                        <Pencil size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {susServicios.length === 0 && (
                <p className="px-6 py-6 text-[13px]" style={{ color: T.muted }}>Esta institución aún no tiene servicios. Crea el primero con "Nuevo servicio".</p>
              )}
            </div>
          </section>
        );
      })}

      {instituciones.length === 0 && (
        <div className="ev-card p-6 text-[13px]" style={{ color: T.muted }}>
          Todavía no hay instituciones. Si acabas de actualizar, corre el SQL de la etapa 2 en Supabase y recarga.
        </div>
      )}

      {/* Personas: a qué servicios tiene acceso cada una */}
      <section className="ev-card overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: T.border }}>
          <div>
            <h2 className="ev-display text-[16px] font-bold">Personas y sus servicios</h2>
            <p className="text-[12px]" style={{ color: T.muted }}>Quita con × el acceso a los servicios que no le correspondan a cada persona.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.muted }} />
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por correo o nombre" style={{ ...inputStyle, paddingLeft: 32, padding: "8px 12px 8px 32px", fontSize: 13 }} />
          </div>
        </div>
        {errorMiembros && <p className="px-6 py-4 text-[12.5px]" style={{ color: T.danger }}>{errorMiembros}</p>}
        <div className="flex flex-col">
          {personas.map((u) => (
            <FilaPersonaPanel
              key={u.id}
              u={u}
              miembros={(miembros || []).filter((m) => m.usuarioId === u.id)}
              servicios={servicios}
              instituciones={instituciones}
              esUnoMismo={u.id === ctx.session?.id}
              onQuitar={quitarMembresia}
              onAgregar={agregarMembresia}
              onToggleActivo={() => toggleActivoUsuario(u.id, u.activo)}
            />
          ))}
          {personas.length === 0 && <p className="px-6 py-6 text-[13px] text-center" style={{ color: T.muted }}>Nadie coincide con "{busqueda}".</p>}
        </div>
      </section>

      {editorServicio && (
        <ServicioEditorModal
          licencia={licenciaDe(editorServicio.servicio?.institucionId || editorServicio.institucionId)}
          inicial={editorServicio}
          instituciones={instituciones}
          saving={ctx.saving}
          onGuardar={guardarServicio}
          onClose={() => setEditorServicio(null)}
        />
      )}
      {nuevaInstitucion && <NuevaInstitucionModal onCrear={crearInstitucion} onClose={() => setNuevaInstitucion(false)} />}
      {editorLicencia && (
        <LicenciaEditorModal
          institucion={editorLicencia}
          licencia={licenciaDe(editorLicencia.id)}
          personas={miembros === null ? null : personasEn(editorLicencia.id)}
          servicios={servicios.filter((sv) => sv.institucionId === editorLicencia.id).length}
          onGuardar={(datos) => guardarLicencia(editorLicencia.id, datos)}
          onClose={() => setEditorLicencia(null)}
        />
      )}
    </div>
  );
}

const ESTADO_LICENCIA_TEXTO = {
  activa: { texto: "Vigente", fondo: "primarySoft", tinta: "primaryDark" },
  por_vencer: { texto: "Por vencer", fondo: "accentSoft", tinta: "accentInk" },
  solo_lectura: { texto: "Vencida · solo lectura", fondo: "dangerSoft", tinta: "danger" },
  bloqueada: { texto: "Vencida · bloqueada", fondo: "dangerSoft", tinta: "danger" },
};
function ResumenLicencia({ licencia, personas, servicios, tablaExiste }) {
  if (!tablaExiste) return <p className="text-[12px]" style={{ color: T.muted }}>{servicios} {servicios === 1 ? "servicio" : "servicios"}</p>;
  const estado = estadoLicencia(licencia);
  const e = ESTADO_LICENCIA_TEXTO[estado];
  const cupo = (n, max, singular, plural) => `${n ?? "…"}${max ? ` de ${max}` : ""} ${(max || n) === 1 ? singular : plural}`;
  return (
    <p className="text-[12px] flex items-center gap-x-2 gap-y-1 flex-wrap" style={{ color: T.muted }}>
      <span className="px-1.5 py-0.5 rounded-full text-[10.5px] font-semibold" style={{ background: T[e.fondo], color: T[e.tinta] }}>{e.texto}</span>
      <span>{licencia?.vence ? `vence el ${fechaLarga(licencia.vence)}` : "sin vencimiento"}</span>
      <span>{cupo(personas, licencia?.maxPersonas, "persona", "personas")}</span>
      <span>{cupo(servicios, licencia?.maxServicios, "servicio", "servicios")}</span>
    </p>
  );
}

function LicenciaEditorModal({ institucion, licencia, personas, servicios, onGuardar, onClose }) {
  const [form, setForm] = useState({
    plan: licencia?.plan || "",
    inicio: licencia?.inicio || "",
    vence: licencia?.vence || "",
    maxPersonas: licencia?.maxPersonas ?? "",
    maxServicios: licencia?.maxServicios ?? "",
    modulos: licencia ? { ...licencia.modulos } : { ...MODULOS_TODOS },
    notas: licencia?.notas || "",
  });
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const vistaPrevia = { vence: form.vence || null };
  const estado = estadoLicencia(vistaPrevia);
  const e = ESTADO_LICENCIA_TEXTO[estado];
  const bajoCupoPersonas = form.maxPersonas && personas !== null && Number(form.maxPersonas) < personas;
  const bajoCupoServicios = form.maxServicios && Number(form.maxServicios) < servicios;

  async function guardar() {
    setGuardando(true);
    await onGuardar(form);
    setGuardando(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={onClose}>
      <div className="ev-card ev-sheet ev-fade-in w-full sm:max-w-lg max-h-[92vh] overflow-y-auto ev-scroll p-5 sm:p-6" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="ev-display font-semibold text-[17px]">Licencia de {institucion.nombre}</h3>
          <button onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        <p className="text-[12.5px] mb-5" style={{ color: T.muted }}>
          Un mes antes del vencimiento los Maestros ven un aviso. Al vencer quedan 15 días de solo lectura y luego se bloquea el acceso. Nunca se borra información.
        </p>
        <div className="flex flex-col gap-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Plan (nombre libre)">
              <input value={form.plan} onChange={(ev) => set("plan", ev.target.value)} placeholder="Ej. Anual 2026" style={inputStyle} />
            </Field>
            <Field label="Inicio">
              <input type="date" value={form.inicio} onChange={(ev) => set("inicio", ev.target.value)} style={inputStyle} />
            </Field>
          </div>
          <Field label="Vence (déjalo vacío si no vence)">
            <div className="flex items-center gap-2 flex-wrap">
              <input type="date" value={form.vence} onChange={(ev) => set("vence", ev.target.value)} style={{ ...inputStyle, width: "auto", flex: "1 1 160px" }} />
              {form.vence && (
                <button type="button" onClick={() => set("vence", "")} className="ev-btn px-2.5 py-2 text-[12px]" style={{ border: `1px solid ${T.border}`, color: T.muted }}>Quitar fecha</button>
              )}
              <span className="px-2 py-1 rounded-full text-[11.5px] font-semibold" style={{ background: T[e.fondo], color: T[e.tinta] }}>{e.texto}</span>
            </div>
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={`Máximo de personas (hoy: ${personas ?? "…"})`}>
              <input type="number" min={1} value={form.maxPersonas} onChange={(ev) => set("maxPersonas", ev.target.value)} placeholder="Sin límite" style={inputStyle} />
            </Field>
            <Field label={`Máximo de servicios (hoy: ${servicios})`}>
              <input type="number" min={1} value={form.maxServicios} onChange={(ev) => set("maxServicios", ev.target.value)} placeholder="Sin límite" style={inputStyle} />
            </Field>
          </div>
          {(bajoCupoPersonas || bajoCupoServicios) && (
            <p className="text-[12px] rounded-lg px-3 py-2" style={{ background: T.accentSoft, color: T.accentInk }}>
              El cupo queda por debajo de lo que ya existe. Nadie pierde acceso, pero no se podrán agregar más {bajoCupoPersonas ? "personas" : "servicios"} hasta liberar cupo o ampliarlo.
            </p>
          )}
          <div>
            <p className="text-[11.5px] font-medium mb-2" style={{ color: T.muted }}>Funciones incluidas en la licencia</p>
            <div className="flex flex-wrap gap-1.5">
              {MODULOS.map((m) => {
                const Icono = MODULO_ICONO[m.key];
                const on = form.modulos[m.key] !== false;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => set("modulos", { ...form.modulos, [m.key]: !on })}
                    aria-pressed={on}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium"
                    style={{ border: `1px solid ${on ? T.primary : T.border}`, background: on ? T.primarySoft : T.surface, color: on ? T.primaryDark : T.muted }}
                  >
                    <Icono size={14} /> {m.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11.5px] mt-2" style={{ color: T.muted }}>Lo que no esté incluido se oculta en todos los servicios de {institucion.nombre}, sin borrar sus datos.</p>
          </div>
          <Field label="Notas internas (opcional)">
            <textarea rows={2} value={form.notas} onChange={(ev) => set("notas", ev.target.value)} placeholder="Ej. Pago anual, factura #123" style={{ ...inputStyle, resize: "vertical" }} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40" style={{ background: T.primary }}>
            {guardando ? "Guardando…" : "Guardar licencia"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilaPersonaPanel({ u, miembros, servicios, instituciones, esUnoMismo, onQuitar, onAgregar, onToggleActivo }) {
  const [abierto, setAbierto] = useState(false);
  const [destino, setDestino] = useState({ servicioId: "", rol: "lector" });
  const disponibles = servicios.filter((sv) => sv.activo && !miembros.some((m) => m.servicioId === sv.id));
  const nombreSv = (id) => {
    const sv = servicios.find((x) => x.id === id);
    const inst = instituciones.find((i) => i.id === sv?.institucionId);
    return instituciones.length > 1 && inst ? `${inst.nombre} · ${sv?.nombre}` : sv?.nombre || "Servicio";
  };
  return (
    <div className="flex items-center gap-3 px-5 sm:px-6 py-3 border-b last:border-b-0 flex-wrap" style={{ borderColor: T.border, opacity: u.activo ? 1 : 0.6 }}>
      <div className="min-w-[200px] flex-1">
        <p className="text-[13.5px] font-medium truncate">
          {u.correo}
          {esUnoMismo && <span className="ml-1.5 text-[11px] font-normal" style={{ color: T.muted }}>(tú)</span>}
        </p>
        {u.esSuperadmin ? (
          <p className="text-[11.5px]" style={{ color: T.primaryDark }}>Superadministrador · ve todos los servicios</p>
        ) : !u.activo ? (
          <p className="text-[11.5px]" style={{ color: T.danger }}>Cuenta desactivada</p>
        ) : miembros.length === 0 ? (
          <p className="text-[11.5px]" style={{ color: T.danger }}>Sin servicio: no puede entrar a nada</p>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {miembros.map((m) => (
          <span key={m.id} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-[12px]" style={{ background: m.rol === "maestro" ? T.primarySoft : T.base, color: m.rol === "maestro" ? T.primaryDark : T.ink, border: `1px solid ${m.rol === "maestro" ? "transparent" : T.border}` }}>
            {nombreSv(m.servicioId)}: {m.rol === "maestro" ? "Maestro" : "Lector"}
            {!esUnoMismo && (
              <button onClick={() => onQuitar(m)} aria-label={`Quitar de ${nombreSv(m.servicioId)}`} className="w-5 h-5 rounded-full flex items-center justify-center" style={{ color: T.muted }}>
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        {!esUnoMismo && disponibles.length > 0 && !abierto && (
          <button onClick={() => { setAbierto(true); setDestino({ servicioId: disponibles[0].id, rol: "lector" }); }} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px]" style={{ color: T.primary, border: `1px dashed ${T.border}` }}>
            <Plus size={12} /> Servicio
          </button>
        )}
        {abierto && (
          <span className="inline-flex items-center gap-1.5 flex-wrap">
            <select value={destino.servicioId} onChange={(e) => setDestino((d) => ({ ...d, servicioId: e.target.value }))} style={{ ...inputStyle, width: "auto", padding: "4px 8px", fontSize: 12 }}>
              {disponibles.map((sv) => <option key={sv.id} value={sv.id}>{nombreSv(sv.id)}</option>)}
            </select>
            <select value={destino.rol} onChange={(e) => setDestino((d) => ({ ...d, rol: e.target.value }))} style={{ ...inputStyle, width: "auto", padding: "4px 8px", fontSize: 12 }}>
              <option value="lector">Lector</option>
              <option value="maestro">Maestro</option>
            </select>
            <button onClick={() => { onAgregar(u.id, destino.servicioId, destino.rol); setAbierto(false); }} className="ev-btn px-2.5 py-1 text-[12px] text-white" style={{ background: T.primary }}>Agregar</button>
            <button onClick={() => setAbierto(false)} className="p-1" style={{ color: T.muted }} aria-label="Cancelar"><X size={13} /></button>
          </span>
        )}
      </div>
      {!esUnoMismo && !u.esSuperadmin && (
        <button onClick={onToggleActivo} className="ev-btn text-[12px] px-2.5 py-1 shrink-0" style={u.activo ? { color: T.danger, border: `1px solid ${T.border}` } : { border: `1px solid ${T.border}` }}>
          {u.activo ? "Desactivar cuenta" : "Reactivar"}
        </button>
      )}
    </div>
  );
}

function ServicioEditorModal({ inicial, instituciones, saving, onGuardar, onClose, licencia }) {
  const sv = inicial.servicio;
  const [nombre, setNombre] = useState(sv?.nombre || "");
  const [institucionId, setInstitucionId] = useState(sv?.institucionId || inicial.institucionId || instituciones[0]?.id || "");
  const [modulos, setModulos] = useState(sv ? { ...sv.modulos } : { ...MODULOS_TODOS });
  const [activo, setActivo] = useState(sv ? sv.activo : true);
  const creando = inicial.modo === "crear";
  const nActivos = MODULOS.filter((m) => modulos[m.key] !== false).length;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={onClose}>
      <div className="ev-card ev-sheet ev-fade-in w-full sm:max-w-lg max-h-[92vh] overflow-y-auto ev-scroll p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[17px]">{creando ? "Nuevo servicio" : `Editar ${sv.nombre}`}</h3>
          <button onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-4">
          <Field label="Nombre del servicio">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Grupo de familias" style={inputStyle} autoFocus />
          </Field>
          {creando && instituciones.length > 1 && (
            <Field label="Institución">
              <select value={institucionId} onChange={(e) => setInstitucionId(e.target.value)} style={inputStyle}>
                {instituciones.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </Field>
          )}
          <div>
            <p className="text-[11.5px] font-medium mb-2" style={{ color: T.muted }}>Funciones de este servicio ({nActivos} de {MODULOS.length} activas)</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {MODULOS.map((m) => {
                const Icono = MODULO_ICONO[m.key];
                const incluido = !licencia || licencia.modulos[m.key] !== false;
                const on = incluido && modulos[m.key] !== false;
                return (
                  <button
                    key={m.key}
                    type="button"
                    disabled={!incluido}
                    title={incluido ? undefined : "No incluido en la licencia de la institución"}
                    onClick={() => setModulos((prev) => ({ ...prev, [m.key]: !on }))}
                    aria-pressed={on}
                    className="flex items-start gap-2.5 text-left rounded-xl px-3 py-2.5 transition-colors disabled:cursor-not-allowed"
                    style={{ border: `1px ${incluido ? "solid" : "dashed"} ${on ? T.primary : T.border}`, background: on ? T.primarySoft : T.surface, opacity: incluido ? 1 : 0.5 }}
                  >
                    <Icono size={16} className="shrink-0 mt-0.5" style={{ color: on ? T.primary : T.muted }} />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold" style={{ color: on ? T.primaryDark : T.ink }}>{m.label}</span>
                      <span className="block text-[11.5px] leading-snug" style={{ color: T.muted }}>{m.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11.5px] mt-2" style={{ color: T.muted }}>Dashboard y Configuración siempre están disponibles. Apagar una función la oculta del menú, sin borrar sus datos.</p>
          </div>
          {!creando && (
            <label className="flex items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: T.border }}>
              <span>
                <span className="block text-[13.5px] font-medium">Servicio activo</span>
                <span className="block text-[12px]" style={{ color: T.muted }}>Si lo desactivas, nadie (salvo tú) podrá entrar. No se borra nada.</span>
              </span>
              <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="w-4 h-4 shrink-0" />
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
          <button
            onClick={() => onGuardar({ nombre, institucionId, modulos, activo })}
            disabled={!nombre.trim() || !institucionId || saving}
            className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40"
            style={{ background: T.primary }}
          >
            {saving ? "Guardando…" : creando ? "Crear servicio" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NuevaInstitucionModal({ onCrear, onClose }) {
  const [nombre, setNombre] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="ev-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px]">Nueva institución</h3>
          <button onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        <Field label="Nombre">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Fundación Renacer" style={inputStyle} autoFocus />
        </Field>
        <p className="text-[12px] mt-2" style={{ color: T.muted }}>Sus servicios, personas y contenido quedan separados de las demás instituciones.</p>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
          <button onClick={() => onCrear(nombre)} disabled={!nombre.trim()} className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40" style={{ background: T.primary }}>
            Crear institución
          </button>
        </div>
      </div>
    </div>
  );
}

function SolicitudesPendientes({ ctx }) {
  const { usuariosLista, aprobarUsuario, toggleActivoUsuario, servicios, servicioActualId, esSuperadmin, instituciones } = ctx;
  const pendientes = usuariosLista.filter((u) => !u.aprobado && u.activo);
  const [destino, setDestino] = useState({}); // usuarioId -> { servicioId, rol }
  const opcionesServicio = esSuperadmin ? servicios.filter((sv) => sv.activo) : servicios.filter((sv) => sv.id === servicioActualId);
  const nombreServicio = (sv) => {
    const inst = instituciones.find((i) => i.id === sv.institucionId);
    return instituciones.length > 1 && inst ? `${inst.nombre} · ${sv.nombre}` : sv.nombre;
  };
  function elegido(u) {
    return { servicioId: servicioActualId, rol: "lector", ...(destino[u.id] || {}) };
  }
  function rechazar(u) {
    if (window.confirm(`¿Rechazar la solicitud de ${u.correo}? No podrá entrar. Puedes reactivarla después.`)) {
      toggleActivoUsuario(u.id, true);
    }
  }
  return (
    <div className="ev-card overflow-hidden" style={pendientes.length > 0 ? { border: `1px solid color-mix(in srgb, ${T.primary} 35%, ${T.border})` } : undefined}>
      <div className="px-5 py-4 border-b" style={{ borderColor: T.border }}>
        <h3 className="ev-display font-semibold text-[15px] flex items-center gap-2">
          Solicitudes de acceso
          {pendientes.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11.5px] font-bold text-white" style={{ background: T.primary }}>{pendientes.length}</span>
          )}
        </h3>
        <p className="text-[12px]" style={{ color: T.muted }}>Cuentas nuevas sin código de invitación. Mientras no las apruebes no ven ningún dato.</p>
      </div>
      <div className="flex flex-col divide-y" style={{ borderColor: T.border }}>
        {pendientes.map((u) => {
          const d = elegido(u);
          return (
            <div key={u.id} className="px-5 py-3 flex flex-col gap-2.5">
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium truncate">{u.nombre && u.nombre !== u.correo ? u.nombre : u.correo}</p>
                <p className="text-[12px] truncate" style={{ color: T.muted }}>
                  {u.nombre && u.nombre !== u.correo ? `${u.correo} · ` : ""}
                  {u.createdAt ? `se registró el ${new Date(u.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}` : "nueva cuenta"}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {esSuperadmin ? (
                  <>
                    <select value={d.servicioId || ""} onChange={(e) => setDestino((p) => ({ ...p, [u.id]: { ...d, servicioId: e.target.value } }))} style={{ ...inputStyle, width: "auto", padding: "6px 10px", fontSize: 12.5 }}>
                      {opcionesServicio.map((sv) => <option key={sv.id} value={sv.id}>{nombreServicio(sv)}</option>)}
                    </select>
                    <select value={d.rol} onChange={(e) => setDestino((p) => ({ ...p, [u.id]: { ...d, rol: e.target.value } }))} style={{ ...inputStyle, width: "auto", padding: "6px 10px", fontSize: 12.5 }}>
                      <option value="lector">Lector</option>
                      <option value="maestro">Maestro</option>
                    </select>
                  </>
                ) : (
                  <span className="text-[12px]" style={{ color: T.muted }}>Entrará como Lector de <strong style={{ color: T.ink }}>{opcionesServicio[0]?.nombre}</strong></span>
                )}
                <div className="flex gap-2 ml-auto">
                  <button onClick={() => rechazar(u)} className="ev-btn text-[12px] px-3 py-1.5" style={{ background: T.dangerSoft, color: T.danger }}>
                    Rechazar
                  </button>
                  <button onClick={() => aprobarUsuario(u.id, d.servicioId, d.rol)} disabled={!d.servicioId} className="ev-btn text-[12px] px-3 py-1.5 text-white disabled:opacity-40" style={{ background: T.primary }}>
                    <CheckCircle2 size={13} /> Aprobar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {pendientes.length === 0 && (
          <p className="px-5 py-5 text-[12.5px] text-center" style={{ color: T.muted }}>No hay solicitudes pendientes.</p>
        )}
      </div>
    </div>
  );
}

// Personas con acceso al servicio actual, con su rol EN ESTE servicio.
// Maestro: puede agregar/quitar Lectores. Superadmin: también nombra Maestros.
function PersonasDelServicio({ ctx }) {
  const { servicioActualId, servicioActual, usuariosLista, esSuperadmin, session, showToast, misMiembros, toggleActivoUsuario } = ctx;
  const [miembros, setMiembros] = useState(null);
  const [error, setError] = useState(null);
  const [agregando, setAgregando] = useState("");

  async function cargar() {
    setError(null);
    try {
      const rows = await sb(`miembros?servicio_id=eq.${servicioActualId}&select=*`);
      setMiembros(rows.map(mapMiembro));
    } catch (err) {
      setError(/miembros/i.test(err.message) ? "Falta correr el SQL de la etapa 2 en Supabase." : err.message);
    }
  }
  React.useEffect(() => { if (misMiembros) cargar(); }, [servicioActualId, misMiembros]);
  if (!misMiembros) return null;

  const filas = (miembros || [])
    .map((m) => ({ ...m, usuario: usuariosLista.find((u) => u.id === m.usuarioId) }))
    .filter((m) => m.usuario)
    .sort((a, b) => (a.rol === b.rol ? a.usuario.correo.localeCompare(b.usuario.correo) : a.rol === "maestro" ? -1 : 1));
  // Personas ya aprobadas que aún no están en este servicio (para agregarlas).
  const candidatos = usuariosLista.filter((u) => u.aprobado && u.activo && !(miembros || []).some((m) => m.usuarioId === u.id));

  async function cambiarRol(m, rol) {
    try {
      await sb(`miembros?id=eq.${m.id}`, { method: "PATCH", body: JSON.stringify({ rol }) });
      setMiembros((prev) => prev.map((x) => (x.id === m.id ? { ...x, rol } : x)));
      showToast(rol === "maestro" ? `${m.usuario.correo} ahora es Maestro de ${servicioActual?.nombre}` : "Rol actualizado");
    } catch (err) {
      showToast(`No se pudo cambiar: ${err.message.replace(/^Supabase.*?: /, "")}`, "warn");
    }
  }
  async function quitar(m) {
    if (!window.confirm(`¿Quitar a ${m.usuario.correo} de ${servicioActual?.nombre}? Su cuenta sigue existiendo, pero ya no verá este servicio.`)) return;
    try {
      await sb(`miembros?id=eq.${m.id}`, { method: "DELETE", prefer: "return=minimal" });
      setMiembros((prev) => prev.filter((x) => x.id !== m.id));
      showToast("Persona quitada del servicio", "warn");
    } catch (err) {
      showToast(`No se pudo quitar: ${err.message.replace(/^Supabase.*?: /, "")}`, "warn");
    }
  }
  async function agregar() {
    if (!agregando) return;
    try {
      const [row] = await sb("miembros", { method: "POST", body: JSON.stringify({ usuario_id: agregando, servicio_id: servicioActualId, rol: "lector" }) });
      setMiembros((prev) => [...(prev || []), mapMiembro(row)]);
      setAgregando("");
      showToast("Persona agregada como Lector");
    } catch (err) {
      showToast(`No se pudo agregar: ${err.message.replace(/^Supabase.*?: /, "")}`, "warn");
    }
  }

  return (
    <div className="ev-card overflow-hidden">
      <div className="px-5 py-4 border-b" style={{ borderColor: T.border }}>
        <h3 className="ev-display font-semibold text-[15px]">Personas con acceso</h3>
        <p className="text-[12px]" style={{ color: T.muted }}>
          Quién puede entrar a {servicioActual?.nombre || "este servicio"}. {esSuperadmin ? "Como superadministrador puedes nombrar Maestros." : "Solo el superadministrador puede nombrar Maestros."}
        </p>
      </div>
      {error && <p className="px-5 py-4 text-[12.5px]" style={{ color: T.danger }}>{error}</p>}
      {!error && miembros === null && <p className="px-5 py-4 text-[12.5px]" style={{ color: T.muted }}>Cargando…</p>}
      {!error && miembros !== null && (
        <div className="flex flex-col divide-y" style={{ borderColor: T.border }}>
          {filas.map((m) => {
            const esUnoMismo = m.usuarioId === session?.id;
            const puedeEditar = !esUnoMismo && (esSuperadmin || m.rol === "lector");
            return (
              <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-2.5 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium truncate">
                    {m.usuario.correo}
                    {esUnoMismo && <span className="ml-1.5 text-[11px] font-normal" style={{ color: T.muted }}>(tú)</span>}
                    {m.usuario.esSuperadmin && <span className="ml-1.5 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: T.primarySoft, color: T.primaryDark }}>Superadmin</span>}
                    {!m.usuario.activo && <span className="ml-1.5 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: T.dangerSoft, color: T.danger }}>Cuenta desactivada</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {esSuperadmin && !esUnoMismo ? (
                    <select value={m.rol} onChange={(e) => cambiarRol(m, e.target.value)} style={{ ...inputStyle, width: "auto", padding: "5px 10px", fontSize: 12.5 }}>
                      <option value="maestro">Maestro</option>
                      <option value="lector">Lector</option>
                    </select>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[11.5px] font-semibold" style={{ background: m.rol === "maestro" ? T.primarySoft : T.base, color: m.rol === "maestro" ? T.primaryDark : T.muted, border: m.rol === "maestro" ? "none" : `1px solid ${T.border}` }}>
                      {m.rol === "maestro" ? "Maestro" : "Lector"}
                    </span>
                  )}
                  {puedeEditar && (
                    <button onClick={() => quitar(m)} title="Quitar de este servicio" className="ev-btn text-[12px] px-2.5 py-1" style={{ border: `1px solid ${T.border}`, color: T.muted }}>
                      Quitar
                    </button>
                  )}
                  {esSuperadmin && !esUnoMismo && (
                    <button onClick={() => toggleActivoUsuario(m.usuario.id, m.usuario.activo)} title={m.usuario.activo ? "Desactivar la cuenta en toda la plataforma" : "Reactivar la cuenta"} className="ev-btn text-[12px] px-2.5 py-1" style={m.usuario.activo ? { background: T.dangerSoft, color: T.danger } : { border: `1px solid ${T.border}` }}>
                      {m.usuario.activo ? "Desactivar" : "Reactivar"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filas.length === 0 && <p className="px-5 py-5 text-[12.5px] text-center" style={{ color: T.muted }}>Nadie tiene acceso a este servicio todavía.</p>}
          {candidatos.length > 0 && (
            <div className="flex items-center gap-2 px-5 py-3 flex-wrap" style={{ background: T.base }}>
              <select value={agregando} onChange={(e) => setAgregando(e.target.value)} style={{ ...inputStyle, width: "auto", flex: "1 1 220px", padding: "7px 10px", fontSize: 12.5 }}>
                <option value="">Agregar a alguien que ya tiene cuenta…</option>
                {candidatos.map((u) => <option key={u.id} value={u.id}>{u.correo}</option>)}
              </select>
              <button onClick={agregar} disabled={!agregando} className="ev-btn px-3 py-1.5 text-[12px] text-white disabled:opacity-40" style={{ background: T.primary }}>
                <Plus size={13} /> Agregar como Lector
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InvitacionesConfig({ ctx }) {
  const { servicios, session, showToast, servicioActualId, esSuperadmin, misMiembros } = ctx;
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [creando, setCreando] = useState(false);
  const [formAbierto, setFormAbierto] = useState(false);
  const formVacio = { nota: "", servicioId: servicioActualId || "", rol: "lector", usosMax: 1, dias: 7 };
  const [form, setForm] = useState(formVacio);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      // El superadmin ve los códigos de todos los servicios; un Maestro, los de su servicio.
      const filtro = esSuperadmin || !misMiembros ? "" : `servicio_id=eq.${servicioActualId}&`;
      const filas = await sb(`invitaciones?${filtro}select=*&order=created_at.desc&limit=50`);
      setLista(filas.map(mapInvitacion));
    } catch (err) {
      setError(/invitaciones/i.test(err.message) && /404|42P01|does not exist|PGRST/i.test(err.message)
        ? "Falta correr el SQL de la etapa 1 (etapa1_acceso_controlado.sql) en Supabase."
        : err.message);
    } finally {
      setCargando(false);
    }
  }
  React.useEffect(() => { cargar(); setForm(formVacio); }, [servicioActualId]);

  function enlaceDe(inv) {
    return `${window.location.origin}/?invitacion=${inv.codigo}`;
  }
  async function copiar(texto, que) {
    try {
      await navigator.clipboard.writeText(texto);
      showToast(`${que} copiado`);
    } catch (_) {
      window.prompt("Copia esto:", texto);
    }
  }
  async function crear() {
    setCreando(true);
    try {
      const dias = Number(form.dias);
      const body = {
        codigo: generarCodigoInvitacion(),
        nota: form.nota.trim() || null,
        servicio_id: form.servicioId || servicioActualId || null,
        ...(misMiembros ? { rol: esSuperadmin ? form.rol : "lector" } : {}),
        usos_max: Math.max(1, Number(form.usosMax) || 1),
        expira_en: dias > 0 ? new Date(Date.now() + dias * 86400000).toISOString() : null,
        creado_por: session?.id || null,
      };
      const [row] = await sb("invitaciones", { method: "POST", body: JSON.stringify(body) });
      const nueva = mapInvitacion(row);
      setLista((prev) => [nueva, ...prev]);
      setFormAbierto(false);
      setForm(formVacio);
      await copiar(enlaceDe(nueva), "Enlace de invitación");
    } catch (err) {
      showToast(`No se pudo crear: ${err.message}`, "warn");
    } finally {
      setCreando(false);
    }
  }
  async function desactivar(inv) {
    try {
      const [row] = await sb(`invitaciones?id=eq.${inv.id}`, { method: "PATCH", body: JSON.stringify({ activa: false }) });
      setLista((prev) => prev.map((i) => (i.id === inv.id ? mapInvitacion(row) : i)));
      showToast("Código desactivado", "warn");
    } catch (err) {
      showToast(`No se pudo desactivar: ${err.message}`, "warn");
    }
  }

  return (
    <div className="ev-card overflow-hidden">
      <div className="px-5 py-4 border-b flex items-start justify-between gap-3 flex-wrap" style={{ borderColor: T.border }}>
        <div>
          <h3 className="ev-display font-semibold text-[15px]">Códigos de invitación</h3>
          <p className="text-[12px]" style={{ color: T.muted }}>Comparte un enlace o un código: quien lo use al crear su cuenta entra de una vez, sin esperar aprobación.</p>
        </div>
        {!formAbierto && !error && (
          <button onClick={() => setFormAbierto(true)} className="ev-btn px-3 py-1.5 text-[12px] text-white shrink-0" style={{ background: T.primary }}>
            <Plus size={13} /> Nuevo código
          </button>
        )}
      </div>

      {formAbierto && (
        <div className="px-5 py-4 border-b flex flex-col gap-3" style={{ borderColor: T.border, background: T.base }}>
          <Field label="¿Para quién es? (nota para ti, opcional)">
            <input value={form.nota} onChange={(e) => set("nota", e.target.value)} placeholder="Ej. Auxiliares nuevos de octubre" style={inputStyle} />
          </Field>
          <div className="grid sm:grid-cols-3 gap-3">
            {esSuperadmin ? (
              <>
                <Field label="Servicio">
                  <select value={form.servicioId} onChange={(e) => set("servicioId", e.target.value)} style={inputStyle}>
                    {servicios.filter((sv) => sv.activo).map((sv) => <option key={sv.id} value={sv.id}>{sv.nombre}</option>)}
                  </select>
                </Field>
                <Field label="Entra como">
                  <select value={form.rol} onChange={(e) => set("rol", e.target.value)} style={inputStyle}>
                    <option value="lector">Lector</option>
                    <option value="maestro">Maestro</option>
                  </select>
                </Field>
              </>
            ) : (
              <Field label="Servicio">
                <input value={servicios.find((sv) => sv.id === servicioActualId)?.nombre || ""} disabled style={{ ...inputStyle, opacity: 0.7 }} />
              </Field>
            )}
            <Field label="Cuántas personas pueden usarlo">
              <input type="number" min={1} max={200} value={form.usosMax} onChange={(e) => set("usosMax", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Vence en">
              <select value={form.dias} onChange={(e) => set("dias", e.target.value)} style={inputStyle}>
                <option value={1}>1 día</option>
                <option value={7}>7 días</option>
                <option value={30}>30 días</option>
                <option value={0}>No vence</option>
              </select>
            </Field>
          </div>
          <p className="text-[11.5px]" style={{ color: T.muted }}>
            {esSuperadmin ? "Quien use el código queda directamente en ese servicio con el rol elegido." : "Quien use el código entra como Lector de este servicio. Solo el superadministrador puede crear códigos de Maestro."}
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setFormAbierto(false)} className="ev-btn px-3.5 py-2 text-[12.5px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
            <button onClick={crear} disabled={creando} className="ev-btn px-3.5 py-2 text-[12.5px] text-white disabled:opacity-50" style={{ background: T.primary }}>
              {creando ? "Creando…" : "Crear y copiar enlace"}
            </button>
          </div>
        </div>
      )}

      {cargando && <p className="px-5 py-5 text-[12.5px]" style={{ color: T.muted }}>Cargando…</p>}
      {error && <p className="px-5 py-4 text-[12.5px]" style={{ color: T.danger }}>{error}</p>}
      {!cargando && !error && (
        <div className="flex flex-col divide-y" style={{ borderColor: T.border }}>
          {lista.map((inv) => {
            const estado = estadoInvitacion(inv);
            const servicio = servicios.find((sv) => sv.id === inv.servicioId);
            const vigente = estado.tono === "ok";
            return (
              <div key={inv.id} className="flex items-center justify-between gap-3 px-5 py-3 flex-wrap" style={{ opacity: vigente ? 1 : 0.6 }}>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 flex-wrap">
                    <span className="ev-mono text-[14px] font-semibold tracking-wider" style={{ color: T.primaryDark }}>{inv.codigo}</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: vigente ? T.primarySoft : T.base, color: vigente ? T.primaryDark : T.muted, border: vigente ? "none" : `1px solid ${T.border}` }}>
                      {estado.texto}
                    </span>
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: T.muted }}>
                    {inv.nota ? `${inv.nota} · ` : ""}{servicio ? `${servicio.nombre} · ` : ""}{inv.rol === "maestro" ? "como Maestro · " : ""}
                    usado {inv.usos} de {inv.usosMax}
                    {inv.expiraEn ? ` · vence ${new Date(inv.expiraEn).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}` : " · no vence"}
                  </p>
                </div>
                {vigente && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => copiar(enlaceDe(inv), "Enlace")} className="ev-btn text-[12px] px-2.5 py-1" style={{ border: `1px solid ${T.border}` }}>
                      <Copy size={12} /> Copiar enlace
                    </button>
                    <button onClick={() => desactivar(inv)} title="Desactivar código" className="ev-btn text-[12px] px-2 py-1" style={{ background: T.dangerSoft, color: T.danger }}>
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {lista.length === 0 && (
            <p className="px-5 py-5 text-[12.5px] text-center" style={{ color: T.muted }}>Todavía no has creado códigos de invitación.</p>
          )}
        </div>
      )}
    </div>
  );
}

function CronEjecucionesLog() {
  const [ejecuciones, setEjecuciones] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const filas = await sb("cron_ejecuciones?select=*&order=ejecutado_en.desc&limit=10");
      setEjecuciones(filas);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }
  React.useEffect(() => { cargar(); }, []);

  return (
    <div className="ev-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="ev-display font-semibold text-[15px]">Últimas ejecuciones del recordatorio de turno</h3>
        <button onClick={cargar} className="ev-btn px-3 py-1.5 text-[12px]" style={{ border: `1px solid ${T.border}` }}>Actualizar</button>
      </div>
      <p className="text-[12px] mb-4" style={{ color: T.muted }}>
        Se guarda un registro cada vez que corre (automático a las 8:00am, o si lo visitas manualmente) — así puedes confirmar que la tarea diaria de verdad se está ejecutando sola.
      </p>
      {cargando && <p className="text-[12.5px]" style={{ color: T.muted }}>Cargando…</p>}
      {error && <p className="text-[12px]" style={{ color: T.danger }}>{error}</p>}
      {ejecuciones && ejecuciones.length === 0 && (
        <p className="text-[12.5px]" style={{ color: T.muted }}>Todavía no hay ninguna ejecución registrada.</p>
      )}
      {ejecuciones && ejecuciones.length > 0 && (
        <div className="flex flex-col gap-2">
          {ejecuciones.map((e) => {
            const r = e.resultado || {};
            const ok = r.ok !== false;
            return (
              <div key={e.id} className="flex items-center justify-between px-3 py-2 rounded-lg text-[12.5px]" style={{ background: ok ? T.primarySoft : T.dangerSoft, color: ok ? T.primaryDark : T.danger }}>
                <span>
                  {new Date(e.ejecutado_en).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {" · "}
                  {r.error ? r.error : r.mensaje ? r.mensaje : `Enviados: ${r.enviados ?? 0} · Sin vincular: ${r.sinVincular ?? 0} · Personas con turno: ${r.personasConTurno ?? 0}`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TelegramGrupoConfig() {
  const [estado, setEstado] = useState(null); // {configuracion} | null mientras carga
  const [cargando, setCargando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState(null);

  async function cargarEstado() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram-grupo", { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setEstado(data.configuracion);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }
  React.useEffect(() => { cargarEstado(); }, []);

  async function confirmar() {
    setConfirmando(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram-grupo", { method: "POST", headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      await cargarEstado();
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmando(false);
    }
  }

  const vinculado = estado?.telegram_grupo_confirmado && estado?.telegram_grupo_chat_id;
  const detectadoSinConfirmar = estado?.telegram_grupo_chat_id && !estado?.telegram_grupo_confirmado;

  return (
    <div className="ev-card p-5">
      <h3 className="ev-display font-semibold text-[15px] mb-1">Grupo de Telegram para el tablero de avisos</h3>
      <p className="text-[12px] mb-4" style={{ color: T.muted }}>
        Cuando publiques un aviso en el Dashboard, también le va a llegar automáticamente a este grupo de Telegram.
      </p>

      {cargando ? (
        <p className="text-[12.5px]" style={{ color: T.muted }}>Cargando…</p>
      ) : vinculado ? (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[12.5px]" style={{ background: T.primarySoft, color: T.primaryDark }}>
          <CheckCircle2 size={15} /> Vinculado a "{estado.telegram_grupo_nombre}"
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <ol className="text-[12.5px] flex flex-col gap-1 list-decimal pl-4" style={{ color: T.muted }}>
            <li>Agrega a <strong style={{ color: T.ink }}>@EvolucionaTurnosBot</strong> al grupo de Telegram de tu equipo.</li>
            <li>Envía cualquier mensaje en ese grupo (ej. "hola").</li>
            <li>Vuelve aquí y dale clic a "Buscar grupo".</li>
          </ol>
          {detectadoSinConfirmar && (
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-[12.5px]" style={{ background: T.accentSoft, color: T.accentInk }}>
              <span>Detectamos el grupo "{estado.telegram_grupo_nombre}" — ¿es este?</span>
              <button onClick={confirmar} disabled={confirmando} className="ev-btn px-3 py-1.5 text-[12px] text-white shrink-0 disabled:opacity-40" style={{ background: T.primary }}>
                {confirmando ? "Confirmando…" : "Confirmar vínculo"}
              </button>
            </div>
          )}
          <button onClick={cargarEstado} className="ev-btn px-3.5 py-2 text-[12.5px] self-start" style={{ border: `1px solid ${T.border}` }}>
            <Sparkles size={13} /> Buscar grupo
          </button>
        </div>
      )}
      {error && <p className="text-[11.5px] mt-2" style={{ color: T.danger }}>{error}</p>}
    </div>
  );
}

function ReglaPersonalModal({ ctx, onClose }) {
  const { personal, saveReglaPersonal, saving } = ctx;
  const [form, setForm] = useState({ personalId: "", diaSemana: 0, tipoTurno: "turno_dia", tipoRegla: "siempre" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ev-card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px]">Nueva regla por persona</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3.5">
          <Field label="Persona">
            <select value={form.personalId} onChange={(e) => set("personalId", e.target.value)} style={inputStyle}>
              <option value="">Selecciona…</option>
              {personal.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          <Field label="Tipo de regla">
            <select value={form.tipoRegla} onChange={(e) => set("tipoRegla", e.target.value)} style={inputStyle}>
              <option value="siempre">Siempre asignar (obligatorio)</option>
              <option value="nunca">Nunca asignar (excluir)</option>
            </select>
          </Field>
          <Field label="Día de la semana">
            <select value={form.diaSemana} onChange={(e) => set("diaSemana", Number(e.target.value))} style={inputStyle}>
              {DIA_LABEL_LARGO.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </Field>
          <Field label="Turno">
            <select value={form.tipoTurno} onChange={(e) => set("tipoTurno", e.target.value)} style={inputStyle}>
              <option value="turno_dia">Turno Día</option>
              <option value="turno_noche">Turno Noche</option>
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
          <button
            onClick={() => saveReglaPersonal(form).then(onClose)}
            disabled={!form.personalId || saving}
            className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40"
            style={{ background: T.primary }}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// "¿Quién lo ve?": solo el servicio actual, o todos los servicios de la institución.
function CampoAlcance({ ctx, value, onChange }) {
  const { servicioActual, institucionActual } = ctx;
  if (!institucionActual) return null; // SQL de la etapa 2 aún sin correr
  return (
    <Field label="¿Quién lo ve?">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-lg" style={{ background: T.base, border: `1px solid ${T.border}` }}>
        {[["servicio", `Solo ${servicioActual?.nombre || "este servicio"}`], ["institucion", `Toda ${institucionActual.nombre}`]].map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className="ev-btn justify-center px-2 py-1.5 text-[12px] truncate"
            style={{ background: value === k ? T.surface : "transparent", color: value === k ? T.primaryDark : T.muted, boxShadow: value === k ? T.shadow : "none" }}
          >
            {label}
          </button>
        ))}
      </div>
    </Field>
  );
}
function EtiquetaInstitucion({ item, ctx }) {
  if (item.servicioId || !item.institucionId) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-semibold" style={{ background: T.surface, color: T.muted, border: `1px solid ${T.border}` }}>
      <Building2 size={10} /> {ctx.institucionActual?.nombre ? `Toda ${ctx.institucionActual.nombre}` : "Toda la institución"}
    </span>
  );
}

function AvisoModal({ ctx, onClose }) {
  const { crearAviso, saving } = ctx;
  const [form, setForm] = useState({ titulo: "", mensaje: "", nivel: "info", fechaExpira: "", alcance: "servicio" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ev-card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px]">Nuevo aviso</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3.5">
          <Field label="Título">
            <input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Ej. Paciente en habitación 4" style={inputStyle} />
          </Field>
          <Field label="Mensaje">
            <textarea rows={4} value={form.mensaje} onChange={(e) => set("mensaje", e.target.value)} placeholder="Detalle para el equipo…" style={{ ...inputStyle, resize: "vertical" }} />
          </Field>
          <Field label="Nivel">
            <select value={form.nivel} onChange={(e) => set("nivel", e.target.value)} style={inputStyle}>
              <option value="info">Informativo</option>
              <option value="importante">Importante</option>
            </select>
          </Field>
          <Field label="Mostrar hasta (opcional)">
            <input type="date" value={form.fechaExpira} onChange={(e) => set("fechaExpira", e.target.value)} style={inputStyle} />
          </Field>
          <CampoAlcance ctx={ctx} value={form.alcance} onChange={(v) => set("alcance", v)} />
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
          <button
            onClick={() => crearAviso(form)}
            disabled={!form.titulo || !form.mensaje || saving}
            className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40"
            style={{ background: T.primary }}
          >
            {saving ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FestivoModal({ ctx, onClose }) {
  const { addFestivo, saving } = ctx;
  const [form, setForm] = useState({ fecha: toISO(TODAY), nombre: "" });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ev-card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px]">Nuevo festivo</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3.5">
          <Field label="Fecha">
            <input type="date" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} style={inputStyle} />
          </Field>
          <Field label="Nombre">
            <input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Día de la Independencia" style={inputStyle} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
          <button onClick={() => addFestivo(form)} disabled={!form.nombre || saving} className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40" style={{ background: T.primary }}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ============================== MODAL: NUEVA/EDITAR ACTIVIDAD ============================== */
function EventModal({ ctx, onClose, onSave, initial }) {
  const { personal, saving, biblioteca, reglas, temas } = ctx;
  const base = initial.event || {};
  const pre = initial.prefill || {};
  const allowedTypes = base.type
    ? (TURNO_TYPES.includes(base.type) ? TURNO_TYPES : ACTIVIDAD_TYPES)
    : (initial.defaultType && TURNO_TYPES.includes(initial.defaultType) ? TURNO_TYPES : ACTIVIDAD_TYPES);
  const [form, setForm] = useState({
    id: base.id || nid(),
    title: base.title || "",
    type: base.type || initial.defaultType || allowedTypes[0],
    date: base.date || pre.date || toISO(TODAY),
    start: base.start ?? pre.start ?? ((base.type || initial.defaultType) === "turno_noche" ? 17 : TURNO_TYPES.includes(base.type || initial.defaultType) ? 7 : 8),
    end: base.end ?? pre.end ?? ((base.type || initial.defaultType) === "turno_noche" ? 31 : TURNO_TYPES.includes(base.type || initial.defaultType) ? 17 : 9),
    personalId: base.personalId || "",
    personalIds: [],
    metodologia: base.metodologia || "",
    objetivos: base.objetivos || "",
  });
  const selected = personById(form.personalId);
  const esTurno = form.type.startsWith("turno_");
  const esTurnoNuevo = esTurno && initial.mode !== "edit";
  const elegibles = personal.filter((p) => esCargoDeTurno(p.cargo, reglas?.cargosTurno));
  const opcionesTurno = elegibles.length > 0 ? elegibles : personal;

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function usarBiblioteca(id) {
    const item = biblioteca.find((b) => b.id === id);
    if (!item) return;
    setForm((f) => ({ ...f, title: item.nombre, type: item.tipo, metodologia: item.metodologia, objetivos: item.objetivos }));
  }
  function toggleTurnoPersona(id) {
    setForm((f) => {
      const has = f.personalIds.includes(id);
      const next = has ? f.personalIds.filter((x) => x !== id) : [...f.personalIds, id];
      return { ...f, personalIds: next };
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ev-card w-full max-w-md p-5 max-h-[90vh] overflow-y-auto ev-scroll">
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px]">
            {initial.mode === "edit" ? "Editar" : "Nuevo"} {esTurno ? "turno" : "actividad"}
          </h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3.5">
          {!esTurno && biblioteca.length > 0 && (
            <Field label="Usar plantilla de la biblioteca (opcional)">
              <select onChange={(e) => e.target.value && usarBiblioteca(e.target.value)} defaultValue="" style={inputStyle}>
                <option value="">— Escribir manualmente —</option>
                {temas.map((tema) => {
                  const items = biblioteca.filter((b) => b.temaId === tema.id);
                  if (items.length === 0) return null;
                  return (
                    <optgroup key={tema.id} label={tema.nombre}>
                      {items.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                    </optgroup>
                  );
                })}
                {biblioteca.some((b) => !b.temaId) && (
                  <optgroup label="Sin tema">
                    {biblioteca.filter((b) => !b.temaId).map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                  </optgroup>
                )}
              </select>
            </Field>
          )}
          {!esTurno && (
            <Field label="Nombre de la actividad">
              <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ej. Grupo Terapéutico" style={inputStyle} />
            </Field>
          )}
          <Field label="Tipo">
            <select
              value={form.type}
              onChange={(e) => {
                const t = e.target.value;
                set("type", t);
                if (t === "turno_dia") { set("title", ACTIVITY_TYPES[t].label); set("start", 7); set("end", 17); }
                if (t === "turno_noche") { set("title", ACTIVITY_TYPES[t].label); set("start", 17); set("end", 31); }
              }}
              style={inputStyle}
            >
              {allowedTypes.map((k) => <option key={k} value={k}>{ACTIVITY_TYPES[k].label}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} style={inputStyle} />
            </Field>
            {!esTurnoNuevo && (
              <Field label="Responsable">
                <select value={form.personalId} onChange={(e) => set("personalId", e.target.value)} style={inputStyle}>
                  <option value="">Sin asignar</option>
                  {(esTurno ? opcionesTurno : personal).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </Field>
            )}
          </div>
          {esTurnoNuevo && (
            <Field label="Personal en este turno (puedes elegir varios)">
              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto ev-scroll rounded-lg p-2" style={{ border: `1px solid ${T.border}` }}>
                {opcionesTurno.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-[12.5px]">
                    <input type="checkbox" checked={form.personalIds.includes(p.id)} onChange={() => toggleTurnoPersona(p.id)} />
                    {p.nombre} <span style={{ color: T.muted }}>· {p.cargo}</span>
                  </label>
                ))}
              </div>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            {esTurno ? (
              <>
                <Field label="Hora inicio">
                  <input type="number" min={0} max={23} value={form.start} onChange={(e) => set("start", parseFloat(e.target.value))} style={inputStyle} />
                </Field>
                <Field label="Hora fin">
                  <input type="number" min={0} max={32} value={form.end} onChange={(e) => set("end", parseFloat(e.target.value))} style={inputStyle} />
                </Field>
              </>
            ) : (
              <>
                <Field label="Hora inicio">
                  <input type="time" step={300} value={horaATimeValue(form.start)} onChange={(e) => e.target.value && set("start", timeValueAHora(e.target.value))} style={inputStyle} />
                </Field>
                <Field label="Hora fin">
                  <input type="time" step={300} value={horaATimeValue(form.end)} onChange={(e) => e.target.value && set("end", timeValueAHora(e.target.value))} style={inputStyle} />
                </Field>
              </>
            )}
          </div>
          {form.type === "turno_noche" && (
            <p className="text-[11.5px] -mt-2" style={{ color: T.muted }}>
              El turno queda registrado el día que inicia ({fmtRange(form.start, form.end)}) y termina a las 07:00 del día siguiente. Cuenta como <strong>{horasEfectivas({ type: form.type, start: Number(form.start), end: Number(form.end) })}h</strong> de jornada (se descuentan {DESCANSO_NOCHE}h de descanso de las 14h en reloj).
            </p>
          )}
          {!esTurnoNuevo && (
            <div className="grid grid-cols-2 gap-3 text-[12.5px]" style={{ color: T.muted }}>
              <p>Cargo: <span style={{ color: T.ink }}>{selected?.cargo || "—"}</span></p>
              <p>Área: <span style={{ color: T.ink }}>{selected?.area || "—"}</span></p>
            </div>
          )}
          {!esTurno && (
            <>
              <Field label="Metodología">
                <textarea rows={3} value={form.metodologia} onChange={(e) => set("metodologia", e.target.value)} placeholder="Cómo se desarrolla la actividad…" style={{ ...inputStyle, resize: "vertical" }} />
              </Field>
              <Field label="Objetivos">
                <textarea rows={3} value={form.objetivos} onChange={(e) => set("objetivos", e.target.value)} placeholder="Qué se busca lograr…" style={{ ...inputStyle, resize: "vertical" }} />
              </Field>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
          <button
            onClick={() => onSave({ ...form, title: esTurno ? ACTIVITY_TYPES[form.type].label : form.title, start: Number(form.start), end: Number(form.end) })}
            disabled={saving || (esTurno ? false : !form.title)}
            className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40"
            style={{ background: T.primary }}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 13px", fontSize: 13.5, background: T.surface, color: T.ink };

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] font-medium" style={{ color: T.muted }}>{label}</span>
      {children}
    </label>
  );
}

/* ============================== DRAWER: DETALLE ============================== */
function DetailDrawer({ ctx, event, onClose, onEdit, onDelete }) {
  const p = personById(event.personalId);
  const color = ACTIVITY_TYPES[event.type].color;
  const TipoIcon = ACTIVITY_TYPES[event.type].icon;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-sm h-full p-5 overflow-y-auto ev-scroll" style={{ background: T.surface }}>
        <div className="flex items-center justify-between mb-5">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold" style={{ background: `${color}17`, color }}>
            <TipoIcon size={13} /> {ACTIVITY_TYPES[event.type].label}
          </span>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <h3 className="ev-display text-[19px] font-semibold mb-1">{event.title}</h3>
        <p className="ev-mono text-[14px] mb-6" style={{ color: T.muted }}>
          {new Date(`${event.date}T00:00:00`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })} · {fmtRange(event.start, event.end)}
        </p>
        <div className="flex flex-col gap-4">
          <DetailRow label="Responsable" value={p?.nombre || "Sin asignar"} />
          <DetailRow label="Cargo" value={p?.cargo || "—"} />
          <DetailRow label="Área" value={p?.area || "—"} />
          {(event.metodologia || event.objetivos) && (
            <div className="pt-2 mt-1 border-t flex flex-col gap-4" style={{ borderColor: T.border }}>
              {event.metodologia && <DetailRow label="Metodología" value={event.metodologia} multiline />}
              {event.objetivos && <DetailRow label="Objetivos" value={event.objetivos} multiline />}
            </div>
          )}
        </div>
        {ctx.isMaestro && (
          <div className="flex gap-2 mt-8">
            <button onClick={onEdit} className="ev-btn flex-1 justify-center px-3.5 py-2.5 text-[13px]" style={{ border: `1px solid ${T.border}` }}>
              <Pencil size={14} /> Editar
            </button>
            <button onClick={onDelete} className="ev-btn flex-1 justify-center px-3.5 py-2.5 text-[13px]" style={{ background: T.dangerSoft, color: T.danger }}>
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
function DetailRow({ label, value, multiline }) {
  return (
    <div>
      <p className="text-[11.5px] font-medium" style={{ color: T.muted }}>{label}</p>
      <p className={`text-[14px] font-medium mt-0.5 ${multiline ? "whitespace-pre-line leading-snug" : ""}`}>{value}</p>
    </div>
  );
}

/* ============================== MODAL: PERSONAL ============================== */
function PersonalModal({ ctx, onClose, initial }) {
  const { savePersonal, saving } = ctx;
  const base = initial.person || {};
  const [form, setForm] = useState({
    id: base.id || nid(),
    nombre: base.nombre || "",
    cargo: base.cargo || "",
    area: base.area || "",
    tipoContrato: base.tipoContrato || "Término indefinido",
    horas: base.horas ?? 40,
    disponibilidad: base.disponibilidad || "Completa",
    estado: base.estado || "activo",
  });
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ev-card w-full max-w-md p-5 max-h-[90vh] overflow-y-auto ev-scroll">
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px]">{initial.mode === "edit" ? "Editar persona" : "Nueva persona"}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3.5">
          <Field label="Nombre completo">
            <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej. Carlos Gómez" style={inputStyle} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cargo">
              <input value={form.cargo} onChange={(e) => set("cargo", e.target.value)} placeholder="Auxiliar terapéutico" style={inputStyle} />
            </Field>
            <Field label="Área">
              <input value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="Terapéutico" style={inputStyle} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de contrato">
              <input value={form.tipoContrato} onChange={(e) => set("tipoContrato", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Horas/semana">
              <input type="number" min={0} max={80} value={form.horas} onChange={(e) => set("horas", e.target.value)} style={inputStyle} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Disponibilidad">
              <input value={form.disponibilidad} onChange={(e) => set("disponibilidad", e.target.value)} placeholder="Completa" style={inputStyle} />
            </Field>
            <Field label="Estado">
              <select value={form.estado} onChange={(e) => set("estado", e.target.value)} style={inputStyle}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
          <button
            onClick={() => savePersonal(form)}
            disabled={!form.nombre || !form.cargo || saving}
            className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40"
            style={{ background: T.primary }}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================== BIBLIOTECA DE ACTIVIDADES ============================== */
/* ============================== NOVEDADES ============================== */
function Novedades({ ctx }) {
  const { novedades, personal, events, reglas, isMaestro, deleteNovedad, reemplazarTurno, showToast, turnosExtra, eliminarTurnoExtra } = ctx;
  const [modalOpen, setModalOpen] = useState(false);
  const [turnoExtraModalOpen, setTurnoExtraModalOpen] = useState(false);
  const todayISO = toISO(TODAY);

  function afectadosDe(n) {
    return events.filter((e) => TURNO_TYPES.includes(e.type) && e.personalId === n.personalId && e.date >= n.fechaInicio && e.date <= n.fechaFin);
  }

  return (
    <div className="flex flex-col gap-4">
      <ReadOnlyBanner isMaestro={isMaestro} />
      <div className="flex items-center justify-between">
        <div>
          <h3 className="ev-display font-semibold text-[16px]">Novedades</h3>
          <p className="text-[12.5px]" style={{ color: T.muted }}>Incapacidades, permisos u otras ausencias, con sugerencia de reemplazo para los turnos afectados.</p>
        </div>
        {isMaestro && (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setTurnoExtraModalOpen(true)} className="ev-btn px-3.5 py-2 text-[12.5px]" style={{ border: `1px solid ${T.border}` }}>
              <Plus size={14} /> Registrar turno extra
            </button>
            <button onClick={() => setModalOpen(true)} className="ev-btn px-3.5 py-2 text-[12.5px] text-white" style={{ background: T.primary }}>
              <Plus size={14} /> Reportar novedad
            </button>
          </div>
        )}
      </div>

      {turnosExtra.length > 0 && (
        <div className="ev-card p-4">
          <h4 className="ev-display font-semibold text-[13.5px] mb-2.5">Turnos extra registrados</h4>
          <div className="flex flex-col divide-y" style={{ borderColor: T.border }}>
            {turnosExtra.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-2 text-[12.5px]">
                <span>
                  <strong>{personName(t.personalId)}</strong> — {new Date(`${t.fecha}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}, {ACTIVITY_TYPES[t.tipoTurno].label.toLowerCase()}, {t.horas}h
                  {t.cubrePersonalId && <> · cubriendo a <strong>{personName(t.cubrePersonalId)}</strong></>}
                  {t.motivo && <span style={{ color: T.muted }}> · {t.motivo}</span>}
                </span>
                {isMaestro && (
                  <button onClick={() => eliminarTurnoExtra(t.id)} className="shrink-0" style={{ color: T.muted }}><Trash2 size={13} /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {novedades.map((n) => {
          const persona = personById(n.personalId);
          const afectados = afectadosDe(n);
          const vigente = n.fechaFin >= todayISO;
          return (
            <div key={n.id} className="ev-card p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-semibold text-[13.5px]">{persona?.nombre || "Persona eliminada"}</p>
                  <p className="text-[12px]" style={{ color: T.muted }}>
                    {n.tipo === "incapacidad" ? "Incapacidad" : n.tipo === "permiso" ? "Permiso" : n.tipo === "vacaciones" ? "Vacaciones" : "Otro"}
                    {" · "}{new Date(`${n.fechaInicio}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" })} – {new Date(`${n.fechaFin}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                    {n.motivo ? ` · ${n.motivo}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: vigente ? T.dangerSoft : T.primarySoft, color: vigente ? T.danger : T.primaryDark }}>
                    {vigente ? "Vigente" : "Pasada"}
                  </span>
                  {isMaestro && (
                    <button onClick={() => deleteNovedad(n.id)} className="ev-btn text-[11.5px] px-2 py-1" style={{ background: T.dangerSoft, color: T.danger }}>
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>

              {afectados.length === 0 ? (
                <p className="text-[12px]" style={{ color: T.muted }}>No tenía turnos asignados en ese rango.</p>
              ) : (
                <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: T.border }}>
                  {afectados.map((turno) => {
                    const sugerido = sugerirReemplazo({ turno, personal, eventosExistentes: events, reglas, novedades });
                    return (
                      <div key={turno.id} className="flex items-center justify-between text-[12.5px]">
                        <span>
                          {new Date(`${turno.date}T00:00:00`).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })} · {ACTIVITY_TYPES[turno.type].label}
                        </span>
                        {isMaestro && (
                          sugerido ? (
                            <button onClick={() => reemplazarTurno(turno, sugerido.id)} className="ev-btn text-[11.5px] px-2.5 py-1 text-white" style={{ background: T.primary }}>
                              Cubrir con {sugerido.nombre}
                            </button>
                          ) : (
                            <span className="text-[11.5px]" style={{ color: T.danger }}>Sin reemplazo disponible</span>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {novedades.length === 0 && (
          <p className="text-[12.5px] text-center py-8" style={{ color: T.muted }}>No hay novedades reportadas.</p>
        )}
      </div>

      {modalOpen && <NovedadModal ctx={ctx} onClose={() => setModalOpen(false)} />}
      {turnoExtraModalOpen && <TurnoExtraModal ctx={ctx} onClose={() => setTurnoExtraModalOpen(false)} />}
    </div>
  );
}

function NovedadModal({ ctx, onClose }) {
  const { personal, saveNovedad, saving } = ctx;
  const [form, setForm] = useState({ personalId: "", fechaInicio: toISO(TODAY), fechaFin: toISO(TODAY), tipo: "incapacidad", motivo: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ev-card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px]">Reportar novedad</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3.5">
          <Field label="Persona">
            <select value={form.personalId} onChange={(e) => set("personalId", e.target.value)} style={inputStyle}>
              <option value="">Selecciona…</option>
              {personal.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          <Field label="Tipo">
            <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} style={inputStyle}>
              <option value="incapacidad">Incapacidad</option>
              <option value="permiso">Permiso</option>
              <option value="vacaciones">Vacaciones</option>
              <option value="otro">Otro</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Desde">
              <input type="date" value={form.fechaInicio} onChange={(e) => set("fechaInicio", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Hasta">
              <input type="date" value={form.fechaFin} onChange={(e) => set("fechaFin", e.target.value)} style={inputStyle} />
            </Field>
          </div>
          <Field label="Motivo (opcional)">
            <input value={form.motivo} onChange={(e) => set("motivo", e.target.value)} placeholder="Ej. cirugía programada" style={inputStyle} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
          <button
            onClick={() => saveNovedad(form).then(onClose)}
            disabled={!form.personalId || form.fechaFin < form.fechaInicio || saving}
            className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40"
            style={{ background: T.primary }}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TurnoExtraModal({ ctx, onClose }) {
  const { personal, agregarTurnoExtra, saving } = ctx;
  const [personalId, setPersonalId] = useState("");
  const [fecha, setFecha] = useState(toISO(TODAY));
  const [tipoTurno, setTipoTurno] = useState("turno_dia");
  const [horas, setHoras] = useState(10);
  const [cubrePersonalId, setCubrePersonalId] = useState("");
  const [motivo, setMotivo] = useState("");

  async function guardar() {
    const ok = await agregarTurnoExtra({ personalId, fecha, tipoTurno, horas, cubrePersonalId, motivo });
    if (ok) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ev-card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px]">Registrar turno extra</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <p className="text-[12px] mb-3.5" style={{ color: T.muted }}>
          Elige tú mismo la fecha, el turno y las horas — no depende de que ese turno ya exista en el calendario.
        </p>
        <div className="flex flex-col gap-3.5">
          <Field label="Persona que hizo el turno extra">
            <select value={personalId} onChange={(e) => setPersonalId(e.target.value)} style={inputStyle}>
              <option value="">Selecciona…</option>
              {personal.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Turno">
              <select value={tipoTurno} onChange={(e) => setTipoTurno(e.target.value)} style={inputStyle}>
                <option value="turno_dia">Día</option>
                <option value="turno_noche">Noche</option>
              </select>
            </Field>
          </div>
          <Field label="Horas">
            <input type="number" min="0.5" step="0.5" value={horas} onChange={(e) => setHoras(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="¿A quién está cubriendo? (opcional)">
            <select value={cubrePersonalId} onChange={(e) => setCubrePersonalId(e.target.value)} style={inputStyle}>
              <option value="">— Ninguno en particular —</option>
              {personal.filter((p) => p.id !== personalId).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          <Field label="Motivo (opcional)">
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. cubrió la incapacidad de Jose Villa" style={inputStyle} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
          <button
            onClick={guardar}
            disabled={!personalId || !fecha || !horas || saving}
            className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40"
            style={{ background: T.primary }}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}


function Biblioteca({ ctx }) {
  const { biblioteca, isMaestro, setBibModal, deleteBiblioteca } = ctx;
  const [tab, setTab] = useState("individuales");
  return (
    <div className="flex flex-col gap-4">
      <ReadOnlyBanner isMaestro={isMaestro} />
      <div className="flex items-center gap-1 p-1 rounded-lg self-start" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        {[["individuales", "Plantillas de actividad"], ["semanales", "Plantillas semanales"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="ev-btn px-3.5 py-1.5 text-[12.5px]"
            style={{ background: tab === key ? T.primary : "transparent", color: tab === key ? "#fff" : T.ink }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "individuales" && (
        <BibliotecaIndividual ctx={ctx} />
      )}

      {tab === "semanales" && <PlantillasSemanales ctx={ctx} />}
    </div>
  );
}

function BibliotecaIndividual({ ctx }) {
  const { biblioteca, temas, isMaestro, setBibModal, deleteBiblioteca, setTemaModal, eliminarTema } = ctx;
  const [copiando, setCopiando] = useState(null); // null | { preseleccion: [ids] }
  const destinosCopia = serviciosDestinoCopia(ctx);
  const [busqueda, setBusqueda] = useState("");
  const [abiertos, setAbiertos] = useState(() => new Set()); // ids de temas desplegados ("__sin_tema" para el capítulo final)
  const [leyendoId, setLeyendoId] = useState(null); // actividad abierta en modo lectura
  const term = normalizarTexto(busqueda);

  function coincide(b) {
    if (!term) return true;
    const tema = temas.find((t) => t.id === b.temaId);
    return normalizarTexto(b.nombre).includes(term)
      || normalizarTexto(b.metodologia).includes(term)
      || normalizarTexto(b.objetivos).includes(term)
      || (tema && normalizarTexto(tema.nombre).includes(term));
  }

  // Capítulos del índice: un capítulo por tema (en orden alfabético, como ya llegan)
  // y al final "Sin tema" si hay actividades sueltas.
  const capitulos = [
    ...temas.map((t) => ({ id: t.id, nombre: t.nombre, esTema: true, items: biblioteca.filter((b) => b.temaId === t.id).sort((a, b) => a.nombre.localeCompare(b.nombre)) })),
    { id: "__sin_tema", nombre: "Sin tema", esTema: false, items: biblioteca.filter((b) => !b.temaId).sort((a, b) => a.nombre.localeCompare(b.nombre)) },
  ].filter((c) => c.esTema || c.items.length > 0);

  const capitulosVisibles = capitulos
    .map((c) => ({ ...c, visibles: c.items.filter(coincide) }))
    .filter((c) => !term || c.visibles.length > 0);
  const hayResultados = capitulosVisibles.length > 0;
  const todosAbiertos = capitulos.length > 0 && capitulos.every((c) => abiertos.has(c.id));

  function toggle(id) {
    setAbiertos((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleTodos() {
    setAbiertos(todosAbiertos ? new Set() : new Set(capitulos.map((c) => c.id)));
  }

  // Lista plana (en el orden del índice) para poder pasar a la anterior/siguiente desde la lectura.
  const ordenLectura = capitulos.flatMap((c) => c.items);
  const leyendo = ordenLectura.find((b) => b.id === leyendoId) || null;

  return (
    <>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="ev-display font-semibold text-[16px] flex items-center gap-2">
            <BookOpen size={17} style={{ color: T.primary }} /> Biblioteca de actividades
          </h3>
          <p className="text-[12.5px] mt-0.5" style={{ color: T.muted }}>
            {temas.length} {temas.length === 1 ? "tema" : "temas"} · {biblioteca.length} {biblioteca.length === 1 ? "actividad" : "actividades"} — toca un tema para ver sus actividades.
          </p>
        </div>
        {isMaestro && (
          <div className="flex gap-2 shrink-0 flex-wrap">
            {destinosCopia.length > 0 && biblioteca.length > 0 && (
              <button onClick={() => setCopiando({ preseleccion: [] })} className="ev-btn px-3.5 py-2 text-[12.5px]" style={{ border: `1px solid ${T.border}` }}>
                <Copy size={14} /> Copiar a otro servicio
              </button>
            )}
            <button onClick={() => setTemaModal(true)} className="ev-btn px-3.5 py-2 text-[12.5px]" style={{ border: `1px solid ${T.border}` }}>
              <Plus size={14} /> Nuevo tema
            </button>
            <button onClick={() => setBibModal({ mode: "new", item: null })} className="ev-btn px-3.5 py-2 text-[12.5px] text-white" style={{ background: T.primary }}>
              <Plus size={14} /> Nueva actividad
            </button>
          </div>
        )}
      </div>

      <div className="ev-card overflow-hidden max-w-3xl w-full">
        {/* Cabecera del índice */}
        <div className="px-5 sm:px-7 pt-6 pb-4 border-b" style={{ borderColor: T.border }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: T.muted }}>Índice de contenidos</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.muted }} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar actividad o tema… ej. sistema de creencias"
                style={{ ...inputStyle, paddingLeft: 32 }}
              />
            </div>
            {!term && capitulos.length > 0 && (
              <button onClick={toggleTodos} className="ev-btn px-3 py-2 text-[12px]" style={{ border: `1px solid ${T.border}`, color: T.muted }}>
                {todosAbiertos ? "Contraer todo" : "Desplegar todo"}
              </button>
            )}
          </div>
        </div>

        {/* Capítulos */}
        <div className="flex flex-col">
          {capitulosVisibles.map((c, idx) => {
            const numero = String(idx + 1).padStart(2, "0");
            const abierto = term ? true : abiertos.has(c.id); // al buscar, se despliega todo lo que coincide
            const lista = term ? c.visibles : c.items;
            return (
              <div key={c.id} className="border-b last:border-b-0" style={{ borderColor: T.border }}>
                <div className="flex items-center gap-2 pr-3 sm:pr-5">
                  <button
                    onClick={() => !term && toggle(c.id)}
                    aria-expanded={abierto}
                    className="flex-1 min-w-0 flex items-center gap-3 sm:gap-4 pl-5 sm:pl-7 py-4 text-left transition-colors hover:bg-black/[0.02]"
                  >
                    <span className="ev-mono text-[13px] font-semibold shrink-0 w-6" style={{ color: c.esTema ? T.primary : T.muted }}>{c.esTema ? numero : "—"}</span>
                    <span className="font-semibold text-[15px] truncate" style={{ color: c.esTema ? T.ink : T.muted }}>{c.nombre}</span>
                    <span className="flex-1 min-w-[16px] self-end mb-[6px] border-b-2 border-dotted" style={{ borderColor: T.border }} aria-hidden="true" />
                    <span className="text-[12.5px] font-medium shrink-0 px-2 py-0.5 rounded-full" style={{ background: T.primarySoft, color: T.primaryDark }}>
                      {c.items.length} {c.items.length === 1 ? "actividad" : "actividades"}
                    </span>
                    <ChevronDown size={16} className="shrink-0 transition-transform duration-200" style={{ color: T.muted, transform: abierto ? "rotate(0deg)" : "rotate(-90deg)" }} />
                  </button>
                  {isMaestro && c.esTema && (
                    <button onClick={() => eliminarTema(c.id)} title="Eliminar tema (las actividades quedan sin tema)" className="p-1.5 rounded-md shrink-0" style={{ color: T.muted }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {abierto && (
                  <div className="ev-fade-in pb-3">
                    {lista.map((b, j) => {
                      const tipo = ACTIVITY_TYPES[b.tipo] || ACTIVITY_TYPES.terapeutico;
                      const TipoIcon = tipo.icon;
                      return (
                        <button
                          key={b.id}
                          onClick={() => setLeyendoId(b.id)}
                          className="w-full flex items-center gap-3 sm:gap-4 pl-5 sm:pl-7 pr-5 sm:pr-7 py-2.5 text-left transition-colors hover:bg-black/[0.025] group"
                        >
                          <span className="ev-mono text-[12px] shrink-0 w-6" style={{ color: T.muted }}>{c.esTema ? `${idx + 1}.${j + 1}` : "·"}</span>
                          <TipoIcon size={14} className="shrink-0" style={{ color: tipo.color }} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] font-medium leading-snug group-hover:underline" style={{ color: T.ink }}>{b.nombre}</span>
                            <span className="block text-[11.5px]" style={{ color: T.muted }}>{tipo.label}</span>
                          </span>
                          <span className="text-[12px] font-semibold shrink-0 flex items-center gap-1" style={{ color: T.primary }}>
                            Leer <ChevronRight size={14} />
                          </span>
                        </button>
                      );
                    })}
                    {lista.length === 0 && (
                      <p className="pl-[68px] sm:pl-[84px] py-2 text-[12.5px]" style={{ color: T.muted }}>Sin actividades todavía en este tema.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {!hayResultados && term && (
            <p className="text-[13px] text-center py-10 px-5" style={{ color: T.muted }}>No hay actividades ni temas que coincidan con "{busqueda}".</p>
          )}
          {capitulos.length === 0 && !term && (
            <p className="text-[13px] text-center py-10 px-5" style={{ color: T.muted }}>Todavía no hay actividades en la biblioteca.</p>
          )}
        </div>
      </div>

      {leyendo && (
        <LecturaActividadModal
          ctx={ctx}
          item={leyendo}
          tema={temas.find((t) => t.id === leyendo.temaId) || null}
          anterior={ordenLectura[ordenLectura.indexOf(leyendo) - 1] || null}
          siguiente={ordenLectura[ordenLectura.indexOf(leyendo) + 1] || null}
          onNavegar={(b) => setLeyendoId(b.id)}
          onClose={() => setLeyendoId(null)}
          onEditar={() => { setLeyendoId(null); setBibModal({ mode: "edit", item: leyendo }); }}
          onEliminar={() => {
            if (window.confirm(`¿Eliminar "${leyendo.nombre}" de la biblioteca?`)) { setLeyendoId(null); deleteBiblioteca(leyendo.id); }
          }}
          onCopiar={destinosCopia.length > 0 ? () => { setLeyendoId(null); setCopiando({ preseleccion: [leyendo.id] }); } : null}
        />
      )}
      {copiando && (
        <CopiarBibliotecaModal ctx={ctx} destinos={destinosCopia} preseleccion={copiando.preseleccion} onClose={() => setCopiando(null)} />
      )}
    </>
  );
}

// Servicios de la MISMA institución a los que esta persona puede copiar
// actividades: donde es Maestro (o todos, si es superadmin).
function serviciosDestinoCopia(ctx) {
  const { servicios, servicioActual, esSuperadmin, misMiembros } = ctx;
  if (!servicioActual?.institucionId) return [];
  return (servicios || []).filter((sv) =>
    sv.id !== servicioActual.id && sv.activo && sv.institucionId === servicioActual.institucionId
    && (esSuperadmin || (misMiembros || []).some((m) => m.servicioId === sv.id && m.rol === "maestro"))
  );
}

// Copia actividades de la biblioteca del servicio actual a otro servicio de la
// misma institución. Son copias independientes: editar una no cambia la otra.
// Se respetan los temas (se crean en el destino si no existen) y no se
// duplican actividades que ya estén allá con el mismo nombre y tema.
function CopiarBibliotecaModal({ ctx, destinos, preseleccion, onClose }) {
  const { biblioteca, temas, servicioActual, showToast } = ctx;
  const [destinoId, setDestinoId] = useState(destinos[0]?.id || "");
  const [elegidas, setElegidas] = useState(() => new Set(preseleccion || []));
  const [busqueda, setBusqueda] = useState("");
  const [copiando, setCopiando] = useState(false);
  const [resultado, setResultado] = useState(null); // { copiadas, omitidas, destino }
  const term = normalizarTexto(busqueda);

  const grupos = [
    ...temas.map((t) => ({ id: t.id, nombre: t.nombre, items: biblioteca.filter((b) => b.temaId === t.id) })),
    { id: null, nombre: "Sin tema", items: biblioteca.filter((b) => !b.temaId) },
  ]
    .map((g) => ({ ...g, items: g.items.filter((b) => !term || normalizarTexto(b.nombre).includes(term) || normalizarTexto(g.nombre).includes(term)).sort((a, b) => a.nombre.localeCompare(b.nombre)) }))
    .filter((g) => g.items.length > 0);

  function alternar(id) {
    setElegidas((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function alternarGrupo(g) {
    const todas = g.items.every((b) => elegidas.has(b.id));
    setElegidas((prev) => { const n = new Set(prev); g.items.forEach((b) => (todas ? n.delete(b.id) : n.add(b.id))); return n; });
  }

  async function copiar() {
    const destino = destinos.find((d) => d.id === destinoId);
    if (!destino || elegidas.size === 0) return;
    setCopiando(true);
    try {
      const [temasDestino, actividadesDestino] = await Promise.all([
        sb(`temas_biblioteca?servicio_id=eq.${destinoId}&select=id,nombre`),
        sb(`biblioteca_actividades?servicio_id=eq.${destinoId}&select=nombre,tema_id`),
      ]);
      // Tema de origen → tema en el destino (por nombre; se crea si no existe).
      const temaPorNombre = Object.fromEntries(temasDestino.map((t) => [normalizarTexto(t.nombre), t.id]));
      const aCopiar = biblioteca.filter((b) => elegidas.has(b.id));
      const temasNecesarios = [...new Set(aCopiar.map((b) => b.temaId).filter(Boolean))]
        .map((id) => temas.find((t) => t.id === id))
        .filter((t) => t && !temaPorNombre[normalizarTexto(t.nombre)]);
      if (temasNecesarios.length > 0) {
        const creados = await sb("temas_biblioteca", { method: "POST", body: JSON.stringify(temasNecesarios.map((t) => ({ nombre: t.nombre, servicio_id: destinoId }))) });
        creados.forEach((t) => { temaPorNombre[normalizarTexto(t.nombre)] = t.id; });
      }
      const yaExiste = new Set(actividadesDestino.map((a) => `${normalizarTexto(a.nombre)}|${a.tema_id || ""}`));
      const filas = [];
      let omitidas = 0;
      aCopiar.forEach((b) => {
        const temaOrigen = temas.find((t) => t.id === b.temaId);
        const temaDestino = temaOrigen ? temaPorNombre[normalizarTexto(temaOrigen.nombre)] : null;
        if (yaExiste.has(`${normalizarTexto(b.nombre)}|${temaDestino || ""}`)) { omitidas++; return; }
        filas.push({ nombre: b.nombre, tipo: b.tipo, metodologia: b.metodologia || null, objetivos: b.objetivos || null, tema_id: temaDestino, servicio_id: destinoId });
      });
      if (filas.length > 0) {
        await sb("biblioteca_actividades", { method: "POST", prefer: "return=minimal", body: JSON.stringify(filas) });
      }
      setResultado({ copiadas: filas.length, omitidas, destino: destino.nombre, temasCreados: temasNecesarios.length });
      showToast(`${filas.length} ${filas.length === 1 ? "actividad copiada" : "actividades copiadas"} a ${destino.nombre}`);
    } catch (err) {
      showToast(`No se pudo copiar: ${err.message}`, "warn");
    } finally {
      setCopiando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={onClose}>
      <div className="ev-card ev-sheet ev-fade-in w-full sm:max-w-lg max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b" style={{ borderColor: T.border }}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="ev-display font-semibold text-[17px]">Copiar a otro servicio</h3>
            <button onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
          </div>
          <p className="text-[12.5px]" style={{ color: T.muted }}>
            Las actividades de {servicioActual?.nombre} se copian con su tema. Cada servicio queda con su propia copia: si después editas una, la otra no cambia.
          </p>
        </div>

        {resultado ? (
          <div className="px-5 sm:px-6 py-8 text-center">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: T.primarySoft }}>
              <CheckCircle2 size={20} style={{ color: T.primary }} />
            </div>
            <p className="text-[15px] font-semibold">
              {resultado.copiadas} {resultado.copiadas === 1 ? "actividad copiada" : "actividades copiadas"} a {resultado.destino}
            </p>
            <p className="text-[12.5px] mt-1" style={{ color: T.muted }}>
              {resultado.temasCreados > 0 && `Se ${resultado.temasCreados === 1 ? "creó 1 tema nuevo" : `crearon ${resultado.temasCreados} temas nuevos`}. `}
              {resultado.omitidas > 0 && `${resultado.omitidas} ya ${resultado.omitidas === 1 ? "existía" : "existían"} allá y no se ${resultado.omitidas === 1 ? "duplicó" : "duplicaron"}.`}
            </p>
            <div className="flex justify-center gap-2 mt-6">
              <button onClick={() => { setResultado(null); setElegidas(new Set()); }} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Copiar otras</button>
              <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px] text-white" style={{ background: T.primary }}>Listo</button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-5 sm:px-6 pt-4 flex flex-col gap-3">
              <Field label="Copiar a">
                <select value={destinoId} onChange={(e) => setDestinoId(e.target.value)} style={inputStyle}>
                  {destinos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </Field>
              {destinos.find((d) => d.id === destinoId)?.modulos?.biblioteca === false && (
                <p className="text-[12px] rounded-lg px-3 py-2" style={{ background: T.accentSoft, color: T.accentInk }}>
                  Ese servicio tiene la Biblioteca apagada: las actividades se copian, pero no se verán hasta que la actives en el Panel.
                </p>
              )}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.muted }} />
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar actividad o tema" style={{ ...inputStyle, paddingLeft: 32 }} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto ev-scroll px-5 sm:px-6 py-3 mt-1">
              {grupos.map((g) => {
                const todas = g.items.every((b) => elegidas.has(b.id));
                const algunas = !todas && g.items.some((b) => elegidas.has(b.id));
                return (
                  <div key={g.id || "sin"} className="mb-3">
                    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                      <input type="checkbox" checked={todas} ref={(el) => { if (el) el.indeterminate = algunas; }} onChange={() => alternarGrupo(g)} className="w-4 h-4" />
                      <span className="text-[13.5px] font-semibold" style={{ color: g.id ? T.ink : T.muted }}>{g.nombre}</span>
                      <span className="text-[12px]" style={{ color: T.muted }}>{g.items.length}</span>
                    </label>
                    <div className="flex flex-col pl-6">
                      {g.items.map((b) => {
                        const tipo = ACTIVITY_TYPES[b.tipo] || ACTIVITY_TYPES.terapeutico;
                        const TipoIcon = tipo.icon;
                        return (
                          <label key={b.id} className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                            <input type="checkbox" checked={elegidas.has(b.id)} onChange={() => alternar(b.id)} className="w-4 h-4" />
                            <TipoIcon size={13} className="shrink-0" style={{ color: tipo.color }} />
                            <span className="text-[13px] truncate">{b.nombre}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {grupos.length === 0 && <p className="text-[12.5px] text-center py-6" style={{ color: T.muted }}>Nada coincide con "{busqueda}".</p>}
            </div>

            <div className="flex items-center justify-between gap-2 px-5 sm:px-6 py-4 border-t" style={{ borderColor: T.border }}>
              <span className="text-[12.5px]" style={{ color: T.muted }}>{elegidas.size} {elegidas.size === 1 ? "seleccionada" : "seleccionadas"}</span>
              <div className="flex gap-2">
                <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
                <button onClick={copiar} disabled={copiando || elegidas.size === 0 || !destinoId} className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40" style={{ background: T.primary }}>
                  {copiando ? "Copiando…" : `Copiar ${elegidas.size || ""} a ${destinos.find((d) => d.id === destinoId)?.nombre || ""}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Vista de lectura de una actividad de la biblioteca: disponible para cualquier
// usuario (Maestro o Lector). Solo el Maestro ve los botones de editar/eliminar/programar.
function LecturaActividadModal({ ctx, item, tema, anterior, siguiente, onNavegar, onClose, onEditar, onEliminar, onCopiar }) {
  const { isMaestro, setModal } = ctx;
  const tipo = ACTIVITY_TYPES[item.tipo] || ACTIVITY_TYPES.terapeutico;
  const TipoIcon = tipo.icon;

  React.useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && siguiente) onNavegar(siguiente);
      if (e.key === "ArrowLeft" && anterior) onNavegar(anterior);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [anterior, siguiente]);

  function programar() {
    onClose();
    setModal({ mode: "new", event: { title: item.nombre, type: item.tipo, metodologia: item.metodologia, objetivos: item.objetivos } });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={onClose}>
      <div
        className="ev-card ev-sheet ev-fade-in w-full sm:max-w-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 sm:px-8 pt-5 pb-3">
          <p className="text-[12px] truncate" style={{ color: T.muted }}>
            Biblioteca <span className="mx-1">›</span> <span style={{ color: T.primaryDark }}>{tema?.nombre || "Sin tema"}</span>
          </p>
          <button onClick={onClose} aria-label="Cerrar" className="p-1 rounded-md shrink-0"><X size={18} /></button>
        </div>

        <div className="px-5 sm:px-8 pb-6 overflow-y-auto ev-scroll">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold" style={{ background: `color-mix(in srgb, ${tipo.color} 10%, ${T.surface})`, color: tipo.color }}>
            <TipoIcon size={13} /> {tipo.label}
          </span>
          <h2 className="ev-display text-[22px] sm:text-[24px] font-bold leading-tight mt-3">{item.nombre}</h2>

          <section className="mt-6">
            <h4 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: T.muted }}>Objetivos</h4>
            {item.objetivos
              ? <p className="text-[15px] leading-relaxed whitespace-pre-line" style={{ color: T.ink }}>{item.objetivos}</p>
              : <p className="text-[13.5px] italic" style={{ color: T.muted }}>Sin objetivos registrados.</p>}
          </section>

          <section className="mt-6 pt-6 border-t" style={{ borderColor: T.border }}>
            <h4 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: T.muted }}>Metodología</h4>
            {item.metodologia
              ? <p className="text-[15px] leading-relaxed whitespace-pre-line" style={{ color: T.ink }}>{item.metodologia}</p>
              : <p className="text-[13.5px] italic" style={{ color: T.muted }}>Sin metodología registrada.</p>}
          </section>

          {isMaestro && (
            <div className="flex gap-2 flex-wrap mt-7">
              <button onClick={programar} className="ev-btn px-3.5 py-2 text-[12.5px] text-white" style={{ background: T.primary }}>
                <CalendarDays size={14} /> Programar en el calendario
              </button>
              <button onClick={onEditar} className="ev-btn px-3.5 py-2 text-[12.5px]" style={{ border: `1px solid ${T.border}` }}>
                <Pencil size={13} /> Editar
              </button>
              {onCopiar && (
                <button onClick={onCopiar} className="ev-btn px-3.5 py-2 text-[12.5px]" style={{ border: `1px solid ${T.border}` }}>
                  <Copy size={13} /> Copiar a otro servicio
                </button>
              )}
              <button onClick={onEliminar} className="ev-btn px-3.5 py-2 text-[12.5px]" style={{ background: T.dangerSoft, color: T.danger }}>
                <Trash2 size={13} /> Eliminar
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-3 border-t" style={{ borderColor: T.border }}>
          <button onClick={() => anterior && onNavegar(anterior)} disabled={!anterior} className="ev-btn px-2.5 py-1.5 text-[12.5px] min-w-0 disabled:opacity-30" style={{ color: T.muted }}>
            <ChevronLeft size={15} className="shrink-0" /> <span className="truncate max-w-[130px] sm:max-w-[200px]">{anterior ? anterior.nombre : "Anterior"}</span>
          </button>
          <button onClick={() => siguiente && onNavegar(siguiente)} disabled={!siguiente} className="ev-btn px-2.5 py-1.5 text-[12.5px] min-w-0 disabled:opacity-30" style={{ color: T.muted }}>
            <span className="truncate max-w-[130px] sm:max-w-[200px]">{siguiente ? siguiente.nombre : "Siguiente"}</span> <ChevronRight size={15} className="shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PlantillasSemanales({ ctx }) {
  const { plantillas, plantillaItems, isMaestro, setPlantillaModal, eliminarPlantilla, setPlantillaEditorId, plantillaEditorId, setAplicarPlantillaModal } = ctx;

  if (plantillaEditorId) {
    const plantilla = plantillas.find((p) => p.id === plantillaEditorId);
    if (plantilla) return <PlantillaSemanalEditor ctx={ctx} plantilla={plantilla} />;
    setPlantillaEditorId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="ev-display font-semibold text-[16px]">Plantillas semanales</h3>
          <p className="text-[12.5px]" style={{ color: T.muted }}>Arma una semana tipo con las actividades que se repiten, y úsala como base cada vez que programes — solo cambias quién queda a cargo.</p>
        </div>
        {isMaestro && (
          <button onClick={() => setPlantillaModal(true)} className="ev-btn px-3.5 py-2 text-[12.5px] text-white shrink-0" style={{ background: T.primary }}>
            <Plus size={14} /> Nueva plantilla semanal
          </button>
        )}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plantillas.map((p) => {
          const itemCount = plantillaItems.filter((it) => it.plantillaId === p.id).length;
          return (
            <div key={p.id} className="ev-card p-4 flex flex-col gap-2">
              <h4 className="font-semibold text-[14px]">{p.nombre}</h4>
              <p className="text-[12px]" style={{ color: T.muted }}>{itemCount} actividad(es) configurada(s)</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                <button onClick={() => setPlantillaEditorId(p.id)} className="ev-btn text-[12px] px-2.5 py-1" style={{ border: `1px solid ${T.border}` }}>
                  <Pencil size={12} /> {isMaestro ? "Editar" : "Ver"}
                </button>
                {isMaestro && (
                  <>
                    <button onClick={() => setAplicarPlantillaModal({ plantillaId: p.id })} disabled={itemCount === 0} className="ev-btn text-[12px] px-2.5 py-1 text-white disabled:opacity-40" style={{ background: T.primary }}>
                      <CalendarDays size={12} /> Aplicar a una semana
                    </button>
                    <button onClick={() => eliminarPlantilla(p.id)} className="ev-btn text-[12px] px-2.5 py-1" style={{ background: T.dangerSoft, color: T.danger }}>
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {plantillas.length === 0 && (
          <p className="text-[12.5px] col-span-full text-center py-8" style={{ color: T.muted }}>Todavía no hay plantillas semanales.</p>
        )}
      </div>
    </div>
  );
}

function PlantillaSemanalEditor({ ctx, plantilla }) {
  const { plantillaItems, isMaestro, setPlantillaEditorId, agregarPlantillaItem, eliminarPlantillaItem, biblioteca, showToast } = ctx;
  const [formAbierto, setFormAbierto] = useState(null); // diaSemana del día donde se está agregando
  const [duplicando, setDuplicando] = useState(null); // diaSemana que se está duplicando, para deshabilitar el botón mientras corre
  const items = plantillaItems.filter((it) => it.plantillaId === plantilla.id);

  async function duplicarDiaAnterior(diaIdx) {
    const itemsAnterior = items.filter((it) => it.diaSemana === diaIdx - 1);
    if (itemsAnterior.length === 0) return;
    setDuplicando(diaIdx);
    try {
      for (const it of itemsAnterior) {
        await agregarPlantillaItem({
          plantillaId: plantilla.id, diaSemana: diaIdx, nombre: it.nombre, tipo: it.tipo,
          horaInicio: it.horaInicio, horaFin: it.horaFin, responsableId: it.responsableId,
          metodologia: it.metodologia, objetivos: it.objetivos,
        });
      }
      showToast(`${itemsAnterior.length} actividad(es) copiada(s) de ${DIA_LABEL_LARGO[diaIdx - 1]}`);
    } finally {
      setDuplicando(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => setPlantillaEditorId(null)} className="ev-btn self-start px-3 py-1.5 text-[12.5px]" style={{ border: `1px solid ${T.border}` }}>
        <ChevronLeft size={14} /> Volver a plantillas semanales
      </button>
      <h3 className="ev-display font-semibold text-[16px]">{plantilla.nombre}</h3>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {DIA_LABEL_LARGO.map((diaNombre, diaIdx) => {
          const itemsDia = items.filter((it) => it.diaSemana === diaIdx).sort((a, b) => a.horaInicio - b.horaInicio);
          const itemsDiaAnterior = diaIdx > 0 ? items.filter((it) => it.diaSemana === diaIdx - 1) : [];
          return (
            <div key={diaIdx} className="ev-card p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="ev-display font-semibold text-[13px] capitalize">{diaNombre}</p>
                {isMaestro && diaIdx > 0 && itemsDiaAnterior.length > 0 && (
                  <button
                    onClick={() => duplicarDiaAnterior(diaIdx)}
                    disabled={duplicando === diaIdx}
                    title={`Copiar las actividades de ${DIA_LABEL_LARGO[diaIdx - 1]}`}
                    className="ev-btn text-[10.5px] px-1.5 py-1 shrink-0 disabled:opacity-50"
                    style={{ border: `1px solid ${T.border}`, color: T.muted }}
                  >
                    <Copy size={11} /> {duplicando === diaIdx ? "Copiando…" : "Duplicar anterior"}
                  </button>
                )}
              </div>
              {itemsDia.map((it) => (
                <div key={it.id} className="rounded-lg px-2.5 py-2" style={{ background: `color-mix(in srgb, ${ACTIVITY_TYPES[it.tipo].color} 8%, ${T.surface})`, borderLeft: `3px solid ${ACTIVITY_TYPES[it.tipo].color}` }}>
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-[12.5px] font-semibold">{it.nombre}</p>
                    {isMaestro && (
                      <button onClick={() => eliminarPlantillaItem(it.id)} className="shrink-0" style={{ color: T.danger }}><X size={13} /></button>
                    )}
                  </div>
                  <p className="ev-mono text-[11px]" style={{ color: T.muted }}>{fmtRange(it.horaInicio, it.horaFin)}</p>
                </div>
              ))}
              {itemsDia.length === 0 && <p className="text-[11.5px]" style={{ color: T.muted }}>Sin actividades</p>}
              {isMaestro && (
                formAbierto === diaIdx ? (
                  <PlantillaItemForm
                    ctx={ctx}
                    plantillaId={plantilla.id}
                    diaSemana={diaIdx}
                    biblioteca={biblioteca}
                    onClose={() => setFormAbierto(null)}
                  />
                ) : (
                  <button onClick={() => setFormAbierto(diaIdx)} className="text-[11.5px] font-semibold text-left mt-1" style={{ color: T.primary }}>
                    <Plus size={11} className="inline -mt-0.5" /> Agregar actividad
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlantillaItemForm({ ctx, plantillaId, diaSemana, biblioteca, onClose }) {
  const { agregarPlantillaItem, saving, temas } = ctx;
  const [form, setForm] = useState({ nombre: "", tipo: ACTIVIDAD_TYPES[0], horaInicio: 8, horaFin: 9, metodologia: "", objetivos: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function usarBiblioteca(id) {
    const item = biblioteca.find((b) => b.id === id);
    if (!item) return;
    setForm((f) => ({ ...f, nombre: item.nombre, tipo: item.tipo, metodologia: item.metodologia, objetivos: item.objetivos }));
  }

  return (
    <div className="rounded-lg p-2 flex flex-col gap-2 mt-1" style={{ border: `1px solid ${T.border}` }}>
      {biblioteca.length > 0 && (
        <select onChange={(e) => e.target.value && usarBiblioteca(e.target.value)} defaultValue="" style={{ ...inputStyle, fontSize: 12 }}>
          <option value="">— De la biblioteca —</option>
          {temas.map((tema) => {
            const items = biblioteca.filter((b) => b.temaId === tema.id);
            if (items.length === 0) return null;
            return (
              <optgroup key={tema.id} label={tema.nombre}>
                {items.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </optgroup>
            );
          })}
          {biblioteca.some((b) => !b.temaId) && (
            <optgroup label="Sin tema">
              {biblioteca.filter((b) => !b.temaId).map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </optgroup>
          )}
        </select>
      )}
      <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Nombre de la actividad" style={{ ...inputStyle, fontSize: 12 }} />
      <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} style={{ ...inputStyle, fontSize: 12 }}>
        {ACTIVIDAD_TYPES.map((k) => <option key={k} value={k}>{ACTIVITY_TYPES[k].label}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-1.5">
        <input type="time" step={300} value={horaATimeValue(form.horaInicio)} onChange={(e) => e.target.value && set("horaInicio", timeValueAHora(e.target.value))} style={{ ...inputStyle, fontSize: 12 }} />
        <input type="time" step={300} value={horaATimeValue(form.horaFin)} onChange={(e) => e.target.value && set("horaFin", timeValueAHora(e.target.value))} style={{ ...inputStyle, fontSize: 12 }} />
      </div>
      <div className="flex justify-end gap-1.5">
        <button onClick={onClose} className="ev-btn text-[11.5px] px-2.5 py-1" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
        <button
          onClick={() => agregarPlantillaItem({ ...form, plantillaId, diaSemana }).then(onClose)}
          disabled={!form.nombre || saving}
          className="ev-btn text-[11.5px] px-2.5 py-1 text-white disabled:opacity-40"
          style={{ background: T.primary }}
        >
          Agregar
        </button>
      </div>
    </div>
  );
}

const TIPO_FORMACION = { infografia: "Infografía", mapa_mental: "Mapa mental", video: "Video", pdf: "Artículo/Libro (PDF)", otro: "Otro" };

function FormacionContinua({ ctx }) {
  const { formacion, isMaestro, setFormacionModal, eliminarFormacion, session, vistos, preguntas, resultados, marcarVisto, setTestModal, setGestionarTestModal, setParticipacionModal } = ctx;
  const [busqueda, setBusqueda] = useState("");
  const [imagenAmpliada, setImagenAmpliada] = useState(null); // {url, titulo}
  const term = normalizarTexto(busqueda);
  const formacionFiltrada = formacion.filter((f) => !term || normalizarTexto(f.titulo).includes(term) || normalizarTexto(f.descripcion).includes(term));
  return (
    <div className="flex flex-col gap-4">
      <ReadOnlyBanner isMaestro={isMaestro} />
      <div className="flex items-center justify-between">
        <div>
          <h3 className="ev-display font-semibold text-[16px]">Formación continua</h3>
          <p className="text-[12.5px]" style={{ color: T.muted }}>Infografías, mapas mentales, artículos/libros en PDF y videos cortos sobre temas específicos, para todo el equipo.</p>
        </div>
        {isMaestro && (
          <button onClick={() => setFormacionModal(true)} className="ev-btn px-3.5 py-2 text-[12.5px] text-white shrink-0" style={{ background: T.primary }}>
            <Plus size={14} /> Subir contenido
          </button>
        )}
      </div>
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.muted }} />
        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por título o descripción…" style={{ ...inputStyle, paddingLeft: 32 }} />
      </div>
      {formacionFiltrada.length === 0 && term && (
        <p className="text-[12.5px] text-center py-8" style={{ color: T.muted }}>Nada coincide con "{busqueda}".</p>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {formacionFiltrada.map((f) => {
          const miVisto = vistos.find((v) => v.formacionId === f.id && v.usuarioId === session?.id);
          const susPreguntas = preguntas.filter((p) => p.formacionId === f.id);
          const miResultado = resultados.find((r) => r.formacionId === f.id && r.usuarioId === session?.id);
          const totalVistos = vistos.filter((v) => v.formacionId === f.id).length;
          const totalTests = resultados.filter((r) => r.formacionId === f.id).length;
          const esImagen = f.tipo === "infografia" || f.tipo === "mapa_mental" || f.tipo === "otro";
          return (
            <div key={f.id} className="ev-card overflow-hidden flex flex-col">
              <div className="w-full flex items-center justify-center overflow-hidden" style={{ height: 150, background: T.base }}>
                {f.tipo === "video" ? (
                  <video src={f.archivoUrl} controls className="w-full h-full object-cover" />
                ) : f.tipo === "pdf" ? (
                  <a href={f.archivoUrl} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center gap-1.5 hover:opacity-80" style={{ color: T.primaryDark }}>
                    <FileText size={36} />
                    <span className="text-[11px] font-semibold">Abrir PDF</span>
                  </a>
                ) : (
                  <button
                    onClick={() => setImagenAmpliada({ url: f.archivoUrl, titulo: f.titulo })}
                    className="w-full h-full relative group"
                    title="Ver en grande"
                  >
                    <img src={f.archivoUrl} alt={f.titulo} className="w-full h-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                      <Search size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                  </button>
                )}
              </div>
              <div className="p-3.5 flex flex-col gap-1.5 flex-1">
                <span className="self-start px-2 py-0.5 rounded-full text-[10.5px] font-semibold" style={{ background: T.primarySoft, color: T.primaryDark }}>
                  {TIPO_FORMACION[f.tipo] || f.tipo}
                </span>
                <h4 className="font-semibold text-[13.5px]">{f.titulo}</h4>
                {f.descripcion && <p className="text-[12px] line-clamp-3" style={{ color: T.muted }}>{f.descripcion}</p>}
                {esImagen && (
                  <button onClick={() => setImagenAmpliada({ url: f.archivoUrl, titulo: f.titulo })} className="text-[11.5px] font-semibold text-left w-fit" style={{ color: T.primary }}>
                    Ver completa
                  </button>
                )}
                <p className="text-[10.5px]" style={{ color: T.muted }}>
                  {f.autor ? `${f.autor} · ` : ""}{new Date(f.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-1">
                  {miVisto ? (
                    <span className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium" style={{ background: T.primarySoft, color: T.primaryDark }}>
                      <CheckCircle2 size={11} /> Visto el {new Date(miVisto.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                    </span>
                  ) : (
                    <button onClick={() => marcarVisto(f.id)} className="ev-btn text-[11px] px-2 py-1" style={{ border: `1px solid ${T.border}` }}>
                      Marcar como visto
                    </button>
                  )}
                  {susPreguntas.length > 0 && (
                    miResultado ? (
                      <button onClick={() => setTestModal(f)} className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium" style={{ background: miResultado.calificacion >= 60 ? T.primarySoft : T.dangerSoft, color: miResultado.calificacion >= 60 ? T.primaryDark : T.danger }}>
                        Tu nota: {miResultado.calificacion}%
                      </button>
                    ) : (
                      <button onClick={() => setTestModal(f)} className="ev-btn text-[11px] px-2 py-1 text-white" style={{ background: T.primary }}>
                        Presentar test
                      </button>
                    )
                  )}
                </div>

                {isMaestro && (
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: T.border }}>
                    <button onClick={() => setGestionarTestModal(f)} className="ev-btn text-[11px] px-2 py-1" style={{ border: `1px solid ${T.border}` }}>
                      Gestionar test ({susPreguntas.length})
                    </button>
                    <button onClick={() => setParticipacionModal(f)} className="ev-btn text-[11px] px-2 py-1" style={{ border: `1px solid ${T.border}` }}>
                      Participación ({totalVistos} vistos · {totalTests} tests)
                    </button>
                    <button onClick={() => eliminarFormacion(f)} className="ev-btn text-[11px] px-2 py-1" style={{ background: T.dangerSoft, color: T.danger }}>
                      <Trash2 size={11} /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {formacion.length === 0 && (
          <p className="text-[12.5px] col-span-full text-center py-10" style={{ color: T.muted }}>Todavía no hay contenido publicado.</p>
        )}
      </div>
      {imagenAmpliada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setImagenAmpliada(null)}
        >
          <button
            onClick={() => setImagenAmpliada(null)}
            className="absolute top-4 right-4 text-white p-2 rounded-full hover:bg-white/10"
          >
            <X size={22} />
          </button>
          <div className="flex flex-col items-center gap-3 max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img src={imagenAmpliada.url} alt={imagenAmpliada.titulo} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
            <div className="flex items-center gap-3">
              <p className="text-white text-[13px] font-medium">{imagenAmpliada.titulo}</p>
              <a href={imagenAmpliada.url} target="_blank" rel="noopener noreferrer" className="text-[12px] underline" style={{ color: "#93C5FD" }}>
                Abrir en pestaña nueva
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EvoChat({ ctx }) {
  const { servicioActualId } = ctx;
  const [mensajes, setMensajes] = useState([]);
  const [pregunta, setPregunta] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const finRef = React.useRef(null);

  React.useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  async function enviar(e) {
    e.preventDefault();
    const texto = pregunta.trim();
    if (!texto || cargando) return;
    const historialParaEnviar = mensajes.map((m) => ({ role: m.role, text: m.text }));
    setMensajes((prev) => [...prev, { role: "user", text: texto }]);
    setPregunta("");
    setError(null);
    setCargando(true);
    try {
      const res = await fetch("/api/evo", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ACCESS_TOKEN}` },
        body: JSON.stringify({ pregunta: texto, servicioId: servicioActualId, historial: historialParaEnviar }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setMensajes((prev) => [...prev, { role: "evo", text: data.respuesta }]);
    } catch (err) {
      setError(err.message);
      setMensajes((prev) => [...prev, { role: "evo", text: `⚠️ ${err.message}` }]);
    } finally {
      setCargando(false);
    }
  }

  const sugerencias = [
    "¿Qué metodología tiene la actividad de sistema de creencias?",
    "¿Qué contenido de formación tenemos sobre factores de riesgo?",
    "Hazme una nota de actividad de sistema de creencias para historia clínica.",
  ];

  return (
    <div className="flex flex-col gap-4" style={{ height: "calc(100vh - 180px)", minHeight: 480 }}>
      <div>
        <h3 className="ev-display font-semibold text-[16px] flex items-center gap-2">
          <Bot size={18} style={{ color: T.primary }} /> Evo
        </h3>
        <p className="text-[12.5px]" style={{ color: T.muted }}>
          Tu asistente de formación y apoyo terapéutico. Responde con lo que ya existe en la Biblioteca de actividades y en Formación Continua — incluyendo el contenido de adentro de los PDF — y si algo no está ahí, te lo va a decir en vez de inventar. También te puede ayudar a armar la estructura de una nota de actividad, dejando los datos del paciente para que tú los completes.
        </p>
      </div>

      <div className="ev-card flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto ev-scroll p-4 flex flex-col gap-3">
          {mensajes.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: T.primarySoft }}>
                <Bot size={22} style={{ color: T.primaryDark }} />
              </div>
              <p className="text-[13px]" style={{ color: T.muted }}>Pregúntame sobre las actividades o el contenido de formación que ya tienen cargado. Por ejemplo:</p>
              <div className="flex flex-col gap-1.5 w-full max-w-sm">
                {sugerencias.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setPregunta(s)}
                    className="text-left text-[12px] rounded-lg px-3 py-2 hover:bg-black/[0.03]"
                    style={{ border: `1px solid ${T.border}`, color: T.ink }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {mensajes.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug whitespace-pre-wrap"
                style={m.role === "user"
                  ? { background: T.primary, color: "#fff", borderBottomRightRadius: 4 }
                  : { background: T.base, color: T.ink, border: `1px solid ${T.border}`, borderBottomLeftRadius: 4 }}
              >
                {m.text}
              </div>
            </div>
          ))}
          {cargando && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-3.5 py-2.5 text-[13px]" style={{ background: T.base, border: `1px solid ${T.border}`, color: T.muted, borderBottomLeftRadius: 4 }}>
                Evo está pensando…
              </div>
            </div>
          )}
          <div ref={finRef} />
        </div>

        <form onSubmit={enviar} className="flex items-center gap-2 p-3 border-t" style={{ borderColor: T.border }}>
          <input
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            placeholder="Escribe tu pregunta…"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="submit" disabled={!pregunta.trim() || cargando} className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40" style={{ background: T.primary }}>
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}

function FormacionModal({ ctx, onClose }) {
  const { subirFormacion, subiendoArchivo } = ctx;
  const [form, setForm] = useState({ titulo: "", descripcion: "", tipo: "infografia", alcance: "servicio" });
  const [file, setFile] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ev-card w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto ev-scroll">
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px]">Subir contenido</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3.5">
          <Field label="Título">
            <input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Ej. Manejo de crisis" style={inputStyle} />
          </Field>
          <Field label="Tipo">
            <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} style={inputStyle}>
              {Object.entries(TIPO_FORMACION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Descripción (opcional)">
            <textarea rows={3} value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="De qué trata…" style={{ ...inputStyle, resize: "vertical" }} />
          </Field>
          <CampoAlcance ctx={ctx} value={form.alcance} onChange={(v) => set("alcance", v)} />
          <Field label={form.tipo === "video" ? "Archivo de video" : form.tipo === "pdf" ? "Archivo PDF" : "Archivo de imagen"}>
            <input
              type="file"
              accept={form.tipo === "video" ? "video/*" : form.tipo === "pdf" ? "application/pdf" : "image/*"}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ ...inputStyle, padding: "6px 8px" }}
            />
          </Field>
          <p className="text-[11px]" style={{ color: T.muted }}>
            El plan gratuito tiene 1 GB de espacio en total para archivos — para videos, prefiere clips cortos (1-3 minutos) para no llenarlo rápido.
            {(form.tipo === "pdf" || form.tipo === "infografia" || form.tipo === "mapa_mental") && " Evo puede leer este archivo directamente cuando le pregunten sobre él."}
          </p>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
          <button
            onClick={() => subirFormacion(form, file)}
            disabled={!form.titulo || !file || subiendoArchivo}
            className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40"
            style={{ background: T.primary }}
          >
            {subiendoArchivo ? "Subiendo…" : "Publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TestModal({ ctx, onClose }) {
  const { testModal: formacionItem, preguntas, enviarResultado, saving } = ctx;
  const susPreguntas = preguntas.filter((p) => p.formacionId === formacionItem.id).sort((a, b) => a.orden - b.orden);
  const [respuestas, setRespuestas] = useState({}); // preguntaId -> índice elegido
  const [resultado, setResultado] = useState(null); // {correctas, total, calificacion}

  async function enviar() {
    let correctas = 0;
    susPreguntas.forEach((p) => { if (respuestas[p.id] === p.respuestaCorrecta) correctas += 1; });
    const calificacion = await enviarResultado(formacionItem.id, correctas, susPreguntas.length);
    setResultado({ correctas, total: susPreguntas.length, calificacion });
  }

  const faltan = susPreguntas.some((p) => respuestas[p.id] === undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ev-card w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto ev-scroll">
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px]">Test — {formacionItem.titulo}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        {resultado ? (
          <div className="text-center py-6">
            <p className="ev-display text-[36px] font-bold" style={{ color: resultado.calificacion >= 60 ? T.primary : T.danger }}>{resultado.calificacion}%</p>
            <p className="text-[13px] mt-1" style={{ color: T.muted }}>{resultado.correctas} de {resultado.total} correctas</p>
            <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px] text-white mt-5" style={{ background: T.primary }}>Cerrar</button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {susPreguntas.map((p, i) => (
                <div key={p.id}>
                  <p className="text-[13px] font-semibold mb-2">{i + 1}. {p.pregunta}</p>
                  <div className="flex flex-col gap-1.5">
                    {p.opciones.map((op, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-[12.5px] rounded-lg px-2.5 py-1.5" style={{ border: `1px solid ${T.border}`, background: respuestas[p.id] === idx ? T.primarySoft : "transparent" }}>
                        <input type="radio" name={`p-${p.id}`} checked={respuestas[p.id] === idx} onChange={() => setRespuestas((r) => ({ ...r, [p.id]: idx }))} />
                        {op}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
              <button onClick={enviar} disabled={faltan || saving} className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40" style={{ background: T.primary }}>
                {saving ? "Enviando…" : "Enviar test"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GestionarTestModal({ ctx, onClose }) {
  const { gestionarTestModal: formacionItem, preguntas, guardarPregunta, eliminarPregunta, saving } = ctx;
  const susPreguntas = preguntas.filter((p) => p.formacionId === formacionItem.id).sort((a, b) => a.orden - b.orden);
  const [nueva, setNueva] = useState({ pregunta: "", opciones: ["", "", "", ""], respuestaCorrecta: 0 });

  function setOpcion(i, val) {
    setNueva((f) => { const op = [...f.opciones]; op[i] = val; return { ...f, opciones: op }; });
  }
  async function agregar() {
    const opcionesLimpias = nueva.opciones.map((o) => o.trim()).filter(Boolean);
    if (!nueva.pregunta.trim() || opcionesLimpias.length < 2) return;
    await guardarPregunta({ formacionId: formacionItem.id, pregunta: nueva.pregunta, opciones: opcionesLimpias, respuestaCorrecta: nueva.respuestaCorrecta, orden: susPreguntas.length });
    setNueva({ pregunta: "", opciones: ["", "", "", ""], respuestaCorrecta: 0 });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ev-card w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto ev-scroll">
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px]">Test de "{formacionItem.titulo}"</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          {susPreguntas.map((p, i) => (
            <div key={p.id} className="rounded-lg p-2.5" style={{ border: `1px solid ${T.border}` }}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12.5px] font-medium">{i + 1}. {p.pregunta}</p>
                <button onClick={() => eliminarPregunta(p.id)} style={{ color: T.danger }}><Trash2 size={13} /></button>
              </div>
              <div className="mt-1 flex flex-col gap-0.5">
                {p.opciones.map((op, idx) => (
                  <p key={idx} className="text-[11.5px]" style={{ color: idx === p.respuestaCorrecta ? T.primaryDark : T.muted, fontWeight: idx === p.respuestaCorrecta ? 600 : 400 }}>
                    {idx === p.respuestaCorrecta ? "✓ " : "— "}{op}
                  </p>
                ))}
              </div>
            </div>
          ))}
          {susPreguntas.length === 0 && <p className="text-[12.5px] text-center py-3" style={{ color: T.muted }}>Este contenido todavía no tiene preguntas.</p>}
        </div>

        <div className="rounded-lg p-3 flex flex-col gap-2" style={{ border: `1px solid ${T.border}`, background: T.base }}>
          <p className="text-[12.5px] font-semibold">Nueva pregunta</p>
          <input value={nueva.pregunta} onChange={(e) => setNueva((f) => ({ ...f, pregunta: e.target.value }))} placeholder="Escribe la pregunta…" style={inputStyle} />
          {nueva.opciones.map((op, i) => (
            <label key={i} className="flex items-center gap-2">
              <input type="radio" checked={nueva.respuestaCorrecta === i} onChange={() => setNueva((f) => ({ ...f, respuestaCorrecta: i }))} />
              <input value={op} onChange={(e) => setOpcion(i, e.target.value)} placeholder={`Opción ${i + 1}${i < 2 ? "" : " (opcional)"}`} style={inputStyle} />
            </label>
          ))}
          <p className="text-[11px]" style={{ color: T.muted }}>Marca con el círculo cuál opción es la correcta.</p>
          <button onClick={agregar} disabled={saving} className="ev-btn px-3.5 py-2 text-[12.5px] text-white self-start disabled:opacity-40" style={{ background: T.primary }}>
            <Plus size={13} /> Agregar pregunta
          </button>
        </div>

        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function ParticipacionModal({ ctx, onClose }) {
  const { participacionModal: formacionItem, vistos, resultados, usuariosLista } = ctx;
  const susVistos = vistos.filter((v) => v.formacionId === formacionItem.id);
  const susResultados = resultados.filter((r) => r.formacionId === formacionItem.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ev-card w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto ev-scroll">
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px]">Participación — {formacionItem.titulo}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-left" style={{ color: T.muted }}>
              {["Correo", "Visto", "Test", "Calificación"].map((h) => (
                <th key={h} className="py-2 font-medium text-[11px] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuariosLista.map((u) => {
              const visto = susVistos.find((v) => v.usuarioId === u.id);
              const resultado = susResultados.find((r) => r.usuarioId === u.id);
              return (
                <tr key={u.id} className="border-t" style={{ borderColor: T.border }}>
                  <td className="py-2">{u.correo}</td>
                  <td className="py-2">{visto ? new Date(visto.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" }) : <span style={{ color: T.muted }}>—</span>}</td>
                  <td className="py-2">{resultado ? "Sí" : <span style={{ color: T.muted }}>—</span>}</td>
                  <td className="py-2 ev-mono" style={{ color: resultado ? (resultado.calificacion >= 60 ? T.primaryDark : T.danger) : T.muted }}>
                    {resultado ? `${resultado.calificacion}%` : "—"}
                  </td>
                </tr>
              );
            })}
            {usuariosLista.length === 0 && (
              <tr><td colSpan={4} className="py-5 text-center" style={{ color: T.muted }}>No hay usuarios para mostrar.</td></tr>
            )}
          </tbody>
        </table>
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function TemaModal({ ctx, onClose }) {
  const { crearTema, saving } = ctx;
  const [nombre, setNombre] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ev-card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px]">Nuevo tema</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <Field label="Nombre del tema">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Factores de riesgo" style={inputStyle} />
        </Field>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
          <button onClick={() => crearTema(nombre)} disabled={!nombre || saving} className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40" style={{ background: T.primary }}>
            {saving ? "Creando…" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NuevaPlantillaModal({ ctx, onClose }) {
  const { crearPlantilla, saving } = ctx;
  const [nombre, setNombre] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ev-card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px]">Nueva plantilla semanal</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <Field label="Nombre">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Plantilla Uno" style={inputStyle} />
        </Field>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
          <button onClick={() => crearPlantilla(nombre)} disabled={!nombre || saving} className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40" style={{ background: T.primary }}>
            {saving ? "Creando…" : "Crear y editar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AplicarPlantillaModal({ ctx, onClose }) {
  const { aplicarPlantillaModal, aplicarPlantilla, plantillaItems, saving } = ctx;
  const items = plantillaItems.filter((it) => it.plantillaId === aplicarPlantillaModal.plantillaId);
  const [semanaISO, setSemanaISO] = useState(toISO(getMonday(TODAY)));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ev-card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px]">Aplicar plantilla a una semana</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <Field label="Semana de inicio (lunes)">
          <input type="date" value={semanaISO} onChange={(e) => setSemanaISO(toISO(getMonday(new Date(`${e.target.value}T00:00:00`))))} style={inputStyle} />
        </Field>
        <p className="text-[12px] mt-3" style={{ color: T.muted }}>
          Esto va a crear <strong style={{ color: T.ink }}>{items.length}</strong> actividad(es) nueva(s) para esa semana, todas sin responsable asignado — las editas después para poner quién queda a cargo.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
          <button
            onClick={() => aplicarPlantilla(aplicarPlantillaModal.plantillaId, semanaISO)}
            disabled={saving || items.length === 0}
            className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40"
            style={{ background: T.primary }}
          >
            {saving ? "Aplicando…" : "Aplicar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BibliotecaModal({ ctx, onClose, initial }) {
  const { saveBiblioteca, saving, temas } = ctx;
  const base = initial.item || {};
  const [form, setForm] = useState({
    id: base.id || nid(),
    nombre: base.nombre || "",
    tipo: base.tipo || ACTIVIDAD_TYPES[0],
    metodologia: base.metodologia || "",
    objetivos: base.objetivos || "",
    temaId: base.temaId || "",
  });
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ev-card w-full max-w-md p-5 max-h-[90vh] overflow-y-auto ev-scroll">
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px]">{initial.mode === "edit" ? "Editar plantilla" : "Nueva plantilla"}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3.5">
          <Field label="Nombre de la actividad">
            <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej. Grupo Terapéutico" style={inputStyle} />
          </Field>
          <Field label="Tema (opcional)">
            <select value={form.temaId} onChange={(e) => set("temaId", e.target.value)} style={inputStyle}>
              <option value="">— Sin tema —</option>
              {temas.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </Field>
          <Field label="Tipo">
            <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} style={inputStyle}>
              {ACTIVIDAD_TYPES.map((k) => <option key={k} value={k}>{ACTIVITY_TYPES[k].label}</option>)}
            </select>
          </Field>
          <Field label="Metodología">
            <textarea rows={4} value={form.metodologia} onChange={(e) => set("metodologia", e.target.value)} placeholder="Cómo se desarrolla la actividad…" style={{ ...inputStyle, resize: "vertical" }} />
          </Field>
          <Field label="Objetivos">
            <textarea rows={3} value={form.objetivos} onChange={(e) => set("objetivos", e.target.value)} placeholder="Qué se busca lograr…" style={{ ...inputStyle, resize: "vertical" }} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
          <button
            onClick={() => saveBiblioteca(form)}
            disabled={!form.nombre || saving}
            className="ev-btn px-4 py-2 text-[13px] text-white disabled:opacity-40"
            style={{ background: T.primary }}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
