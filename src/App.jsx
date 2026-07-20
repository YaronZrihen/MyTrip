import React, { useState, useMemo, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Plane, PlaneTakeoff, Car, BedDouble, Footprints, Users, Sun, Ship, KeySquare,
  Tag, Star, Flag, Camera, Utensils, ShoppingBag, Music, ChevronDown, ChevronRight, ChevronLeft, ChevronUp,
  Plus, X, Settings2, Pencil, Trash2, Link2, Globe, LogIn, User,
  Smartphone, Monitor, AlertTriangle, GripVertical, Check, FolderPlus, Sparkles,
  Route, Waypoints, Download, Upload, MapPin, Search, CircleCheck, Clock, ArrowDownUp, Copy, StickyNote, TrainFront,
  Bus, Motorbike, Bike, Scooter, Sailboat, ShipWheel, Anchor, Kayak, Helicopter, Caravan, Building2, Landmark, Home,
  CloudSun, CloudRain, CloudSnow, CloudLightning, CloudFog, Cloud, Bell, FileUp, Share2, UserPlus, MessageCircle, Printer, Wand2, MoreVertical, Menu, Calendar as CalendarIcon, Undo2, Redo2, Info, ExternalLink, Phone, Save, FolderOpen, ImagePlus, BookOpen
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/*  MyTrip — trip-planning table prototype                                 */
/*  v4: chronology warnings, repositioned menus, location verification     */
/*  (OpenStreetMap Nominatim — free, no key), fixed-width indent column.   */
/* ---------------------------------------------------------------------- */

const APP_VERSION = "10.31.0";

// Leaflet's default marker icon breaks under bundlers (Vite/Webpack) because it
// references relative image paths. Point it at the CDN copies instead.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
const DEFAULT_MAP_CENTER = [41.9, 12.49]; // Rome — reasonable default for this itinerary
const ICONS = { Plane, PlaneTakeoff, Car, BedDouble, Footprints, Users, Sun, Ship, KeySquare, Tag, Star, Flag, Camera, Utensils, ShoppingBag, Music, TrainFront, Bus, Motorbike, Bike, Scooter, Sailboat, ShipWheel, Anchor, Kayak, Helicopter, Caravan, Building2, Landmark, Home, MapPin };
const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const EN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FRAME_COLORS = ["#256D64", "#3E7CB1", "#8B6F47", "#7A5C9E", "#C1443A", "#5B8C5A"];
const CURRENCIES = ["₪", "$", "€", "£"];
const CURRENCY_CODE_MAP = { "₪": "ILS", "$": "USD", "€": "EUR", "£": "GBP" };
const FALLBACK_RATES = { ILS: 1, USD: 0.27, EUR: 0.25, GBP: 0.21 };
const FLIGHT_LOOKUP_ENABLED = false; // needs a real flight-data provider (e.g. AeroDataBox) + API key + server proxy

const CATEGORY_COLORS = {
  "public-transport": "#3E7CB1", "road-transport": "#8B6F47", "sea-transport": "#2F7A8C",
  "air-transport": "#256D64", accommodation: "#D98E3F", activities: "#5B8C5A", other: "#7A5C9E",
};
const DEFAULT_TYPES = [
  { id: "train", name_he: "רכבת", name_en: "Train", icon: "TrainFront", color: CATEGORY_COLORS["public-transport"], category: "public-transport" },
  { id: "high-speed-train", name_he: "רכבת מהירה", name_en: "High-speed train", icon: "TrainFront", color: CATEGORY_COLORS["public-transport"], category: "public-transport" },
  { id: "bus", name_he: "אוטובוס", name_en: "Bus", icon: "Bus", color: CATEGORY_COLORS["public-transport"], category: "public-transport" },
  { id: "taxi", name_he: "מונית", name_en: "Taxi", icon: "Car", color: CATEGORY_COLORS["public-transport"], category: "public-transport" },

  { id: "car-rental", name_he: "השכרת רכב", name_en: "Car rental", icon: "KeySquare", color: CATEGORY_COLORS["road-transport"], category: "road-transport" },
  { id: "caravan", name_he: "קראוון", name_en: "Caravan", icon: "Caravan", color: CATEGORY_COLORS["road-transport"], category: "road-transport" },
  { id: "motorcycle", name_he: "אופנוע", name_en: "Motorcycle", icon: "Motorbike", color: CATEGORY_COLORS["road-transport"], category: "road-transport" },
  { id: "bicycle", name_he: "אופניים", name_en: "Bicycle", icon: "Bike", color: CATEGORY_COLORS["road-transport"], category: "road-transport" },
  { id: "scooter", name_he: "קורקינט", name_en: "Scooter", icon: "Scooter", color: CATEGORY_COLORS["road-transport"], category: "road-transport" },

  { id: "ferry", name_he: "מעבורת", name_en: "Ferry", icon: "Ship", color: CATEGORY_COLORS["sea-transport"], category: "sea-transport" },
  { id: "yacht", name_he: "יאכטה", name_en: "Yacht", icon: "Sailboat", color: CATEGORY_COLORS["sea-transport"], category: "sea-transport" },
  { id: "ship", name_he: "אוניה", name_en: "Ship", icon: "ShipWheel", color: CATEGORY_COLORS["sea-transport"], category: "sea-transport" },
  { id: "cruise", name_he: "שייט", name_en: "Cruise", icon: "Anchor", color: CATEGORY_COLORS["sea-transport"], category: "sea-transport" },
  { id: "canoe", name_he: "קאנו", name_en: "Canoe", icon: "Kayak", color: CATEGORY_COLORS["sea-transport"], category: "sea-transport" },

  { id: "flight", name_he: "טיסה בינלאומית", name_en: "International flight", icon: "Plane", color: CATEGORY_COLORS["air-transport"], category: "air-transport" },
  { id: "domestic-flight", name_he: "טיסת פנים", name_en: "Domestic flight", icon: "PlaneTakeoff", color: CATEGORY_COLORS["air-transport"], category: "air-transport" },
  { id: "helicopter", name_he: "מסוק", name_en: "Helicopter", icon: "Helicopter", color: CATEGORY_COLORS["air-transport"], category: "air-transport" },

  { id: "hotel", name_he: "מלון", name_en: "Hotel", icon: "BedDouble", color: CATEGORY_COLORS.accommodation, category: "accommodation" },
  { id: "hostel", name_he: "אכסנייה", name_en: "Hostel", icon: "Building2", color: CATEGORY_COLORS.accommodation, category: "accommodation" },
  { id: "apartment", name_he: "דירה", name_en: "Apartment", icon: "Home", color: CATEGORY_COLORS.accommodation, category: "accommodation" },

  { id: "self-tour", name_he: "טיול עצמאי", name_en: "Self-guided tour", icon: "Footprints", color: CATEGORY_COLORS.activities, category: "activities" },
  { id: "guided-tour", name_he: "טיול מודרך", name_en: "Guided tour", icon: "Users", color: CATEGORY_COLORS.activities, category: "activities" },
  { id: "day-tour", name_he: "טיול יומי", name_en: "Day tour", icon: "Sun", color: CATEGORY_COLORS.activities, category: "activities" },
  { id: "attraction", name_he: "אטרקציה", name_en: "Attraction", icon: "Landmark", color: CATEGORY_COLORS.activities, category: "activities" },
  { id: "poi", name_he: "נקודת עניין", name_en: "Point of Interest", icon: "MapPin", color: CATEGORY_COLORS.activities, category: "activities" },
  { id: "restaurant", name_he: "מסעדה", name_en: "Restaurant", icon: "Utensils", color: CATEGORY_COLORS.activities, category: "activities" },
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
  { key: "weather", label_he: "תחזית", label_en: "Forecast", visible: true },
];

const T_DICT = {
  he: {
    appName: "MyTrip Builder", addRow: "הוסף רשומה", addDay: "הוסף יום", newFrame: "מסגרת חדשה",
    columns: "עמודות", addColumn: "הוסף עמודה", addType: "הוסף תיאור", resetColumnWidths: "איפוס רוחב עמודות (גרור את קצה כותרת העמודה לשינוי ידני)", actions: "פעולות", on: "פעיל", settings: "הגדרות", manageColumns: "ניהול עמודות", undo: "בטל פעולה אחרונה", redo: "חזור על פעולה", disableIntro: "בטל הצגת אנימציית פתיחה",
    exportFile: "שמור לקובץ", importFile: "ייבוא מקובץ", importSuccess: "הייבוא הצליח", importError: "הקובץ אינו תקין",
    login: "התחברות עם Google", logout: "יציאה",
    desktop: "מחשב", mobile: "סלולר", lang: "English", editRecord: "כרטיס רשומה",
    save: "שמירה", cancel: "ביטול", delete: "מחיקה", addSub: "הוסף תת-רשומה",
    type: "סוג", from: "מוצא", to: "יעד", start: "בשעה", end: "עד שעה", overnight: "חוצה חצות",
    destination: "שם היעד", link: "קישור להזמנה", maplink: "קישור למיקום / מסלול",
    flightNo: "מספר טיסה", cost: "עלות", currency: "מטבע", notes: "הערות", frame: "מסגרת",
    noFrame: "ללא מסגרת (רמה עליונה)", selectType: "בחר...",
    newType: "תיאור חדש", typeName: "שם תיאור", add: "הוספה", searchTypes: "חיפוש תיאור...",
    totalPerCurrency: "סה״כ טיול", timeError: "שעת סיום לפני שעת ההתחלה — סמן \"חוצה חצות\" אם מדובר בלילה",
    noRows: "אין עדיין רשומות כאן", dragHint: "גרירה לשינוי סדר", mockNote: "*הדמיית התחברות בלבד בפרוטוטייפ",
    frameModalNew: "מסגרת טיול חדשה", frameModalEdit: "עריכת מסגרת", frameName: "שם המסגרת",
    frameStart: "תאריך התחלה", frameEnd: "תאריך סיום", frameDateRange: "טווח תאריכים", parentFrame: "שייכת למסגרת",
    addSubFrame: "הוסף מסגרת-משנה", suggestPrefix: "זוהו", suggestMid: "טיסות ללא מסגרת:", moreOptions: "עוד אפשרויות", editFrame: "ערוך מסגרת",
    fillDatesAbove: "הוסף מסגרת מעל התאריך הקיים", fillDatesBelow: "הוסף מסגרת מתחת לתאריך הקיים",
    suggestBtn: "צור מסגרת טיול אוטומטית", suggestDismiss: "התעלם",
    fxApprox: "לפי שער מקורב (אין חיבור לאינטרנט)", fxLive: "לפי שער עדכני",
    frameRangeInvalid: "תאריך ההתחלה חייב להיות לפני תאריך הסיום",
    frameRangeContent: "טווח התאריכים חייב לכלול את כל הרשומות/תת-המסגרות שכבר קיימות במסגרת זו",
    frameRangeParent: "טווח התאריכים חייב להיות בתוך טווח המסגרת המכילה",
    rowOutOfFrame: "התאריך חייב להיות בתוך טווח המסגרת שאליה הרשומה משויכת",
    routeTooltip: "פתח מסלול בגוגל מפות", dayRoute: "מסלול", addDayShort: "+ יום", noRoute: "אין מספיק נתוני מיקום",
    fetchFlightData: "משוך נתונים לפי מספר טיסה", flightApiMissing: "לצורך משיכה אוטומטית יש לחבר ספק נתוני טיסות (כגון AeroDataBox) עם מפתח API ופרוקסי בצד השרת. שדה זה מוכן לחיבור עתידי.",
    chronoWarning: "סדר הרשומות ביום זה אינו כרונולוגי לפי שעה", sortByTime: "מיין לפי שעה",
    addDayModalTitle: "הוספת יום חדש", addDayDate: "תאריך", confirmAdd: "הוסף",
    addDayAutoRecords: "רשומות אוטומטיות ליום", addDayHotel: "מלון", addDayTransport: "תחבורה", addDayPoi: "נקודת עניין",
    demoLocationName: "וותיקן", demoLocationRaw: "00120 Vatican City, וותיקן",
    demoHotelRaw: "Hilton Garden Inn Rome Airport", demoHotelAlias: "הילטון גארדן אין רומא",
    demoRestaurantRaw: "Ristorante dei Musei", demoRestaurantName: "מסעדת המוזיאון",
    verify: "אמת מול מפות", verified: "מאומת", openMap: "פתח במפה", pickFromMap: "בחר מהמפה",
    fromAlias: "כינוי למוצא", toAlias: "כינוי ליעד", aliasHint: "יוצג בעמודה במקום הטקסט המלא. מתמלא אוטומטית בשם מקוצר בעת אימות מיקום (לפי הכתובת שנמצאה) — ניתן תמיד לשנות ידנית.",
    flightAliasPlaceholder: "לדוגמה: תל אביב (TLV)", copyPrevDest: "העתק יעד משורה קודמת",
    km: "ק\"מ", min: "דק'", calculatingDistance: "מחשב מרחק...",
    weatherAtArrival: "מזג אוויר ביעד", weatherLoading: "בודק מזג אוויר...", weatherUnavailable: "תחזית לא זמינה (מעבר ל-16 יום קדימה, או שהמיקום לא זוהה)",
    exportPdf: "ייצוא PDF (הדפסה)", reminders: "תזכורות", reminderIn: "בעוד כ-{min} דקות",
    share: "שיתוף", shareExportHtml: "ייצוא כדף שיתוף (HTML)", shareExportHtmlHint: "קובץ עצמאי לצפייה — אפשר לשלוח לכל אחד, גם בלי גישה לאתר",
    shareWithUser: "שתף עם משתמש במערכת (בקרוב)", shareEditAccess: "שיתוף עריכה עם שותפי טיול (בקרוב)",
    demoNeedsAccounts: "התכונה הזו דורשת מערכת משתמשים והרשאות (חיבור ל-DB), עדיין לא קיימת בפרוטוטייפ. זו הצגה בלבד של איך זה ייראה.",
    tryGooglePlaces: "חפש עם Google Places (הדגמה)", demoNeedsGoogleKey: "תוצאות מדויקות ועשירות יותר (כולל עברית טובה בהרבה) אפשריות עם Google Places API — דורש מפתח API וחיוב בענן של גוגל. זו הצגה בלבד; החיפוש הפעיל כרגע משתמש ב-OpenStreetMap החינמי.",
    tryGooglePlacesReal: "חפש עם Google Places", usingGooglePlaces: "✓ מחפש עם Google Places",
    noGoogleKeyConfigured: "חיפוש מיקום דורש מפתח Google Places API מוגדר (VITE_GOOGLE_PLACES_KEY). פנה למפתח האפליקציה.",
    uploadFile: "העלה קובץ (כרטיס טיסה, שובר הזמנה...) — הדגמה", demoNeedsStorage: "העלאת קבצים דורשת שירות אחסון (כמו Supabase Storage או S3), עדיין לא מחובר בפרוטוטייפ. זו הצגה בלבד.",
    aiDemoNotice: "זו הדגמת ממשק בלבד. חיבור אמיתי ל-Claude דורש שרת/פונקציה בצד השרת (לא ניתן לחשוף מפתח API בצד הלקוח).",
    aiSuggestItinerary: "הצע מסלול יומי אוטומטי", aiInputPlaceholder: "שאל שאלה על הטיול...",
    aiSuggestDemoText: "דוגמה להצעה (הדגמה): יום 2 — בוקר: ביקור בקולוסיאום (09:00), צהריים: ארוחה בטרסטבר, אחה״צ: מזרקת טרווי ופנתיאון. לחיבור אמיתי נדרש שרת שמפעיל את Claude API.",
    aiChatDemoText: "זו תגובת הדגמה בלבד. בגרסה מחוברת, השאלה הזו הייתה נשלחת ל-Claude יחד עם נתוני הטיול שלך ומקבלת תשובה מבוססת.",
    importRoute: "ייבא מסלול מגוגל מפות", importRouteHint: "הדבק קישור למסלול רב-תחנתי מגוגל מפות (Share → Copy link, אחרי תכנון מסלול עם כמה נקודות עצירה). כל תחנה תהפוך לרשומת \"אטרקציה\" נפרדת.",
    importRouteParse: "פענח", importRouteNoStops: "לא זוהו תחנות בקישור — ודא שזה קישור מסלול (Directions) עם כמה תחנות, לא קישור למקום בודד.",
    importRouteShortLink: "זה קישור מקוצר (maps.app.goo.gl) — שמות המקומות האמיתיים מוסתרים מאחוריו ואי אפשר לפענח אותם ישירות בדפדפן (חסימת גוגל, לא באג). פתרון: פתח את הקישור בדפדפן/באפליקציה, וכשהמסלול נפתח - העתק את הכתובת המלאה משורת הכתובת (תתחיל ב-google.com/maps/dir/...) והדבק אותה כאן במקום.",
    importRouteConfirm: "צור רשומות",
    hotelInfo: "פרטי מלון", placeInfo: "פרטי מקום", hotelPhotoDemo: "תמונה — דורש חיבור ל-Google Places API (בתשלום). זו הצגה בלבד.",
    ratingDemo: "דירוג — הדגמה", viewOnMap: "הצג במפה", bookingLink: "קישור להזמנה",
    placeOpenNow: "פתוח", placeClosedNow: "סגור", placeWebsite: "אתר", placeCall: "התקשר",
    googleUiKitError: "טעינת מידע Google נכשלה. ודא ש-Maps JavaScript API מופעל ומורשה במפתח.", notLinkedToGoogle: "הרשומה עדיין לא מאומתת מול Google — לחץ על סמל האימות בשדה המיקום.",
    tripScheduleCheck: "בדיקת התאמה למועד הטיול",
    newFrameWizard: "מסגרת חדשה עם שאלון",
    wizardTitle: "שאלון תכנון טיול", wizardStepOf: "שלב {n} מתוך {total}",
    wizardTripName: "שם הטיול", wizardTripNameHint: "לדוגמה: הטיול המשפחתי לאיטליה",
    wizardDestination: "יעד", wizardDestinationHint: "לדוגמה: רומא, איטליה",
    wizardOutboundHint: "פרטי הטיסות קובעים את תאריכי תחילת וסיום הטיול.",
    wizardOutboundShort: "הלוך", wizardReturnShort: "חזור",
    wizardFlightDate: "תאריך", wizardFlightTime: "שעת המראה", wizardDateRequired: "יש להזין תאריכים תקינים לשתי הטיסות (תאריך החזור לא יכול להיות לפני תאריך ההלוך).",
    wizardHasTickets: "כבר יש לך כרטיסי טיסה?", wizardYesNo_yes: "כן", wizardYesNo_no: "לא",
    wizardOutboundFlightNo: "מס' טיסה — הלוך", wizardReturnFlightNo: "מס' טיסה — חזור",
    wizardTravelers: "מספר מטיילים",
    wizardTravelers_solo: "יחיד/ה", wizardTravelers_couple: "זוג", wizardTravelers_family: "משפחה", wizardTravelers_group: "קבוצה",
    wizardBudget: "רמת תקציב", wizardBudget_low: "חסכוני", wizardBudget_mid: "בינוני", wizardBudget_high: "יוקרתי",
    wizardInterests: "תחומי עניין (ניתן לבחור כמה)",
    wizardInterest_history: "היסטוריה", wizardInterest_food: "אוכל", wizardInterest_nature: "טבע", wizardInterest_nightlife: "חיי לילה",
    wizardInterest_shopping: "שופינג", wizardInterest_art: "אמנות", wizardInterest_adventure: "הרפתקאות",
    wizardPace: "קצב הטיול", wizardPace_relaxed: "רגוע", wizardPace_balanced: "מאוזן", wizardPace_packed: "עמוס",
    wizardAccommodation: "העדפת לינה", wizardAccommodation_hotel: "מלון", wizardAccommodation_apartment: "דירה", wizardAccommodation_hostel: "אכסניה", wizardAccommodation_flexible: "גמיש",
    wizardHasReservation: "יש כבר הזמנת לינה?", wizardBookingLink: "קישור להזמנה",
    wizardCustomRoute: "לתכנן עבורך מסלול יומי מותאם לצרכים שהזנת?",
    wizardNotes: "הערות נוספות", wizardNotesHint: "מגבלות, בקשות מיוחדות, כל דבר שחשוב שנדע...",
    wizardWillCreate: "מה ייווצר", wizardWillCreateDesc: "מסגרת טיול עם תאריכי הטיסות שהזנת, שתי רשומות טיסה (הלוך וחזור), ושלד מלון מוכן למילוי לכל יום ביניים.",
    wizardAiNote: "תחומי העניין, התקציב והקצב שבחרת נשמרים במסגרת — הצעות פעילויות בפועל שמבוססות עליהם ידרשו חיבור לשרת AI בעתיד.",
    wizardBack: "הקודם", wizardNext: "הבא", wizardCreate: "צור טיול",
    computedEndTimeHint: "שדה מחושב לפי מסלול Google Maps, בהתאם לאמצעי התחבורה שנבחר בתיאור.", chronoEndWarning: "רצף השעות (כולל שעות סיום) אינו כרונולוגי.",
    noOriginHint: "אין צורך בשדה מוצא עבור סוג רשומה זה.",
    dragDayHint: "גרור להעברת היום למסגרת אחרת", dropDayToRoot: "שחרר כאן כדי להוציא את היום מהמסגרת", showOverallRoute: "הצג מסלול טיול כולל",
    tripSummary: "סיכום הטיול", summaryFlights: "טיסות", summaryHotels: "מלונות", summaryPois: "נק׳ עניין", summaryRestaurants: "מסעדות", summaryAvgRating: "דירוג ממוצע",
    summaryTotal: "סה״כ", summaryKmNoFlights: "ללא טיסות", summaryNights: "לילות", summaryAttractions: "אטרקציות", summaryDayTours: "טיולי יום", summaryGuidedTours: "טיולים מודרכים",
    generateJournal: "הפק יומן מסע", viewFullRouteMap: "הצג מפת מסלול מלאה (ללא טיסות)", noJournalEntries: "אין עדיין רשומות עם \"חוויה אישית\" בטיול הזה.",
    saveTripByName: "שמור טיול בשם", loadSavedTrip: "טען טיול שמור", tripName: "שם הטיול",
    saveTripNote: "כרגע נשמר בדפדפן הזה בלבד (לצורך בדיקות) — בעתיד יישמר לפי משתמש מחובר, נגיש מכל מכשיר.",
    saveTripSuccess: "נשמר בהצלחה", saveTripError: "השמירה נכשלה — ייתכן שאין מספיק מקום אחסון בדפדפן.",
    noSavedTrips: "אין עדיין טיולים שמורים.", load: "טען", confirmDeleteTrip: "למחוק את הטיול השמור הזה?",
    locationSectionLabel: "מיקום וכינוי", copyFromOrigin: "העתק מהמוצא", locationColHeader: "מיקום", aliasColHeader: "כינוי", notesHint: "ההערה תוצג גם בעמודה בטבלה הראשית.",
    personalExperience: "חוויה אישית", personalExperienceHint: "רשמים, טיפים, זיכרונות... (לא מוצג בטבלה)",
    personalRating: "דירוג אישי לרשומה", uploadPhotos: "העלה תמונות",
    hotelInfoDemoNote: "כתובת ומפה — אמיתי (מהמיקום המאומת של הרשומה). תמונה ודירוג בפועל ידרשו חיבור ל-Google Places.",
    warnClosed: "סגור בשעה שנבחרה (לפי שעות פעילות OpenStreetMap)", warnFeeRequired: "דורש רכישת כרטיס כניסה (לפי OpenStreetMap)",
    aiAssistant: "עוזר AI (הדגמה)", ok: "הבנתי",
    locHint: "טיפ: אם החיפוש לא מוצא תוצאה בעברית, נסה לחפש בשם המקומי/אנגלי (למשל \"Fiumicino Airport\" ולא \"פיומיצ׳ינו\").",
    tabSearch: "חיפוש טקסט", tabMap: "בחירה במפה", mapPickHint: "לחץ במקום הרצוי על המפה כדי לסמן אותו",
    mapResolving: "מזהה כתובת...", mapNoName: "לא נמצאה כתובת מדויקת לנקודה זו — ניתן עדיין לבחור לפי הקואורדינטות",
    confirmLocation: "אשר מיקום זה",
    locPickerTitle: "חיפוש מיקום", locSearch: "חפש", locSearching: "מחפש...", locNoResults: "לא נמצאו תוצאות",
    locError: "החיפוש נכשל (בעיית רשת/CORS מול שירות המיקומים). אפשר לפתוח חיפוש ידני בגוגל מפות במקום:",
    technicalDetail: "פרט טכני",
    openInGoogleSearch: "פתח חיפוש בגוגל מפות",
    flightPlaceholder: "עיר (קוד שדה תעופה, למשל TLV)", tzNote: "התאמת שעון אוטומטית לפי אזורי זמן דורשת חיבור ל-API מסחרי (כגון Google Time Zone) עם מפתח — לא מיושמת בפרוטוטייפ. יש לוודא ידנית שהשעות מוזנות לפי השעון המקומי בכל מיקום.",
  },
  en: {
    appName: "MyTrip Builder", addRow: "Add record", addDay: "Add day", newFrame: "New frame",
    columns: "Columns", addColumn: "Add column", addType: "Add description", resetColumnWidths: "Reset column widths (drag a header's edge to resize manually)", actions: "Actions", on: "On", settings: "Settings", manageColumns: "Manage columns", undo: "Undo last action", redo: "Redo action", disableIntro: "Disable the opening animation",
    exportFile: "Save to file", importFile: "Import from file", importSuccess: "Import successful", importError: "This file isn't valid",
    login: "Sign in with Google", logout: "Sign out",
    desktop: "Desktop", mobile: "Mobile", lang: "עברית", editRecord: "Record card",
    save: "Save", cancel: "Cancel", delete: "Delete", addSub: "Add sub-record",
    type: "Type", from: "Origin", to: "Destination", start: "At", end: "Until", overnight: "Crosses midnight",
    destination: "Venue", link: "Booking link", maplink: "Map / route link",
    flightNo: "Flight number", cost: "Cost", currency: "Currency", notes: "Notes", frame: "Frame",
    noFrame: "No frame (top level)", selectType: "Select...",
    newType: "New description", typeName: "Description name", add: "Add", searchTypes: "Search description...",
    totalPerCurrency: "Trip total", timeError: "End time is before start time — check \"crosses midnight\" for overnight legs",
    noRows: "No records here yet", dragHint: "Drag to reorder", mockNote: "*Sign-in is a prototype mock only",
    frameModalNew: "New trip frame", frameModalEdit: "Edit frame", frameName: "Frame name",
    frameStart: "Start date", frameEnd: "End date", frameDateRange: "Date range", parentFrame: "Belongs to frame",
    addSubFrame: "Add sub-frame", suggestPrefix: "Found", suggestMid: "flights without a frame:", moreOptions: "More options", editFrame: "Edit frame",
    fillDatesAbove: "Add frame above the existing date", fillDatesBelow: "Add frame below the existing date",
    suggestBtn: "Auto-create a trip frame", suggestDismiss: "Dismiss",
    fxApprox: "Approximate rate (no internet connection)", fxLive: "Live rate",
    frameRangeInvalid: "Start date must be before the end date",
    frameRangeContent: "The date range must cover all records/sub-frames already inside this frame",
    frameRangeParent: "The date range must fit inside the containing frame's range",
    rowOutOfFrame: "The date must fall inside the frame this record belongs to",
    routeTooltip: "Open route in Google Maps", dayRoute: "Route", addDayShort: "+ Day", noRoute: "Not enough location data",
    fetchFlightData: "Fetch data by flight number", flightApiMissing: "Live lookup needs a flight-data provider (e.g. AeroDataBox) with an API key and a server-side proxy. This field is ready to be wired up later.",
    chronoWarning: "Records on this day are not in chronological time order", sortByTime: "Sort by time",
    addDayModalTitle: "Add a new day", addDayDate: "Date", confirmAdd: "Add",
    addDayAutoRecords: "Automatic records for the day", addDayHotel: "Hotel", addDayTransport: "Transportation", addDayPoi: "Point of interest",
    demoLocationName: "Vatican", demoLocationRaw: "00120 Vatican City",
    demoHotelRaw: "Hilton Garden Inn Rome Airport", demoHotelAlias: "Hilton Garden Inn Rome",
    demoRestaurantRaw: "Ristorante dei Musei", demoRestaurantName: "Museum Restaurant",
    verify: "Verify with Maps", verified: "Verified", openMap: "Open in Maps", pickFromMap: "Pick from map",
    fromAlias: "Origin nickname", toAlias: "Destination nickname", aliasHint: "Shown in the table instead of the full text. Auto-filled with a short name when you verify a location (based on the matched address) — you can always edit it manually.",
    flightAliasPlaceholder: "e.g. Tel Aviv (TLV)", copyPrevDest: "Copy previous row's destination",
    km: "km", min: "min", calculatingDistance: "Calculating distance...",
    weatherAtArrival: "Weather at destination", weatherLoading: "Checking weather...", weatherUnavailable: "Forecast unavailable (beyond 16 days out, or location unresolved)",
    exportPdf: "Export PDF (print)", reminders: "Reminders", reminderIn: "in about {min} minutes",
    share: "Share", shareExportHtml: "Export as a share page (HTML)", shareExportHtmlHint: "Standalone file to view — send to anyone, even without site access",
    shareWithUser: "Share with a system user (coming soon)", shareEditAccess: "Share edit access with trip partners (coming soon)",
    demoNeedsAccounts: "This feature needs a user/permission system (a database connection) that doesn't exist in the prototype yet. This is just a preview of how it will look.",
    tryGooglePlaces: "Search with Google Places (preview)", demoNeedsGoogleKey: "Richer, more accurate results (including much better Hebrew support) are possible with the Google Places API — needs an API key and billing on Google Cloud. This is a preview only; the active search currently uses free OpenStreetMap data.",
    tryGooglePlacesReal: "Search with Google Places", usingGooglePlaces: "✓ Searching with Google Places",
    noGoogleKeyConfigured: "Location search requires a configured Google Places API key (VITE_GOOGLE_PLACES_KEY). Contact the app developer.",
    uploadFile: "Upload a file (boarding pass, booking voucher...) — preview", demoNeedsStorage: "File uploads need a storage service (like Supabase Storage or S3), not yet connected in the prototype. This is a preview only.",
    aiDemoNotice: "This is a UI preview only. A real Claude connection needs a server-side function (an API key can't be exposed client-side).",
    aiSuggestItinerary: "Suggest an automatic day plan", aiInputPlaceholder: "Ask a question about the trip...",
    aiSuggestDemoText: "Example suggestion (demo): Day 2 — Morning: visit the Colosseum (9:00), Lunch in Trastevere, Afternoon: Trevi Fountain and the Pantheon. A real connection needs a server running the Claude API.",
    aiChatDemoText: "This is a demo reply only. In a connected version, this question would be sent to Claude along with your trip data and get a grounded answer.",
    importRoute: "Import route from Google Maps", importRouteHint: "Paste a multi-stop Google Maps directions link (Share → Copy link, after planning a route with several stops). Each stop becomes a separate \"Attraction\" record.",
    importRouteParse: "Parse", importRouteNoStops: "No stops detected in this link — make sure it's a Directions link with several stops, not a link to a single place.",
    importRouteShortLink: "This is a shortened link (maps.app.goo.gl) — the real place names are hidden behind it and can't be read directly in the browser (a Google restriction, not a bug). Fix: open the link in your browser/app, and once the route loads, copy the full address from the address bar (starts with google.com/maps/dir/...) and paste that here instead.",
    importRouteConfirm: "Create records",
    hotelInfo: "Hotel details", placeInfo: "Place details", hotelPhotoDemo: "Photo — needs a Google Places API connection (paid). This is a preview only.",
    ratingDemo: "Rating — preview", viewOnMap: "View on map", bookingLink: "Booking link",
    placeOpenNow: "Open", placeClosedNow: "Closed", placeWebsite: "Website", placeCall: "Call",
    googleUiKitError: "Failed to load Google info. Make sure the Maps JavaScript API is enabled and allowed on your key.", notLinkedToGoogle: "This record isn't verified against Google yet — click the verify icon on the location field.",
    tripScheduleCheck: "Trip-schedule check",
    newFrameWizard: "New frame via questionnaire",
    wizardTitle: "Trip planning questionnaire", wizardStepOf: "Step {n} of {total}",
    wizardTripName: "Trip name", wizardTripNameHint: "e.g. Our family trip to Italy",
    wizardDestination: "Destination", wizardDestinationHint: "e.g. Rome, Italy",
    wizardOutboundHint: "Flight details set the trip's start and end dates.",
    wizardOutboundShort: "outbound", wizardReturnShort: "return",
    wizardFlightDate: "Date", wizardFlightTime: "Departure time", wizardDateRequired: "Please enter valid dates for both flights (return date can't be before the outbound date).",
    wizardHasTickets: "Do you already have flight tickets?", wizardYesNo_yes: "Yes", wizardYesNo_no: "No",
    wizardOutboundFlightNo: "Flight # — outbound", wizardReturnFlightNo: "Flight # — return",
    wizardTravelers: "Number of travelers",
    wizardTravelers_solo: "Solo", wizardTravelers_couple: "Couple", wizardTravelers_family: "Family", wizardTravelers_group: "Group",
    wizardBudget: "Budget level", wizardBudget_low: "Budget-friendly", wizardBudget_mid: "Moderate", wizardBudget_high: "Luxury",
    wizardInterests: "Interests (pick any)",
    wizardInterest_history: "History", wizardInterest_food: "Food", wizardInterest_nature: "Nature", wizardInterest_nightlife: "Nightlife",
    wizardInterest_shopping: "Shopping", wizardInterest_art: "Art", wizardInterest_adventure: "Adventure",
    wizardPace: "Trip pace", wizardPace_relaxed: "Relaxed", wizardPace_balanced: "Balanced", wizardPace_packed: "Packed",
    wizardAccommodation: "Accommodation preference", wizardAccommodation_hotel: "Hotel", wizardAccommodation_apartment: "Apartment", wizardAccommodation_hostel: "Hostel", wizardAccommodation_flexible: "Flexible",
    wizardHasReservation: "Do you already have a lodging reservation?", wizardBookingLink: "Booking link",
    wizardCustomRoute: "Should we plan a daily route customized to what you entered?",
    wizardNotes: "Anything else?", wizardNotesHint: "Constraints, special requests, anything worth knowing...",
    wizardWillCreate: "What will be created", wizardWillCreateDesc: "A trip frame spanning your flight dates, two flight records (outbound and return), and a fill-in-ready hotel skeleton for each day in between.",
    wizardAiNote: "Your interests, budget, and pace are saved on the frame — actual activity suggestions based on them will need a future AI server connection.",
    wizardBack: "Back", wizardNext: "Next", wizardCreate: "Create trip",
    computedEndTimeHint: "Computed from the Google Maps route, based on the transportation mode selected in the description.", chronoEndWarning: "The time sequence (including end times) isn't chronological.",
    noOriginHint: "No origin field is needed for this record type.",
    dragDayHint: "Drag to move this day to another frame", dropDayToRoot: "Drop here to take this day out of its frame", showOverallRoute: "Show overall trip route",
    tripSummary: "Trip summary", summaryFlights: "Flights", summaryHotels: "Hotels", summaryPois: "Points of interest", summaryRestaurants: "Restaurants", summaryAvgRating: "Average rating",
    summaryTotal: "total", summaryKmNoFlights: "excluding flights", summaryNights: "nights", summaryAttractions: "attractions", summaryDayTours: "day tours", summaryGuidedTours: "guided tours",
    generateJournal: "Generate travel journal", viewFullRouteMap: "View full route map (excluding flights)", noJournalEntries: "No records with \"personal experience\" yet in this trip.",
    saveTripByName: "Save trip by name", loadSavedTrip: "Load saved trip", tripName: "Trip name",
    saveTripNote: "Currently saved in this browser only (for testing) — in the future it will save per logged-in user, accessible from any device.",
    saveTripSuccess: "Saved successfully", saveTripError: "Save failed — the browser may be out of storage space.",
    noSavedTrips: "No saved trips yet.", load: "Load", confirmDeleteTrip: "Delete this saved trip?",
    locationSectionLabel: "Location & nickname", copyFromOrigin: "Copy from origin", locationColHeader: "Location", aliasColHeader: "Nickname", notesHint: "The note is also shown in the main table column.",
    personalExperience: "Personal experience", personalExperienceHint: "Impressions, tips, memories... (not shown in the table)",
    personalRating: "Personal rating for this record", uploadPhotos: "Upload photos",
    hotelInfoDemoNote: "Address and map link — real (from the record's verified location). An actual photo and rating would need a Google Places connection.",
    warnClosed: "Closed at the scheduled time (per OpenStreetMap opening hours)", warnFeeRequired: "Requires an entry ticket (per OpenStreetMap)",
    aiAssistant: "AI Assistant (preview)", ok: "Got it",
    locHint: "Tip: if the search finds nothing in Hebrew, try the local/English name instead (e.g. \"Fiumicino Airport\").",
    tabSearch: "Text search", tabMap: "Pick on map", mapPickHint: "Click anywhere on the map to mark it",
    mapResolving: "Resolving address...", mapNoName: "No exact address found for this point — you can still pick it by coordinates",
    confirmLocation: "Confirm this location",
    locPickerTitle: "Location search", locSearch: "Search", locSearching: "Searching...", locNoResults: "No results found",
    locError: "Search failed (network/CORS issue reaching the location service). You can open a manual Google Maps search instead:",
    technicalDetail: "Technical detail",
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
function truncateChars(text, n) {
  if (!text) return text;
  return text.length > n ? text.slice(0, n) + "…" : text;
}
function detectTextAlign(text) {
  if (!text) return undefined;
  for (const ch of text) {
    if (/[\u0590-\u05FF]/.test(ch)) return "right";
    if (/[A-Za-z]/.test(ch)) return "left";
  }
  return undefined;
}
function typeDisplayName(t, lang) { return t.name_he != null ? (lang === "en" ? t.name_en : t.name_he) : t.name; }
function noOriginNeeded(typeId) { return typeId === "restaurant" || typeId === "poi" || typeId === "attraction"; }
function isAccommodationType(typeId) { return typeId === "hotel" || typeId === "hostel" || typeId === "apartment"; }

/* Simplified OSM opening_hours check — handles common "Mo-Fr 09:00-18:00" style rules only.
   Returns null (unknown/can't tell) for anything more complex (holidays, exceptions, etc.) — we never
   want to show a false "closed" warning just because we couldn't parse the format. */
function checkOpeningHours(openingHours, dateStr, timeStr) {
  if (!openingHours || !dateStr || !timeStr) return null;
  if (/^\s*24\/7\s*$/i.test(openingHours)) return true;
  const dayMap = { Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6, Su: 0 };
  const dayNames = Object.keys(dayMap);
  const date = new Date(dateStr + "T00:00:00");
  if (isNaN(date.getTime())) return null;
  const dow = date.getDay();
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const minutes = h * 60 + m;
  const rules = openingHours.split(";").map((s) => s.trim()).filter(Boolean);
  let result = null;
  for (const rule of rules) {
    const dayPattern = "(?:" + dayNames.join("|") + ")";
    const m2 = rule.match(new RegExp(`^(${dayPattern}(?:-${dayPattern})?(?:,${dayPattern}(?:-${dayPattern})?)*)\\s+(.+)$`));
    if (!m2) continue;
    const [, daysPart, timesPart] = m2;
    const daysCovered = new Set();
    let validDays = true;
    daysPart.split(",").forEach((seg) => {
      if (seg.includes("-")) {
        const [a, b] = seg.split("-");
        const start = dayMap[a], end = dayMap[b];
        if (start == null || end == null) { validDays = false; return; }
        let d = start;
        for (let i = 0; i < 8; i++) { daysCovered.add(d); if (d === end) break; d = (d + 1) % 7; }
      } else if (dayMap[seg] != null) daysCovered.add(dayMap[seg]);
      else validDays = false;
    });
    if (!validDays || !daysCovered.has(dow)) continue;
    if (/off|closed/i.test(timesPart)) { result = false; continue; }
    const timeRanges = timesPart.split(",").map((s) => s.trim());
    let anyMatch = false, anyParsed = false;
    for (const tr of timeRanges) {
      const tm = tr.match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
      if (!tm) continue;
      anyParsed = true;
      const startMin = Number(tm[1]) * 60 + Number(tm[2]), endMin = Number(tm[3]) * 60 + Number(tm[4]);
      if (minutes >= startMin && minutes <= endMin) anyMatch = true;
    }
    if (anyParsed) result = anyMatch;
  }
  return result;
}
function getRowWarning(row, T) {
  const issues = [];
  const openState = row.toOpeningPeriods ? checkGoogleOpeningHours(row.toOpeningPeriods, row.date, row.startTime) : checkOpeningHours(row.toOpeningHours, row.date, row.startTime);
  if (openState === false) issues.push({ type: "closed", text: `${T.warnClosed} (${row.date} ${row.startTime || "—"})` });
  if (row.toFee && String(row.toFee).toLowerCase() === "yes") issues.push({ type: "fee", text: T.warnFeeRequired });
  return issues;
}
function warningClass(warnings) {
  if (!warnings.length) return "";
  return warnings.some((w) => w.type === "closed") ? "has-warning-closed" : "has-warning-fee";
}
function warningText(warnings) { return warnings.map((w) => w.text).join(" · "); }
function typeMeta(typeId, types, T, lang) {
  if (!typeId || typeId === "unset") return { id: "unset", name: (T && T.selectType) || "בחר...", icon: "Tag", color: "#C1443A" };
  const t = types.find((tt) => tt.id === typeId) || types[0];
  if (!t) return { id: "unset", name: (T && T.selectType) || "בחר...", icon: "Tag", color: "#C1443A" };
  const name = typeDisplayName(t, lang);
  return { ...t, name };
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
function rowStartPoint(row) { return (row.from && row.from.trim()) || (row.fromAlias && row.fromAlias.trim()) || ""; }
function rowEndPoint(row) { return (row.to && row.to.trim()) || (row.toAlias && row.toAlias.trim()) || ""; }
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
let __apiQueue = Promise.resolve();
function throttledCall(fn) {
  const run = __apiQueue.then(() => new Promise((resolve) => setTimeout(resolve, 1100))).then(fn);
  __apiQueue = run.then(() => {}, () => {});
  return run;
}
function mapsSearchUrl(lat, lon) { return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`; }
const __geocodeCache = new Map();
const GOOGLE_PLACES_KEY = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GOOGLE_PLACES_KEY) || "";
function hasGooglePlaces() { return !!GOOGLE_PLACES_KEY; }
function extractGoogleApiError(r) {
  return r.json().then(
    (body) => { throw new Error("http-" + r.status + ((body && body.error && (body.error.message || body.error.status)) ? ": " + (body.error.message || body.error.status) : "")); },
    () => { throw new Error("http-" + r.status); }
  );
}
function googlePlacesAutocomplete(input, lang) {
  if (!GOOGLE_PLACES_KEY || !input || !input.trim()) return Promise.resolve([]);
  return fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GOOGLE_PLACES_KEY },
    body: JSON.stringify({ input, languageCode: lang === "he" ? "he" : "en" }),
  })
    .then((r) => { if (!r.ok) return extractGoogleApiError(r); return r.json(); })
    .then((data) => (data.suggestions || [])
      .map((s) => s.placePrediction)
      .filter(Boolean)
      .map((p) => ({ placeId: p.placeId, text: (p.text && p.text.text) || "" })));
}
function googlePlaceDetails(placeId, lang) {
  if (!GOOGLE_PLACES_KEY || !placeId) return Promise.resolve(null);
  const fieldMask = "displayName,formattedAddress,location,rating,userRatingCount,photos,regularOpeningHours,priceLevel,internationalPhoneNumber,websiteUri";
  return fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=${lang === "he" ? "he" : "en"}`, {
    headers: { "X-Goog-Api-Key": GOOGLE_PLACES_KEY, "X-Goog-FieldMask": fieldMask },
  }).then((r) => { if (!r.ok) return extractGoogleApiError(r); return r.json(); });
}
const PRICE_LEVEL_MAP = { PRICE_LEVEL_FREE: "0", PRICE_LEVEL_INEXPENSIVE: "₪", PRICE_LEVEL_MODERATE: "₪₪", PRICE_LEVEL_EXPENSIVE: "₪₪₪", PRICE_LEVEL_VERY_EXPENSIVE: "₪₪₪₪" };
function priceLevelSymbol(level) { return PRICE_LEVEL_MAP[level] || null; }
function closingTimeForDate(hours, dateStr, lang) {
  if (!hours || !hours.periods || !dateStr) return null;
  const date = new Date(dateStr + "T00:00:00");
  if (isNaN(date.getTime())) return null;
  const dow = date.getDay();
  const period = hours.periods.find((pr) => pr.open && pr.open.day === dow);
  if (!period || !period.close) return null;
  const h = String(period.close.hour || 0).padStart(2, "0"), m = String(period.close.minute || 0).padStart(2, "0");
  return lang === "he" ? `סגור ב-${h}:${m}` : `Closes ${h}:${m}`;
}
function googlePlacesTextSearch(query, lang) {
  if (!GOOGLE_PLACES_KEY || !query || !query.trim()) return Promise.resolve(null);
  const fieldMask = "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos,places.regularOpeningHours";
  return fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GOOGLE_PLACES_KEY, "X-Goog-FieldMask": fieldMask },
    body: JSON.stringify({ textQuery: query, languageCode: lang === "he" ? "he" : "en" }),
  })
    .then((r) => { if (!r.ok) return extractGoogleApiError(r); return r.json(); })
    .then((data) => (data.places && data.places[0]) || null);
}
function checkGoogleOpeningHours(periods, dateStr, timeStr) {
  if (!periods || !periods.length || !dateStr || !timeStr) return null;
  const date = new Date(dateStr + "T00:00:00");
  if (isNaN(date.getTime())) return null;
  const dow = date.getDay();
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const minutes = h * 60 + m;
  let sawDay = false, open = false;
  for (const period of periods) {
    if (!period.open) continue;
    const openDay = period.open.day, openMin = (period.open.hour || 0) * 60 + (period.open.minute || 0);
    const close = period.close;
    if (!close) { if (openDay === dow) { sawDay = true; open = true; } continue; }
    const closeDay = close.day, closeMin = (close.hour || 0) * 60 + (close.minute || 0);
    if (openDay === closeDay) {
      if (dow === openDay) { sawDay = true; if (minutes >= openMin && minutes <= closeMin) open = true; }
    } else {
      if (dow === openDay) { sawDay = true; if (minutes >= openMin) open = true; }
      if (dow === closeDay) { sawDay = true; if (minutes <= closeMin) open = true; }
    }
  }
  return sawDay ? open : false;
}
function deriveGoogleAlias(place, isFlightRow, lang) {
  const name = (place.displayName && place.displayName.text) || (place.formattedAddress || "").split(",")[0];
  if (!name) return null;
  if (isFlightRow) return name;
  return transliterateWords(name, lang) || name;
}
function autoVerifyLocationField(row, field, lang) {
  const text = row[field];
  const isFlightRow = row.typeId === "flight" || row.typeId === "domestic-flight";
  if (hasGooglePlaces()) {
    return googlePlacesTextSearch(text, lang).then((place) => {
      if (!place || !place.location) return null;
      const patch = {
        [field + "Lat"]: place.location.latitude, [field + "Lon"]: place.location.longitude,
        [field + "VerifiedUrl"]: `https://www.google.com/maps/search/?api=1&query=${place.location.latitude},${place.location.longitude}&query_place_id=${place.id}`,
        [field + "VerifiedText"]: text, [field + "PlaceId"]: place.id,
      };
      if (field === "to") patch.toOpeningPeriods = (place.regularOpeningHours && place.regularOpeningHours.periods) || null;
      if (!row[field + "Alias"]) { const alias = deriveGoogleAlias(place, isFlightRow, lang); if (alias) patch[field + "Alias"] = alias; }
      return patch;
    });
  }
  return geocodeTextDetailed(text).then((result) => {
    if (!result) return null;
    const patch = {
      [field + "Lat"]: result.lat, [field + "Lon"]: result.lon,
      [field + "VerifiedUrl"]: mapsSearchUrl(result.lat, result.lon), [field + "VerifiedText"]: text,
    };
    if (field === "to") { patch.toOpeningHours = (result.extratags && result.extratags.opening_hours) || null; patch.toFee = (result.extratags && result.extratags.fee) || null; }
    if (!row[field + "Alias"]) { const alias = deriveSmartAlias(result, isFlightRow, lang); if (alias) patch[field + "Alias"] = alias; }
    return patch;
  });
}
function googlePlacePhotoUrl(photoName, maxWidth) {
  if (!GOOGLE_PLACES_KEY || !photoName) return null;
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth || 480}&key=${GOOGLE_PLACES_KEY}`;
}
function geocodeTextDetailed(text) {
  const key = (text || "").trim().toLowerCase();
  if (!key) return Promise.resolve(null);
  if (__geocodeCache.has(key)) return __geocodeCache.get(key);
  const p = throttledCall(() => fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&extratags=1&limit=1&accept-language=he,en&q=${encodeURIComponent(text)}`, { headers: { Accept: "application/json" } })
    .then((r) => { if (!r.ok) throw new Error("http-" + r.status); return r.json(); })
    .then((data) => (data && data[0] ? { lat: Number(data[0].lat), lon: Number(data[0].lon), address: data[0].address, extratags: data[0].extratags, display_name: data[0].display_name, name: data[0].name, osmClass: data[0].class, osmType: data[0].type } : null)))
    .catch((err) => { __geocodeCache.delete(key); throw err; });
  __geocodeCache.set(key, p);
  return p;
}
function geocodeText(text) {
  return geocodeTextDetailed(text).then((r) => (r ? { lat: r.lat, lon: r.lon } : null));
}
const HEBREW_TRANSLIT_WORDS = {
  hilton: "הילטון", marriott: "מריוט", garden: "גארדן", inn: "אין", hyatt: "הייאט", sheraton: "שרתון",
  hotel: "מלון", hostel: "אכסניה", resort: "ריזורט", airport: "שדה תעופה", suites: "סוויטות", suite: "סוויטה",
  ibis: "איביס", novotel: "נובוטל", holiday: "הולידיי", express: "אקספרס", plaza: "פלאזה", the: "",
  westin: "ווסטין", radisson: "רדיסון", best: "בסט", western: "וסטרן", double: "דאבל", tree: "טרי",
  intercontinental: "אינטרקונטיננטל", crowne: "קראון", regency: "רג'נסי", grand: "גרנד", ramada: "רמדה",
  palace: "פאלאס", park: "פארק", central: "מרכזי", international: "בינלאומי", rome: "רומא", roma: "רומא",
  house: "האוס", boutique: "בוטיק", residence: "רזידנס", tower: "מגדל", towers: "מגדלים", view: "וויו",
  royal: "רויאל", golden: "גולדן", star: "סטאר", bay: "מפרץ", beach: "חוף", city: "סיטי", station: "תחנת",
};
function transliterateWords(text, lang) {
  if (lang !== "he" || !text) return text;
  return text.split(" ").map((w) => {
    const clean = w.toLowerCase().replace(/[^a-z]/g, "");
    if (!clean) return w;
    const t = HEBREW_TRANSLIT_WORDS[clean];
    return t !== undefined ? t : w;
  }).filter(Boolean).join(" ");
}
function deriveSmartAlias(result, isFlightRow, lang) {
  if (!result) return null;
  const addr = result.address || {};
  const specific = addr.suburb || addr.neighbourhood || addr.quarter || addr.hamlet || addr.city_district || addr.borough || addr.town || addr.village;
  const cityName = specific || addr.city || addr.county || addr.state || (result.display_name || "").split(",")[0];
  const iata = result.extratags && (result.extratags.iata || result.extratags["iata"]);
  if (isFlightRow && iata) return `${cityName} (${iata.toUpperCase()})`;
  const isAirport = result.osmClass === "aeroway" || result.osmType === "aerodrome" || (result.extratags && result.extratags.aeroway) || iata;
  if (isAirport) return lang === "en" ? `${cityName}, Airport` : `${cityName}, שדה תעופה`;
  // Prefer the actual venue name (e.g. "Hilton Garden Inn Rome Airport") over the generic city/suburb name
  const placeName = (result.name || (result.display_name || "").split(",")[0] || "").trim();
  if (placeName && placeName.length <= 45 && !/^\d+$/.test(placeName) && isNaN(Number(placeName))) {
    return transliterateWords(placeName, lang) || cityName;
  }
  return cityName;
}
function fetchDrivingRoute(a, b, profile) {
  const p = profile || "driving";
  return throttledCall(() => fetch(`https://router.project-osrm.org/route/v1/${p}/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`)
    .then((r) => { if (!r.ok) throw new Error("http-" + r.status); return r.json(); })
    .then((data) => {
      const route = data && data.routes && data.routes[0];
      if (!route) return null;
      return { distanceKm: route.distance / 1000, durationMin: route.duration / 60 };
    }));
}
function osrmProfileForType(typeId) {
  const mode = TRAVEL_MODE_MAP[typeId];
  if (mode === "walking") return "walking";
  if (mode === "bicycling") return "cycling";
  return "driving";
}
function googleTravelModeForType(typeId) {
  const mode = TRAVEL_MODE_MAP[typeId];
  if (mode === "walking") return "WALK";
  if (mode === "bicycling") return "BICYCLE";
  if (mode === "transit") return "TRANSIT";
  return "DRIVE";
}
function computeGoogleRoute(a, b, travelMode) {
  if (!GOOGLE_PLACES_KEY) return Promise.resolve(null);
  const fieldMask = "routes.duration,routes.distanceMeters";
  const body = {
    origin: { location: { latLng: { latitude: a.lat, longitude: a.lon } } },
    destination: { location: { latLng: { latitude: b.lat, longitude: b.lon } } },
    travelMode,
  };
  if (travelMode === "DRIVE") body.routingPreference = "TRAFFIC_AWARE";
  return fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GOOGLE_PLACES_KEY, "X-Goog-FieldMask": fieldMask },
    body: JSON.stringify(body),
  })
    .then((r) => { if (!r.ok) return extractGoogleApiError(r); return r.json(); })
    .then((data) => {
      const route = data && data.routes && data.routes[0];
      if (!route) return null;
      const durSec = parseFloat((route.duration || "0s").replace("s", "")) || 0;
      return { distanceKm: (route.distanceMeters || 0) / 1000, durationMin: durSec / 60 };
    })
    .catch(() => null);
}
function fetchRouteInfo(a, b, typeId) {
  if (hasGooglePlaces()) {
    return computeGoogleRoute(a, b, googleTravelModeForType(typeId)).then((info) => info || fetchDrivingRoute(a, b, osrmProfileForType(typeId)));
  }
  return fetchDrivingRoute(a, b, osrmProfileForType(typeId));
}

