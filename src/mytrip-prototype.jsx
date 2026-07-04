import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plane, PlaneTakeoff, Car, BedDouble, Footprints, Users, Sun, Ship, KeySquare,
  Tag, Star, Flag, Camera, Utensils, ShoppingBag, Music, ChevronDown, ChevronRight,
  ChevronUp, Plus, X, Settings2, Pencil, Trash2, Link2, Globe, LogIn, LogOut,
  Smartphone, Monitor, AlertTriangle, GripVertical, User, Check, Copy
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/*  MyTrip — prototype of an interactive trip-planning table               */
/*  Design tokens: pale sage background, deep teal brand, warm amber       */
/*  accent for cost/currency. Display face "Frank Ruhl Libre" for the      */
/*  wordmark, "Heebo" for UI + data (full Hebrew glyph support, tabular    */
/*  numerals for the numeric columns).                                    */
/* ---------------------------------------------------------------------- */

const ICONS = {
  Plane, PlaneTakeoff, Car, BedDouble, Footprints, Users, Sun, Ship, KeySquare,
  Tag, Star, Flag, Camera, Utensils, ShoppingBag, Music
};

const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const EN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_TYPES = [
  { id: "flight", name: "טיסה", icon: "Plane", color: "#256D64" },
  { id: "domestic-flight", name: "טיסת פנים", icon: "PlaneTakeoff", color: "#3E7CB1" },
  { id: "taxi", name: "מונית", icon: "Car", color: "#8B6F47" },
  { id: "hotel", name: "מלון", icon: "BedDouble", color: "#D98E3F" },
  { id: "self-tour", name: "טיול עצמאי", icon: "Footprints", color: "#5B8C5A" },
  { id: "guided-tour", name: "טיול מודרך", icon: "Users", color: "#5B8C5A" },
  { id: "day-tour", name: "טיול יומי", icon: "Sun", color: "#D9A23D" },
  { id: "ferry", name: "מעבורת", icon: "Ship", color: "#3E7CB1" },
  { id: "car-rental", name: "השכרת רכב", icon: "KeySquare", color: "#8B6F47" },
];

const ICON_PALETTE = ["Tag", "Star", "Flag", "Camera", "Utensils", "ShoppingBag", "Music"];
const CUSTOM_COLOR_ROTATION = ["#7A5C9E", "#C1443A", "#3E7CB1", "#5B8C5A", "#8B6F47", "#D98E3F"];

const CURRENCIES = ["₪", "$", "€", "£"];

const DEFAULT_COLUMNS = [
  { key: "date", label_he: "תאריך", label_en: "Date", visible: true, locked: true },
  { key: "day", label_he: "יום", label_en: "Day", visible: true },
  { key: "icon", label_he: "סמל", label_en: "Icon", visible: true },
  { key: "type", label_he: "תיאור", label_en: "Description", visible: true },
  { key: "from", label_he: "מ...", label_en: "From", visible: true },
  { key: "to", label_he: "ל...", label_en: "To", visible: true },
  { key: "startTime", label_he: "בשעה", label_en: "At", visible: true },
  { key: "duration", label_he: "חישוב זמן", label_en: "Duration", visible: true },
  { key: "endTime", label_he: "עד שעה", label_en: "Until", visible: true },
  { key: "destination", label_he: "שם היעד", label_en: "Destination", visible: true },
  { key: "link", label_he: "קישור להזמנה", label_en: "Booking link", visible: true },
  { key: "cost", label_he: "עלות", label_en: "Cost", visible: true },
];

const T_DICT = {
  he: {
    appName: "MyTrip", newTrip: "טיול חדש", addRow: "הוסף שורה", addGroup: "הוסף יום",
    columns: "עמודות", addColumn: "הוסף עמודה", hideAll: "הסתר הכול", showAll: "הצג הכול",
    login: "התחברות עם Google", loggedInAs: "מחובר", logout: "יציאה",
    desktop: "מחשב", mobile: "סלולר", lang: "English", editRecord: "כרטיס רשומה",
    save: "שמירה", cancel: "ביטול", delete: "מחיקה", addSub: "הוסף תת-רשומה",
    type: "סוג", from: "מ", to: "ל", start: "בשעה", end: "עד שעה", overnight: "חוצה חצות",
    destination: "שם היעד", link: "קישור להזמנה", maplink: "קישור למיקום / מסלול",
    flightNo: "מספר טיסה", cost: "עלות", currency: "מטבע", notes: "הערות",
    newType: "סוג חדש", typeName: "שם הסוג", pickIcon: "בחר סמל", add: "הוספה",
    totalPerCurrency: "סה״כ עלות", timeError: "שעת סיום לפני שעת ההתחלה — סמן \"חוצה חצות\" אם מדובר בלילה",
    dateRequired: "יש להזין תאריך", collapse: "כווץ", expand: "הרחב", noRows: "אין רשומות ליום זה",
    dragHint: "גרירה לשינוי סדר", mockNote: "*הדמיית התחברות בלבד בפרוטוטייפ",
  },
  en: {
    appName: "MyTrip", newTrip: "New trip", addRow: "Add row", addGroup: "Add day",
    columns: "Columns", addColumn: "Add column", hideAll: "Hide all", showAll: "Show all",
    login: "Sign in with Google", loggedInAs: "Signed in", logout: "Sign out",
    desktop: "Desktop", mobile: "Mobile", lang: "עברית", editRecord: "Record card",
    save: "Save", cancel: "Cancel", delete: "Delete", addSub: "Add sub-record",
    type: "Type", from: "From", to: "To", start: "At", end: "Until", overnight: "Crosses midnight",
    destination: "Destination", link: "Booking link", maplink: "Map / route link",
    flightNo: "Flight number", cost: "Cost", currency: "Currency", notes: "Notes",
    newType: "New type", typeName: "Type name", pickIcon: "Pick icon", add: "Add",
    totalPerCurrency: "Total cost", timeError: "End time is before start time — check \"crosses midnight\" if this is an overnight leg",
    dateRequired: "Date is required", collapse: "Collapse", expand: "Expand", noRows: "No records for this day",
    dragHint: "Drag to reorder", mockNote: "*Sign-in is a prototype mock only",
  }
};

