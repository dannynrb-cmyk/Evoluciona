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
    --ev-ink: #14201D; --ev-base: #F5F7F5; --ev-surface: #FFFFFF;
    --ev-primary: #1B6E58; --ev-primary-dark: #123F33; --ev-primary-soft: #E3EEEA;
    --ev-accent: #C98A2E; --ev-accent-soft: #F7EEDD; --ev-accent-ink: #8A5A17;
    --ev-border: #E1E5E1; --ev-muted: #5C6B65;
    --ev-danger: #B14E33; --ev-danger-soft: #F7E7E1;
    --ev-shadow: 0 1px 2px rgba(20,32,29,0.05), 0 4px 14px rgba(20,32,29,0.06);
  }
  .ev-root[data-theme="dark"] {
    --ev-ink: #E8ECE9; --ev-base: #0E1613; --ev-surface: #182320;
    --ev-primary: #34A184; --ev-primary-dark: #1B5C4A; --ev-primary-soft: #17332B;
    --ev-accent: #D9A54B; --ev-accent-soft: #2E2515; --ev-accent-ink: #E8C179;
    --ev-border: #2A342F; --ev-muted: #8B9992;
    --ev-danger: #E2775A; --ev-danger-soft: #3A211A;
    --ev-shadow: 0 1px 2px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.4);
  }
`;
function useTheme() {
  const [theme, setTheme] = useState("light");
  React.useEffect(() => {
    try {
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
    } catch (_) {}
  }, []);
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
const APP_BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
  .ev-mono { font-family:'JetBrains Mono', monospace; }
  .ev-display { font-family:'Space Grotesk', sans-serif; letter-spacing:-0.01em; }
  .ev-scroll::-webkit-scrollbar{ width:8px; height:8px; }
  .ev-scroll::-webkit-scrollbar-thumb{ background:${T.border}; border-radius:8px; }
  .ev-card{ background:${T.surface}; border:1px solid ${T.border}; border-radius:14px; box-shadow:${T.shadow}; transition:background-color .2s, border-color .2s; }
  .ev-btn{ display:inline-flex; align-items:center; gap:6px; border-radius:9px; font-weight:600; transition:all .15s ease; cursor:pointer; }
  .ev-btn:not(:disabled):hover{ filter:brightness(0.97); }
  .ev-nav-item:hover{ background:${T.primarySoft}; }
  input, select, textarea { transition: border-color .15s ease, box-shadow .15s ease; }
  input:focus, select:focus, textarea:focus { outline:none; border-color:${T.primary} !important; box-shadow:0 0 0 3px color-mix(in srgb, ${T.primary} 18%, transparent); }
`;