/* Weather — Open-Meteo (free, no API key). Forecast only covers ~16 days ahead. */
const WMO_ICON_MAP = {
  0: { icon: "Sun", he: "בהיר", en: "Clear" },
  1: { icon: "CloudSun", he: "בהיר בעיקרו", en: "Mostly clear" },
  2: { icon: "CloudSun", he: "מעונן חלקית", en: "Partly cloudy" },
  3: { icon: "Cloud", he: "מעונן", en: "Overcast" },
  45: { icon: "CloudFog", he: "ערפל", en: "Fog" }, 48: { icon: "CloudFog", he: "ערפל קפוא", en: "Fog" },
  51: { icon: "CloudRain", he: "טפטוף קל", en: "Light drizzle" }, 53: { icon: "CloudRain", he: "טפטוף", en: "Drizzle" }, 55: { icon: "CloudRain", he: "טפטוף כבד", en: "Heavy drizzle" },
  61: { icon: "CloudRain", he: "גשם קל", en: "Light rain" }, 63: { icon: "CloudRain", he: "גשם", en: "Rain" }, 65: { icon: "CloudRain", he: "גשם כבד", en: "Heavy rain" },
  71: { icon: "CloudSnow", he: "שלג קל", en: "Light snow" }, 73: { icon: "CloudSnow", he: "שלג", en: "Snow" }, 75: { icon: "CloudSnow", he: "שלג כבד", en: "Heavy snow" },
  80: { icon: "CloudRain", he: "ממטרים", en: "Showers" }, 81: { icon: "CloudRain", he: "ממטרים", en: "Showers" }, 82: { icon: "CloudRain", he: "ממטרים עזים", en: "Violent showers" },
  95: { icon: "CloudLightning", he: "סופת רעמים", en: "Thunderstorm" }, 96: { icon: "CloudLightning", he: "סופת רעמים", en: "Thunderstorm" }, 99: { icon: "CloudLightning", he: "סופת רעמים", en: "Thunderstorm" },
};
function weatherMeta(code) { return WMO_ICON_MAP[code] || { icon: "Cloud", he: "לא ידוע", en: "Unknown" }; }
const WEATHER_ICONS = { Sun, CloudSun, Cloud, CloudFog, CloudRain, CloudSnow, CloudLightning };
function fetchJsonWithRetry(url, options, attemptsLeft) {
  attemptsLeft = attemptsLeft == null ? 2 : attemptsLeft;
  return fetch(url, options).then((r) => {
    if (!r.ok) {
      if (attemptsLeft > 1 && (r.status === 503 || r.status === 502 || r.status === 429)) {
        return new Promise((resolve) => setTimeout(resolve, 800)).then(() => fetchJsonWithRetry(url, options, attemptsLeft - 1));
      }
      throw new Error("http-" + r.status);
    }
    return r.json();
  });
}
function fetchWeather(lat, lon, dateStr) {
  return throttledCall(() => fetchJsonWithRetry(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`)
    .then((data) => {
      if (!data || !data.daily || !data.daily.time || !data.daily.time.length) return null;
      const codeArr = data.daily.weather_code || data.daily.weathercode;
      if (!codeArr) return null;
      return { code: codeArr[0], max: data.daily.temperature_2m_max[0], min: data.daily.temperature_2m_min[0] };
    }));
}

const COL_WIDTHS = {
  handle: 26, actions: 72,
  date: 78, day: 48, icon: 40, type: 125, from: 165, to: 165,
  startTime: 68, duration: 45, endTime: 68, route: 92, link: 39, cost: 58, notes: 32, weather: 42,
};
function colFixedWidth(key) {
  if (COL_WIDTHS[key] != null) return COL_WIDTHS[key];
  return 110; // fallback for custom columns
}
function frameSummaryStats(rows, frames, fid) {
  function collectFrameIds(id) {
    let ids = [id];
    frames.filter((f) => f.parentFrameId === id).forEach((f) => { ids = ids.concat(collectFrameIds(f.id)); });
    return ids;
  }
  const frameIds = new Set(collectFrameIds(fid));
  const relevant = rows.filter((r) => frameIds.has(r.frameId || null));
  const FLIGHT_TYPES = ["flight", "domestic-flight"];
  const totalKm = relevant.reduce((s, r) => s + (Number(r.routeDistanceKm) || 0), 0);
  const totalKmNoFlights = relevant.filter((r) => !FLIGHT_TYPES.includes(r.typeId)).reduce((s, r) => s + (Number(r.routeDistanceKm) || 0), 0);
  const countByType = (ids) => relevant.filter((r) => ids.includes(r.typeId)).length;
  const hotelRows = relevant.filter((r) => ["hotel", "hostel", "apartment"].includes(r.typeId));
  const distinctHotels = new Set(hotelRows.map((r) => (r.to || r.from || "").trim()).filter(Boolean)).size;
  const totalNights = new Set(hotelRows.map((r) => r.date).filter(Boolean)).size;
  const ratings = relevant.filter((r) => r.personalRating).map((r) => r.personalRating);
  return {
    totalKm, totalKmNoFlights,
    flights: countByType(FLIGHT_TYPES),
    distinctHotels, totalNights,
    pois: countByType(["poi"]),
    attractions: countByType(["attraction"]),
    dayTours: countByType(["day-tour"]),
    guidedTours: countByType(["guided-tour"]),
    restaurants: countByType(["restaurant"]),
    avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
  };
}
function frameRouteUrl(rows, frames, fid, excludeFlights) {
  function collectFrameIds(id) {
    let ids = [id];
    frames.filter((f) => f.parentFrameId === id).forEach((f) => { ids = ids.concat(collectFrameIds(f.id)); });
    return ids;
  }
  const frameIds = new Set(collectFrameIds(fid));
  let relevant = rows.filter((r) => frameIds.has(r.frameId || null) && !r.parentId);
  if (excludeFlights) relevant = relevant.filter((r) => r.typeId !== "flight" && r.typeId !== "domestic-flight");
  relevant = relevant.sort((a, b) => (a.date + (a.startTime || "")).localeCompare(b.date + (b.startTime || "")));
  return dayRouteUrl(relevant);
}
function dayRouteUrl(rowsInDay) {
  const points = [];
  rowsInDay.forEach((r) => { const a = rowStartPoint(r), b = rowEndPoint(r); if (a) points.push(a); if (b && b !== a) points.push(b); });
  const deduped = points.filter((p, i) => p !== points[i - 1]);
  if (deduped.length < 2) return null;
  return "https://www.google.com/maps/dir/" + deduped.map((p) => encodeURIComponent(p)).join("/");
}
function isChronological(rowsList) {
  let lastStart = null, lastEnd = null;
  for (const r of rowsList) {
    if (r.startTime) {
      if (lastStart !== null && r.startTime < lastStart) return false;
      lastStart = r.startTime;
    }
    if (r.endTime) {
      if (lastEnd !== null && r.endTime < lastEnd) return false;
      if (r.startTime && !r.overnight && r.endTime < r.startTime) return false;
      lastEnd = r.endTime;
    }
  }
  return true;
}
function isShortGoogleMapsLink(url) {
  try {
    const host = new URL(url.trim()).hostname.replace(/^www\./, "");
    return host === "maps.app.goo.gl" || host === "goo.gl";
  } catch (e) { return false; }
}
function parseGoogleMapsWaypoints(url) {
  try {
    const u = new URL(url.trim());
    if (!/google\.[a-z.]+$/i.test(u.hostname.replace(/^www\./, "")) && !/^maps\.app\.goo\.gl$/i.test(u.hostname)) {
      // still try to parse — some short/regional domains won't match, but structure may still work
    }
    const clean = (s) => decodeURIComponent(s.replace(/\+/g, " ")).trim();
    if (u.searchParams.get("waypoints") || u.searchParams.get("destination") || u.searchParams.get("origin")) {
      const parts = [];
      const origin = u.searchParams.get("origin");
      const waypoints = u.searchParams.get("waypoints");
      const destination = u.searchParams.get("destination");
      if (origin) parts.push(origin);
      if (waypoints) parts.push(...waypoints.split("|"));
      if (destination) parts.push(destination);
      return parts.map(clean).filter(Boolean);
    }
    const match = u.pathname.match(/\/dir\/(.+)/);
    if (match) {
      const segments = match[1].split("/").filter(Boolean);
      const names = segments.filter((s) => !/^@/.test(s) && !/^data=/.test(s) && !/^\d+(\.\d+)?,\d+(\.\d+)?,\d+/.test(s));
      return names.map(clean).filter(Boolean);
    }
  } catch (e) { /* invalid URL */ }
  return [];
}
function seedDateOffset(daysFromStart) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 + daysFromStart);
  return d.toISOString().slice(0, 10);
}
function initialRows() {
  const day1 = seedDateOffset(0), day2 = seedDateOffset(1), day5 = seedDateOffset(4);
  const base = [
    { date: day1, typeId: "flight", from: "Ben Gurion Airport", to: "Aeroporto di Roma - Fiumicino Leonardo da Vinci", fromAlias: "תל אביב (TLV)", toAlias: "רומא (FCO)", startTime: "07:40", endTime: "10:35", link: "https://www.google.com/flights", costAmount: 1450, costCurrency: "₪", flightNumber: "LY386" },
    { date: day1, typeId: "taxi", from: "Aeroporto di Roma - Fiumicino Leonardo da Vinci", to: "Hilton Garden Inn Rome Airport", startTime: "11:15", endTime: "12:00", costAmount: 45, costCurrency: "€" },
    { date: day1, typeId: "hotel", from: "Hilton Garden Inn Rome Airport", to: "Hilton Garden Inn Rome Airport", startTime: "12:00", endTime: "15:00", notes: "מנוחה במלון", link: "https://www.booking.com", costAmount: 620, costCurrency: "€" },
    { date: day1, typeId: "train", from: "Hilton Garden Inn Rome Airport", to: "Fontana di Trevi", startTime: "15:30", endTime: "16:10", costAmount: 8, costCurrency: "€" },
    { date: day1, typeId: "day-tour", from: "Fontana di Trevi", to: "Fontana di Trevi", startTime: "16:15", endTime: "19:00", costAmount: 0, costCurrency: "€" },
    { date: day2, typeId: "guided-tour", from: "", to: "", startTime: "09:00", endTime: "13:00", link: "https://maps.google.com", costAmount: 280, costCurrency: "€" },
    { date: day2, typeId: "self-tour", from: "", to: "", startTime: "16:00", endTime: "19:30", costAmount: 0, costCurrency: "€" },
    { date: day5, typeId: "flight", from: "Aeroporto di Roma - Fiumicino Leonardo da Vinci", to: "Ben Gurion Airport", fromAlias: "רומא (FCO)", toAlias: "תל אביב (TLV)", startTime: "18:20", endTime: "21:50", costAmount: 1390, costCurrency: "₪", flightNumber: "LY387" },
  ];
  return base.map((r) => ({ id: uid(), parentId: null, frameId: null, overnight: false, notes: "", mapLink: "", fromVerifiedUrl: "", fromVerifiedText: "", toVerifiedUrl: "", toVerifiedText: "", fromAlias: "", toAlias: "", fromLat: null, fromLon: null, toLat: null, toLon: null, routeDistanceKm: null, routeDurationMin: null, custom: {}, ...r }));
}

/* ================================================================= */
/*  Hoisted display components                                        */
/* ================================================================= */

function RowLine({ row, depth, hasChildren, collapsed, toggleCollapse, prevRow, ctx }) {
  const { T, lang, types, visibleColumns, updateRow, deleteRow, openCard, addRow,
    dragId, setDragId, onDropRow, typeMenuOpen, setTypeMenuOpen, newTypeDraft, setNewTypeDraft, addCustomType, openHotelInfo } = ctx;
  const tm = typeMeta(row.typeId, types, T, lang);
  const Icon = ICONS[tm.icon] || Tag;
  const dur = computeDuration(row.startTime, row.endTime, row.overnight);
  const routeUrl = rowOwnRouteUrl(row);
  const fromVerified = row.fromVerifiedUrl && row.fromVerifiedText === row.from;
  const toVerified = row.toVerifiedUrl && row.toVerifiedText === row.to;
  const typeBtnRef = useRef(null);
  const [typeMenuPos, setTypeMenuPos] = useState({ top: 0, left: 0 });
  const [typeSearch, setTypeSearch] = useState("");
  const [showAddTypeForm, setShowAddTypeForm] = useState(false);
  const [distLoading, setDistLoading] = useState(false);

  const lastRouteCalcSig = useRef(null);
  function fetchRouteDistance() {
    const ownFrom = (!noOriginNeeded(row.typeId) && row.from && row.from.trim()) ? rowStartPoint(row) : "";
    const prevFrom = prevRow ? rowStartPoint(prevRow) : "";
    const prevTo = prevRow ? rowEndPoint(prevRow) : "";
    let origin, originSource;
    if (ownFrom) { origin = ownFrom; originSource = "own"; }
    else if (prevFrom) { origin = prevFrom; originSource = "prevFrom"; }
    else { origin = prevTo; originSource = "prevTo"; }
    const dest = rowEndPoint(row);
    if (!origin || !dest) return;
    const sig = origin + "|" + dest + "|" + (row.startTime || "") + "|" + row.typeId;
    if (lastRouteCalcSig.current === sig || distLoading) return;
    lastRouteCalcSig.current = sig;
    setDistLoading(true);
    const originLat = originSource === "own" ? row.fromLat : originSource === "prevFrom" ? (prevRow && prevRow.fromLat) : (prevRow && prevRow.toLat);
    const originLon = originSource === "own" ? row.fromLon : originSource === "prevFrom" ? (prevRow && prevRow.fromLon) : (prevRow && prevRow.toLon);
    const originP = (originLat != null && originLon != null) ? Promise.resolve({ lat: originLat, lon: originLon }) : geocodeText(origin);
    const destP = (row.toLat != null && row.toLon != null) ? Promise.resolve({ lat: row.toLat, lon: row.toLon }) : geocodeText(dest);
    Promise.all([originP, destP]).then(([a, b]) => {
      setDistLoading(false);
      if (!a || !b) return;
      return fetchRouteInfo(a, b, row.typeId).then((info) => {
        if (!info) return;
        const patch = { routeDistanceKm: info.distanceKm, routeDurationMin: info.durationMin, toLat: b.lat, toLon: b.lon };
        if (originSource === "own") { patch.fromLat = a.lat; patch.fromLon = a.lon; }
        if (row.startTime && (!row.endTime || row.endTimeAuto) && !noOriginNeeded(row.typeId)) {
          const [h, m] = row.startTime.split(":").map(Number);
          const totalMin = (h * 60 + m + Math.round(info.durationMin) + 1440) % 1440;
          patch.endTime = `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
          patch.endTimeAuto = true;
        }
        updateRow(row.id, patch);
      });
    }).catch(() => setDistLoading(false));
  }
  useEffect(() => {
    fetchRouteDistance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id, row.from, row.to, row.fromAlias, row.toAlias, row.startTime, row.typeId, row.fromLat, row.fromLon, row.toLat, row.toLon, prevRow && prevRow.from, prevRow && prevRow.fromAlias, prevRow && prevRow.fromLat, prevRow && prevRow.fromLon, prevRow && prevRow.to, prevRow && prevRow.toAlias, prevRow && prevRow.toLat, prevRow && prevRow.toLon]);

  const [fromVerifyLoading, setFromVerifyLoading] = useState(false);
  useEffect(() => {
    if (!row.from) return;
    const fullyVerified = hasGooglePlaces() ? (row.fromPlaceId && row.fromVerifiedText === row.from) : (row.fromVerifiedUrl && row.fromVerifiedText === row.from);
    if (fullyVerified) return;
    const timer = setTimeout(() => {
      if (fromVerifyLoading) return;
      setFromVerifyLoading(true);
      autoVerifyLocationField(row, "from", lang).then((patch) => {
        setFromVerifyLoading(false);
        if (patch) updateRow(row.id, patch);
      }).catch(() => setFromVerifyLoading(false));
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id, row.from, row.fromLat, row.fromLon, row.fromPlaceId]);

  const [toVerifyLoading, setToVerifyLoading] = useState(false);
  useEffect(() => {
    if (!row.to) return;
    const fullyVerified = hasGooglePlaces() ? (row.toPlaceId && row.toVerifiedText === row.to) : (row.toVerifiedUrl && row.toVerifiedText === row.to);
    if (fullyVerified) return;
    const timer = setTimeout(() => {
      if (toVerifyLoading) return;
      setToVerifyLoading(true);
      autoVerifyLocationField(row, "to", lang).then((patch) => {
        setToVerifyLoading(false);
        if (patch) updateRow(row.id, patch);
      }).catch(() => setToVerifyLoading(false));
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id, row.to, row.toLat, row.toLon, row.toPlaceId]);

  const [weatherLoading, setWeatherLoading] = useState(false);
  const hasWeather = row.weatherCode != null && row.weatherForDate === row.date;
  useEffect(() => {
    if (hasWeather || weatherLoading || !row.date) return;
    const dest = row.to || row.toAlias || "";
    if (!dest) return;
    setWeatherLoading(true);
    const p = (row.toLat != null && row.toLon != null) ? Promise.resolve({ lat: row.toLat, lon: row.toLon }) : geocodeText(dest);
    p.then((coords) => {
      setWeatherLoading(false);
      if (!coords) return;
      return fetchWeather(coords.lat, coords.lon, row.date).then((w) => {
        if (w) updateRow(row.id, { weatherCode: w.code, weatherMin: w.min, weatherMax: w.max, weatherForDate: row.date });
      });
    }).catch(() => setWeatherLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id, row.date, row.to, row.toAlias, row.toLat, row.toLon]);

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
    setTypeSearch(""); setShowAddTypeForm(false);
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
      case "icon": {
        return <PlaceIconWithPreview row={row} tm={tm} Icon={Icon} warnings={[]} T={T} lang={lang} onOpenFull={() => openHotelInfo(row)} />;
      }
      case "type": {
        const warnings = getRowWarning(row, T);
        return (
        <div className="mt-type-wrap">
          <button className="mt-type-btn" ref={typeBtnRef} title={warnings.length ? warningText(warnings) : tm.name} onClick={toggleTypeMenu}>
            <span className={"mt-type-text " + warningClass(warnings)}>{tm.name}</span> <ChevronDown size={12} />
          </button>
          {typeMenuOpen === row.id && (
            <>
              <div className="mt-floating-backdrop" onClick={() => setTypeMenuOpen(null)} />
              <div className="mt-type-menu" style={{ top: typeMenuPos.top ?? undefined, bottom: typeMenuPos.bottom ?? undefined, left: typeMenuPos.left }}>
                <div className="mt-type-search-wrap">
                  <Search size={13} />
                  <input autoFocus className="mt-type-search" placeholder={T.searchTypes} value={typeSearch} onChange={(e) => setTypeSearch(e.target.value)} />
                  {typeSearch && <button className="mt-type-search-clear" onClick={() => setTypeSearch("")}><X size={12} /></button>}
                </div>
                <div className="mt-type-list">
                  {groupTypesByCategory(types)
                    .map((grp) => ({ ...grp, items: grp.items.filter((t) => typeDisplayName(t, lang).toLowerCase().includes(typeSearch.toLowerCase())) }))
                    .filter((grp) => grp.items.length)
                    .map((grp) => (
                      <React.Fragment key={grp.category}>
                        <div className="mt-type-cat-label">{CATEGORY_LABELS[lang][grp.category] || grp.category}</div>
                        {grp.items.map((t) => { const TI = ICONS[t.icon] || Tag; const selected = t.id === row.typeId; return (
                          <button key={t.id} className={"opt" + (selected ? " selected" : "")} onClick={() => {
                            const patch = { typeId: t.id };
                            if (noOriginNeeded(t.id)) { patch.from = ""; patch.fromAlias = ""; patch.fromLat = null; patch.fromLon = null; patch.fromVerifiedUrl = ""; patch.fromVerifiedText = ""; patch.fromPlaceId = null; }
                            updateRow(row.id, patch); setTypeMenuOpen(null);
                          }}>
                            <span className="mt-type-icon" style={{ background: t.color, width: 20, height: 20 }}><TI size={11} /></span>
                            <span style={{ flex: 1 }}>{typeDisplayName(t, lang)}</span>
                            {selected && <Check size={13} />}
                          </button>
                        ); })}
                      </React.Fragment>
                    ))}
                </div>
                <div className="divider" />
                {showAddTypeForm ? (
                  <div className="mt-type-new-form">
                    <input type="text" autoFocus placeholder={T.typeName} value={newTypeDraft.name} onChange={(e) => setNewTypeDraft({ ...newTypeDraft, name: e.target.value })} />
                    <div className="mt-icon-pick-row">
                      {ICON_PALETTE.map((ic) => { const PI = ICONS[ic]; return (
                        <button key={ic} className={"mt-icon-pick" + (newTypeDraft.icon === ic ? " sel" : "")} onClick={() => setNewTypeDraft({ ...newTypeDraft, icon: ic })}><PI /></button>
                      ); })}
                    </div>
                    <button className="mt-btn primary" style={{ width: "100%" }} onClick={() => addCustomType(row.id)}><Plus size={12} /> {T.add}</button>
                  </div>
                ) : (
                  <button className="mt-type-add-toggle" onClick={() => setShowAddTypeForm(true)}><Plus size={13} /> {T.newType}</button>
                )}
              </div>
            </>
          )}
        </div>
      );
      }
      case "from": return (
        <span className={"mt-loc-cell" + (fromVerified ? " has-badge" : "")}>
          {lang === "he" && fromVerified && <a className="mt-loc-badge" href={row.fromVerifiedUrl} target="_blank" rel="noreferrer" title={T.openMap}><MapPin size={11} /></a>}
          {row.fromAlias ? (
            <input className="mt-editable" dir="auto" disabled={noOriginNeeded(row.typeId)} style={{ textAlign: detectTextAlign(row.fromAlias) }} title={noOriginNeeded(row.typeId) ? T.noOriginHint : row.from} value={row.fromAlias} onChange={(e) => updateRow(row.id, { fromAlias: e.target.value })} />
          ) : (
            <input className="mt-editable" dir="auto" disabled={noOriginNeeded(row.typeId)} style={{ textAlign: detectTextAlign(row.from) }} title={noOriginNeeded(row.typeId) ? T.noOriginHint : row.from} placeholder={getTypeHint(row.typeId, "from", lang)} value={row.from} onChange={(e) => updateRow(row.id, { from: e.target.value })} />
          )}
          {lang !== "he" && fromVerified && <a className="mt-loc-badge" href={row.fromVerifiedUrl} target="_blank" rel="noreferrer" title={T.openMap}><MapPin size={11} /></a>}
        </span>
      );
      case "to": return (
        <span className={"mt-loc-cell" + (toVerified ? " has-badge" : "")}>
          {lang === "he" && toVerified && <a className="mt-loc-badge" href={row.toVerifiedUrl} target="_blank" rel="noreferrer" title={T.openMap}><MapPin size={11} /></a>}
          {row.toAlias ? (
            <input className="mt-editable" dir="auto" style={{ textAlign: detectTextAlign(row.toAlias) }} title={row.to} value={row.toAlias} onChange={(e) => updateRow(row.id, { toAlias: e.target.value })} />
          ) : (
            <input className="mt-editable" dir="auto" style={{ textAlign: detectTextAlign(row.to) }} title={row.to} placeholder={getTypeHint(row.typeId, "to", lang)} value={row.to} onChange={(e) => updateRow(row.id, { to: e.target.value })} />
          )}
          {lang !== "he" && toVerified && <a className="mt-loc-badge" href={row.toVerifiedUrl} target="_blank" rel="noreferrer" title={T.openMap}><MapPin size={11} /></a>}
        </span>
      );
      case "startTime": return <input className="mt-editable mt-time" type="time" value={row.startTime} onChange={(e) => updateRow(row.id, { startTime: e.target.value })} />;
      case "duration": return <span title={dur === null ? "" : dur} style={{ color: dur === null ? "var(--danger)" : "var(--muted)", fontSize: 12 }}>{dur === null ? "!" : dur}</span>;
      case "endTime": return <input className={"mt-editable mt-time" + (row.endTimeAuto ? " mt-computed-field" : "")} type="time" value={row.endTime} title={row.endTimeAuto ? T.computedEndTimeHint : undefined} onChange={(e) => updateRow(row.id, { endTime: e.target.value, endTimeAuto: false })} />;
      case "route": return routeUrl ? (
        <span className="mt-route-mini">
          <a className="mt-link-icon" href={routeUrl} target="_blank" rel="noreferrer" title={T.routeTooltip}><Route size={14} /></a>
          {row.routeDistanceKm != null ? (
            <span className="mt-route-km">{row.routeDistanceKm.toFixed(1)} {T.km}</span>
          ) : distLoading ? (
            <span className="mt-route-km">…</span>
          ) : null}
        </span>
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
      case "weather": {
        if (weatherLoading) return <span className="mt-link-icon" title={T.weatherLoading}><Cloud size={14} className="mt-weather-spin" /></span>;
        if (hasWeather) { const meta = weatherMeta(row.weatherCode); const WI = WEATHER_ICONS[meta.icon] || Cloud; return <span className="mt-link-icon" title={`${meta[lang]} · ${Math.round(row.weatherMin)}°–${Math.round(row.weatherMax)}°C`}><WI size={14} /></span>; }
        return <span className="mt-link-icon empty" title={T.weatherAtArrival}><Cloud size={14} /></span>;
      }
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
          <span className="mt-handle-chevron-slot">
            {hasChildren && <button onClick={toggleCollapse} style={{ border: "none", background: "none", display: "flex", color: "var(--muted)" }}>{collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}</button>}
          </span>
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

function FrameInlineDatePicker({ frame, ctx }) {
  const { T, lang, rows, frames, updateFrameDates } = ctx;
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => { const d = new Date(frame.startDate + "T00:00:00"); d.setDate(1); return d; });
  const [tempStart, setTempStart] = useState(frame.startDate);
  const [tempEnd, setTempEnd] = useState(frame.endDate);
  const [issue, setIssue] = useState(null);

  function openPicker(e) {
    e.stopPropagation();
    setTempStart(frame.startDate); setTempEnd(frame.endDate); setIssue(null);
    const d = new Date(frame.startDate + "T00:00:00"); d.setDate(1); setViewMonth(d);
    setOpen(true);
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function toISO(y, m, day) { return `${y}-${pad(m + 1)}-${pad(day)}`; }
  function clickDay(iso) {
    let s, e;
    if (!tempStart || (tempStart && tempEnd)) { s = iso; e = ""; }
    else { s = tempStart; e = iso; if (e < s) { const t = s; s = e; e = t; } }
    setTempStart(s); setTempEnd(e);
    if (e) {
      const draft = { ...frame, startDate: s, endDate: e };
      const problem = frameDateIssue(draft, rows, frames, T);
      if (problem) setIssue(problem);
      else { updateFrameDates(frame.id, s, e); setIssue(null); setOpen(false); }
    }
  }
  function shiftMonth(delta) { setViewMonth((prev) => { const d = new Date(prev); d.setMonth(d.getMonth() + delta); return d; }); }
  const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const monthLabel = viewMonth.toLocaleDateString(lang === "he" ? "he-IL" : "en-US", { month: "long", year: "numeric" });

  return (
    <span style={{ position: "relative" }}>
      <button type="button" className="mt-frame-date-inline mt-frame-date-btn" onClick={openPicker}>
        {fmtDate(frame.startDate, lang)} – {fmtDate(frame.endDate, lang)}
      </button>
      {open && (
        <>
          <div className="mt-floating-backdrop" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="mt-floating-menu mt-daterange-cal" dir="ltr" onClick={(e) => e.stopPropagation()}>
            <div className="mt-cal-header">
              <button type="button" onClick={() => shiftMonth(-1)}><ChevronLeft size={16} /></button>
              <strong>{monthLabel}</strong>
              <button type="button" onClick={() => shiftMonth(1)}><ChevronRight size={16} /></button>
            </div>
            <div className="mt-cal-grid mt-cal-weekdays">
              {(lang === "he" ? ["א", "ב", "ג", "ד", "ה", "ו", "ש"] : ["S", "M", "T", "W", "T", "F", "S"]).map((d, i) => <span key={i}>{d}</span>)}
            </div>
            <div className="mt-cal-grid">
              {cells.map((d, i) => {
                if (!d) return <span key={i} />;
                const iso = toISO(y, m, d);
                const isEdge = iso === tempStart || iso === tempEnd;
                const inRange = tempStart && tempEnd && iso > tempStart && iso < tempEnd;
                return <button type="button" key={i} className={"mt-cal-day" + (isEdge ? " edge" : "") + (inRange ? " in-range" : "")} onClick={() => clickDay(iso)}>{d}</button>;
              })}
            </div>
            {issue && <div className="mt-error" style={{ marginTop: 6 }}><AlertTriangle size={13} /> {issue}</div>}
          </div>
        </>
      )}
    </span>
  );
}

function DateField({ value, onChange }) {
  return (
    <input type="date" value={value} onChange={onChange}
      onClick={(e) => { if (e.target.showPicker) { try { e.target.showPicker(); } catch (err) {} } }} />
  );
}

function DateRangeField({ startDate, endDate, onChange, lang, T }) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => { const d = startDate ? new Date(startDate + "T00:00:00") : new Date(); d.setDate(1); return d; });
  const [tempStart, setTempStart] = useState(startDate || "");
  const [tempEnd, setTempEnd] = useState(endDate || "");
  const btnRef = useRef(null);
  function toggleOpen() {
    if (!open) { const d = tempStart ? new Date(tempStart + "T00:00:00") : new Date(); d.setDate(1); setViewMonth(d); }
    setOpen((v) => !v);
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function toISO(y, m, day) { return `${y}-${pad(m + 1)}-${pad(day)}`; }
  function clickDay(iso) {
    if (!tempStart || (tempStart && tempEnd)) { setTempStart(iso); setTempEnd(""); onChange(iso, ""); }
    else {
      let s = tempStart, e = iso;
      if (e < s) { const t = s; s = e; e = t; }
      setTempStart(s); setTempEnd(e); onChange(s, e);
    }
  }
  function shiftMonth(delta) { setViewMonth((prev) => { const d = new Date(prev); d.setMonth(d.getMonth() + delta); return d; }); }
  const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const monthLabel = viewMonth.toLocaleDateString(lang === "he" ? "he-IL" : "en-US", { month: "long", year: "numeric" });
  return (
    <div style={{ position: "relative" }}>
      <button ref={btnRef} type="button" className="mt-daterange-btn" onClick={toggleOpen}>
        <CalendarIcon size={14} />
        <span>{startDate ? fmtDate(startDate, lang) : "—"} – {endDate ? fmtDate(endDate, lang) : "—"}</span>
      </button>
      {open && (
        <>
          <div className="mt-floating-backdrop" onClick={() => setOpen(false)} />
          <div className="mt-floating-menu mt-daterange-cal" dir="ltr">
            <div className="mt-cal-header">
              <button type="button" onClick={() => shiftMonth(-1)}><ChevronLeft size={16} /></button>
              <strong>{monthLabel}</strong>
              <button type="button" onClick={() => shiftMonth(1)}><ChevronRight size={16} /></button>
            </div>
            <div className="mt-cal-grid mt-cal-weekdays">
              {(lang === "he" ? ["א", "ב", "ג", "ד", "ה", "ו", "ש"] : ["S", "M", "T", "W", "T", "F", "S"]).map((d, i) => <span key={i}>{d}</span>)}
            </div>
            <div className="mt-cal-grid">
              {cells.map((d, i) => {
                if (!d) return <span key={i} />;
                const iso = toISO(y, m, d);
                const isStart = iso === tempStart, isEnd = iso === tempEnd;
                const inRange = tempStart && tempEnd && iso > tempStart && iso < tempEnd;
                return (
                  <button type="button" key={i}
                    className={"mt-cal-day" + (isStart || isEnd ? " edge" : "") + (inRange ? " in-range" : "")}
                    onClick={() => clickDay(iso)}>{d}</button>
                );
              })}
            </div>
            <button type="button" className="mt-btn primary" style={{ width: "100%", marginTop: 8 }} onClick={() => setOpen(false)}>{T.ok}</button>
          </div>
        </>
      )}
    </div>
  );
}

function PlaceIconWithPreview({ row, tm, Icon, warnings, T, lang, onOpenFull }) {
  const [showPreview, setShowPreview] = useState(false);
  const [everShown, setEverShown] = useState(false);
  const [previewPos, setPreviewPos] = useState({ top: 0, right: 0, left: null });
  const btnRef = useRef(null);
  const hoverTimer = useRef(null);
  const placeId = row.fromPlaceId || row.toPlaceId;
  const mapUrl = row.fromVerifiedUrl || row.toVerifiedUrl;
  const PREVIEW_WIDTH = 280;

  function computePos() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const margin = 8;
      const spaceRight = window.innerWidth - r.right;
      const spaceLeft = r.left;
      if (spaceRight >= PREVIEW_WIDTH + margin || spaceRight >= spaceLeft) {
        const left = Math.max(margin, Math.min(r.left, window.innerWidth - PREVIEW_WIDTH - margin));
        setPreviewPos({ top: r.bottom + 6, left, right: null });
      } else {
        const rawRight = window.innerWidth - r.right;
        const maxRight = window.innerWidth - PREVIEW_WIDTH - margin;
        setPreviewPos({ top: r.bottom + 6, right: Math.max(margin, Math.min(rawRight, maxRight)), left: null });
      }
    }
  }
  function handleEnter() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (!placeId || !hasGooglePlaces()) return;
    hoverTimer.current = setTimeout(() => {
      computePos();
      setEverShown(true);
      setShowPreview(true);
    }, 300);
  }
  function handleLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setShowPreview(false);
  }
  function handleClick(e) {
    e.stopPropagation();
    if (!placeId || !hasGooglePlaces()) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    computePos();
    setEverShown(true);
    setShowPreview((v) => !v);
  }
  function handlePreviewClick(e) {
    e.stopPropagation();
    if (mapUrl) window.open(mapUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <span style={{ position: "relative", display: "inline-block" }} onMouseEnter={handleEnter} onMouseLeave={handleLeave} onFocus={handleEnter} onBlur={handleLeave}>
      <button ref={btnRef} className="mt-type-icon mt-type-icon-btn" style={{ background: tm.color }} onClick={handleClick}><Icon /></button>
      {everShown && showPreview && (
        <div className="mt-floating-backdrop" onClick={(e) => { e.stopPropagation(); setShowPreview(false); }} />
      )}
      {everShown && (
        <div className="mt-place-preview-wrap" style={{ top: previewPos.top, right: previewPos.right != null ? previewPos.right : undefined, left: previewPos.left != null ? previewPos.left : undefined, width: PREVIEW_WIDTH, display: showPreview ? "block" : "none", cursor: mapUrl ? "pointer" : "default" }}
          onMouseEnter={handleEnter} onMouseLeave={handleLeave} onClick={handlePreviewClick} title={mapUrl ? T.openMap : undefined}>
          <GooglePlaceDetailsCompact placeId={placeId} T={T} />
        </div>
      )}
    </span>
  );
}

let googleMapsLoadPromise = null;
function loadGoogleMapsScript() {
  if (!GOOGLE_PLACES_KEY) return Promise.reject(new Error("no-key"));
  if (googleMapsLoadPromise) return googleMapsLoadPromise;
  googleMapsLoadPromise = new Promise((resolve, reject) => {
    if (window.customElements && window.customElements.get("gmp-place-details-compact")) { resolve(); return; }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_PLACES_KEY}&libraries=places&v=beta&loading=async`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { googleMapsLoadPromise = null; reject(new Error("script-load-failed")); };
    document.head.appendChild(script);
  });
  return googleMapsLoadPromise;
}
function useGoogleMapsReady() {
  const [state, setState] = useState("loading");
  useEffect(() => {
    let cancelled = false;
    loadGoogleMapsScript().then(() => { if (!cancelled) setState("ready"); }).catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, []);
  return state;
}
function GooglePlaceContentConfig() {
  return (
    <gmp-place-content-config>
      <gmp-place-media lightbox-preferred></gmp-place-media>
      <gmp-place-rating></gmp-place-rating>
      <gmp-place-type></gmp-place-type>
      <gmp-place-price></gmp-place-price>
      <gmp-place-accessible-entrance-icon></gmp-place-accessible-entrance-icon>
      <gmp-place-open-now-status></gmp-place-open-now-status>
      <gmp-place-attribution light-scheme-color="gray" dark-scheme-color="white"></gmp-place-attribution>
    </gmp-place-content-config>
  );
}
function GooglePlaceDetailsCompact({ placeId, T }) {
  const state = useGoogleMapsReady();
  if (!placeId) return null;
  if (state === "error") return <div className="mt-hint" style={{ padding: 10 }}>{T.googleUiKitError}</div>;
  if (state === "loading") return <div className="mt-hint" style={{ padding: 10 }}>{T.locSearching}</div>;
  return (
    <gmp-place-details-compact truncation-preferred style={{ width: "280px", border: "none", padding: 0, margin: 0 }}>
      <gmp-place-details-place-request place={placeId}></gmp-place-details-place-request>
      <GooglePlaceContentConfig />
    </gmp-place-details-compact>
  );
}
function GooglePlaceDetailsFull({ placeId, T }) {
  const state = useGoogleMapsReady();
  if (!placeId) return <div className="mt-hint">{T.notLinkedToGoogle}</div>;
  if (state === "error") return <div className="mt-hint" style={{ padding: 10 }}>{T.googleUiKitError}</div>;
  if (state === "loading") return <div className="mt-hint" style={{ padding: 10 }}>{T.locSearching}</div>;
  return (
    <gmp-place-details style={{ width: "100%", border: "none", padding: 0, margin: 0 }}>
      <gmp-place-details-place-request place={placeId}></gmp-place-details-place-request>
      <GooglePlaceContentConfig />
    </gmp-place-details>
  );
}

function PopoverInfoIcon({ icon: IconComp, color, trigger, children }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  function computePos() { if (btnRef.current) { const r = btnRef.current.getBoundingClientRect(); setPos({ top: r.bottom + 4, left: r.left }); } }
  function toggle(e) {
    e.stopPropagation();
    if (!open) computePos();
    setOpen((v) => !v);
  }
  function handleEnter() { if (trigger === "hover") { computePos(); setOpen(true); } }
  function handleLeave() { if (trigger === "hover") setOpen(false); }
  return (
    <span style={{ display: "inline-flex", verticalAlign: "middle", marginInlineStart: 4 }} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button ref={btnRef} type="button" className="mt-info-icon-btn" style={color ? { color } : undefined} onClick={toggle}><IconComp size={13} /></button>
      {open && (
        <>
          <div className="mt-floating-backdrop" onClick={(e) => { e.stopPropagation(); setOpen(false); }} style={trigger === "hover" ? { pointerEvents: "none" } : undefined} />
          <div className="mt-info-popup" style={{ top: pos.top, left: pos.left }} onClick={(e) => e.stopPropagation()}>{children}</div>
        </>
      )}
    </span>
  );
}

function PlaceInfoModal({ row, onClose, T }) {
  const placeId = row.fromPlaceId || row.toPlaceId;
  const warnings = getRowWarning(row, T);
  return (
    <div className="mt-modal-backdrop" onClick={onClose}>
      <div className="mt-modal" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <div className="mt-modal-header"><span className="mt-modal-title">{T.placeInfo}</span><button className="mt-btn ghost" onClick={onClose}><X size={16} /></button></div>
        <div className="mt-modal-body" style={{ padding: placeId ? 0 : undefined }}>
          <GooglePlaceDetailsFull placeId={placeId} T={T} />
          {(warnings.length > 0 || row.link || row.fromVerifiedUrl || row.toVerifiedUrl) && (
            <div className="mt-trip-check-section">
              {(row.fromVerifiedUrl || row.toVerifiedUrl) && (
                <a className="mt-btn ghost" style={{ width: "100%", justifyContent: "center" }} target="_blank" rel="noreferrer" href={row.fromVerifiedUrl || row.toVerifiedUrl}><MapPin size={13} /> {T.viewOnMap}</a>
              )}
              {row.link && (
                <a className="mt-btn ghost" style={{ width: "100%", justifyContent: "center" }} target="_blank" rel="noreferrer" href={row.link}><Link2 size={13} /> {T.bookingLink}</a>
              )}
              {warnings.length > 0 && <div className="mt-section-label">{T.tripScheduleCheck}</div>}
              {warnings.map((w, i) => (
                <div key={i} className="mt-error" style={w.type === "fee" ? { background: "#FBEEDD", color: "#B5651D" } : undefined}><AlertTriangle size={13} /> {w.text}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileCardMeta({ row, prevRow, ctx }) {
  const { T, lang, updateRow, openCard, openHotelInfo } = ctx;
  const [distLoading, setDistLoading] = useState(false);
  const lastRouteCalcSig = useRef(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const routeUrl = rowOwnRouteUrl(row);
  const hasWeather = row.weatherCode != null && row.weatherForDate === row.date;

  useEffect(() => {
    if (hasWeather || weatherLoading || !row.date) return;
    const dest = row.to || row.toAlias || "";
    if (!dest) return;
    setWeatherLoading(true);
    const p = (row.toLat != null && row.toLon != null) ? Promise.resolve({ lat: row.toLat, lon: row.toLon }) : geocodeText(dest);
    p.then((coords) => {
      setWeatherLoading(false);
      if (!coords) return;
      return fetchWeather(coords.lat, coords.lon, row.date).then((w) => {
        if (w) updateRow(row.id, { weatherCode: w.code, weatherMin: w.min, weatherMax: w.max, weatherForDate: row.date });
      });
    }).catch(() => setWeatherLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id, row.date, row.to, row.toAlias, row.toLat, row.toLon]);

  useEffect(() => {
    const ownFrom = (!noOriginNeeded(row.typeId) && row.from && row.from.trim()) ? rowStartPoint(row) : "";
    const prevFrom = prevRow ? rowStartPoint(prevRow) : "";
    const prevTo = prevRow ? rowEndPoint(prevRow) : "";
    let origin, originSource;
    if (ownFrom) { origin = ownFrom; originSource = "own"; }
    else if (prevFrom) { origin = prevFrom; originSource = "prevFrom"; }
    else { origin = prevTo; originSource = "prevTo"; }
    const dest = rowEndPoint(row);
    if (!origin || !dest) return;
    const sig = origin + "|" + dest + "|" + (row.startTime || "") + "|" + row.typeId;
    if (lastRouteCalcSig.current === sig || distLoading) return;
    lastRouteCalcSig.current = sig;
    setDistLoading(true);
    const originLat = originSource === "own" ? row.fromLat : originSource === "prevFrom" ? (prevRow && prevRow.fromLat) : (prevRow && prevRow.toLat);
    const originLon = originSource === "own" ? row.fromLon : originSource === "prevFrom" ? (prevRow && prevRow.fromLon) : (prevRow && prevRow.toLon);
    const originP = (originLat != null && originLon != null) ? Promise.resolve({ lat: originLat, lon: originLon }) : geocodeText(origin);
    const destP = (row.toLat != null && row.toLon != null) ? Promise.resolve({ lat: row.toLat, lon: row.toLon }) : geocodeText(dest);
    Promise.all([originP, destP]).then(([a, b]) => {
      setDistLoading(false);
      if (!a || !b) return;
      return fetchRouteInfo(a, b, row.typeId).then((info) => {
        if (!info) return;
        const patch = { routeDistanceKm: info.distanceKm, routeDurationMin: info.durationMin, toLat: b.lat, toLon: b.lon };
        if (originSource === "own") { patch.fromLat = a.lat; patch.fromLon = a.lon; }
        if (row.startTime && (!row.endTime || row.endTimeAuto) && !noOriginNeeded(row.typeId)) {
          const [h, m] = row.startTime.split(":").map(Number);
          const totalMin = (h * 60 + m + Math.round(info.durationMin) + 1440) % 1440;
          patch.endTime = `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
          patch.endTimeAuto = true;
        }
        updateRow(row.id, patch);
      });
    }).catch(() => setDistLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id, row.from, row.to, row.fromAlias, row.toAlias, row.startTime, row.typeId, row.fromLat, row.fromLon, row.toLat, row.toLon, prevRow && prevRow.from, prevRow && prevRow.fromAlias, prevRow && prevRow.fromLat, prevRow && prevRow.fromLon, prevRow && prevRow.to, prevRow && prevRow.toAlias, prevRow && prevRow.toLat, prevRow && prevRow.toLon]);

  const [fromVerifyLoading, setFromVerifyLoading] = useState(false);
  useEffect(() => {
    if (!row.from) return;
    const fullyVerified = hasGooglePlaces() ? (row.fromPlaceId && row.fromVerifiedText === row.from) : (row.fromVerifiedUrl && row.fromVerifiedText === row.from);
    if (fullyVerified) return;
    const timer = setTimeout(() => {
      if (fromVerifyLoading) return;
      setFromVerifyLoading(true);
      autoVerifyLocationField(row, "from", lang).then((patch) => {
        setFromVerifyLoading(false);
        if (patch) updateRow(row.id, patch);
      }).catch(() => setFromVerifyLoading(false));
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id, row.from, row.fromLat, row.fromLon, row.fromPlaceId]);

  const [toVerifyLoading, setToVerifyLoading] = useState(false);
  useEffect(() => {
    if (!row.to) return;
    const fullyVerified = hasGooglePlaces() ? (row.toPlaceId && row.toVerifiedText === row.to) : (row.toVerifiedUrl && row.toVerifiedText === row.to);
    if (fullyVerified) return;
    const timer = setTimeout(() => {
      if (toVerifyLoading) return;
      setToVerifyLoading(true);
      autoVerifyLocationField(row, "to", lang).then((patch) => {
        setToVerifyLoading(false);
        if (patch) updateRow(row.id, patch);
      }).catch(() => setToVerifyLoading(false));
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id, row.to, row.toLat, row.toLon, row.toPlaceId]);

  function weatherIconEl() {
    if (weatherLoading) return <Cloud size={15} className="mt-weather-spin" />;
    if (hasWeather) { const meta = weatherMeta(row.weatherCode); const WI = WEATHER_ICONS[meta.icon] || Cloud; return <WI size={15} />; }
    return <Cloud size={15} style={{ opacity: 0.35 }} />;
  }

  return (
    <span className="mt-card-icons" onClick={(e) => e.stopPropagation()}>
      <span className="mt-route-mini" title={T.weatherAtArrival}>
        {weatherIconEl()}
        {hasWeather && <span className="mt-route-km">{Math.round(row.weatherMin)}°–{Math.round(row.weatherMax)}°</span>}
      </span>
      {routeUrl && (
        <span className="mt-route-mini">
          <a className="mt-link-icon" href={routeUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title={T.routeTooltip}><Route size={15} /></a>
          {row.routeDistanceKm != null ? (
            <span className="mt-route-km">{row.routeDistanceKm.toFixed(1)} {T.km}</span>
          ) : distLoading ? (
            <span className="mt-route-km">…</span>
          ) : null}
        </span>
      )}
      {row.link && <a className="mt-link-icon" href={row.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title={row.link}><Link2 size={15} /></a>}
      {row.notes && <button className="mt-link-icon has-note" title={row.notes} onClick={(e) => { e.stopPropagation(); openCard(row); }}><StickyNote size={15} /></button>}
      <button className="mt-link-icon" title={T.placeInfo} onClick={(e) => { e.stopPropagation(); openHotelInfo(row); }}><Info size={15} /></button>
    </span>
  );
}

function DayGroup({ g, fid, depth, ctx }) {
  const { T, lang, effectiveMobile, collapsedGroups, setCollapsedGroups, collapsedParents, setCollapsedParents,
    addRow, openCard, types, visibleColumns, openAddDayModal, rows, sortDayByTime, getColWidth, startResize, dragDayKey, setDragDayKey, startDayPointerDrag, dragId, startRowPointerDrag, openHotelInfo } = ctx;
  const gk = (fid || "root") + "__" + g.date;
  const collapsed = !!collapsedGroups[gk];
  const childrenOf = (pid) => childrenOfPure(rows, pid);
  const allRowsHere = g.rows.flatMap((r) => [r, ...childrenOf(r.id)]);
  const dayRoute = dayRouteUrl(g.rows);
  const chronoOk = isChronological(g.rows);

  return (
    <div className="mt-group">
      <div className={"mt-group-header" + (dragDayKey === gk ? " dragging" : "")} onClick={() => setCollapsedGroups((p) => ({ ...p, [gk]: !p[gk] }))}>
        <span className="mt-day-drag-handle" title={T.dragDayHint} onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => startDayPointerDrag(e, gk)}><GripVertical size={13} /></span>
        <span className="chev">{collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}</span>
        <span className="mt-group-date">{fmtDate(g.date, lang)}</span>
        <span className="mt-group-day">{heDay(g.date, lang)}</span>
        <div className="mt-group-actions" onClick={(e) => e.stopPropagation()}>
          <button className="mt-group-add" onClick={() => openAddDayModal(fid)}>{T.addDayShort}</button>
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
          {allRowsHere.map((r, ri) => {
            const tm = typeMeta(r.typeId, types, T, lang); const Icon = ICONS[tm.icon] || Tag;
            const fromLabel = r.fromAlias || r.from, toLabel = r.toAlias || r.to;
            const cardWarnings = getRowWarning(r, T);
            return (
              <div className="mt-card" key={r.id} data-row-drop={r.id} style={{ opacity: dragId === r.id ? 0.4 : 1 }} onClick={() => openCard(r)}>
                <div className="mt-card-top">
                  <div className="mt-type-chip">
                    <PlaceIconWithPreview row={r} tm={tm} Icon={Icon} warnings={[]} T={T} lang={lang} onOpenFull={() => openHotelInfo(r)} />
                    <strong className={warningClass(cardWarnings)} style={{ fontSize: 13.5 }} title={cardWarnings.length ? warningText(cardWarnings) : undefined}>{tm.name}</strong>
                  </div>
                  <span className="mt-card-times">{r.startTime || "—"}{r.endTime ? ` – ${r.endTime}` : ""}</span>
                  <span className="mt-card-drag-handle" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => { e.stopPropagation(); startRowPointerDrag(e, r.id); }}><GripVertical size={15} /></span>
                </div>
                {(fromLabel || toLabel) && (
                  <div className="mt-card-route">
                    <span dir="auto" title={fromLabel || ""}>{truncateChars(fromLabel, 18) || "—"}</span>
                    {fromLabel && toLabel && <span className="mt-card-arrow">←</span>}
                    {toLabel && <span dir="auto" title={toLabel}>{truncateChars(toLabel, 18)}</span>}
                  </div>
                )}
                <div className="mt-card-bottom">
                  <MobileCardMeta row={r} prevRow={ri > 0 ? allRowsHere[ri - 1] : null} ctx={ctx} />
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
                {visibleColumns.map((c) => {
                  const ICON_HEADER = { link: Link2, notes: StickyNote, weather: Cloud };
                  const HIcon = ICON_HEADER[c.key];
                  return (
                    <th key={c.key} className={c.key} title={lang === "he" ? c.label_he : c.label_en}>
                      {HIcon ? <HIcon size={13} style={{ display: "block", margin: "0 auto" }} /> : (lang === "he" ? c.label_he : c.label_en)}
                      <span className="mt-col-resizer" onMouseDown={(e) => startResize(e, c.key)} />
                    </th>
                  );
                })}
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

function FrameSummaryRow({ frame, ctx }) {
  const { T, lang, rows, frames, displayCurrency, convertAmount, frameTotals, generateTravelJournal } = ctx;
  const [expanded, setExpanded] = useState(false);
  const [summaryCurrency, setSummaryCurrency] = useState(displayCurrency);
  const totals = frameTotals(frame.id);
  const convertedTotal = Object.entries(totals).reduce((sum, [cur, amt]) => sum + convertAmount(amt, cur, summaryCurrency), 0);
  const stats = frameSummaryStats(rows, frames, frame.id);
  return (
    <div className="mt-frame-summary">
      <button className="mt-frame-summary-toggle" onClick={() => setExpanded((v) => !v)}>
        <span>{T.tripSummary}</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      <div className="mt-frame-summary-line">
        <span>{convertedTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        <select className="mt-frame-summary-currency" value={summaryCurrency} onChange={(e) => setSummaryCurrency(e.target.value)} onClick={(e) => e.stopPropagation()}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="mt-frame-summary-line" style={{ marginTop: 3 }}>
        <span>{stats.totalKm.toLocaleString(undefined, { maximumFractionDigits: 0 })} {T.km} {T.summaryTotal}</span>
        <span className="mt-hint">· {stats.totalKmNoFlights.toLocaleString(undefined, { maximumFractionDigits: 0 })} {T.km} {T.summaryKmNoFlights}</span>
      </div>
      {expanded && (
        <>
          <div className="mt-frame-summary-grid">
            {stats.flights > 0 && <span><Plane size={13} /> {stats.flights} {T.summaryFlights}</span>}
            {stats.distinctHotels > 0 && <span><BedDouble size={13} /> {stats.distinctHotels} {T.summaryHotels} · {stats.totalNights} {T.summaryNights}</span>}
            {stats.attractions > 0 && <span><Landmark size={13} /> {stats.attractions} {T.summaryAttractions}</span>}
            {stats.dayTours > 0 && <span><Sun size={13} /> {stats.dayTours} {T.summaryDayTours}</span>}
            {stats.guidedTours > 0 && <span><Users size={13} /> {stats.guidedTours} {T.summaryGuidedTours}</span>}
            {stats.pois > 0 && <span><MapPin size={13} /> {stats.pois} {T.summaryPois}</span>}
            {stats.restaurants > 0 && <span><Utensils size={13} /> {stats.restaurants} {T.summaryRestaurants}</span>}
            {stats.avgRating != null && <span><Star size={13} fill="currentColor" /> {stats.avgRating.toFixed(1)} {T.summaryAvgRating}</span>}
          </div>
          <button className="mt-btn ghost" style={{ marginTop: 8 }} onClick={() => generateTravelJournal(frame.id)}><BookOpen size={13} /> {T.generateJournal}</button>
        </>
      )}
    </div>
  );
}

function FrameBlock({ frame, depth, ctx, renderContext }) {
  const { T, lang, toggleFrameCollapse, openFrameModal, deleteFrame, openAddDayModal, addRow, lastDateInContext, frameTotals, displayCurrency, convertAmount, frameMenuOpenId, setFrameMenuOpenId, frameMenuPos, setFrameMenuPos, onDropDay, dragDayKey, rows, frames } = ctx;
  const totals = frameTotals(frame.id);
  const convertedTotal = Object.entries(totals).reduce((sum, [cur, amt]) => sum + convertAmount(amt, cur, displayCurrency), 0);
  const color = FRAME_COLORS[depth % FRAME_COLORS.length];
  const menuBtnRef = useRef(null);
  const isMenuOpen = frameMenuOpenId === frame.id;
  function toggleMenu(e) {
    e.stopPropagation();
    if (isMenuOpen) { setFrameMenuOpenId(null); return; }
    if (menuBtnRef.current) { const r = menuBtnRef.current.getBoundingClientRect(); setFrameMenuPos({ top: r.bottom + 4, left: r.left }); }
    setFrameMenuOpenId(frame.id);
  }
  return (
    <div className="mt-frame-block" style={{ "--frame-color": color }}>
      <div className={"mt-frame-header" + (dragDayKey ? " droppable" : "")} data-frame-drop={frame.id} onClick={() => toggleFrameCollapse(frame.id)}
        onDragOver={(e) => dragDayKey && e.preventDefault()} onDrop={() => onDropDay(frame.id)}>
        <div className="mt-frame-header-top">
          <span className="chev">{frame.collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}</span>
          <span className="mt-frame-name">{frame.name}</span>
          <span className="mt-frame-end-group">
            {convertedTotal > 0 && (
              <span className="mt-frame-cost-inline">{displayCurrency} {convertedTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            )}
            <span className="mt-frame-actions" onClick={(e) => e.stopPropagation()}>
              <button ref={menuBtnRef} onClick={toggleMenu} title={T.moreOptions}><MoreVertical size={16} /></button>
            </span>
          </span>
        </div>
        <div className="mt-frame-header-dates">
          <FrameInlineDatePicker frame={frame} ctx={ctx} />
        </div>
      </div>
      {isMenuOpen && (
        <>
          <div className="mt-floating-backdrop" onClick={() => setFrameMenuOpenId(null)} />
          <div className="mt-floating-menu mt-kebab-menu" style={{ top: frameMenuPos.top, left: frameMenuPos.left }}>
            <button className="mt-share-opt" onClick={() => { openAddDayModal(frame.id); setFrameMenuOpenId(null); }}><Plus size={14} /> {T.addDay}</button>
            <button className="mt-share-opt" onClick={() => { openFrameModal(null, frame.id); setFrameMenuOpenId(null); }}><FolderPlus size={14} /> {T.addSubFrame}</button>
            <button className="mt-share-opt" onClick={() => { openFrameModal(frame); setFrameMenuOpenId(null); }}><Pencil size={14} /> {T.editFrame}</button>
            <div className="divider" />
            {(() => {
              const overallRoute = frameRouteUrl(rows, frames, frame.id);
              return overallRoute ? (
                <a className="mt-share-opt" href={overallRoute} target="_blank" rel="noreferrer" onClick={() => setFrameMenuOpenId(null)}><Waypoints size={14} /> {T.showOverallRoute}</a>
              ) : <span className="mt-share-opt disabled"><Waypoints size={14} /> {T.showOverallRoute}</span>;
            })()}
            <div className="divider" />
            <button className="mt-share-opt" style={{ color: "var(--danger)" }} onClick={() => { deleteFrame(frame.id); setFrameMenuOpenId(null); }}><Trash2 size={14} /> {T.delete}</button>
          </div>
        </>
      )}
      {!frame.collapsed && (
        <div className="mt-frame-body">
          {renderContext(frame.id, depth + 1)}
        </div>
      )}
      {!frame.collapsed && <FrameSummaryRow frame={frame} ctx={ctx} />}
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

function SplashIntro({ onFinish, lang }) {
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 4000);
    const t2 = setTimeout(() => onFinish(), 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function skip() { setExiting(true); setTimeout(onFinish, 350); }
  const pins = [
    { x: 173.0, y: 48.3, n: 1 }, { x: 188.4, y: 66.7, n: 2 }, { x: 222.0, y: 104.8, n: 3 }, { x: 183.9, y: 148.6, n: 4 },
    { x: 190.1, y: 162.2, n: 5 }, { x: 175.1, y: 168.0, n: 6 }, { x: 175.2, y: 235.4, n: 7 }, { x: 149.6, y: 244.4, n: 8 },
  ];
  const flightD = "M88.1,60 Q183.1,-40 193.1,45";
  const planePath = "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z";
  const landD = "M217.9,174.2 C215.2,172.8 208.3,168.0 203.2,166.7 C198.0,165.4 191.5,169.2 189.4,167.0 C187.3,164.7 193.8,156.5 191.7,154.2 C189.5,152.0 180.3,151.0 177.4,154.2 C174.6,157.5 177.9,164.7 176.1,172.2 C174.2,179.7 169.9,189.2 167.3,196.0 C164.8,202.9 162.8,205.6 162.1,210.4 C161.3,215.1 161.1,220.1 163.2,222.3 C165.3,224.5 170.7,219.9 173.8,222.7 C176.9,225.4 178.7,232.3 180.4,237.5 C182.1,242.8 181.0,247.5 183.2,251.7 C185.3,256.0 188.9,259.0 192.4,261.0 C195.8,263.0 198.9,261.1 202.3,263.0 C205.6,264.9 210.2,268.7 210.8,271.4 C211.3,274.2 208.1,276.6 205.2,278.1 C202.4,279.7 196.8,281.2 194.7,280.0 C192.5,278.8 195.9,274.5 193.3,271.7 C190.7,268.9 182.9,265.4 180.0,264.6 C177.1,263.8 178.9,268.0 177.2,267.4 C175.6,266.8 172.4,263.8 170.8,261.3 C169.1,258.7 170.1,256.2 168.0,253.1 C166.0,250.0 162.3,247.0 159.3,244.0 C156.3,240.9 153.4,235.9 151.5,236.2 C149.6,236.5 149.8,245.6 148.7,245.7 C147.6,245.8 145.8,240.2 145.5,236.7 C145.3,233.3 146.1,231.2 147.3,226.6 C148.5,221.9 149.9,216.7 152.2,210.9 C154.4,205.1 157.0,199.9 160.0,194.2 C163.0,188.4 168.4,184.4 168.9,179.0 C169.4,173.6 163.8,168.2 162.7,164.2 C161.7,160.1 163.3,159.5 163.0,156.5 C162.7,153.5 163.4,151.4 161.1,147.4 C158.8,143.4 152.8,138.2 150.1,134.4 C147.4,130.6 145.9,128.3 146.2,126.2 C146.5,124.2 149.8,126.4 151.9,123.3 C154.0,120.2 158.0,113.6 157.9,109.1 C157.8,104.6 154.3,102.5 151.3,98.4 C148.2,94.3 144.2,91.2 140.9,86.5 C137.6,81.7 133.3,75.3 133.1,72.1 C132.9,69.0 137.2,72.9 139.8,69.2 C142.3,65.5 143.9,54.8 147.3,51.5 C150.8,48.2 155.1,52.2 158.8,50.8 C162.6,49.5 164.9,45.7 168.3,43.8 C171.6,41.8 174.7,39.8 177.7,40.0 C180.7,40.2 183.3,42.4 184.8,45.1 C186.2,47.8 183.6,53.0 185.7,54.9 C187.9,56.7 195.5,52.3 196.7,55.5 C198.0,58.8 193.3,67.1 192.6,72.8 C191.9,78.5 189.9,86.5 193.1,87.4 C196.3,88.3 206.3,78.9 210.3,77.6 C214.3,76.4 212.6,80.0 215.1,80.4 C217.7,80.9 222.2,81.1 224.5,80.0 C226.9,79.0 225.2,75.2 228.0,74.4 C230.8,73.6 235.7,72.9 240.2,75.5 C244.6,78.1 250.1,83.5 252.6,88.8 C255.0,94.0 251.2,99.4 253.7,104.8 C256.3,110.3 264.6,114.0 266.8,119.0 C269.1,124.1 267.2,129.0 266.1,132.8 C265.1,136.6 264.6,139.3 260.8,140.2 C257.1,141.1 252.0,137.6 245.5,137.8 C238.9,137.9 230.2,138.0 224.5,141.0 C218.9,144.0 215.2,148.5 214.0,154.5 C212.8,160.5 217.2,170.7 217.9,174.2 Z";
  return (
    <div className={"mt-intro" + (exiting ? " exiting" : "")} onClick={skip} dir={lang === "he" ? "rtl" : "ltr"}>
      <div className="mt-intro-inner">
        <svg viewBox="0 0 400 320" className="mt-intro-svg">
          <defs>
            <linearGradient id="mtSkyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EAF4F1" />
              <stop offset="100%" stopColor="#F7FAF8" />
            </linearGradient>
            <linearGradient id="mtLandGrad" x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0%" stopColor="#7BB89A" />
              <stop offset="100%" stopColor="#4F9070" />
            </linearGradient>
            <filter id="mtShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#174C45" floodOpacity="0.25" />
            </filter>
          </defs>
          <rect x="0" y="0" width="400" height="320" fill="url(#mtSkyGrad)" />
          <path className="mt-intro-land" filter="url(#mtShadow)" fill="url(#mtLandGrad)" d={landD} />
          <path className="mt-intro-flightpath" d={flightD} />
          <g className="mt-intro-plane">
            <animateMotion dur="2.1s" begin="0.2s" fill="freeze" rotate="auto" path={flightD} />
            <g transform="scale(1.6) rotate(45) translate(-12,-12)">
              <path d={planePath} />
            </g>
          </g>
          {pins.map((p, i) => (
            <g key={i} transform={`translate(${p.x},${p.y})`}>
              <g className="mt-intro-pin" style={{ animationDelay: `${1.9 + i * 0.22}s` }}>
                <path d="M0,-11 C5,-11 9,-6.8 9,-1.5 C9,5 0,14 0,14 C0,14 -9,5 -9,-1.5 C-9,-6.8 -5,-11 0,-11 Z" />
                <circle cx="0" cy="-1.5" r="5.2" className="mt-intro-pin-dot" />
                <text x="0" y="1.5" textAnchor="middle">{p.n}</text>
              </g>
            </g>
          ))}
        </svg>
        <div className="mt-intro-brand">
          <span className="mt-intro-logo">MyTrip Builder</span>
          <span className="mt-intro-version">v{APP_VERSION}</span>
          <span className="mt-intro-tag">{lang === "he" ? "מתכננים את הטיול הבא שלך..." : "Planning your next trip..."}</span>
        </div>
      </div>
    </div>
  );
}

export default function MyTripApp() {
  const [introDisabled, setIntroDisabled] = useState(() => { try { return localStorage.getItem("mytrip_hide_intro") === "1"; } catch (e) { return false; } });
  const [showIntro, setShowIntro] = useState(() => { try { return localStorage.getItem("mytrip_hide_intro") !== "1"; } catch (e) { return true; } });
  function toggleIntroDisabled() {
    const next = !introDisabled;
    setIntroDisabled(next);
    try { localStorage.setItem("mytrip_hide_intro", next ? "1" : "0"); } catch (e) {}
  }
  const [rows, setRows] = useState(initialRows);
  const [frames, setFrames] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isApplyingHistory = useRef(false);
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
  const [colMenuPos, setColMenuPos] = useState({ top: 0, right: 20 });
  const [newColName, setNewColName] = useState("");
  const [typeMenuOpen, setTypeMenuOpen] = useState(null);
  const [newTypeDraft, setNewTypeDraft] = useState({ name: "", icon: "Tag" });
  const [addTypeOpen, setAddTypeOpen] = useState(false);
  const [addTypePos, setAddTypePos] = useState({ top: 0, right: 20 });
  const [addTypeDraft, setAddTypeDraft] = useState({ name: "", icon: "Tag" });
  const [cardRowId, setCardRowId] = useState(null);
  const [cardDraft, setCardDraft] = useState(null);
  const [flightLookupMsg, setFlightLookupMsg] = useState("");
  const [weatherData, setWeatherData] = useState(null);
  const [remindersOn, setRemindersOn] = useState(false);
  const [firedReminders, setFiredReminders] = useState({});
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [actionsMenuPos, setActionsMenuPos] = useState({ top: 60, right: 20 });
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [settingsMenuPos, setSettingsMenuPos] = useState({ top: 60, right: 20 });
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [demoNotice, setDemoNotice] = useState(null);
  const [routeImportOpen, setRouteImportOpen] = useState(false);
  const [routeImportUrl, setRouteImportUrl] = useState("");
  const [routeImportStops, setRouteImportStops] = useState(null);
  const [routeImportDate, setRouteImportDate] = useState("");
  const [routeImportFrameId, setRouteImportFrameId] = useState("");
  const [routeImportStartTime, setRouteImportStartTime] = useState("09:00");
  const [routeImportShortLink, setRouteImportShortLink] = useState(false);
  const [hotelInfoRow, setHotelInfoRow] = useState(null);
  const [dragDayKey, setDragDayKey] = useState(null);
  const [saveTripOpen, setSaveTripOpen] = useState(false);
  const [saveTripName, setSaveTripName] = useState("");
  const [loadTripOpen, setLoadTripOpen] = useState(false);
  const [saveTripMsg, setSaveTripMsg] = useState(null);
  const AI_WIZARD_DEFAULTS = {
    tripName: "", destination: "", outboundDate: "", outboundTime: "", returnDate: "", returnTime: "",
    hasTickets: "", outboundFlightNumber: "", returnFlightNumber: "",
    travelerType: "", budget: "", interests: [], pace: "",
    accommodationType: "", hasReservation: "", bookingLink: "",
    wantsCustomRoute: "", notes: "",
  };
  const [aiWizardOpen, setAiWizardOpen] = useState(false);
  const [aiWizardStep, setAiWizardStep] = useState(0);
  const [aiWizardAnswers, setAiWizardAnswers] = useState(AI_WIZARD_DEFAULTS);
  const [aiWizardError, setAiWizardError] = useState(false);
  const [frameMenuOpenId, setFrameMenuOpenId] = useState(null);
  const [frameMenuPos, setFrameMenuPos] = useState({ top: 0, left: 0 });
  const [frameDraft, setFrameDraft] = useState(null);
  const [addDayCtx, setAddDayCtx] = useState(null); // { fid, date }
  const [locPicker, setLocPicker] = useState(null); // { field, query, results, loading }
  const [dragId, setDragId] = useState(null);
  const [dismissedKey, setDismissedKey] = useState("");
  const [displayCurrency, setDisplayCurrency] = useState("₪");
  const [fxRates, setFxRates] = useState(null);
  const [fxIsLive, setFxIsLive] = useState(false);
  const columnsBtnRef = useRef(null);
  const actionsBtnRef = useRef(null);
  const addTypeBtnRef = useRef(null);
  const settingsBtnRef = useRef(null);
  const pointerDragRef = useRef(null);
  const dir = lang === "he" ? "rtl" : "ltr";
  const T = T_DICT[lang];
  useEffect(() => { document.title = "MyTrip Builder"; }, []);

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

  useEffect(() => {
    if (isApplyingHistory.current) { isApplyingHistory.current = false; return; }
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const next = [...trimmed, { rows, frames }];
      return next.length > 50 ? next.slice(next.length - 50) : next;
    });
    setHistoryIndex((i) => Math.min(i + 1, 49));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, frames]);

  function undo() {
    if (historyIndex <= 0) return;
    const snap = history[historyIndex - 1];
    isApplyingHistory.current = true;
    setRows(snap.rows); setFrames(snap.frames);
    setHistoryIndex(historyIndex - 1);
  }
  function redo() {
    if (historyIndex >= history.length - 1) return;
    const snap = history[historyIndex + 1];
    isApplyingHistory.current = true;
    setRows(snap.rows); setFrames(snap.frames);
    setHistoryIndex(historyIndex + 1);
  }
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  function exportToPDF() { window.print(); }
  function toggleReminders() {
    if (!remindersOn) {
      if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
        Notification.requestPermission().then((perm) => { if (perm === "granted") setRemindersOn(true); });
      } else {
        setRemindersOn(true);
      }
    } else {
      setRemindersOn(false);
    }
  }
  useEffect(() => {
    if (!remindersOn) return;
    function check() {
      const now = new Date();
      rows.forEach((r) => {
        if (!r.date || !r.startTime || firedReminders[r.id]) return;
        const target = new Date(`${r.date}T${r.startTime}:00`);
        const diffMin = (target - now) / 60000;
        if (diffMin > 0 && diffMin <= 120) {
          const tm = typeMeta(r.typeId, types, T, lang);
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification(`${tm.name} — ${T.reminderIn.replace("{min}", Math.round(diffMin))}`, { body: r.toAlias || r.to || r.fromAlias || r.from || "" });
          }
          setFiredReminders((p) => ({ ...p, [r.id]: true }));
        }
      });
    }
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [remindersOn, rows, firedReminders]);

  function showDemoNotice(msg) { setDemoNotice(msg); setActionsMenuOpen(false); }
  function openHotelInfo(row) { setHotelInfoRow(row); }
  const SAVED_TRIPS_KEY = "mytrip_saved_trips";
  function listSavedTrips() {
    try { return JSON.parse(localStorage.getItem(SAVED_TRIPS_KEY) || "{}"); } catch (e) { return {}; }
  }
  function openSaveTripModal() { setSaveTripName(""); setSaveTripMsg(null); setSaveTripOpen(true); setActionsMenuOpen(false); }
  function confirmSaveTrip() {
    if (!saveTripName.trim()) return;
    try {
      const all = listSavedTrips();
      all[saveTripName.trim()] = { rows, frames, displayCurrency, savedAt: new Date().toISOString() };
      localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(all));
      setSaveTripMsg({ ok: true });
      setTimeout(() => setSaveTripOpen(false), 900);
    } catch (e) { setSaveTripMsg({ ok: false }); }
  }
  function openLoadTripModal() { setLoadTripOpen(true); setActionsMenuOpen(false); }
  function loadSavedTrip(name) {
    const all = listSavedTrips();
    const trip = all[name];
    if (!trip) return;
    setRows(trip.rows || []);
    setFrames(trip.frames || []);
    if (trip.displayCurrency) setDisplayCurrency(trip.displayCurrency);
    setLoadTripOpen(false);
  }
  function deleteSavedTrip(name) {
    const all = listSavedTrips();
    delete all[name];
    try { localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(all)); } catch (e) {}
  }
  const AI_WIZARD_STEPS = 6;
  function openAiWizard() {
    setAiWizardAnswers(AI_WIZARD_DEFAULTS);
    setAiWizardStep(0);
    setAiWizardError(false);
    setAiWizardOpen(true);
    setActionsMenuOpen(false);
  }
  function toggleWizardInterest(key) {
    setAiWizardAnswers((a) => ({ ...a, interests: a.interests.includes(key) ? a.interests.filter((k) => k !== key) : [...a.interests, key] }));
  }
  function aiWizardNext() {
    if (aiWizardStep === 1) {
      if (!aiWizardAnswers.outboundDate || !aiWizardAnswers.returnDate) { setAiWizardError(true); return; }
      if (aiWizardAnswers.returnDate < aiWizardAnswers.outboundDate) { setAiWizardError(true); return; }
    }
    setAiWizardError(false);
    setAiWizardStep((s) => Math.min(s + 1, AI_WIZARD_STEPS - 1));
  }
  function aiWizardBack() { setAiWizardError(false); setAiWizardStep((s) => Math.max(s - 1, 0)); }
  function confirmAiWizard() {
    const a = aiWizardAnswers;
    if (!a.outboundDate || !a.returnDate || a.returnDate < a.outboundDate) { setAiWizardError(true); return; }
    const nf = {
      id: uid(), name: a.tripName || (lang === "he" ? "טיול חדש" : "New trip"),
      startDate: a.outboundDate, endDate: a.returnDate, parentFrameId: null, collapsed: false,
      travelerType: a.travelerType, budgetLevel: a.budget, interests: a.interests, pace: a.pace, planningNotes: a.notes,
      accommodationType: a.accommodationType, wantsCustomRoute: a.wantsCustomRoute === "yes",
    };
    setFrames((prev) => [...prev, nf]);

    const id1 = addRow(a.outboundDate, null, nf.id);
    updateRow(id1, { typeId: "flight", startTime: a.outboundTime || "", to: a.destination || "", flightNumber: a.hasTickets === "yes" ? (a.outboundFlightNumber || "") : "" });
    const id2 = addRow(a.returnDate, null, nf.id);
    updateRow(id2, { typeId: "flight", startTime: a.returnTime || "", from: a.destination || "", flightNumber: a.hasTickets === "yes" ? (a.returnFlightNumber || "") : "" });

    const bookingLink = a.hasReservation === "yes" ? (a.bookingLink || "") : "";
    let d = new Date(a.outboundDate + "T00:00:00");
    const endD = new Date(a.returnDate + "T00:00:00");
    d.setDate(d.getDate() + 1);
    while (d < endD) {
      const dateStr = d.toISOString().slice(0, 10);
      const h1 = addRow(dateStr, null, nf.id);
      updateRow(h1, { typeId: "hotel", startTime: "08:00", to: a.destination || "", link: bookingLink });
      const h2 = addRow(dateStr, null, nf.id);
      updateRow(h2, { typeId: "hotel", startTime: "22:00", to: a.destination || "", link: bookingLink });
      d.setDate(d.getDate() + 1);
    }

    setAiWizardOpen(false);
    setAiWizardStep(0);
    setAiWizardAnswers(AI_WIZARD_DEFAULTS);
  }
  function handleAiSuggest() { setAiMessages((p) => [...p, { role: "assistant", text: T.aiSuggestDemoText }]); }
  function handleAiSend() {
    if (!aiInput.trim()) return;
    setAiMessages((p) => [...p, { role: "user", text: aiInput }, { role: "assistant", text: T.aiChatDemoText }]);
    setAiInput("");
  }

  function openRouteImport() {
    setRouteImportUrl(""); setRouteImportStops(null); setRouteImportFrameId(""); setRouteImportShortLink(false);
    setRouteImportDate(nextDateInContext(null));
    setRouteImportOpen(true); setActionsMenuOpen(false);
  }
  function parseRouteImport() {
    if (isShortGoogleMapsLink(routeImportUrl)) {
      setRouteImportShortLink(true);
      setRouteImportStops([]);
      return;
    }
    setRouteImportShortLink(false);
    const stops = parseGoogleMapsWaypoints(routeImportUrl);
    setRouteImportStops(stops);
  }
  function removeRouteImportStop(idx) {
    setRouteImportStops((prev) => prev.filter((_, i) => i !== idx));
  }
  function confirmRouteImport() {
    if (!routeImportStops || !routeImportStops.length || !routeImportDate) return;
    const fid = routeImportFrameId || null;
    let [h, m] = routeImportStartTime.split(":").map(Number);
    routeImportStops.forEach((name) => {
      const startTime = `${String(h % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      h += 1;
      const id = addRow(routeImportDate, null, fid);
      updateRow(id, { typeId: "poi", to: name, startTime });
    });
    setRouteImportOpen(false);
  }

  function buildShareHTML() {
    function esc(s) { return (s || "").toString().replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
    function rowHtml(r, depth) {
      const tm = typeMeta(r.typeId, types, T, lang);
      const from = r.fromAlias || r.from || "", to = r.toAlias || r.to || "";
      return `<div style="padding:7px 0;padding-inline-start:${depth * 16}px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;gap:10px;">
        <div><strong>${esc(tm.name)}</strong> — ${esc(from)}${from && to ? " → " : ""}${esc(to)}${r.notes ? `<br><span style="color:#888;font-size:12px;">${esc(r.notes)}</span>` : ""}</div>
        <div style="color:#666;font-size:12px;white-space:nowrap;">${r.startTime || ""}${r.endTime ? " – " + r.endTime : ""}${Number(r.costAmount) > 0 ? ` · ${esc(r.costCurrency)}${r.costAmount}` : ""}</div>
      </div>`;
    }
    function dayHtml(fid) {
      return dayGroupsAt(fid).map((g) => {
        const rowsHtml = g.rows.map((r) => rowHtml(r, 0) + childrenOf(r.id).map((c) => rowHtml(c, 1)).join("")).join("");
        return `<div style="margin-top:14px;"><div style="font-weight:700;margin-bottom:4px;">${fmtDate(g.date, lang)} — ${heDay(g.date, lang)}</div>${rowsHtml}</div>`;
      }).join("");
    }
    function frameHtml(fid) {
      let out = dayHtml(fid);
      childFrames(fid).forEach((f) => {
        out += `<div style="border:1px solid #ddd;border-radius:10px;padding:12px;margin-top:16px;">
          <div style="font-weight:700;font-size:15px;">${esc(f.name)} <span style="font-weight:400;color:#888;font-size:12px;">(${fmtDate(f.startDate, lang)} – ${fmtDate(f.endDate, lang)})</span></div>
          ${frameHtml(f.id)}
        </div>`;
      });
      return out;
    }
    return `<!DOCTYPE html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8"><title>MyTrip Builder</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#1E2A28;}
    h1{font-family:Georgia,serif;}</style></head><body><h1>MyTrip Builder</h1>${frameHtml(null)}</body></html>`;
  }
  function generateTravelJournal(fid) {
    function esc(s) { return (s || "").toString().replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
    const frame = frames.find((f) => f.id === fid);
    const stats = frameSummaryStats(rows, frames, fid);
    const totals = frameTotals(fid);
    const convertedTotal = Object.entries(totals).reduce((sum, [cur, amt]) => sum + convertAmount(amt, cur, displayCurrency), 0);
    const routeUrl = frameRouteUrl(rows, frames, fid, true);

    function journalRowHtml(r, depth) {
      const tm = typeMeta(r.typeId, types, T, lang);
      const from = r.fromAlias || r.from || "", to = r.toAlias || r.to || "";
      const starsHtml = r.personalRating ? `<div style="color:#D9A23D;font-size:13px;margin-top:2px;">${"★".repeat(r.personalRating)}${"☆".repeat(5 - r.personalRating)}</div>` : "";
      const experienceHtml = r.personalExperience && r.personalExperience.trim()
        ? `<div style="margin-top:6px;line-height:1.7;white-space:pre-wrap;color:#333;">${esc(r.personalExperience)}</div>` : "";
      return `<div style="padding:9px 0;padding-inline-start:${depth * 16}px;border-bottom:1px solid #eee;">
        <div style="display:flex;justify-content:space-between;gap:10px;">
          <div><strong>${esc(tm.name)}</strong> — ${esc(from)}${from && to ? " → " : ""}${esc(to)}${r.notes ? `<br><span style="color:#888;font-size:12px;">${esc(r.notes)}</span>` : ""}</div>
          <div style="color:#666;font-size:12px;white-space:nowrap;">${r.startTime || ""}${r.endTime ? " – " + r.endTime : ""}${Number(r.costAmount) > 0 ? ` · ${esc(r.costCurrency)}${r.costAmount}` : ""}</div>
        </div>
        ${starsHtml}${experienceHtml}
      </div>`;
    }
    function journalDayHtml(dfid) {
      return dayGroupsAt(dfid).map((g) => {
        const rowsHtml = g.rows.map((r) => journalRowHtml(r, 0) + childrenOf(r.id).map((c) => journalRowHtml(c, 1)).join("")).join("");
        return `<div style="margin-top:16px;"><div style="font-weight:700;margin-bottom:4px;">${fmtDate(g.date, lang)} — ${heDay(g.date, lang)}</div>${rowsHtml}</div>`;
      }).join("");
    }
    function journalFrameHtml(dfid) {
      let out = journalDayHtml(dfid);
      childFrames(dfid).forEach((f) => {
        out += `<div style="border:1px solid #ddd;border-radius:10px;padding:12px;margin-top:16px;">
          <div style="font-weight:700;font-size:15px;">${esc(f.name)} <span style="font-weight:400;color:#888;font-size:12px;">(${fmtDate(f.startDate, lang)} – ${fmtDate(f.endDate, lang)})</span></div>
          ${journalFrameHtml(f.id)}
        </div>`;
      });
      return out;
    }

    const statsHtml = `<div style="display:flex;flex-wrap:wrap;gap:14px;background:#F5F8F6;border-radius:10px;padding:14px 16px;margin:18px 0;font-size:13px;color:#3A4A46;">
      ${convertedTotal > 0 ? `<span>${displayCurrency} ${convertedTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>` : ""}
      <span>${stats.totalKm.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${T.km}</span>
      ${stats.flights ? `<span>${stats.flights} ${T.summaryFlights}</span>` : ""}
      ${stats.distinctHotels ? `<span>${stats.distinctHotels} ${T.summaryHotels} · ${stats.totalNights} ${T.summaryNights}</span>` : ""}
      ${stats.attractions ? `<span>${stats.attractions} ${T.summaryAttractions}</span>` : ""}
      ${stats.dayTours ? `<span>${stats.dayTours} ${T.summaryDayTours}</span>` : ""}
      ${stats.guidedTours ? `<span>${stats.guidedTours} ${T.summaryGuidedTours}</span>` : ""}
      ${stats.restaurants ? `<span>${stats.restaurants} ${T.summaryRestaurants}</span>` : ""}
      ${stats.avgRating != null ? `<span>★ ${stats.avgRating.toFixed(1)} ${T.summaryAvgRating}</span>` : ""}
    </div>`;

    const html = `<!DOCTYPE html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8"><title>${esc((frame && frame.name) || "MyTrip Builder")}</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;max-width:720px;margin:32px auto;padding:0 18px;color:#1E2A28;}
    h1{font-family:Georgia,serif;font-size:22px;margin-bottom:2px;}
    h2{font-family:Georgia,serif;font-size:26px;margin-bottom:4px;}
    a{color:#256D64;}</style></head><body>
    <h1>MyTrip Builder</h1>
    <h2>${esc((frame && frame.name) || T.generateJournal)}</h2>
    ${frame ? `<div style="color:#888;font-size:13px;margin-bottom:6px;">(${fmtDate(frame.startDate, lang)} – ${fmtDate(frame.endDate, lang)})</div>` : ""}
    ${statsHtml}
    ${routeUrl ? `<p><a href="${esc(routeUrl)}" target="_blank" rel="noreferrer">${esc(T.viewFullRouteMap)}</a></p>` : ""}
    ${journalFrameHtml(fid)}
    </body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `mytrip-journal-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function exportShareableHTML() {
    const html = buildShareHTML();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `mytrip-share-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function exportToFile() {
    const payload = { version: APP_VERSION, exportedAt: new Date().toISOString(), rows, frames, displayCurrency };
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
    const nf = { id: uid(), name: lang === "he" ? "הטיול שלנו לרומא" : "Our trip to Rome", startDate: start, endDate: end, parentFrameId: null, collapsed: false };
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
      if (!from || !to) return prev;
      const needsMove = from.date !== to.date || (from.frameId || null) !== (to.frameId || null) || from.parentId !== to.parentId;
      let arr = prev.map((r) => {
        if (r.id === dragId) return needsMove ? { ...r, date: to.date, frameId: to.frameId, parentId: to.parentId } : r;
        if (needsMove && r.parentId === dragId) return { ...r, date: to.date, frameId: to.frameId };
        return r;
      });
      const fi = arr.findIndex((r) => r.id === dragId);
      const [moved] = arr.splice(fi, 1);
      const ti = arr.findIndex((r) => r.id === targetId);
      arr.splice(ti, 0, moved);
      return arr;
    });
    setDragId(null);
  }
  function onDropDay(targetFid) {
    if (!dragDayKey) return;
    const sep = dragDayKey.indexOf("__");
    const fidPart = dragDayKey.slice(0, sep), datePart = dragDayKey.slice(sep + 2);
    const sourceFid = fidPart === "root" ? null : fidPart;
    if ((sourceFid || null) === (targetFid || null)) { setDragDayKey(null); return; }
    setRows((prev) => prev.map((r) => (((r.frameId || null) === (sourceFid || null)) && r.date === datePart) ? { ...r, frameId: targetFid } : r));
    setDragDayKey(null);
  }

  function handlePointerDragEnd(e) {
    window.removeEventListener("pointermove", handlePointerDragMove);
    window.removeEventListener("pointerup", handlePointerDragEnd);
    document.body.classList.remove("mt-dragging-active");
    const info = pointerDragRef.current;
    pointerDragRef.current = null;
    if (!info) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) { setDragId(null); setDragDayKey(null); return; }
    if (info.type === "row") {
      const targetEl = el.closest("[data-row-drop]");
      if (targetEl) onDropRow(targetEl.getAttribute("data-row-drop"));
      else setDragId(null);
    } else {
      const targetEl = el.closest("[data-frame-drop]");
      if (targetEl) { const v = targetEl.getAttribute("data-frame-drop"); onDropDay(v === "root" ? null : v); }
      else setDragDayKey(null);
    }
  }
  function handlePointerDragMove(e) { /* visual feedback intentionally minimal */ }
  function startRowPointerDrag(e, rowId) {
    e.preventDefault();
    setDragId(rowId);
    pointerDragRef.current = { type: "row" };
    document.body.classList.add("mt-dragging-active");
    window.addEventListener("pointermove", handlePointerDragMove);
    window.addEventListener("pointerup", handlePointerDragEnd);
  }
  function startDayPointerDrag(e, dayKey) {
    e.preventDefault();
    setDragDayKey(dayKey);
    pointerDragRef.current = { type: "day" };
    document.body.classList.add("mt-dragging-active");
    window.addEventListener("pointermove", handlePointerDragMove);
    window.addEventListener("pointerup", handlePointerDragEnd);
  }

  /* ---------- add-day modal ---------- */
  function openAddDayModal(fid) { setAddDayCtx({ fid, date: nextDateInContext(fid), addHotel: true, addTransport: true, addPoi: true }); }
  function closeAddDayModal() { setAddDayCtx(null); }
  const addDayFrame = addDayCtx && addDayCtx.fid ? frames.find((f) => f.id === addDayCtx.fid) : null;
  const addDayIssue = addDayCtx && addDayFrame && (addDayCtx.date < addDayFrame.startDate || addDayCtx.date > addDayFrame.endDate) ? T.rowOutOfFrame : null;
  function findLastHotelInfo(beforeDate) {
    const hotelRows = rows.filter((r) => r.typeId === "hotel" && r.date && r.date < beforeDate)
      .sort((a, b) => (a.date + (a.startTime || "")).localeCompare(b.date + (b.startTime || "")));
    if (!hotelRows.length) return null;
    const last = hotelRows[hotelRows.length - 1];
    return {
      name: last.to || last.from || "", alias: last.toAlias || last.fromAlias || "",
      lat: last.toLat != null ? last.toLat : last.fromLat, lon: last.toLon != null ? last.toLon : last.fromLon,
      verifiedUrl: last.toVerifiedUrl || last.fromVerifiedUrl || "", verifiedText: last.toVerifiedText || last.fromVerifiedText || "",
      placeId: last.toPlaceId || last.fromPlaceId || null,
    };
  }
  function confirmAddDay() {
    if (!addDayCtx || !addDayCtx.date || addDayIssue) return;
    const prevHotel = findLastHotelInfo(addDayCtx.date);
    const hotelRaw = prevHotel ? prevHotel.name : T.demoHotelRaw;
    const hotelAlias = prevHotel ? prevHotel.alias : T.demoHotelAlias;
    const hotelLat = prevHotel ? prevHotel.lat : null, hotelLon = prevHotel ? prevHotel.lon : null;
    if (addDayCtx.addHotel) {
      const id1 = addRow(addDayCtx.date, null, addDayCtx.fid);
      updateRow(id1, {
        typeId: "hotel", startTime: "08:00",
        from: hotelRaw, fromAlias: hotelAlias, fromLat: hotelLat, fromLon: hotelLon,
        fromVerifiedUrl: prevHotel ? prevHotel.verifiedUrl : "", fromVerifiedText: prevHotel ? prevHotel.verifiedText : "",
        fromPlaceId: prevHotel ? prevHotel.placeId : null,
      });
    }
    if (addDayCtx.addTransport) {
      const idBus = addRow(addDayCtx.date, null, addDayCtx.fid);
      updateRow(idBus, {
        typeId: "bus", startTime: "08:00", to: T.demoLocationRaw, toAlias: T.demoLocationName,
        from: hotelRaw, fromAlias: hotelAlias, fromLat: hotelLat, fromLon: hotelLon,
      });
    }
    if (addDayCtx.addPoi) {
      const idPoi = addRow(addDayCtx.date, null, addDayCtx.fid);
      updateRow(idPoi, { typeId: "poi", startTime: "10:15", endTime: "12:15", to: T.demoLocationRaw, toAlias: T.demoLocationName });
      const idRestaurant = addRow(addDayCtx.date, null, addDayCtx.fid);
      updateRow(idRestaurant, { typeId: "restaurant", startTime: "12:15", endTime: "13:45", to: T.demoRestaurantRaw, toAlias: T.demoRestaurantName });
    }
    if (addDayCtx.addTransport) {
      const idTaxi = addRow(addDayCtx.date, null, addDayCtx.fid);
      updateRow(idTaxi, {
        typeId: "taxi", startTime: "13:45", to: hotelRaw, toAlias: hotelAlias, toLat: hotelLat, toLon: hotelLon,
      });
    }
    if (addDayCtx.addHotel) {
      const id2 = addRow(addDayCtx.date, null, addDayCtx.fid);
      updateRow(id2, {
        typeId: "hotel", endTime: "22:00",
        to: hotelRaw, toAlias: hotelAlias, toLat: hotelLat, toLon: hotelLon,
        toVerifiedUrl: prevHotel ? prevHotel.verifiedUrl : "", toVerifiedText: prevHotel ? prevHotel.verifiedText : "",
        toPlaceId: prevHotel ? prevHotel.placeId : null,
      });
    }
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
    setTypes((prev) => [...prev, { id, name: newTypeDraft.name, icon: newTypeDraft.icon, color: CATEGORY_COLORS.other, category: "other" }]);
    if (rowIdToApply) updateRow(rowIdToApply, { typeId: id });
    setNewTypeDraft({ name: "", icon: "Tag" }); setTypeMenuOpen(null);
  }
  function clampMenuRight(rect, menuWidth) {
    const margin = 8;
    const raw = window.innerWidth - rect.right;
    const maxRight = window.innerWidth - menuWidth - margin;
    return Math.max(margin, Math.min(raw, maxRight));
  }
  function openColumnsMenu() {
    if (settingsBtnRef.current) { const r = settingsBtnRef.current.getBoundingClientRect(); setColMenuPos({ top: r.bottom + 8, right: clampMenuRight(r, 220) }); }
    setColMenuOpen(true);
  }
  function openAddTypeMenu() {
    if (settingsBtnRef.current) { const r = settingsBtnRef.current.getBoundingClientRect(); setAddTypePos({ top: r.bottom + 8, right: clampMenuRight(r, 200) }); }
    setAddTypeOpen(true);
  }
  function openSettingsMenu() {
    if (settingsBtnRef.current) { const r = settingsBtnRef.current.getBoundingClientRect(); setSettingsMenuPos({ top: r.bottom + 8, right: clampMenuRight(r, 220) }); }
    setSettingsMenuOpen((v) => !v);
  }
  function openActionsMenu() {
    if (actionsBtnRef.current) { const r = actionsBtnRef.current.getBoundingClientRect(); setActionsMenuPos({ top: r.bottom + 8, right: clampMenuRight(r, 220) }); }
    setActionsMenuOpen((v) => !v);
  }
  function submitAddType() {
    if (!addTypeDraft.name.trim()) return;
    const id = "custom-" + uid();
    setTypes((prev) => [...prev, { id, name: addTypeDraft.name, icon: addTypeDraft.icon, color: CATEGORY_COLORS.other, category: "other" }]);
    setAddTypeDraft({ name: "", icon: "Tag" }); setAddTypeOpen(false);
  }

  /* ---------- location verification (OpenStreetMap Nominatim — free, no API key) ---------- */
  function openLocationPicker(field) {
    const initialQuery = cardDraft ? (cardDraft[field] || "") : "";
    setLocPicker({ field, mode: "search", query: initialQuery, results: [], loading: false, error: null, mapMarker: null, mapCenter: DEFAULT_MAP_CENTER });
    if (initialQuery.trim()) runLocationSearch(initialQuery);
  }
  function runLocationSearch(queryOverride) {
    if (!locPicker) return;
    const q = (queryOverride !== undefined ? queryOverride : locPicker.query) || "";
    if (!q.trim()) return;
    if (!hasGooglePlaces()) { setLocPicker((p) => (p ? { ...p, error: "no-google-key" } : p)); return; }
    setLocPicker((p) => ({ ...p, loading: true, error: null }));
    googlePlacesAutocomplete(q, lang)
      .then((results) => setLocPicker((p) => (p ? { ...p, loading: false, error: null, results } : p)))
      .catch((err) => setLocPicker((p) => (p ? { ...p, loading: false, results: [], error: (err && err.message) || "network" } : p)));
  }
  function pickGooglePlaceResult(prediction) {
    if (!locPicker) return;
    const field = locPicker.field;
    setLocPicker((p) => (p ? { ...p, loading: true } : p));
    googlePlaceDetails(prediction.placeId, lang).then((details) => {
      if (!details || !details.location) { setLocPicker((p) => (p ? { ...p, loading: false, error: "no-details" } : p)); return; }
      const label = details.formattedAddress || (details.displayName && details.displayName.text) || prediction.text;
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${details.location.latitude},${details.location.longitude}&query_place_id=${prediction.placeId}`;
      const isFlightRow = cardDraft && (cardDraft.typeId === "flight" || cardDraft.typeId === "domestic-flight");
      const smartAlias = (details.displayName && details.displayName.text) || label.split(",")[0];
      if (field === "from") {
        setCardDraft((d) => ({ ...d, from: label, fromVerifiedUrl: mapUrl, fromVerifiedText: label, fromLat: details.location.latitude, fromLon: details.location.longitude, fromPlaceId: prediction.placeId, ...((!d.fromAlias && smartAlias) ? { fromAlias: smartAlias } : {}) }));
      } else if (field === "to") {
        setCardDraft((d) => ({ ...d, to: label, toVerifiedUrl: mapUrl, toVerifiedText: label, toLat: details.location.latitude, toLon: details.location.longitude, toPlaceId: prediction.placeId, ...((!d.toAlias && smartAlias) ? { toAlias: smartAlias } : {}) }));
      } else if (field === "fromAlias") setCardDraft((d) => ({ ...d, fromAlias: smartAlias }));
      else if (field === "toAlias") setCardDraft((d) => ({ ...d, toAlias: smartAlias }));
      setLocPicker(null);
    }).catch(() => setLocPicker((p) => (p ? { ...p, loading: false, error: "network" } : p)));
  }
  function setLocPickerMode(mode) { setLocPicker((p) => ({ ...p, mode })); }
  function handleMapPick(lat, lng) {
    setLocPicker((p) => ({ ...p, mapMarker: { lat, lng, label: null, loading: true, error: null }, mapCenter: [lat, lng] }));
    throttledCall(() => fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&extratags=1&lat=${lat}&lon=${lng}&accept-language=he,en`, { headers: { Accept: "application/json" } })
      .then((r) => { if (!r.ok) throw new Error("http-" + r.status); return r.json(); }))
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
    const cityName = addr.city || addr.town || addr.village || addr.suburb || addr.county || addr.state || label.split(",")[0];
    const iata = result.extratags && (result.extratags.iata || result.extratags["iata"]);
    const smartAlias = isFlightRow && iata ? `${cityName} (${iata.toUpperCase()})` : cityName;
    if (locPicker.field === "from") {
      setCardDraft((d) => ({ ...d, from: label, fromVerifiedUrl: mapUrl, fromVerifiedText: label, fromLat: Number(result.lat), fromLon: Number(result.lon), ...((!d.fromAlias && smartAlias) ? { fromAlias: smartAlias } : {}) }));
    } else if (locPicker.field === "to") {
      setCardDraft((d) => ({ ...d, to: label, toVerifiedUrl: mapUrl, toVerifiedText: label, toLat: Number(result.lat), toLon: Number(result.lon), ...((!d.toAlias && smartAlias) ? { toAlias: smartAlias } : {}) }));
    } else if (locPicker.field === "fromAlias") setCardDraft((d) => ({ ...d, fromAlias: label }));
    else if (locPicker.field === "toAlias") setCardDraft((d) => ({ ...d, toAlias: label }));
    setLocPicker(null);
  }

  /* ---------- record card ---------- */
  function openCard(row) {
    setCardRowId(row.id); setCardDraft({ ...row }); setFlightLookupMsg(""); setWeatherData(null);
    if (row.date) {
      const dest = row.to || row.toAlias || "";
      if (dest) {
        setWeatherData({ loading: true });
        const p = (row.toLat != null && row.toLon != null) ? Promise.resolve({ lat: row.toLat, lon: row.toLon }) : geocodeText(dest);
        p.then((coords) => {
          if (!coords) { setWeatherData({ loading: false, error: "geocode-empty" }); return; }
          return fetchWeather(coords.lat, coords.lon, row.date).then((w) => setWeatherData({ loading: false, data: w, error: w ? null : "weather-empty" }));
        }).catch((err) => setWeatherData({ loading: false, error: (err && err.message) || "network" }));
      }
    }
  }
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
  function updateFrameDates(frameId, start, end) { setFrames((prev) => prev.map((f) => (f.id === frameId ? { ...f, startDate: start, endDate: end } : f))); }

  /* ---------- recursive render ---------- */
  const ctx = {
    T, lang, types, visibleColumns, effectiveMobile, rows, frames,
    updateRow, deleteRow, openCard, addRow, dragId, setDragId, onDropRow, dragDayKey, setDragDayKey, onDropDay, startRowPointerDrag, startDayPointerDrag,
    typeMenuOpen, setTypeMenuOpen, newTypeDraft, setNewTypeDraft, addCustomType,
    collapsedParents, setCollapsedParents, collapsedGroups, setCollapsedGroups,
    toggleFrameCollapse, openFrameModal, deleteFrame, updateFrameDates, nextDateInContext, lastDateInContext, frameTotals,
    openAddDayModal, sortDayByTime, getColWidth, startResize, displayCurrency, convertAmount, openHotelInfo,
    frameMenuOpenId, setFrameMenuOpenId, frameMenuPos, setFrameMenuPos, generateTravelJournal,
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

  const showFlightHint = cardDraft && (cardDraft.typeId === "flight" || cardDraft.typeId === "domestic-flight");
  const showTzHint = cardDraft && TZ_HINT_TYPES.includes(cardDraft.typeId);
  const fromVerifiedCard = cardDraft && cardDraft.fromVerifiedUrl && cardDraft.fromVerifiedText === cardDraft.from;
  const toVerifiedCard = cardDraft && cardDraft.toVerifiedUrl && cardDraft.toVerifiedText === cardDraft.to;

  /* ---------- render ---------- */
  return (
    <>
      {showIntro && <SplashIntro onFinish={() => setShowIntro(false)} lang={lang} />}
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
        .mt-sticky-top { position:sticky; top:0; z-index:30; background:var(--surface); border-bottom:1px solid var(--border); }
        .mt-header-row1 { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 14px 4px; }
        .mt-header-brand-group { display:flex; align-items:center; gap:6px; }
        .mt-brand-mark { width:30px; height:30px; border-radius:8px; background:var(--teal); display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
        .mt-brand-mark::after { content:''; position:absolute; width:44px; height:44px; border:2px solid rgba(255,255,255,.35); border-radius:50%; top:-14px; inset-inline-start:-8px; }
        .mt-brand-mark svg { color:#fff; width:16px; height:16px; z-index:1; }
        .mt-brand-name { font-family:'Frank Ruhl Libre',serif; font-size:18px; font-weight:700; line-height:1; }
        .mt-brand-version { font-size:9.5px; color:var(--muted); font-weight:600; letter-spacing:.02em; }
        .mt-header-actions { display:flex; align-items:center; justify-content:space-between; gap:5px; flex-wrap:wrap; padding:5px 14px; }
        .mt-icon-btn { border:1px solid var(--border); background:var(--surface); color:var(--ink); border-radius:8px; padding:5px 8px; display:flex; align-items:center; gap:5px; font-size:12.5px; font-weight:500; }
        .mt-toolbar { display:flex; align-items:center; justify-content:space-between; gap:5px; flex-wrap:wrap; padding:5px 14px 8px; }
        .mt-icon-btn:disabled { opacity:.35; cursor:not-allowed; }
        .mt-icon-btn:hover { background:var(--teal-tint); border-color:var(--teal); }
        .mt-icon-btn.active { background:var(--teal); color:#fff; border-color:var(--teal); }
        .mt-icon-btn svg { width:14px; height:14px; }
        .mt-avatar { width:26px; height:26px; border-radius:50%; background:var(--teal-tint); color:var(--teal-dark); display:flex; align-items:center; justify-content:center; border:1px solid var(--border); }
        .mt-toolbar-group { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
        .mt-floating-menu { position:fixed; background:var(--surface); color:var(--ink); border:1px solid var(--border); border-radius:10px; box-shadow:0 12px 32px rgba(20,40,35,.18); padding:10px; z-index:200; max-width:92vw; max-height:70vh; overflow-y:auto; }
        .mt-floating-backdrop { position:fixed; inset:0; z-index:190; background:transparent; }
        .mt-menu-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:7px; }
        .mt-menu-head strong { font-size:12.5px; }
        .mt-share-opt { width:100%; display:flex; align-items:center; gap:8px; padding:8px; border-radius:7px; background:none; border:none; font-size:12.5px; text-align:start; color:var(--ink); }
        .mt-share-opt:hover { background:var(--bg); }
        .mt-share-opt.disabled { color:var(--muted); }
        .mt-file-demo { width:100%; display:flex; align-items:center; justify-content:center; gap:8px; border:1.5px dashed var(--border); border-radius:10px; padding:12px; background:var(--bg); color:var(--muted); font-size:12px; }
        .mt-file-demo:hover { border-color:var(--teal); color:var(--teal-dark); }
        .mt-ai-chat { display:flex; flex-direction:column; gap:6px; max-height:200px; overflow-y:auto; }
        .mt-ai-msg { font-size:12.5px; padding:8px 10px; border-radius:10px; max-width:85%; line-height:1.4; }
        .mt-ai-msg.assistant { background:var(--teal-tint); color:var(--teal-dark); align-self:flex-start; }
        .mt-ai-msg.user { background:var(--bg); align-self:flex-end; }
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
        .mt-frame-header { display:flex; flex-direction:column; padding:10px 12px; cursor:pointer; user-select:none; background:#FBFDFC; border-radius:11px 11px 0 0; }
        .mt-frame-header-top { display:flex; align-items:center; gap:9px; }
        .mt-frame-header-dates { margin-top:1px; text-align:right; }
        .mt-frame-name { font-weight:700; font-size:15px; font-family:'Heebo',sans-serif; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:24px; flex-shrink:1; }
        .mt-frame-date-inline { font-size:13.5px; font-weight:700; color:var(--ink); font-family:'Heebo',sans-serif; white-space:nowrap; flex-shrink:0; font-variant-numeric:tabular-nums; }
        .mt-frame-date-btn { border:none; background:none; padding:0; cursor:pointer; }
        .mt-frame-date-btn:hover { text-decoration:underline; }
        .mt-frame-cost-inline { font-size:12.5px; font-weight:700; color:var(--amber); white-space:nowrap; flex-shrink:0; }
        .mt-frame-end-group { display:flex; align-items:center; gap:8px; margin-inline-start:auto; flex-shrink:0; }
        .mt-frame-actions { display:flex; gap:2px; flex-shrink:0; }
        .mt-kebab-menu { min-width:180px; }
        .mt-daterange-btn { display:flex; align-items:center; gap:7px; width:100%; border:1px solid var(--border); border-radius:8px; padding:8px 10px; font-size:13px; background:#fff; color:var(--ink); }
        .mt-daterange-btn:hover { border-color:var(--teal); }
        .mt-daterange-btn svg { color:var(--muted); flex-shrink:0; }
        .mt-daterange-cal { padding:10px; min-width:230px; }
        .mt-cal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        .mt-cal-header button { border:none; background:none; color:var(--muted); display:flex; padding:4px; border-radius:6px; }
        .mt-cal-header button:hover { background:var(--bg); }
        .mt-cal-header strong { font-size:12.5px; }
        .mt-cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
        .mt-cal-weekdays { margin-bottom:2px; }
        .mt-cal-weekdays span { text-align:center; font-size:10px; color:var(--muted); font-weight:600; }
        .mt-cal-day { border:none; background:none; border-radius:6px; padding:6px 0; font-size:12px; color:var(--ink); font-variant-numeric:tabular-nums; }
        .mt-cal-day:hover { background:var(--teal-tint); }
        .mt-cal-day.in-range { background:var(--teal-tint); border-radius:0; }
        .mt-cal-day.edge { background:var(--teal); color:#fff; font-weight:700; }
        .mt-frame-actions button { border:none; background:none; color:var(--muted); padding:4px; border-radius:5px; display:flex; }
        .mt-frame-actions button:hover { background:var(--teal-tint); color:var(--teal-dark); }
        .mt-frame-body { padding:2px 8px 12px 8px; }
        .mt-frame-add-row { margin-top:10px; padding:6px 4px; }
        .mt-group { margin-top:14px; }
        .mt-group-header { display:flex; align-items:center; gap:7px; padding:6px 4px; cursor:pointer; user-select:none; flex-wrap:wrap; }
        .mt-group-date { font-weight:700; font-size:13.5px; }
        .mt-group-day { background:var(--teal-tint); color:var(--teal-dark); font-size:11px; font-weight:600; padding:2px 8px; border-radius:20px; }
        .mt-group-actions { margin-inline-start:auto; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
        .mt-group-add { font-size:12px; color:var(--teal); display:flex; align-items:center; gap:3px; background:none; border:none; font-weight:600; text-decoration:none; }
        .mt-group-add:hover { text-decoration:underline; }
        .mt-group-add.disabled { color:var(--border); cursor:default; }
        .mt-group-add-bottom { display:flex; margin-top:6px; padding:6px 4px; }
        .mt-chrono-warning { display:flex; align-items:center; gap:7px; background:#FBEAE8; color:var(--danger); font-size:11.5px; padding:6px 10px; border-radius:8px; margin:0 4px 8px; }
        .mt-table-wrap { width:100%; overflow-x:auto; border-radius:10px; }
        table.mt-table { width:100%; table-layout:fixed; border-collapse:separate; border-spacing:0; background:var(--surface); border-radius:10px; overflow:hidden; border:1px solid var(--border); }
        .mt-table thead th { text-align:start; font-size:10.5px; text-transform:uppercase; letter-spacing:.03em; color:var(--muted); font-weight:600; padding:6px 10px; background:#FAFCFB; border-bottom:1px solid var(--border); white-space:nowrap; position:relative; overflow:hidden; text-overflow:ellipsis; }
        .mt-table th.from, .mt-table th.to { padding-inline-start:10px; }
        .mt-col-resizer { position:absolute; top:2px; bottom:2px; inset-inline-end:-2px; width:3px; cursor:col-resize; user-select:none; z-index:5; background:rgba(37,109,100,.10); border-radius:2px; }
        .mt-col-resizer:hover, .mt-col-resizer:active { background:var(--teal); opacity:.5; }
        .mt-table tbody td { padding:4px 10px; font-size:12.8px; border-bottom:1px solid var(--border); vertical-align:middle; position:relative; white-space:nowrap; }
        .mt-table td.from, .mt-table td.to, .mt-table th.from, .mt-table th.to { padding-inline:6px; }
        .mt-table tbody tr:last-child td { border-bottom:none; }
        .mt-table tbody tr:hover { background:#FBFDFC; }
        .mt-table th.handle, .mt-table td.handle { white-space:nowrap; }
        .mt-table th.icon, .mt-table td.icon, .mt-table th.route, .mt-table td.route { white-space:nowrap; text-align:center; }
        .mt-table th.link, .mt-table td.link, .mt-table th.actions, .mt-table td.actions, .mt-table th.notes, .mt-table td.notes, .mt-table th.weather, .mt-table td.weather { white-space:nowrap; text-align:center; }
        .mt-table th.duration, .mt-table td.duration { white-space:nowrap; }
        .mt-table th.type, .mt-table td.type { overflow:visible; }
        .mt-table td.from, .mt-table td.to { overflow:hidden; text-overflow:ellipsis; }
        .mt-handle-wrap { display:flex; align-items:center; justify-content:flex-start; }
        .mt-handle-chevron-slot { flex:1; display:flex; align-items:center; justify-content:center; min-width:13px; }
        .mt-type-wrap { position:relative; }
        .mt-type-chip { display:flex; align-items:center; gap:6px; }
        .mt-type-icon { width:22px; height:22px; border-radius:6px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .mt-type-icon-btn { border:none; cursor:pointer; }
        .has-warning-closed { color:var(--danger) !important; text-decoration:underline; text-decoration-style:wavy; text-underline-offset:2px; }
        .has-warning-fee { color:#B5651D !important; text-decoration:underline; text-decoration-style:wavy; text-underline-offset:2px; }
        .mt-type-icon-btn:hover { filter:brightness(1.1); box-shadow:0 0 0 2px var(--teal-tint); }
        .mt-hotel-photo-demo { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; height:110px; border-radius:10px; background:linear-gradient(135deg,var(--teal-tint),var(--bg)); color:var(--teal); border:1.5px dashed var(--border); font-size:11px; text-align:center; padding:8px; }
        .mt-hotel-photo-real { width:100%; height:150px; object-fit:cover; border-radius:10px; }
        .mt-place-preview-wrap { position:fixed; z-index:250; box-shadow:0 8px 24px rgba(20,40,35,.18); border-radius:10px; overflow:hidden; pointer-events:auto; }
        .mt-hotel-rating-demo { display:flex; align-items:center; gap:2px; color:#D9A23D; }
        .mt-hotel-rating-demo .mt-hint { margin-inline-start:6px; color:var(--muted); }
        .mt-type-icon svg { width:12px; height:12px; color:#fff; }
        .mt-type-btn { border:none; background:none; padding:0; display:flex; align-items:center; gap:5px; font-size:12.8px; font-weight:500; color:var(--ink); max-width:100%; }
        .mt-type-text { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .mt-loc-cell { display:flex; align-items:center; gap:2px; }
        .mt-loc-cell .mt-editable { flex:1; max-width:20ch; padding-inline:3px; }
        .mt-alias-display { flex:1; font-size:12.8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:3px 5px; max-width:20ch; cursor:default; }
        .mt-loc-badge { color:#3E8E5A; display:flex; flex-shrink:0; padding-inline-end:2px; }
        .mt-editable { border:1px solid transparent; border-radius:6px; padding:3px 5px; font-size:12.8px; width:100%; background:transparent; font-family:inherit; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .mt-editable:hover { border-color:var(--border); }
        .mt-editable:focus { outline:none; border-color:var(--teal); background:#fff; }
        .mt-editable.mt-time:focus, .mt-editable[type=number]:focus { outline:none; border-color:var(--teal); background:#fff; }
        .mt-editable.mt-time { min-width:60px; font-weight:700; color:var(--ink); padding-inline-end:2px; }
        .mt-computed-field { border-bottom:2px dotted var(--teal) !important; }
        .mt-editable.mt-time::-webkit-calendar-picker-indicator { padding:1px; margin-inline-start:1px; width:10px; height:10px; opacity:.6; }
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
        .mt-day-drag-handle { cursor:grab; color:#9FB0AA; display:flex; align-items:center; margin-inline-end:2px; touch-action:none; }
        .mt-card-drag-handle { cursor:grab; color:#9FB0AA; display:flex; align-items:center; margin-inline-start:6px; touch-action:none; }
        body.mt-dragging-active { cursor:grabbing; user-select:none; -webkit-user-select:none; }
        body.mt-dragging-active * { cursor:grabbing !important; }
        .mt-group-header.dragging { opacity:.4; }
        .mt-frame-header.droppable { outline:2px dashed var(--teal); outline-offset:-2px; }
        .mt-root-drop-zone { border:2px dashed var(--teal); border-radius:10px; padding:14px; text-align:center; color:var(--teal-dark); font-size:12.5px; font-weight:600; background:var(--teal-tint); margin-bottom:10px; }
        .mt-drag-handle:hover { color:var(--teal-dark); }
        .mt-empty { padding:16px; text-align:center; color:var(--muted); font-size:12.5px; background:var(--surface); border:1px dashed var(--border); border-radius:12px; }
        .mt-summary { margin-top:20px; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
        .mt-summary-label { font-size:12px; color:var(--muted); font-weight:600; }
        .mt-chip { background:var(--amber-tint); color:#8A5A1F; font-weight:700; font-size:12.5px; padding:4px 11px; border-radius:20px; }
        .mt-chip.small { font-size:11px; padding:2px 8px; font-weight:600; }
        .mt-chip-total { font-size:15px; padding:6px 14px; }
        .mt-fx-select { border:1px solid var(--border); border-radius:8px; padding:5px 8px; font-size:12.5px; background:#fff; color:var(--ink); }
        .mt-fx-note { font-size:10.5px; color:var(--muted); font-style:italic; }
        .mt-type-menu { position:fixed; z-index:200; background:var(--surface); border:1px solid var(--border); border-radius:10px; box-shadow:0 12px 32px rgba(20,40,35,.18); padding:8px; min-width:210px; max-height:min(360px, 70vh); display:flex; flex-direction:column; color:var(--ink); }
        .mt-type-search-wrap { display:flex; align-items:center; gap:6px; border:1px solid var(--border); border-radius:8px; padding:6px 8px; margin-bottom:6px; background:#fff; flex-shrink:0; }
        .mt-type-search-wrap svg { color:var(--muted); flex-shrink:0; }
        .mt-type-search { border:none; outline:none; flex:1; font-size:12.5px; background:transparent; color:var(--ink); min-width:0; }
        .mt-type-search-clear { border:none; background:none; color:var(--muted); display:flex; padding:2px; }
        .mt-type-list { overflow-y:auto; flex:1; min-height:0; }
        .mt-type-add-toggle { width:100%; display:flex; align-items:center; justify-content:center; gap:6px; padding:8px; border-radius:7px; background:none; border:none; font-size:12px; color:var(--teal); font-weight:600; flex-shrink:0; }
        .mt-type-add-toggle:hover { background:var(--bg); }
        .mt-type-cat-label { font-size:10px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); font-weight:700; padding:8px 8px 3px; }
        .mt-type-menu button.opt { width:100%; display:flex; align-items:center; gap:8px; padding:7px 8px; border-radius:7px; background:none; border:none; font-size:12.5px; text-align:start; color:var(--ink); }
        .mt-type-menu button.opt.selected { background:var(--teal-tint); font-weight:600; color:var(--teal-dark); }
        .mt-type-menu button.opt.selected svg:last-child { color:var(--teal); }
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
        .mt-modal-body { padding:14px 18px; display:flex; flex-direction:column; gap:9px; }
        .mt-field label { display:block; font-size:11.5px; font-weight:600; color:var(--muted); margin-bottom:4px; }
        .mt-field input, .mt-field select, .mt-field textarea { width:100%; border:1px solid var(--border); border-radius:8px; padding:7px 9px; font-size:13px; font-family:inherit; background:#fff; color:var(--ink); }
        .mt-field input:focus, .mt-field select:focus, .mt-field textarea:focus { outline:none; border-color:var(--teal); }
        .mt-field textarea { resize:vertical; min-height:60px; }
        .mt-section-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); margin-top:6px; }
        .mt-trip-check-section { padding:12px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:6px; }
        .mt-wizard-progress { height:4px; background:var(--border); margin:0 18px; border-radius:2px; overflow:hidden; }
        .mt-wizard-progress-bar { height:100%; background:var(--teal); transition:width .25s ease; }
        .mt-wizard-choices { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
        .mt-wizard-choice { border:1.5px solid var(--border); background:var(--surface); color:var(--ink); border-radius:20px; padding:6px 14px; font-size:12.5px; font-weight:500; cursor:pointer; }
        .mt-wizard-choice.selected { background:var(--teal); border-color:var(--teal); color:#fff; }
        .mt-wizard-summary { margin-top:10px; padding:10px; background:var(--teal-tint); border-radius:8px; }
        .mt-loc-grid { display:grid; grid-template-columns:auto auto 2fr auto 1fr; align-items:center; gap:6px 6px; margin-top:4px; }
        .mt-loc-col-header { font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.03em; text-align:start; }
        .mt-loc-row-label { font-size:12px; font-weight:700; color:var(--ink); white-space:nowrap; }
        .mt-loc-icons { display:flex; gap:0; }
        .mt-loc-icons .mt-btn-icon { padding:5px 5px; }
        .mt-loc-grid-input { width:100%; border:1px solid var(--border); border-radius:8px; padding:6px 8px; font-size:12.5px; font-family:inherit; background:#fff; color:var(--ink); }
        .mt-loc-grid-input:focus { outline:none; border-color:var(--teal); }
        .mt-loc-verified-slot { display:flex; justify-content:center; min-width:18px; }
        .mt-loc-alias-cell { display:flex; align-items:center; gap:2px; }
        .mt-loc-mobile { display:flex; flex-direction:column; gap:6px; margin-top:4px; }
        .mt-loc-mobile-row { display:flex; align-items:center; gap:6px; }
        .mt-loc-mobile-row .mt-loc-row-label { flex-shrink:0; width:32px; }
        .mt-loc-mobile-row .mt-loc-grid-input { flex:1; min-width:0; }
        .mt-loc-mobile-alias-row { display:flex; align-items:center; gap:4px; padding-inline-start:38px; }
        .mt-loc-mobile-alias-row input { flex:1; min-width:0; border:1px solid var(--border); border-radius:8px; padding:6px 8px; font-size:12.5px; font-family:inherit; background:#fff; color:var(--ink); }
        .mt-loc-mobile-alias-row input:focus { outline:none; border-color:var(--teal); }
        .mt-loc-alias-cell input { flex:1; min-width:0; border:1px solid var(--border); border-radius:8px; padding:6px 8px; font-size:12.5px; font-family:inherit; background:#fff; color:var(--ink); }
        .mt-loc-alias-cell input:focus { outline:none; border-color:var(--teal); }
        .mt-info-icon-btn { border:none; background:none; color:var(--muted); display:inline-flex; padding:1px; vertical-align:middle; }
        .mt-info-icon-btn:hover { color:var(--teal); }
        .mt-info-popup { position:fixed; z-index:260; background:var(--surface); border:1px solid var(--border); border-radius:8px; box-shadow:0 8px 24px rgba(20,40,35,.18); padding:9px 11px; font-size:12px; max-width:230px; color:var(--ink); line-height:1.5; }
        .mt-info-popup a { color:var(--teal); font-weight:600; }
        .mt-star-picker { display:flex; gap:3px; }
        .mt-star-picker button { border:none; background:none; color:#D9A23D; padding:2px; display:flex; }
        .mt-frame-summary { border-top:1px solid var(--border); padding:8px 10px; background:#FAFCFB; }
        .mt-frame-summary-toggle { display:flex; align-items:center; gap:5px; border:none; background:none; color:var(--muted); font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; padding:0; }
        .mt-frame-summary-line { display:flex; align-items:center; gap:6px; margin-top:4px; font-size:13px; font-weight:700; color:var(--ink); flex-wrap:wrap; }
        .mt-frame-summary-currency { border:1px solid var(--border); border-radius:6px; padding:2px 4px; font-size:11px; font-weight:600; background:var(--surface); color:var(--ink); }
        .mt-frame-summary-grid { display:flex; gap:14px; margin-top:8px; flex-wrap:wrap; font-size:12px; color:var(--muted); }
        .mt-frame-summary-grid span { display:flex; align-items:center; gap:4px; }
        .mt-field-row { display:flex; gap:9px; }
        .mt-field-row > div { flex:1; }
        .mt-field-inline { display:flex; gap:3px; align-items:flex-end; }
        .mt-field-inline > div:first-child { flex:1; }
        .mt-checkbox-row { display:flex; align-items:center; gap:7px; font-size:12.5px; }
        .mt-error { display:flex; gap:6px; align-items:flex-start; background:#FBEAE8; color:var(--danger); font-size:11.5px; padding:7px 9px; border-radius:8px; }
        .mt-error svg { width:13px; height:13px; flex-shrink:0; margin-top:1px; }
        .mt-hint { font-size:11px; color:var(--muted); }
        .mt-weather-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .mt-weather-icon-btn { border:1px solid var(--border); background:#fff; border-radius:8px; padding:5px; }
        .mt-weather-icon-btn:hover { background:var(--teal-tint); border-color:var(--teal); }
        .mt-weather-icon-btn svg { color:#3E7CB1; }
        .mt-weather-detail { font-size:12px; color:var(--muted); }
        .mt-weather-spin { animation:mt-spin 1.2s linear infinite; }
        @keyframes mt-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .mt-verified-row { display:flex; align-items:center; gap:5px; font-size:11px; color:#3E8E5A; margin-top:3px; }
        .mt-modal-footer { display:flex; justify-content:flex-end; gap:7px; padding:13px 18px; border-top:1px solid var(--border); position:sticky; bottom:0; background:var(--surface); flex-wrap:wrap; }
        .mt-btn { border-radius:8px; padding:7px 14px; font-size:12.5px; font-weight:600; border:1px solid var(--border); background:#fff; display:inline-flex; align-items:center; gap:5px; }
        .mt-btn-icon { padding:6px 6px; flex-shrink:0; }
        .mt-btn.primary { background:var(--teal); color:#fff; border-color:var(--teal); }
        .mt-btn.primary:disabled { opacity:.5; cursor:not-allowed; }
        .mt-btn:disabled { opacity:.4; cursor:not-allowed; }
        .mt-btn.ghost { border-color:transparent; color:var(--muted); }
        .mt-btn.ghost.active { background:var(--teal-tint); color:var(--teal-dark); border-color:var(--teal); }
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
        .mt-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:11px 13px; display:flex; flex-direction:column; gap:6px; }
        .mt-card-top { display:flex; align-items:center; justify-content:space-between; }
        .mt-card-times { font-size:13px; font-weight:700; color:var(--ink); font-variant-numeric:tabular-nums; }
        .mt-card-route { display:flex; align-items:center; gap:6px; font-size:13px; font-weight:600; flex-wrap:wrap; }
        .mt-card-arrow { color:var(--muted); font-weight:400; }
        .mt-card-bottom { display:flex; align-items:center; justify-content:space-between; margin-top:2px; }
        .mt-card-icons { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .mt-card-icons .mt-link-icon { padding:4px; }
        .mt-route-mini { display:flex; align-items:center; gap:2px; }
        .mt-route-km { font-size:11px; color:var(--muted); font-variant-numeric:tabular-nums; }
        .mt-route-km-btn { border:none; background:none; color:var(--muted); font-size:10.5px; padding:0 2px; text-decoration:underline; }
        .mt-note { font-size:11px; color:var(--muted); margin-top:4px; }

        @media (max-width: 640px) {
          .mt-header-row1 { padding:8px 10px 4px; }
          .mt-header-actions { padding:4px 10px; }
          .mt-toolbar { padding:4px 10px 8px; gap:5px; }
          .mt-content { padding:0 12px 32px; }
          .mt-frame-header { padding:12px 10px; gap:7px; }
          .mt-frame-actions button, .mt-row-actions button { min-width:32px; min-height:32px; justify-content:center; }
          .mt-group-header { padding:10px 6px; }
          .mt-group-actions { gap:14px; }
          .mt-group-add { min-height:32px; }
          .mt-card { padding:12px 14px; }
          .mt-icon-btn { padding:8px 10px; }
        }

        .mt-intro { position:fixed; inset:0; z-index:500; display:flex; align-items:center; justify-content:center; background:#F5F8F6; cursor:pointer; animation:mt-intro-fadein .4s ease; }
        .mt-intro.exiting { animation:mt-intro-fadeout .45s ease forwards; }
        @keyframes mt-intro-fadein { from { opacity:0; } to { opacity:1; } }
        @keyframes mt-intro-fadeout { to { opacity:0; visibility:hidden; } }
        .mt-intro-inner { display:flex; flex-direction:column; align-items:center; gap:18px; }
        .mt-intro-svg { width:min(80vw,360px); height:auto; overflow:visible; }
        .mt-intro-land { stroke:#D9B26B; stroke-width:2.2; stroke-linejoin:round; }
        .mt-intro-flightpath { fill:none; stroke:#256D64; stroke-width:1.4; stroke-dasharray:3 4; opacity:.4; }
        .mt-intro-plane { fill:#174C45; }
        @keyframes mt-route-draw { to { stroke-dashoffset:0; } }
        .mt-intro-pin { opacity:0; transform-box:fill-box; transform-origin:center bottom; animation:mt-pin-drop .6s cubic-bezier(.34,1.56,.64,1) forwards; filter:drop-shadow(0 2px 1.5px rgba(23,76,69,.35)); }
        .mt-intro-pin path { fill:#C1443A; }
        .mt-intro-pin-dot { fill:#fff; }
        .mt-intro-pin text { fill:#C1443A; font-size:7.5px; font-weight:700; font-family:Heebo,sans-serif; }
        @keyframes mt-pin-drop { 0% { opacity:0; transform:translateY(-110px); } 65% { opacity:1; } 100% { opacity:1; transform:translateY(0); } }
        .mt-intro-brand { display:flex; flex-direction:column; align-items:center; gap:4px; opacity:0; animation:mt-intro-fadein .8s ease forwards; animation-delay:.35s; }
        .mt-intro-logo { font-family:'Frank Ruhl Libre',serif; font-size:24px; font-weight:700; color:#174C45; letter-spacing:.02em; }
        .mt-intro-version { font-size:10.5px; color:#9AAAA5; font-variant-numeric:tabular-nums; }
        .mt-intro-tag { font-size:12.5px; color:#6B7C76; margin-top:2px; }

        @media print {
          .mt-header-row1, .mt-header-actions, .mt-toolbar, .mt-suggest, .mt-row-actions, .mt-frame-actions, .mt-group-actions,
          .mt-drag-handle, .mt-col-resizer, .mt-frame-add-row, .mt-group-add-bottom, .mt-fx-select, .mt-fx-note,
          .mt-columns-backdrop, .mt-floating-menu, .mt-floating-backdrop { display:none !important; }
          .mytrip-app { background:#fff; }
          .mt-content { padding:0; }
          .mt-frame-block { break-inside:avoid; border-color:#ccc; }
          .mt-group { break-inside:avoid; }
          table.mt-table { font-size:11px; }
          .mt-table-wrap { overflow:visible; }
        }
      `}</style>

      <div className="mt-sticky-top">
      <div className="mt-header-row1">
        <span className="mt-brand-version">v{APP_VERSION}</span>
        <div className="mt-header-brand-group">
          <span className="mt-brand-name">{T.appName}</span>
          <div className="mt-brand-mark"><Plane /></div>
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
      <div className="mt-toolbar">
        <div className="mt-toolbar-group">
          <button className="mt-icon-btn" ref={settingsBtnRef} onClick={openSettingsMenu}><Menu /> {T.settings}</button>
        </div>
        <div className="mt-toolbar-group">
          <button className="mt-icon-btn" onClick={undo} disabled={!canUndo} title={T.undo}><Undo2 /></button>
          <button className="mt-icon-btn" onClick={redo} disabled={!canRedo} title={T.redo}><Redo2 /></button>
          <button className="mt-icon-btn" ref={actionsBtnRef} onClick={openActionsMenu}><Menu /> {T.actions}</button>
          <input ref={importInputRef} type="file" accept="application/json,.json" style={{ display: "none" }}
            onChange={(e) => { importFromFile(e.target.files && e.target.files[0]); e.target.value = ""; }} />
          {importMsg && <span className="mt-hint" style={{ color: importMsg.ok ? "#3E8E5A" : "var(--danger)" }}>{importMsg.ok ? T.importSuccess : T.importError}</span>}
        </div>
      </div>
      </div>

      {settingsMenuOpen && (
        <>
          <div className="mt-floating-backdrop" onClick={() => setSettingsMenuOpen(false)} />
          <div className="mt-floating-menu mt-kebab-menu" style={{ top: settingsMenuPos.top, right: settingsMenuPos.right, minWidth: 220 }}>
            <button className="mt-share-opt" onClick={() => { setSettingsMenuOpen(false); openColumnsMenu(); }}><Settings2 size={14} /> {T.manageColumns}</button>
            <button className="mt-share-opt" onClick={() => { setSettingsMenuOpen(false); openAddTypeMenu(); }}><Plus size={14} /> {T.addType}</button>
            <div className="divider" />
            <button className="mt-share-opt" onClick={toggleIntroDisabled}>
              {introDisabled ? <CircleCheck size={14} style={{ color: "var(--teal)" }} /> : <span style={{ width: 14, height: 14, border: "1.5px solid var(--border)", borderRadius: 4, display: "inline-block" }} />}
              {T.disableIntro}
            </button>
          </div>
        </>
      )}

      {actionsMenuOpen && (
        <>
          <div className="mt-floating-backdrop" onClick={() => setActionsMenuOpen(false)} />
          <div className="mt-floating-menu mt-kebab-menu" style={{ top: actionsMenuPos.top, right: actionsMenuPos.right, minWidth: 220, maxWidth: "min(240px, 92vw)" }}>
            <button className="mt-share-opt" onClick={() => { openFrameModal(null, null); setActionsMenuOpen(false); }}><FolderPlus size={14} /> {T.newFrame}</button>
            <button className="mt-share-opt" onClick={openAiWizard}><Wand2 size={14} /> {T.newFrameWizard}</button>
            <button className="mt-share-opt" onClick={openSaveTripModal}><Save size={14} /> {T.saveTripByName}</button>
            <button className="mt-share-opt" onClick={openLoadTripModal}><FolderOpen size={14} /> {T.loadSavedTrip}</button>
            <div className="divider" />
            <button className="mt-share-opt" onClick={() => { exportToFile(); setActionsMenuOpen(false); }}><Download size={14} /> {T.exportFile}</button>
            <button className="mt-share-opt" onClick={() => { importInputRef.current && importInputRef.current.click(); setActionsMenuOpen(false); }}><Upload size={14} /> {T.importFile}</button>
            <button className="mt-share-opt" onClick={() => { exportToPDF(); setActionsMenuOpen(false); }}><Printer size={14} /> {T.exportPdf}</button>
            <button className="mt-share-opt" onClick={() => { toggleReminders(); setActionsMenuOpen(false); }}><Bell size={14} /> {T.reminders}{remindersOn ? ` (${T.on})` : ""}</button>
            <div className="divider" />
            <button className="mt-share-opt disabled" onClick={() => { showDemoNotice(T.demoNeedsAccounts); setActionsMenuOpen(false); }}><UserPlus size={14} /> {T.shareWithUser}</button>
            <button className="mt-share-opt disabled" onClick={() => { showDemoNotice(T.demoNeedsAccounts); setActionsMenuOpen(false); }}><Users size={14} /> {T.shareEditAccess}</button>
            <button className="mt-share-opt" onClick={() => { exportShareableHTML(); setActionsMenuOpen(false); }}><Share2 size={14} /> {T.shareExportHtml}</button>
            <div className="divider" />
            <button className="mt-share-opt" onClick={() => { setAiPanelOpen(true); setActionsMenuOpen(false); }}><Wand2 size={14} /> {T.aiAssistant}</button>
            <div className="divider" />
            <button className="mt-share-opt" onClick={openRouteImport}><Route size={14} /> {T.importRoute}</button>
          </div>
        </>
      )}
      {demoNotice && (
        <>
          <div className="mt-floating-backdrop" onClick={() => setDemoNotice(null)} />
          <div className="mt-floating-menu" style={{ top: "40vh", insetInlineStart: "50%", transform: "translateX(50%)", maxWidth: 300, textAlign: "center" }}>
            <p style={{ fontSize: 12.5, margin: "4px 0 10px" }}>{demoNotice}</p>
            <button className="mt-btn primary" style={{ width: "100%" }} onClick={() => setDemoNotice(null)}>{T.ok}</button>
          </div>
        </>
      )}

      {aiPanelOpen && (
        <div className="mt-modal-backdrop" onClick={() => setAiPanelOpen(false)}>
          <div className="mt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header"><span className="mt-modal-title">{T.aiAssistant}</span><button className="mt-btn ghost" onClick={() => setAiPanelOpen(false)}><X size={16} /></button></div>
            <div className="mt-modal-body">
              <div className="mt-error" style={{ background: "var(--teal-tint)", color: "var(--teal-dark)" }}><Wand2 size={14} /> {T.aiDemoNotice}</div>
              <button className="mt-btn primary" style={{ width: "100%" }} onClick={handleAiSuggest}><Sparkles size={13} /> {T.aiSuggestItinerary}</button>
              <div className="mt-ai-chat">
                {aiMessages.map((m, i) => <div key={i} className={"mt-ai-msg " + m.role}>{m.text}</div>)}
              </div>
              <div className="mt-field-inline">
                <div><input value={aiInput} placeholder={T.aiInputPlaceholder} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAiSend()} /></div>
                <button className="mt-btn primary" onClick={handleAiSend}><MessageCircle size={13} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {hotelInfoRow && <PlaceInfoModal row={hotelInfoRow} onClose={() => setHotelInfoRow(null)} T={T} />}

      {saveTripOpen && (
        <div className="mt-modal-backdrop" onClick={() => setSaveTripOpen(false)}>
          <div className="mt-modal" style={{ maxWidth: 340 }} onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header"><span className="mt-modal-title">{T.saveTripByName}</span><button className="mt-btn ghost" onClick={() => setSaveTripOpen(false)}><X size={16} /></button></div>
            <div className="mt-modal-body">
              <div className="mt-field"><label>{T.tripName}</label><input autoFocus value={saveTripName} onChange={(e) => setSaveTripName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirmSaveTrip()} /></div>
              <div className="mt-hint">{T.saveTripNote}</div>
              {saveTripMsg && <div className={saveTripMsg.ok ? "mt-hint" : "mt-error"} style={saveTripMsg.ok ? { color: "#3E8E5A" } : {}}>{saveTripMsg.ok ? T.saveTripSuccess : T.saveTripError}</div>}
            </div>
            <div className="mt-modal-footer">
              <button className="mt-btn ghost" onClick={() => setSaveTripOpen(false)}>{T.cancel}</button>
              <button className="mt-btn primary" disabled={!saveTripName.trim()} onClick={confirmSaveTrip}><Save size={13} /> {T.save}</button>
            </div>
          </div>
        </div>
      )}

      {loadTripOpen && (
        <div className="mt-modal-backdrop" onClick={() => setLoadTripOpen(false)}>
          <div className="mt-modal" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header"><span className="mt-modal-title">{T.loadSavedTrip}</span><button className="mt-btn ghost" onClick={() => setLoadTripOpen(false)}><X size={16} /></button></div>
            <div className="mt-modal-body">
              <div className="mt-hint">{T.saveTripNote}</div>
              {Object.keys(listSavedTrips()).length === 0 ? (
                <div className="mt-hint">{T.noSavedTrips}</div>
              ) : Object.entries(listSavedTrips()).sort((a, b) => (b[1].savedAt || "").localeCompare(a[1].savedAt || "")).map(([name, trip]) => (
                <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{name}</div>
                    <div className="mt-hint">{new Date(trip.savedAt).toLocaleString(lang === "he" ? "he-IL" : "en-US")}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="mt-btn primary" onClick={() => loadSavedTrip(name)}>{T.load}</button>
                    <button className="mt-btn ghost" onClick={() => { if (confirm(T.confirmDeleteTrip)) { deleteSavedTrip(name); setLoadTripOpen(false); setTimeout(() => setLoadTripOpen(true), 0); } }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {aiWizardOpen && (
        <div className="mt-modal-backdrop" onClick={() => setAiWizardOpen(false)}>
          <div className="mt-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header"><span className="mt-modal-title">{T.wizardTitle}</span><button className="mt-btn ghost" onClick={() => setAiWizardOpen(false)}><X size={16} /></button></div>
            <div className="mt-wizard-progress"><div className="mt-wizard-progress-bar" style={{ width: `${((aiWizardStep + 1) / AI_WIZARD_STEPS) * 100}%` }} /></div>
            <div className="mt-hint" style={{ padding: "6px 18px 0" }}>{T.wizardStepOf.replace("{n}", aiWizardStep + 1).replace("{total}", AI_WIZARD_STEPS)}</div>
            <div className="mt-modal-body">
              {aiWizardStep === 0 && (
                <>
                  <div className="mt-field"><label>{T.wizardTripName}</label><input value={aiWizardAnswers.tripName} onChange={(e) => setAiWizardAnswers({ ...aiWizardAnswers, tripName: e.target.value })} placeholder={T.wizardTripNameHint} /></div>
                  <div className="mt-field"><label>{T.wizardDestination}</label><input value={aiWizardAnswers.destination} onChange={(e) => setAiWizardAnswers({ ...aiWizardAnswers, destination: e.target.value })} placeholder={T.wizardDestinationHint} /></div>
                </>
              )}
              {aiWizardStep === 1 && (
                <>
                  <div className="mt-hint">{T.wizardOutboundHint}</div>
                  <div className="mt-field-row">
                    <div className="mt-field"><label>{T.wizardFlightDate} ({T.wizardOutboundShort})</label><DateField value={aiWizardAnswers.outboundDate} onChange={(e) => setAiWizardAnswers({ ...aiWizardAnswers, outboundDate: e.target.value })} /></div>
                    <div className="mt-field"><label>{T.wizardFlightTime}</label><input type="time" value={aiWizardAnswers.outboundTime} onChange={(e) => setAiWizardAnswers({ ...aiWizardAnswers, outboundTime: e.target.value })} /></div>
                  </div>
                  <div className="mt-field-row">
                    <div className="mt-field"><label>{T.wizardFlightDate} ({T.wizardReturnShort})</label><DateField value={aiWizardAnswers.returnDate} onChange={(e) => setAiWizardAnswers({ ...aiWizardAnswers, returnDate: e.target.value })} /></div>
                    <div className="mt-field"><label>{T.wizardFlightTime}</label><input type="time" value={aiWizardAnswers.returnTime} onChange={(e) => setAiWizardAnswers({ ...aiWizardAnswers, returnTime: e.target.value })} /></div>
                  </div>
                  {aiWizardError && <div className="mt-error"><AlertTriangle size={13} /> {T.wizardDateRequired}</div>}
                  <div className="mt-field">
                    <label>{T.wizardHasTickets}</label>
                    <div className="mt-wizard-choices">
                      {["yes", "no"].map((k) => (
                        <button key={k} className={"mt-wizard-choice" + (aiWizardAnswers.hasTickets === k ? " selected" : "")} onClick={() => setAiWizardAnswers({ ...aiWizardAnswers, hasTickets: k })}>{T["wizardYesNo_" + k]}</button>
                      ))}
                    </div>
                  </div>
                  {aiWizardAnswers.hasTickets === "yes" && (
                    <div className="mt-field-row">
                      <div className="mt-field"><label>{T.wizardOutboundFlightNo}</label><input value={aiWizardAnswers.outboundFlightNumber} onChange={(e) => setAiWizardAnswers({ ...aiWizardAnswers, outboundFlightNumber: e.target.value })} placeholder="LY001" /></div>
                      <div className="mt-field"><label>{T.wizardReturnFlightNo}</label><input value={aiWizardAnswers.returnFlightNumber} onChange={(e) => setAiWizardAnswers({ ...aiWizardAnswers, returnFlightNumber: e.target.value })} placeholder="LY002" /></div>
                    </div>
                  )}
                </>
              )}
              {aiWizardStep === 2 && (
                <>
                  <div className="mt-field">
                    <label>{T.wizardTravelers}</label>
                    <div className="mt-wizard-choices">
                      {["solo", "couple", "family", "group"].map((k) => (
                        <button key={k} className={"mt-wizard-choice" + (aiWizardAnswers.travelerType === k ? " selected" : "")} onClick={() => setAiWizardAnswers({ ...aiWizardAnswers, travelerType: k })}>{T["wizardTravelers_" + k]}</button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-field">
                    <label>{T.wizardBudget}</label>
                    <div className="mt-wizard-choices">
                      {["low", "mid", "high"].map((k) => (
                        <button key={k} className={"mt-wizard-choice" + (aiWizardAnswers.budget === k ? " selected" : "")} onClick={() => setAiWizardAnswers({ ...aiWizardAnswers, budget: k })}>{T["wizardBudget_" + k]}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {aiWizardStep === 3 && (
                <>
                  <div className="mt-field">
                    <label>{T.wizardInterests}</label>
                    <div className="mt-wizard-choices">
                      {["history", "food", "nature", "nightlife", "shopping", "art", "adventure"].map((k) => (
                        <button key={k} className={"mt-wizard-choice" + (aiWizardAnswers.interests.includes(k) ? " selected" : "")} onClick={() => toggleWizardInterest(k)}>{T["wizardInterest_" + k]}</button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-field">
                    <label>{T.wizardPace}</label>
                    <div className="mt-wizard-choices">
                      {["relaxed", "balanced", "packed"].map((k) => (
                        <button key={k} className={"mt-wizard-choice" + (aiWizardAnswers.pace === k ? " selected" : "")} onClick={() => setAiWizardAnswers({ ...aiWizardAnswers, pace: k })}>{T["wizardPace_" + k]}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {aiWizardStep === 4 && (
                <>
                  <div className="mt-field">
                    <label>{T.wizardAccommodation}</label>
                    <div className="mt-wizard-choices">
                      {["hotel", "apartment", "hostel", "flexible"].map((k) => (
                        <button key={k} className={"mt-wizard-choice" + (aiWizardAnswers.accommodationType === k ? " selected" : "")} onClick={() => setAiWizardAnswers({ ...aiWizardAnswers, accommodationType: k })}>{T["wizardAccommodation_" + k]}</button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-field">
                    <label>{T.wizardHasReservation}</label>
                    <div className="mt-wizard-choices">
                      {["yes", "no"].map((k) => (
                        <button key={k} className={"mt-wizard-choice" + (aiWizardAnswers.hasReservation === k ? " selected" : "")} onClick={() => setAiWizardAnswers({ ...aiWizardAnswers, hasReservation: k })}>{T["wizardYesNo_" + k]}</button>
                      ))}
                    </div>
                  </div>
                  {aiWizardAnswers.hasReservation === "yes" && (
                    <div className="mt-field"><label>{T.wizardBookingLink}</label><input value={aiWizardAnswers.bookingLink} onChange={(e) => setAiWizardAnswers({ ...aiWizardAnswers, bookingLink: e.target.value })} placeholder="https://booking.com/..." /></div>
                  )}
                </>
              )}
              {aiWizardStep === 5 && (
                <>
                  <div className="mt-field">
                    <label>{T.wizardCustomRoute}</label>
                    <div className="mt-wizard-choices">
                      {["yes", "no"].map((k) => (
                        <button key={k} className={"mt-wizard-choice" + (aiWizardAnswers.wantsCustomRoute === k ? " selected" : "")} onClick={() => setAiWizardAnswers({ ...aiWizardAnswers, wantsCustomRoute: k })}>{T["wizardYesNo_" + k]}</button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-field">
                    <label>{T.wizardNotes}</label>
                    <textarea rows={3} value={aiWizardAnswers.notes} onChange={(e) => setAiWizardAnswers({ ...aiWizardAnswers, notes: e.target.value })} placeholder={T.wizardNotesHint} />
                  </div>
                  <div className="mt-wizard-summary">
                    <div className="mt-section-label">{T.wizardWillCreate}</div>
                    <div className="mt-hint">{T.wizardWillCreateDesc}</div>
                    <div className="mt-hint" style={{ marginTop: 6 }}>{T.wizardAiNote}</div>
                  </div>
                </>
              )}
            </div>
            <div className="mt-modal-footer">
              {aiWizardStep > 0 && <button className="mt-btn ghost" onClick={aiWizardBack}>{T.wizardBack}</button>}
              <span style={{ flex: 1 }} />
              {aiWizardStep < AI_WIZARD_STEPS - 1 ? (
                <button className="mt-btn primary" onClick={aiWizardNext}>{T.wizardNext}</button>
              ) : (
                <button className="mt-btn primary" onClick={confirmAiWizard}><Wand2 size={13} /> {T.wizardCreate}</button>
              )}
            </div>
          </div>
        </div>
      )}

      {routeImportOpen && (
        <div className="mt-modal-backdrop" onClick={() => setRouteImportOpen(false)}>
          <div className="mt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header"><span className="mt-modal-title">{T.importRoute}</span><button className="mt-btn ghost" onClick={() => setRouteImportOpen(false)}><X size={16} /></button></div>
            <div className="mt-modal-body">
              <div className="mt-hint">{T.importRouteHint}</div>
              <div className="mt-field-inline">
                <div><input value={routeImportUrl} placeholder="https://www.google.com/maps/dir/..." onChange={(e) => setRouteImportUrl(e.target.value)} /></div>
                <button className="mt-btn primary" onClick={parseRouteImport}><Search size={13} /> {T.importRouteParse}</button>
              </div>
              {routeImportStops && routeImportStops.length === 0 && (
                <div className="mt-error"><AlertTriangle /> {routeImportShortLink ? T.importRouteShortLink : T.importRouteNoStops}</div>
              )}
              {routeImportStops && routeImportStops.length > 0 && (
                <>
                  <div className="mt-loc-results">
                    {routeImportStops.map((name, i) => (
                      <div key={i} className="mt-loc-result" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span>{name}</span>
                        <button className="mt-btn ghost mt-btn-icon" onClick={() => removeRouteImportStop(i)}><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-field">
                    <label>{T.frame}</label>
                    <select value={routeImportFrameId} onChange={(e) => { const fid = e.target.value; setRouteImportFrameId(fid); setRouteImportDate(nextDateInContext(fid || null)); }}>
                      <option value="">{T.noFrame}</option>
                      {frameOptionsList(null).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="mt-field-row">
                    <div className="mt-field"><label>{T.addDayDate}</label><DateField value={routeImportDate} onChange={(e) => setRouteImportDate(e.target.value)} /></div>
                    <div className="mt-field"><label>{T.start}</label><input type="time" value={routeImportStartTime} onChange={(e) => setRouteImportStartTime(e.target.value)} /></div>
                  </div>
                </>
              )}
            </div>
            <div className="mt-modal-footer">
              <button className="mt-btn ghost" onClick={() => setRouteImportOpen(false)}>{T.cancel}</button>
              <button className="mt-btn primary" disabled={!routeImportStops || !routeImportStops.length || !routeImportDate} onClick={confirmRouteImport}><Check size={13} /> {T.importRouteConfirm}</button>
            </div>
          </div>
        </div>
      )}

      {colMenuOpen && (
        <>
          <div className="mt-floating-backdrop" onClick={() => setColMenuOpen(false)} />
          <div className="mt-floating-menu mt-columns-menu" style={{ top: colMenuPos.top, right: colMenuPos.right }}>
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
          <div className="mt-floating-menu" style={{ top: addTypePos.top, right: addTypePos.right, minWidth: 200 }}>
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

        {dragDayKey && dragDayKey.slice(0, dragDayKey.indexOf("__")) !== "root" && (
          <div className="mt-root-drop-zone" data-frame-drop="root" onDragOver={(e) => e.preventDefault()} onDrop={() => onDropDay(null)}>{T.dropDayToRoot}</div>
        )}

        {renderContext(null, 0)}

        <div className="mt-note">{loggedIn ? T.mockNote : ""}</div>
      </div>

      {/* add-day modal */}
      {addDayCtx && (
        <div className="mt-modal-backdrop" onClick={closeAddDayModal}>
          <div className="mt-modal narrow" onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header"><span className="mt-modal-title" style={{ fontFamily: "inherit" }}>{T.addDayModalTitle}</span><button className="mt-btn ghost" onClick={closeAddDayModal}><X size={16} /></button></div>
            <div className="mt-modal-body">
              <div className="mt-field"><label>{T.addDayDate}</label><DateField value={addDayCtx.date} onChange={(e) => setAddDayCtx({ ...addDayCtx, date: e.target.value })} /></div>
              {addDayIssue && <div className="mt-error"><AlertTriangle /> {addDayIssue}</div>}
              <div className="mt-field">
                <label>{T.addDayAutoRecords}</label>
                <div className="mt-wizard-choices">
                  <button type="button" className={"mt-wizard-choice" + (addDayCtx.addHotel ? " selected" : "")} onClick={() => setAddDayCtx({ ...addDayCtx, addHotel: !addDayCtx.addHotel })}><BedDouble size={13} /> {T.addDayHotel}</button>
                  <button type="button" className={"mt-wizard-choice" + (addDayCtx.addTransport ? " selected" : "")} onClick={() => setAddDayCtx({ ...addDayCtx, addTransport: !addDayCtx.addTransport })}><Car size={13} /> {T.addDayTransport}</button>
                  <button type="button" className={"mt-wizard-choice" + (addDayCtx.addPoi ? " selected" : "")} onClick={() => setAddDayCtx({ ...addDayCtx, addPoi: !addDayCtx.addPoi })}><MapPin size={13} /> {T.addDayPoi}</button>
                </div>
              </div>
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
                {!locPicker.loading && locPicker.error === "no-google-key" && (
                  <div className="mt-error"><AlertTriangle /> <span>{T.noGoogleKeyConfigured}</span></div>
                )}
                {!locPicker.loading && locPicker.error && locPicker.error !== "no-google-key" && (
                  <div className="mt-error">
                    <AlertTriangle />
                    <span>
                      {T.locError} <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locPicker.query)}`} target="_blank" rel="noreferrer">{T.openInGoogleSearch}</a>
                      <br /><span style={{ fontSize: 10.5, opacity: .8 }}>{T.technicalDetail}: {String(locPicker.error)}</span>
                    </span>
                  </div>
                )}
                {!locPicker.loading && !locPicker.error && locPicker.results.length === 0 && <div className="mt-hint">{T.locNoResults}</div>}
                <div className="mt-loc-results">
                  {locPicker.results.map((r, i) => (
                    <button key={i} className="mt-loc-result" onClick={() => pickGooglePlaceResult(r)}>{r.text}</button>
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
                  <label>{T.type}</label>
                  <select value={cardDraft.typeId} onChange={(e) => {
                    const newType = e.target.value;
                    if (noOriginNeeded(newType)) setCardDraft({ ...cardDraft, typeId: newType, from: "", fromAlias: "", fromLat: null, fromLon: null, fromVerifiedUrl: "", fromVerifiedText: "", fromPlaceId: null });
                    else setCardDraft({ ...cardDraft, typeId: newType });
                  }}>
                    <option value="unset">{T.selectType}</option>
                    {groupTypesByCategory(types).map((grp) => (
                      <optgroup key={grp.category} label={CATEGORY_LABELS[lang][grp.category] || grp.category}>
                        {grp.items.map((t) => <option key={t.id} value={t.id}>{typeDisplayName(t, lang)}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="mt-field"><label>תאריך</label><DateField value={cardDraft.date} onChange={(e) => setCardDraft({ ...cardDraft, date: e.target.value })} /></div>
              </div>

              <div className="mt-field-row">
                <div className="mt-field"><label>{T.start}</label><input type="time" value={cardDraft.startTime} onChange={(e) => setCardDraft({ ...cardDraft, startTime: e.target.value })} /></div>
                <div className="mt-field"><label>{T.end}</label><input type="time" className={cardDraft.endTimeAuto ? "mt-computed-field" : ""} title={cardDraft.endTimeAuto ? T.computedEndTimeHint : undefined} value={cardDraft.endTime} onChange={(e) => setCardDraft({ ...cardDraft, endTime: e.target.value, endTimeAuto: false })} /></div>
              </div>
              <label className="mt-checkbox-row"><input type="checkbox" checked={!!cardDraft.overnight} onChange={(e) => setCardDraft({ ...cardDraft, overnight: e.target.checked })} />{T.overnight}</label>
              {cardHasTimeError && <div className="mt-error"><AlertTriangle /> {T.timeError}</div>}
              {showTzHint && <div className="mt-hint">{T.tzNote}</div>}

              {effectiveMobile ? (
                <div className="mt-loc-mobile">
                  <div className="mt-loc-mobile-row">
                    <span className="mt-loc-row-label">{T.from}</span>
                    <input className="mt-loc-grid-input" dir="auto" disabled={noOriginNeeded(cardDraft.typeId)} title={noOriginNeeded(cardDraft.typeId) ? T.noOriginHint : undefined} value={cardDraft.from} placeholder={getTypeHint(cardDraft.typeId, "from", lang)} onChange={(e) => setCardDraft({ ...cardDraft, from: e.target.value })} />
                    <span className="mt-loc-icons">
                      <button className="mt-btn ghost mt-btn-icon" title={T.copyPrevDest} disabled={noOriginNeeded(cardDraft.typeId) || !prevRowForCard || !prevRowForCard.to} onClick={copyPrevDestinationToFrom}><Copy size={13} /></button>
                      <button className="mt-btn ghost mt-btn-icon" disabled={noOriginNeeded(cardDraft.typeId)} title={T.verify} onClick={() => openLocationPicker("from")}><MapPin size={13} /></button>
                    </span>
                    {fromVerifiedCard && <PopoverInfoIcon icon={CircleCheck} color="#3E8E5A"><div>{T.verified}</div><a href={cardDraft.fromVerifiedUrl} target="_blank" rel="noreferrer">{T.openMap}</a></PopoverInfoIcon>}
                  </div>
                  <div className="mt-loc-mobile-alias-row">
                    <input dir="auto" disabled={noOriginNeeded(cardDraft.typeId)} value={cardDraft.fromAlias || ""} placeholder={getTypeHint(cardDraft.typeId, "fromAlias", lang)} onChange={(e) => setCardDraft({ ...cardDraft, fromAlias: e.target.value })} />
                    <PopoverInfoIcon icon={Info} trigger="hover">{T.aliasHint}</PopoverInfoIcon>
                  </div>

                  <div className="mt-loc-mobile-row">
                    <span className="mt-loc-row-label">{T.to}</span>
                    <input className="mt-loc-grid-input" dir="auto" value={cardDraft.to} placeholder={getTypeHint(cardDraft.typeId, "to", lang)} onChange={(e) => setCardDraft({ ...cardDraft, to: e.target.value })} />
                    <span className="mt-loc-icons">
                      <button className="mt-btn ghost mt-btn-icon" title={T.copyFromOrigin} disabled={!cardDraft.from} onClick={() => setCardDraft({ ...cardDraft, to: cardDraft.from })}><Copy size={13} /></button>
                      <button className="mt-btn ghost mt-btn-icon" title={T.verify} onClick={() => openLocationPicker("to")}><MapPin size={13} /></button>
                    </span>
                    {toVerifiedCard && <PopoverInfoIcon icon={CircleCheck} color="#3E8E5A"><div>{T.verified}</div><a href={cardDraft.toVerifiedUrl} target="_blank" rel="noreferrer">{T.openMap}</a></PopoverInfoIcon>}
                  </div>
                  <div className="mt-loc-mobile-alias-row">
                    <input dir="auto" value={cardDraft.toAlias || ""} placeholder={getTypeHint(cardDraft.typeId, "toAlias", lang)} onChange={(e) => setCardDraft({ ...cardDraft, toAlias: e.target.value })} />
                    <PopoverInfoIcon icon={Info} trigger="hover">{T.aliasHint}</PopoverInfoIcon>
                  </div>
                </div>
              ) : (
              <div className="mt-loc-grid">
                <span />
                <span className="mt-loc-col-header" style={{ gridColumn: "2 / span 2" }}>{T.locationColHeader}</span>
                <span className="mt-loc-col-header" style={{ gridColumn: "4 / span 2" }}>{T.aliasColHeader}</span>

                <span className="mt-loc-row-label">{T.from}</span>
                <span className="mt-loc-icons">
                  <button className="mt-btn ghost mt-btn-icon" title={T.copyPrevDest} disabled={noOriginNeeded(cardDraft.typeId) || !prevRowForCard || !prevRowForCard.to} onClick={copyPrevDestinationToFrom}><Copy size={13} /></button>
                  <button className="mt-btn ghost mt-btn-icon" disabled={noOriginNeeded(cardDraft.typeId)} title={T.verify} onClick={() => openLocationPicker("from")}><MapPin size={13} /></button>
                </span>
                <input className="mt-loc-grid-input" dir="auto" disabled={noOriginNeeded(cardDraft.typeId)} title={noOriginNeeded(cardDraft.typeId) ? T.noOriginHint : undefined} value={cardDraft.from} placeholder={getTypeHint(cardDraft.typeId, "from", lang)} onChange={(e) => setCardDraft({ ...cardDraft, from: e.target.value })} />
                <span className="mt-loc-verified-slot">{fromVerifiedCard && <PopoverInfoIcon icon={CircleCheck} color="#3E8E5A"><div>{T.verified}</div><a href={cardDraft.fromVerifiedUrl} target="_blank" rel="noreferrer">{T.openMap}</a></PopoverInfoIcon>}</span>
                <span className="mt-loc-alias-cell">
                  <input dir="auto" disabled={noOriginNeeded(cardDraft.typeId)} value={cardDraft.fromAlias || ""} placeholder={getTypeHint(cardDraft.typeId, "fromAlias", lang)} onChange={(e) => setCardDraft({ ...cardDraft, fromAlias: e.target.value })} />
                  <PopoverInfoIcon icon={Info} trigger="hover">{T.aliasHint}</PopoverInfoIcon>
                </span>

                <span className="mt-loc-row-label">{T.to}</span>
                <span className="mt-loc-icons">
                  <button className="mt-btn ghost mt-btn-icon" title={T.copyFromOrigin} disabled={!cardDraft.from} onClick={() => setCardDraft({ ...cardDraft, to: cardDraft.from })}><Copy size={13} /></button>
                  <button className="mt-btn ghost mt-btn-icon" title={T.verify} onClick={() => openLocationPicker("to")}><MapPin size={13} /></button>
                </span>
                <input className="mt-loc-grid-input" dir="auto" value={cardDraft.to} placeholder={getTypeHint(cardDraft.typeId, "to", lang)} onChange={(e) => setCardDraft({ ...cardDraft, to: e.target.value })} />
                <span className="mt-loc-verified-slot">{toVerifiedCard && <PopoverInfoIcon icon={CircleCheck} color="#3E8E5A"><div>{T.verified}</div><a href={cardDraft.toVerifiedUrl} target="_blank" rel="noreferrer">{T.openMap}</a></PopoverInfoIcon>}</span>
                <span className="mt-loc-alias-cell">
                  <input dir="auto" value={cardDraft.toAlias || ""} placeholder={getTypeHint(cardDraft.typeId, "toAlias", lang)} onChange={(e) => setCardDraft({ ...cardDraft, toAlias: e.target.value })} />
                  <PopoverInfoIcon icon={Info} trigger="hover">{T.aliasHint}</PopoverInfoIcon>
                </span>
              </div>
              )}

              <div className="mt-weather-row">
                <span className="mt-link-icon mt-weather-icon-btn" title={T.weatherAtArrival}>
                  {(() => {
                    if (weatherData && weatherData.loading) return <Cloud size={17} className="mt-weather-spin" />;
                    if (weatherData && weatherData.data) { const meta = weatherMeta(weatherData.data.code); const WI = WEATHER_ICONS[meta.icon] || Cloud; return <WI size={17} />; }
                    return <Cloud size={17} style={{ opacity: 0.35 }} />;
                  })()}
                </span>
                <span className="mt-hint">{T.weatherAtArrival}</span>
                {weatherData && weatherData.loading && <span className="mt-hint">{T.weatherLoading}</span>}
                {weatherData && weatherData.error && <span className="mt-hint">{T.weatherUnavailable} ({T.technicalDetail}: {String(weatherData.error)})</span>}
                {weatherData && weatherData.data && (
                  <span className="mt-weather-detail">{weatherMeta(weatherData.data.code)[lang]} · {Math.round(weatherData.data.min)}°–{Math.round(weatherData.data.max)}°C</span>
                )}
              </div>

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
              <div className="mt-field-row">
                <div className="mt-field"><label>{T.cost}</label><input type="number" value={cardDraft.costAmount} onChange={(e) => setCardDraft({ ...cardDraft, costAmount: e.target.value })} /></div>
                <div className="mt-field"><label>{T.currency}</label>
                  <select value={cardDraft.costCurrency} onChange={(e) => setCardDraft({ ...cardDraft, costCurrency: e.target.value })}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-field"><label>{T.notes} <PopoverInfoIcon icon={Info}>{T.notesHint}</PopoverInfoIcon></label><input value={cardDraft.notes || ""} placeholder={getTypeHint(cardDraft.typeId, "notes", lang)} onChange={(e) => setCardDraft({ ...cardDraft, notes: e.target.value })} /></div>
              <div className="mt-field">
                <label>{T.personalExperience}</label>
                <textarea rows={3} value={cardDraft.personalExperience || ""} onChange={(e) => setCardDraft({ ...cardDraft, personalExperience: e.target.value })} placeholder={T.personalExperienceHint} />
              </div>
              <div className="mt-field">
                <label>{T.personalRating}</label>
                <div className="mt-star-picker">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setCardDraft({ ...cardDraft, personalRating: cardDraft.personalRating === n ? 0 : n })}>
                      <Star size={19} fill={n <= (cardDraft.personalRating || 0) ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
              </div>
              <button className="mt-file-demo" onClick={() => showDemoNotice(T.demoNeedsStorage)}>
                <FileUp size={16} /> <span>{T.uploadFile}</span>
              </button>
              <button className="mt-file-demo" onClick={() => showDemoNotice(T.demoNeedsStorage)}>
                <ImagePlus size={16} /> <span>{T.uploadPhotos}</span>
              </button>
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
              <div className="mt-field">
                <label>{T.frameDateRange}</label>
                <DateRangeField startDate={frameDraft.startDate} endDate={frameDraft.endDate} lang={lang} T={T}
                  onChange={(s, e) => setFrameDraft({ ...frameDraft, startDate: s, endDate: e })} />
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
    </>
  );
}
