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

/* ============================== TOKENS ============================== */
const T = {
  ink: "#12211E",
  base: "#F5F7F5",
  surface: "#FFFFFF",
  primary: "#1F6F5C",
  primaryDark: "#144B3F",
  primarySoft: "#E4EFEC",
  accent: "#E8A33D",
  accentSoft: "#FBF0DE",
  border: "#DFE5E2",
  muted: "#5C6B67",
  danger: "#C1553B",
  dangerSoft: "#FBEAE4",
};

const ACTIVITY_TYPES = {
  terapeutico: { label: "Grupo Terapéutico", color: "#1F6F5C" },
  turno_dia: { label: "Turno Día", color: "#3B6FA0" },
  turno_noche: { label: "Turno Noche", color: "#4A3F73" },
  administrativo: { label: "Administrativo", color: "#E8A33D" },
  capacitacion: { label: "Capacitación", color: "#C1553B" },
  reunion: { label: "Reunión", color: "#6B7280" },
};

/* ============================== SUPABASE ============================== */
// Llave "publishable" (equivalente a anon/public) — segura para el frontend.
// Con las políticas de security_update.sql, esta llave sola ya NO alcanza
// para leer ni escribir: cada request usa además el token de la persona
// que inició sesión (ver ACCESS_TOKEN más abajo).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zvyuqbrvixpnggynrqfa.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || "sb_publishable_G53F0OOT0-BzQlnXmen2XA_uZ1Yn9A9";
let ACCESS_TOKEN = null; // token de sesión de Supabase Auth; null = sin iniciar sesión

async function sb(path, options = {}) {
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


function mapActividad(row) {
  return { id: row.id, table: "actividades", date: row.fecha, title: row.nombre, type: row.tipo, start: Number(row.hora_inicio), end: Number(row.hora_fin), personalId: row.responsable_id };
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
  return { id: row.id, nombre: row.nombre, cargo: row.cargo, area: row.area, horas: Number(row.horas_semana), estado: row.estado };
}

async function fetchAllRemote() {
  const [personalRows, actRows, turnRows] = await Promise.all([
    sb("personal?select=*&order=nombre"),
    sb("actividades?select=*"),
    sb("turnos?select=*"),
  ]);
  return {
    personal: personalRows.map(mapPersonal),
    events: [...actRows.map(mapActividad), ...turnRows.map(mapTurno)],
  };
}
async function fetchEventsRemote() {
  const [actRows, turnRows] = await Promise.all([sb("actividades?select=*"), sb("turnos?select=*")]);
  return [...actRows.map(mapActividad), ...turnRows.map(mapTurno)];
}
function eventPayload(form) {
  const isTurno = form.type === "turno_dia" || form.type === "turno_noche";
  return isTurno
    ? { fecha: form.date, tipo_turno: form.type === "turno_dia" ? "dia" : "noche", hora_inicio: form.start, hora_fin: form.end, personal_id: form.personalId || null }
    : { nombre: form.title, tipo: form.type, fecha: form.date, hora_inicio: form.start, hora_fin: form.end, responsable_id: form.personalId || null };
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

/* ============================== DATA ============================== */
const TODAY = new Date(2026, 6, 28); // martes 28 jul 2026
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
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "calendario", label: "Calendario", icon: CalendarDays },
  { key: "personal", label: "Personal", icon: Users },
  { key: "turnos", label: "Turnos", icon: Clock },
  { key: "reportes", label: "Reportes", icon: FileBarChart },
  { key: "configuracion", label: "Configuración", icon: Settings },
];

