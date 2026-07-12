import React, { useState, useMemo, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Plane, PlaneTakeoff, Car, BedDouble, Footprints, Users, Sun, Ship, KeySquare,
  Tag, Star, Flag, Camera, Utensils, ShoppingBag, Music, ChevronDown, ChevronRight,
  Plus, X, Settings2, Pencil, Trash2, Link2, Globe, LogIn, User,
  Smartphone, Monitor, AlertTriangle, GripVertical, Check, FolderPlus, Sparkles,
  Route, Waypoints, Download, Upload, MapPin, Search, CircleCheck, Clock, ArrowDownUp, Copy, StickyNote, TrainFront,
  Bus, Motorbike, Bike, Scooter, Sailboat, ShipWheel, Anchor, Kayak, Helicopter, Caravan, Building2, Landmark, Home
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/*  MyTrip — trip-planning table prototype                                 */
/*  v4: chronology warnings, repositioned menus, location verification     */
/*  (OpenStreetMap Nominatim — free, no key), fixed-width indent column.   */
/* ---------------------------------------------------------------------- */

const APP_VERSION = "7.2.0";

// Leaflet's default marker icon breaks under bundlers (Vite/Webpack) because it
// references relative image paths. Point it at the CDN copies instead.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
const DEFAULT_MAP_CENTER = [41.9, 12.49]; // Rome — reasonable default for this itinerary
const ICONS = { Plane, PlaneTakeoff, Car, BedDouble, Footprints, Users, Sun, Ship, KeySquare, Tag, Star, Flag, Camera, Utensils, ShoppingBag, Music, TrainFront, Bus, Motorbike, Bike, Scooter, Sailboat, ShipWheel, Anchor, Kayak, Helicopter, Caravan, Building2, Landmark, Home };
const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const EN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FRAME_COLORS = ["#256D64", "#3E7CB1", "#8B6F47", "#7A5C9E", "#C1443A", "#5B8C5A"];
const CURRENCIES = ["₪", "$", "€", "£"];
const CURRENCY_CODE_MAP = { "₪": "ILS", "$": "USD", "€": "EUR", "£": "GBP" };
const FALLBACK_RATES = { ILS: 1, USD: 0.27, EUR: 0.25, GBP: 0.21 };
const FLIGHT_LOOKUP_ENABLED = false; // needs a real flight-data provider (e.g. AeroDataBox) + API key + server proxy

const DEFAULT_TYPES = [
  { id: "train", name: "רכבת", icon: "TrainFront", color: "#3E7CB1", category: "public-transport" },
  { id: "high-speed-train", name: "רכבת מהירה", icon: "TrainFront", color: "#2F5F8A", category: "public-transport" },
  { id: "bus", name: "אוטובוס", icon: "Bus", color: "#3E7CB1", category: "public-transport" },
  { id: "taxi", name: "מונית", icon: "Car", color: "#8B6F47", category: "public-transport" },

  { id: "car-rental", name: "השכרת רכב", icon: "KeySquare", color: "#8B6F47", category: "road-transport" },
  { id: "caravan", name: "קראוון", icon: "Caravan", color: "#8B6F47", category: "road-transport" },
  { id: "motorcycle", name: "אופנוע", icon: "Motorbike", color: "#8B6F47", category: "road-transport" },
  { id: "bicycle", name: "אופניים", icon: "Bike", color: "#5B8C5A", category: "road-transport" },
  { id: "scooter", name: "קורקינט", icon: "Scooter", color: "#5B8C5A", category: "road-transport" },

  { id: "ferry", name: "מעבורת", icon: "Ship", color: "#3E7CB1", category: "sea-transport" },
  { id: "yacht", name: "יאכטה", icon: "Sailboat", color: "#2F7A8C", category: "sea-transport" },
  { id: "ship", name: "אוניה", icon: "ShipWheel", color: "#2F7A8C", category: "sea-transport" },
  { id: "cruise", name: "שייט", icon: "Anchor", color: "#2F7A8C", category: "sea-transport" },
  { id: "canoe", name: "קאנו", icon: "Kayak", color: "#2F7A8C", category: "sea-transport" },

  { id: "flight", name: "טיסה בינלאומית", icon: "Plane", color: "#256D64", category: "air-transport" },
  { id: "domestic-flight", name: "טיסת פנים", icon: "PlaneTakeoff", color: "#3E7CB1", category: "air-transport" },
  { id: "helicopter", name: "מסוק", icon: "Helicopter", color: "#256D64", category: "air-transport" },

  { id: "hotel", name: "מלון", icon: "BedDouble", color: "#D98E3F", category: "accommodation" },
  { id: "hostel", name: "אכסנייה", icon: "Building2", color: "#D98E3F", category: "accommodation" },
  { id: "apartment", name: "דירה", icon: "Home", color: "#D98E3F", category: "accommodation" },

  { id: "self-tour", name: "טיול עצמאי", icon: "Footprints", color: "#5B8C5A", category: "activities" },
  { id: "guided-tour", name: "טיול מודרך", icon: "Users", color: "#5B8C5A", category: "activities" },
  { id: "day-tour", name: "טיול יומי", icon: "Sun", color: "#D9A23D", category: "activities" },
  { id: "attraction", name: "אטרקציה", icon: "Landmark", color: "#5B8C5A", category: "activities" },
];
const CATEGORY_ORDER = ["public-transport", "road-transport", "sea-transport", "air-transport", "accommodation", "activities", "other"];
const CATEGORY_LABELS = {
  he: { "public-transport": "תחבורה ציבורית", "road-transport": "תחבורה כביש", "sea-transport": "תחבורה ימית", "air-transport": "תחבורה אווירית", accommodation: "לינה", activities: "פעילויות", other: "אחר" },
  en: { "public-transport": "Public Transport", "road-transport": "Road Transport", "sea-transport": "Sea Transport", "air-transport": "Air Transport", accommodation: "Accommodation", activities: "Activities", other: "Other" },
};
function groupTypesByCategory(types) {
  const map = {};
  types.forEach((t) => { const cat = t.category || "other"; if (!map[cat]) map[cat] = []; map[cat].push(t); });
  return CATEGORY_ORDER.filter((c) => map[c] && map[c].length).map((c) => ({ category: c, items: map[c] }));
}
const ICON_PALETTE = ["Tag", "Star", "Flag", "Camera", "Utensils", "ShoppingBag", "Music"];
const CUSTOM_COLOR_ROTATION = ["#7A5C9E", "#C1443A", "#3E7CB1", "#5B8C5A", "#8B6F47", "#D98E3F"];
const TZ_HINT_TYPES = ["flight", "domestic-flight", "ferry"];

const DEFAULT_COLUMNS = [
  { key: "date", label_he: "תאריך", label_en: "Date", visible: false },
  { key: "day", label_he: "יום", label_en: "Day", visible: false },
  { key: "icon", label_he: "סמל", label_en: "Icon", visible: true },
  { key: "type", label_he: "תיאור", label_en: "Description", visible: true },
  { key: "from", label_he: "מוצא", label_en: "Origin", visible: true },
  { key: "to", label_he: "יעד", label_en: "Destination", visible: true },
  { key: "startTime", label_he: "בשעה", label_en: "At", visible: true },
  { key: "duration", label_he: "משך", label_en: "Dur.", visible: true },
  { key: "endTime", label_he: "עד שעה", label_en: "Until", visible: true },
  { key: "route", label_he: "מסלול", label_en: "Route", visible: true },
  { key: "link", label_he: "קישור", label_en: "Link", visible: true },
  { key: "cost", label_he: "עלות", label_en: "Cost", visible: true },
  { key: "notes", label_he: "הערות", label_en: "Notes", visible: true },
];

const T_DICT = {
  he: {
    appName: "MyTrip", addRow: "הוסף רשומה", addDay: "הוסף יום", newFrame: "מסגרת חדשה",
    columns: "עמודות", addColumn: "הוסף עמודה", addType: "הוסף תיאור", resetColumnWidths: "איפוס רוחב עמודות (גרור את קצה כותרת העמודה לשינוי ידני)",
    exportFile: "שמור לקובץ", importFile: "ייבוא מקובץ", importSuccess: "הייבוא הצליח", importError: "הקובץ אינו תקין",
    login: "התחברות עם Google", logout: "יציאה",
    desktop: "מחשב", mobile: "סלולר", lang: "English", editRecord: "כרטיס רשומה",
    save: "שמירה", cancel: "ביטול", delete: "מחיקה", addSub: "הוסף תת-רשומה",
    type: "סוג", from: "מוצא", to: "יעד", start: "בשעה", end: "עד שעה", overnight: "חוצה חצות",
    destination: "שם היעד", link: "קישור להזמנה", maplink: "קישור למיקום / מסלול",
    flightNo: "מספר טיסה", cost: "עלות", currency: "מטבע", notes: "הערות", frame: "מסגרת",
    noFrame: "ללא מסגרת (רמה עליונה)", selectType: "בחר...",
    newType: "תיאור חדש", typeName: "שם תיאור", add: "הוספה",
    totalPerCurrency: "סה״כ טיול", timeError: "שעת סיום לפני שעת ההתחלה — סמן \"חוצה חצות\" אם מדובר בלילה",
    noRows: "אין עדיין רשומות כאן", dragHint: "גרירה לשינוי סדר", mockNote: "*הדמיית התחברות בלבד בפרוטוטייפ",
    frameModalNew: "מסגרת טיול חדשה", frameModalEdit: "עריכת מסגרת", frameName: "שם המסגרת",
    frameStart: "תאריך התחלה", frameEnd: "תאריך סיום", parentFrame: "שייכת למסגרת",
    addSubFrame: "הוסף מסגרת-משנה", suggestPrefix: "זוהו", suggestMid: "טיסות ללא מסגרת:",
    fillDatesAbove: "הוסף מסגרת מעל התאריך הקיים", fillDatesBelow: "הוסף מסגרת מתחת לתאריך הקיים",
    suggestBtn: "צור מסגרת טיול אוטומטית", suggestDismiss: "התעלם",
    fxApprox: "לפי שער מקורב (אין חיבור לאינטרנט)", fxLive: "לפי שער עדכני",
    frameRangeInvalid: "תאריך ההתחלה חייב להיות לפני תאריך הסיום",
    frameRangeContent: "טווח התאריכים חייב לכלול את כל הרשומות/תת-המסגרות שכבר קיימות במסגרת זו",
    frameRangeParent: "טווח התאריכים חייב להיות בתוך טווח המסגרת המכילה",
    rowOutOfFrame: "התאריך חייב להיות בתוך טווח המסגרת שאליה הרשומה משויכת",
    routeTooltip: "פתח מסלול בגוגל מפות", dayRoute: "מסלול היום", noRoute: "אין מספיק נתוני מיקום",
    fetchFlightData: "משוך נתונים לפי מספר טיסה", flightApiMissing: "לצורך משיכה אוטומטית יש לחבר ספק נתוני טיסות (כגון AeroDataBox) עם מפתח API ופרוקסי בצד השרת. שדה זה מוכן לחיבור עתידי.",
    chronoWarning: "סדר הרשומות ביום זה אינו כרונולוגי לפי שעה", sortByTime: "מיין לפי שעה",
    addDayModalTitle: "הוספת יום חדש", addDayDate: "תאריך", confirmAdd: "הוסף",
    verify: "אמת מול מפות", verified: "מאומת", openMap: "פתח במפה", pickFromMap: "בחר מהמפה",
    fromAlias: "כינוי למוצא", toAlias: "כינוי ליעד", aliasHint: "יוצג בעמודה במקום הטקסט המלא",
    flightAliasPlaceholder: "לדוגמה: תל אביב (TLV)", copyPrevDest: "העתק יעד משורה קודמת",
    km: "ק\"מ", min: "דק'", calculatingDistance: "מחשב מרחק...",
    locHint: "טיפ: אם החיפוש לא מוצא תוצאה בעברית, נסה לחפש בשם המקומי/אנגלי (למשל \"Fiumicino Airport\" ולא \"פיומיצ׳ינו\").",
    tabSearch: "חיפוש טקסט", tabMap: "בחירה במפה", mapPickHint: "לחץ במקום הרצוי על המפה כדי לסמן אותו",
    mapResolving: "מזהה כתובת...", mapNoName: "לא נמצאה כתובת מדויקת לנקודה זו — ניתן עדיין לבחור לפי הקואורדינטות",
    confirmLocation: "אשר מיקום זה",
    locPickerTitle: "חיפוש מיקום", locSearch: "חפש", locSearching: "מחפש...", locNoResults: "לא נמצאו תוצאות",
    locError: "החיפוש נכשל (בעיית רשת/CORS מול שירות המיקומים). אפשר לפתוח חיפוש ידני בגוגל מפות במקום:",
    openInGoogleSearch: "פתח חיפוש בגוגל מפות",
    flightPlaceholder: "עיר (קוד שדה תעופה, למשל TLV)", tzNote: "התאמת שעון אוטומטית לפי אזורי זמן דורשת חיבור ל-API מסחרי (כגון Google Time Zone) עם מפתח — לא מיושמת בפרוטוטייפ. יש לוודא ידנית שהשעות מוזנות לפי השעון המקומי בכל מיקום.",
  },
  en: {
    appName: "MyTrip", addRow: "Add record", addDay: "Add day", newFrame: "New frame",
    columns: "Columns", addColumn: "Add column", addType: "Add description", resetColumnWidths: "Reset column widths (drag a header's edge to resize manually)",
    exportFile: "Save to file", importFile: "Import from file", importSuccess: "Import successful", importError: "This file isn't valid",
    login: "Sign in with Google", logout: "Sign out",
    desktop: "Desktop", mobile: "Mobile", lang: "עברית", editRecord: "Record card",
    save: "Save", cancel: "Cancel", delete: "Delete", addSub: "Add sub-record",
    type: "Type", from: "Origin", to: "Destination", start: "At", end: "Until", overnight: "Crosses midnight",
    destination: "Venue", link: "Booking link", maplink: "Map / route link",
    flightNo: "Flight number", cost: "Cost", currency: "Currency", notes: "Notes", frame: "Frame",
    noFrame: "No frame (top level)", selectType: "Select...",
    newType: "New description", typeName: "Description name", add: "Add",
    totalPerCurrency: "Trip total", timeError: "End time is before start time — check \"crosses midnight\" for overnight legs",
    noRows: "No records here yet", dragHint: "Drag to reorder", mockNote: "*Sign-in is a prototype mock only",
    frameModalNew: "New trip frame", frameModalEdit: "Edit frame", frameName: "Frame name",
    frameStart: "Start date", frameEnd: "End date", parentFrame: "Belongs to frame",
    addSubFrame: "Add sub-frame", suggestPrefix: "Found", suggestMid: "flights without a frame:",
    fillDatesAbove: "Add frame above the existing date", fillDatesBelow: "Add frame below the existing date",
    suggestBtn: "Auto-create a trip frame", suggestDismiss: "Dismiss",
    fxApprox: "Approximate rate (no internet connection)", fxLive: "Live rate",
    frameRangeInvalid: "Start date must be before the end date",
    frameRangeContent: "The date range must cover all records/sub-frames already inside this frame",
    frameRangeParent: "The date range must fit inside the containing frame's range",
    rowOutOfFrame: "The date must fall inside the frame this record belongs to",
    routeTooltip: "Open route in Google Maps", dayRoute: "Day route", noRoute: "Not enough location data",
    fetchFlightData: "Fetch data by flight number", flightApiMissing: "Live lookup needs a flight-data provider (e.g. AeroDataBox) with an API key and a server-side proxy. This field is ready to be wired up later.",
    chronoWarning: "Records on this day are not in chronological time order", sortByTime: "Sort by time",
    addDayModalTitle: "Add a new day", addDayDate: "Date", confirmAdd: "Add",
    verify: "Verify with Maps", verified: "Verified", openMap: "Open in Maps", pickFromMap: "Pick from map",
    fromAlias: "Origin nickname", toAlias: "Destination nickname", aliasHint: "Shown in the table instead of the full text",
    flightAliasPlaceholder: "e.g. Tel Aviv (TLV)", copyPrevDest: "Copy previous row's destination",
    km: "km", min: "min", calculatingDistance: "Calculating distance...",
    locHint: "Tip: if the search finds nothing in Hebrew, try the local/English name instead (e.g. \"Fiumicino Airport\").",
    tabSearch: "Text search", tabMap: "Pick on map", mapPickHint: "Click anywhere on the map to mark it",
    mapResolving: "Resolving address...", mapNoName: "No exact address found for this point — you can still pick it by coordinates",
    confirmLocation: "Confirm this location",
    locPickerTitle: "Location search", locSearch: "Search", locSearching: "Searching...", locNoResults: "No results found",
    locError: "Search failed (network/CORS issue reaching the location service). You can open a manual Google Maps search instead:",
    openInGoogleSearch: "Open Google Maps search",
    flightPlaceholder: "City (airport code, e.g. TLV)", tzNote: "Automatic time-zone adjustment needs a commercial API (e.g. Google Time Zone) with a key — not implemented in this prototype. Please double-check that times are entered in each location's local time.",
  }
};

/* ---------- pure helpers ---------- */
function getTypeHint() { return ""; }

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
function detectTextAlign(text) {
  if (!text) return undefined;
  for (const ch of text) {
    if (/[\u0590-\u05FF]/.test(ch)) return "right";
    if (/[A-Za-z]/.test(ch)) return "left";
  }
  return undefined;
}
function typeMeta(typeId, types, T) {
  if (!typeId || typeId === "unset") return { id: "unset", name: (T && T.selectType) || "בחר...", icon: "Tag", color: "#C1443A" };
  return types.find((t) => t.id === typeId) || types[0];
}
function childFramesPure(frames, pid) { return frames.filter((f) => f.parentFrameId === pid).sort((a, b) => (a.startDate || "").localeCompare(b.startDate || "")); }
function rowsAtPure(rows, fid) { return rows.filter((r) => !r.parentId && (r.frameId || null) === (fid || null)); }
function dayGroupsAtPure(rows, fid) {
  const list = rowsAtPure(rows, fid); const map = new Map();
  list.forEach((r) => { if (!map.has(r.date)) map.set(r.date, []); map.get(r.date).push(r); });
  return Array.from(map.keys()).sort().map((date) => ({ date, rows: map.get(date) }));
}
function childrenOfPure(rows, parentId) { return rows.filter((r) => r.parentId === parentId); }
function collectRowsUnderPure(rows, frames, fid) {
  let result = rowsAtPure(rows, fid).slice();
  const extra = []; result.forEach((r) => extra.push(...childrenOfPure(rows, r.id)));
  result = result.concat(extra);
  childFramesPure(frames, fid).forEach((cf) => { result = result.concat(collectRowsUnderPure(rows, frames, cf.id)); });
  return result;
}
function frameTotalsPure(rows, frames, fid) {
  const t = {};
  collectRowsUnderPure(rows, frames, fid).forEach((r) => { const amt = Number(r.costAmount) || 0; if (!amt) return; t[r.costCurrency] = (t[r.costCurrency] || 0) + amt; });
  return t;
}
function frameDateIssue(draft, rows, frames, T) {
  if (!draft.startDate || !draft.endDate) return null;
  if (draft.startDate > draft.endDate) return T.frameRangeInvalid;
  if (draft.id) {
    const contentRows = collectRowsUnderPure(rows, frames, draft.id);
    const dates = contentRows.map((r) => r.date).filter(Boolean);
    if (dates.length) {
      const minD = dates.reduce((a, b) => (a < b ? a : b)), maxD = dates.reduce((a, b) => (a > b ? a : b));
      if (draft.startDate > minD || draft.endDate < maxD) return T.frameRangeContent;
    }
    const kids = childFramesPure(frames, draft.id);
    for (const k of kids) { if (k.startDate < draft.startDate || k.endDate > draft.endDate) return T.frameRangeContent; }
  }
  if (draft.parentFrameId) {
    const parent = frames.find((f) => f.id === draft.parentFrameId);
    if (parent && (draft.startDate < parent.startDate || draft.endDate > parent.endDate)) return T.frameRangeParent;
  }
  return null;
}
function rowFrameIssue(draft, frames, T) {
  if (!draft.frameId || !draft.date) return null;
  const f = frames.find((x) => x.id === draft.frameId);
  if (!f) return null;
  if (draft.date < f.startDate || draft.date > f.endDate) return T.rowOutOfFrame;
  return null;
}
function rowStartPoint(row) { return (row.from && row.from.trim()) || ""; }
function rowEndPoint(row) { return (row.to && row.to.trim()) || ""; }
const TRAVEL_MODE_MAP = {
  taxi: "driving", "car-rental": "driving", caravan: "driving", motorcycle: "driving",
  bicycle: "bicycling", scooter: "bicycling",
  train: "transit", "high-speed-train": "transit", bus: "transit",
  "self-tour": "walking", "guided-tour": "walking", "day-tour": "walking",
};
function rowOwnRouteUrl(row) {
  const origin = rowStartPoint(row), dest = rowEndPoint(row);
  if (!origin || !dest || origin === dest) return null;
  const mode = TRAVEL_MODE_MAP[row.typeId];
  let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`;
  if (mode) url += `&travelmode=${mode}`;
  return url;
}
function geocodeText(text) {
  return fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=he,en&q=${encodeURIComponent(text)}`, { headers: { Accept: "application/json" } })
    .then((r) => { if (!r.ok) throw new Error("http-" + r.status); return r.json(); })
    .then((data) => (data && data[0] ? { lat: Number(data[0].lat), lon: Number(data[0].lon) } : null));
}
function fetchDrivingRoute(a, b) {
  return fetch(`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`)
    .then((r) => { if (!r.ok) throw new Error("http-" + r.status); return r.json(); })
    .then((data) => {
      const route = data && data.routes && data.routes[0];
      if (!route) return null;
      return { distanceKm: route.distance / 1000, durationMin: route.duration / 60 };
    });
}
const COL_WIDTHS = {
  handle: 26, actions: 64,
  date: 78, day: 48, icon: 30, type: 112, from: 138, to: 138,
  startTime: 58, duration: 44, endTime: 58, route: 30, link: 30, cost: 84, notes: 30,
};
function colFixedWidth(key) {
  if (COL_WIDTHS[key] != null) return COL_WIDTHS[key];
  return 110; // fallback for custom columns
}
function dayRouteUrl(rowsInDay) {
  const points = [];
  rowsInDay.forEach((r) => { const a = rowStartPoint(r), b = rowEndPoint(r); if (a) points.push(a); if (b && b !== a) points.push(b); });
  const deduped = points.filter((p, i) => p !== points[i - 1]);
  if (deduped.length < 2) return null;
  return "https://www.google.com/maps/dir/" + deduped.map((p) => encodeURIComponent(p)).join("/");
}
function isChronological(rowsList) {
  let last = null;
  for (const r of rowsList) {
    if (!r.startTime) continue;
    if (last !== null && r.startTime < last) return false;
    last = r.startTime;
  }
  return true;
}
function initialRows() {
  const base = [
    { date: "2026-09-10", typeId: "flight", from: "Ben Gurion Airport", to: "Aeroporto di Roma - Fiumicino Leonardo da Vinci", fromAlias: "תל אביב (TLV)", toAlias: "רומא (FCO)", startTime: "07:40", endTime: "10:35", link: "https://www.google.com/flights", costAmount: 1450, costCurrency: "₪", flightNumber: "LY386" },
    { date: "2026-09-10", typeId: "taxi", from: "Aeroporto di Roma - Fiumicino Leonardo da Vinci", to: "Hilton Garden Inn Rome Airport", startTime: "11:15", endTime: "12:00", costAmount: 45, costCurrency: "€" },
    { date: "2026-09-10", typeId: "hotel", from: "Hilton Garden Inn Rome Airport", to: "Hilton Garden Inn Rome Airport", startTime: "12:00", endTime: "15:00", notes: "מנוחה במלון", link: "https://www.booking.com", costAmount: 620, costCurrency: "€" },
    { date: "2026-09-10", typeId: "train", from: "Hilton Garden Inn Rome Airport", to: "Fontana di Trevi", startTime: "15:30", endTime: "16:10", costAmount: 8, costCurrency: "€" },
    { date: "2026-09-10", typeId: "day-tour", from: "Fontana di Trevi", to: "Fontana di Trevi", startTime: "16:15", endTime: "19:00", costAmount: 0, costCurrency: "€" },
    { date: "2026-09-11", typeId: "guided-tour", from: "", to: "", startTime: "09:00", endTime: "13:00", link: "https://maps.google.com", costAmount: 280, costCurrency: "€" },
    { date: "2026-09-11", typeId: "self-tour", from: "", to: "", startTime: "16:00", endTime: "19:30", costAmount: 0, costCurrency: "€" },
    { date: "2026-09-14", typeId: "flight", from: "Aeroporto di Roma - Fiumicino Leonardo da Vinci", to: "Ben Gurion Airport", fromAlias: "רומא (FCO)", toAlias: "תל אביב (TLV)", startTime: "18:20", endTime: "21:50", costAmount: 1390, costCurrency: "₪", flightNumber: "LY387" },
  ];
  return base.map((r) => ({ id: uid(), parentId: null, frameId: null, overnight: false, notes: "", mapLink: "", fromVerifiedUrl: "", fromVerifiedText: "", toVerifiedUrl: "", toVerifiedText: "", fromAlias: "", toAlias: "", fromLat: null, fromLon: null, toLat: null, toLon: null, routeDistanceKm: null, routeDurationMin: null, custom: {}, ...r }));
}

