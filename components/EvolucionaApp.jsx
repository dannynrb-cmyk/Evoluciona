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
  };
}
function mapBiblioteca(row) {
  return { id: row.id, nombre: row.nombre, tipo: row.tipo, metodologia: row.metodologia || "", objetivos: row.objetivos || "" };
}
function mapUsuario(row) {
  return { id: row.id, nombre: row.nombre, correo: row.correo, rol: row.rol };
}

async function fetchAllRemote() {
  const [personalRows, actRows, turnRows, bibRows, reglasRow, festivoRows] = await Promise.all([
    sb("personal?select=*&order=nombre"),
    sb("actividades?select=*"),
    sb("turnos?select=*"),
    sb("biblioteca_actividades?select=*&order=nombre"),
    sb("reglas_turnos?select=*&limit=1"),
    sb("festivos?select=*&order=fecha"),
  ]);
  return {
    personal: personalRows.map(mapPersonal),
    events: [...actRows.map(mapActividad), ...turnRows.map(mapTurno)],
    biblioteca: bibRows.map(mapBiblioteca),
    reglas: reglasRow && reglasRow[0] ? mapReglas(reglasRow[0]) : null,
    festivos: festivoRows.map(mapFestivo),
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
    : { nombre: form.title, tipo: form.type, fecha: form.date, hora_inicio: form.start, hora_fin: form.end, responsable_id: form.personalId || null, metodologia: form.metodologia || null, objetivos: form.objetivos || null };
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
function personalPayload(form) {
  return {
    nombre: form.nombre, cargo: form.cargo, area: form.area,
    tipo_contrato: form.tipoContrato || "Término indefinido",
    horas_semana: Number(form.horas) || 0,
    disponibilidad: form.disponibilidad || "Completa",
    estado: form.estado || "activo",
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
  const [row] = await sb("biblioteca_actividades", { method: "POST", body: JSON.stringify({ nombre: form.nombre, tipo: form.tipo, metodologia: form.metodologia || null, objetivos: form.objetivos || null }) });
  return mapBiblioteca(row);
}
async function updateBibliotecaRemote(form) {
  const [row] = await sb(`biblioteca_actividades?id=eq.${form.id}`, { method: "PATCH", body: JSON.stringify({ nombre: form.nombre, tipo: form.tipo, metodologia: form.metodologia || null, objetivos: form.objetivos || null }) });
  return mapBiblioteca(row);
}
async function deleteBibliotecaRemote(id) {
  await sb(`biblioteca_actividades?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
}
async function fetchOwnUsuario() {
  const rows = await sb("usuarios?select=*&limit=1");
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
    updated_at: new Date().toISOString(),
  };
  const [row] = await sb(`reglas_turnos?id=eq.${form.id}`, { method: "PATCH", body: JSON.stringify(body) });
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
  const [row] = await sb("festivos", { method: "POST", body: JSON.stringify({ fecha: form.fecha, nombre: form.nombre }) });
  return mapFestivo(row);
}
async function deleteFestivoRemote(id) {
  await sb(`festivos?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
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
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "actividades", label: "Actividades", icon: CalendarDays },
  { key: "turnos", label: "Turnos", icon: Clock },
  { key: "biblioteca", label: "Biblioteca", icon: BookOpen },
  { key: "personal", label: "Personal", icon: Users },
  { key: "reportes", label: "Reportes", icon: FileBarChart },
  { key: "configuracion", label: "Configuración", icon: Settings },
];
const TURNO_TYPES = ["turno_dia", "turno_noche"];
const ACTIVIDAD_TYPES = Object.keys(ACTIVITY_TYPES).filter((k) => !TURNO_TYPES.includes(k));
// Valores por defecto si aún no cargaron las reglas desde Supabase.
const TURNO_CARGOS_DEFAULT = ["operador terapéutico", "auxiliar de enfermería"];
function esCargoDeTurno(cargo, cargosTurno) {
  const c = (cargo || "").toLowerCase();
  const lista = (cargosTurno && cargosTurno.length ? cargosTurno : TURNO_CARGOS_DEFAULT).map((x) => x.toLowerCase());
  return lista.some((t) => c.includes(t));
}

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
  const [session, setSession] = useState(null); // { email, rol }
  const [view, setView] = useState("dashboard");
  const [events, setEvents] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [biblioteca, setBiblioteca] = useState([]);
  const [reglas, setReglas] = useState(null);
  const [festivos, setFestivos] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [calMode, setCalMode] = useState("semana");
  const [monthOffset, setMonthOffset] = useState(0);
  const [modal, setModal] = useState(null); // {mode:'new'|'edit', event}
  const [detail, setDetail] = useState(null); // event being viewed
  const [personalModal, setPersonalModal] = useState(null); // {mode, person}
  const [bibModal, setBibModal] = useState(null); // {mode, item}
  const [festivoModal, setFestivoModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, showToast] = useToast();

  const isMaestro = session?.rol === "maestro";

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
      setBiblioteca(data.biblioteca);
      setReglas(data.reglas);
      setFestivos(data.festivos);
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
    setBiblioteca([]);
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
      if (modal?.mode === "edit") {
        await updateEventRemote(form);
      } else if (TURNO_TYPES.includes(form.type) && form.personalIds?.length > 0) {
        for (const pid of form.personalIds) {
          await insertEventRemote({ ...form, personalId: pid });
        }
      } else {
        await insertEventRemote(form);
      }
      setEvents(await fetchEventsRemote());
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

  const ctx = {
    events, setEvents, personal, setPersonal, biblioteca, weekStart, weekDays, weekOffset, setWeekOffset,
    calMode, setCalMode, monthOffset, setMonthOffset, setModal, detail, setDetail, deleteEvent,
    toggleEstado, showToast, setView, saving, isMaestro, session,
    personalModal, setPersonalModal, savePersonal, deletePersonal,
    bibModal, setBibModal, saveBiblioteca, deleteBiblioteca,
    reglas, saveReglas, festivos, addFestivo, deleteFestivo, festivoModal, setFestivoModal,
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
            <span
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: isMaestro ? T.primarySoft : T.accentSoft, color: isMaestro ? T.primaryDark : "#8A5A17" }}
            >
              {isMaestro ? <Shield size={11} /> : <Lock size={11} />} {isMaestro ? "Maestro" : "Lector"}
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
          </div>
        </header>

        <main className="flex-1 overflow-y-auto ev-scroll p-5 lg:p-8">
          {view === "dashboard" && <Dashboard ctx={ctx} />}
          {view === "actividades" && <ActividadesCalendario ctx={ctx} />}
          {view === "turnos" && <TurnosCalendario ctx={ctx} />}
          {view === "biblioteca" && <Biblioteca ctx={ctx} />}
          {view === "personal" && <Personal ctx={ctx} />}
          {view === "reportes" && <Reportes ctx={ctx} />}
          {view === "configuracion" && <Configuracion ctx={ctx} />}
        </main>
      </div>

      {modal && <EventModal ctx={ctx} onClose={() => setModal(null)} onSave={saveEvent} initial={modal} />}
      {detail && <DetailDrawer ctx={ctx} event={detail} onClose={() => setDetail(null)} onEdit={() => { setModal({ mode: "edit", event: detail }); setDetail(null); }} onDelete={() => deleteEvent(detail)} />}
      {personalModal && <PersonalModal ctx={ctx} onClose={() => setPersonalModal(null)} initial={personalModal} />}
      {bibModal && <BibliotecaModal ctx={ctx} onClose={() => setBibModal(null)} initial={bibModal} />}
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
              body: JSON.stringify({ id: res.user?.id, nombre: form.nombre || form.correo, correo: form.correo, rol: "lector" }),
            });
          } catch (_) { /* la cuenta ya quedó creada; el registro en "usuarios" se puede reintentar luego */ }
          const propio = await fetchOwnUsuario();
          onLogin({ email: form.correo, rol: propio?.rol || "lector" });
        } else {
          setNotice("Cuenta creada. Si tu proyecto exige confirmar el correo, revisa tu bandeja y luego inicia sesión aquí.");
          setMode("signin");
        }
      } else {
        const res = await authSignIn(form.correo, form.password);
        ACCESS_TOKEN = res.access_token;
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
        onLogin({ email: form.correo, rol: propio?.rol || "lector" });
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
        <div className="ev-card p-5 lg:col-span-2">
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

/* ============================== TURNOS (calendario) ============================== */
function TurnosCalendario({ ctx }) {
  const { isMaestro, events, personal, monthOffset, setMonthOffset, setDetail, reglas, festivos } = ctx;
  const turnos = events.filter((e) => TURNO_TYPES.includes(e.type));
  const festivoSet = new Set((festivos || []).map((f) => f.fecha));

  function esFinDeSemanaOFestivo(dISO) {
    const dow = new Date(`${dISO}T00:00:00`).getDay();
    return dow === 0 || dow === 6 || festivoSet.has(dISO);
  }
  function minRequerido(dISO, tipo) {
    if (!reglas) return tipo === "turno_noche" ? 2 : 1;
    const base = tipo === "turno_noche" ? reglas.personalMinTurnoNoche : reglas.personalMinTurnoDia;
    return esFinDeSemanaOFestivo(dISO) ? Math.max(base, reglas.personalMinFinSemanaFestivo) : base;
  }

  const elegibles = personal.filter((p) => esCargoDeTurno(p.cargo, reglas?.cargosTurno));
  const baseParaResumen = elegibles.length > 0 ? elegibles : personal;
  const porPersona = baseParaResumen.map((p) => {
    const suyos = turnos.filter((t) => t.personalId === p.id);
    const horas = suyos.reduce((a, t) => a + horasEfectivas(t), 0);
    return { ...p, turnos: suyos.length, horasAsignadas: horas };
  });

  const base = new Date(TODAY.getFullYear(), TODAY.getMonth() + monthOffset, 1);
  const gridStart = getMonday(new Date(base.getFullYear(), base.getMonth(), 1));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const todayISO = toISO(TODAY);
  const lastCellInMonth = cells.reduce((acc, d, i) => (d.getMonth() === base.getMonth() ? i : acc), 0);
  const visibleCells = cells.slice(0, Math.ceil((lastCellInMonth + 1) / 7) * 7);

  function chipsFor(dISO, tipo) {
    return turnos.filter((t) => t.date === dISO && t.type === tipo);
  }

  return (
    <div className="flex flex-col gap-4">
      <ReadOnlyBanner isMaestro={isMaestro} />
      {elegibles.length === 0 && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-[12.5px]" style={{ background: T.accentSoft, color: "#8A5A17" }}>
          <AlertTriangle size={14} /> Ningún colaborador tiene alguno de los cargos configurados para turnos — revísalos en Configuración o edítalos en Personal.
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Legend types={TURNO_TYPES} />
        {isMaestro && (
          <button
            onClick={() => ctx.setModal({ mode: "new", event: null, defaultType: "turno_dia" })}
            className="ev-btn px-3.5 py-2 text-[12.5px] text-white"
            style={{ background: T.primary }}
          >
            <Plus size={14} /> Nuevo turno
          </button>
        )}
      </div>

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
        <div className="grid grid-cols-7 overflow-x-auto ev-scroll" style={{ minWidth: 900 }}>
          {visibleCells.map((d, i) => {
            const dISO = toISO(d);
            const inMonth = d.getMonth() === base.getMonth();
            const dia = chipsFor(dISO, "turno_dia");
            const noche = chipsFor(dISO, "turno_noche");
            const festivoNombre = festivoSet.has(dISO) ? festivos.find((f) => f.fecha === dISO)?.nombre : null;
            return (
              <div
                key={i}
                onClick={() => isMaestro && ctx.setModal({ mode: "new", event: null, defaultType: "turno_dia", prefill: { date: dISO, start: 7, end: 17 } })}
                className={`border-b border-r p-1.5 flex flex-col gap-1 min-h-[112px] ${isMaestro ? "cursor-pointer hover:bg-black/[0.02]" : ""}`}
                style={{ borderColor: T.border, opacity: inMonth ? 1 : 0.4, background: festivoNombre ? T.accentSoft : "transparent" }}
                title={festivoNombre || undefined}
              >
                <span className="ev-display text-[11.5px] font-semibold w-5 h-5 flex items-center justify-center rounded-full shrink-0" style={{ background: dISO === todayISO ? T.primary : "transparent", color: dISO === todayISO ? "#fff" : T.ink }}>
                  {d.getDate()}
                </span>
                <TurnoMiniBox tipo="turno_dia" chips={dia} onChipClick={setDetail} min={minRequerido(dISO, "turno_dia")} />
                <TurnoMiniBox tipo="turno_noche" chips={noche} onChipClick={setDetail} min={minRequerido(dISO, "turno_noche")} />
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 px-4 py-2 text-[11px] border-t" style={{ borderColor: T.border, color: T.muted }}>
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: T.accentSoft }} /> Día festivo
          <span className="mx-1">·</span>
          <AlertTriangle size={11} style={{ color: T.danger }} /> No alcanza el mínimo de personal configurado
        </div>
      </div>

      <div className="ev-card overflow-hidden max-w-md">
        <div className="px-4 py-3 border-b" style={{ borderColor: T.border }}>
          <h3 className="ev-display font-semibold text-[13.5px]">Horas por colaborador · semana actual</h3>
        </div>
        <div className="divide-y" style={{ borderColor: T.border }}>
          {porPersona.map((p) => {
            const over = p.horasAsignadas > p.horas;
            return (
              <div key={p.id} className="flex items-center justify-between px-4 py-2 text-[12.5px]">
                <span className="font-medium">{p.nombre}</span>
                <span className="ev-mono" style={{ color: over ? T.danger : T.muted }}>{p.horasAsignadas}h / {p.horas}h</span>
              </div>
            );
          })}
          {porPersona.length === 0 && (
            <p className="px-4 py-5 text-[12px] text-center" style={{ color: T.muted }}>No hay colaboradores registrados para turnos.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TurnoMiniBox({ tipo, chips, onChipClick, min }) {
  const color = ACTIVITY_TYPES[tipo].color;
  const falta = typeof min === "number" && chips.length < min;
  return (
    <div className="rounded px-1 py-0.5" style={{ background: `${color}14`, outline: falta ? `1px solid ${T.danger}` : "none" }}>
      <p className="text-[8.5px] font-semibold uppercase tracking-wide flex items-center gap-1" style={{ color }}>
        {tipo === "turno_dia" ? "Día" : "Noche"}
        {falta && <AlertTriangle size={9} style={{ color: T.danger }} />}
      </p>
      {chips.length === 0 && <p className="text-[9px]" style={{ color: T.muted }}>—</p>}
      {chips.map((c) => (
        <button
          key={c.id}
          onClick={(ev) => { ev.stopPropagation(); onChipClick(c); }}
          className="block w-full text-left text-[9.5px] leading-tight truncate hover:underline"
          style={{ color: T.ink }}
          title={`${personName(c.personalId)} · ${fmtRange(c.start, c.end)} · ${horasEfectivas(c)}h`}
        >
          {personName(c.personalId)} <span className="ev-mono" style={{ color: T.muted }}>{horasEfectivas(c)}h</span>
        </button>
      ))}
      {falta && <p className="text-[8px]" style={{ color: T.danger }}>Faltan {min - chips.length}</p>}
    </div>
  );
}

function ReadOnlyBanner({ isMaestro }) {
  if (isMaestro) return null;
  return (
    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-[12.5px]" style={{ background: T.accentSoft, color: "#8A5A17" }}>
      <Lock size={14} /> Estás en modo lectura. Solo un usuario Maestro puede crear, editar o eliminar registros.
    </div>
  );
}

function Legend({ types }) {
  const entries = types ? types.map((k) => [k, ACTIVITY_TYPES[k]]) : Object.entries(ACTIVITY_TYPES);
  return (
    <div className="hidden xl:flex items-center gap-3 flex-wrap">
      {entries.map(([k, v]) => (
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

function WeekView({ ctx, types }) {
  const { weekDays, weekOffset, setWeekOffset, events, setDetail, setModal, isMaestro } = ctx;
  const todayISO = toISO(TODAY);
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const filtered = events.filter((e) => types.includes(e.type));

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
                      <p className="text-[10px] truncate" style={{ color: T.muted }}>{personName(e.personalId)}</p>
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
  const { personal, toggleEstado, isMaestro, setPersonalModal, deletePersonal } = ctx;
  function confirmDelete(p) {
    if (window.confirm(`¿Eliminar a ${p.nombre}? Sus turnos y actividades pasadas quedarán sin responsable asignado.`)) {
      deletePersonal(p.id);
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
        <div className="flex items-center gap-2 px-5 py-2.5 text-[12px]" style={{ background: T.accentSoft, color: "#8A5A17" }}>
          <Lock size={13} /> Modo lectura: solo un usuario Maestro puede registrar o editar personal.
        </div>
      )}
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
                  {isMaestro && (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setPersonalModal({ mode: "edit", person: p })} className="ev-btn text-[12px] px-2.5 py-1" style={{ border: `1px solid ${T.border}` }}>
                        <Pencil size={12} /> Editar
                      </button>
                      <button onClick={() => toggleEstado(p.id)} className="ev-btn text-[12px] px-2.5 py-1" style={{ border: `1px solid ${T.border}` }}>
                        {p.estado === "activo" ? "Desactivar" : "Activar"}
                      </button>
                      <button onClick={() => confirmDelete(p)} className="ev-btn text-[12px] px-2.5 py-1" style={{ background: T.dangerSoft, color: T.danger }}>
                        <Trash2 size={12} /> Eliminar
                      </button>
                    </div>
                  )}
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

  function exportTurnosCSV() {
    const rows = [["Fecha", "Tipo", "Inicio", "Fin", "Horas de jornada", "Responsable", "Cargo", "Área"]];
    events.forEach((e) => {
      const p = personById(e.personalId);
      rows.push([e.date, ACTIVITY_TYPES[e.type].label, fmtHour(e.start), fmtHour(e.end), horasEfectivas(e), p?.nombre || "Sin asignar", p?.cargo || "-", p?.area || "-"]);
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
function Configuracion({ ctx }) {
  const { reglas, saveReglas, isMaestro, saving, festivos, festivoModal, setFestivoModal, addFestivo, deleteFestivo } = ctx;
  const [form, setForm] = useState(null);

  React.useEffect(() => {
    if (reglas && !form) setForm({ ...reglas, cargosTexto: reglas.cargosTurno.join(", ") });
  }, [reglas]);

  if (!reglas || !form) {
    return <p className="text-[13px]" style={{ color: T.muted }}>No hay reglas configuradas todavía. Corre la migración de reglas de turnos en Supabase.</p>;
  }

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
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-[12.5px]" style={{ background: T.accentSoft, color: "#8A5A17" }}>
          <Lock size={14} /> Modo lectura: solo un usuario Maestro puede cambiar estas reglas.
        </div>
      )}

      <div className="ev-card p-5">
        <h3 className="ev-display font-semibold text-[15px] mb-1">Reglas obligatorias</h3>
        <p className="text-[12px] mb-4" style={{ color: T.muted }}>Nunca se pueden incumplir al programar turnos.</p>
        <div className="grid sm:grid-cols-2 gap-3.5">
          {numField("horasSemanaObjetivo", "Horas máximas por semana")}
          {numField("descansoMinHoras", "Descanso mínimo entre turnos (h)")}
          {numField("personalMinTurnoDia", "Personas mínimas · turno día")}
          {numField("personalMinTurnoNoche", "Personas mínimas · turno noche")}
          {numField("personalMinFinSemanaFestivo", "Personas mínimas · fin de semana/festivo")}
        </div>
        <div className="mt-3.5">
          <Field label="Cargos habilitados para turnos (separados por coma)">
            <input value={form.cargosTexto} disabled={!isMaestro} onChange={(e) => set("cargosTexto", e.target.value)} style={{ ...inputStyle, opacity: isMaestro ? 1 : 0.7 }} />
          </Field>
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

      {festivoModal && <FestivoModal ctx={ctx} onClose={() => setFestivoModal(false)} />}
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
  const { personal, saving, biblioteca, reglas } = ctx;
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
                {biblioteca.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
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
            <Field label="Hora inicio">
              <input type="number" min={0} max={23} value={form.start} onChange={(e) => set("start", parseFloat(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="Hora fin">
              <input type="number" min={0} max={32} value={form.end} onChange={(e) => set("end", parseFloat(e.target.value))} style={inputStyle} />
            </Field>
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
function DetailDrawer({ ctx, event, onClose, onEdit, onDelete }) {
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
function Biblioteca({ ctx }) {
  const { biblioteca, isMaestro, setBibModal, deleteBiblioteca } = ctx;
  return (
    <div className="flex flex-col gap-4">
      <ReadOnlyBanner isMaestro={isMaestro} />
      <div className="flex items-center justify-between">
        <div>
          <h3 className="ev-display font-semibold text-[16px]">Biblioteca de actividades</h3>
          <p className="text-[12.5px]" style={{ color: T.muted }}>Plantillas con metodología y objetivos, listas para reutilizar al programar.</p>
        </div>
        {isMaestro && (
          <button onClick={() => setBibModal({ mode: "new", item: null })} className="ev-btn px-3.5 py-2 text-[12.5px] text-white" style={{ background: T.primary }}>
            <Plus size={14} /> Nueva plantilla
          </button>
        )}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {biblioteca.map((b) => (
          <div key={b.id} className="ev-card p-4 flex flex-col gap-2">
            <span className="self-start px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: `${ACTIVITY_TYPES[b.tipo].color}1A`, color: ACTIVITY_TYPES[b.tipo].color }}>
              {ACTIVITY_TYPES[b.tipo].label}
            </span>
            <h4 className="font-semibold text-[14px]">{b.nombre}</h4>
            {b.metodologia && <p className="text-[12px] line-clamp-3" style={{ color: T.muted }}><strong>Metodología:</strong> {b.metodologia}</p>}
            {b.objetivos && <p className="text-[12px] line-clamp-2" style={{ color: T.muted }}><strong>Objetivos:</strong> {b.objetivos}</p>}
            {isMaestro && (
              <div className="flex gap-2 mt-1">
                <button onClick={() => setBibModal({ mode: "edit", item: b })} className="ev-btn text-[12px] px-2.5 py-1" style={{ border: `1px solid ${T.border}` }}>
                  <Pencil size={12} /> Editar
                </button>
                <button onClick={() => deleteBiblioteca(b.id)} className="ev-btn text-[12px] px-2.5 py-1" style={{ background: T.dangerSoft, color: T.danger }}>
                  <Trash2 size={12} /> Eliminar
                </button>
              </div>
            )}
          </div>
        ))}
        {biblioteca.length === 0 && (
          <p className="text-[12.5px] col-span-full text-center py-8" style={{ color: T.muted }}>Todavía no hay plantillas registradas.</p>
        )}
      </div>
    </div>
  );
}

function BibliotecaModal({ ctx, onClose, initial }) {
  const { saveBiblioteca, saving } = ctx;
  const base = initial.item || {};
  const [form, setForm] = useState({
    id: base.id || nid(),
    nombre: base.nombre || "",
    tipo: base.tipo || ACTIVIDAD_TYPES[0],
    metodologia: base.metodologia || "",
    objetivos: base.objetivos || "",
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