const ACTIVITY_TYPES = {
  terapeutico: { label: "Grupo Terapéutico", color: "#2E8B74" },
  turno_dia: { label: "Turno Día", color: "#4C8FC9" },
  turno_noche: { label: "Turno Noche", color: "#8577C9" },
  administrativo: { label: "Administrativo", color: "#DDA23E" },
  capacitacion: { label: "Capacitación", color: "#D9704F" },
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
  const [personalRows, actRows, turnRows, bibRows, reglasRow, festivoRows, novedadRows, reglaPersonalRows] = await Promise.all([
    sb("personal?select=*&order=nombre"),
    sb("actividades?select=*"),
    sb("turnos?select=*"),
    sb("biblioteca_actividades?select=*&order=nombre"),
    sb("reglas_turnos?select=*&limit=1"),
    sb("festivos?select=*&order=fecha"),
    sb("novedades?select=*&order=fecha_inicio.desc"),
    sb("reglas_personal?select=*"),
  ]);
  return {
    personal: personalRows.map(mapPersonal),
    events: [...actRows.map(mapActividad), ...turnRows.map(mapTurno)],
    biblioteca: bibRows.map(mapBiblioteca),
    reglas: reglasRow && reglasRow[0] ? mapReglas(reglasRow[0]) : null,
    festivos: festivoRows.map(mapFestivo),
    novedades: novedadRows.map(mapNovedad),
    reglasPersonal: reglaPersonalRows.map(mapReglaPersonal),
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
    cargoOperador: row.cargo_operador || "operador terapéutico",
    cargoAuxiliar: row.cargo_auxiliar || "auxiliar de enfermería",
    operadorRequiereAuxiliar: row.operador_requiere_auxiliar !== false,
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

function mapNovedad(row) {
  return { id: row.id, personalId: row.personal_id, fechaInicio: row.fecha_inicio, fechaFin: row.fecha_fin, tipo: row.tipo, motivo: row.motivo || "" };
}
async function fetchNovedades() {
  const rows = await sb("novedades?select=*&order=fecha_inicio.desc");
  return rows.map(mapNovedad);
}
async function insertNovedadRemote(form) {
  const [row] = await sb("novedades", { method: "POST", body: JSON.stringify({ personal_id: form.personalId, fecha_inicio: form.fechaInicio, fecha_fin: form.fechaFin, tipo: form.tipo, motivo: form.motivo || null }) });
  return mapNovedad(row);
}
async function deleteNovedadRemote(id) {
  await sb(`novedades?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
}

function mapReglaPersonal(row) {
  return { id: row.id, personalId: row.personal_id, diaSemana: row.dia_semana, tipoTurno: row.tipo_turno === "dia" ? "turno_dia" : "turno_noche", tipoRegla: row.tipo_regla || "siempre" };
}
async function fetchReglasPersonal() {
  const rows = await sb("reglas_personal?select=*");
  return rows.map(mapReglaPersonal);
}
async function insertReglaPersonalRemote(form) {
  const [row] = await sb("reglas_personal", { method: "POST", body: JSON.stringify({ personal_id: form.personalId, dia_semana: Number(form.diaSemana), tipo_turno: form.tipoTurno === "turno_dia" ? "dia" : "noche", tipo_regla: form.tipoRegla || "siempre" }) });
  return mapReglaPersonal(row);
}
async function deleteReglaPersonalRemote(id) {
  await sb(`reglas_personal?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
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
  { key: "novedades", label: "Novedades", icon: UserX },
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
  const [view, setView] = useState("dashboard");
  const [events, setEvents] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [biblioteca, setBiblioteca] = useState([]);
  const [reglas, setReglas] = useState(null);
  const [festivos, setFestivos] = useState([]);
  const [novedades, setNovedades] = useState([]);
  const [reglasPersonal, setReglasPersonal] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [calMode, setCalMode] = useState("semana");
  const [monthOffset, setMonthOffset] = useState(0);
  const [modal, setModal] = useState(null); // {mode:'new'|'edit', event}
  const [detail, setDetail] = useState(null); // event being viewed
  const [personalModal, setPersonalModal] = useState(null); // {mode, person}
  const [bibModal, setBibModal] = useState(null); // {mode, item}
  const [festivoModal, setFestivoModal] = useState(false);
  const [reglaPersonalModal, setReglaPersonalModal] = useState(false);
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
      setNovedades(data.novedades);
      setReglasPersonal(data.reglasPersonal);
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
    return <LoginScreen onLogin={(s) => setSession(s)} theme={theme} setTheme={setTheme} />;
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
  async function confirmarPropuestaTurnos(propuestas) {
    setSaving(true);
    try {
      for (const p of propuestas) {
        await insertEventRemote(p);
      }
      setEvents(await fetchEventsRemote());
      showToast(`${propuestas.length} turno(s) guardado(s) en Supabase`);
    } catch (err) {
      showToast(`Se guardó parcialmente: ${err.message}`, "warn");
      setEvents(await fetchEventsRemote());
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
  async function reemplazarTurno(turno, nuevoPersonalId) {
    setSaving(true);
    try {
      await updateEventRemote({ ...turno, personalId: nuevoPersonalId });
      setEvents(await fetchEventsRemote());
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
    toggleEstado, showToast, setView, saving, isMaestro, session,
    personalModal, setPersonalModal, savePersonal, deletePersonal,
    bibModal, setBibModal, saveBiblioteca, deleteBiblioteca,
    reglas, saveReglas, festivos, addFestivo, deleteFestivo, festivoModal, setFestivoModal,
    confirmarPropuestaTurnos,
    novedades, saveNovedad, deleteNovedad,
    reglasPersonal, saveReglaPersonal, deleteReglaPersonal,
    reglaPersonalModal, setReglaPersonalModal,
    reemplazarTurno,
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
              style={{ background: isMaestro ? T.primarySoft : T.accentSoft, color: isMaestro ? T.primaryDark : T.accentInk }}
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
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto ev-scroll p-5 lg:p-8">
          {view === "dashboard" && <Dashboard ctx={ctx} />}
          {view === "actividades" && <ActividadesCalendario ctx={ctx} />}
          {view === "turnos" && <TurnosCalendario ctx={ctx} />}
          {view === "novedades" && <Novedades ctx={ctx} />}
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
function LoginScreen({ onLogin, theme, setTheme }) {
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
    <div data-theme={theme} style={{ background: T.base, fontFamily: "'Inter', sans-serif" }} className="ev-root relative w-full min-h-[720px] flex items-center justify-center p-6 transition-colors duration-200">
      <style>{THEME_CSS}</style>
      <style>{APP_BASE_CSS}</style>
      <div className="absolute top-5 right-5">
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
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
        {notice && <p className="text-[12px] mt-3 rounded-lg px-3 py-2" style={{ background: T.accentSoft, color: T.accentInk }}>{notice}</p>}

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
              <div key={i} className="rounded-lg px-3 py-2.5 text-[12.5px] leading-snug" style={{ background: a.level === "danger" ? T.dangerSoft : T.accentSoft, color: a.level === "danger" ? T.danger : T.accentInk }}>
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

function esFinDeSemanaOFestivo(dISO, festivoSet) {
  const dow = new Date(`${dISO}T00:00:00`).getDay();
  return dow === 0 || dow === 6 || festivoSet.has(dISO);
}
function minRequeridoTurno(dISO, tipo, reglas, festivoSet) {
  if (!reglas) return tipo === "turno_noche" ? 2 : 1;
  const base = tipo === "turno_noche" ? reglas.personalMinTurnoNoche : reglas.personalMinTurnoDia;
  return esFinDeSemanaOFestivo(dISO, festivoSet) ? Math.max(base, reglas.personalMinFinSemanaFestivo) : base;
}

function esOperador(cargo, reglas) {
  return (cargo || "").toLowerCase().includes((reglas?.cargoOperador || "operador terapéutico").toLowerCase());
}
function esAuxiliar(cargo, reglas) {
  return (cargo || "").toLowerCase().includes((reglas?.cargoAuxiliar || "auxiliar de enfermería").toLowerCase());
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

  for (let semanaIdx = 0; semanaIdx < semanas; semanaIdx++) {
    const diasSemana = dias.slice(semanaIdx * 7, semanaIdx * 7 + 7);
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
          if (estaAusente(persona.id, dISO, novedades)) {
            faltantes.push({ date: dISO, type: tipo, faltan: 0, motivo: `regla fija de ${persona.nombre} no aplicada (tiene una novedad activa)` });
            return;
          }
          if (tipo === "turno_dia" && nocheAyer[diaAnteriorISO]?.has(persona.id)) {
            faltantes.push({ date: dISO, type: tipo, faltan: 0, motivo: `regla fija de ${persona.nombre} no aplicada (venía de turno noche)` });
            return;
          }
          if (conteo[persona.id].horas + horasEfectivas({ type: tipo, start, end }) > reglas.horasSemanaObjetivo) {
            faltantes.push({ date: dISO, type: tipo, faltan: 0, motivo: `regla fija de ${persona.nombre} no aplicada (supera las horas semanales)` });
            return;
          }
          fijos.push(persona);
        });
        const excluidosPorRegla = new Set(
          (reglasPersonal || []).filter((r) => r.diaSemana === nuestroDia && r.tipoTurno === tipo && r.tipoRegla === "nunca").map((r) => r.personalId)
        );

        const candidatos = elegibles
          .filter((p) => !fijos.some((f) => f.id === p.id))
          .filter((p) => !excluidosPorRegla.has(p.id)) // regla "nunca" para este día/turno
          .filter((p) => !estaAusente(p.id, dISO, novedades)) // sin novedad activa ese día
          .filter((p) => !(asignadoHoy[dISO]?.has(p.id))) // no dos turnos el mismo día
          .filter((p) => !(tipo === "turno_dia" && nocheAyer[diaAnteriorISO]?.has(p.id))) // descanso tras turno noche
          .filter((p) => conteo[p.id].horas + horasEfectivas({ type: tipo, start, end }) <= reglas.horasSemanaObjetivo)
          .sort((a, b) => {
            const ca = conteo[a.id], cb = conteo[b.id];
            if (ca[tipo] !== cb[tipo]) return ca[tipo] - cb[tipo];
            return ca.horas - cb.horas;
          });

        let elegidos = [...fijos, ...candidatos.slice(0, Math.max(0, requerido - fijos.length))];

        if (reglas.operadorRequiereAuxiliar) {
          const hayOperador = elegidos.some((p) => esOperador(p.cargo, reglas));
          const hayAuxiliar = elegidos.some((p) => esAuxiliar(p.cargo, reglas));
          if (hayOperador && !hayAuxiliar) {
            const refuerzo = candidatos.find((p) => esAuxiliar(p.cargo, reglas) && !elegidos.includes(p));
            if (refuerzo) {
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
    .filter((p) => conteo[p.id].horas + horasEfectivas(turno) <= (reglas?.horasSemanaObjetivo ?? 44))
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

/* ============================== TURNOS (calendario) ============================== */
function TurnosCalendario({ ctx }) {
  const { isMaestro, events, personal, monthOffset, setMonthOffset, setDetail, reglas, festivos } = ctx;
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

  const horasPorSemana = baseParaResumen.map((p) => {
    const porSemana = semanasDelMes.map((semana) => {
      const fechas = semana.map(toISO);
      return turnos.filter((t) => t.personalId === p.id && fechas.includes(t.date)).reduce((a, t) => a + horasEfectivas(t), 0);
    });
    return { ...p, porSemana };
  });

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
        <Legend types={TURNO_TYPES} />
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
                <TurnoMiniBox tipo="turno_dia" chips={dia} onChipClick={setDetail} min={minRequeridoTurno(dISO, "turno_dia", reglas, festivoSet)} reglas={reglas} />
                <TurnoMiniBox tipo="turno_noche" chips={noche} onChipClick={setDetail} min={minRequeridoTurno(dISO, "turno_noche", reglas, festivoSet)} reglas={reglas} />
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 px-4 py-2 text-[11px] border-t" style={{ borderColor: T.border, color: T.muted }}>
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: T.accentSoft }} /> Día festivo
          <span className="mx-1">·</span>
          <AlertTriangle size={11} style={{ color: T.danger }} /> Falta personal mínimo o falta acompañamiento (operador sin auxiliar)
        </div>
      </div>

      <div className="ev-card overflow-hidden max-w-2xl">
        <div className="px-4 py-3 border-b" style={{ borderColor: T.border }}>
          <h3 className="ev-display font-semibold text-[13.5px]">Horas por colaborador · por semana de {MES_LABEL[base.getMonth()]}</h3>
        </div>
        <div className="overflow-x-auto ev-scroll">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left" style={{ color: T.muted }}>
                <th className="px-4 py-2 font-medium text-[11px] uppercase tracking-wide">Colaborador</th>
                {semanasDelMes.map((_, i) => (
                  <th key={i} className="px-3 py-2 font-medium text-[11px] uppercase tracking-wide text-right">Semana {i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {horasPorSemana.map((p) => (
                <tr key={p.id} className="border-t" style={{ borderColor: T.border }}>
                  <td className="px-4 py-2 font-medium">{p.nombre}</td>
                  {p.porSemana.map((h, i) => {
                    const over = reglas && h > reglas.horasSemanaObjetivo;
                    return (
                      <td key={i} className="px-3 py-2 text-right ev-mono" style={{ color: over ? T.danger : T.muted }}>
                        {h}h
                      </td>
                    );
                  })}
                </tr>
              ))}
              {horasPorSemana.length === 0 && (
                <tr><td colSpan={semanasDelMes.length + 1} className="px-4 py-5 text-center" style={{ color: T.muted }}>No hay colaboradores registrados para turnos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TurnoMiniBox({ tipo, chips, onChipClick, min, reglas }) {
  const color = ACTIVITY_TYPES[tipo].color;
  const falta = typeof min === "number" && chips.length < min;
  const personasDelTurno = chips.map((c) => personById(c.personalId)).filter(Boolean);
  const sinAcompanamiento = reglas?.operadorRequiereAuxiliar
    && personasDelTurno.some((p) => esOperador(p.cargo, reglas))
    && !personasDelTurno.some((p) => esAuxiliar(p.cargo, reglas));
  return (
    <div className="rounded px-1 py-0.5" style={{ background: `${color}14`, outline: (falta || sinAcompanamiento) ? `1px solid ${T.danger}` : "none" }}>
      <p className="text-[8.5px] font-semibold uppercase tracking-wide flex items-center gap-1" style={{ color }}>
        {tipo === "turno_dia" ? "Día" : "Noche"}
        {(falta || sinAcompanamiento) && <AlertTriangle size={9} style={{ color: T.danger }} />}
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
      {!falta && sinAcompanamiento && <p className="text-[8px]" style={{ color: T.danger }}>Sin auxiliar</p>}
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
        <div className="flex items-center gap-2 px-5 py-2.5 text-[12px]" style={{ background: T.accentSoft, color: T.accentInk }}>
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
  function exportPDF() {
    const semanaISO = weekDays.map(toISO);
    const eventosSemana = events.filter((e) => semanaISO.includes(e.date));
    const actividades = eventosSemana
      .filter((e) => ACTIVIDAD_TYPES.includes(e.type))
      .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
    const turnos = eventosSemana
      .filter((e) => TURNO_TYPES.includes(e.type))
      .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);

    const diaNombre = (dISO) => new Date(`${dISO}T00:00:00`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "short" });

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("EVOLUCIONA", 14, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(
      `Programación semanal · ${weekDays[0].toLocaleDateString("es-CO", { day: "numeric", month: "long" })} – ${weekDays[6].toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}`,
      14, 24
    );

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Actividades", 14, 34);
    autoTable(doc, {
      startY: 37,
      head: [["Día", "Actividad", "Tipo", "Horario", "Responsable"]],
      body: actividades.length
        ? actividades.map((e) => [diaNombre(e.date), e.title, ACTIVITY_TYPES[e.type].label, fmtRange(e.start, e.end), personName(e.personalId)])
        : [["—", "Sin actividades programadas esta semana", "", "", ""]],
      headStyles: { fillColor: [27, 110, 88] },
      styles: { fontSize: 9 },
    });

    const y2 = (doc.lastAutoTable?.finalY || 37) + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Turnos", 14, y2);
    autoTable(doc, {
      startY: y2 + 3,
      head: [["Día", "Turno", "Horario", "Horas", "Responsable"]],
      body: turnos.length
        ? turnos.map((e) => [diaNombre(e.date), e.title, fmtRange(e.start, e.end), `${horasEfectivas(e)}h`, personName(e.personalId)])
        : [["—", "Sin turnos programados esta semana", "", "", ""]],
      headStyles: { fillColor: [27, 110, 88] },
      styles: { fontSize: 9 },
    });

    doc.save(`evoluciona_programacion_${weekDays[0].toISOString().slice(0, 10)}.pdf`);
    showToast("PDF de la programación semanal descargado");
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
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-[12.5px]" style={{ background: T.accentSoft, color: T.accentInk }}>
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

      {festivoModal && <FestivoModal ctx={ctx} onClose={() => setFestivoModal(false)} />}
      {ctx.reglaPersonalModal && <ReglaPersonalModal ctx={ctx} onClose={() => ctx.setReglaPersonalModal(false)} />}
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
/* ============================== NOVEDADES ============================== */
function Novedades({ ctx }) {
  const { novedades, personal, events, reglas, isMaestro, deleteNovedad, reemplazarTurno, showToast } = ctx;
  const [modalOpen, setModalOpen] = useState(false);
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
          <button onClick={() => setModalOpen(true)} className="ev-btn px-3.5 py-2 text-[12.5px] text-white" style={{ background: T.primary }}>
            <Plus size={14} /> Reportar novedad
          </button>
        )}
      </div>

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