function uid() { return Math.random().toString(36).slice(2, 10); }

function heDay(dateStr, lang) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return "—";
  return lang === "he" ? HE_DAYS[d.getDay()] : EN_DAYS[d.getDay()];
}

function fmtDate(dateStr, lang) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function computeDuration(start, end, overnight) {
  if (!start || !end) return "—";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return "—";
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (overnight && mins < 0) mins += 24 * 60;
  if (mins < 0) return null; // invalid
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

function initialRows() {
  const base = [
    { date: "2026-09-10", typeId: "flight", from: "תל אביב TLV", to: "רומא FCO", startTime: "07:40", endTime: "10:35", destination: "פיומיצ׳ינו", link: "https://www.google.com/flights", costAmount: 1450, costCurrency: "₪", flightNumber: "LY386" },
    { date: "2026-09-10", typeId: "taxi", from: "שדה תעופה", to: "מלון רומא", startTime: "11:15", endTime: "12:00", destination: "רומא — טרסטבר", costAmount: 45, costCurrency: "€" },
    { date: "2026-09-10", typeId: "hotel", from: "", to: "", startTime: "15:00", endTime: "", destination: "Hotel Trastevere", link: "https://www.booking.com", costAmount: 620, costCurrency: "€" },
    { date: "2026-09-11", typeId: "guided-tour", from: "", to: "", startTime: "09:00", endTime: "13:00", destination: "הקולוסיאום ופורום רומאנום", link: "https://maps.google.com", costAmount: 280, costCurrency: "€" },
    { date: "2026-09-11", typeId: "self-tour", from: "", to: "", startTime: "16:00", endTime: "19:30", destination: "טרסטבר — שיטוט וקניות", costAmount: 0, costCurrency: "€" },
    { date: "2026-09-12", typeId: "car-rental", from: "רומא", to: "פירנצה", startTime: "08:00", endTime: "08:15", destination: "איסוף רכב — Hertz", link: "https://www.hertz.com", costAmount: 310, costCurrency: "€" },
    { date: "2026-09-12", typeId: "day-tour", from: "רומא", to: "פירנצה", startTime: "08:30", endTime: "12:00", destination: "נסיעה לפירנצה", costAmount: 0, costCurrency: "€" },
  ];
  return base.map((r) => ({
    id: uid(), parentId: null, overnight: false, notes: "", mapLink: "", custom: {}, ...r,
  }));
}

function typeMeta(typeId, types) {
  return types.find((t) => t.id === typeId) || types[0];
}

export default function MyTripApp() {
  const [rows, setRows] = useState(initialRows);
  const [types, setTypes] = useState(DEFAULT_TYPES);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [lang, setLang] = useState("he");
  const [viewMode, setViewMode] = useState("auto"); // auto | desktop | mobile
  const [narrowScreen, setNarrowScreen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [collapsedParents, setCollapsedParents] = useState({});
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [typeMenuOpen, setTypeMenuOpen] = useState(null); // rowId or null
  const [newTypeDraft, setNewTypeDraft] = useState({ name: "", icon: "Tag" });
  const [cardRowId, setCardRowId] = useState(null); // row currently open in the modal
  const [cardDraft, setCardDraft] = useState(null);
  const [dragId, setDragId] = useState(null);
  const dir = lang === "he" ? "rtl" : "ltr";
  const T = T_DICT[lang];

  useEffect(() => {
    function onResize() { setNarrowScreen(window.innerWidth < 780); }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const effectiveMobile = viewMode === "mobile" || (viewMode === "auto" && narrowScreen);

  const groups = useMemo(() => {
    const map = new Map();
    rows.filter((r) => !r.parentId).forEach((r) => {
      if (!map.has(r.date)) map.set(r.date, []);
    });
    rows.forEach((r) => {
      if (r.parentId) return;
      map.get(r.date).push(r);
    });
    const sortedDates = Array.from(map.keys()).sort();
    return sortedDates.map((date) => ({
      date,
      rows: map.get(date),
    }));
  }, [rows]);

  function childrenOf(parentId) {
    return rows.filter((r) => r.parentId === parentId);
  }

  function updateRow(id, patch) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function deleteRow(id) {
    setRows((prev) => prev.filter((r) => r.id !== id && r.parentId !== id));
  }

  function addRow(date, parentId = null) {
    const nr = {
      id: uid(), parentId, date: date || new Date().toISOString().slice(0, 10),
      typeId: types[0].id, from: "", to: "", startTime: "", endTime: "", overnight: false,
      destination: "", link: "", mapLink: "", flightNumber: "", costAmount: 0, costCurrency: "₪",
      notes: "", custom: {},
    };
    setRows((prev) => [...prev, nr]);
    return nr.id;
  }

  function addGroup() {
    const last = groups[groups.length - 1];
    const base = last ? new Date(last.date + "T00:00:00") : new Date();
    if (last) base.setDate(base.getDate() + 1);
    addRow(base.toISOString().slice(0, 10));
  }

  function moveRow(id, dir) {
    setRows((prev) => {
      const row = prev.find((r) => r.id === id);
      const siblings = prev.filter((r) => r.date === row.date && r.parentId === row.parentId);
      const idx = siblings.findIndex((r) => r.id === id);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= siblings.length) return prev;
      const a = siblings[idx], b = siblings[swapIdx];
      const ai = prev.findIndex((r) => r.id === a.id);
      const bi = prev.findIndex((r) => r.id === b.id);
      const next = [...prev];
      [next[ai], next[bi]] = [next[bi], next[ai]];
      return next;
    });
  }

  function onDropRow(targetId) {
    if (!dragId || dragId === targetId) return;
    setRows((prev) => {
      const from = prev.find((r) => r.id === dragId);
      const to = prev.find((r) => r.id === targetId);
      if (!from || !to || from.date !== to.date || from.parentId !== to.parentId) return prev;
      const arr = [...prev];
      const fi = arr.findIndex((r) => r.id === dragId);
      const [moved] = arr.splice(fi, 1);
      const ti = arr.findIndex((r) => r.id === targetId);
      arr.splice(ti, 0, moved);
      return arr;
    });
    setDragId(null);
  }

  function toggleColumn(key) {
    setColumns((prev) => prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)));
  }

  function addCustomColumn() {
    if (!newColName.trim()) return;
    const key = "custom_" + uid();
    setColumns((prev) => [...prev, { key, label_he: newColName, label_en: newColName, visible: true, custom: true }]);
    setNewColName("");
  }

  function removeCustomColumn(key) {
    setColumns((prev) => prev.filter((c) => c.key !== key));
  }

  function addCustomType(rowIdToApply) {
    if (!newTypeDraft.name.trim()) return;
    const id = "custom-" + uid();
    const color = CUSTOM_COLOR_ROTATION[types.length % CUSTOM_COLOR_ROTATION.length];
    const t = { id, name: newTypeDraft.name, icon: newTypeDraft.icon, color };
    setTypes((prev) => [...prev, t]);
    if (rowIdToApply) updateRow(rowIdToApply, { typeId: id });
    setNewTypeDraft({ name: "", icon: "Tag" });
    setTypeMenuOpen(null);
  }

  function openCard(row) {
    setCardRowId(row.id);
    setCardDraft({ ...row });
  }

  function closeCard() {
    setCardRowId(null);
    setCardDraft(null);
  }

  function saveCard() {
    if (!cardDraft.date) return;
    const dur = computeDuration(cardDraft.startTime, cardDraft.endTime, cardDraft.overnight);
    if (dur === null) return; // invalid, block save
    updateRow(cardRowId, cardDraft);
    closeCard();
  }

  const cardHasTimeError =
    cardDraft && cardDraft.startTime && cardDraft.endTime &&
    computeDuration(cardDraft.startTime, cardDraft.endTime, cardDraft.overnight) === null;

  const totals = useMemo(() => {
    const t = {};
    rows.forEach((r) => {
      const amt = Number(r.costAmount) || 0;
      if (!amt) return;
      t[r.costCurrency] = (t[r.costCurrency] || 0) + amt;
    });
    return t;
  }, [rows]);

  const visibleColumns = columns.filter((c) => c.visible);

  return (
    <div className="mytrip-app" dir={dir}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@500;700&display=swap');

        .mytrip-app {
          --bg: #F5F8F6;
          --surface: #FFFFFF;
          --ink: #1E2A28;
          --muted: #6B7C76;
          --border: #DEE7E2;
          --teal: #256D64;
          --teal-dark: #174C45;
          --teal-tint: #E6F0EE;
          --amber: #D98E3F;
          --amber-tint: #FBEEDD;
          --danger: #C1443A;
          font-family: 'Heebo', sans-serif;
          background: var(--bg);
          color: var(--ink);
          min-height: 100vh;
          font-variant-numeric: tabular-nums;
        }
        .mytrip-app * { box-sizing: border-box; }
        .mytrip-app button { font-family: inherit; cursor: pointer; }

        .mt-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 22px; background: var(--surface); border-bottom: 1px solid var(--border);
          position: sticky; top: 0; z-index: 30;
        }
        .mt-brand { display: flex; align-items: center; gap: 10px; }
        .mt-brand-mark {
          width: 34px; height: 34px; border-radius: 9px; background: var(--teal);
          display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;
        }
        .mt-brand-mark::after {
          content: ''; position: absolute; width: 46px; height: 46px; border: 2px solid rgba(255,255,255,.35);
          border-radius: 50%; top: -14px; inset-inline-start: -8px;
        }
        .mt-brand-mark svg { color: #fff; width: 18px; height: 18px; z-index: 1; }
        .mt-brand-name { font-family: 'Frank Ruhl Libre', serif; font-size: 21px; font-weight: 700; letter-spacing: .2px; }

        .mt-header-actions { display: flex; align-items: center; gap: 8px; }
        .mt-icon-btn {
          border: 1px solid var(--border); background: var(--surface); color: var(--ink);
          border-radius: 8px; padding: 7px 10px; display: flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 500; transition: background .15s, border-color .15s;
        }
        .mt-icon-btn:hover { background: var(--teal-tint); border-color: var(--teal); }
        .mt-icon-btn.active { background: var(--teal); color: #fff; border-color: var(--teal); }
        .mt-icon-btn svg { width: 15px; height: 15px; }

        .mt-avatar {
          width: 30px; height: 30px; border-radius: 50%; background: var(--teal-tint); color: var(--teal-dark);
          display: flex; align-items: center; justify-content: center; border: 1px solid var(--border);
        }

        .mt-toolbar {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 12px 22px; flex-wrap: wrap;
        }
        .mt-toolbar-group { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

        .mt-columns-menu {
          position: absolute; margin-top: 6px; background: var(--surface); border: 1px solid var(--border);
          border-radius: 10px; box-shadow: 0 8px 24px rgba(20,40,35,.12); padding: 10px; z-index: 40; min-width: 220px;
        }
        .mt-columns-menu label { display: flex; align-items: center; gap: 8px; padding: 5px 4px; font-size: 13px; border-radius: 6px; }
        .mt-columns-menu label:hover { background: var(--bg); }
        .mt-columns-menu .divider { height: 1px; background: var(--border); margin: 6px 0; }
        .mt-columns-menu input[type=text] {
          width: 100%; border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; font-size: 13px; margin-bottom: 6px;
        }

        .mt-content { padding: 0 22px 40px; }

        .mt-group { margin-top: 18px; }
        .mt-group-header {
          display: flex; align-items: center; gap: 10px; padding: 9px 6px; cursor: pointer; user-select: none;
        }
        .mt-group-header .chev { color: var(--muted); display: flex; }
        .mt-group-date { font-weight: 700; font-size: 15px; }
        .mt-group-day {
          background: var(--teal-tint); color: var(--teal-dark); font-size: 12px; font-weight: 600;
          padding: 2px 9px; border-radius: 20px;
        }
        .mt-group-add {
          margin-inline-start: auto; font-size: 12.5px; color: var(--teal); display: flex; align-items: center; gap: 4px;
          background: none; border: none; font-weight: 600;
        }
        .mt-group-add:hover { text-decoration: underline; }

        table.mt-table { width: 100%; border-collapse: separate; border-spacing: 0; background: var(--surface); border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }
        .mt-table thead th {
          text-align: start; font-size: 11.5px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted);
          font-weight: 600; padding: 9px 10px; background: #FAFCFB; border-bottom: 1px solid var(--border);
        }
        .mt-table tbody td { padding: 8px 10px; font-size: 13.5px; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .mt-table tbody tr:last-child td { border-bottom: none; }
        .mt-table tbody tr:hover { background: #FBFDFC; }
        .mt-table tbody tr.is-sub td:first-child { position: relative; }

        .mt-row-journey { display: flex; align-items: center; gap: 8px; }
        .mt-row-journey .line-wrap { position: relative; width: 14px; display: flex; justify-content: center; align-self: stretch; }
        .mt-row-journey .dot { width: 8px; height: 8px; border-radius: 50%; z-index: 1; }
        .mt-row-journey .line { position: absolute; top: -14px; bottom: -14px; width: 2px; background: var(--border); }

        .mt-type-chip { display: flex; align-items: center; gap: 6px; }
        .mt-type-icon {
          width: 24px; height: 24px; border-radius: 7px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .mt-type-icon svg { width: 13px; height: 13px; color: #fff; }
        .mt-type-btn { border: none; background: none; padding: 0; display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 500; color: var(--ink); }

        .mt-editable { border: 1px solid transparent; border-radius: 6px; padding: 3px 6px; font-size: 13.5px; width: 100%; background: transparent; font-family: inherit; color: var(--ink); }
        .mt-editable:hover { border-color: var(--border); }
        .mt-editable:focus { outline: none; border-color: var(--teal); background: #fff; }

        .mt-cost { display: flex; align-items: center; gap: 4px; font-weight: 600; color: var(--amber); }
        .mt-link-cell a { color: var(--teal); font-size: 12.5px; display: flex; align-items: center; gap: 4px; text-decoration: none; }
        .mt-link-cell a:hover { text-decoration: underline; }

        .mt-row-actions { display: flex; align-items: center; gap: 3px; opacity: 0; transition: opacity .1s; }
        .mt-table tbody tr:hover .mt-row-actions { opacity: 1; }
        .mt-row-actions button { border: none; background: none; color: var(--muted); padding: 4px; border-radius: 5px; display: flex; }
        .mt-row-actions button:hover { background: var(--teal-tint); color: var(--teal-dark); }
        .mt-row-actions svg { width: 14px; height: 14px; }
        .mt-drag-handle { cursor: grab; color: var(--border); }
        .mt-drag-handle:hover { color: var(--muted); }

        .mt-empty { padding: 18px; text-align: center; color: var(--muted); font-size: 13px; background: var(--surface); border: 1px dashed var(--border); border-radius: 12px; }

        .mt-summary { margin-top: 20px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .mt-summary-label { font-size: 12.5px; color: var(--muted); font-weight: 600; }
        .mt-chip { background: var(--amber-tint); color: #8A5A1F; font-weight: 700; font-size: 13px; padding: 5px 12px; border-radius: 20px; }

        /* type dropdown */
        .mt-type-menu { position: absolute; z-index: 50; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 8px 24px rgba(20,40,35,.14); padding: 6px; min-width: 190px; margin-top: 4px; }
        .mt-type-menu button.opt { width: 100%; display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 7px; background: none; border: none; font-size: 13px; text-align: start; }
        .mt-type-menu button.opt:hover { background: var(--bg); }
        .mt-type-menu .divider { height: 1px; background: var(--border); margin: 6px 2px; }
        .mt-type-new-form { padding: 6px 4px; }
        .mt-type-new-form input[type=text] { width: 100%; border: 1px solid var(--border); border-radius: 6px; padding: 5px 8px; font-size: 12.5px; margin-bottom: 6px; }
        .mt-icon-pick-row { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 8px; }
        .mt-icon-pick { width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); display: flex; align-items: center; justify-content: center; }
        .mt-icon-pick.sel { background: var(--teal); border-color: var(--teal); }
        .mt-icon-pick.sel svg { color: #fff; }
        .mt-icon-pick svg { width: 13px; height: 13px; color: var(--muted); }

        /* modal */
        .mt-modal-backdrop { position: fixed; inset: 0; background: rgba(20,35,32,.4); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
        .mt-modal { background: var(--surface); border-radius: 16px; width: 100%; max-width: 460px; max-height: 86vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,.25); }
        .mt-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface); }
        .mt-modal-title { font-family: 'Frank Ruhl Libre', serif; font-size: 18px; font-weight: 700; }
        .mt-modal-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
        .mt-field label { display: block; font-size: 12px; font-weight: 600; color: var(--muted); margin-bottom: 5px; }
        .mt-field input, .mt-field select { width: 100%; border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; font-size: 13.5px; font-family: inherit; background: #fff; }
        .mt-field input:focus, .mt-field select:focus { outline: none; border-color: var(--teal); }
        .mt-field-row { display: flex; gap: 10px; }
        .mt-field-row > div { flex: 1; }
        .mt-checkbox-row { display: flex; align-items: center; gap: 7px; font-size: 13px; }
        .mt-error { display: flex; gap: 6px; align-items: flex-start; background: #FBEAE8; color: var(--danger); font-size: 12px; padding: 8px 10px; border-radius: 8px; }
        .mt-error svg { width: 14px; height: 14px; flex-shrink: 0; margin-top: 1px; }
        .mt-modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 20px; border-top: 1px solid var(--border); position: sticky; bottom: 0; background: var(--surface); }
        .mt-btn { border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 600; border: 1px solid var(--border); background: #fff; }
        .mt-btn.primary { background: var(--teal); color: #fff; border-color: var(--teal); }
        .mt-btn.primary:disabled { opacity: .5; cursor: not-allowed; }
        .mt-btn.ghost { border-color: transparent; color: var(--muted); }
        .mt-btn.danger { color: var(--danger); border-color: transparent; }

        /* mobile cards */
        .mt-cards { display: flex; flex-direction: column; gap: 10px; }
        .mt-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
        .mt-card-top { display: flex; align-items: center; justify-content: space-between; }
        .mt-card-times { font-size: 12.5px; color: var(--muted); }
        .mt-card-dest { font-size: 13.5px; font-weight: 600; }
        .mt-card-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 2px; }

        .mt-note { font-size: 11.5px; color: var(--muted); margin-top: 4px; }
        select.mt-editable { appearance: none; }
      `}</style>

      {/* Header */}
      <div className="mt-header">
        <div className="mt-brand">
          <div className="mt-brand-mark"><Plane /></div>
          <span className="mt-brand-name">{T.appName}</span>
        </div>
        <div className="mt-header-actions">
          <button className="mt-icon-btn" onClick={() => setLang(lang === "he" ? "en" : "he")}>
            <Globe /> {T.lang}
          </button>
          <button
            className={"mt-icon-btn" + (viewMode === "desktop" ? " active" : "")}
            onClick={() => setViewMode("desktop")}
            title={T.desktop}
          ><Monitor /></button>
          <button
            className={"mt-icon-btn" + (viewMode === "mobile" ? " active" : "")}
            onClick={() => setViewMode("mobile")}
            title={T.mobile}
          ><Smartphone /></button>
          {!loggedIn ? (
            <button className="mt-icon-btn" onClick={() => setLoggedIn(true)}>
              <LogIn /> {T.login}
            </button>
          ) : (
            <button className="mt-icon-btn" onClick={() => setLoggedIn(false)} title={T.mockNote}>
              <span className="mt-avatar"><User size={15} /></span> {T.logout}
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-toolbar">
        <div className="mt-toolbar-group">
          <button className="mt-icon-btn" onClick={addGroup}><Plus /> {T.addGroup}</button>
        </div>
        <div className="mt-toolbar-group" style={{ position: "relative" }}>
          <button className="mt-icon-btn" onClick={() => setColMenuOpen((v) => !v)}>
            <Settings2 /> {T.columns}
          </button>
          {colMenuOpen && (
            <div className="mt-columns-menu" style={{ insetInlineEnd: 0 }}>
              {columns.map((c) => (
                <label key={c.key}>
                  <input type="checkbox" checked={c.visible} disabled={c.locked}
                    onChange={() => toggleColumn(c.key)} />
                  {lang === "he" ? c.label_he : c.label_en}
                  {c.custom && (
                    <button className="mt-btn ghost" style={{ padding: "2px 6px", marginInlineStart: "auto" }}
                      onClick={(e) => { e.preventDefault(); removeCustomColumn(c.key); }}>
                      <X size={12} />
                    </button>
                  )}
                </label>
              ))}
              <div className="divider" />
              <input type="text" placeholder={T.addColumn} value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomColumn()} />
              <button className="mt-btn primary" style={{ width: "100%" }} onClick={addCustomColumn}>
                <Plus size={13} /> {T.addColumn}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mt-content">
        {effectiveMobile ? (
          groups.map((g) => (
            <GroupBlock key={g.date} g={g} lang={lang} T={T}
              collapsedGroups={collapsedGroups} setCollapsedGroups={setCollapsedGroups}
              onAddRow={addRow}>
              <div className="mt-cards">
                {g.rows.length === 0 && <div className="mt-empty">{T.noRows}</div>}
                {g.rows.flatMap((r) => [r, ...childrenOf(r.id)]).map((r) => {
                  const tm = typeMeta(r.typeId, types);
                  const Icon = ICONS[tm.icon] || Tag;
                  return (
                    <div className="mt-card" key={r.id} onClick={() => openCard(r)}>
                      <div className="mt-card-top">
                        <div className="mt-type-chip">
                          <span className="mt-type-icon" style={{ background: tm.color }}><Icon /></span>
                          <strong style={{ fontSize: 13.5 }}>{tm.name}</strong>
                        </div>
                        <span className="mt-card-times">{r.startTime || "—"}{r.endTime ? ` – ${r.endTime}` : ""}</span>
                      </div>
                      <div className="mt-card-dest">{r.destination || "—"}</div>
                      <div className="mt-card-bottom">
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>{r.from}{r.from && r.to ? " → " : ""}{r.to}</span>
                        {Number(r.costAmount) > 0 && <span className="mt-cost">{r.costCurrency}{r.costAmount}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </GroupBlock>
          ))
        ) : (
          groups.map((g) => (
            <GroupBlock key={g.date} g={g} lang={lang} T={T}
              collapsedGroups={collapsedGroups} setCollapsedGroups={setCollapsedGroups}
              onAddRow={addRow}>
              {g.rows.length === 0 ? (
                <div className="mt-empty">{T.noRows}</div>
              ) : (
                <table className="mt-table">
                  <thead>
                    <tr>
                      <th style={{ width: 26 }}></th>
                      {visibleColumns.map((c) => (
                        <th key={c.key}>{lang === "he" ? c.label_he : c.label_en}</th>
                      ))}
                      <th style={{ width: 70 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r) => (
                      <React.Fragment key={r.id}>
                        <RowLine
                          row={r} depth={0} lang={lang} T={T} types={types}
                          visibleColumns={visibleColumns}
                          updateRow={updateRow} deleteRow={deleteRow}
                          openCard={openCard} addRow={addRow}
                          hasChildren={childrenOf(r.id).length > 0}
                          collapsed={!!collapsedParents[r.id]}
                          toggleCollapse={() => setCollapsedParents((p) => ({ ...p, [r.id]: !p[r.id] }))}
                          typeMenuOpen={typeMenuOpen} setTypeMenuOpen={setTypeMenuOpen}
                          newTypeDraft={newTypeDraft} setNewTypeDraft={setNewTypeDraft}
                          addCustomType={addCustomType}
                          moveRow={moveRow} dragId={dragId} setDragId={setDragId} onDropRow={onDropRow}
                        />
                        {!collapsedParents[r.id] && childrenOf(r.id).map((child) => (
                          <RowLine
                            key={child.id} row={child} depth={1} lang={lang} T={T} types={types}
                            visibleColumns={visibleColumns}
                            updateRow={updateRow} deleteRow={deleteRow}
                            openCard={openCard} addRow={addRow}
                            hasChildren={false} collapsed={false} toggleCollapse={() => {}}
                            typeMenuOpen={typeMenuOpen} setTypeMenuOpen={setTypeMenuOpen}
                            newTypeDraft={newTypeDraft} setNewTypeDraft={setNewTypeDraft}
                            addCustomType={addCustomType}
                            moveRow={moveRow} dragId={dragId} setDragId={setDragId} onDropRow={onDropRow}
                          />
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </GroupBlock>
          ))
        )}

        <div className="mt-summary">
          <span className="mt-summary-label">{T.totalPerCurrency}:</span>
          {Object.keys(totals).length === 0 && <span style={{ fontSize: 13, color: "var(--muted)" }}>—</span>}
          {Object.entries(totals).map(([cur, amt]) => (
            <span className="mt-chip" key={cur}>{cur} {amt.toLocaleString()}</span>
          ))}
        </div>
        <div className="mt-note">{loggedIn ? T.mockNote : ""}</div>
      </div>

      {/* Record card modal */}
      {cardDraft && (
        <div className="mt-modal-backdrop" onClick={closeCard}>
          <div className="mt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header">
              <span className="mt-modal-title">{T.editRecord}</span>
              <button className="mt-btn ghost" onClick={closeCard}><X size={16} /></button>
            </div>
            <div className="mt-modal-body">
              <div className="mt-field-row">
                <div className="mt-field">
                  <label>{T.type}</label>
                  <select className="mt-editable" style={{ border: "1px solid var(--border)" }}
                    value={cardDraft.typeId}
                    onChange={(e) => setCardDraft({ ...cardDraft, typeId: e.target.value })}>
                    {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="mt-field">
                  <label>תאריך</label>
                  <input type="date" value={cardDraft.date}
                    onChange={(e) => setCardDraft({ ...cardDraft, date: e.target.value })} />
                </div>
              </div>

              <div className="mt-field-row">
                <div className="mt-field">
                  <label>{T.from}</label>
                  <input value={cardDraft.from} onChange={(e) => setCardDraft({ ...cardDraft, from: e.target.value })} />
                </div>
                <div className="mt-field">
                  <label>{T.to}</label>
                  <input value={cardDraft.to} onChange={(e) => setCardDraft({ ...cardDraft, to: e.target.value })} />
                </div>
              </div>

              <div className="mt-field-row">
                <div className="mt-field">
                  <label>{T.start}</label>
                  <input type="time" value={cardDraft.startTime}
                    onChange={(e) => setCardDraft({ ...cardDraft, startTime: e.target.value })} />
                </div>
                <div className="mt-field">
                  <label>{T.end}</label>
                  <input type="time" value={cardDraft.endTime}
                    onChange={(e) => setCardDraft({ ...cardDraft, endTime: e.target.value })} />
                </div>
              </div>
              <label className="mt-checkbox-row">
                <input type="checkbox" checked={!!cardDraft.overnight}
                  onChange={(e) => setCardDraft({ ...cardDraft, overnight: e.target.checked })} />
                {T.overnight}
              </label>

              {cardHasTimeError && (
                <div className="mt-error"><AlertTriangle /> {T.timeError}</div>
              )}

              <div className="mt-field">
                <label>{T.destination}</label>
                <input value={cardDraft.destination} onChange={(e) => setCardDraft({ ...cardDraft, destination: e.target.value })} />
              </div>

              {(cardDraft.typeId === "flight" || cardDraft.typeId === "domestic-flight") && (
                <div className="mt-field">
                  <label>{T.flightNo}</label>
                  <input value={cardDraft.flightNumber || ""} onChange={(e) => setCardDraft({ ...cardDraft, flightNumber: e.target.value })} />
                </div>
              )}

              <div className="mt-field">
                <label>{T.link}</label>
                <input value={cardDraft.link} placeholder="https://..." onChange={(e) => setCardDraft({ ...cardDraft, link: e.target.value })} />
              </div>

              {["hotel", "self-tour", "guided-tour", "day-tour", "ferry", "car-rental"].includes(cardDraft.typeId) && (
                <div className="mt-field">
                  <label>{T.maplink}</label>
                  <input value={cardDraft.mapLink || ""} placeholder="https://maps.google.com/..." onChange={(e) => setCardDraft({ ...cardDraft, mapLink: e.target.value })} />
                </div>
              )}

              <div className="mt-field-row">
                <div className="mt-field">
                  <label>{T.cost}</label>
                  <input type="number" value={cardDraft.costAmount}
                    onChange={(e) => setCardDraft({ ...cardDraft, costAmount: e.target.value })} />
                </div>
                <div className="mt-field">
                  <label>{T.currency}</label>
                  <select value={cardDraft.costCurrency}
                    onChange={(e) => setCardDraft({ ...cardDraft, costCurrency: e.target.value })}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-field">
                <label>{T.notes}</label>
                <input value={cardDraft.notes || ""} onChange={(e) => setCardDraft({ ...cardDraft, notes: e.target.value })} />
              </div>

              {columns.filter((c) => c.custom).map((c) => (
                <div className="mt-field" key={c.key}>
                  <label>{lang === "he" ? c.label_he : c.label_en}</label>
                  <input value={(cardDraft.custom && cardDraft.custom[c.key]) || ""}
                    onChange={(e) => setCardDraft({ ...cardDraft, custom: { ...cardDraft.custom, [c.key]: e.target.value } })} />
                </div>
              ))}
            </div>
            <div className="mt-modal-footer">
              {!cardDraft.parentId && (
                <button className="mt-btn ghost" style={{ marginInlineEnd: "auto" }}
                  onClick={() => { const id = addRow(cardDraft.date, cardRowId); closeCard(); const nr = { id }; }}>
                  <Plus size={13} /> {T.addSub}
                </button>
              )}
              <button className="mt-btn danger" onClick={() => { deleteRow(cardRowId); closeCard(); }}>
                <Trash2 size={13} /> {T.delete}
              </button>
              <button className="mt-btn ghost" onClick={closeCard}>{T.cancel}</button>
              <button className="mt-btn primary" disabled={!cardDraft.date || cardHasTimeError} onClick={saveCard}>
                <Check size={13} /> {T.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupBlock({ g, lang, T, collapsedGroups, setCollapsedGroups, onAddRow, children }) {
  const collapsed = !!collapsedGroups[g.date];
  return (
    <div className="mt-group">
      <div className="mt-group-header" onClick={() => setCollapsedGroups((p) => ({ ...p, [g.date]: !p[g.date] }))}>
        <span className="chev">{collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</span>
        <span className="mt-group-date">{fmtDate(g.date, lang)}</span>
        <span className="mt-group-day">{heDay(g.date, lang)}</span>
        <button className="mt-group-add" onClick={(e) => { e.stopPropagation(); onAddRow(g.date); }}>
          <Plus size={13} /> {T.addRow}
        </button>
      </div>
      {!collapsed && children}
    </div>
  );
}

function RowLine({
  row, depth, lang, T, types, visibleColumns, updateRow, deleteRow, openCard, addRow,
  hasChildren, collapsed, toggleCollapse, typeMenuOpen, setTypeMenuOpen,
  newTypeDraft, setNewTypeDraft, addCustomType, moveRow, dragId, setDragId, onDropRow
}) {
  const tm = typeMeta(row.typeId, types);
  const Icon = ICONS[tm.icon] || Tag;
  const dur = computeDuration(row.startTime, row.endTime, row.overnight);

  function renderCell(col) {
    switch (col.key) {
      case "date":
        return depth === 0 ? fmtDate(row.date, lang) : "";
      case "day":
        return depth === 0 ? heDay(row.date, lang) : "";
      case "icon":
        return <span className="mt-type-icon" style={{ background: tm.color }}><Icon /></span>;
      case "type":
        return (
          <div style={{ position: "relative" }}>
            <button className="mt-type-btn" onClick={() => setTypeMenuOpen(typeMenuOpen === row.id ? null : row.id)}>
              {tm.name} <ChevronDown size={12} />
            </button>
            {typeMenuOpen === row.id && (
              <div className="mt-type-menu">
                {types.map((t) => {
                  const TI = ICONS[t.icon] || Tag;
                  return (
                    <button key={t.id} className="opt" onClick={() => { updateRow(row.id, { typeId: t.id }); setTypeMenuOpen(null); }}>
                      <span className="mt-type-icon" style={{ background: t.color, width: 20, height: 20 }}><TI size={11} /></span>
                      {t.name}
                    </button>
                  );
                })}
                <div className="divider" />
                <div className="mt-type-new-form">
                  <input type="text" placeholder={T.typeName} value={newTypeDraft.name}
                    onChange={(e) => setNewTypeDraft({ ...newTypeDraft, name: e.target.value })} />
                  <div className="mt-icon-pick-row">
                    {ICON_PALETTE.map((ic) => {
                      const PI = ICONS[ic];
                      return (
                        <button key={ic} className={"mt-icon-pick" + (newTypeDraft.icon === ic ? " sel" : "")}
                          onClick={() => setNewTypeDraft({ ...newTypeDraft, icon: ic })}>
                          <PI />
                        </button>
                      );
                    })}
                  </div>
                  <button className="mt-btn primary" style={{ width: "100%" }} onClick={() => addCustomType(row.id)}>
                    <Plus size={12} /> {T.add}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      case "from":
        return <input className="mt-editable" value={row.from} onChange={(e) => updateRow(row.id, { from: e.target.value })} />;
      case "to":
        return <input className="mt-editable" value={row.to} onChange={(e) => updateRow(row.id, { to: e.target.value })} />;
      case "startTime":
        return <input className="mt-editable" type="time" value={row.startTime} onChange={(e) => updateRow(row.id, { startTime: e.target.value })} />;
      case "duration":
        return <span style={{ color: dur === null ? "var(--danger)" : "var(--muted)", fontSize: 12.5 }}>{dur === null ? "!" : dur}</span>;
      case "endTime":
        return <input className="mt-editable" type="time" value={row.endTime} onChange={(e) => updateRow(row.id, { endTime: e.target.value })} />;
      case "destination":
        return <input className="mt-editable" value={row.destination} onChange={(e) => updateRow(row.id, { destination: e.target.value })} />;
      case "link":
        return row.link ? (
          <div className="mt-link-cell"><a href={row.link} target="_blank" rel="noreferrer"><Link2 size={12} /> {row.link.replace(/^https?:\/\//, "").slice(0, 20)}</a></div>
        ) : (
          <input className="mt-editable" placeholder="https://..." value={row.link} onChange={(e) => updateRow(row.id, { link: e.target.value })} />
        );
      case "cost":
        return (
          <span className="mt-cost">
            {row.costCurrency}
            <input className="mt-editable" type="number" style={{ width: 60, fontWeight: 600, color: "var(--amber)" }}
              value={row.costAmount} onChange={(e) => updateRow(row.id, { costAmount: e.target.value })} />
          </span>
        );
      default:
        if (col.custom) {
          return <input className="mt-editable" value={(row.custom && row.custom[col.key]) || ""}
            onChange={(e) => updateRow(row.id, { custom: { ...row.custom, [col.key]: e.target.value } })} />;
        }
        return null;
    }
  }

  return (
    <tr
      className={depth > 0 ? "is-sub" : ""}
      draggable
      onDragStart={() => setDragId(row.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDropRow(row.id)}
      style={{ opacity: dragId === row.id ? 0.4 : 1 }}
    >
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 4, paddingInlineStart: depth * 16 }}>
          <span className="mt-drag-handle" title={T.dragHint}><GripVertical size={13} /></span>
          {hasChildren && (
            <button onClick={toggleCollapse} style={{ border: "none", background: "none", display: "flex", color: "var(--muted)" }}>
              {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>
      </td>
      {visibleColumns.map((col) => (
        <td key={col.key}>{renderCell(col)}</td>
      ))}
      <td>
        <div className="mt-row-actions">
          <button onClick={() => openCard(row)} title={T.editRecord}><Pencil /></button>
          {depth === 0 && (
            <button onClick={() => addRow(row.date, row.id)} title={T.addSub}><Plus /></button>
          )}
          <button onClick={() => deleteRow(row.id)} title={T.delete}><Trash2 /></button>
        </div>
      </td>
    </tr>
  );
}