/* ================================================================= */
/*  Hoisted display components                                        */
/* ================================================================= */

function RowLine({ row, depth, hasChildren, collapsed, toggleCollapse, prevRow, ctx }) {
  const { T, lang, types, visibleColumns, updateRow, deleteRow, openCard, addRow,
    dragId, setDragId, onDropRow, typeMenuOpen, setTypeMenuOpen, newTypeDraft, setNewTypeDraft, addCustomType } = ctx;
  const tm = typeMeta(row.typeId, types, T);
  const Icon = ICONS[tm.icon] || Tag;
  const dur = computeDuration(row.startTime, row.endTime, row.overnight);
  const routeUrl = rowOwnRouteUrl(row);
  const fromVerified = row.fromVerifiedUrl && row.fromVerifiedText === row.from;
  const toVerified = row.toVerifiedUrl && row.toVerifiedText === row.to;
  const typeBtnRef = useRef(null);
  const [typeMenuPos, setTypeMenuPos] = useState({ top: 0, left: 0 });
  const [distLoading, setDistLoading] = useState(false);

  function handleRouteHover() {
    if (row.routeDistanceKm != null || distLoading) return;
    const origin = rowStartPoint(row), dest = rowEndPoint(row);
    if (!origin || !dest) return;
    setDistLoading(true);
    const originP = (row.fromLat != null && row.fromLon != null) ? Promise.resolve({ lat: row.fromLat, lon: row.fromLon }) : geocodeText(origin);
    const destP = (row.toLat != null && row.toLon != null) ? Promise.resolve({ lat: row.toLat, lon: row.toLon }) : geocodeText(dest);
    Promise.all([originP, destP]).then(([a, b]) => {
      if (!a || !b) { setDistLoading(false); return; }
      return fetchDrivingRoute(a, b).then((info) => {
        setDistLoading(false);
        if (info) updateRow(row.id, { routeDistanceKm: info.distanceKm, routeDurationMin: info.durationMin, fromLat: a.lat, fromLon: a.lon, toLat: b.lat, toLon: b.lon });
      });
    }).catch(() => setDistLoading(false));
  }

  function computeTypeMenuPos() {
    if (!typeBtnRef.current) return;
    const r = typeBtnRef.current.getBoundingClientRect();
    const estMenuHeight = 300;
    const spaceBelow = window.innerHeight - r.bottom;
    if (spaceBelow < estMenuHeight && r.top > spaceBelow) {
      setTypeMenuPos({ bottom: window.innerHeight - r.top + 4, top: null, left: r.left });
    } else {
      setTypeMenuPos({ top: r.bottom + 4, bottom: null, left: r.left });
    }
  }
  function toggleTypeMenu() {
    if (typeMenuOpen === row.id) { setTypeMenuOpen(null); return; }
    computeTypeMenuPos();
    setTypeMenuOpen(row.id);
  }
  useEffect(() => {
    if (typeMenuOpen !== row.id) return;
    window.addEventListener("scroll", computeTypeMenuPos, true);
    window.addEventListener("resize", computeTypeMenuPos);
    return () => { window.removeEventListener("scroll", computeTypeMenuPos, true); window.removeEventListener("resize", computeTypeMenuPos); };
  }, [typeMenuOpen === row.id]);

  function renderCell(col) {
    switch (col.key) {
      case "date": return depth === 0 ? fmtDate(row.date, lang) : "";
      case "day": return depth === 0 ? heDay(row.date, lang) : "";
      case "icon": return <span className="mt-type-icon" style={{ background: tm.color }}><Icon /></span>;
      case "type": return (
        <div className="mt-type-wrap">
          <button className="mt-type-btn" ref={typeBtnRef} title={tm.name} onClick={toggleTypeMenu}>
            <span className="mt-type-text">{tm.name}</span> <ChevronDown size={12} />
          </button>
          {typeMenuOpen === row.id && (
            <>
              <div className="mt-floating-backdrop" onClick={() => setTypeMenuOpen(null)} />
              <div className="mt-type-menu" style={{ top: typeMenuPos.top ?? undefined, bottom: typeMenuPos.bottom ?? undefined, left: typeMenuPos.left }}>
                {groupTypesByCategory(types).map((grp) => (
                  <React.Fragment key={grp.category}>
                    <div className="mt-type-cat-label">{CATEGORY_LABELS[lang][grp.category] || grp.category}</div>
                    {grp.items.map((t) => { const TI = ICONS[t.icon] || Tag; return (
                      <button key={t.id} className="opt" onClick={() => { updateRow(row.id, { typeId: t.id }); setTypeMenuOpen(null); }}>
                        <span className="mt-type-icon" style={{ background: t.color, width: 20, height: 20 }}><TI size={11} /></span>{t.name}
                      </button>
                    ); })}
                  </React.Fragment>
                ))}
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
            </>
          )}
        </div>
      );
      case "from": return (
        <span className={"mt-loc-cell" + (fromVerified ? " has-badge" : "")}>
          {row.fromAlias ? (
            <input className="mt-editable" dir="auto" style={{ textAlign: detectTextAlign(row.fromAlias) }} title={row.from} value={row.fromAlias} onChange={(e) => updateRow(row.id, { fromAlias: e.target.value })} />
          ) : (
            <input className="mt-editable" dir="auto" style={{ textAlign: detectTextAlign(row.from) }} title={row.from} placeholder={getTypeHint(row.typeId, "from", lang)} value={row.from} onChange={(e) => updateRow(row.id, { from: e.target.value })} />
          )}
          {fromVerified && <a className="mt-loc-badge" href={row.fromVerifiedUrl} target="_blank" rel="noreferrer" title={T.openMap}><MapPin size={11} /></a>}
        </span>
      );
      case "to": return (
        <span className={"mt-loc-cell" + (toVerified ? " has-badge" : "")}>
          {row.toAlias ? (
            <input className="mt-editable" dir="auto" style={{ textAlign: detectTextAlign(row.toAlias) }} title={row.to} value={row.toAlias} onChange={(e) => updateRow(row.id, { toAlias: e.target.value })} />
          ) : (
            <input className="mt-editable" dir="auto" style={{ textAlign: detectTextAlign(row.to) }} title={row.to} placeholder={getTypeHint(row.typeId, "to", lang)} value={row.to} onChange={(e) => updateRow(row.id, { to: e.target.value })} />
          )}
          {toVerified && <a className="mt-loc-badge" href={row.toVerifiedUrl} target="_blank" rel="noreferrer" title={T.openMap}><MapPin size={11} /></a>}
        </span>
      );
      case "startTime": return <input className="mt-editable mt-time" type="time" value={row.startTime} onChange={(e) => updateRow(row.id, { startTime: e.target.value })} />;
      case "duration": return <span title={dur === null ? "" : dur} style={{ color: dur === null ? "var(--danger)" : "var(--muted)", fontSize: 12 }}>{dur === null ? "!" : dur}</span>;
      case "endTime": return <input className="mt-editable mt-time" type="time" value={row.endTime} onChange={(e) => updateRow(row.id, { endTime: e.target.value })} />;
      case "route": return routeUrl ? (
        <a className="mt-link-icon" href={routeUrl} target="_blank" rel="noreferrer" onMouseEnter={handleRouteHover}
          title={distLoading ? T.calculatingDistance : (row.routeDistanceKm != null ? `${T.routeTooltip} — ${row.routeDistanceKm.toFixed(1)} ${T.km} (~${Math.round(row.routeDurationMin)} ${T.min})` : T.routeTooltip)}>
          <Route size={14} />
        </a>
      ) : <span className="mt-link-icon empty" title={T.noRoute}><Route size={14} /></span>;
      case "link": return row.link ? (
        <a className="mt-link-icon" href={row.link} target="_blank" rel="noreferrer" title={row.link}><Link2 size={14} /></a>
      ) : (
        <button className="mt-link-icon empty" title={T.link} onClick={() => openCard(row)}><Link2 size={14} /></button>
      );
      case "cost": return (
        <span className="mt-cost">{row.costCurrency}
          <input className="mt-editable" type="number" title={String(row.costAmount)} value={row.costAmount} onChange={(e) => updateRow(row.id, { costAmount: e.target.value })} />
        </span>
      );
      case "notes": return row.notes ? (
        <button className="mt-link-icon has-note" title={row.notes} onClick={() => openCard(row)}><StickyNote size={14} /></button>
      ) : (
        <button className="mt-link-icon empty" title={T.notes} onClick={() => openCard(row)}><StickyNote size={14} /></button>
      );
      default:
        if (col.custom) return <input className="mt-editable" title={(row.custom && row.custom[col.key]) || ""} value={(row.custom && row.custom[col.key]) || ""} onChange={(e) => updateRow(row.id, { custom: { ...row.custom, [col.key]: e.target.value } })} />;
        return null;
    }
  }

  return (
    <tr className={depth > 0 ? "is-sub" : ""} draggable onDragStart={() => setDragId(row.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDropRow(row.id)} style={{ opacity: dragId === row.id ? 0.4 : 1 }}>
      <td className="handle">
        <div className="mt-handle-wrap" style={{ paddingInlineStart: depth * 14 }}>
          <span className="mt-drag-handle" title={T.dragHint}><GripVertical size={13} /></span>
          {hasChildren && <button onClick={toggleCollapse} style={{ border: "none", background: "none", display: "flex", color: "var(--muted)" }}>{collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}</button>}
        </div>
      </td>
      {visibleColumns.map((col) => <td key={col.key} className={col.key}>{renderCell(col)}</td>)}
      <td className="actions">
        <div className="mt-row-actions">
          <button onClick={() => openCard(row)} title={T.editRecord}><Pencil /></button>
          {depth === 0 && <button onClick={() => addRow(row.date, row.id, row.frameId)} title={T.addSub}><Plus /></button>}
          <button onClick={() => deleteRow(row.id)} title={T.delete}><Trash2 /></button>
        </div>
      </td>
    </tr>
  );
}

function DayGroup({ g, fid, depth, ctx }) {
  const { T, lang, effectiveMobile, collapsedGroups, setCollapsedGroups, collapsedParents, setCollapsedParents,
    addRow, openCard, types, visibleColumns, openAddDayModal, rows, sortDayByTime, getColWidth, startResize } = ctx;
  const gk = (fid || "root") + "__" + g.date;
  const collapsed = !!collapsedGroups[gk];
  const childrenOf = (pid) => childrenOfPure(rows, pid);
  const allRowsHere = g.rows.flatMap((r) => [r, ...childrenOf(r.id)]);
  const dayRoute = dayRouteUrl(g.rows);
  const chronoOk = isChronological(g.rows);

  return (
    <div className="mt-group">
      <div className="mt-group-header" onClick={() => setCollapsedGroups((p) => ({ ...p, [gk]: !p[gk] }))}>
        <span className="chev">{collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}</span>
        <span className="mt-group-date">{fmtDate(g.date, lang)}</span>
        <span className="mt-group-day">{heDay(g.date, lang)}</span>
        <div className="mt-group-actions" onClick={(e) => e.stopPropagation()}>
          <button className="mt-group-add" onClick={() => openAddDayModal(fid)}><Plus size={13} /> {T.addDay}</button>
          {dayRoute ? (
            <a className="mt-group-add" href={dayRoute} target="_blank" rel="noreferrer"><Waypoints size={13} /> {T.dayRoute}</a>
          ) : (
            <span className="mt-group-add disabled" title={T.noRoute}><Waypoints size={13} /> {T.dayRoute}</span>
          )}
        </div>
      </div>
      {!chronoOk && (
        <div className="mt-chrono-warning">
          <Clock size={13} /> {T.chronoWarning}
          <button className="mt-btn ghost" style={{ marginInlineStart: "auto" }} onClick={() => sortDayByTime(fid, g.date)}><ArrowDownUp size={12} /> {T.sortByTime}</button>
        </div>
      )}
      {!collapsed && (effectiveMobile ? (
        <div className="mt-cards">
          {allRowsHere.map((r) => {
            const tm = typeMeta(r.typeId, types, T); const Icon = ICONS[tm.icon] || Tag;
            return (
              <div className="mt-card" key={r.id} onClick={() => openCard(r)}>
                <div className="mt-card-top">
                  <div className="mt-type-chip">
                    <span className="mt-type-icon" style={{ background: tm.color }}><Icon /></span>
                    <strong style={{ fontSize: 13.5 }}>{tm.name}</strong>
                  </div>
                  <span className="mt-card-times">{r.startTime || "—"}{r.endTime ? ` – ${r.endTime}` : ""}</span>
                </div>
                <div className="mt-card-dest">{r.toAlias || r.to || r.fromAlias || r.from || "—"}</div>
                <div className="mt-card-bottom">
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{r.from}{r.from && r.to ? " → " : ""}{r.to}</span>
                  {Number(r.costAmount) > 0 && <span className="mt-cost">{r.costCurrency}{r.costAmount}</span>}
                </div>
              </div>
            );
          })}
          <button className="mt-group-add mt-group-add-bottom" onClick={() => addRow(g.date, null, fid)}><Plus size={13} /> {T.addRow}</button>
        </div>
      ) : (
        <div className="mt-table-wrap">
          <table className="mt-table">
            <colgroup>
              <col style={{ width: getColWidth("handle") }} />
              {visibleColumns.map((c) => <col key={c.key} style={{ width: getColWidth(c.key) }} />)}
              <col style={{ width: getColWidth("actions") }} />
            </colgroup>
            <thead>
              <tr>
                <th className="handle"></th>
                {visibleColumns.map((c) => (
                  <th key={c.key} className={c.key} title={lang === "he" ? c.label_he : c.label_en}>
                    {lang === "he" ? c.label_he : c.label_en}
                    <span className="mt-col-resizer" onMouseDown={(e) => startResize(e, c.key)} />
                  </th>
                ))}
                <th className="actions"></th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r, idx) => (
                <React.Fragment key={r.id}>
                  <RowLine row={r} depth={0} hasChildren={childrenOf(r.id).length > 0}
                    collapsed={!!collapsedParents[r.id]} prevRow={idx > 0 ? g.rows[idx - 1] : null}
                    toggleCollapse={() => setCollapsedParents((p) => ({ ...p, [r.id]: !p[r.id] }))} ctx={ctx} />
                  {!collapsedParents[r.id] && childrenOf(r.id).map((child) => (
                    <RowLine key={child.id} row={child} depth={1} hasChildren={false} collapsed={false} toggleCollapse={() => {}} prevRow={null} ctx={ctx} />
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <button className="mt-group-add mt-group-add-bottom" onClick={() => addRow(g.date, null, fid)}><Plus size={13} /> {T.addRow}</button>
        </div>
      ))}
    </div>
  );
}

function FrameBlock({ frame, depth, ctx, renderContext }) {
  const { T, lang, toggleFrameCollapse, openFrameModal, deleteFrame, openAddDayModal, addRow, lastDateInContext, frameTotals, displayCurrency, convertAmount } = ctx;
  const totals = frameTotals(frame.id);
  const convertedTotal = Object.entries(totals).reduce((sum, [cur, amt]) => sum + convertAmount(amt, cur, displayCurrency), 0);
  const color = FRAME_COLORS[depth % FRAME_COLORS.length];
  return (
    <div className="mt-frame-block" style={{ "--frame-color": color }}>
      <div className="mt-frame-header" onClick={() => toggleFrameCollapse(frame.id)}>
        <span className="chev">{frame.collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}</span>
        <span className="mt-frame-name">{frame.name}</span>
        <span className="mt-frame-range">{fmtDate(frame.startDate, lang)} – {fmtDate(frame.endDate, lang)}</span>
        {convertedTotal > 0 && (
          <span className="mt-chip small">{displayCurrency} {convertedTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        )}
        <span className="mt-frame-actions" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => openAddDayModal(frame.id)} title={T.addDay}><Plus size={14} /></button>
          <button onClick={() => openFrameModal(null, frame.id)} title={T.addSubFrame}><FolderPlus size={14} /></button>
          <button onClick={() => openFrameModal(frame)} title={T.editRecord}><Pencil size={13} /></button>
          <button onClick={() => deleteFrame(frame.id)} title={T.delete}><Trash2 size={13} /></button>
        </span>
      </div>
      {!frame.collapsed && (
        <div className="mt-frame-body">
          {renderContext(frame.id, depth + 1)}
          <button className="mt-group-add mt-frame-add-row" onClick={() => addRow(lastDateInContext(frame.id), null, frame.id)}><Plus size={13} /> {T.addRow}</button>
        </div>
      )}
    </div>
  );
}

function MapClickCapture({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

/* ================================================================= */
/*  Main app                                                          */
/* ================================================================= */

export default function MyTripApp() {
  const [rows, setRows] = useState(initialRows);
  const [frames, setFrames] = useState([]);
  const [types, setTypes] = useState(DEFAULT_TYPES);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [columnWidths, setColumnWidths] = useState({});
  const [importMsg, setImportMsg] = useState(null);
  const importInputRef = useRef(null);
  const [lang, setLang] = useState("he");
  const [viewMode, setViewMode] = useState("auto");
  const [narrowScreen, setNarrowScreen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [collapsedParents, setCollapsedParents] = useState({});
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [colMenuPos, setColMenuPos] = useState({ top: 0, left: 0 });
  const [newColName, setNewColName] = useState("");
  const [typeMenuOpen, setTypeMenuOpen] = useState(null);
  const [newTypeDraft, setNewTypeDraft] = useState({ name: "", icon: "Tag" });
  const [addTypeOpen, setAddTypeOpen] = useState(false);
  const [addTypePos, setAddTypePos] = useState({ top: 0, left: 0 });
  const [addTypeDraft, setAddTypeDraft] = useState({ name: "", icon: "Tag" });
  const [cardRowId, setCardRowId] = useState(null);
  const [cardDraft, setCardDraft] = useState(null);
  const [flightLookupMsg, setFlightLookupMsg] = useState("");
  const [frameDraft, setFrameDraft] = useState(null);
  const [addDayCtx, setAddDayCtx] = useState(null); // { fid, date }
  const [locPicker, setLocPicker] = useState(null); // { field, query, results, loading }
  const [dragId, setDragId] = useState(null);
  const [dismissedKey, setDismissedKey] = useState("");
  const [displayCurrency, setDisplayCurrency] = useState("₪");
  const [fxRates, setFxRates] = useState(null);
  const [fxIsLive, setFxIsLive] = useState(false);
  const columnsBtnRef = useRef(null);
  const addTypeBtnRef = useRef(null);
  const dir = lang === "he" ? "rtl" : "ltr";
  const T = T_DICT[lang];

  useEffect(() => {
    let cancelled = false;
    fetch("https://open.er-api.com/v6/latest/ILS")
      .then((res) => res.json())
      .then((data) => { if (cancelled || !data || !data.rates) throw new Error("bad response"); setFxRates(data.rates); setFxIsLive(true); })
      .catch(() => { if (!cancelled) { setFxRates(FALLBACK_RATES); setFxIsLive(false); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function onResize() { setNarrowScreen(window.innerWidth < 780); }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function convertAmount(amount, fromSymbol, toSymbol) {
    const rates = fxRates || FALLBACK_RATES;
    const fromRate = rates[CURRENCY_CODE_MAP[fromSymbol]], toRate = rates[CURRENCY_CODE_MAP[toSymbol]];
    if (!fromRate || !toRate) return amount;
    return (amount / fromRate) * toRate;
  }

  const effectiveMobile = viewMode === "mobile" || (viewMode === "auto" && narrowScreen);
  function getColWidth(key) { return columnWidths[key] != null ? columnWidths[key] : colFixedWidth(key); }
  function startResize(e, key) {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    const startWidth = getColWidth(key);
    function onMove(ev) {
      const delta = ev.clientX - startX;
      const signed = dir === "rtl" ? -delta : delta;
      setColumnWidths((prev) => ({ ...prev, [key]: Math.max(24, startWidth + signed) }));
    }
    function onUp() { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }
  function resetColumnWidths() { setColumnWidths({}); }

  function exportToFile() {
    const payload = { version: APP_VERSION, exportedAt: new Date().toISOString(), rows, frames, types, columns, columnWidths, displayCurrency };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mytrip-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function importFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.rows)) throw new Error("bad-format");
        setRows(data.rows);
        setFrames(Array.isArray(data.frames) ? data.frames : []);
        if (Array.isArray(data.types) && data.types.length) setTypes(data.types);
        if (Array.isArray(data.columns) && data.columns.length) setColumns(data.columns);
        if (data.columnWidths) setColumnWidths(data.columnWidths);
        if (data.displayCurrency) setDisplayCurrency(data.displayCurrency);
        setImportMsg({ ok: true });
      } catch (e) {
        setImportMsg({ ok: false });
      }
    };
    reader.readAsText(file);
  }
  const visibleColumns = columns.filter((c) => c.visible);

  /* ---------- bound data helpers ---------- */
  function childFrames(pid) { return childFramesPure(frames, pid); }
  function rowsAt(fid) { return rowsAtPure(rows, fid); }
  function dayGroupsAt(fid) { return dayGroupsAtPure(rows, fid); }
  function childrenOf(parentId) { return childrenOfPure(rows, parentId); }
  function collectRowsUnder(fid) { return collectRowsUnderPure(rows, frames, fid); }
  function frameTotals(fid) { return frameTotalsPure(rows, frames, fid); }
  function frameOptionsList(excludeId) {
    const result = [];
    function walk(list, depth) {
      list.forEach((f) => { if (f.id === excludeId) return; result.push({ id: f.id, label: "—".repeat(depth) + " " + f.name }); walk(childFrames(f.id), depth + 1); });
    }
    walk(childFrames(null), 0);
    return result;
  }
  function lastDateInContext(fid) {
    const groups = dayGroupsAt(fid);
    if (groups.length) return groups[groups.length - 1].date;
    const frame = fid ? frames.find((f) => f.id === fid) : null;
    return frame ? frame.startDate : new Date().toISOString().slice(0, 10);
  }
  function nextDateInContext(fid) {
    const frame = fid ? frames.find((f) => f.id === fid) : null;
    const groups = dayGroupsAt(fid);
    const kids = childFrames(fid);
    let maxDate = groups.length ? groups[groups.length - 1].date : null;
    kids.forEach((k) => { if (k.endDate && (!maxDate || k.endDate > maxDate)) maxDate = k.endDate; });
    let base;
    if (maxDate) { const d = new Date(maxDate + "T00:00:00"); d.setDate(d.getDate() + 1); base = d.toISOString().slice(0, 10); }
    else if (frame) base = frame.startDate;
    else base = new Date().toISOString().slice(0, 10);
    if (frame) { if (base > frame.endDate) base = frame.endDate; if (base < frame.startDate) base = frame.startDate; }
    return base;
  }
  function prevDateInContext(fid) {
    const frame = fid ? frames.find((f) => f.id === fid) : null;
    const groups = dayGroupsAt(fid);
    const kids = childFrames(fid);
    let minDate = groups.length ? groups[0].date : null;
    kids.forEach((k) => { if (k.startDate && (!minDate || k.startDate < minDate)) minDate = k.startDate; });
    let base;
    if (minDate) { const d = new Date(minDate + "T00:00:00"); d.setDate(d.getDate() - 1); base = d.toISOString().slice(0, 10); }
    else if (frame) base = frame.startDate;
    else base = new Date().toISOString().slice(0, 10);
    if (frame) { if (base < frame.startDate) base = frame.startDate; if (base > frame.endDate) base = frame.endDate; }
    return base;
  }

  const grandTotals = useMemo(() => {
    const t = {};
    rows.forEach((r) => { const amt = Number(r.costAmount) || 0; if (!amt) return; t[r.costCurrency] = (t[r.costCurrency] || 0) + amt; });
    return t;
  }, [rows]);
  const convertedGrandTotal = useMemo(() => Object.entries(grandTotals).reduce((sum, [cur, amt]) => sum + convertAmount(amt, cur, displayCurrency), 0), [grandTotals, displayCurrency, fxRates]);

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
      typeId: "unset", from: "", to: "", startTime: "", endTime: "", overnight: false,
      destination: "", link: "", mapLink: "", flightNumber: "", costAmount: 0, costCurrency: "₪", fromAlias: "", toAlias: "",
      notes: "", fromVerifiedUrl: "", fromVerifiedText: "", toVerifiedUrl: "", toVerifiedText: "",
      fromLat: null, fromLon: null, toLat: null, toLon: null, routeDistanceKm: null, routeDurationMin: null, custom: {},
    };
    setRows((prev) => [...prev, nr]);
    return nr.id;
  }
  function sortDayByTime(fid, date) {
    setRows((prev) => {
      const topRows = prev.filter((r) => !r.parentId && (r.frameId || null) === (fid || null) && r.date === date);
      const usedIds = new Set();
      const blocks = topRows.map((p) => { const children = prev.filter((c) => c.parentId === p.id); usedIds.add(p.id); children.forEach((c) => usedIds.add(c.id)); return { parent: p, children }; });
      const sortedBlocks = [...blocks].sort((a, b) => (a.parent.startTime || "99:99").localeCompare(b.parent.startTime || "99:99"));
      const flattened = sortedBlocks.flatMap((b) => [b.parent, ...b.children]);
      const result = []; let inserted = false;
      prev.forEach((r) => { if (usedIds.has(r.id)) { if (!inserted) { result.push(...flattened); inserted = true; } } else result.push(r); });
      return result;
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

  /* ---------- add-day modal ---------- */
  function openAddDayModal(fid) { setAddDayCtx({ fid, date: nextDateInContext(fid) }); }
  function closeAddDayModal() { setAddDayCtx(null); }
  const addDayFrame = addDayCtx && addDayCtx.fid ? frames.find((f) => f.id === addDayCtx.fid) : null;
  const addDayIssue = addDayCtx && addDayFrame && (addDayCtx.date < addDayFrame.startDate || addDayCtx.date > addDayFrame.endDate) ? T.rowOutOfFrame : null;
  function confirmAddDay() {
    if (!addDayCtx || !addDayCtx.date || addDayIssue) return;
    addRow(addDayCtx.date, null, addDayCtx.fid);
    closeAddDayModal();
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
  function openColumnsMenu() {
    if (columnsBtnRef.current) { const r = columnsBtnRef.current.getBoundingClientRect(); setColMenuPos({ top: r.bottom + 8, left: r.left }); }
    setColMenuOpen((v) => !v);
  }
  function openAddTypeMenu() {
    if (addTypeBtnRef.current) { const r = addTypeBtnRef.current.getBoundingClientRect(); setAddTypePos({ top: r.bottom + 8, left: r.left }); }
    setAddTypeOpen((v) => !v);
  }
  function submitAddType() {
    if (!addTypeDraft.name.trim()) return;
    const id = "custom-" + uid();
    const color = CUSTOM_COLOR_ROTATION[types.length % CUSTOM_COLOR_ROTATION.length];
    setTypes((prev) => [...prev, { id, name: addTypeDraft.name, icon: addTypeDraft.icon, color }]);
    setAddTypeDraft({ name: "", icon: "Tag" }); setAddTypeOpen(false);
  }

  /* ---------- location verification (OpenStreetMap Nominatim — free, no API key) ---------- */
  function openLocationPicker(field) {
    const initialQuery = cardDraft ? (cardDraft[field] || "") : "";
    setLocPicker({ field, mode: "search", query: initialQuery, results: [], loading: false, error: null, mapMarker: null, mapCenter: DEFAULT_MAP_CENTER });
    if (initialQuery.trim()) runLocationSearch(initialQuery);
  }
  function runLocationSearch(queryOverride) {
    const q = (queryOverride !== undefined ? queryOverride : locPicker && locPicker.query) || "";
    if (!q.trim()) return;
    setLocPicker((p) => ({ ...p, loading: true, error: null }));
    fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&extratags=1&limit=5&accept-language=he,en&q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } })
      .then((r) => { if (!r.ok) throw new Error("http-" + r.status); return r.json(); })
      .then((data) => setLocPicker((p) => (p ? { ...p, loading: false, error: null, results: Array.isArray(data) ? data : [] } : p)))
      .catch((err) => setLocPicker((p) => (p ? { ...p, loading: false, results: [], error: (err && err.message) || "network" } : p)));
  }
  function setLocPickerMode(mode) { setLocPicker((p) => ({ ...p, mode })); }
  function handleMapPick(lat, lng) {
    setLocPicker((p) => ({ ...p, mapMarker: { lat, lng, label: null, loading: true, error: null }, mapCenter: [lat, lng] }));
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&extratags=1&lat=${lat}&lon=${lng}&accept-language=he,en`, { headers: { Accept: "application/json" } })
      .then((r) => { if (!r.ok) throw new Error("http-" + r.status); return r.json(); })
      .then((data) => setLocPicker((p) => (p ? { ...p, mapMarker: { lat, lng, label: data.display_name || null, address: data.address, extratags: data.extratags, loading: false, error: data.display_name ? null : "no-name" } } : p)))
      .catch(() => setLocPicker((p) => (p ? { ...p, mapMarker: { lat, lng, label: null, loading: false, error: "network" } } : p)));
  }
  function confirmMapPick() {
    if (!locPicker || !locPicker.mapMarker) return;
    const m = locPicker.mapMarker;
    pickLocation({ display_name: m.label || `${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}`, lat: m.lat, lon: m.lng, address: m.address, extratags: m.extratags });
  }
  function pickLocation(result) {
    const label = result.display_name.split(",").slice(0, 2).join(",").trim();
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${result.lat},${result.lon}`;
    const isFlightRow = cardDraft && (cardDraft.typeId === "flight" || cardDraft.typeId === "domestic-flight");
    const addr = result.address || {};
    const cityName = addr.city || addr.town || addr.village || addr.state || label.split(",")[0];
    const iata = result.extratags && (result.extratags.iata || result.extratags["iata"]);
    const flightAlias = iata ? `${cityName} (${iata.toUpperCase()})` : "";
    if (locPicker.field === "from") {
      setCardDraft((d) => ({ ...d, from: label, fromVerifiedUrl: mapUrl, fromVerifiedText: label, fromLat: Number(result.lat), fromLon: Number(result.lon), ...(isFlightRow && flightAlias ? { fromAlias: flightAlias } : {}) }));
    } else if (locPicker.field === "to") {
      setCardDraft((d) => ({ ...d, to: label, toVerifiedUrl: mapUrl, toVerifiedText: label, toLat: Number(result.lat), toLon: Number(result.lon), ...(isFlightRow && flightAlias ? { toAlias: flightAlias } : {}) }));
    } else if (locPicker.field === "fromAlias") setCardDraft((d) => ({ ...d, fromAlias: label }));
    else if (locPicker.field === "toAlias") setCardDraft((d) => ({ ...d, toAlias: label }));
    setLocPicker(null);
  }

  /* ---------- record card ---------- */
  function openCard(row) { setCardRowId(row.id); setCardDraft({ ...row }); setFlightLookupMsg(""); }
  function closeCard() { setCardRowId(null); setCardDraft(null); setFlightLookupMsg(""); setLocPicker(null); }
  function findPrevRowInDay(rowId) {
    const row = rows.find((r) => r.id === rowId);
    if (!row || row.parentId) return null;
    const siblings = rows.filter((r) => !r.parentId && r.date === row.date && (r.frameId || null) === (row.frameId || null));
    const idx = siblings.findIndex((r) => r.id === row.id);
    if (idx <= 0) return null;
    return siblings[idx - 1];
  }
  const prevRowForCard = cardDraft ? findPrevRowInDay(cardRowId) : null;
  function copyPrevDestinationToFrom() {
    if (!prevRowForCard) return;
    setCardDraft((d) => ({
      ...d,
      from: prevRowForCard.to || d.from,
      fromAlias: prevRowForCard.toAlias || "",
      fromVerifiedUrl: prevRowForCard.toVerifiedUrl || "",
      fromVerifiedText: prevRowForCard.toVerifiedUrl ? (prevRowForCard.toVerifiedText || prevRowForCard.to) : "",
    }));
  }
  const cardHasTimeError = cardDraft && cardDraft.startTime && cardDraft.endTime && computeDuration(cardDraft.startTime, cardDraft.endTime, cardDraft.overnight) === null;
  const cardFrameIssue = cardDraft ? rowFrameIssue(cardDraft, frames, T) : null;
  function saveCard() {
    if (!cardDraft.date || cardHasTimeError || cardFrameIssue) return;
    updateRow(cardRowId, cardDraft); closeCard();
  }
  function fetchFlightData() {
    if (!FLIGHT_LOOKUP_ENABLED) { setFlightLookupMsg(T.flightApiMissing); return; }
    // Placeholder for a real provider call, e.g.:
    // fetch(`/api/flight-lookup?flight=${cardDraft.flightNumber}`).then(...)
  }

  /* ---------- frame modal ---------- */
  function openFrameModal(frame, presetParentId) {
    setFrameDraft(frame ? { ...frame } : { id: null, name: "", startDate: "", endDate: "", parentFrameId: presetParentId || null, collapsed: false });
  }
  function closeFrameModal() { setFrameDraft(null); }
  function fillFrameDatesBelow() {
    if (!frameDraft) return;
    const suggestedStart = nextDateInContext(frameDraft.parentFrameId || null);
    setFrameDraft((d) => ({ ...d, startDate: suggestedStart, endDate: suggestedStart }));
  }
  function fillFrameDatesAbove() {
    if (!frameDraft) return;
    const suggestedStart = prevDateInContext(frameDraft.parentFrameId || null);
    setFrameDraft((d) => ({ ...d, startDate: suggestedStart, endDate: suggestedStart }));
  }
  const frameIssue = frameDraft ? frameDateIssue(frameDraft, rows, frames, T) : null;
  function saveFrame() {
    if (!frameDraft.name.trim() || !frameDraft.startDate || !frameDraft.endDate || frameIssue) return;
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

  /* ---------- recursive render ---------- */
  const ctx = {
    T, lang, types, visibleColumns, effectiveMobile, rows, frames,
    updateRow, deleteRow, openCard, addRow, dragId, setDragId, onDropRow,
    typeMenuOpen, setTypeMenuOpen, newTypeDraft, setNewTypeDraft, addCustomType,
    collapsedParents, setCollapsedParents, collapsedGroups, setCollapsedGroups,
    toggleFrameCollapse, openFrameModal, deleteFrame, nextDateInContext, lastDateInContext, frameTotals,
    openAddDayModal, sortDayByTime, getColWidth, startResize, displayCurrency, convertAmount,
  };

  function renderContext(fid, depth) {
    const cf = childFrames(fid); const dg = dayGroupsAt(fid);
    const nodes = [
      ...cf.map((f) => ({ type: "frame", key: "f-" + f.id, sort: f.startDate || "", frame: f })),
      ...dg.map((g) => ({ type: "day", key: "d-" + g.date, sort: g.date, group: g })),
    ].sort((a, b) => {
      if (a.sort !== b.sort) return a.sort.localeCompare(b.sort);
      if (a.type !== b.type) return a.type === "day" ? -1 : 1; // same date: existing day records render before a same-dated frame
      return 0;
    });

    if (nodes.length === 0) {
      return (
        <div className="mt-empty">
          {T.noRows}
          <button className="mt-btn ghost" style={{ marginTop: 8 }} onClick={() => openAddDayModal(fid)}>
            <Plus size={13} /> {T.addDay}
          </button>
        </div>
      );
    }
    return nodes.map((n) => n.type === "frame"
      ? <FrameBlock key={n.key} frame={n.frame} depth={depth} ctx={ctx} renderContext={renderContext} />
      : <DayGroup key={n.key} g={n.group} fid={fid} depth={depth} ctx={ctx} />
    );
  }

  function DateField({ value, onChange }) {
    return (
      <input type="date" value={value} onChange={onChange}
        onClick={(e) => { if (e.target.showPicker) { try { e.target.showPicker(); } catch (err) {} } }} />
    );
  }

  const showFlightHint = cardDraft && (cardDraft.typeId === "flight" || cardDraft.typeId === "domestic-flight");
  const showTzHint = cardDraft && TZ_HINT_TYPES.includes(cardDraft.typeId);
  const fromVerifiedCard = cardDraft && cardDraft.fromVerifiedUrl && cardDraft.fromVerifiedText === cardDraft.from;
  const toVerifiedCard = cardDraft && cardDraft.toVerifiedUrl && cardDraft.toVerifiedText === cardDraft.to;

  /* ---------- render ---------- */
  return (
    <div className="mytrip-app" dir={dir}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@500;700&display=swap');
        .mytrip-app { --bg:#F5F8F6; --surface:#FFFFFF; --ink:#1E2A28; --muted:#6B7C76; --border:#DEE7E2; --teal:#256D64; --teal-dark:#174C45; --teal-tint:#E6F0EE; --amber:#D98E3F; --amber-tint:#FBEEDD; --danger:#C1443A;
          font-family:'Heebo',sans-serif; background:var(--bg); color:var(--ink); min-height:100vh; font-variant-numeric:tabular-nums; color-scheme:light; }
        .mytrip-app * { box-sizing:border-box; }
        .mytrip-app button { font-family:inherit; cursor:pointer; }
        .mytrip-app ::-webkit-scrollbar { height:11px; width:11px; }
        .mytrip-app ::-webkit-scrollbar-track { background:#FFFFFF; }
        .mytrip-app ::-webkit-scrollbar-thumb { background:#C7D3CE; border-radius:8px; border:2px solid #FFFFFF; }
        .mytrip-app ::-webkit-scrollbar-thumb:hover { background:#9FB0AA; }
        .mytrip-app * { scrollbar-color:#C7D3CE #FFFFFF; }
        .mytrip-app input[type=date], .mytrip-app input[type=time] { appearance:auto; -webkit-appearance:auto; color-scheme:light; }
        .mytrip-app input[type=date]::-webkit-calendar-picker-indicator, .mytrip-app input[type=time]::-webkit-calendar-picker-indicator { opacity:1; cursor:pointer; }
        .mt-header { display:flex; align-items:center; justify-content:space-between; padding:12px 20px; background:var(--surface); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:30; flex-wrap:wrap; gap:8px; }
        .mt-brand { display:flex; align-items:center; gap:9px; }
        .mt-brand-mark { width:32px; height:32px; border-radius:9px; background:var(--teal); display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
        .mt-brand-mark::after { content:''; position:absolute; width:44px; height:44px; border:2px solid rgba(255,255,255,.35); border-radius:50%; top:-14px; inset-inline-start:-8px; }
        .mt-brand-mark svg { color:#fff; width:17px; height:17px; z-index:1; }
        .mt-brand-text { display:flex; flex-direction:column; line-height:1.15; }
        .mt-brand-name { font-family:'Frank Ruhl Libre',serif; font-size:20px; font-weight:700; }
        .mt-brand-version { font-size:10px; color:var(--muted); font-weight:600; letter-spacing:.02em; }
        .mt-header-actions { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
        .mt-icon-btn { border:1px solid var(--border); background:var(--surface); color:var(--ink); border-radius:8px; padding:6px 9px; display:flex; align-items:center; gap:5px; font-size:12.5px; font-weight:500; }
        .mt-icon-btn:hover { background:var(--teal-tint); border-color:var(--teal); }
        .mt-icon-btn.active { background:var(--teal); color:#fff; border-color:var(--teal); }
        .mt-icon-btn svg { width:14px; height:14px; }
        .mt-avatar { width:26px; height:26px; border-radius:50%; background:var(--teal-tint); color:var(--teal-dark); display:flex; align-items:center; justify-content:center; border:1px solid var(--border); }
        .mt-toolbar { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 20px; flex-wrap:wrap; }
        .mt-toolbar-group { display:flex; gap:7px; align-items:center; flex-wrap:wrap; }
        .mt-floating-menu { position:fixed; background:var(--surface); color:var(--ink); border:1px solid var(--border); border-radius:10px; box-shadow:0 12px 32px rgba(20,40,35,.18); padding:10px; z-index:200; max-width:92vw; max-height:70vh; overflow-y:auto; }
        .mt-floating-backdrop { position:fixed; inset:0; z-index:190; background:transparent; }
        .mt-menu-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:7px; }
        .mt-menu-head strong { font-size:12.5px; }
        .mt-columns-menu { min-width:220px; }
        .mt-columns-menu label { display:flex; align-items:center; gap:7px; padding:4px 4px; font-size:12.5px; border-radius:6px; }
        .mt-columns-menu label:hover { background:var(--bg); }
        .mt-columns-menu .divider { height:1px; background:var(--border); margin:6px 0; }
        .mt-columns-menu input[type=text] { width:100%; border:1px solid var(--border); border-radius:6px; padding:5px 7px; font-size:12.5px; margin-bottom:6px; color:var(--ink); background:#fff; }
        .mt-content { padding:0 20px 40px; }
        .mt-suggest { display:flex; align-items:center; gap:10px; background:var(--amber-tint); border:1px solid #EAC896; color:#7A4E17; padding:9px 14px; border-radius:10px; margin:14px 0; font-size:12.5px; flex-wrap:wrap; }
        .mt-suggest svg { width:15px; height:15px; flex-shrink:0; }
        .mt-suggest .mt-btn { margin-inline-start:auto; }
        .mt-frame-block { border:1px solid var(--border); border-inline-start:4px solid var(--frame-color,var(--teal)); border-radius:12px; margin-top:16px; background:var(--surface); }
        .mt-frame-header { display:flex; align-items:center; gap:9px; padding:10px 12px; cursor:pointer; user-select:none; flex-wrap:wrap; background:#FBFDFC; border-radius:11px 11px 0 0; }
        .mt-frame-name { font-weight:700; font-size:14px; font-family:'Frank Ruhl Libre',serif; }
        .mt-frame-range { font-size:11.5px; color:var(--muted); background:var(--bg); padding:2px 8px; border-radius:20px; }
        .mt-frame-actions { display:flex; gap:2px; margin-inline-start:auto; }
        .mt-frame-actions button { border:none; background:none; color:var(--muted); padding:4px; border-radius:5px; display:flex; }
        .mt-frame-actions button:hover { background:var(--teal-tint); color:var(--teal-dark); }
        .mt-frame-body { padding:2px 12px 12px 12px; }
        .mt-frame-add-row { margin-top:10px; padding:6px 4px; }
        .mt-group { margin-top:14px; }
        .mt-group-header { display:flex; align-items:center; gap:7px; padding:6px 4px; cursor:pointer; user-select:none; flex-wrap:wrap; }
        .mt-group-date { font-weight:700; font-size:13.5px; }
        .mt-group-day { background:var(--teal-tint); color:var(--teal-dark); font-size:11px; font-weight:600; padding:2px 8px; border-radius:20px; }
        .mt-group-actions { margin-inline-start:auto; display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
        .mt-group-add { font-size:12px; color:var(--teal); display:flex; align-items:center; gap:3px; background:none; border:none; font-weight:600; text-decoration:none; }
        .mt-group-add:hover { text-decoration:underline; }
        .mt-group-add.disabled { color:var(--border); cursor:default; }
        .mt-group-add-bottom { display:flex; margin-top:6px; padding:6px 4px; }
        .mt-chrono-warning { display:flex; align-items:center; gap:7px; background:#FBEAE8; color:var(--danger); font-size:11.5px; padding:6px 10px; border-radius:8px; margin:0 4px 8px; }
        .mt-table-wrap { width:100%; overflow-x:auto; border-radius:10px; }
        table.mt-table { width:100%; table-layout:fixed; border-collapse:separate; border-spacing:0; background:var(--surface); border-radius:10px; overflow:hidden; border:1px solid var(--border); }
        .mt-table thead th { text-align:start; font-size:10.5px; text-transform:uppercase; letter-spacing:.03em; color:var(--muted); font-weight:600; padding:6px 6px; background:#FAFCFB; border-bottom:1px solid var(--border); white-space:nowrap; position:relative; overflow:hidden; text-overflow:ellipsis; }
        .mt-table th.from, .mt-table th.to { padding-inline-start:10px; }
        .mt-col-resizer { position:absolute; top:2px; bottom:2px; inset-inline-end:-2px; width:3px; cursor:col-resize; user-select:none; z-index:5; background:rgba(37,109,100,.10); border-radius:2px; }
        .mt-col-resizer:hover, .mt-col-resizer:active { background:var(--teal); opacity:.5; }
        .mt-table tbody td { padding:4px 6px; font-size:12.8px; border-bottom:1px solid var(--border); vertical-align:middle; position:relative; white-space:nowrap; }
        .mt-table tbody tr:last-child td { border-bottom:none; }
        .mt-table tbody tr:hover { background:#FBFDFC; }
        .mt-table th.handle, .mt-table td.handle { white-space:nowrap; }
        .mt-table th.icon, .mt-table td.icon, .mt-table th.route, .mt-table td.route { white-space:nowrap; text-align:center; }
        .mt-table th.link, .mt-table td.link, .mt-table th.actions, .mt-table td.actions, .mt-table th.notes, .mt-table td.notes { white-space:nowrap; text-align:center; }
        .mt-table th.duration, .mt-table td.duration { white-space:nowrap; }
        .mt-table th.type, .mt-table td.type { overflow:visible; }
        .mt-table td.from, .mt-table td.to { overflow:hidden; text-overflow:ellipsis; }
        .mt-handle-wrap { display:flex; align-items:center; gap:2px; }
        .mt-type-wrap { position:relative; }
        .mt-type-chip { display:flex; align-items:center; gap:6px; }
        .mt-type-icon { width:22px; height:22px; border-radius:6px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .mt-type-icon svg { width:12px; height:12px; color:#fff; }
        .mt-type-btn { border:none; background:none; padding:0; display:flex; align-items:center; gap:5px; font-size:12.8px; font-weight:500; color:var(--ink); max-width:100%; }
        .mt-type-text { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .mt-loc-cell { display:flex; align-items:center; gap:3px; }
        .mt-loc-cell .mt-editable { flex:1; max-width:18ch; }
        .mt-loc-cell.has-badge { justify-content:flex-start; }
        .mt-loc-cell.has-badge .mt-editable, .mt-loc-cell.has-badge .mt-alias-display { flex:0 1 auto; width:auto; max-width:100%; }
        .mt-alias-display { flex:1; font-size:12.8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:3px 5px; max-width:18ch; cursor:default; }
        .mt-loc-badge { color:#3E8E5A; display:flex; flex-shrink:0; }
        .mt-editable { border:1px solid transparent; border-radius:6px; padding:3px 5px; font-size:12.8px; width:100%; background:transparent; font-family:inherit; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .mt-editable:hover { border-color:var(--border); }
        .mt-editable:focus { outline:none; border-color:var(--teal); background:#fff; }
        .mt-editable.mt-time:focus, .mt-editable[type=number]:focus { outline:none; border-color:var(--teal); background:#fff; }
        .mt-editable.mt-time { min-width:76px; }
        .mt-editable[type=number] { min-width:38px; padding-inline-start:1px; -moz-appearance:textfield; }
        .mt-editable[type=number]::-webkit-outer-spin-button, .mt-editable[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
        .mt-cost { display:flex; align-items:center; gap:0; font-weight:600; color:var(--amber); }
        .mt-link-icon { color:var(--teal); display:flex; align-items:center; justify-content:center; border:none; background:none; padding:2px; }
        .mt-link-icon.empty { color:var(--border); }
        .mt-link-icon.has-note { color:var(--amber); }
        .mt-link-icon:hover { color:var(--teal-dark); }
        .mt-row-actions { display:flex; align-items:center; gap:2px; opacity:0; transition:opacity .1s; }
        .mt-table tbody tr:hover .mt-row-actions { opacity:1; }
        .mt-row-actions button { border:none; background:none; color:var(--muted); padding:3px; border-radius:5px; display:flex; }
        .mt-row-actions button:hover { background:var(--teal-tint); color:var(--teal-dark); }
        .mt-row-actions svg { width:13px; height:13px; }
        .mt-drag-handle { cursor:grab; color:#9FB0AA; }
        .mt-drag-handle:hover { color:var(--teal-dark); }
        .mt-empty { padding:16px; text-align:center; color:var(--muted); font-size:12.5px; background:var(--surface); border:1px dashed var(--border); border-radius:12px; }
        .mt-summary { margin-top:20px; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
        .mt-summary-label { font-size:12px; color:var(--muted); font-weight:600; }
        .mt-chip { background:var(--amber-tint); color:#8A5A1F; font-weight:700; font-size:12.5px; padding:4px 11px; border-radius:20px; }
        .mt-chip.small { font-size:11px; padding:2px 8px; font-weight:600; }
        .mt-chip-total { font-size:15px; padding:6px 14px; }
        .mt-fx-select { border:1px solid var(--border); border-radius:8px; padding:5px 8px; font-size:12.5px; background:#fff; color:var(--ink); }
        .mt-fx-note { font-size:10.5px; color:var(--muted); font-style:italic; }
        .mt-type-menu { position:fixed; z-index:200; background:var(--surface); border:1px solid var(--border); border-radius:10px; box-shadow:0 12px 32px rgba(20,40,35,.18); padding:6px; min-width:190px; max-height:70vh; overflow-y:auto; color:var(--ink); }
        .mt-type-cat-label { font-size:10px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); font-weight:700; padding:8px 8px 3px; }
        .mt-type-menu button.opt { width:100%; display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:7px; background:none; border:none; font-size:12.5px; text-align:start; color:var(--ink); }
        .mt-type-menu button.opt:hover { background:var(--bg); }
        .mt-type-menu .divider { height:1px; background:var(--border); margin:6px 2px; }
        .mt-type-new-form { padding:6px 4px; }
        .mt-type-new-form input[type=text] { width:100%; border:1px solid var(--border); border-radius:6px; padding:5px 8px; font-size:12px; margin-bottom:6px; color:var(--ink); }
        .mt-icon-pick-row { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:8px; }
        .mt-icon-pick { width:24px; height:24px; border-radius:6px; border:1px solid var(--border); background:var(--surface); display:flex; align-items:center; justify-content:center; }
        .mt-icon-pick.sel { background:var(--teal); border-color:var(--teal); }
        .mt-icon-pick.sel svg { color:#fff; }
        .mt-icon-pick svg { width:12px; height:12px; color:var(--muted); }
        .mt-modal-backdrop { position:fixed; inset:0; background:rgba(20,35,32,.4); display:flex; align-items:center; justify-content:center; z-index:100; padding:20px; }
        .mt-modal { background:var(--surface); border-radius:16px; width:100%; max-width:440px; max-height:86vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.25); }
        .mt-modal.narrow { max-width:360px; }
        .mt-modal-header { display:flex; align-items:center; justify-content:space-between; padding:15px 18px; border-bottom:1px solid var(--border); position:sticky; top:0; background:var(--surface); }
        .mt-modal-title { font-family:'Frank Ruhl Libre',serif; font-size:17px; font-weight:700; }
        .mt-modal-body { padding:16px 18px; display:flex; flex-direction:column; gap:12px; }
        .mt-field label { display:block; font-size:11.5px; font-weight:600; color:var(--muted); margin-bottom:4px; }
        .mt-field input, .mt-field select { width:100%; border:1px solid var(--border); border-radius:8px; padding:7px 9px; font-size:13px; font-family:inherit; background:#fff; color:var(--ink); }
        .mt-field input:focus, .mt-field select:focus { outline:none; border-color:var(--teal); }
        .mt-field-row { display:flex; gap:9px; }
        .mt-field-row > div { flex:1; }
        .mt-field-inline { display:flex; gap:5px; align-items:flex-end; }
        .mt-field-inline > div:first-child { flex:1; }
        .mt-checkbox-row { display:flex; align-items:center; gap:7px; font-size:12.5px; }
        .mt-error { display:flex; gap:6px; align-items:flex-start; background:#FBEAE8; color:var(--danger); font-size:11.5px; padding:7px 9px; border-radius:8px; }
        .mt-error svg { width:13px; height:13px; flex-shrink:0; margin-top:1px; }
        .mt-hint { font-size:11px; color:var(--muted); }
        .mt-verified-row { display:flex; align-items:center; gap:5px; font-size:11px; color:#3E8E5A; margin-top:3px; }
        .mt-modal-footer { display:flex; justify-content:flex-end; gap:7px; padding:13px 18px; border-top:1px solid var(--border); position:sticky; bottom:0; background:var(--surface); flex-wrap:wrap; }
        .mt-btn { border-radius:8px; padding:7px 14px; font-size:12.5px; font-weight:600; border:1px solid var(--border); background:#fff; display:inline-flex; align-items:center; gap:5px; }
        .mt-btn-icon { padding:7px 8px; flex-shrink:0; }
        .mt-btn.primary { background:var(--teal); color:#fff; border-color:var(--teal); }
        .mt-btn.primary:disabled { opacity:.5; cursor:not-allowed; }
        .mt-btn:disabled { opacity:.4; cursor:not-allowed; }
        .mt-btn.ghost { border-color:transparent; color:var(--muted); }
        .mt-btn.danger { color:var(--danger); border-color:transparent; }
        .mt-loc-tabs { display:flex; gap:6px; padding:10px 18px 0; }
        .mt-loc-tab { flex:1; border:1px solid var(--border); background:#fff; color:var(--muted); border-radius:8px; padding:7px; font-size:12.5px; font-weight:600; }
        .mt-loc-tab.active { background:var(--teal-tint); color:var(--teal-dark); border-color:var(--teal); }
        .mt-map-wrap { border-radius:10px; overflow:hidden; border:1px solid var(--border); }
        .mt-map-result { margin-top:8px; }
        .mt-loc-result.static { cursor:default; background:var(--teal-tint); border-color:var(--teal); }
        .mt-loc-results { display:flex; flex-direction:column; gap:5px; max-height:220px; overflow-y:auto; }
        .mt-loc-result { text-align:start; border:1px solid var(--border); border-radius:8px; padding:7px 9px; font-size:12px; background:#fff; }
        .mt-loc-result:hover { background:var(--teal-tint); border-color:var(--teal); }
        .mt-cards { display:flex; flex-direction:column; gap:9px; }
        .mt-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:11px 13px; display:flex; flex-direction:column; gap:5px; }
        .mt-card-top { display:flex; align-items:center; justify-content:space-between; }
        .mt-card-times { font-size:12px; color:var(--muted); }
        .mt-card-dest { font-size:13px; font-weight:600; }
        .mt-card-bottom { display:flex; align-items:center; justify-content:space-between; margin-top:2px; }
        .mt-note { font-size:11px; color:var(--muted); margin-top:4px; }
      `}</style>

      <div className="mt-header">
        <div className="mt-brand">
          <div className="mt-brand-mark"><Plane /></div>
          <div className="mt-brand-text">
            <span className="mt-brand-name">{T.appName}</span>
            <span className="mt-brand-version">v{APP_VERSION}</span>
          </div>
        </div>
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
          <button className="mt-icon-btn" onClick={() => openFrameModal(null, null)}><FolderPlus /> {T.newFrame}</button>
        </div>
        <div className="mt-toolbar-group">
          <button className="mt-icon-btn" ref={addTypeBtnRef} onClick={openAddTypeMenu}><Plus /> {T.addType}</button>
          <button className="mt-icon-btn" ref={columnsBtnRef} onClick={openColumnsMenu}><Settings2 /> {T.columns}</button>
          <button className="mt-icon-btn" onClick={exportToFile}><Download /> {T.exportFile}</button>
          <button className="mt-icon-btn" onClick={() => importInputRef.current && importInputRef.current.click()}><Upload /> {T.importFile}</button>
          <input ref={importInputRef} type="file" accept="application/json,.json" style={{ display: "none" }}
            onChange={(e) => { importFromFile(e.target.files && e.target.files[0]); e.target.value = ""; }} />
          {importMsg && <span className="mt-hint" style={{ color: importMsg.ok ? "#3E8E5A" : "var(--danger)" }}>{importMsg.ok ? T.importSuccess : T.importError}</span>}
        </div>
      </div>

      {colMenuOpen && (
        <>
          <div className="mt-floating-backdrop" onClick={() => setColMenuOpen(false)} />
          <div className="mt-floating-menu mt-columns-menu" style={{ top: colMenuPos.top, left: colMenuPos.left }}>
            <div className="mt-menu-head"><strong>{T.columns}</strong><button className="mt-btn ghost" style={{ padding: "2px 6px" }} onClick={() => setColMenuOpen(false)}><X size={14} /></button></div>
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
            <div className="divider" />
            <button className="mt-btn ghost" style={{ width: "100%" }} onClick={resetColumnWidths}><ArrowDownUp size={13} /> {T.resetColumnWidths}</button>
          </div>
        </>
      )}

      {addTypeOpen && (
        <>
          <div className="mt-floating-backdrop" onClick={() => setAddTypeOpen(false)} />
          <div className="mt-floating-menu" style={{ top: addTypePos.top, left: addTypePos.left, minWidth: 200 }}>
            <div className="mt-menu-head"><strong>{T.newType}</strong><button className="mt-btn ghost" style={{ padding: "2px 6px" }} onClick={() => setAddTypeOpen(false)}><X size={14} /></button></div>
            <input type="text" placeholder={T.typeName} value={addTypeDraft.name} onChange={(e) => setAddTypeDraft({ ...addTypeDraft, name: e.target.value })} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 7px", fontSize: 12.5, marginBottom: 8, color: "var(--ink)", background: "#fff" }} />
            <div className="mt-icon-pick-row">
              {ICON_PALETTE.map((ic) => { const PI = ICONS[ic]; return (
                <button key={ic} className={"mt-icon-pick" + (addTypeDraft.icon === ic ? " sel" : "")} onClick={() => setAddTypeDraft({ ...addTypeDraft, icon: ic })}><PI /></button>
              ); })}
            </div>
            <button className="mt-btn primary" style={{ width: "100%" }} onClick={submitAddType}><Plus size={13} /> {T.add}</button>
          </div>
        </>
      )}

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
          {Object.keys(grandTotals).length === 0 ? (
            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>—</span>
          ) : (
            <>
              <span className="mt-chip mt-chip-total">{displayCurrency} {convertedGrandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <select className="mt-fx-select" value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className="mt-fx-note">{fxIsLive ? T.fxLive : T.fxApprox}</span>
              <span style={{ width: "100%" }} />
              {Object.entries(grandTotals).map(([cur, amt]) => <span className="mt-chip small" key={cur}>{cur} {amt.toLocaleString()}</span>)}
            </>
          )}
        </div>
        <div className="mt-note">{loggedIn ? T.mockNote : ""}</div>
      </div>

      {/* add-day modal */}
      {addDayCtx && (
        <div className="mt-modal-backdrop" onClick={closeAddDayModal}>
          <div className="mt-modal narrow" onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header"><span className="mt-modal-title">{T.addDayModalTitle}</span><button className="mt-btn ghost" onClick={closeAddDayModal}><X size={16} /></button></div>
            <div className="mt-modal-body">
              <div className="mt-field"><label>{T.addDayDate}</label><DateField value={addDayCtx.date} onChange={(e) => setAddDayCtx({ ...addDayCtx, date: e.target.value })} /></div>
              {addDayIssue && <div className="mt-error"><AlertTriangle /> {addDayIssue}</div>}
            </div>
            <div className="mt-modal-footer">
              <button className="mt-btn ghost" onClick={closeAddDayModal}>{T.cancel}</button>
              <button className="mt-btn primary" disabled={!addDayCtx.date || !!addDayIssue} onClick={confirmAddDay}><Check size={13} /> {T.confirmAdd}</button>
            </div>
          </div>
        </div>
      )}

      {/* location picker modal (must stack above the record-card modal it's opened from) */}
      {locPicker && (
        <div className="mt-modal-backdrop" style={{ zIndex: 150 }} onClick={() => setLocPicker(null)}>
          <div className="mt-modal narrow" style={{ zIndex: 151 }} onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header"><span className="mt-modal-title">{T.locPickerTitle}</span><button className="mt-btn ghost" onClick={() => setLocPicker(null)}><X size={16} /></button></div>
            <div className="mt-loc-tabs">
              <button className={"mt-loc-tab" + (locPicker.mode === "search" ? " active" : "")} onClick={() => setLocPickerMode("search")}>{T.tabSearch}</button>
              <button className={"mt-loc-tab" + (locPicker.mode === "map" ? " active" : "")} onClick={() => setLocPickerMode("map")}>{T.tabMap}</button>
            </div>
            {locPicker.mode === "search" ? (
              <div className="mt-modal-body">
                <div className="mt-field-inline">
                  <div><input value={locPicker.query} onChange={(e) => setLocPicker({ ...locPicker, query: e.target.value })} onKeyDown={(e) => e.key === "Enter" && runLocationSearch()} /></div>
                  <button className="mt-btn primary" onClick={() => runLocationSearch()}><Search size={13} /> {T.locSearch}</button>
                </div>
                <div className="mt-hint">{T.locHint}</div>
                {locPicker.loading && <div className="mt-hint">{T.locSearching}</div>}
                {!locPicker.loading && locPicker.error && (
                  <div className="mt-error">
                    <AlertTriangle />
                    <span>{T.locError} <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locPicker.query)}`} target="_blank" rel="noreferrer">{T.openInGoogleSearch}</a></span>
                  </div>
                )}
                {!locPicker.loading && !locPicker.error && locPicker.results.length === 0 && <div className="mt-hint">{T.locNoResults}</div>}
                <div className="mt-loc-results">
                  {locPicker.results.map((r, i) => (
                    <button key={i} className="mt-loc-result" onClick={() => pickLocation(r)}>{r.display_name}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-modal-body">
                <div className="mt-hint">{T.mapPickHint}</div>
                <div className="mt-map-wrap">
                  <MapContainer center={locPicker.mapCenter} zoom={locPicker.mapMarker ? 13 : 5} style={{ height: 260, width: "100%", borderRadius: 10 }} scrollWheelZoom={true}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
                    <MapClickCapture onPick={handleMapPick} />
                    {locPicker.mapMarker && <Marker position={[locPicker.mapMarker.lat, locPicker.mapMarker.lng]} />}
                  </MapContainer>
                </div>
                {locPicker.mapMarker && (
                  <div className="mt-map-result">
                    {locPicker.mapMarker.loading ? (
                      <div className="mt-hint">{T.mapResolving}</div>
                    ) : locPicker.mapMarker.label ? (
                      <>
                        <div className="mt-loc-result static">{locPicker.mapMarker.label}</div>
                        <button className="mt-btn primary" style={{ width: "100%", marginTop: 6 }} onClick={confirmMapPick}><Check size={13} /> {T.confirmLocation}</button>
                      </>
                    ) : (
                      <>
                        <div className="mt-hint">{T.mapNoName}</div>
                        <button className="mt-btn primary" style={{ width: "100%", marginTop: 6 }} onClick={confirmMapPick}><Check size={13} /> {T.confirmLocation}</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
                    <option value="unset">{T.selectType}</option>
                    {groupTypesByCategory(types).map((grp) => (
                      <optgroup key={grp.category} label={CATEGORY_LABELS[lang][grp.category] || grp.category}>
                        {grp.items.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="mt-field"><label>תאריך</label><DateField value={cardDraft.date} onChange={(e) => setCardDraft({ ...cardDraft, date: e.target.value })} /></div>
              </div>
              <div className="mt-field">
                <label>{T.frame}</label>
                <select value={cardDraft.frameId || ""} onChange={(e) => setCardDraft({ ...cardDraft, frameId: e.target.value || null })}>
                  <option value="">{T.noFrame}</option>
                  {frameOptionsList(null).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              {cardFrameIssue && <div className="mt-error"><AlertTriangle /> {cardFrameIssue}</div>}

              <div className="mt-field-row">
                <div className="mt-field">
                  <label>{T.from}</label>
                  <div className="mt-field-inline">
                    <div><input dir="auto" value={cardDraft.from} placeholder={getTypeHint(cardDraft.typeId, "from", lang)} onChange={(e) => setCardDraft({ ...cardDraft, from: e.target.value })} /></div>
                    <button className="mt-btn ghost mt-btn-icon" title={T.verify} onClick={() => openLocationPicker("from")}><MapPin size={13} /></button>
                    <button className="mt-btn ghost mt-btn-icon" title={T.copyPrevDest} disabled={!prevRowForCard || !prevRowForCard.to} onClick={copyPrevDestinationToFrom}><Copy size={13} /></button>
                  </div>
                  {fromVerifiedCard && <div className="mt-verified-row"><CircleCheck size={12} /> {T.verified} — <a href={cardDraft.fromVerifiedUrl} target="_blank" rel="noreferrer">{T.openMap}</a></div>}
                  <div className="mt-field" style={{ marginTop: 6 }}>
                    <label>{T.fromAlias}</label>
                    <input dir="auto" value={cardDraft.fromAlias || ""} placeholder={getTypeHint(cardDraft.typeId, "fromAlias", lang)} onChange={(e) => setCardDraft({ ...cardDraft, fromAlias: e.target.value })} />
                    <div className="mt-hint">{T.aliasHint}</div>
                  </div>
                </div>
                <div className="mt-field">
                  <label>{T.to}</label>
                  <div className="mt-field-inline">
                    <div><input dir="auto" value={cardDraft.to} placeholder={getTypeHint(cardDraft.typeId, "to", lang)} onChange={(e) => setCardDraft({ ...cardDraft, to: e.target.value })} /></div>
                    <button className="mt-btn ghost mt-btn-icon" title={T.verify} onClick={() => openLocationPicker("to")}><MapPin size={13} /></button>
                  </div>
                  {toVerifiedCard && <div className="mt-verified-row"><CircleCheck size={12} /> {T.verified} — <a href={cardDraft.toVerifiedUrl} target="_blank" rel="noreferrer">{T.openMap}</a></div>}
                  <div className="mt-field" style={{ marginTop: 6 }}>
                    <label>{T.toAlias}</label>
                    <input dir="auto" value={cardDraft.toAlias || ""} placeholder={getTypeHint(cardDraft.typeId, "toAlias", lang)} onChange={(e) => setCardDraft({ ...cardDraft, toAlias: e.target.value })} />
                    <div className="mt-hint">{T.aliasHint}</div>
                  </div>
                </div>
              </div>

              <div className="mt-field-row">
                <div className="mt-field"><label>{T.start}</label><input type="time" value={cardDraft.startTime} onChange={(e) => setCardDraft({ ...cardDraft, startTime: e.target.value })} /></div>
                <div className="mt-field"><label>{T.end}</label><input type="time" value={cardDraft.endTime} onChange={(e) => setCardDraft({ ...cardDraft, endTime: e.target.value })} /></div>
              </div>
              <label className="mt-checkbox-row"><input type="checkbox" checked={!!cardDraft.overnight} onChange={(e) => setCardDraft({ ...cardDraft, overnight: e.target.checked })} />{T.overnight}</label>
              {cardHasTimeError && <div className="mt-error"><AlertTriangle /> {T.timeError}</div>}
              {showTzHint && <div className="mt-hint">{T.tzNote}</div>}

              {showFlightHint && (
                <div className="mt-field">
                  <label>{T.flightNo}</label>
                  <div className="mt-field-inline">
                    <input value={cardDraft.flightNumber || ""} onChange={(e) => setCardDraft({ ...cardDraft, flightNumber: e.target.value })} />
                    <button className="mt-btn ghost" onClick={fetchFlightData}><Download size={13} /> {T.fetchFlightData}</button>
                  </div>
                  {flightLookupMsg && <div className="mt-hint" style={{ marginTop: 4 }}>{flightLookupMsg}</div>}
                </div>
              )}
              <div className="mt-field"><label>{T.link}</label><input value={cardDraft.link} placeholder="https://..." onChange={(e) => setCardDraft({ ...cardDraft, link: e.target.value })} /></div>
              {["hotel", "hostel", "apartment", "self-tour", "guided-tour", "day-tour", "attraction", "ferry", "car-rental", "yacht", "cruise"].includes(cardDraft.typeId) && (
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
              <div className="mt-field"><label>{T.notes}</label><input value={cardDraft.notes || ""} placeholder={getTypeHint(cardDraft.typeId, "notes", lang)} onChange={(e) => setCardDraft({ ...cardDraft, notes: e.target.value })} /></div>
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
              <button className="mt-btn primary" disabled={!cardDraft.date || cardHasTimeError || !!cardFrameIssue} onClick={saveCard}><Check size={13} /> {T.save}</button>
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
                <div className="mt-field"><label>{T.frameStart}</label><DateField value={frameDraft.startDate} onChange={(e) => setFrameDraft({ ...frameDraft, startDate: e.target.value })} /></div>
                <div className="mt-field"><label>{T.frameEnd}</label><DateField value={frameDraft.endDate} onChange={(e) => setFrameDraft({ ...frameDraft, endDate: e.target.value })} /></div>
              </div>
              <div className="mt-field-row">
                <button className="mt-btn ghost" style={{ width: "100%" }} onClick={fillFrameDatesAbove}><ArrowDownUp size={13} /> {T.fillDatesAbove}</button>
                <button className="mt-btn ghost" style={{ width: "100%" }} onClick={fillFrameDatesBelow}><ArrowDownUp size={13} /> {T.fillDatesBelow}</button>
              </div>
              <div className="mt-field">
                <label>{T.parentFrame}</label>
                <select value={frameDraft.parentFrameId || ""} onChange={(e) => setFrameDraft({ ...frameDraft, parentFrameId: e.target.value || null })}>
                  <option value="">{T.noFrame}</option>
                  {frameOptionsList(frameDraft.id).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              {frameIssue && <div className="mt-error"><AlertTriangle /> {frameIssue}</div>}
            </div>
            <div className="mt-modal-footer">
              <button className="mt-btn ghost" onClick={closeFrameModal}>{T.cancel}</button>
              <button className="mt-btn primary" disabled={!frameDraft.name.trim() || !frameDraft.startDate || !frameDraft.endDate || !!frameIssue} onClick={saveFrame}><Check size={13} /> {T.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
