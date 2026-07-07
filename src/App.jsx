import React, { useState, useMemo, useEffect } from "react";
import {
  Plane, PlaneTakeoff, Car, BedDouble, Footprints, Users, Sun, Ship, KeySquare,
  Tag, Star, Flag, Camera, Utensils, ShoppingBag, Music, ChevronDown, ChevronRight,
  Plus, X, Settings2, Pencil, Trash2, Link2, Globe, LogIn, User,
  Smartphone, Monitor, AlertTriangle, GripVertical, Check, FolderPlus, Sparkles
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/*  MyTrip — trip-planning table prototype                                 */
/*  v2: nested date-range "frames" (trip legs) + compacted columns         */
/*  Design: pale sage bg, deep teal brand, warm amber cost accent.         */
/*  Display face "Frank Ruhl Libre", UI/data face "Heebo" (tabular nums).  */
/* ---------------------------------------------------------------------- */

const ICONS = { Plane, PlaneTakeoff, Car, BedDouble, Footprints, Users, Sun, Ship, KeySquare, Tag, Star, Flag, Camera, Utensils, ShoppingBag, Music };
const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const EN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FRAME_COLORS = ["#256D64", "#3E7CB1", "#8B6F47", "#7A5C9E", "#C1443A", "#5B8C5A"];
const CURRENCIES = ["₪", "$", "€", "£"];

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

const DEFAULT_COLUMNS = [
  { key: "date", label_he: "תאריך", label_en: "Date", visible: false },
  { key: "day", label_he: "יום", label_en: "Day", visible: false },
  { key: "icon", label_he: "סמל", label_en: "Icon", visible: true },
  { key: "type", label_he: "תיאור", label_en: "Description", visible: true },
  { key: "from", label_he: "מ...", label_en: "From", visible: true },
  { key: "to", label_he: "ל...", label_en: "To", visible: true },
  { key: "startTime", label_he: "בשעה", label_en: "At", visible: true },
  { key: "duration", label_he: "משך", label_en: "Dur.", visible: true },
  { key: "endTime", label_he: "עד שעה", label_en: "Until", visible: true },
  { key: "destination", label_he: "שם היעד", label_en: "Destination", visible: true },
  { key: "link", label_he: "קישור", label_en: "Link", visible: true },
  { key: "cost", label_he: "עלות", label_en: "Cost", visible: true },
];

const T_DICT = {
  he: {
    appName: "MyTrip", addRow: "הוסף שורה", addDay: "הוסף יום", newFrame: "מסגרת חדשה",
    columns: "עמודות", addColumn: "הוסף עמודה",
    login: "התחברות עם Google", logout: "יציאה",
    desktop: "מחשב", mobile: "סלולר", lang: "English", editRecord: "כרטיס רשומה",
    save: "שמירה", cancel: "ביטול", delete: "מחיקה", addSub: "הוסף תת-רשומה",
    type: "סוג", from: "מ", to: "ל", start: "בשעה", end: "עד שעה", overnight: "חוצה חצות",
    destination: "שם היעד", link: "קישור להזמנה", maplink: "קישור למיקום / מסלול",
    flightNo: "מספר טיסה", cost: "עלות", currency: "מטבע", notes: "הערות", frame: "מסגרת",
    noFrame: "ללא מסגרת (רמה עליונה)",
    newType: "סוג חדש", typeName: "שם הסוג", add: "הוספה",
    totalPerCurrency: "סה״כ טיול", timeError: "שעת סיום לפני שעת ההתחלה — סמן \"חוצה חצות\" אם מדובר בלילה",
    noRows: "אין עדיין רשומות כאן", dragHint: "גרירה לשינוי סדר", mockNote: "*הדמיית התחברות בלבד בפרוטוטייפ",
    frameModalNew: "מסגרת טיול חדשה", frameModalEdit: "עריכת מסגרת", frameName: "שם המסגרת",
    frameStart: "תאריך התחלה", frameEnd: "תאריך סיום", parentFrame: "שייכת למסגרת",
    addSubFrame: "הוסף מסגרת-משנה", suggestPrefix: "זוהו", suggestMid: "טיסות ללא מסגרת:",
    suggestBtn: "צור מסגרת טיול אוטומטית", suggestDismiss: "התעלם",
  },
  en: {
    appName: "MyTrip", addRow: "Add row", addDay: "Add day", newFrame: "New frame",
    columns: "Columns", addColumn: "Add column",
    login: "Sign in with Google", logout: "Sign out",
    desktop: "Desktop", mobile: "Mobile", lang: "עברית", editRecord: "Record card",
    save: "Save", cancel: "Cancel", delete: "Delete", addSub: "Add sub-record",
    type: "Type", from: "From", to: "To", start: "At", end: "Until", overnight: "Crosses midnight",
    destination: "Destination", link: "Booking link", maplink: "Map / route link",
    flightNo: "Flight number", cost: "Cost", currency: "Currency", notes: "Notes", frame: "Frame",
    noFrame: "No frame (top level)",
    newType: "New type", typeName: "Type name", add: "Add",
    totalPerCurrency: "Trip total", timeError: "End time is before start time — check \"crosses midnight\" for overnight legs",
    noRows: "No records here yet", dragHint: "Drag to reorder", mockNote: "*Sign-in is a prototype mock only",
    frameModalNew: "New trip frame", frameModalEdit: "Edit frame", frameName: "Frame name",
    frameStart: "Start date", frameEnd: "End date", parentFrame: "Belongs to frame",
    addSubFrame: "Add sub-frame", suggestPrefix: "Found", suggestMid: "flights without a frame:",
    suggestBtn: "Auto-create a trip frame", suggestDismiss: "Dismiss",
  }
};

function uid() { return Math.random().toString(36).slice(2, 10); }
function heDay(dateStr, lang) { if (!dateStr) return "—"; const d = new Date(dateStr + "T00:00:00"); if (isNaN(d)) return "—"; return lang === "he" ? HE_DAYS[d.getDay()] : EN_DAYS[d.getDay()]; }
function fmtDate(dateStr, lang) { if (!dateStr) return "—"; const d = new Date(dateStr + "T00:00:00"); if (isNaN(d)) return dateStr; const dd = String(d.getDate()).padStart(2, "0"); const mm = String(d.getMonth() + 1).padStart(2, "0"); return `${dd}/${mm}/${d.getFullYear()}`; }
function computeDuration(start, end, overnight) {
  if (!start || !end) return "—";
  const [sh, sm] = start.split(":").map(Number); const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return "—";
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (overnight && mins < 0) mins += 24 * 60;
  if (mins < 0) return null;
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}
function typeMeta(typeId, types) { return types.find((t) => t.id === typeId) || types[0]; }

function initialRows() {
  const base = [
    { date: "2026-09-10", typeId: "flight", from: "תל אביב TLV", to: "רומא FCO", startTime: "07:40", endTime: "10:35", destination: "פיומיצ׳ינו", link: "https://www.google.com/flights", costAmount: 1450, costCurrency: "₪", flightNumber: "LY386" },
    { date: "2026-09-10", typeId: "taxi", from: "שדה תעופה", to: "מלון רומא", startTime: "11:15", endTime: "12:00", destination: "רומא — טרסטבר", costAmount: 45, costCurrency: "€" },
    { date: "2026-09-10", typeId: "hotel", from: "", to: "", startTime: "15:00", endTime: "", destination: "Hotel Trastevere", link: "https://www.booking.com", costAmount: 620, costCurrency: "€" },
    { date: "2026-09-11", typeId: "guided-tour", from: "", to: "", startTime: "09:00", endTime: "13:00", destination: "הקולוסיאום ופורום רומאנום", link: "https://maps.google.com", costAmount: 280, costCurrency: "€" },
    { date: "2026-09-11", typeId: "self-tour", from: "", to: "", startTime: "16:00", endTime: "19:30", destination: "טרסטבר — שיטוט וקניות", costAmount: 0, costCurrency: "€" },
    { date: "2026-09-14", typeId: "flight", from: "רומא FCO", to: "תל אביב TLV", startTime: "18:20", endTime: "21:50", destination: "נתב״ג", costAmount: 1390, costCurrency: "₪", flightNumber: "LY387" },
  ];
  return base.map((r) => ({ id: uid(), parentId: null, frameId: null, overnight: false, notes: "", mapLink: "", custom: {}, ...r }));
}

export default function MyTripApp() {
  const [rows, setRows] = useState(initialRows);
  const [frames, setFrames] = useState([]);
  const [types, setTypes] = useState(DEFAULT_TYPES);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [lang, setLang] = useState("he");
  const [viewMode, setViewMode] = useState("auto");
  const [narrowScreen, setNarrowScreen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [collapsedParents, setCollapsedParents] = useState({});
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [typeMenuOpen, setTypeMenuOpen] = useState(null);
  const [newTypeDraft, setNewTypeDraft] = useState({ name: "", icon: "Tag" });
  const [cardRowId, setCardRowId] = useState(null);
  const [cardDraft, setCardDraft] = useState(null);
  const [frameDraft, setFrameDraft] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dismissedKey, setDismissedKey] = useState("");
  const dir = lang === "he" ? "rtl" : "ltr";
  const T = T_DICT[lang];

  useEffect(() => {
    function onResize() { setNarrowScreen(window.innerWidth < 780); }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const effectiveMobile = viewMode === "mobile" || (viewMode === "auto" && narrowScreen);
  const visibleColumns = columns.filter((c) => c.visible);

  /* ---------- data helpers ---------- */
  function childrenOf(parentId) { return rows.filter((r) => r.parentId === parentId); }
  function childFrames(pid) { return frames.filter((f) => f.parentFrameId === pid).sort((a, b) => (a.startDate || "").localeCompare(b.startDate || "")); }
  function rowsAt(fid) { return rows.filter((r) => !r.parentId && (r.frameId || null) === (fid || null)); }
  function dayGroupsAt(fid) {
    const list = rowsAt(fid); const map = new Map();
    list.forEach((r) => { if (!map.has(r.date)) map.set(r.date, []); map.get(r.date).push(r); });
    return Array.from(map.keys()).sort().map((date) => ({ date, rows: map.get(date) }));
  }
  function collectRowsUnder(fid) {
    let result = rowsAt(fid).slice();
    const extra = [];
    result.forEach((r) => extra.push(...childrenOf(r.id)));
    result = result.concat(extra);
    childFrames(fid).forEach((cf) => { result = result.concat(collectRowsUnder(cf.id)); });
    return result;
  }
  function frameTotals(fid) {
    const t = {};
    collectRowsUnder(fid).forEach((r) => { const amt = Number(r.costAmount) || 0; if (!amt) return; t[r.costCurrency] = (t[r.costCurrency] || 0) + amt; });
    return t;
  }
  function frameOptionsList(excludeId) {
    const result = [];
    function walk(list, depth) {
      list.forEach((f) => {
        if (f.id === excludeId) return;
        result.push({ id: f.id, label: "—".repeat(depth) + " " + f.name });
        walk(childFrames(f.id), depth + 1);
      });
    }
    walk(childFrames(null), 0);
    return result;
  }
  function nextSuggestedDate() {
    const all = rows.map((r) => r.date).filter(Boolean).sort();
    if (!all.length) return new Date().toISOString().slice(0, 10);
    const d = new Date(all[all.length - 1] + "T00:00:00"); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  const grandTotals = useMemo(() => {
    const t = {};
    rows.forEach((r) => { const amt = Number(r.costAmount) || 0; if (!amt) return; t[r.costCurrency] = (t[r.costCurrency] || 0) + amt; });
    return t;
  }, [rows]);

  const unassignedFlights = useMemo(
    () => rows.filter((r) => !r.parentId && !r.frameId && (r.typeId === "flight" || r.typeId === "domestic-flight")).sort((a, b) => a.date.localeCompare(b.date)),
    [rows]
  );
  const suggestionKey = unassignedFlights.map((r) => r.id).join(",");
  const showSuggestion = unassignedFlights.length >= 2 && suggestionKey !== dismissedKey;

  function createFrameFromSuggestion() {
    const dates = unassignedFlights.map((r) => r.date).sort();
    const start = dates[0], end = dates[dates.length - 1];
    const nf = { id: uid(), name: lang === "he" ? "טיול חדש" : "New trip", startDate: start, endDate: end, parentFrameId: null, collapsed: false };
    setFrames((prev) => [...prev, nf]);
    setRows((prev) => prev.map((r) => (!r.parentId && !r.frameId && r.date >= start && r.date <= end) ? { ...r, frameId: nf.id } : r));
    setDismissedKey(suggestionKey);
  }

  /* ---------- row mutators ---------- */
  function updateRow(id, patch) { setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r))); }
  function deleteRow(id) { setRows((prev) => prev.filter((r) => r.id !== id && r.parentId !== id)); }
  function addRow(date, parentId = null, frameId = null) {
    const nr = {
      id: uid(), parentId, frameId, date: date || new Date().toISOString().slice(0, 10),
      typeId: types[0].id, from: "", to: "", startTime: "", endTime: "", overnight: false,
      destination: "", link: "", mapLink: "", flightNumber: "", costAmount: 0, costCurrency: "₪",
      notes: "", custom: {},
    };
    setRows((prev) => [...prev, nr]);
    return nr.id;
  }
  function moveRow(id, dir) {
    setRows((prev) => {
      const row = prev.find((r) => r.id === id);
      const siblings = prev.filter((r) => r.date === row.date && r.parentId === row.parentId && (r.frameId || null) === (row.frameId || null));
      const idx = siblings.findIndex((r) => r.id === id); const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= siblings.length) return prev;
      const a = siblings[idx], b = siblings[swapIdx];
      const ai = prev.findIndex((r) => r.id === a.id), bi = prev.findIndex((r) => r.id === b.id);
      const next = [...prev]; [next[ai], next[bi]] = [next[bi], next[ai]]; return next;
    });
  }
  function onDropRow(targetId) {
    if (!dragId || dragId === targetId) return;
    setRows((prev) => {
      const from = prev.find((r) => r.id === dragId), to = prev.find((r) => r.id === targetId);
      if (!from || !to || from.date !== to.date || from.parentId !== to.parentId || (from.frameId || null) !== (to.frameId || null)) return prev;
      const arr = [...prev]; const fi = arr.findIndex((r) => r.id === dragId); const [moved] = arr.splice(fi, 1);
      const ti = arr.findIndex((r) => r.id === targetId); arr.splice(ti, 0, moved); return arr;
    });
    setDragId(null);
  }

  /* ---------- columns / types ---------- */
  function toggleColumn(key) { setColumns((prev) => prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))); }
  function addCustomColumn() {
    if (!newColName.trim()) return;
    setColumns((prev) => [...prev, { key: "custom_" + uid(), label_he: newColName, label_en: newColName, visible: true, custom: true }]);
    setNewColName("");
  }
  function removeCustomColumn(key) { setColumns((prev) => prev.filter((c) => c.key !== key)); }
  function addCustomType(rowIdToApply) {
    if (!newTypeDraft.name.trim()) return;
    const id = "custom-" + uid();
    const color = CUSTOM_COLOR_ROTATION[types.length % CUSTOM_COLOR_ROTATION.length];
    setTypes((prev) => [...prev, { id, name: newTypeDraft.name, icon: newTypeDraft.icon, color }]);
    if (rowIdToApply) updateRow(rowIdToApply, { typeId: id });
    setNewTypeDraft({ name: "", icon: "Tag" }); setTypeMenuOpen(null);
  }

  /* ---------- record card ---------- */
  function openCard(row) { setCardRowId(row.id); setCardDraft({ ...row }); }
  function closeCard() { setCardRowId(null); setCardDraft(null); }
  function saveCard() {
    if (!cardDraft.date) return;
    if (computeDuration(cardDraft.startTime, cardDraft.endTime, cardDraft.overnight) === null) return;
    updateRow(cardRowId, cardDraft); closeCard();
  }
  const cardHasTimeError = cardDraft && cardDraft.startTime && cardDraft.endTime &&
    computeDuration(cardDraft.startTime, cardDraft.endTime, cardDraft.overnight) === null;

  /* ---------- frame modal ---------- */
  function openFrameModal(frame, presetParentId) {
    setFrameDraft(frame ? { ...frame } : { id: null, name: "", startDate: "", endDate: "", parentFrameId: presetParentId || null, collapsed: false });
  }
  function closeFrameModal() { setFrameDraft(null); }
  function saveFrame() {
    if (!frameDraft.name.trim() || !frameDraft.startDate || !frameDraft.endDate) return;
    if (frameDraft.id) setFrames((prev) => prev.map((f) => (f.id === frameDraft.id ? { ...frameDraft } : f)));
    else setFrames((prev) => [...prev, { ...frameDraft, id: uid() }]);
    closeFrameModal();
  }
  function deleteFrame(id) {
    const f = frames.find((x) => x.id === id);
    setFrames((prev) => prev.filter((x) => x.id !== id).map((x) => (x.parentFrameId === id ? { ...x, parentFrameId: f.parentFrameId } : x)));
    setRows((prev) => prev.map((r) => (r.frameId === id ? { ...r, frameId: f.parentFrameId } : r)));
  }
  function toggleFrameCollapse(id) { setFrames((prev) => prev.map((f) => (f.id === id ? { ...f, collapsed: !f.collapsed } : f))); }
  function groupKey(fid, date) { return (fid || "root") + "__" + date; }

  /* ---------- recursive render ---------- */
  function renderContext(fid, depth) {
    const cf = childFrames(fid);
    const dg = dayGroupsAt(fid);
    const nodes = [
      ...cf.map((f) => ({ type: "frame", key: "f-" + f.id, sort: f.startDate || "", frame: f })),
      ...dg.map((g) => ({ type: "day", key: "d-" + g.date, sort: g.date, group: g })),
    ].sort((a, b) => a.sort.localeCompare(b.sort));

    if (nodes.length === 0) {
      return (
        <div className="mt-empty">
          {T.noRows}
          <button className="mt-btn ghost" style={{ marginTop: 8 }} onClick={() => addRow(nextSuggestedDate(), null, fid)}>
            <Plus size={13} /> {T.addRow}
          </button>
        </div>
      );
    }
    return nodes.map((n) => n.type === "frame"
      ? <FrameBlock key={n.key} frame={n.frame} depth={depth} />
      : <DayGroup key={n.key} g={n.group} fid={fid} depth={depth} />
    );
  }

  function FrameBlock({ frame, depth }) {
    const totals = frameTotals(frame.id);
    const color = FRAME_COLORS[depth % FRAME_COLORS.length];
    return (
      <div className="mt-frame-block" style={{ "--frame-color": color }}>
        <div className="mt-frame-header" onClick={() => toggleFrameCollapse(frame.id)}>
          <span className="chev">{frame.collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}</span>
          <span className="mt-frame-name">{frame.name}</span>
          <span className="mt-frame-range">{fmtDate(frame.startDate, lang)} – {fmtDate(frame.endDate, lang)}</span>
          {Object.entries(totals).map(([cur, amt]) => (
            <span className="mt-chip small" key={cur}>{cur} {amt.toLocaleString()}</span>
          ))}
          <span className="mt-frame-actions" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => openFrameModal(null, frame.id)} title={T.addSubFrame}><FolderPlus size={14} /></button>
            <button onClick={() => addRow(frame.startDate, null, frame.id)} title={T.addRow}><Plus size={14} /></button>
            <button onClick={() => openFrameModal(frame)} title={T.editRecord}><Pencil size={13} /></button>
            <button onClick={() => deleteFrame(frame.id)} title={T.delete}><Trash2 size={13} /></button>
          </span>
        </div>
        {!frame.collapsed && <div className="mt-frame-body">{renderContext(frame.id, depth + 1)}</div>}
      </div>
    );
  }

  function DayGroup({ g, fid, depth }) {
    const gk = groupKey(fid, g.date);
    const collapsed = !!collapsedGroups[gk];
    const allRowsHere = g.rows.flatMap((r) => [r, ...childrenOf(r.id)]);
    return (
      <div className="mt-group">
        <div className="mt-group-header" onClick={() => setCollapsedGroups((p) => ({ ...p, [gk]: !p[gk] }))}>
          <span className="chev">{collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}</span>
          <span className="mt-group-date">{fmtDate(g.date, lang)}</span>
          <span className="mt-group-day">{heDay(g.date, lang)}</span>
          <button className="mt-group-add" onClick={(e) => { e.stopPropagation(); addRow(g.date, null, fid); }}>
            <Plus size={13} /> {T.addRow}
          </button>
        </div>
        {!collapsed && (effectiveMobile ? (
          <div className="mt-cards">
            {allRowsHere.map((r) => {
              const tm = typeMeta(r.typeId, types); const Icon = ICONS[tm.icon] || Tag;
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
        ) : (
          <table className="mt-table">
            <colgroup>
              <col style={{ width: "26px" }} />
              {visibleColumns.map((c) => <col key={c.key} style={{ width: colWidth(c.key) }} />)}
              <col style={{ width: "64px" }} />
            </colgroup>
            <thead>
              <tr>
                <th></th>
                {visibleColumns.map((c) => <th key={c.key}>{lang === "he" ? c.label_he : c.label_en}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r) => (
                <React.Fragment key={r.id}>
                  <RowLine row={r} depth={0} hasChildren={childrenOf(r.id).length > 0}
                    collapsed={!!collapsedParents[r.id]}
                    toggleCollapse={() => setCollapsedParents((p) => ({ ...p, [r.id]: !p[r.id] }))} />
                  {!collapsedParents[r.id] && childrenOf(r.id).map((child) => (
                    <RowLine key={child.id} row={child} depth={1} hasChildren={false} collapsed={false} toggleCollapse={() => {}} />
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    );
  }

  function colWidth(key) {
    const map = { date: "9%", day: "6%", icon: "5%", type: "12%", from: "10%", to: "10%", startTime: "6%", duration: "6%", endTime: "6%", destination: "16%", link: "5%", cost: "9%" };
    return map[key] || "10%";
  }

  function RowLine({ row, depth, hasChildren, collapsed, toggleCollapse }) {
    const tm = typeMeta(row.typeId, types); const Icon = ICONS[tm.icon] || Tag;
    const dur = computeDuration(row.startTime, row.endTime, row.overnight);

    function renderCell(col) {
      switch (col.key) {
        case "date": return depth === 0 ? fmtDate(row.date, lang) : "";
        case "day": return depth === 0 ? heDay(row.date, lang) : "";
        case "icon": return <span className="mt-type-icon" style={{ background: tm.color }}><Icon /></span>;
        case "type": return (
          <div style={{ position: "relative" }}>
            <button className="mt-type-btn" onClick={() => setTypeMenuOpen(typeMenuOpen === row.id ? null : row.id)}>
              <span className="mt-type-text">{tm.name}</span> <ChevronDown size={12} />
            </button>
            {typeMenuOpen === row.id && (
              <div className="mt-type-menu">
                {types.map((t) => { const TI = ICONS[t.icon] || Tag; return (
                  <button key={t.id} className="opt" onClick={() => { updateRow(row.id, { typeId: t.id }); setTypeMenuOpen(null); }}>
                    <span className="mt-type-icon" style={{ background: t.color, width: 20, height: 20 }}><TI size={11} /></span>{t.name}
                  </button>
                ); })}
                <div className="divider" />
                <div className="mt-type-new-form">
                  <input type="text" placeholder={T.typeName} value={newTypeDraft.name} onChange={(e) => setNewTypeDraft({ ...newTypeDraft, name: e.target.value })} />
                  <div className="mt-icon-pick-row">
                    {ICON_PALETTE.map((ic) => { const PI = ICONS[ic]; return (
                      <button key={ic} className={"mt-icon-pick" + (newTypeDraft.icon === ic ? " sel" : "")} onClick={() => setNewTypeDraft({ ...newTypeDraft, icon: ic })}><PI /></button>
                    ); })}
                  </div>
                  <button className="mt-btn primary" style={{ width: "100%" }} onClick={() => addCustomType(row.id)}><Plus size={12} /> {T.add}</button>
                </div>
              </div>
            )}
          </div>
        );
        case "from": return <input className="mt-editable" value={row.from} onChange={(e) => updateRow(row.id, { from: e.target.value })} />;
        case "to": return <input className="mt-editable" value={row.to} onChange={(e) => updateRow(row.id, { to: e.target.value })} />;
        case "startTime": return <input className="mt-editable" type="time" value={row.startTime} onChange={(e) => updateRow(row.id, { startTime: e.target.value })} />;
        case "duration": return <span style={{ color: dur === null ? "var(--danger)" : "var(--muted)", fontSize: 12 }}>{dur === null ? "!" : dur}</span>;
        case "endTime": return <input className="mt-editable" type="time" value={row.endTime} onChange={(e) => updateRow(row.id, { endTime: e.target.value })} />;
        case "destination": return <input className="mt-editable" value={row.destination} onChange={(e) => updateRow(row.id, { destination: e.target.value })} />;
        case "link": return row.link ? (
          <a className="mt-link-icon" href={row.link} target="_blank" rel="noreferrer" title={row.link}><Link2 size={14} /></a>
        ) : (
          <button className="mt-link-icon empty" title={T.link} onClick={() => openCard(row)}><Link2 size={14} /></button>
        );
        case "cost": return (
          <span className="mt-cost">{row.costCurrency}
            <input className="mt-editable" type="number" style={{ width: 52, fontWeight: 600, color: "var(--amber)" }} value={row.costAmount} onChange={(e) => updateRow(row.id, { costAmount: e.target.value })} />
          </span>
        );
        default:
          if (col.custom) return <input className="mt-editable" value={(row.custom && row.custom[col.key]) || ""} onChange={(e) => updateRow(row.id, { custom: { ...row.custom, [col.key]: e.target.value } })} />;
          return null;
      }
    }

    return (
      <tr className={depth > 0 ? "is-sub" : ""} draggable onDragStart={() => setDragId(row.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDropRow(row.id)} style={{ opacity: dragId === row.id ? 0.4 : 1 }}>
        <td>
          <div style={{ display: "flex", alignItems: "center", gap: 3, paddingInlineStart: depth * 14 }}>
            <span className="mt-drag-handle" title={T.dragHint}><GripVertical size={13} /></span>
            {hasChildren && <button onClick={toggleCollapse} style={{ border: "none", background: "none", display: "flex", color: "var(--muted)" }}>{collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}</button>}
          </div>
        </td>
        {visibleColumns.map((col) => <td key={col.key} className={col.key}>{renderCell(col)}</td>)}
        <td>
          <div className="mt-row-actions">
            <button onClick={() => openCard(row)} title={T.editRecord}><Pencil /></button>
            {depth === 0 && <button onClick={() => addRow(row.date, row.id, row.frameId)} title={T.addSub}><Plus /></button>}
            <button onClick={() => deleteRow(row.id)} title={T.delete}><Trash2 /></button>
          </div>
        </td>
      </tr>
    );
  }

  /* ---------- render ---------- */
  return (
    <div className="mytrip-app" dir={dir}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@500;700&display=swap');
        .mytrip-app { --bg:#F5F8F6; --surface:#FFFFFF; --ink:#1E2A28; --muted:#6B7C76; --border:#DEE7E2; --teal:#256D64; --teal-dark:#174C45; --teal-tint:#E6F0EE; --amber:#D98E3F; --amber-tint:#FBEEDD; --danger:#C1443A;
          font-family:'Heebo',sans-serif; background:var(--bg); color:var(--ink); min-height:100vh; font-variant-numeric:tabular-nums; }
        .mytrip-app * { box-sizing:border-box; }
        .mytrip-app button { font-family:inherit; cursor:pointer; }
        .mt-header { display:flex; align-items:center; justify-content:space-between; padding:12px 20px; background:var(--surface); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:30; flex-wrap:wrap; gap:8px; }
        .mt-brand { display:flex; align-items:center; gap:9px; }
        .mt-brand-mark { width:32px; height:32px; border-radius:9px; background:var(--teal); display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
        .mt-brand-mark::after { content:''; position:absolute; width:44px; height:44px; border:2px solid rgba(255,255,255,.35); border-radius:50%; top:-14px; inset-inline-start:-8px; }
        .mt-brand-mark svg { color:#fff; width:17px; height:17px; z-index:1; }
        .mt-brand-name { font-family:'Frank Ruhl Libre',serif; font-size:20px; font-weight:700; }
        .mt-header-actions { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
        .mt-icon-btn { border:1px solid var(--border); background:var(--surface); color:var(--ink); border-radius:8px; padding:6px 9px; display:flex; align-items:center; gap:5px; font-size:12.5px; font-weight:500; }
        .mt-icon-btn:hover { background:var(--teal-tint); border-color:var(--teal); }
        .mt-icon-btn.active { background:var(--teal); color:#fff; border-color:var(--teal); }
        .mt-icon-btn svg { width:14px; height:14px; }
        .mt-avatar { width:26px; height:26px; border-radius:50%; background:var(--teal-tint); color:var(--teal-dark); display:flex; align-items:center; justify-content:center; border:1px solid var(--border); }
        .mt-toolbar { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 20px; flex-wrap:wrap; }
        .mt-toolbar-group { display:flex; gap:7px; align-items:center; flex-wrap:wrap; }
        .mt-columns-menu { position:absolute; margin-top:6px; background:var(--surface); border:1px solid var(--border); border-radius:10px; box-shadow:0 8px 24px rgba(20,40,35,.12); padding:9px; z-index:40; min-width:210px; }
        .mt-columns-menu label { display:flex; align-items:center; gap:7px; padding:4px 4px; font-size:12.5px; border-radius:6px; }
        .mt-columns-menu label:hover { background:var(--bg); }
        .mt-columns-menu .divider { height:1px; background:var(--border); margin:6px 0; }
        .mt-columns-menu input[type=text] { width:100%; border:1px solid var(--border); border-radius:6px; padding:5px 7px; font-size:12.5px; margin-bottom:6px; }
        .mt-content { padding:0 20px 40px; }
        .mt-suggest { display:flex; align-items:center; gap:10px; background:var(--amber-tint); border:1px solid #EAC896; color:#7A4E17; padding:9px 14px; border-radius:10px; margin:14px 0; font-size:12.5px; flex-wrap:wrap; }
        .mt-suggest svg { width:15px; height:15px; flex-shrink:0; }
        .mt-suggest .mt-btn { margin-inline-start:auto; }
        .mt-frame-block { border:1px solid var(--border); border-inline-start:4px solid var(--frame-color,var(--teal)); border-radius:12px; margin-top:16px; overflow:hidden; background:var(--surface); }
        .mt-frame-header { display:flex; align-items:center; gap:9px; padding:10px 12px; cursor:pointer; user-select:none; flex-wrap:wrap; background:#FBFDFC; }
        .mt-frame-name { font-weight:700; font-size:14px; font-family:'Frank Ruhl Libre',serif; }
        .mt-frame-range { font-size:11.5px; color:var(--muted); background:var(--bg); padding:2px 8px; border-radius:20px; }
        .mt-frame-actions { display:flex; gap:2px; margin-inline-start:auto; }
        .mt-frame-actions button { border:none; background:none; color:var(--muted); padding:4px; border-radius:5px; display:flex; }
        .mt-frame-actions button:hover { background:var(--teal-tint); color:var(--teal-dark); }
        .mt-frame-body { padding:2px 12px 12px 12px; }
        .mt-group { margin-top:14px; }
        .mt-group-header { display:flex; align-items:center; gap:9px; padding:7px 4px; cursor:pointer; user-select:none; }
        .mt-group-date { font-weight:700; font-size:13.5px; }
        .mt-group-day { background:var(--teal-tint); color:var(--teal-dark); font-size:11px; font-weight:600; padding:2px 8px; border-radius:20px; }
        .mt-group-add { margin-inline-start:auto; font-size:12px; color:var(--teal); display:flex; align-items:center; gap:3px; background:none; border:none; font-weight:600; }
        .mt-group-add:hover { text-decoration:underline; }
        table.mt-table { width:100%; table-layout:fixed; border-collapse:separate; border-spacing:0; background:var(--surface); border-radius:10px; overflow:hidden; border:1px solid var(--border); }
        .mt-table thead th { text-align:start; font-size:10.5px; text-transform:uppercase; letter-spacing:.03em; color:var(--muted); font-weight:600; padding:7px 7px; background:#FAFCFB; border-bottom:1px solid var(--border); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .mt-table tbody td { padding:5px 7px; font-size:12.8px; border-bottom:1px solid var(--border); vertical-align:middle; position:relative; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .mt-table tbody tr:last-child td { border-bottom:none; }
        .mt-table tbody tr:hover { background:#FBFDFC; }
        .mt-type-chip { display:flex; align-items:center; gap:6px; }
        .mt-type-icon { width:22px; height:22px; border-radius:6px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .mt-type-icon svg { width:12px; height:12px; color:#fff; }
        .mt-type-btn { border:none; background:none; padding:0; display:flex; align-items:center; gap:5px; font-size:12.8px; font-weight:500; color:var(--ink); max-width:100%; }
        .mt-type-text { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .mt-editable { border:1px solid transparent; border-radius:6px; padding:3px 5px; font-size:12.8px; width:100%; background:transparent; font-family:inherit; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .mt-editable:hover { border-color:var(--border); }
        .mt-editable:focus { outline:none; border-color:var(--teal); background:#fff; position:absolute; z-index:15; inset-inline-start:2px; top:2px; width:max-content; min-width:140px; max-width:280px; white-space:normal; box-shadow:0 6px 18px rgba(20,40,35,.18); }
        .mt-cost { display:flex; align-items:center; gap:3px; font-weight:600; color:var(--amber); }
        .mt-link-icon { color:var(--teal); display:flex; align-items:center; justify-content:center; border:none; background:none; padding:2px; }
        .mt-link-icon.empty { color:var(--border); }
        .mt-link-icon:hover { color:var(--teal-dark); }
        .mt-row-actions { display:flex; align-items:center; gap:2px; opacity:0; transition:opacity .1s; }
        .mt-table tbody tr:hover .mt-row-actions { opacity:1; }
        .mt-row-actions button { border:none; background:none; color:var(--muted); padding:3px; border-radius:5px; display:flex; }
        .mt-row-actions button:hover { background:var(--teal-tint); color:var(--teal-dark); }
        .mt-row-actions svg { width:13px; height:13px; }
        .mt-drag-handle { cursor:grab; color:var(--border); }
        .mt-drag-handle:hover { color:var(--muted); }
        .mt-empty { padding:16px; text-align:center; color:var(--muted); font-size:12.5px; background:var(--surface); border:1px dashed var(--border); border-radius:12px; }
        .mt-summary { margin-top:20px; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
        .mt-summary-label { font-size:12px; color:var(--muted); font-weight:600; }
        .mt-chip { background:var(--amber-tint); color:#8A5A1F; font-weight:700; font-size:12.5px; padding:4px 11px; border-radius:20px; }
        .mt-chip.small { font-size:11px; padding:2px 8px; font-weight:600; }
        .mt-type-menu { position:absolute; z-index:50; background:var(--surface); border:1px solid var(--border); border-radius:10px; box-shadow:0 8px 24px rgba(20,40,35,.14); padding:6px; min-width:190px; margin-top:4px; }
        .mt-type-menu button.opt { width:100%; display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:7px; background:none; border:none; font-size:12.5px; text-align:start; }
        .mt-type-menu button.opt:hover { background:var(--bg); }
        .mt-type-menu .divider { height:1px; background:var(--border); margin:6px 2px; }
        .mt-type-new-form { padding:6px 4px; }
        .mt-type-new-form input[type=text] { width:100%; border:1px solid var(--border); border-radius:6px; padding:5px 8px; font-size:12px; margin-bottom:6px; }
        .mt-icon-pick-row { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:8px; }
        .mt-icon-pick { width:24px; height:24px; border-radius:6px; border:1px solid var(--border); background:var(--surface); display:flex; align-items:center; justify-content:center; }
        .mt-icon-pick.sel { background:var(--teal); border-color:var(--teal); }
        .mt-icon-pick.sel svg { color:#fff; }
        .mt-icon-pick svg { width:12px; height:12px; color:var(--muted); }
        .mt-modal-backdrop { position:fixed; inset:0; background:rgba(20,35,32,.4); display:flex; align-items:center; justify-content:center; z-index:100; padding:20px; }
        .mt-modal { background:var(--surface); border-radius:16px; width:100%; max-width:440px; max-height:86vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.25); }
        .mt-modal-header { display:flex; align-items:center; justify-content:space-between; padding:15px 18px; border-bottom:1px solid var(--border); position:sticky; top:0; background:var(--surface); }
        .mt-modal-title { font-family:'Frank Ruhl Libre',serif; font-size:17px; font-weight:700; }
        .mt-modal-body { padding:16px 18px; display:flex; flex-direction:column; gap:12px; }
        .mt-field label { display:block; font-size:11.5px; font-weight:600; color:var(--muted); margin-bottom:4px; }
        .mt-field input, .mt-field select { width:100%; border:1px solid var(--border); border-radius:8px; padding:7px 9px; font-size:13px; font-family:inherit; background:#fff; }
        .mt-field input:focus, .mt-field select:focus { outline:none; border-color:var(--teal); }
        .mt-field-row { display:flex; gap:9px; }
        .mt-field-row > div { flex:1; }
        .mt-checkbox-row { display:flex; align-items:center; gap:7px; font-size:12.5px; }
        .mt-error { display:flex; gap:6px; align-items:flex-start; background:#FBEAE8; color:var(--danger); font-size:11.5px; padding:7px 9px; border-radius:8px; }
        .mt-error svg { width:13px; height:13px; flex-shrink:0; margin-top:1px; }
        .mt-modal-footer { display:flex; justify-content:flex-end; gap:7px; padding:13px 18px; border-top:1px solid var(--border); position:sticky; bottom:0; background:var(--surface); flex-wrap:wrap; }
        .mt-btn { border-radius:8px; padding:7px 14px; font-size:12.5px; font-weight:600; border:1px solid var(--border); background:#fff; display:inline-flex; align-items:center; gap:5px; }
        .mt-btn.primary { background:var(--teal); color:#fff; border-color:var(--teal); }
        .mt-btn.primary:disabled { opacity:.5; cursor:not-allowed; }
        .mt-btn.ghost { border-color:transparent; color:var(--muted); }
        .mt-btn.danger { color:var(--danger); border-color:transparent; }
        .mt-cards { display:flex; flex-direction:column; gap:9px; }
        .mt-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:11px 13px; display:flex; flex-direction:column; gap:5px; }
        .mt-card-top { display:flex; align-items:center; justify-content:space-between; }
        .mt-card-times { font-size:12px; color:var(--muted); }
        .mt-card-dest { font-size:13px; font-weight:600; }
        .mt-card-bottom { display:flex; align-items:center; justify-content:space-between; margin-top:2px; }
        .mt-note { font-size:11px; color:var(--muted); margin-top:4px; }
      `}</style>

      <div className="mt-header">
        <div className="mt-brand"><div className="mt-brand-mark"><Plane /></div><span className="mt-brand-name">{T.appName}</span></div>
        <div className="mt-header-actions">
          <button className="mt-icon-btn" onClick={() => setLang(lang === "he" ? "en" : "he")}><Globe /> {T.lang}</button>
          <button className={"mt-icon-btn" + (viewMode === "desktop" ? " active" : "")} onClick={() => setViewMode("desktop")} title={T.desktop}><Monitor /></button>
          <button className={"mt-icon-btn" + (viewMode === "mobile" ? " active" : "")} onClick={() => setViewMode("mobile")} title={T.mobile}><Smartphone /></button>
          {!loggedIn ? (
            <button className="mt-icon-btn" onClick={() => setLoggedIn(true)}><LogIn /> {T.login}</button>
          ) : (
            <button className="mt-icon-btn" onClick={() => setLoggedIn(false)} title={T.mockNote}><span className="mt-avatar"><User size={14} /></span> {T.logout}</button>
          )}
        </div>
      </div>

      <div className="mt-toolbar">
        <div className="mt-toolbar-group">
          <button className="mt-icon-btn" onClick={() => addRow(nextSuggestedDate(), null, null)}><Plus /> {T.addDay}</button>
          <button className="mt-icon-btn" onClick={() => openFrameModal(null, null)}><FolderPlus /> {T.newFrame}</button>
        </div>
        <div className="mt-toolbar-group" style={{ position: "relative" }}>
          <button className="mt-icon-btn" onClick={() => setColMenuOpen((v) => !v)}><Settings2 /> {T.columns}</button>
          {colMenuOpen && (
            <div className="mt-columns-menu" style={{ insetInlineEnd: 0 }}>
              {columns.map((c) => (
                <label key={c.key}>
                  <input type="checkbox" checked={c.visible} onChange={() => toggleColumn(c.key)} />
                  {lang === "he" ? c.label_he : c.label_en}
                  {c.custom && <button className="mt-btn ghost" style={{ padding: "2px 6px", marginInlineStart: "auto" }} onClick={(e) => { e.preventDefault(); removeCustomColumn(c.key); }}><X size={12} /></button>}
                </label>
              ))}
              <div className="divider" />
              <input type="text" placeholder={T.addColumn} value={newColName} onChange={(e) => setNewColName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustomColumn()} />
              <button className="mt-btn primary" style={{ width: "100%" }} onClick={addCustomColumn}><Plus size={13} /> {T.addColumn}</button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-content">
        {showSuggestion && (
          <div className="mt-suggest">
            <Sparkles />
            <span>{T.suggestPrefix} {unassignedFlights.length} {T.suggestMid} {fmtDate(unassignedFlights[0].date, lang)} – {fmtDate(unassignedFlights[unassignedFlights.length - 1].date, lang)}</span>
            <button className="mt-btn primary" onClick={createFrameFromSuggestion}>{T.suggestBtn}</button>
            <button className="mt-btn ghost" onClick={() => setDismissedKey(suggestionKey)}>{T.suggestDismiss}</button>
          </div>
        )}

        {renderContext(null, 0)}

        <div className="mt-summary">
          <span className="mt-summary-label">{T.totalPerCurrency}:</span>
          {Object.keys(grandTotals).length === 0 && <span style={{ fontSize: 12.5, color: "var(--muted)" }}>—</span>}
          {Object.entries(grandTotals).map(([cur, amt]) => <span className="mt-chip" key={cur}>{cur} {amt.toLocaleString()}</span>)}
        </div>
        <div className="mt-note">{loggedIn ? T.mockNote : ""}</div>
      </div>

      {/* record card modal */}
      {cardDraft && (
        <div className="mt-modal-backdrop" onClick={closeCard}>
          <div className="mt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header"><span className="mt-modal-title">{T.editRecord}</span><button className="mt-btn ghost" onClick={closeCard}><X size={16} /></button></div>
            <div className="mt-modal-body">
              <div className="mt-field-row">
                <div className="mt-field">
                  <label>{T.type}</label>
                  <select value={cardDraft.typeId} onChange={(e) => setCardDraft({ ...cardDraft, typeId: e.target.value })}>
                    {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="mt-field"><label>תאריך</label><input type="date" value={cardDraft.date} onChange={(e) => setCardDraft({ ...cardDraft, date: e.target.value })} /></div>
              </div>
              <div className="mt-field">
                <label>{T.frame}</label>
                <select value={cardDraft.frameId || ""} onChange={(e) => setCardDraft({ ...cardDraft, frameId: e.target.value || null })}>
                  <option value="">{T.noFrame}</option>
                  {frameOptionsList(null).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div className="mt-field-row">
                <div className="mt-field"><label>{T.from}</label><input value={cardDraft.from} onChange={(e) => setCardDraft({ ...cardDraft, from: e.target.value })} /></div>
                <div className="mt-field"><label>{T.to}</label><input value={cardDraft.to} onChange={(e) => setCardDraft({ ...cardDraft, to: e.target.value })} /></div>
              </div>
              <div className="mt-field-row">
                <div className="mt-field"><label>{T.start}</label><input type="time" value={cardDraft.startTime} onChange={(e) => setCardDraft({ ...cardDraft, startTime: e.target.value })} /></div>
                <div className="mt-field"><label>{T.end}</label><input type="time" value={cardDraft.endTime} onChange={(e) => setCardDraft({ ...cardDraft, endTime: e.target.value })} /></div>
              </div>
              <label className="mt-checkbox-row"><input type="checkbox" checked={!!cardDraft.overnight} onChange={(e) => setCardDraft({ ...cardDraft, overnight: e.target.checked })} />{T.overnight}</label>
              {cardHasTimeError && <div className="mt-error"><AlertTriangle /> {T.timeError}</div>}
              <div className="mt-field"><label>{T.destination}</label><input value={cardDraft.destination} onChange={(e) => setCardDraft({ ...cardDraft, destination: e.target.value })} /></div>
              {(cardDraft.typeId === "flight" || cardDraft.typeId === "domestic-flight") && (
                <div className="mt-field"><label>{T.flightNo}</label><input value={cardDraft.flightNumber || ""} onChange={(e) => setCardDraft({ ...cardDraft, flightNumber: e.target.value })} /></div>
              )}
              <div className="mt-field"><label>{T.link}</label><input value={cardDraft.link} placeholder="https://..." onChange={(e) => setCardDraft({ ...cardDraft, link: e.target.value })} /></div>
              {["hotel", "self-tour", "guided-tour", "day-tour", "ferry", "car-rental"].includes(cardDraft.typeId) && (
                <div className="mt-field"><label>{T.maplink}</label><input value={cardDraft.mapLink || ""} placeholder="https://maps.google.com/..." onChange={(e) => setCardDraft({ ...cardDraft, mapLink: e.target.value })} /></div>
              )}
              <div className="mt-field-row">
                <div className="mt-field"><label>{T.cost}</label><input type="number" value={cardDraft.costAmount} onChange={(e) => setCardDraft({ ...cardDraft, costAmount: e.target.value })} /></div>
                <div className="mt-field"><label>{T.currency}</label>
                  <select value={cardDraft.costCurrency} onChange={(e) => setCardDraft({ ...cardDraft, costCurrency: e.target.value })}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-field"><label>{T.notes}</label><input value={cardDraft.notes || ""} onChange={(e) => setCardDraft({ ...cardDraft, notes: e.target.value })} /></div>
              {columns.filter((c) => c.custom).map((c) => (
                <div className="mt-field" key={c.key}>
                  <label>{lang === "he" ? c.label_he : c.label_en}</label>
                  <input value={(cardDraft.custom && cardDraft.custom[c.key]) || ""} onChange={(e) => setCardDraft({ ...cardDraft, custom: { ...cardDraft.custom, [c.key]: e.target.value } })} />
                </div>
              ))}
            </div>
            <div className="mt-modal-footer">
              {!cardDraft.parentId && (
                <button className="mt-btn ghost" style={{ marginInlineEnd: "auto" }} onClick={() => { addRow(cardDraft.date, cardRowId, cardDraft.frameId); closeCard(); }}>
                  <Plus size={13} /> {T.addSub}
                </button>
              )}
              <button className="mt-btn danger" onClick={() => { deleteRow(cardRowId); closeCard(); }}><Trash2 size={13} /> {T.delete}</button>
              <button className="mt-btn ghost" onClick={closeCard}>{T.cancel}</button>
              <button className="mt-btn primary" disabled={!cardDraft.date || cardHasTimeError} onClick={saveCard}><Check size={13} /> {T.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* frame modal */}
      {frameDraft && (
        <div className="mt-modal-backdrop" onClick={closeFrameModal}>
          <div className="mt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header">
              <span className="mt-modal-title">{frameDraft.id ? T.frameModalEdit : T.frameModalNew}</span>
              <button className="mt-btn ghost" onClick={closeFrameModal}><X size={16} /></button>
            </div>
            <div className="mt-modal-body">
              <div className="mt-field"><label>{T.frameName}</label><input value={frameDraft.name} onChange={(e) => setFrameDraft({ ...frameDraft, name: e.target.value })} /></div>
              <div className="mt-field-row">
                <div className="mt-field"><label>{T.frameStart}</label><input type="date" value={frameDraft.startDate} onChange={(e) => setFrameDraft({ ...frameDraft, startDate: e.target.value })} /></div>
                <div className="mt-field"><label>{T.frameEnd}</label><input type="date" value={frameDraft.endDate} onChange={(e) => setFrameDraft({ ...frameDraft, endDate: e.target.value })} /></div>
              </div>
              <div className="mt-field">
                <label>{T.parentFrame}</label>
                <select value={frameDraft.parentFrameId || ""} onChange={(e) => setFrameDraft({ ...frameDraft, parentFrameId: e.target.value || null })}>
                  <option value="">{T.noFrame}</option>
                  {frameOptionsList(frameDraft.id).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-modal-footer">
              <button className="mt-btn ghost" onClick={closeFrameModal}>{T.cancel}</button>
              <button className="mt-btn primary" disabled={!frameDraft.name.trim() || !frameDraft.startDate || !frameDraft.endDate} onClick={saveFrame}><Check size={13} /> {T.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