/* ============================== HELPERS ============================== */
const DIA_LABEL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
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
function personName(id) {
  return PERSONAL_STATE.find((p) => p.id === id)?.nombre || "Sin asignar";
}
function personById(id) {
  return PERSONAL_STATE.find((p) => p.id === id);
}
function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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
  const [session, setSession] = useState(null); // { email }
  const [view, setView] = useState("dashboard");
  const [events, setEvents] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [calMode, setCalMode] = useState("semana");
  const [monthOffset, setMonthOffset] = useState(0);
  const [modal, setModal] = useState(null); // {mode:'new'|'edit', event}
  const [detail, setDetail] = useState(null); // event being viewed
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, showToast] = useToast();

  React.useEffect(() => {
    PERSONAL_STATE = personal;
  }, [personal]);

  async function loadAll() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchAllRemote();
      setPersonal(data.personal);
      setEvents(data.events);
    } catch (err) {
      setLoadError(err.message || "No se pudo conectar a Supabase.");
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => { if (session) loadAll(); }, [session]);

  function handleLogout() {
    ACCESS_TOKEN = null;
    setSession(null);
    setEvents([]);
    setPersonal([]);
    setLoadError(null);
  }

  if (!session) {
    return <LoginScreen onLogin={(s) => setSession(s)} />;
  }

  const weekStart = addDays(monday, weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  async function saveEvent(form) {
    setSaving(true);
    try {
      if (modal?.mode === "edit") await updateEventRemote(form);
      else await insertEventRemote(form);
      setEvents(await fetchEventsRemote());
      setModal(null);
      showToast(modal?.mode === "edit" ? "Actividad actualizada en Supabase" : "Actividad guardada en Supabase");
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
      showToast("Actividad eliminada de Supabase", "warn");
    } catch (err) {
      showToast(`No se pudo eliminar: ${err.message}`, "warn");
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

  const ctx = {
    events, setEvents, personal, setPersonal, weekStart, weekDays, weekOffset, setWeekOffset,
    calMode, setCalMode, monthOffset, setMonthOffset, setModal, detail, setDetail, deleteEvent,
    toggleEstado, showToast, setView, saving,
  };

  if (loading) {
    return (
      <div style={{ background: T.base, color: T.muted }} className="w-full min-h-[720px] flex items-center justify-center text-[13.5px]">
        Conectando con Supabase…
      </div>
    );
  }
  if (loadError) {
    return (
      <div style={{ background: T.base }} className="w-full min-h-[720px] flex items-center justify-center p-6">
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

  return (
    <div
      style={{ background: T.base, color: T.ink, fontFamily: "'Inter', sans-serif" }}
      className="w-full min-h-[720px] flex text-[14px]"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .ev-mono { font-family:'JetBrains Mono', monospace; }
        .ev-display { font-family:'Space Grotesk', sans-serif; }
        .ev-scroll::-webkit-scrollbar{ width:8px; height:8px; }
        .ev-scroll::-webkit-scrollbar-thumb{ background:${T.border}; border-radius:8px; }
        .ev-card{ background:${T.surface}; border:1px solid ${T.border}; border-radius:14px; }
        .ev-btn{ display:inline-flex; align-items:center; gap:6px; border-radius:9px; font-weight:600; transition:all .15s ease; cursor:pointer; }
        .ev-nav-item:hover{ background:${T.primarySoft}; }
        @media print {
          .no-print{ display:none !important; }
          .print-area{ box-shadow:none !important; border:none !important; }
        }
      `}</style>

      {/* Sidebar */}
      <aside
        className={`no-print flex-col justify-between border-r ${sidebarOpen ? "flex fixed inset-y-0 left-0 z-40 w-64" : "hidden"} lg:flex lg:static lg:w-60`}
        style={{ background: T.primaryDark, borderColor: T.border }}
      >
        <div>
          <div className="px-5 pt-6 pb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: T.accent }}>
                <Sparkles size={16} color={T.primaryDark} />
              </div>
              <span className="ev-display text-white text-[19px] tracking-tight font-semibold">EVOLUCIONA</span>
            </div>
            <p className="text-[11px] mt-1 leading-snug" style={{ color: "#BFE0D6" }}>
              Sistema inteligente de planificación de actividades y turnos
            </p>
          </div>
          <nav className="px-3 flex flex-col gap-1">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = view === n.key;
              return (
                <button
                  key={n.key}
                  onClick={() => { setView(n.key); setSidebarOpen(false); }}
                  className="ev-nav-item text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-[13.5px] font-medium"
                  style={{
                    background: active ? "rgba(255,255,255,0.12)" : "transparent",
                    color: active ? "#FFFFFF" : "#CFE3DC",
                  }}
                >
                  <Icon size={16} />
                  {n.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="px-4 pb-5 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
          <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.08)" }}>
            <p className="text-[11px] font-semibold text-white">V1.0 · MVP</p>
            <p className="text-[10.5px] mt-1" style={{ color: "#BFE0D6" }}>
              V2 traerá asignación automática de turnos. V3, IA integrada.
            </p>
          </div>
        </div>
      </aside>
      {sidebarOpen && (
        <div className="no-print fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="no-print flex items-center justify-between px-5 lg:px-8 py-4 border-b"
          style={{ background: T.surface, borderColor: T.border }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden ev-btn p-2 rounded-lg" style={{ border: `1px solid ${T.border}` }} onClick={() => setSidebarOpen(true)}>
              <CalendarDays size={16} />
            </button>
            <h1 className="ev-display text-[20px] font-semibold capitalize truncate">{view}</h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 pl-3 pr-1 py-1 rounded-full" style={{ border: `1px solid ${T.border}` }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold" style={{ background: T.primary }}>
                {session.email.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-[12.5px] font-medium pr-2">{session.email}</span>
            </div>
            <button onClick={handleLogout} className="ev-btn px-3 py-2 text-[12.5px]" style={{ border: `1px solid ${T.border}` }}>
              Cerrar sesión
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto ev-scroll p-5 lg:p-8">
          {view === "dashboard" && <Dashboard ctx={ctx} />}
          {view === "calendario" && <Calendario ctx={ctx} />}
          {view === "personal" && <Personal ctx={ctx} />}
          {view === "turnos" && <Turnos ctx={ctx} />}
          {view === "reportes" && <Reportes ctx={ctx} />}
          {view === "configuracion" && <Configuracion ctx={ctx} />}
        </main>
      </div>

      {modal && <EventModal ctx={ctx} onClose={() => setModal(null)} onSave={saveEvent} initial={modal} />}
      {detail && <DetailDrawer ctx={ctx} event={detail} onClose={() => setDetail(null)} onEdit={() => { setModal({ mode: "edit", event: detail }); setDetail(null); }} onDelete={() => deleteEvent(detail)} />}
      {toast && <Toast toast={toast} />}
    </div>
  );
}

/* ============================== LOGIN ============================== */
function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [form, setForm] = useState({ nombre: "", correo: "", password: "" });
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
      if (mode === "signup") {
        const res = await authSignUp(form.correo, form.password);
        if (res.access_token) {
          ACCESS_TOKEN = res.access_token;
          try {
            await sb("usuarios", {
              method: "POST",
              body: JSON.stringify({ id: res.user?.id, nombre: form.nombre || form.correo, correo: form.correo, rol: "coordinador" }),
            });
          } catch (_) { /* la cuenta ya quedó creada; el registro en "usuarios" se puede reintentar luego */ }
          onLogin({ email: form.correo });
        } else {
          setNotice("Cuenta creada. Si tu proyecto exige confirmar el correo, revisa tu bandeja y luego inicia sesión aquí.");
          setMode("signin");
        }
      } else {
        const res = await authSignIn(form.correo, form.password);
        ACCESS_TOKEN = res.access_token;
        onLogin({ email: form.correo });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: T.base, fontFamily: "'Inter', sans-serif" }} className="w-full min-h-[720px] flex items-center justify-center p-6">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&display=swap');`}</style>
      <form onSubmit={submit} className="ev-card w-full max-w-sm p-6" style={{ background: T.surface }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: T.primary }}>
            <Sparkles size={16} color="#fff" />
          </div>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="text-[19px] font-semibold" >EVOLUCIONA</span>
        </div>
        <p className="text-[12px] mb-5" style={{ color: T.muted }}>
          {mode === "signin" ? "Inicia sesión para continuar" : "Crea tu cuenta de coordinador"}
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
        <div className="mt-3">
          <Field label="Contraseña">
            <input required type="password" minLength={6} value={form.password} onChange={(e) => set("password", e.target.value)} style={inputStyle} placeholder="Mínimo 6 caracteres" />
          </Field>
        </div>

        {error && <p className="text-[12px] mt-3 rounded-lg px-3 py-2" style={{ background: T.dangerSoft, color: T.danger }}>{error}</p>}
        {notice && <p className="text-[12px] mt-3 rounded-lg px-3 py-2" style={{ background: T.accentSoft, color: "#8A5A17" }}>{notice}</p>}

        <button type="submit" disabled={loading} className="ev-btn w-full justify-center px-4 py-2.5 text-[13px] text-white mt-4 disabled:opacity-50" style={{ background: T.primary }}>
          {loading ? "Un momento…" : mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setNotice(null); }}
          className="w-full text-center text-[12.5px] mt-3 font-medium"
          style={{ color: T.primary }}
        >
          {mode === "signin" ? "¿No tienes cuenta? Crear una" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </form>
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
function Dashboard({ ctx }) {
  const { events, personal, setView, setModal } = ctx;
  const todayISO = toISO(TODAY);
  const todayEvents = events.filter((e) => e.date === todayISO).sort((a, b) => a.start - b.start);
  const activos = personal.filter((p) => p.estado === "activo").length;
  const turnosHoy = todayEvents.filter((e) => e.type === "turno_dia" || e.type === "turno_noche").length;

  const alerts = [
    { level: "danger", text: "Turno Noche del sábado sin responsable asignado" },
    { level: "warn", text: "Jorge Pardo supera las 44 horas semanales asignadas" },
    { level: "warn", text: "Andrés Ruiz está inactivo y aparece en un turno del viernes" },
  ];

  const proximas = events
    .filter((e) => e.date >= todayISO)
    .sort((a, b) => (a.date + String(a.start).padStart(5, "0")).localeCompare(b.date + String(b.start).padStart(5, "0")))
    .slice(0, 6);

  const horasData = personal
    .filter((p) => p.estado === "activo")
    .map((p) => {
      const asignadas = events
        .filter((e) => e.personalId === p.id && (e.type === "turno_dia" || e.type === "turno_noche"))
        .reduce((acc, e) => acc + (e.end - e.start), 0);
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
        <div className="ev-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="ev-display font-semibold text-[15px]">Próximas actividades</h3>
            <button onClick={() => setView("calendario")} className="text-[12.5px] font-semibold flex items-center gap-1" style={{ color: T.primary }}>
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
                    {e.date === todayISO ? "Hoy" : new Date(e.date).toLocaleDateString("es-CO", { weekday: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ev-card p-5">
          <h3 className="ev-display font-semibold text-[15px] mb-4 flex items-center gap-2">
            <AlertTriangle size={15} style={{ color: T.danger }} /> Alertas
          </h3>
          <div className="flex flex-col gap-2.5">
            {alerts.map((a, i) => (
              <div key={i} className="rounded-lg px-3 py-2.5 text-[12.5px] leading-snug" style={{ background: a.level === "danger" ? T.dangerSoft : T.accentSoft, color: a.level === "danger" ? T.danger : "#8A5A17" }}>
                {a.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ev-card p-5">
        <h3 className="ev-display font-semibold text-[15px] mb-1">Control de horas · esta semana</h3>
        <p className="text-[12px] mb-4" style={{ color: T.muted }}>Horas contratadas vs. horas asignadas en turnos, por persona activa</p>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={horasData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="nombre" tick={{ fontSize: 11.5, fill: T.muted }} axisLine={{ stroke: T.border }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 12.5 }} />
              <Bar dataKey="Contratadas" fill={T.border} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Asignadas" fill={T.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
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

/* ============================== CALENDARIO ============================== */
function Calendario({ ctx }) {
  const { calMode, setCalMode } = ctx;
  return (
    <div className="flex flex-col gap-4">
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
        <Legend />
        <button
          onClick={() => ctx.setModal({ mode: "new", event: null })}
          className="ev-btn px-3.5 py-2 text-[12.5px] text-white"
          style={{ background: T.primary }}
        >
          <Plus size={14} /> Nueva actividad
        </button>
      </div>
      {calMode === "semana" ? <WeekView ctx={ctx} /> : <MonthView ctx={ctx} />}
    </div>
  );
}

function Legend() {
  return (
    <div className="hidden xl:flex items-center gap-3 flex-wrap">
      {Object.entries(ACTIVITY_TYPES).map(([k, v]) => (
        <span key={k} className="flex items-center gap-1.5 text-[11.5px]" style={{ color: T.muted }}>
          <span className="w-2 h-2 rounded-full" style={{ background: v.color }} /> {v.label}
        </span>
      ))}
    </div>
  );
}

const HOUR_START = 6;
const HOUR_END = 24;
const ROW_H = 52;

function WeekView({ ctx }) {
  const { weekDays, weekOffset, setWeekOffset, events, setDetail, setModal } = ctx;
  const todayISO = toISO(TODAY);
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  return (
    <div className="ev-card overflow-hidden print-area">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: T.border }}>
        <button className="no-print p-1.5 rounded-lg" style={{ border: `1px solid ${T.border}` }} onClick={() => setWeekOffset((w) => w - 1)}>
          <ChevronLeft size={16} />
        </button>
        <p className="ev-display font-semibold text-[14px]">
          {weekDays[0].toLocaleDateString("es-CO", { day: "numeric", month: "short" })} – {weekDays[6].toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
        </p>
        <button className="no-print p-1.5 rounded-lg" style={{ border: `1px solid ${T.border}` }} onClick={() => setWeekOffset((w) => w + 1)}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="overflow-x-auto ev-scroll">
        <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, minmax(140px, 1fr))", minWidth: 900 }}>
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
            const dayEvents = events.filter((e) => e.date === dISO);
            return (
              <div
                key={dayIdx}
                className="relative border-l ev-scroll"
                style={{ height: hours.length * ROW_H, borderColor: T.border }}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    onClick={() => ctx.setModal({ mode: "new", event: null, prefill: { date: dISO, start: h, end: h + 1 } })}
                    className="absolute w-full border-t hover:bg-black/[0.02] cursor-pointer"
                    style={{ top: (h - HOUR_START) * ROW_H, height: ROW_H, borderColor: "#EEF1EF" }}
                  />
                ))}
                {dayEvents.map((e) => {
                  const top = (Math.max(e.start, HOUR_START) - HOUR_START) * ROW_H;
                  const bottom = (Math.min(e.end, HOUR_END) - HOUR_START) * ROW_H;
                  const color = ACTIVITY_TYPES[e.type].color;
                  return (
                    <div
                      key={e.id}
                      onClick={(ev) => { ev.stopPropagation(); setDetail(e); }}
                      className="absolute left-1 right-1 rounded-md px-2 py-1 cursor-pointer overflow-hidden hover:shadow-md transition-shadow"
                      style={{
                        top, height: Math.max(bottom - top, 24),
                        background: `${color}1A`, borderLeft: `3px solid ${color}`,
                      }}
                    >
                      <p className="text-[11.5px] font-semibold truncate" style={{ color: T.ink }}>{e.title}</p>
                      <p className="ev-mono text-[10px] truncate" style={{ color: T.muted }}>{fmtRange(e.start, e.end)}</p>
                      {e.end > HOUR_END && <p className="text-[9.5px] font-medium" style={{ color }}>continúa mañana ↴</p>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthView({ ctx }) {
  const { monthOffset, setMonthOffset, events, setCalMode, setWeekOffset } = ctx;
  const base = new Date(TODAY.getFullYear(), TODAY.getMonth() + monthOffset, 1);
  const firstOfMonth = new Date(base.getFullYear(), base.getMonth(), 1);
  const gridStart = getMonday(firstOfMonth);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const todayISO = toISO(TODAY);

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
          const dayEvents = events.filter((e) => e.date === dISO);
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
  const { personal, toggleEstado, setModal } = ctx;
  return (
    <div className="ev-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: T.border }}>
        <h3 className="ev-display font-semibold text-[15px]">Personal registrado</h3>
        <span className="text-[12px]" style={{ color: T.muted }}>{personal.length} personas</span>
      </div>
      <div className="overflow-x-auto ev-scroll">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left" style={{ color: T.muted }}>
              {["Nombre", "Cargo", "Área", "Horas/sem", "Estado", ""].map((h) => (
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
                <td className="px-5 py-3 text-right">
                  <button onClick={() => toggleEstado(p.id)} className="ev-btn text-[12px] px-2.5 py-1" style={{ border: `1px solid ${T.border}` }}>
                    {p.estado === "activo" ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================== TURNOS ============================== */
function Turnos({ ctx }) {
  const { events, personal } = ctx;
  const turnos = events.filter((e) => e.type === "turno_dia" || e.type === "turno_noche");
  const porPersona = personal.map((p) => {
    const suyos = turnos.filter((t) => t.personalId === p.id);
    const horas = suyos.reduce((a, t) => a + (t.end - t.start), 0);
    return { ...p, turnos: suyos.length, horasAsignadas: horas };
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="ev-card p-4">
          <p className="text-[12px] font-medium" style={{ color: T.muted }}>Turno Día</p>
          <p className="ev-display text-[22px] font-semibold">07:00 – 17:00 <span className="text-[13px] font-normal" style={{ color: T.muted }}>· 10h</span></p>
        </div>
        <div className="ev-card p-4">
          <p className="text-[12px] font-medium" style={{ color: T.muted }}>Turno Noche</p>
          <p className="ev-display text-[22px] font-semibold">17:00 – 07:00 <span className="text-[13px] font-normal" style={{ color: T.muted }}>· 14h</span></p>
        </div>
      </div>

      <div className="ev-card overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: T.border }}>
          <h3 className="ev-display font-semibold text-[15px]">Horas asignadas por persona · semana actual</h3>
        </div>
        <div className="divide-y ev-scroll" style={{ borderColor: T.border }}>
          {porPersona.filter((p) => p.turnos > 0).map((p) => {
            const pct = Math.min(100, Math.round((p.horasAsignadas / p.horas) * 100));
            const over = p.horasAsignadas > p.horas;
            return (
              <div key={p.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium text-[13px]">{p.nombre}</span>
                  <span className="ev-mono text-[12px]" style={{ color: over ? T.danger : T.muted }}>{p.horasAsignadas}h / {p.horas}h</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: T.border }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: over ? T.danger : T.primary }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="ev-card overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: T.border }}>
          <h3 className="ev-display font-semibold text-[15px]">Listado de turnos de la semana</h3>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left" style={{ color: T.muted }}>
              {["Fecha", "Tipo", "Horario", "Responsable"].map((h) => (
                <th key={h} className="px-5 py-2 font-medium text-[11.5px] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {turnos.map((t) => (
              <tr key={t.id} className="border-t" style={{ borderColor: T.border }}>
                <td className="px-5 py-2.5">{new Date(t.date).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })}</td>
                <td className="px-5 py-2.5">
                  <span className="px-2 py-0.5 rounded-full text-[11.5px] font-medium" style={{ background: `${ACTIVITY_TYPES[t.type].color}1A`, color: ACTIVITY_TYPES[t.type].color }}>
                    {ACTIVITY_TYPES[t.type].label}
                  </span>
                </td>
                <td className="px-5 py-2.5 ev-mono">{fmtRange(t.start, t.end)}</td>
                <td className="px-5 py-2.5" style={{ color: t.personalId ? T.ink : T.danger }}>{personName(t.personalId)}</td>
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

  function exportTurnosCSV() {
    const rows = [["Fecha", "Tipo", "Inicio", "Fin", "Responsable", "Cargo", "Área"]];
    events.forEach((e) => {
      const p = personById(e.personalId);
      rows.push([e.date, ACTIVITY_TYPES[e.type].label, fmtHour(e.start), fmtHour(e.end), p?.nombre || "Sin asignar", p?.cargo || "-", p?.area || "-"]);
    });
    download("evoluciona_turnos.csv", rows.map((r) => r.map(csvEscape).join(",")).join("\n"), "text/csv;charset=utf-8;");
    showToast("Excel de turnos descargado (.csv)");
  }
  function exportPersonalCSV() {
    const rows = [["Nombre", "Cargo", "Área", "Horas/semana", "Estado"]];
    personal.forEach((p) => rows.push([p.nombre, p.cargo, p.area, p.horas, p.estado]));
    download("evoluciona_personal.csv", rows.map((r) => r.map(csvEscape).join(",")).join("\n"), "text/csv;charset=utf-8;");
    showToast("Reporte de personal descargado (.csv)");
  }
  function exportPDF() {
    showToast("Abriendo vista de impresión para PDF…");
    setTimeout(() => window.print(), 300);
  }

  const cards = [
    { title: "Programación semanal (PDF)", desc: `Vista de impresión de la semana del ${weekDays[0].toLocaleDateString("es-CO", { day: "numeric", month: "short" })}`, action: exportPDF, icon: Printer },
    { title: "Turnos (Excel)", desc: "Listado completo de turnos asignados con responsable, cargo y área", action: exportTurnosCSV, icon: Download },
    { title: "Personal asignado", desc: "Reporte de todo el personal registrado, su cargo, área y estado", action: exportPersonalCSV, icon: Download },
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
          <button onClick={c.action} className="ev-btn mt-4 px-3.5 py-2 text-[12.5px] text-white justify-center" style={{ background: T.primary }}>
            Generar
          </button>
        </div>
      ))}
    </div>
  );
}

/* ============================== CONFIGURACIÓN ============================== */
function Configuracion() {
  const [prefs, setPrefs] = useState({ notificaciones: true, recordatorios: true, semanaInicioLunes: true });
  const toggle = (k) => setPrefs((p) => ({ ...p, [k]: !p[k] }));
  const items = [
    { key: "notificaciones", label: "Notificaciones de alertas de turnos", desc: "Recibir avisos cuando un turno quede sin responsable" },
    { key: "recordatorios", label: "Recordatorios de actividades", desc: "Aviso 30 minutos antes de cada actividad programada" },
    { key: "semanaInicioLunes", label: "La semana inicia en lunes", desc: "Afecta la vista de calendario semanal y mensual" },
  ];
  return (
    <div className="ev-card p-2 max-w-xl">
      {items.map((it, i) => (
        <div key={it.key} className="flex items-center justify-between px-4 py-4" style={{ borderTop: i ? `1px solid ${T.border}` : "none" }}>
          <div className="pr-4">
            <p className="font-medium text-[13.5px]">{it.label}</p>
            <p className="text-[12px]" style={{ color: T.muted }}>{it.desc}</p>
          </div>
          <button onClick={() => toggle(it.key)} className="w-10 h-6 rounded-full relative shrink-0" style={{ background: prefs[it.key] ? T.primary : T.border }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: prefs[it.key] ? 18 : 2 }} />
          </button>
        </div>
      ))}
      <div className="px-4 pb-4 pt-1">
        <p className="text-[11.5px]" style={{ color: T.muted }}>Más ajustes (roles, permisos, integraciones) llegarán con la conexión a Supabase.</p>
      </div>
    </div>
  );
}

/* ============================== MODAL: NUEVA/EDITAR ACTIVIDAD ============================== */
function EventModal({ ctx, onClose, onSave, initial }) {
  const { personal, saving } = ctx;
  const base = initial.event || {};
  const pre = initial.prefill || {};
  const [form, setForm] = useState({
    id: base.id || nid(),
    title: base.title || "",
    type: base.type || "terapeutico",
    date: base.date || pre.date || toISO(TODAY),
    start: base.start ?? pre.start ?? 8,
    end: base.end ?? pre.end ?? 9,
    personalId: base.personalId || "",
  });
  const selected = personById(form.personalId);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="ev-card w-full max-w-md p-5 max-h-[90vh] overflow-y-auto ev-scroll">
        <div className="flex items-center justify-between mb-4">
          <h3 className="ev-display font-semibold text-[16px]">{initial.mode === "edit" ? "Editar actividad" : "Nueva actividad"}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3.5">
          <Field label="Nombre de la actividad">
            <input
              value={form.type.startsWith("turno_") ? ACTIVITY_TYPES[form.type].label : form.title}
              disabled={form.type.startsWith("turno_")}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ej. Grupo Terapéutico"
              style={{ ...inputStyle, opacity: form.type.startsWith("turno_") ? 0.6 : 1 }}
            />
          </Field>
          <Field label="Tipo de actividad">
            <select
              value={form.type}
              onChange={(e) => {
                const t = e.target.value;
                set("type", t);
                if (t.startsWith("turno_")) set("title", ACTIVITY_TYPES[t].label);
              }}
              style={inputStyle}
            >
              {Object.entries(ACTIVITY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {form.type.startsWith("turno_") && (
              <span className="text-[11px]" style={{ color: T.muted }}>La tabla "turnos" en Supabase no guarda un nombre libre, solo el tipo.</span>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Responsable">
              <select
                value={form.personalId}
                onChange={(e) => set("personalId", e.target.value)}
                style={inputStyle}
              >
                <option value="">Sin asignar</option>
                {personal.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hora inicio">
              <input type="number" min={0} max={23} value={form.start} onChange={(e) => set("start", parseFloat(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="Hora fin">
              <input type="number" min={0} max={32} value={form.end} onChange={(e) => set("end", parseFloat(e.target.value))} style={inputStyle} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[12.5px]" style={{ color: T.muted }}>
            <p>Cargo: <span style={{ color: T.ink }}>{selected?.cargo || "—"}</span></p>
            <p>Área: <span style={{ color: T.ink }}>{selected?.area || "—"}</span></p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="ev-btn px-4 py-2 text-[13px]" style={{ border: `1px solid ${T.border}` }}>Cancelar</button>
          <button
            onClick={() => onSave({ ...form, start: Number(form.start), end: Number(form.end) })}
            disabled={!form.title || saving}
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

const inputStyle = { width: "100%", border: `1px solid ${T.border}`, borderRadius: 9, padding: "8px 10px", fontSize: 13, background: T.surface, color: T.ink };

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] font-medium" style={{ color: T.muted }}>{label}</span>
      {children}
    </label>
  );
}

/* ============================== DRAWER: DETALLE ============================== */
function DetailDrawer({ event, onClose, onEdit, onDelete }) {
  const p = personById(event.personalId);
  const color = ACTIVITY_TYPES[event.type].color;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-sm h-full p-5 overflow-y-auto ev-scroll" style={{ background: T.surface }}>
        <div className="flex items-center justify-between mb-5">
          <span className="px-2.5 py-1 rounded-full text-[11.5px] font-semibold" style={{ background: `${color}1A`, color }}>
            {ACTIVITY_TYPES[event.type].label}
          </span>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <h3 className="ev-display text-[19px] font-semibold mb-1">{event.title}</h3>
        <p className="ev-mono text-[14px] mb-6" style={{ color: T.muted }}>
          {new Date(event.date).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })} · {fmtRange(event.start, event.end)}
        </p>
        <div className="flex flex-col gap-4">
          <DetailRow label="Responsable" value={p?.nombre || "Sin asignar"} />
          <DetailRow label="Cargo" value={p?.cargo || "—"} />
          <DetailRow label="Área" value={p?.area || "—"} />
        </div>
        <div className="flex gap-2 mt-8">
          <button onClick={onEdit} className="ev-btn flex-1 justify-center px-3.5 py-2.5 text-[13px]" style={{ border: `1px solid ${T.border}` }}>
            <Pencil size={14} /> Editar
          </button>
          <button onClick={onDelete} className="ev-btn flex-1 justify-center px-3.5 py-2.5 text-[13px]" style={{ background: T.dangerSoft, color: T.danger }}>
            <Trash2 size={14} /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-[11.5px] font-medium" style={{ color: T.muted }}>{label}</p>
      <p className="text-[14px] font-medium mt-0.5">{value}</p>
    </div>
  );
}
