import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useFloating, autoUpdate, offset, flip, shift, useClick, useDismiss, useInteractions } from "@floating-ui/react";
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
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
  CloudSun, CloudRain, CloudSnow, CloudLightning, CloudFog, Cloud, Bell, BellRing, FileUp, Share2, UserPlus, MessageCircle, Printer, Wand2, MoreVertical, Menu, Calendar as CalendarIcon, Undo2, Redo2, Info, ExternalLink, Phone, Save, FolderOpen, ImagePlus, BookOpen, RefreshCw, Workflow, ArrowLeft, ArrowRight, CheckSquare, Paperclip, Briefcase, Compass, FolderTree, LayoutGrid, HelpCircle, Wine, Beer, PartyPopper, Mic2, FileText, FileSpreadsheet, FileArchive, Presentation
} from "lucide-react";
import { supabase, supabaseEnabled } from "./supabaseClient";

/* ---------------------------------------------------------------------- */
/*  MyTrip — trip-planning table prototype                                 */
/*  v4: chronology warnings, repositioned menus, location verification     */
/*  (OpenStreetMap Nominatim — free, no key), fixed-width indent column.   */
/* ---------------------------------------------------------------------- */

const APP_VERSION = "22.45.0";

// Leaflet's default marker icon breaks under bundlers (Vite/Webpack) because it
// references relative image paths. Point it at the CDN copies instead.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
const DEFAULT_MAP_CENTER = [41.9, 12.49]; // Rome — reasonable default for this itinerary
const ICONS = { Plane, PlaneTakeoff, Car, BedDouble, Footprints, Users, Sun, Ship, KeySquare, Tag, Star, Flag, Camera, Utensils, ShoppingBag, Music, TrainFront, Bus, Motorbike, Bike, Scooter, Sailboat, ShipWheel, Anchor, Kayak, Helicopter, Caravan, Building2, Landmark, Home, MapPin, Compass, FolderTree, Wand2, CheckSquare, LayoutGrid, Share2 };
const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const EN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FRAME_COLORS = ["#256D64", "#3E7CB1", "#8B6F47", "#7A5C9E", "#C1443A", "#5B8C5A"];
const CURRENCIES = ["₪", "$", "€", "£"];
const CURRENCY_CODE_MAP = { "₪": "ILS", "$": "USD", "€": "EUR", "£": "GBP" };
const FALLBACK_RATES = { ILS: 1, USD: 0.27, EUR: 0.25, GBP: 0.21 };

const HELP_TOPICS = {
  general: {
    icon: "Compass",
    title_he: "התחלה מהירה", title_en: "Getting Started",
    short_he: "בנה את הטיול שלך ממסגרות (הטיול, מלונות, טיסות) ורשומות בתוכן (כל פעילות/נסיעה/לינה). לחץ '+ יום' כדי להתחיל.",
    short_en: "Build your trip from frames (trip, hotels, flights) and records inside them (each activity/ride/stay). Click '+ Day' to start.",
    full_he: "MyTrip Builder בנוי משתי שכבות: מסגרות (Frames) שמייצגות את הטיול עצמו, מלונות בודדים או קטעי טיסה — ורשומות (Records) בתוכן, שהן הפעילויות/נסיעות/לינות בכל יום. אפשר להתחיל מ'אשף הטיול' בתפריט הפעולות שיוצר עבורך שלד מלא אוטומטית, או לבנות ידנית: צור מסגרת, הוסף יום, והוסף רשומות בתוכו. כל רשומה כוללת סוג (טיסה/מלון/אטרקציה וכו'), מוצא ויעד, שעות, עלות והערות.",
    full_en: "MyTrip Builder has two layers: Frames representing the trip itself, individual hotels, or flight legs — and Records inside them, the activities/rides/stays for each day. You can start from the 'Trip Wizard' in the actions menu which auto-generates a full skeleton, or build manually: create a frame, add a day, and add records inside it. Each record includes a type (flight/hotel/attraction etc.), origin and destination, times, cost, and notes.",
  },
  frames: {
    icon: "FolderTree",
    title_he: "מסגרות", title_en: "Frames",
    short_he: "מסגרת היא קונטיינר לטיול, למלון או לטיסה. אפשר לקנן מסגרות זו בתוך זו, ולהגדיר סוג (בסיסית/טיול/טיסה/מלון) לעיצוב מותאם.",
    short_en: "A frame is a container for a trip, hotel, or flight. Frames can be nested, and given a type (basic/trip/flight/hotel) for tailored styling.",
    full_he: "מסגרות מאורגנות בהיררכיה: מסגרת ראשית (הטיול כולו) יכולה להכיל תת-מסגרות (מלון בודד, קטע טיסה). למסגרות מסוג 'טיול'/'טיסה'/'מלון' יש עיצוב כותרת מיוחד עם סמל, תגי תאריך וסך ימים. אפשר ליצור מסגרת חדשה מתפריט הפעולות, לגרור ולשחרר ימים בין מסגרות, ולמחוק מסגרת עם שתי אפשרויות: מחיקת המסגרת בלבד (התוכן עובר להורה) או מחיקה מלאה של המסגרת ותוכנה.",
    full_en: "Frames are organized hierarchically: a main frame (the whole trip) can contain sub-frames (a single hotel, a flight leg). Frames of type 'trip'/'flight'/'hotel' get special header styling with an icon, date badges, and total days. Create a new frame from the actions menu, drag-and-drop days between frames, and delete a frame with two options: delete the frame only (content moves to parent) or fully delete the frame and its content.",
  },
  wizard: {
    icon: "Wand2",
    title_he: "אשף הטיול", title_en: "Trip Wizard",
    short_he: "מבצע שאלות מונחות ובונה עבורך את שלד הטיול: פרטי בסיס, טיסות בינ״ל, טיסות פנים ומלונות — הכל בכמה לחיצות.",
    short_en: "Asks guided questions and builds your trip skeleton for you: basics, international flights, domestic flights, and hotels — all in a few clicks.",
    full_he: "האשף נפתח מתפריט פעולות ← אשף הטיול. במסך הראשון תבחר האם יש לך כבר תוכנית טיול קונקרטית (שם/מטיילים/יעד/תאריכים) או שתרצה עזרה בתכנון (תקציב/תחומי עניין/קצב/הערות). לאחר מכן שלושה שלבים ממוספרים: טיסות בינלאומיות, טיסות פנים (עם אפשרות הלוך-חזור), ומלונות. ניתן להוסיף כמה טיסות/מלונות שרוצים, ולערוך את פרטי הטיול שוב מאוחר יותר דרך אותו כפתור 'ערוך פרטי טיול'.",
    full_en: "Open the wizard from Actions ← Trip Wizard. On the first screen, choose whether you already have a concrete plan (name/travelers/destination/dates) or want planning help (budget/interests/pace/notes). Then three numbered steps follow: international flights, domestic flights (with a round-trip option), and hotels. Add as many flights/hotels as you like, and edit trip details again later via the same 'Edit Trip Details' button.",
  },
  checklist: {
    icon: "CheckSquare",
    title_he: "צ'ק ליסט קדם טיסה", title_en: "Pre-Flight Checklist",
    short_he: "רשימת מטלות לפני הטיסה: הזמנות, מסמכים, צ'ק-אין ועוד. ציוד לטיסה ורשימת קניות נמצאים בדפים נפרדים.",
    short_en: "Pre-flight task list: reservations, documents, check-in and more. Flight packing and shopping list are on separate pages.",
    full_he: "נגיש מתפריט פעולות ← כלים ← צ'ק ליסט קדם טיסה. פס ההתקדמות בראש הדף מציג אחוז השלמה (רשימת הקניות אינה נכללת בחישוב, וארגון הציוד לטיסה מוגבל ל-30% מסך ההתקדמות). ניתן לסמן כל פריט כהושלם, לצרף מסמך (חוץ מרשימת הציוד), ולהוסיף פריטים חדשים בכל קטגוריה. ארגון ציוד ורשימת קניות הם דפים נפרדים עם ניווט מהדף הראשי.",
    full_en: "Access via Actions ← Tools ← Pre-Flight Checklist. The progress bar at the top shows completion percent (the shopping list is excluded, and flight packing is capped at 30% of total progress). Mark any item complete, attach a document (except for packing items), and add new items in any category. Packing and shopping are separate pages, navigated to from the main page.",
  },
  views: {
    icon: "LayoutGrid",
    title_he: "תצוגות", title_en: "Views",
    short_he: "בחר בין תצוגת מחשב (טבלה), סלולר (כרטיסים) או זרימה (סמלים מופשטים) דרך תפריט ההגדרות.",
    short_en: "Choose between desktop (table), mobile (cards), or flow (abstract icons) view from the settings menu.",
    full_he: "תפריט ההגדרות מכיל קטגוריית 'תצוגות' עם שלוש אפשרויות: מחשב — טבלה מלאה עם כל העמודות; סלולר — כרטיסים מלאים לכל רשומה, מותאמים למסכים צרים; זרימה — הצגה מופשטת של רשימת הרשומות כסמלי סוג מחוברים בחיצים, לסקירה מהירה של מבנה היום.",
    full_en: "The settings menu has a 'Views' category with three options: Desktop — full table with all columns; Mobile — full cards for each record, suited to narrow screens; Flow — an abstract display of records as connected type-icons with arrows, for a quick overview of the day's structure.",
  },
  types: {
    icon: "Tag",
    title_he: "סוגי רשומה", title_en: "Record Types",
    short_he: "לכל רשומה יש סוג (טיסה, מלון, אטרקציה וכו') עם סמל וצבע. אפשר להוסיף סוג מותאם אישית דרך תפריט ההגדרות.",
    short_en: "Each record has a type (flight, hotel, attraction, etc.) with an icon and color. Add a custom type via the settings menu.",
    full_he: "סוג הרשומה קובע את הסמל, הצבע והשדות הרלוונטיים (למשל, מלון/אטרקציה לא דורשים 'מוצא'). ניתן לשנות סוג בלחיצה על סמל הרשומה ובחירה מרשימה, או להוסיף סוג חדש משלך דרך הגדרות ← הוסף סוג, עם בחירת סמל וצבע.",
    full_en: "The record type determines its icon, color, and relevant fields (e.g. hotel/attraction don't require an 'origin'). Change a type by clicking the record's icon and choosing from the list, or add your own new type via Settings ← Add Type, choosing an icon and color.",
  },
  places: {
    icon: "MapPin",
    title_he: "אימות מיקום עם גוגל", title_en: "Google Place Verification",
    short_he: "הקלד שם מקום ובחר מהצעות גוגל כדי לאמת אותו — כך תקבל תמונות, דירוג ומרחקים מדויקים.",
    short_en: "Type a place name and pick from Google's suggestions to verify it — you'll get photos, ratings, and accurate distances.",
    full_he: "בכל שדה מוצא/יעד ברשומה, הקלדה מפעילה חיפוש מקומות של גוגל. בחירה מהרשימה 'מאמתת' את המקום ומאפשרת: תצוגה מקדימה בריחוף/לחיצה על הסמל, חישוב מסלול ומרחק אוטומטי, ותצוגת פרטים מלאה של גוגל (דירוגים, תמונות, שעות פתיחה). מקום שלא אומת עדיין יוצג כטקסט חופשי בלבד, בלי הפרטים הנוספים.",
    full_en: "In any origin/destination field on a record, typing triggers a Google Places search. Picking from the list 'verifies' the place and unlocks: hover/click preview on the icon, automatic route and distance calculation, and a full Google details view (ratings, photos, opening hours). An unverified place is shown as plain text only, without the extra details.",
  },
  sharing: {
    icon: "Share2",
    title_he: "שמירה, ייבוא וייצוא ושיתוף", title_en: "Save, Import/Export & Sharing",
    short_he: "שמור/טען טיולים בשם, ייצא/ייבא קובץ גיבוי, ייצא PDF, או שתף כקובץ HTML עצמאי.",
    short_en: "Save/load named trips, export/import a backup file, export to PDF, or share as a standalone HTML file.",
    full_he: "תפריט פעולות ← שמירה, ייבוא וייצוא מרכז את כל האפשרויות: שמירת הטיול הנוכחי בשם לשימוש חוזר, טעינת טיול שמור, ייצוא/ייבוא קובץ JSON (גיבוי מלא), ייצוא PDF להדפסה, וייבוא מסלול מקובץ חיצוני. תפריט השיתוף מאפשר גם ייצוא כדף HTML עצמאי שאפשר לשלוח לכל אחד, גם בלי גישה לאפליקציה.",
    full_en: "Actions ← Save, Import & Export centralizes everything: save the current trip under a name for reuse, load a saved trip, export/import a JSON file (full backup), export to PDF for printing, and import a route from an external file. The sharing menu also lets you export a standalone HTML page you can send to anyone, even without app access.",
  },
};
const CATEGORY_COLORS = {
  "public-transport": "#3E7CB1", "road-transport": "#8B6F47", "sea-transport": "#2F7A8C",
  "air-transport": "#256D64", accommodation: "#D98E3F", activities: "#5B8C5A", other: "#7A5C9E",
  culinary: "#C1543A", entertainment: "#A6457A",
};
const BUILT_IN_TRIP_TEMPLATES = {
  "תבנית טיול 1": {"rows": [{"id": "i2htk8o9", "parentId": null, "frameId": "xaqmszjc", "date": "2026-08-02", "typeId": "poi", "arrivalTypeId": "walking", "from": "", "to": "Ming Muang market, Moonmuang Road Soi 6, แขวงนครพิงค์, Chiang Mai City Municipality, Fa Ham, Mueang Chiang Mai District, צ'יאנג מאי, 55520, תאילנד", "startTime": "02:52", "endTime": "02:52", "overnight": false, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Ming Muang market", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Ming%20Muang%20market%2C%20Moonmuang%20Road%20Soi%206%2C%20%E0%B9%81%E0%B8%82%E0%B8%A7%E0%B8%87%E0%B8%99%E0%B8%84%E0%B8%A3%E0%B8%9E%E0%B8%B4%E0%B8%87%E0%B8%84%E0%B9%8C%2C%20Chiang%20Mai%20City%20Municipality%2C%20Fa%20Ham%2C%20Mueang%20Chiang%20Mai%20District%2C%20%D7%A6%27%D7%99%D7%90%D7%A0%D7%92%20%D7%9E%D7%90%D7%99%2C%2055520%2C%20%D7%AA%D7%90%D7%99%D7%9C%D7%A0%D7%93", "toVerifiedText": "Ming Muang market, Moonmuang Road Soi 6, แขวงนครพิงค์, Chiang Mai City Municipality, Fa Ham, Mueang Chiang Mai District, צ'יאנג מאי, 55520, תאילנד", "fromLat": null, "fromLon": null, "toLat": 18.7916004, "toLon": 98.9929727, "routeDistanceKm": 1.59, "routeDurationMin": 21.7, "custom": {}, "fromPlaceId": null, "startTimeAuto": true, "toPlaceId": null, "endTimeAuto": true, "weatherCode": 96, "weatherMin": 24, "weatherMax": 29.8, "weatherForDate": "2026-08-02", "startTimeSource": "inherited", "endTimeSource": "computed"}, {"id": "790wazgq", "parentId": null, "frameId": "xaqmszjc", "date": "2026-08-02", "typeId": "attraction", "arrivalTypeId": "walking", "from": "", "to": "Chiang Mai Gate, Bumrung Buri Road, แขวงศรีวิชัย, Chiang Mai City Municipality, Pa Daet, Mueang Chiang Mai District, צ'יאנג מאי, 55520, תאילנד", "startTime": "03:11", "startTimeAuto": true, "endTime": "03:11", "overnight": false, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Chiang Mai Gate", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Chiang%20Mai%20Gate%2C%20Bumrung%20Buri%20Road%2C%20%E0%B9%81%E0%B8%82%E0%B8%A7%E0%B8%87%E0%B8%A8%E0%B8%A3%E0%B8%B5%E0%B8%A7%E0%B8%B4%E0%B8%8A%E0%B8%B1%E0%B8%A2%2C%20Chiang%20Mai%20City%20Municipality%2C%20Pa%20Daet%2C%20Mueang%20Chiang%20Mai%20District%2C%20%D7%A6%27%D7%99%D7%90%D7%A0%D7%92%20%D7%9E%D7%90%D7%99%2C%2055520%2C%20%D7%AA%D7%90%D7%99%D7%9C%D7%A0%D7%93", "toVerifiedText": "Chiang Mai Gate, Bumrung Buri Road, แขวงศรีวิชัย, Chiang Mai City Municipality, Pa Daet, Mueang Chiang Mai District, צ'יאנג מאי, 55520, תאילנד", "fromLat": null, "fromLon": null, "toLat": 18.7813553, "toLon": 98.9889812, "routeDistanceKm": 1.419, "routeDurationMin": 19.433333333333334, "custom": {}, "fromPlaceId": null, "toPlaceId": null, "weatherCode": 95, "weatherMin": 23.3, "weatherMax": 28.3, "weatherForDate": "2026-08-02", "endTimeAuto": true, "startTimeSource": "inherited", "endTimeSource": "computed"}, {"id": "c52i8diw", "parentId": null, "frameId": "xaqmszjc", "date": "2026-08-02", "typeId": "poi", "arrivalTypeId": "walking", "from": "", "to": "Wat Sri Suphan, Watthanatham Wat Si Suphan Road, Chiang Mai City Municipality, Pa Daet, Mueang Chiang Mai District, צ'יאנג מאי, 50100, תאילנד", "startTime": "03:21", "startTimeAuto": true, "endTime": "03:21", "overnight": false, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Wat Sri Suphan", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Wat%20Sri%20Suphan%2C%20Watthanatham%20Wat%20Si%20Suphan%20Road%2C%20Chiang%20Mai%20City%20Municipality%2C%20Pa%20Daet%2C%20Mueang%20Chiang%20Mai%20District%2C%20%D7%A6%27%D7%99%D7%90%D7%A0%D7%92%20%D7%9E%D7%90%D7%99%2C%2050100%2C%20%D7%AA%D7%90%D7%99%D7%9C%D7%A0%D7%93", "toVerifiedText": "Wat Sri Suphan, Watthanatham Wat Si Suphan Road, Chiang Mai City Municipality, Pa Daet, Mueang Chiang Mai District, צ'יאנג מאי, 50100, תאילנד", "fromLat": null, "fromLon": null, "toLat": 18.7785379, "toLon": 98.9833197, "routeDistanceKm": 0.71, "routeDurationMin": 9.783333333333333, "custom": {}, "fromPlaceId": null, "toPlaceId": null, "weatherCode": 96, "weatherMin": 23.4, "weatherMax": 28.9, "weatherForDate": "2026-08-02", "endTimeAuto": true, "startTimeSource": "inherited", "endTimeSource": "computed"}, {"id": "lzro1lxl", "parentId": null, "frameId": "xaqmszjc", "date": "2026-08-03", "typeId": "unset", "arrivalTypeId": "walking", "from": "", "to": "", "startTime": "", "startTimeAuto": true, "endTime": "", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": null, "toLon": null, "routeDistanceKm": null, "routeDurationMin": null, "custom": {}}, {"id": "olcwn4v2", "parentId": null, "frameId": "xaqmszjc", "date": "2026-08-04", "typeId": "unset", "arrivalTypeId": "walking", "from": "", "to": "", "startTime": "", "startTimeAuto": true, "endTime": "", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": null, "toLon": null, "routeDistanceKm": null, "routeDurationMin": null, "custom": {}}, {"id": "66v5emkf", "parentId": null, "frameId": "y8w461yy", "date": "2026-08-01", "typeId": "flight", "arrivalTypeId": "walking", "from": "TLV", "to": "BKK", "startTime": "23:00", "startTimeAuto": false, "endTime": "14:40", "overnight": true, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "ly81", "costAmount": "2000", "costCurrency": "₪", "fromAlias": "תל אביב", "toAlias": "בנגקוק", "notes": "active · טרמינל 3", "fromVerifiedText": "TLV", "toVerifiedText": "BKK", "fromLat": 32.0027142, "fromLon": 34.8809193, "toLat": 13.7524938, "toLon": 100.4935089, "routeDistanceKm": 9365.3076, "routeDurationMin": 7069.401666666667, "custom": {}, "endTimeSource": "api", "weatherCode": 95, "weatherMin": 25.3, "weatherMax": 31.3, "weatherForDate": "2026-08-01", "flightLookedUpFor": "ly81", "startTimeSource": "api", "endTimeAuto": false, "fromVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=TLV", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=BKK"}, {"id": "udfwapvd", "parentId": null, "frameId": "y8w461yy", "date": "2026-08-31", "typeId": "flight", "arrivalTypeId": "walking", "from": "בנגקוק, תאילנד", "to": "נמל התעופה בן-גוריון, 40, מועצה אזורית חבל מודיעין, נפת רמלה, מחוז המרכז, 7015001, ישראל", "startTime": "11:00", "startTimeAuto": true, "endTime": "13:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "LY82", "costAmount": "1996", "costCurrency": "₪", "fromAlias": "בנגקוק", "toAlias": "תל אביב", "notes": "", "fromVerifiedText": "בנגקוק, תאילנד", "toVerifiedText": "נמל התעופה בן-גוריון, 40, מועצה אזורית חבל מודיעין, נפת רמלה, מחוז המרכז, 7015001, ישראל", "routeDistanceKm": null, "routeDurationMin": null, "custom": {}, "startTimeSource": "inherited", "endTimeSource": "computed", "fromLat": 13.7524938, "fromLon": 100.4935089, "fromVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=%D7%91%D7%A0%D7%92%D7%A7%D7%95%D7%A7%2C%20%D7%AA%D7%90%D7%99%D7%9C%D7%A0%D7%93", "toLat": 32.0027142, "toLon": 34.8809193, "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=%D7%A0%D7%9E%D7%9C%20%D7%94%D7%AA%D7%A2%D7%95%D7%A4%D7%94%20%D7%91%D7%9F-%D7%92%D7%95%D7%A8%D7%99%D7%95%D7%9F%2C%2040%2C%20%D7%9E%D7%95%D7%A2%D7%A6%D7%94%20%D7%90%D7%96%D7%95%D7%A8%D7%99%D7%AA%20%D7%97%D7%91%D7%9C%20%D7%9E%D7%95%D7%93%D7%99%D7%A2%D7%99%D7%9F%2C%20%D7%A0%D7%A4%D7%AA%20%D7%A8%D7%9E%D7%9C%D7%94%2C%20%D7%9E%D7%97%D7%95%D7%96%20%D7%94%D7%9E%D7%A8%D7%9B%D7%96%2C%207015001%2C%20%D7%99%D7%A9%D7%A8%D7%90%D7%9C"}, {"id": "qdmtokxr", "parentId": null, "frameId": "y8w461yy", "date": "2026-08-02", "typeId": "domestic-flight", "arrivalTypeId": "walking", "from": "Suvarnabhumi Airport", "to": "Chiang Mai International Airport", "startTime": "19:35", "startTimeAuto": false, "endTime": "20:55", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "PG219", "costAmount": "527", "costCurrency": "₪", "fromAlias": "בנגקוק 111", "toAlias": "צאנג מאי", "notes": "landed · שער B4", "fromVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Suvarnabhumi%20Airport", "fromVerifiedText": "Suvarnabhumi Airport", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Chiang%20Mai%20International%20Airport", "toVerifiedText": "Chiang Mai International Airport", "fromLat": 13.6818767, "fromLon": 100.7485803, "toLat": 18.7668427, "toLon": 98.9648781, "routeDistanceKm": 713.501, "routeDurationMin": 563.2666666666667, "custom": {}, "fromPlaceId": null, "toPlaceId": null, "startTimeSource": "api", "endTimeSource": "api", "flightLookedUpFor": "PG219", "endTimeAuto": false, "weatherCode": 96, "weatherMin": 23.3, "weatherMax": 29.7, "weatherForDate": "2026-08-02"}, {"id": "wwkrasgt", "parentId": null, "frameId": "y8w461yy", "date": "2026-08-09", "typeId": "domestic-flight", "arrivalTypeId": "walking", "from": "בנגקוק, תאילנד", "to": "Samui International Airport, 99, Soi Had Chaweng 6, เทศบาลนครเกาะสมุย, Ko Samui District, Surat Thani Province, 84320, תאילנד", "startTime": "11:00", "startTimeAuto": true, "endTime": "12:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "PG103", "costAmount": "412", "costCurrency": "₪", "fromAlias": "בנגקוק", "toAlias": "קו סמוי", "notes": "", "fromVerifiedText": "בנגקוק, תאילנד", "toVerifiedText": "Samui International Airport, 99, Soi Had Chaweng 6, เทศบาลนครเกาะสมุย, Ko Samui District, Surat Thani Province, 84320, תאילנד", "routeDistanceKm": null, "routeDurationMin": null, "custom": {}, "startTimeSource": "inherited", "endTimeSource": "computed", "fromLat": 13.7524938, "fromLon": 100.4935089, "fromVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=%D7%91%D7%A0%D7%92%D7%A7%D7%95%D7%A7%2C%20%D7%AA%D7%90%D7%99%D7%9C%D7%A0%D7%93", "toLat": 9.5488263, "toLon": 100.0631993, "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Samui%20International%20Airport%2C%2099%2C%20Soi%20Had%20Chaweng%206%2C%20%E0%B9%80%E0%B8%97%E0%B8%A8%E0%B8%9A%E0%B8%B2%E0%B8%A5%E0%B8%99%E0%B8%84%E0%B8%A3%E0%B9%80%E0%B8%81%E0%B8%B2%E0%B8%B0%E0%B8%AA%E0%B8%A1%E0%B8%B8%E0%B8%A2%2C%20Ko%20Samui%20District%2C%20Surat%20Thani%20Province%2C%2084320%2C%20%D7%AA%D7%90%D7%99%D7%9C%D7%A0%D7%93"}, {"id": "avhjetcr", "parentId": null, "frameId": "y8w461yy", "date": "2026-08-16", "typeId": "domestic-flight", "arrivalTypeId": "walking", "from": "Samui International Airport, 99, Soi Had Chaweng 6, เทศบาลนครเกาะสมุย, Ko Samui District, Surat Thani Province, 84320, תאילנד", "to": "Phuket International Airport, Soi Tantavanit, Mai Khao, Sakhu, Si Sunthon, Thalang District, פוקט, 83110, תאילנד", "startTime": "11:00", "startTimeAuto": true, "endTime": "12:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "PG407", "costAmount": "420", "costCurrency": "₪", "fromAlias": "קו סמוי", "toAlias": "פוקט", "notes": "", "fromVerifiedText": "Samui International Airport, 99, Soi Had Chaweng 6, เทศบาลนครเกาะสมุย, Ko Samui District, Surat Thani Province, 84320, תאילנד", "toVerifiedText": "Phuket International Airport, Soi Tantavanit, Mai Khao, Sakhu, Si Sunthon, Thalang District, פוקט, 83110, תאילנד", "routeDistanceKm": null, "routeDurationMin": null, "custom": {}, "startTimeSource": "inherited", "endTimeSource": "computed", "fromLat": 9.5488263, "fromLon": 100.0631993, "fromVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Samui%20International%20Airport%2C%2099%2C%20Soi%20Had%20Chaweng%206%2C%20%E0%B9%80%E0%B8%97%E0%B8%A8%E0%B8%9A%E0%B8%B2%E0%B8%A5%E0%B8%99%E0%B8%84%E0%B8%A3%E0%B9%80%E0%B8%81%E0%B8%B2%E0%B8%B0%E0%B8%AA%E0%B8%A1%E0%B8%B8%E0%B8%A2%2C%20Ko%20Samui%20District%2C%20Surat%20Thani%20Province%2C%2084320%2C%20%D7%AA%D7%90%D7%99%D7%9C%D7%A0%D7%93", "toLat": 8.1082862, "toLon": 98.30672, "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Phuket%20International%20Airport%2C%20Soi%20Tantavanit%2C%20Mai%20Khao%2C%20Sakhu%2C%20Si%20Sunthon%2C%20Thalang%20District%2C%20%D7%A4%D7%95%D7%A7%D7%98%2C%2083110%2C%20%D7%AA%D7%90%D7%99%D7%9C%D7%A0%D7%93"}, {"id": "9shjtqdm", "parentId": null, "frameId": "y8w461yy", "date": "2026-08-23", "typeId": "domestic-flight", "arrivalTypeId": "walking", "from": "Phuket International Airport, Yotha Road, Mai Khao, Pa Khlok, Thalang District, פוקט, 83110, תאילנד", "to": "בנגקוק, תאילנד", "startTime": "11:00", "startTimeAuto": true, "endTime": "12:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "TG204", "costAmount": "265", "costCurrency": "₪", "fromAlias": "פוקט", "toAlias": "בנגקוק", "notes": "", "fromVerifiedText": "Phuket International Airport, Yotha Road, Mai Khao, Pa Khlok, Thalang District, פוקט, 83110, תאילנד", "toVerifiedText": "בנגקוק, תאילנד", "fromLat": 8.1082862, "fromLon": 98.30672, "toLat": 13.7524938, "toLon": 100.4935089, "routeDistanceKm": 812.977, "routeDurationMin": 670.2, "custom": {}, "startTimeSource": "inherited", "endTimeSource": "computed", "fromVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Phuket%20International%20Airport%2C%20Yotha%20Road%2C%20Mai%20Khao%2C%20Pa%20Khlok%2C%20Thalang%20District%2C%20%D7%A4%D7%95%D7%A7%D7%98%2C%2083110%2C%20%D7%AA%D7%90%D7%99%D7%9C%D7%A0%D7%93", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=%D7%91%D7%A0%D7%92%D7%A7%D7%95%D7%A7%2C%20%D7%AA%D7%90%D7%99%D7%9C%D7%A0%D7%93"}, {"id": "2ezb1voh", "parentId": null, "frameId": "dncklmcx", "date": "2026-08-02", "typeId": "transfer", "arrivalTypeId": "taxi", "from": "", "to": "El Barrio Lanna", "startTime": "21:55", "startTimeAuto": true, "endTime": "22:05", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "El Barrio Lanna (צאנג מאי)", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=El%20Barrio%20Lanna", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 18.7843848, "toLon": 98.9858766, "routeDistanceKm": 4.706, "routeDurationMin": 9.85, "custom": {}, "toPlaceId": null, "startTimeSource": "inherited", "endTimeSource": "computed", "weatherCode": 96, "weatherMin": 23.4, "weatherMax": 28.9, "weatherForDate": "2026-08-02", "endTimeAuto": true}, {"id": "q1a61qtk", "parentId": null, "frameId": "dncklmcx", "date": "2026-08-02", "typeId": "checkin", "arrivalTypeId": "walking", "from": "", "to": "El Barrio Lanna", "startTime": "22:05", "startTimeAuto": true, "endTime": "22:35", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "El Barrio Lanna (צאנג מאי)", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=El%20Barrio%20Lanna", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 18.7843848, "toLon": 98.9858766, "routeDistanceKm": 0, "routeDurationMin": 0, "custom": {}, "toPlaceId": null, "endTimeSource": "computed", "startTimeSource": "inherited", "weatherCode": 96, "weatherMin": 23.4, "weatherMax": 28.9, "weatherForDate": "2026-08-02"}, {"id": "2z780h4s", "parentId": null, "frameId": "dncklmcx", "date": "2026-08-05", "typeId": "checkout", "arrivalTypeId": "walking", "from": "", "to": "El Barrio Lanna", "startTime": "", "startTimeAuto": true, "endTime": "11:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "El Barrio Lanna (צאנג מאי)", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=El%20Barrio%20Lanna", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 18.7843848, "toLon": 98.9858766, "routeDistanceKm": 0, "routeDurationMin": 0, "custom": {}, "toPlaceId": null, "weatherCode": 96, "weatherMin": 24.3, "weatherMax": 28.8, "weatherForDate": "2026-08-05"}, {"id": "dd7pfki2", "parentId": null, "frameId": "dncklmcx", "date": "2026-08-05", "typeId": "transfer", "arrivalTypeId": "taxi", "from": "", "to": "", "startTime": "11:00", "startTimeAuto": true, "endTime": "11:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": null, "toLon": null, "routeDistanceKm": null, "routeDurationMin": null, "custom": {}, "startTimeSource": "inherited", "endTimeSource": "computed"}, {"id": "pgu5obhu", "parentId": null, "frameId": "lfy22n6t", "date": "2026-08-05", "typeId": "transfer", "arrivalTypeId": "taxi", "from": "", "to": "Pai My Guest Resort", "startTime": "11:00", "startTimeAuto": true, "endTime": "11:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Pai My Guest Resort", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Pai%20My%20Guest%20Resort", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 19.3536059, "toLon": 98.4513845, "routeDistanceKm": null, "routeDurationMin": null, "custom": {}, "toPlaceId": null, "startTimeSource": "inherited", "endTimeSource": "computed", "weatherCode": 95, "weatherMin": 23.3, "weatherMax": 28.4, "weatherForDate": "2026-08-05"}, {"id": "5xhcgayv", "parentId": null, "frameId": "lfy22n6t", "date": "2026-08-05", "typeId": "checkin", "arrivalTypeId": "walking", "from": "", "to": "Pai My Guest Resort", "startTime": "11:00", "startTimeAuto": true, "endTime": "11:30", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Pai My Guest Resort", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Pai%20My%20Guest%20Resort", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 19.3536059, "toLon": 98.4513845, "routeDistanceKm": 0, "routeDurationMin": 0, "custom": {}, "toPlaceId": null, "endTimeSource": "computed", "startTimeSource": "inherited", "weatherCode": 95, "weatherMin": 23.3, "weatherMax": 28.4, "weatherForDate": "2026-08-05"}, {"id": "zvdux9tq", "parentId": null, "frameId": "lfy22n6t", "date": "2026-08-09", "typeId": "checkout", "arrivalTypeId": "walking", "from": "", "to": "Pai My Guest Resort", "startTime": "", "startTimeAuto": true, "endTime": "11:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Pai My Guest Resort", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Pai%20My%20Guest%20Resort", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 19.3536059, "toLon": 98.4513845, "routeDistanceKm": 0, "routeDurationMin": 0, "custom": {}, "toPlaceId": null, "weatherCode": 95, "weatherMin": 23.2, "weatherMax": 26.5, "weatherForDate": "2026-08-09"}, {"id": "tvm8reht", "parentId": null, "frameId": "lfy22n6t", "date": "2026-08-09", "typeId": "transfer", "arrivalTypeId": "taxi", "from": "", "to": "", "startTime": "11:00", "startTimeAuto": true, "endTime": "11:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": null, "toLon": null, "routeDistanceKm": null, "routeDurationMin": null, "custom": {}, "startTimeSource": "inherited", "endTimeSource": "computed"}, {"id": "xmwsv9d2", "parentId": null, "frameId": "me0yfnpv", "date": "2026-08-09", "typeId": "transfer", "arrivalTypeId": "taxi", "from": "", "to": "Cascade Tara", "startTime": "12:00", "startTimeAuto": true, "endTime": "12:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Cascade Tara", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Cascade%20Tara", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 9.4658063, "toLon": 99.9860397, "routeDistanceKm": null, "routeDurationMin": null, "custom": {}, "toPlaceId": null, "startTimeSource": "inherited", "endTimeSource": "computed", "weatherCode": 51, "weatherMin": 26.6, "weatherMax": 29.1, "weatherForDate": "2026-08-09"}, {"id": "lraqihh9", "parentId": null, "frameId": "me0yfnpv", "date": "2026-08-09", "typeId": "checkin", "arrivalTypeId": "walking", "from": "", "to": "Cascade Tara", "startTime": "12:00", "startTimeAuto": true, "endTime": "12:30", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Cascade Tara", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Cascade%20Tara", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 9.4658063, "toLon": 99.9860397, "routeDistanceKm": 0, "routeDurationMin": 0, "custom": {}, "toPlaceId": null, "endTimeSource": "computed", "startTimeSource": "inherited", "weatherCode": 51, "weatherMin": 26.6, "weatherMax": 29.1, "weatherForDate": "2026-08-09"}, {"id": "w94zng7y", "parentId": null, "frameId": "me0yfnpv", "date": "2026-08-12", "typeId": "checkout", "arrivalTypeId": "walking", "from": "", "to": "Cascade Tara", "startTime": "", "startTimeAuto": true, "endTime": "11:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Cascade Tara", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Cascade%20Tara", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 9.4658063, "toLon": 99.9860397, "routeDistanceKm": 0, "routeDurationMin": 0, "custom": {}, "toPlaceId": null, "weatherCode": 51, "weatherMin": 25.9, "weatherMax": 30.8, "weatherForDate": "2026-08-12"}, {"id": "ignzjfu9", "parentId": null, "frameId": "me0yfnpv", "date": "2026-08-12", "typeId": "transfer", "arrivalTypeId": "taxi", "from": "", "to": "", "startTime": "11:00", "startTimeAuto": true, "endTime": "11:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": null, "toLon": null, "routeDistanceKm": null, "routeDurationMin": null, "custom": {}, "startTimeSource": "inherited", "endTimeSource": "computed"}, {"id": "idpn4nvv", "parentId": null, "frameId": "j5bv3ump", "date": "2026-08-12", "typeId": "transfer", "arrivalTypeId": "taxi", "from": "", "to": "Santhiya Koh Phangan", "startTime": "11:00", "startTimeAuto": true, "endTime": "11:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Santhiya Koh Phangan", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Santhiya%20Koh%20Phangan", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 9.7834728, "toLon": 100.0566819, "routeDistanceKm": null, "routeDurationMin": null, "custom": {}, "toPlaceId": null, "startTimeSource": "inherited", "endTimeSource": "computed", "weatherCode": 51, "weatherMin": 26.7, "weatherMax": 29.1, "weatherForDate": "2026-08-12"}, {"id": "vkz6iexf", "parentId": null, "frameId": "j5bv3ump", "date": "2026-08-12", "typeId": "checkin", "arrivalTypeId": "walking", "from": "", "to": "Santhiya Koh Phangan", "startTime": "11:00", "startTimeAuto": true, "endTime": "11:30", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Santhiya Koh Phangan", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Santhiya%20Koh%20Phangan", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 9.7834728, "toLon": 100.0566819, "routeDistanceKm": 0, "routeDurationMin": 0, "custom": {}, "toPlaceId": null, "endTimeSource": "computed", "startTimeSource": "inherited", "weatherCode": 51, "weatherMin": 26.7, "weatherMax": 29.1, "weatherForDate": "2026-08-12"}, {"id": "socdrjfu", "parentId": null, "frameId": "j5bv3ump", "date": "2026-08-16", "typeId": "checkout", "arrivalTypeId": "walking", "from": "", "to": "Santhiya Koh Phangan", "startTime": "", "startTimeAuto": true, "endTime": "11:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Santhiya Koh Phangan", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Santhiya%20Koh%20Phangan", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 9.7834728, "toLon": 100.0566819, "routeDistanceKm": 0, "routeDurationMin": 0, "custom": {}, "toPlaceId": null}, {"id": "7qnn3u3r", "parentId": null, "frameId": "j5bv3ump", "date": "2026-08-16", "typeId": "transfer", "arrivalTypeId": "taxi", "from": "", "to": "", "startTime": "11:00", "startTimeAuto": true, "endTime": "11:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": null, "toLon": null, "routeDistanceKm": null, "routeDurationMin": null, "custom": {}, "startTimeSource": "inherited", "endTimeSource": "computed"}, {"id": "ymuqz22r", "parentId": null, "frameId": "mi7fgwc3", "date": "2026-08-16", "typeId": "transfer", "arrivalTypeId": "taxi", "from": "", "to": "Saturdays Residence by Brown Starling", "startTime": "12:00", "startTimeAuto": true, "endTime": "12:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Saturdays Residence by Brown Starling", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Saturdays%20Residence%20by%20Brown%20Starling", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 7.8041312, "toLon": 98.3309416, "routeDistanceKm": null, "routeDurationMin": null, "custom": {}, "toPlaceId": null, "startTimeSource": "inherited", "endTimeSource": "computed"}, {"id": "oeb3ul0x", "parentId": null, "frameId": "mi7fgwc3", "date": "2026-08-16", "typeId": "checkin", "arrivalTypeId": "walking", "from": "", "to": "Saturdays Residence by Brown Starling", "startTime": "12:00", "startTimeAuto": true, "endTime": "12:30", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Saturdays Residence by Brown Starling", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Saturdays%20Residence%20by%20Brown%20Starling", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 7.8041312, "toLon": 98.3309416, "routeDistanceKm": 0, "routeDurationMin": 0, "custom": {}, "toPlaceId": null, "endTimeSource": "computed", "startTimeSource": "inherited"}, {"id": "0ve7md7f", "parentId": null, "frameId": "mi7fgwc3", "date": "2026-08-23", "typeId": "checkout", "arrivalTypeId": "walking", "from": "", "to": "Saturdays Residence by Brown Starling", "startTime": "", "startTimeAuto": true, "endTime": "11:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Saturdays Residence by Brown Starling", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Saturdays%20Residence%20by%20Brown%20Starling", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 7.8041312, "toLon": 98.3309416, "routeDistanceKm": 0, "routeDurationMin": 0, "custom": {}, "toPlaceId": null}, {"id": "cs12f01z", "parentId": null, "frameId": "mi7fgwc3", "date": "2026-08-23", "typeId": "transfer", "arrivalTypeId": "taxi", "from": "", "to": "", "startTime": "11:00", "startTimeAuto": true, "endTime": "11:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": null, "toLon": null, "routeDistanceKm": null, "routeDurationMin": null, "custom": {}, "startTimeSource": "inherited", "endTimeSource": "computed"}, {"id": "v50gao76", "parentId": null, "frameId": "mljfdpzx", "date": "2026-08-23", "typeId": "transfer", "arrivalTypeId": "taxi", "from": "", "to": "Good Times Resort", "startTime": "12:00", "startTimeAuto": true, "endTime": "15:57", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Good Times Resort", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Good%20Times%20Resort", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 14.0353825, "toLon": 99.5157412, "routeDistanceKm": 123.031, "routeDurationMin": 1676.5333333333333, "custom": {}, "toPlaceId": null, "startTimeSource": "inherited", "endTimeSource": "computed"}, {"id": "a0di10df", "parentId": null, "frameId": "mljfdpzx", "date": "2026-08-23", "typeId": "checkin", "arrivalTypeId": "walking", "from": "", "to": "Good Times Resort", "startTime": "15:57", "startTimeAuto": true, "endTime": "16:27", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Good Times Resort", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Good%20Times%20Resort", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 14.0353825, "toLon": 99.5157412, "routeDistanceKm": 0, "routeDurationMin": 0, "custom": {}, "toPlaceId": null, "startTimeSource": "inherited", "endTimeSource": "computed"}, {"id": "uh49h5eu", "parentId": null, "frameId": "mljfdpzx", "date": "2026-08-27", "typeId": "checkout", "arrivalTypeId": "walking", "from": "", "to": "Good Times Resort", "startTime": "", "startTimeAuto": true, "endTime": "11:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Good Times Resort", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Good%20Times%20Resort", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 14.0353825, "toLon": 99.5157412, "routeDistanceKm": 0, "routeDurationMin": 0, "custom": {}, "toPlaceId": null}, {"id": "qcpoysp5", "parentId": null, "frameId": "mljfdpzx", "date": "2026-08-27", "typeId": "transfer", "arrivalTypeId": "taxi", "from": "", "to": "", "startTime": "11:00", "startTimeAuto": true, "endTime": "11:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": null, "toLon": null, "routeDistanceKm": null, "routeDurationMin": null, "custom": {}, "startTimeSource": "inherited", "endTimeSource": "computed"}, {"id": "xxklg7og", "parentId": null, "frameId": "wwgdgr04", "date": "2026-08-27", "typeId": "transfer", "arrivalTypeId": "taxi", "from": "", "to": "Prince Palace Hotel", "startTime": "11:00", "startTimeAuto": true, "endTime": "11:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Prince Palace Hotel", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Prince%20Palace%20Hotel", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 13.7543441, "toLon": 100.5148204, "routeDistanceKm": null, "routeDurationMin": null, "custom": {}, "toPlaceId": null, "startTimeSource": "inherited", "endTimeSource": "computed"}, {"id": "6rzka0hg", "parentId": null, "frameId": "wwgdgr04", "date": "2026-08-27", "typeId": "checkin", "arrivalTypeId": "walking", "from": "", "to": "Prince Palace Hotel", "startTime": "11:00", "startTimeAuto": true, "endTime": "11:30", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Prince Palace Hotel", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Prince%20Palace%20Hotel", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 13.7543441, "toLon": 100.5148204, "routeDistanceKm": 0, "routeDurationMin": 0, "custom": {}, "toPlaceId": null, "endTimeSource": "computed", "startTimeSource": "inherited"}, {"id": "eh6bsys5", "parentId": null, "frameId": "wwgdgr04", "date": "2026-08-31", "typeId": "checkout", "arrivalTypeId": "walking", "from": "", "to": "Prince Palace Hotel", "startTime": "", "startTimeAuto": true, "endTime": "11:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "Prince Palace Hotel", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Prince%20Palace%20Hotel", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": 13.7543441, "toLon": 100.5148204, "routeDistanceKm": 0, "routeDurationMin": 0, "custom": {}, "toPlaceId": null}, {"id": "x1wru1vz", "parentId": null, "frameId": "wwgdgr04", "date": "2026-08-31", "typeId": "transfer", "arrivalTypeId": "taxi", "from": "", "to": "", "startTime": "11:00", "startTimeAuto": true, "endTime": "11:00", "overnight": false, "stayDurationMin": null, "destination": "", "link": "", "mapLink": "", "flightNumber": "", "costAmount": 0, "costCurrency": "₪", "fromAlias": "", "toAlias": "", "notes": "", "fromVerifiedUrl": "", "fromVerifiedText": "", "toVerifiedUrl": "", "toVerifiedText": "", "fromLat": null, "fromLon": null, "toLat": null, "toLon": null, "routeDistanceKm": null, "routeDurationMin": null, "custom": {}, "startTimeSource": "inherited", "endTimeSource": "computed"}], "frames": [{"id": "y8w461yy", "name": "טיול מקיף תאילנד", "startDate": "2026-08-01", "endDate": "2026-08-31", "parentFrameId": null, "collapsed": false, "frameType": "flight"}, {"id": "dncklmcx", "name": "El Barrio Lanna (צאנג מאי)", "startDate": "2026-08-02", "endDate": "2026-08-05", "parentFrameId": "y8w461yy", "collapsed": false, "frameType": "hotel", "hotelRef": {"name": "El Barrio Lanna", "alias": "El Barrio Lanna (צאנג מאי)", "checkIn": "2026-08-02", "checkOut": "2026-08-05", "nameLat": 18.7843848, "nameLon": 98.9858766, "namePlaceId": null, "nameVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=El%20Barrio%20Lanna", "city": "צ'אנג מאי"}}, {"id": "lfy22n6t", "name": "Pai My Guest Resort", "startDate": "2026-08-05", "endDate": "2026-08-09", "parentFrameId": "y8w461yy", "collapsed": false, "frameType": "hotel", "hotelRef": {"name": "Pai My Guest Resort", "alias": "Pai My Guest Resort", "checkIn": "2026-08-05", "checkOut": "2026-08-09", "nameLat": 19.3536059, "nameLon": 98.4513845, "namePlaceId": null, "nameVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Pai%20My%20Guest%20Resort", "city": "Pai"}}, {"id": "me0yfnpv", "name": "Cascade Tara", "startDate": "2026-08-09", "endDate": "2026-08-12", "parentFrameId": "y8w461yy", "collapsed": false, "frameType": "hotel", "hotelRef": {"name": "Cascade Tara", "alias": "Cascade Tara", "checkIn": "2026-08-09", "checkOut": "2026-08-12", "nameLat": 9.4658063, "nameLon": 99.9860397, "namePlaceId": null, "nameVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Cascade%20Tara", "city": "Koh Samui"}}, {"id": "j5bv3ump", "name": "Santhiya Koh Phangan", "startDate": "2026-08-12", "endDate": "2026-08-16", "parentFrameId": "y8w461yy", "collapsed": false, "frameType": "hotel", "hotelRef": {"name": "Santhiya Koh Phangan", "alias": "Santhiya Koh Phangan", "checkIn": "2026-08-12", "checkOut": "2026-08-16", "nameLat": 9.7834728, "nameLon": 100.0566819, "namePlaceId": null, "nameVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Santhiya%20Koh%20Phangan", "city": "Koh Phangan"}}, {"id": "mi7fgwc3", "name": "Saturdays Residence by Brown Starling", "startDate": "2026-08-16", "endDate": "2026-08-23", "parentFrameId": "y8w461yy", "collapsed": false, "frameType": "hotel", "hotelRef": {"name": "Saturdays Residence by Brown Starling", "alias": "Saturdays Residence by Brown Starling", "checkIn": "2026-08-16", "checkOut": "2026-08-23", "nameLat": 7.8041312, "nameLon": 98.3309416, "namePlaceId": null, "nameVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Saturdays%20Residence%20by%20Brown%20Starling", "city": "Phuket"}}, {"id": "mljfdpzx", "name": "Good Times Resort", "startDate": "2026-08-23", "endDate": "2026-08-27", "parentFrameId": "y8w461yy", "collapsed": false, "frameType": "hotel", "hotelRef": {"name": "Good Times Resort", "alias": "Good Times Resort", "checkIn": "2026-08-23", "checkOut": "2026-08-27", "nameLat": 14.0353825, "nameLon": 99.5157412, "namePlaceId": null, "nameVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Good%20Times%20Resort", "city": "Kanchanaburi"}}, {"id": "wwgdgr04", "name": "Prince Palace Hotel", "startDate": "2026-08-27", "endDate": "2026-08-31", "parentFrameId": "y8w461yy", "collapsed": false, "frameType": "hotel", "hotelRef": {"name": "Prince Palace Hotel", "alias": "Prince Palace Hotel", "checkIn": "2026-08-27", "checkOut": "2026-08-31", "nameLat": 13.7543441, "nameLon": 100.5148204, "namePlaceId": null, "nameVerifiedUrl": "https://www.google.com/maps/search/?api=1&query=Prince%20Palace%20Hotel", "city": "Bangkok"}}], "displayCurrency": "₪"},
  "טיול רומא (הדגמה)": { rows: initialRows(), frames: [], displayCurrency: "₪" },
};

const DEFAULT_TYPES = [
  { id: "train", name_he: "רכבת", name_en: "Train", icon: "TrainFront", color: CATEGORY_COLORS["public-transport"], category: "public-transport", kind: "arrival" },
  { id: "high-speed-train", name_he: "רכבת מהירה", name_en: "High-speed train", icon: "TrainFront", color: CATEGORY_COLORS["public-transport"], category: "public-transport", kind: "arrival" },
  { id: "bus", name_he: "אוטובוס", name_en: "Bus", icon: "Bus", color: CATEGORY_COLORS["public-transport"], category: "public-transport", kind: "arrival" },
  { id: "taxi", name_he: "מונית", name_en: "Taxi", icon: "Car", color: CATEGORY_COLORS["public-transport"], category: "public-transport", kind: "arrival" },

  { id: "car-rental", name_he: "השכרת רכב", name_en: "Car rental", icon: "KeySquare", color: CATEGORY_COLORS["road-transport"], category: "road-transport", kind: "arrival" },
  { id: "caravan", name_he: "קראוון", name_en: "Caravan", icon: "Caravan", color: CATEGORY_COLORS["road-transport"], category: "road-transport", kind: "arrival" },
  { id: "motorcycle", name_he: "אופנוע", name_en: "Motorcycle", icon: "Motorbike", color: CATEGORY_COLORS["road-transport"], category: "road-transport", kind: "arrival" },
  { id: "bicycle", name_he: "אופניים", name_en: "Bicycle", icon: "Bike", color: CATEGORY_COLORS["road-transport"], category: "road-transport", kind: "arrival" },
  { id: "walking", name_he: "הליכה רגלית", name_en: "Walking", icon: "Footprints", color: CATEGORY_COLORS["road-transport"], category: "road-transport", kind: "arrival" },
  { id: "scooter", name_he: "קורקינט", name_en: "Scooter", icon: "Scooter", color: CATEGORY_COLORS["road-transport"], category: "road-transport", kind: "arrival" },

  { id: "ferry", name_he: "מעבורת", name_en: "Ferry", icon: "Ship", color: CATEGORY_COLORS["sea-transport"], category: "sea-transport", kind: "arrival" },
  { id: "yacht", name_he: "יאכטה", name_en: "Yacht", icon: "Sailboat", color: CATEGORY_COLORS["sea-transport"], category: "sea-transport", kind: "arrival" },
  { id: "ship", name_he: "אוניה", name_en: "Ship", icon: "ShipWheel", color: CATEGORY_COLORS["sea-transport"], category: "sea-transport", kind: "arrival" },
  { id: "cruise", name_he: "שייט", name_en: "Cruise", icon: "Anchor", color: CATEGORY_COLORS["sea-transport"], category: "sea-transport", kind: "arrival" },
  { id: "canoe", name_he: "קאנו", name_en: "Canoe", icon: "Kayak", color: CATEGORY_COLORS["sea-transport"], category: "sea-transport", kind: "arrival" },

  { id: "flight", name_he: "טיסה בינלאומית", name_en: "International flight", icon: "Plane", color: CATEGORY_COLORS["air-transport"], category: "air-transport", kind: "arrival" },
  { id: "domestic-flight", name_he: "טיסת פנים", name_en: "Domestic flight", icon: "PlaneTakeoff", color: CATEGORY_COLORS["air-transport"], category: "air-transport", kind: "arrival" },
  { id: "helicopter", name_he: "מסוק", name_en: "Helicopter", icon: "Helicopter", color: CATEGORY_COLORS["air-transport"], category: "air-transport", kind: "arrival" },

  { id: "checkin", name_he: "צ'ק-אין", name_en: "Check-in", icon: "BedDouble", color: CATEGORY_COLORS.accommodation, category: "accommodation", kind: "desc" },
  { id: "checkout", name_he: "צ'ק-אאוט", name_en: "Check-out", icon: "BedDouble", color: CATEGORY_COLORS.accommodation, category: "accommodation", kind: "desc" },
  { id: "hotel", name_he: "מלון", name_en: "Hotel", icon: "BedDouble", color: CATEGORY_COLORS.accommodation, category: "accommodation", kind: "desc" },
  { id: "hostel", name_he: "אכסנייה", name_en: "Hostel", icon: "Building2", color: CATEGORY_COLORS.accommodation, category: "accommodation", kind: "desc" },
  { id: "apartment", name_he: "דירה", name_en: "Apartment", icon: "Home", color: CATEGORY_COLORS.accommodation, category: "accommodation", kind: "desc" },
  { id: "transfer", name_he: "העברות", name_en: "Transfers", icon: "Car", color: CATEGORY_COLORS.accommodation, category: "accommodation", kind: "desc" },

  { id: "self-tour", name_he: "טיול עצמאי", name_en: "Self-guided tour", icon: "Footprints", color: CATEGORY_COLORS.activities, category: "activities", kind: "desc" },
  { id: "guided-tour", name_he: "טיול מודרך", name_en: "Guided tour", icon: "Users", color: CATEGORY_COLORS.activities, category: "activities", kind: "desc" },
  { id: "day-tour", name_he: "טיול יומי", name_en: "Day tour", icon: "Sun", color: CATEGORY_COLORS.activities, category: "activities", kind: "desc" },
  { id: "attraction", name_he: "אטרקציה", name_en: "Attraction", icon: "Landmark", color: CATEGORY_COLORS.activities, category: "activities", kind: "desc" },
  { id: "poi", name_he: "נקודת עניין", name_en: "Point of Interest", icon: "MapPin", color: CATEGORY_COLORS.activities, category: "activities", kind: "desc" },
  { id: "restaurant", name_he: "מסעדה", name_en: "Restaurant", icon: "Utensils", color: CATEGORY_COLORS.culinary, category: "culinary", kind: "desc" },
  { id: "bar", name_he: "בר", name_en: "Bar", icon: "Wine", color: CATEGORY_COLORS.culinary, category: "culinary", kind: "desc" },
  { id: "pub", name_he: "פאב", name_en: "Pub", icon: "Beer", color: CATEGORY_COLORS.culinary, category: "culinary", kind: "desc" },
  { id: "club", name_he: "מועדון", name_en: "Club", icon: "Music", color: CATEGORY_COLORS.entertainment, category: "entertainment", kind: "desc" },
  { id: "party", name_he: "מסיבה", name_en: "Party", icon: "PartyPopper", color: CATEGORY_COLORS.entertainment, category: "entertainment", kind: "desc" },
  { id: "show", name_he: "הופעה", name_en: "Show", icon: "Mic2", color: CATEGORY_COLORS.entertainment, category: "entertainment", kind: "desc" },
  { id: "festival", name_he: "פסטיבל", name_en: "Festival", icon: "Music", color: CATEGORY_COLORS.entertainment, category: "entertainment", kind: "desc" },
];
const CATEGORY_ORDER = ["public-transport", "road-transport", "sea-transport", "air-transport", "accommodation", "activities", "culinary", "entertainment", "other"];
const CATEGORY_LABELS = {
  he: { "public-transport": "תחבורה ציבורית", "road-transport": "תחבורה כביש", "sea-transport": "תחבורה ימית", "air-transport": "תחבורה אווירית", accommodation: "לינה", activities: "פעילויות", culinary: "קולינריה", entertainment: "בילויים", other: "אחר" },
  en: { "public-transport": "Public Transport", "road-transport": "Road Transport", "sea-transport": "Sea Transport", "air-transport": "Air Transport", accommodation: "Accommodation", activities: "Activities", culinary: "Culinary", entertainment: "Entertainment", other: "Other" },
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
  { key: "arrival", label_he: "אמצעי הגעה", label_en: "Arrival Method", visible: true },
  { key: "from", label_he: "מוצא", label_en: "Origin", visible: true },
  { key: "to", label_he: "יעד", label_en: "Destination", visible: true },
  { key: "startTime", label_he: "בשעה", label_en: "At", visible: true },
  { key: "duration", label_he: "משך", label_en: "Dur.", visible: true },
  { key: "endTime", label_he: "עד שעה", label_en: "Until", visible: true },
  { key: "stay", label_he: "שהות", label_en: "Stay", visible: true },
  { key: "route", label_he: "מסלול", label_en: "Route", visible: true },
  { key: "link", label_he: "קישור", label_en: "Link", visible: true },
  { key: "cost", label_he: "עלות", label_en: "Cost", visible: true },
  { key: "notes", label_he: "הערות", label_en: "Notes", visible: true },
  { key: "weather", label_he: "תחזית", label_en: "Forecast", visible: true },
];

const T_DICT = {
  he: {
    appName: "MyTrip Builder", addRow: "הוסף רשומה", addDay: "הוסף יום", newFrame: "מסגרת חדשה",
    catNewFrame: "מסגרות", catSaveExport: "שמירה, ייבוא וייצוא", catSharing: "שיתוף", catTools: "כלים", catViews: "תצוגות", catGeneral: "כללי",
    showHeader: "הצג את התפריט העליון", hideHeader: "הסתר את התפריט העליון",
    columns: "עמודות", addColumn: "הוסף עמודה", addType: "הוסף תיאור", resetColumnWidths: "איפוס רוחב עמודות (גרור את קצה כותרת העמודה לשינוי ידני)", actions: "פעולות", on: "פעיל", settings: "הגדרות", manageColumns: "ניהול עמודות", undo: "בטל פעולה אחרונה", redo: "חזור על פעולה", disableIntro: "בטל הצגת אנימציית פתיחה",
    exportFile: "שמור לקובץ", importFile: "ייבוא מקובץ", importSuccess: "הייבוא הצליח", importError: "הקובץ אינו תקין",
    login: "התחברות עם Google", logout: "התנתק", cloudAutoSaveName: "שמירה אוטומטית",
    cloudSyncTitle: "סנכרון בענן", cloudNotConfigured: "סנכרון בענן עדיין לא הוגדר באפליקציה הזו.",
    cloudLoading: "טוען…", cloudSignInHint: "התחבר עם Google כדי לשמור ולסנכרן טיולים בין מכשירים.",
    cloudSignInGoogle: "התחבר עם Google", cloudTripNamePlaceholder: "שם הטיול",
    cloudSaving: "שומר…", cloudSaveCurrentTrip: "שמור", cloudSaveSuccess: "נשמר בהצלחה בענן.",
    cloudSaveError: "השמירה נכשלה, נסה שוב.", cloudYourTrips: "הטיולים שלך בענן", cloudNoTrips: "אין עדיין טיולים שמורים בענן.",
    cloudUntitledTrip: "טיול ללא שם",
    desktop: "מחשב", mobile: "סלולר", flowView: "תצוגת זרימה", lang: "English", editRecord: "כרטיס רשומה",
    save: "שמירה", cancel: "ביטול", delete: "מחיקה", addSub: "תת רשומה", selectTime: "בחר שעה", done: "אישור", clearTime: "נקה",
    amLabel: "לפנה״צ", pmLabel: "אחה״צ",
    deleteFrameTitle: "מחיקת מסגרת", deleteFrameHint: "איך למחוק את המסגרת?",
    preFlightChecklist: "צ'ק ליסט קדם טיסה", checklistReservations: "הזמנות", checklistDocuments: "מסמכי נסיעה", checklistOther: "נוספים",
    helpCenterTitle: "מרכז עזרה",
    fileManagerTitle: "ניהול קבצים", fileManagerFilter_all: "הכל", fileManagerFilter_byCategory: "לפי שייכות", fileManagerFilter_images: "תמונות", fileManagerFilter_documents: "מסמכים",
    fileManagerRecordsFolder: "רשומות הטיול", fileSortName: "שם", fileSortDate: "תאריך", fileSortSize: "גודל",
    fileUploading: "מעלה קובץ…", fileUploadSuccess: "הקובץ הועלה ונשמר בענן.", fileUploadError: "העלאת הקובץ נכשלה, נסה שוב.",
    fileUploadNeedsSignIn: "הקובץ נשמר רק באופן זמני — התחבר עם Google כדי שהוא יישמר בענן ויישאר גם אחרי רענון.",
    fileManagerEmpty: "עדיין לא הועלו קבצים. קבצים שתעלה בכל מקום באפליקציה (כמו צ'ק ליסט) יופיעו כאן.",
    checklistShopping: "רשימת קניות", checklistPacking: "ארגון ציוד לטיסה", checklistUpload: "העלה מסמך", checklistAddItem: "הוסף פריט...",
    checklistDocTitlePrompt: "כותרת קצרה לקובץ (יוצג כרמז בעת ריחוף על הסמל):",
    checklistPackingSub: "{n} מתוך {total} הושלמו", checklistShoppingSub: "{n} פריטים", checklistShoppingEmpty: "הרשימה ריקה — הוסף פריט למטה",
    deleteFrameOnly: "מחק מסגרת בלבד (התוכן יעבור למסגרת האם)", deleteFrameWithContent: "מחק מסגרת ואת כל התוכן שבתוכה",
    type: "תיאור", from: "מוצא", to: "יעד", start: "בשעה", end: "עד שעה", overnight: "חוצה חצות", arrivalMethod: "אמצעי הגעה",
    addTransferToAirport: "הוסף רשומת העברות - אל השדה", addTransferFromAirport: "הוסף רשומת העברות - מהשדה",
    stayDuration: "משך שהות", stayDurationHint: "כמה זמן נשארים ביעד — קובע את שעת הסיום (שעת הגעה + משך שהות).",
    stayNone: "ללא שהות", minutesShort: "דק'", hoursShort: "שע'", stayAtDestination: "שהות ביעד", hourLetter: "ש",
    typeKindDesc: "תיאור", typeKindArrival: "אמצעי הגעה",
    requiresTicket: "דורש רכישת כרטיס כניסה", calcRoute: "חשב מסלול",
    ticketPurchased: "הכרטיס נרכש", flightCheckedIn: "בוצע צ'ק-אין לטיסה",
    tripAlerts: "התראות טיול", noTripAlerts: "אין התראות פתוחות כרגע.",
    routeErrNoOrigin: "אין מוצא זמין לחישוב (גם לא ברשומה הקודמת)", routeErrNoDest: "אין יעד ברשומה זו",
    routeErrGeocodeOrigin: "לא ניתן לאתר את המוצא", routeErrGeocodeDest: "לא ניתן לאתר את היעד",
    routeErrNoRoute: "לא נמצא מסלול בין הנקודות", routeErrNetwork: "שגיאת רשת בעת החישוב",
    destination: "שם היעד", link: "קישור להזמנה", maplink: "קישור למיקום / מסלול",
    flightNo: "מספר טיסה", cost: "עלות", currency: "מטבע", notes: "הערות", frame: "מסגרת",
    flightNoCheck: "בדיקת מספר טיסה", flightNoCheckHint: "לא חובה — אם מוזן, הנתונים שיימשכו יהיו הקובעים",
    flightNoCheckReturn: "בדיקת מספר טיסה — חזור (לא חובה — אם מוזן, הנתונים שיימשכו יהיו הקובעים)",
    flightDepTime: "שעת המראה", flightLandTime: "שעת נחיתה",
    noFrame: "ללא מסגרת (רמה עליונה)", selectType: "בחר...",
    newType: "תיאור חדש", typeName: "שם תיאור", add: "הוספה", searchTypes: "חיפוש תיאור...",
    totalPerCurrency: "סה״כ טיול", timeError: "שעת סיום לפני שעת ההתחלה — סמן \"חוצה חצות\" אם מדובר בלילה",
    noRows: "אין עדיין רשומות כאן", dragHint: "גרירה לשינוי סדר", mockNote: "*הדמיית התחברות בלבד בפרוטוטייפ",
    frameModalNew: "מסגרת טיול חדשה", frameModalEdit: "עריכת מסגרת", frameName: "שם המסגרת",
    frameTypeLabel: "סוג מסגרת", frameTypeBasic: "בסיסית", frameTypeTrip: "טיול", frameTypeFlight: "טיסה", frameTypeHotel: "מלון",
    frameStart: "תאריך התחלה", frameEnd: "תאריך סיום", frameDateRange: "טווח תאריכים", parentFrame: "שייכת למסגרת",
    addSubFrame: "הוסף מסגרת-משנה", suggestPrefix: "זוהו", suggestMid: "טיסות ללא מסגרת:", moreOptions: "עוד אפשרויות", editFrame: "ערוך מסגרת",
    fillDatesAbove: "הוסף מסגרת מעל התאריך הקיים", fillDatesBelow: "הוסף מסגרת מתחת לתאריך הקיים",
    suggestBtn: "צור מסגרת טיול אוטומטית", suggestDismiss: "התעלם",
    fxApprox: "לפי שער מקורב (אין חיבור לאינטרנט)", fxLive: "לפי שער עדכני",
    frameRangeInvalid: "תאריך ההתחלה חייב להיות לפני תאריך הסיום",
    frameRangeContent: "טווח התאריכים חייב לכלול את כל הרשומות/תת-המסגרות שכבר קיימות במסגרת זו",
    frameRangeParent: "טווח התאריכים חייב להיות בתוך טווח המסגרת המכילה",
    rowOutOfFrame: "התאריך חייב להיות בתוך טווח המסגרת שאליה הרשומה משויכת",
    routeTooltip: "פתח מסלול בגוגל מפות", dayRoute: "מסלול", addDayShort: "יום", addRowShort: "רשומה", noRoute: "אין מספיק נתוני מיקום",
    fetchFlightData: "משוך נתונים", flightApiMissing: "לצורך משיכה אוטומטית יש לחבר ספק נתוני טיסות (כגון AeroDataBox) עם מפתח API ופרוקסי בצד השרת. שדה זה מוכן לחיבור עתידי.",
    flightNoNumber: "יש להזין מספר טיסה קודם.", flightLookupLoading: "מחפש נתוני טיסה...", flightLookupError: "לא נמצאו נתונים לטיסה זו, או שהחיבור לשרת נכשל.", flightLookupSuccess: "נתוני הטיסה עודכנו.",
    flightAlreadyLookedUp: "כבר נמשכו נתונים לטיסה זו. שנה את מספר הטיסה כדי לבצע בדיקה חדשה.",
    flightTerminal: "טרמינל", flightGate: "שער",
    chronoWarning: "סדר הרשומות ביום זה אינו כרונולוגי לפי שעה", sortByTime: "מיין לפי שעה",
    addDayModalTitle: "הוספת יום חדש", addDayDate: "תאריך", confirmAdd: "הוסף",
    addDayAutoRecords: "רשומות אוטומטיות ליום", addDayHotel: "מלון", addDayTransport: "תחבורה", addDayPoi: "נקודת עניין",
    demoLocationName: "וותיקן", demoLocationRaw: "Vatican City",
    demoHotelRaw: "Hilton Garden Inn Rome Airport", demoHotelAlias: "הילטון גארדן אין רומא",
    demoRestaurantRaw: "Ristorante dei Musei", demoRestaurantName: "מסעדת המוזיאון",
    pickSavedHotel: "בחר ממלונות שמורים", noSavedHotels: "אין עדיין מלונות שמורים — הם יישמרו אוטומטית ככל שתשתמש בהם.",
    pickTripHotel: "בחר ממלונות הטיול", noTripHotels: "אין עדיין מלונות בטיול זה — הוסף מלון דרך אשף הטיול.",
    verify: "אמת מול מפות", verified: "מאומת", openMap: "פתח במפה", pickFromMap: "בחר מהמפה", moreDetails: "עוד פרטים",
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
    locFallbackNoResults: "Google Places אינו זמין כרגע. נעשה ניסיון חיפוש גיבוי (OpenStreetMap), אך לא נמצאו תוצאות. נסה ניסוח מדויק יותר.",
    uploadFile: "העלה קובץ לרשומה זו", demoNeedsStorage: "העלאת קבצים דורשת שירות אחסון (כמו Supabase Storage או S3), עדיין לא מחובר בפרוטוטייפ. זו הצגה בלבד.",
    attachedFilesCount: "{n} קבצים מצורפים",
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
    newFrameWizard: "מסגרת חדשה עם שאלון", tripWizard: "אשף הטיול", tripWizardActivateAi: "האם להפעיל עוזר AI לתכנון הטיול?",
    wizardTitle: "שאלון תכנון טיול", wizardStepOf: "שלב {n} מתוך {total}",
    wizardTripName: "שם הטיול", wizardTripNameHint: "לדוגמה: הטיול המשפחתי לאיטליה",
    hotelName: "שם המלון", aliasLabel: "כינוי", date: "תאריך", checkIn: "צ'ק-אין", checkOut: "צ'ק-אאוט",
    yes: "כן", no: "לא", skip: "דלג", wizardStartBtn: "התחל",
    preWizardTitle: "ארגן את הטיול הבא", preWizardIntro: "כמה שאלות קצרות יעזרו לנו להקים עבורך את שלד הטיול. אפשר לדלג בכל שלב.",
    preWizardQ1: "מהם יעדי הטיול?", preWizardQ2: "כמה טיסות בינלאומיות מתוכננות?",
    preWizardQ4: "האם מתוכננות טיסות פנים?", preWizardQ5: "כמה טיסות פנים מתוכננות?", preWizardQ6: "בין כמה מקומות לינה תדלגו?",
    preWizardFlightN: "טיסה {n}", preWizardHotelN: "מלון {n}", preWizardFlightDates: "תאריכי טיסה (הלוך – חזור)",
    preWizardDefineIntlFlights: "הגדר טיסות בינלאומיות", preWizardDefineDomesticFlights: "הגדר טיסות פנים", preWizardRoundTrip: "טיסת הלוך וחזור",
    preWizardHasPlan: "האם יש לך תוכנית טיול?", preWizardQName: "שם הטיול", preWizardTravelerCount: "מספר מטיילים", preWizardDestination: "יעד",
    preWizardPreferredDest: "יעדים מועדפים", preWizardAccommodationPrefs: "העדפות לינה", preWizardNotes: "הערות, מגבלות ודרישות לתוכנית הטיול",
    preWizardAiPitch: "יש לי יכולות AI לתכנן לך מסלול טיול על פי הפרמטרים שהזנת. שם הטיול ייקבע לאחר תוצאות ה-AI.", preWizardActivateAi: "הפעל סוכן AI",
    preWizardHasFlights: "האם יש לך כרטיסי טיסה?", preWizardHasDomestic: "האם יש לך כרטיסי טיסות פנים?", preWizardHasHotels: "האם יש לך מלונות?", checkInOut: "צ'ק-אין / צ'ק-אאוט",
    preWizardAiSectionLabel: "רוצה עזרה בתכנון? ספר לנו עוד", preWizardTripDates: "תאריכים",
    preWizardAiPendingName: "טיול בתכנון AI", preWizardAiDemoNotice: "זוהי הדגמה — במוצר האמיתי כאן יופעל סוכן AI שיתכנן עבורך מסלול מלא.",
    preWizardAddFlight: "הוסף טיסה", preWizardAddHotel: "הוסף מלון",
    preWizardSummary: "מוכן! בלחיצה על \"צור טיול\" ניצור עבורך מסגרת ראשית, מסגרת לטיסות הבינלאומיות, ומסגרת נפרדת לכל מלון — עם כל הרשומות ממוקמות לפי התאריכים שהזנת.",
    intlFlightsFrameName: "טיסות בינלאומיות", hotelFrameNameFallback: "מלון",
    newTripAction: "צור טיול חדש", editTripDetails: "ערוך פרטי טיול",
    refreshAllFlights: "ניהול טיסות", flightRefreshRunning: "מרענן טיסות…",
    remindersManagerTitle: "תזכורות והתראות", remindersManagerEmpty: "אין עדיין תזכורות בטיול (מתווספות אוטומטית לרשומות טיסה וצ'ק-אאוט).",
    remindersManagerHint: "כל תזכורת מחושבת אוטומטית מהשעה של הרשומה שלה. אפשר לכבות, או לשנות כמה שעות לפני שהיא תופיע.",
    hoursBeforeShort: "שעות לפני",
    flightManagerTitle: "ניהול טיסות", refreshEligibleNow: "רענן זכאיות עכשיו", refreshNow: "רענן",
    hotelManagerTitle: "ניהול מלונות",
    hotelManagerHint: "חפש ובחר את המיקום המדויק של כל מלון — זה מעדכן את הקואורדינטות והקישור למפה בכל רשומות אותו מלון (צ'ק-אין, צ'ק-אאוט וההעברות) יחד.",
    hotelManagerEmpty: "אין עדיין מסגרות מלון בטיול.", hotelManagerVerified: "מאומת", hotelManagerUnverified: "לא מאומת",
    hotelManagerSearchManually: "חיפוש ידני", hotelManagerShowOnMap: "הצג במפה",
    flightManagerCooldownHint: "טיסות עד {near} ימים נבדקות פעם ביום; טיסות רחוקות יותר — פעם בשבוע. אותה מגבלה חלה גם על כפתור הרענון הפרטני לכל שורה.",
    flightManagerOnCooldown: "בהמתנה",
    flightManagerEmpty: "אין עדיין רשומות טיסה בטיול.",
    flightManagerNoNumber: "אין מספר טיסה",
    flightManagerLastSynced: "סונכרן", flightManagerNeverSynced: "טרם סונכרן", flightManagerNextCheck: "בדיקה הבאה",
    flightManagerUpdated: "עודכן", flightManagerUnchanged: "ללא שינוי",
    flightRefreshSummary: "{updated} עודכנו · {unchanged} ללא שינוי · {skipped} עדיין בהמתנה",
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
    wizardBack: "הקודם", wizardNext: "הבא", wizardCreate: "צור טיול", wizardUpdate: "עדכן טיול",
    computedEndTimeHint: "שדה מחושב לפי מסלול Google Maps, בהתאם לאמצעי התחבורה שנבחר בתיאור.", chronoEndWarning: "רצף השעות (כולל שעות סיום) אינו כרונולוגי.",
    afterMidnightHint: "שעה זו היא לאחר חצות",
    computedStartTimeHint: "שדה שנמשך אוטומטית משעת ההגעה של הרשומה הקודמת.",
    flightLockedHint: "השדה ננעל כי הנתונים נמשכו ממספר טיסה. כדי לערוך ידנית, נקו את שדה מספר הטיסה.",
    noOriginHint: "אין צורך בשדה מוצא עבור סוג רשומה זה.",
    dragDayHint: "גרור להעברת היום למסגרת אחרת", dropDayToRoot: "שחרר כאן כדי להוציא את היום מהמסגרת", showOverallRoute: "הצג מסלול טיול כולל",
    tripSummary: "סיכום הטיול", summaryFlights: "טיסות", summaryHotels: "מלונות", summaryPois: "נק׳ עניין", summaryRestaurants: "מסעדות", summaryAvgRating: "דירוג ממוצע",
    summaryTotal: "סה״כ", summaryKmNoFlights: "ללא טיסות", summaryNights: "לילות", summaryAttractions: "אטרקציות", summaryDayTours: "טיולי יום", summaryGuidedTours: "טיולים מודרכים",
    generateJournal: "הפק יומן מסע", viewFullRouteMap: "הצג מפת מסלול מלאה (ללא טיסות)", noJournalEntries: "אין עדיין רשומות עם \"חוויה אישית\" בטיול הזה.",
    saveTripByName: "שמור טיול בשם", loadSavedTrip: "טען טיול שמור", tripName: "שם הטיול",
    saveTripNote: "כרגע נשמר בדפדפן הזה בלבד (לצורך בדיקות) — בעתיד יישמר לפי משתמש מחובר, נגיש מכל מכשיר.",
    saveTripSuccess: "נשמר בהצלחה", saveTripError: "השמירה נכשלה — ייתכן שאין מספיק מקום אחסון בדפדפן.",
    noSavedTrips: "אין עדיין טיולים שמורים.", load: "טען", confirmDeleteTrip: "למחוק את הטיול השמור הזה?",
    builtInTemplate: "תבנית מובנית — זמינה בכל מכשיר",
    locationSectionLabel: "מיקום וכינוי", copyFromOrigin: "העתק מהמוצא", locationColHeader: "מיקום", aliasColHeader: "כינוי", notesHint: "ההערה תוצג גם בעמודה בטבלה הראשית.",
    personalExperience: "חוויה אישית", personalExperienceHint: "רשמים, טיפים, זיכרונות... (לא מוצג בטבלה)",
    personalRating: "דירוג אישי לרשומה", uploadPhotos: "העלה תמונות",
    hotelInfoDemoNote: "כתובת ומפה — אמיתי (מהמיקום המאומת של הרשומה). תמונה ודירוג בפועל ידרשו חיבור ל-Google Places.",
    warnClosed: "סגור בשעה שנבחרה (לפי שעות פעילות OpenStreetMap)", warnFeeRequired: "דורש רכישת כרטיס כניסה (לפי OpenStreetMap)",
    aiAssistant: "עוזר AI (הדגמה)", ok: "הבנתי", close: "סגור",
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
    catNewFrame: "Frames", catSaveExport: "Save, Import & Export", catSharing: "Sharing", catTools: "Tools", catViews: "Views", catGeneral: "General",
    showHeader: "Show top menu", hideHeader: "Hide top menu",
    columns: "Columns", addColumn: "Add column", addType: "Add description", resetColumnWidths: "Reset column widths (drag a header's edge to resize manually)", actions: "Actions", on: "On", settings: "Settings", manageColumns: "Manage columns", undo: "Undo last action", redo: "Redo action", disableIntro: "Disable the opening animation",
    exportFile: "Save to file", importFile: "Import from file", importSuccess: "Import successful", importError: "This file isn't valid",
    login: "Sign in with Google", logout: "Disconnect", cloudAutoSaveName: "Auto-save",
    cloudSyncTitle: "Cloud Sync", cloudNotConfigured: "Cloud sync isn't configured in this app yet.",
    cloudLoading: "Loading…", cloudSignInHint: "Sign in with Google to save and sync trips across devices.",
    cloudSignInGoogle: "Sign in with Google", cloudTripNamePlaceholder: "Trip name",
    cloudSaving: "Saving…", cloudSaveCurrentTrip: "Save", cloudSaveSuccess: "Saved to the cloud.",
    cloudSaveError: "Save failed, try again.", cloudYourTrips: "Your cloud trips", cloudNoTrips: "No trips saved to the cloud yet.",
    cloudUntitledTrip: "Untitled trip",
    desktop: "Desktop", mobile: "Mobile", flowView: "Flow view", lang: "עברית", editRecord: "Record card",
    save: "Save", cancel: "Cancel", delete: "Delete", addSub: "Sub-record", selectTime: "Select time", done: "Done", clearTime: "Clear",
    amLabel: "AM", pmLabel: "PM",
    deleteFrameTitle: "Delete Frame", deleteFrameHint: "How would you like to delete this frame?",
    preFlightChecklist: "Pre-Flight Checklist", checklistReservations: "Reservations", checklistDocuments: "Travel Documents", checklistOther: "Additional",
    helpCenterTitle: "Help Center",
    fileManagerTitle: "File Manager", fileManagerFilter_all: "All", fileManagerFilter_byCategory: "By Category", fileManagerFilter_images: "Images", fileManagerFilter_documents: "Documents",
    fileManagerRecordsFolder: "Trip Records", fileSortName: "Name", fileSortDate: "Date", fileSortSize: "Size",
    fileUploading: "Uploading file…", fileUploadSuccess: "File uploaded and saved to the cloud.", fileUploadError: "File upload failed, try again.",
    fileUploadNeedsSignIn: "The file is only stored temporarily — sign in with Google so it's saved to the cloud and survives a refresh.",
    fileManagerEmpty: "No files uploaded yet. Files you upload anywhere in the app (like the checklist) will appear here.",
    checklistShopping: "Shopping List", checklistPacking: "Flight Packing", checklistUpload: "Upload document", checklistAddItem: "Add item...",
    checklistDocTitlePrompt: "Short title for this file (shown as a tooltip when hovering the icon):",
    checklistPackingSub: "{n} of {total} done", checklistShoppingSub: "{n} items", checklistShoppingEmpty: "List is empty — add an item below",
    deleteFrameOnly: "Delete frame only (content moves to parent)", deleteFrameWithContent: "Delete frame and all its content",
    type: "Description", from: "Origin", to: "Destination", start: "At", end: "Until", overnight: "Crosses midnight", arrivalMethod: "Arrival method",
    addTransferToAirport: "Add transfer record — to the airport", addTransferFromAirport: "Add transfer record — from the airport",
    stayDuration: "Stay duration", stayDurationHint: "How long you stay at the destination — determines the end time (arrival + stay).",
    stayNone: "No stay", minutesShort: "min", hoursShort: "hr", stayAtDestination: "Stay at destination", hourLetter: "h",
    typeKindDesc: "Description", typeKindArrival: "Arrival method",
    requiresTicket: "Requires entrance ticket", calcRoute: "Calculate route",
    ticketPurchased: "Ticket purchased", flightCheckedIn: "Flight check-in done",
    tripAlerts: "Trip alerts", noTripAlerts: "No open alerts right now.",
    routeErrNoOrigin: "No origin available for calculation (not even from the previous record)", routeErrNoDest: "This record has no destination",
    routeErrGeocodeOrigin: "Couldn't locate the origin", routeErrGeocodeDest: "Couldn't locate the destination",
    routeErrNoRoute: "No route found between these points", routeErrNetwork: "Network error during calculation",
    destination: "Venue", link: "Booking link", maplink: "Map / route link",
    flightNo: "Flight number", cost: "Cost", currency: "Currency", notes: "Notes", frame: "Frame",
    flightNoCheck: "Flight number check", flightNoCheckHint: "Optional — if entered, the fetched data will take precedence",
    flightNoCheckReturn: "Flight number check — return (optional — if entered, the fetched data will take precedence)",
    flightDepTime: "Departure time", flightLandTime: "Landing time",
    noFrame: "No frame (top level)", selectType: "Select...",
    newType: "New description", typeName: "Description name", add: "Add", searchTypes: "Search description...",
    totalPerCurrency: "Trip total", timeError: "End time is before start time — check \"crosses midnight\" for overnight legs",
    noRows: "No records here yet", dragHint: "Drag to reorder", mockNote: "*Sign-in is a prototype mock only",
    frameModalNew: "New trip frame", frameModalEdit: "Edit frame", frameName: "Frame name",
    frameTypeLabel: "Frame type", frameTypeBasic: "Basic", frameTypeTrip: "Trip", frameTypeFlight: "Flight", frameTypeHotel: "Hotel",
    frameStart: "Start date", frameEnd: "End date", frameDateRange: "Date range", parentFrame: "Belongs to frame",
    addSubFrame: "Add sub-frame", suggestPrefix: "Found", suggestMid: "flights without a frame:", moreOptions: "More options", editFrame: "Edit frame",
    fillDatesAbove: "Add frame above the existing date", fillDatesBelow: "Add frame below the existing date",
    suggestBtn: "Auto-create a trip frame", suggestDismiss: "Dismiss",
    fxApprox: "Approximate rate (no internet connection)", fxLive: "Live rate",
    frameRangeInvalid: "Start date must be before the end date",
    frameRangeContent: "The date range must cover all records/sub-frames already inside this frame",
    frameRangeParent: "The date range must fit inside the containing frame's range",
    rowOutOfFrame: "The date must fall inside the frame this record belongs to",
    routeTooltip: "Open route in Google Maps", dayRoute: "Route", addDayShort: "Day", addRowShort: "Record", noRoute: "Not enough location data",
    fetchFlightData: "Fetch data", flightApiMissing: "Live lookup needs a flight-data provider (e.g. AeroDataBox) with an API key and a server-side proxy. This field is ready to be wired up later.",
    flightNoNumber: "Enter a flight number first.", flightLookupLoading: "Looking up flight data...", flightLookupError: "No data found for this flight, or the server connection failed.", flightLookupSuccess: "Flight data updated.",
    flightAlreadyLookedUp: "Data was already fetched for this flight. Change the flight number to look up again.",
    flightTerminal: "Terminal", flightGate: "Gate",
    chronoWarning: "Records on this day are not in chronological time order", sortByTime: "Sort by time",
    addDayModalTitle: "Add a new day", addDayDate: "Date", confirmAdd: "Add",
    addDayAutoRecords: "Automatic records for the day", addDayHotel: "Hotel", addDayTransport: "Transportation", addDayPoi: "Point of interest",
    demoLocationName: "Vatican", demoLocationRaw: "Vatican City",
    demoHotelRaw: "Hilton Garden Inn Rome Airport", demoHotelAlias: "Hilton Garden Inn Rome",
    demoRestaurantRaw: "Ristorante dei Musei", demoRestaurantName: "Museum Restaurant",
    pickSavedHotel: "Pick from saved hotels", noSavedHotels: "No saved hotels yet — they'll be remembered automatically as you use them.",
    pickTripHotel: "Pick from trip hotels", noTripHotels: "No hotels in this trip yet — add one via the trip wizard.",
    verify: "Verify with Maps", verified: "Verified", openMap: "Open in Maps", pickFromMap: "Pick from map", moreDetails: "More details",
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
    locFallbackNoResults: "Google Places is currently unavailable. A backup search (OpenStreetMap) was attempted but found no results. Try a more precise search term.",
    uploadFile: "Upload a file for this record", demoNeedsStorage: "File uploads need a storage service (like Supabase Storage or S3), not yet connected in the prototype. This is a preview only.",
    attachedFilesCount: "{n} attached files",
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
    newFrameWizard: "New frame via questionnaire", tripWizard: "Trip Wizard", tripWizardActivateAi: "Activate the AI assistant for trip planning?",
    wizardTitle: "Trip planning questionnaire", wizardStepOf: "Step {n} of {total}",
    wizardTripName: "Trip name", wizardTripNameHint: "e.g. Our family trip to Italy",
    hotelName: "Hotel name", aliasLabel: "Nickname", date: "Date", checkIn: "Check-in", checkOut: "Check-out",
    yes: "Yes", no: "No", skip: "Skip", wizardStartBtn: "Start",
    preWizardTitle: "Organize your next trip", preWizardIntro: "A few quick questions will help us set up the trip skeleton for you. You can skip at any step.",
    preWizardQ1: "What are the trip's destinations?", preWizardQ2: "How many international flights are planned?",
    preWizardQ4: "Are domestic flights planned?", preWizardQ5: "How many domestic flights are planned?", preWizardQ6: "How many lodging places will you hop between?",
    preWizardFlightN: "Flight {n}", preWizardHotelN: "Hotel {n}", preWizardFlightDates: "Flight dates (there – back)",
    preWizardDefineIntlFlights: "Define international flights", preWizardDefineDomesticFlights: "Define domestic flights", preWizardRoundTrip: "Round-trip flight",
    preWizardHasPlan: "Do you already have a trip plan?", preWizardQName: "Trip name", preWizardTravelerCount: "Number of travelers", preWizardDestination: "Destination",
    preWizardPreferredDest: "Preferred destinations", preWizardAccommodationPrefs: "Accommodation preferences", preWizardNotes: "Notes, constraints and requirements for the trip plan",
    preWizardAiPitch: "I have AI capabilities to plan a route for you based on the parameters you entered. The trip name will be set after the AI results.", preWizardActivateAi: "Activate AI agent",
    preWizardHasFlights: "Do you have flight tickets?", preWizardHasDomestic: "Do you have domestic flight tickets?", preWizardHasHotels: "Do you have hotels?", checkInOut: "Check-in / Check-out",
    preWizardAiSectionLabel: "Want planning help? Tell us more", preWizardTripDates: "Dates",
    preWizardAiPendingName: "AI-planned trip", preWizardAiDemoNotice: "This is a demo — in the real product, an AI agent would plan a full itinerary for you here.",
    preWizardAddFlight: "Add flight", preWizardAddHotel: "Add hotel",
    preWizardSummary: "Ready! Clicking \"Create trip\" will create a main frame, a frame for international flights, and a separate frame for each hotel — with all records placed according to the dates you entered.",
    intlFlightsFrameName: "International Flights", hotelFrameNameFallback: "Hotel",
    newTripAction: "Create new trip", editTripDetails: "Edit trip details",
    refreshAllFlights: "Flight management", flightRefreshRunning: "Refreshing flights…",
    remindersManagerTitle: "Reminders & Alerts", remindersManagerEmpty: "No reminders yet (added automatically to flight and check-out records).",
    remindersManagerHint: "Each reminder is computed from its record's own time. Turn any off, or change how many hours before it fires.",
    hoursBeforeShort: "hours before",
    flightManagerTitle: "Flight Manager", refreshEligibleNow: "Refresh eligible now", refreshNow: "Refresh",
    hotelManagerTitle: "Hotel Manager",
    hotelManagerHint: "Search and pick each hotel's exact location — this updates the coordinates and map link across every record for that hotel (check-in, check-out, and transfers) together.",
    hotelManagerEmpty: "No hotel frames in this trip yet.", hotelManagerVerified: "Verified", hotelManagerUnverified: "Not verified",
    hotelManagerSearchManually: "Search manually", hotelManagerShowOnMap: "Show on map",
    flightManagerCooldownHint: "Flights within {near} days are checked daily; farther-out flights weekly. The same limit now applies to each row's individual refresh button too.",
    flightManagerOnCooldown: "On cooldown",
    flightManagerEmpty: "No flight records in this trip yet.",
    flightManagerNoNumber: "No flight number",
    flightManagerLastSynced: "Synced", flightManagerNeverSynced: "Never synced", flightManagerNextCheck: "Next check",
    flightManagerUpdated: "Updated", flightManagerUnchanged: "Unchanged",
    flightRefreshSummary: "{updated} updated · {unchanged} unchanged · {skipped} still on cooldown",
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
    wizardBack: "Back", wizardNext: "Next", wizardCreate: "Create trip", wizardUpdate: "Update trip",
    computedEndTimeHint: "Computed from the Google Maps route, based on the transportation mode selected in the description.", chronoEndWarning: "The time sequence (including end times) isn't chronological.",
    afterMidnightHint: "This time is after midnight",
    computedStartTimeHint: "Automatically pulled from the previous record's arrival time.",
    flightLockedHint: "Locked because this data was pulled from a flight number. Clear the flight number field to edit manually.",
    noOriginHint: "No origin field is needed for this record type.",
    dragDayHint: "Drag to move this day to another frame", dropDayToRoot: "Drop here to take this day out of its frame", showOverallRoute: "Show overall trip route",
    tripSummary: "Trip summary", summaryFlights: "Flights", summaryHotels: "Hotels", summaryPois: "Points of interest", summaryRestaurants: "Restaurants", summaryAvgRating: "Average rating",
    summaryTotal: "total", summaryKmNoFlights: "excluding flights", summaryNights: "nights", summaryAttractions: "attractions", summaryDayTours: "day tours", summaryGuidedTours: "guided tours",
    generateJournal: "Generate travel journal", viewFullRouteMap: "View full route map (excluding flights)", noJournalEntries: "No records with \"personal experience\" yet in this trip.",
    saveTripByName: "Save trip by name", loadSavedTrip: "Load saved trip", tripName: "Trip name",
    saveTripNote: "Currently saved in this browser only (for testing) — in the future it will save per logged-in user, accessible from any device.",
    saveTripSuccess: "Saved successfully", saveTripError: "Save failed — the browser may be out of storage space.",
    noSavedTrips: "No saved trips yet.", load: "Load", confirmDeleteTrip: "Delete this saved trip?",
    builtInTemplate: "Built-in template — available on every device",
    locationSectionLabel: "Location & nickname", copyFromOrigin: "Copy from origin", locationColHeader: "Location", aliasColHeader: "Nickname", notesHint: "The note is also shown in the main table column.",
    personalExperience: "Personal experience", personalExperienceHint: "Impressions, tips, memories... (not shown in the table)",
    personalRating: "Personal rating for this record", uploadPhotos: "Upload photos",
    hotelInfoDemoNote: "Address and map link — real (from the record's verified location). An actual photo and rating would need a Google Places connection.",
    warnClosed: "Closed at the scheduled time (per OpenStreetMap opening hours)", warnFeeRequired: "Requires an entry ticket (per OpenStreetMap)",
    aiAssistant: "AI Assistant (preview)", ok: "Got it", close: "Close",
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
function useFloatingMenu(open, onOpenChange) {
  const { refs, floatingStyles, context } = useFloating({
    open, onOpenChange,
    placement: "bottom-end",
    strategy: "fixed",
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const click = useClick(context);
  const dismiss = useDismiss(context, {
    outsidePress: (event) => !event.target.closest(".mt-help-popover, .mt-help-btn"),
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);
  return { refs, floatingStyles, getReferenceProps, getFloatingProps };
}
function toLocalISODate(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
/* Default reminder/alert rules per record type. Each rule fires at rowAnchorTime + offsetMinutes
   (offset is negative = before the anchor). 'kind' is 'reminder' (heads-up, less urgent) or 'alert'
   (more urgent, closer to the moment). These are starting defaults — every instance can be enabled/
   disabled or time-shifted individually from the reminders management page; adjusting a rule here
   only changes what NEW/unconfigured rows default to. */
const REMINDER_TYPE_DEFAULTS = {
  flight: [
    { id: "checkin_online", kind: "reminder", anchor: "start", offsetMinutes: -3 * 24 * 60, label_he: "בצע צ'ק-אין מקוון", label_en: "Do online check-in" },
    { id: "head_to_airport_early", kind: "reminder", anchor: "start", offsetMinutes: -7 * 60, label_he: "צא לשדה התעופה", label_en: "Head to the airport" },
    { id: "head_to_airport_alert", kind: "alert", anchor: "start", offsetMinutes: -4 * 60, label_he: "הגעה לשדה התעופה", label_en: "Arrive at the airport" },
    { id: "boarding", kind: "alert", anchor: "start", offsetMinutes: -2 * 60, label_he: "עלייה לטיסה", label_en: "Boarding" },
  ],
  "domestic-flight": [
    { id: "head_to_airport_early", kind: "reminder", anchor: "start", offsetMinutes: -3 * 60, label_he: "צא לשדה התעופה", label_en: "Head to the airport" },
    { id: "head_to_airport_alert", kind: "alert", anchor: "start", offsetMinutes: -2 * 60, label_he: "הגעה לשדה התעופה", label_en: "Arrive at the airport" },
    { id: "boarding", kind: "alert", anchor: "start", offsetMinutes: -45, label_he: "עלייה לטיסה", label_en: "Boarding" },
  ],
  checkout: [
    { id: "before_checkout", kind: "reminder", anchor: "start", offsetMinutes: -24 * 60, label_he: "לפני צ'ק-אאוט מהמלון", label_en: "Before hotel check-out" },
  ],
};
/* Combines a row's date with one of its time fields into a real Date object. Handles the case where
   endTime is on the next calendar day (the `overnight` flag) — startTime is always assumed to be on
   the row's own date. */
function rowAnchorDateTime(row, anchor) {
  if (!row.date) return null;
  const time = anchor === "end" ? row.endTime : row.startTime;
  if (!time) return null;
  const [y, m, d] = row.date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  let dt = new Date(y, m - 1, d, hh, mm);
  if (anchor === "end" && row.overnight) dt = new Date(dt.getTime() + 24 * 60 * 60 * 1000);
  return dt;
}
/* Builds the full, chronologically-sorted list of reminder/alert instances for the whole trip:
   one entry per (row, rule) pair from REMINDER_TYPE_DEFAULTS, with any per-row overrides applied
   (row.reminderSettings[ruleId] = { enabled, offsetMinutes }), skipping rows missing the anchor time
   needed to compute it. */
function buildReminderInstances(rows) {
  const out = [];
  rows.forEach((row) => {
    const rules = REMINDER_TYPE_DEFAULTS[row.typeId];
    if (!rules) return;
    const overrides = row.reminderSettings || {};
    rules.forEach((rule) => {
      const override = overrides[rule.id] || {};
      if (override.enabled === false) return;
      const offsetMinutes = override.offsetMinutes != null ? override.offsetMinutes : rule.offsetMinutes;
      const anchorDt = rowAnchorDateTime(row, rule.anchor);
      if (!anchorDt) return;
      const fireAt = new Date(anchorDt.getTime() + offsetMinutes * 60000);
      out.push({ rowId: row.id, ruleId: rule.id, kind: rule.kind, label_he: rule.label_he, label_en: rule.label_en, offsetMinutes, fireAt, row });
    });
  });
  out.sort((a, b) => a.fireAt - b.fireAt);
  return out;
}
function heDay(dateStr, lang) { if (!dateStr) return "—"; const d = new Date(dateStr + "T00:00:00"); if (isNaN(d)) return "—"; return lang === "he" ? HE_DAYS[d.getDay()] : EN_DAYS[d.getDay()]; }
function fmtDate(dateStr, lang) { if (!dateStr) return "—"; const d = new Date(dateStr + "T00:00:00"); if (isNaN(d)) return dateStr; const dd = String(d.getDate()).padStart(2, "0"); const mm = String(d.getMonth() + 1).padStart(2, "0"); return `${dd}/${mm}/${d.getFullYear()}`; }
function formatDayCount(n, lang) {
  if (lang === "he") return n === 1 ? "יום 1" : `${n} ימים`;
  return n === 1 ? "1 day" : `${n} days`;
}
function dayOfMonth(dateStr) { const d = new Date(dateStr + "T00:00:00"); return isNaN(d) ? "—" : d.getDate(); }
function monthAbbrev(dateStr, lang) {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return "";
  return d.toLocaleDateString(lang === "he" ? "he-IL" : "en-US", { month: "short" }).replace(".", "");
}
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
function isFlightType(typeId) { return typeId === "flight" || typeId === "domestic-flight"; }
function noOriginNeeded(typeId) { return !isFlightType(typeId); }
function isAccommodationType(typeId) { return typeId === "checkin" || typeId === "checkout" || typeId === "hostel" || typeId === "apartment"; }

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
function childFramesPure(frames, pid) {
  return frames.filter((f) => f.parentFrameId === pid).sort((a, b) => {
    const startCmp = (a.startDate || "").localeCompare(b.startDate || "");
    if (startCmp !== 0) return startCmp;
    return (a.endDate || "").localeCompare(b.endDate || "");
  });
}
function effectiveFrameTypeOf(frame, rows) {
  if (!frame) return null;
  if (frame.frameType === "basic") return null;
  if (frame.frameType) return frame.frameType;
  if (!frame.parentFrameId) return "trip";
  if (rows.some((r) => r.frameId === frame.id && (r.typeId === "checkin" || r.typeId === "checkout"))) return "hotel";
  if (rows.some((r) => r.frameId === frame.id && (r.typeId === "flight" || r.typeId === "domestic-flight"))) return "flight";
  return null;
}
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
const TYPE_STAY_MINUTES_DEFAULTS = { flight: 120, "domestic-flight": 60, checkin: 30, checkout: 30 };
function getDefaultStayMinutes(typeId) { return TYPE_STAY_MINUTES_DEFAULTS[typeId] != null ? TYPE_STAY_MINUTES_DEFAULTS[typeId] : 0; }
function pad2(n) { return String(n).padStart(2, "0"); }
function addMinutesToTime(time, minutes) {
  const [h, m] = time.split(":").map(Number);
  const total = (h * 60 + m + Math.round(minutes) + 1440) % 1440;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}
/* Builds the same visual top-to-bottom row order used throughout the app (days, then nested frames),
   but as a pure function of (rows, frames) so it can be re-run on any candidate array — not just current state. */
function buildGlobalRowOrderPure(rows, frames, fid) {
  const cf = childFramesPure(frames, fid || null);
  const dg = dayGroupsAtPure(rows, fid || null);
  const nodes = [
    ...cf.map((f) => ({ type: "frame", sort: f.startDate || "", frame: f })),
    ...dg.map((g) => ({ type: "day", sort: g.date, group: g })),
  ].sort((a, b) => {
    if (a.sort !== b.sort) return a.sort.localeCompare(b.sort);
    if (a.type !== b.type) return a.type === "day" ? -1 : 1;
    return 0;
  });
  let result = [];
  nodes.forEach((n) => {
    if (n.type === "day") result = result.concat(n.group.rows);
    else result = result.concat(buildGlobalRowOrderPure(rows, frames, n.frame.id));
  });
  return result;
}
/* A "movement" record represents departing one place and arriving at another (flight, domestic
   flight, transfer) — its startTime is when you leave, and its endTime is when you arrive, i.e.
   startTime + its own travel duration. A "dwell" record (checkin, checkout, poi, attraction, ...)
   represents being at a place — its startTime is when you arrive (previous departure + travel time
   to get there), and its endTime is when you leave, i.e. startTime + the type's default dwell time. */
function isDwellType(typeId) { return typeId === "checkin" || typeId === "checkout"; }
function isMovementType(typeId) { return !isDwellType(typeId); }
const FLIGHT_REFRESH_NEAR_DAYS = 3;
const FLIGHT_REFRESH_NEAR_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const FLIGHT_REFRESH_FAR_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
/* Whether a flight row is due for a bulk refresh: flights departing soon (within
   FLIGHT_REFRESH_NEAR_DAYS) get checked daily; flights further out are checked weekly, to avoid
   burning through the flight-data API's rate limit on schedules that rarely change far in advance. */
function shouldFetchFlight(row, nowMs) {
  if (!row.flightNumber || !row.flightNumber.trim()) return false;
  if (!row.flightLastFetchedAt) return true;
  const [y, m, d] = (row.date || "").split("-").map(Number);
  if (!y) return true;
  const daysUntil = (new Date(y, m - 1, d).getTime() - new Date(nowMs).setHours(0, 0, 0, 0)) / 86400000;
  const cooldown = daysUntil <= FLIGHT_REFRESH_NEAR_DAYS ? FLIGHT_REFRESH_NEAR_COOLDOWN_MS : FLIGHT_REFRESH_FAR_COOLDOWN_MS;
  return nowMs - row.flightLastFetchedAt >= cooldown;
}
/* When the bulk refresh will next consider this flight eligible again — null means "now". */
function nextFetchEligibleAt(row, nowMs) {
  if (!row.flightLastFetchedAt) return null;
  const [y, m, d] = (row.date || "").split("-").map(Number);
  if (!y) return null;
  const daysUntil = (new Date(y, m - 1, d).getTime() - new Date(nowMs).setHours(0, 0, 0, 0)) / 86400000;
  const cooldown = daysUntil <= FLIGHT_REFRESH_NEAR_DAYS ? FLIGHT_REFRESH_NEAR_COOLDOWN_MS : FLIGHT_REFRESH_FAR_COOLDOWN_MS;
  const eligibleAt = row.flightLastFetchedAt + cooldown;
  return eligibleAt > nowMs ? eligibleAt : null;
}
/* Simple relative-time label ("3h ago" / "in 2d") for the flight manager panel — doesn't need
   locale-perfect grammar, just a quick, readable indicator of freshness. */
function formatRelativeTime(ms, nowMs, lang) {
  const diffMin = Math.round((ms - nowMs) / 60000);
  const past = diffMin < 0;
  const abs = Math.abs(diffMin);
  let value, unit;
  if (abs < 60) { value = abs; unit = lang === "he" ? "דק'" : "m"; }
  else if (abs < 1440) { value = Math.round(abs / 60); unit = lang === "he" ? "שע'" : "h"; }
  else { value = Math.round(abs / 1440); unit = lang === "he" ? "ימים" : "d"; }
  if (lang === "he") return past ? `לפני ${value} ${unit}` : `בעוד ${value} ${unit}`;
  return past ? `${value}${unit} ago` : `in ${value}${unit}`;
}
/* Recomputes every auto (non-manually-edited) start/end time in the whole trip, in one continuous
   forward pass over the visual row order. Manually-set fields (Auto === false) are never overwritten,
   but their value is still used as the anchor for computing whatever comes after them — so one manual
   entry no longer blocks the rest of the chain from updating. This is re-run after every rows mutation
   (add/delete/reorder/edit/route-duration arrival), so times stay live and don't require a manual
   "recalculate" step. The chain runs continuously across the whole trip (not reset per calendar day):
   an overnight leg that lands after midnight is still dated the day it departed, so the next day's
   first record must still be able to inherit its arrival time — resetting at the date boundary would
   silently break exactly that link.
   Movement vs. dwell: almost every record represents traveling to a new point — a flight, a transfer,
   but also a POI, an attraction, a restaurant, and so on. For these, startTime is inherited exactly as
   the previous stop left off (no travel time added before you can even leave), and endTime is start +
   this row's own point-to-point route duration (when you actually arrive).
   One consistent rule for every record's own duration: startTime to endTime is always just the literal
   travel between that record's own two points (0 when they're the same point, like a check-in whose
   from/to are both the hotel) — its own stayDurationMin is NEVER part of that. Stay only ever affects
   what comes AFTER: the anchor handed to the next record always adds the previous record's stay on
   top of its endTime, so "time spent here" shows up as the next record's start, never as this record's
   own end. This is uniform across every type and regardless of whether the time was manual or auto.
   Flight-type rows are one exception for their OWN end: their routeDurationMin is a driving-distance
   estimate between airports (meaningless for actual flight time), so it's never used for them; they
   fall back to the type's default duration guess instead, pending a real flight lookup.
   Every auto-computed field is tagged with its source so the UI can indicate provenance without
   guessing: a start time is always 'inherited' (it's a handoff from whatever came before, whether or
   not travel time was added getting here), and an end time is always 'computed' (it's derived from
   this row's own start plus its own duration).
   Day boundary: the chain only carries across a change in the row's own `date` field when the row
   that's about to become the anchor is explicitly marked `overnight` (the "crosses midnight" checkbox)
   — that's what makes an overnight flight's next-day arrival a valid anchor for the first record of
   the following day. Any other day change resets the chain, so a later, unrelated day (e.g. day 3 of
   a multi-day hotel stay) doesn't silently inherit a time from days earlier. When this engine computes
   a row's own end time and it wraps past midnight relative to its start, `overnight` is set to true to
   keep that flag (and computeDuration, which relies on it) correct without a manual toggle. */
function recomputeChainTimesPure(rows, frames) {
  const order = buildGlobalRowOrderPure(rows, frames, null);
  const patches = new Map();
  let prevInDate = null;
  let prevDate;
  for (const raw of order) {
    const cur = { ...raw, ...(patches.get(raw.id) || {}) };
    if (cur.date !== prevDate) {
      if (!(prevInDate && prevInDate.overnight)) prevInDate = null;
      prevDate = cur.date;
    }
    const patch = {};
    const startBroken = cur.startTimeAuto === false && !cur.startTime;
    const endBroken = cur.endTimeAuto === false && !cur.endTime;
    if ((cur.startTimeAuto !== false || startBroken) && prevInDate && prevInDate.endTime) {
      const prevStay = prevInDate.stayDurationMin != null ? prevInDate.stayDurationMin : getDefaultStayMinutes(prevInDate.typeId);
      const anchor = addMinutesToTime(prevInDate.endTime, prevStay);
      if (anchor !== cur.startTime) patch.startTime = anchor;
      patch.startTimeSource = "inherited";
      if (startBroken) patch.startTimeAuto = true;
    }
    const effectiveStart = patch.startTime !== undefined ? patch.startTime : cur.startTime;
    if ((cur.endTimeAuto !== false || endBroken) && effectiveStart) {
      const duration = isFlightType(cur.typeId)
        ? (cur.stayDurationMin != null ? cur.stayDurationMin : getDefaultStayMinutes(cur.typeId))
        : (cur.routeDurationMin != null ? cur.routeDurationMin : 0);
      const newEnd = addMinutesToTime(effectiveStart, duration);
      if (newEnd !== cur.endTime) patch.endTime = newEnd;
      patch.endTimeSource = "computed";
      if (endBroken) patch.endTimeAuto = true;
      if (newEnd < effectiveStart) { if (!cur.overnight) patch.overnight = true; }
      else if (cur.overnight) patch.overnight = false;
    }
    if (Object.keys(patch).length) patches.set(raw.id, patch);
    prevInDate = { ...cur, ...patch };
  }
  if (!patches.size) return rows;
  return rows.map((r) => (patches.has(r.id) ? { ...r, ...patches.get(r.id) } : r));
}
const TIME_FIELD_COLORS = { computed: "#2E9B57", inherited: "#3E7CB1", api: "#C9971E" };
/* Determines which of the three provenance colors (if any) applies to a row's start/end time field.
   'field' is 'start' or 'end'. Manual, plain user-typed values get no color at all. */
function timeFieldColor(row, field) {
  const time = field === "start" ? row.startTime : row.endTime;
  if (!time) return null;
  const auto = field === "start" ? row.startTimeAuto : row.endTimeAuto;
  const source = field === "start" ? row.startTimeSource : row.endTimeSource;
  if (auto === false) return source === "api" ? TIME_FIELD_COLORS.api : null;
  return source === "inherited" ? TIME_FIELD_COLORS.inherited : TIME_FIELD_COLORS.computed;
}
/* The stay duration at the row's own location, e.g. "שהות ביעד - 0.5 ש" for 30 minutes —
   informational only, never baked into the time field's own value. */
function formatStayAnnotation(minutes, T) {
  const m = minutes != null ? minutes : 0;
  if (m <= 0) return null;
  const hours = Number((m / 60).toFixed(2));
  return `${T.stayAtDestination} - ${hours} ${T.hourLetter}`;
}
const TRAVEL_MODE_MAP = {
  taxi: "driving", "car-rental": "driving", caravan: "driving", motorcycle: "driving",
  bicycle: "bicycling", scooter: "bicycling", walking: "walking",
  train: "transit", "high-speed-train": "transit", bus: "transit",
  "self-tour": "walking", "guided-tour": "walking", "day-tour": "walking",
  flight: "flying", "domestic-flight": "flying",
};
function effectiveTransportType(row) {
  return noOriginNeeded(row.typeId) ? (row.arrivalTypeId || "walking") : row.typeId;
}
function rowOwnRouteUrl(row, prevRow) {
  const ownFrom = (!noOriginNeeded(row.typeId) && row.from && row.from.trim()) ? rowStartPoint(row) : "";
  const prevTo = prevRow ? rowEndPoint(prevRow) : "";
  const origin = ownFrom || prevTo;
  const dest = rowEndPoint(row);
  if (!origin || !dest || origin === dest) return null;
  const mode = TRAVEL_MODE_MAP[effectiveTransportType(row)];
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
/* True for a bare "lat, lon" string (e.g. "13.12345, 100.45678") — used to stop such a string from
   ever being stored as a location's actual name when reverse-geocoding can't find a real address. */
function looksLikeCoordinates(text) {
  return typeof text === "string" && /^-?\d{1,3}(\.\d+)?,\s*-?\d{1,3}(\.\d+)?$/.test(text.trim());
}
const __geocodeCache = new Map();
const CACHE_MAX_ENTRIES = 300;
const DAY_MS = 24 * 60 * 60 * 1000;
const LOCATION_ID_CACHE_KEY = "mytrip_cache_location_id";
const LOCATION_ID_TTL_MS = 30 * DAY_MS;
const LOCATION_DETAILS_CACHE_KEY = "mytrip_cache_location_details";
const LOCATION_DETAILS_TTL_MS = 7 * DAY_MS;
const ROUTE_CACHE_KEY = "mytrip_cache_routes";
const ROUTE_TTL_MS = 90 * DAY_MS;

function readJsonCache(key) {
  try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch (e) { return {}; }
}
function getCacheEntry(key, cacheKey, ttlMs) {
  const cache = readJsonCache(key);
  const entry = cache[cacheKey];
  if (!entry) return null;
  if (Date.now() - entry.t > ttlMs) return null;
  return entry.v;
}
function setCacheEntry(key, cacheKey, value) {
  const cache = readJsonCache(key);
  cache[cacheKey] = { v: value, t: Date.now() };
  const keys = Object.keys(cache);
  if (keys.length > CACHE_MAX_ENTRIES) {
    keys.sort((a, b) => cache[a].t - cache[b].t)
      .slice(0, keys.length - CACHE_MAX_ENTRIES)
      .forEach((k) => delete cache[k]);
  }
  try { localStorage.setItem(key, JSON.stringify(cache)); } catch (e) {}
}
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
  const cacheKey = (lang === "he" ? "he" : "en") + "|" + input.trim().toLowerCase();
  const cached = getCacheEntry(LOCATION_ID_CACHE_KEY, cacheKey, LOCATION_ID_TTL_MS);
  if (cached) return Promise.resolve(cached);
  return fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GOOGLE_PLACES_KEY },
    body: JSON.stringify({ input, languageCode: lang === "he" ? "he" : "en" }),
  })
    .then((r) => { if (!r.ok) return extractGoogleApiError(r); return r.json(); })
    .then((data) => (data.suggestions || [])
      .map((s) => s.placePrediction)
      .filter(Boolean)
      .map((p) => ({ placeId: p.placeId, text: (p.text && p.text.text) || "" })))
    .then((results) => { setCacheEntry(LOCATION_ID_CACHE_KEY, cacheKey, results); return results; });
}
function googlePlaceDetails(placeId, lang) {
  if (!GOOGLE_PLACES_KEY || !placeId) return Promise.resolve(null);
  const cacheKey = (lang === "he" ? "he" : "en") + "|" + placeId;
  const cached = getCacheEntry(LOCATION_DETAILS_CACHE_KEY, cacheKey, LOCATION_DETAILS_TTL_MS);
  if (cached) return Promise.resolve(cached);
  const fieldMask = "displayName,formattedAddress,location,rating,userRatingCount,photos,regularOpeningHours,priceLevel,internationalPhoneNumber,websiteUri";
  return fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=${lang === "he" ? "he" : "en"}`, {
    headers: { "X-Goog-Api-Key": GOOGLE_PLACES_KEY, "X-Goog-FieldMask": fieldMask },
  }).then((r) => { if (!r.ok) return extractGoogleApiError(r); return r.json(); })
    .then((data) => { setCacheEntry(LOCATION_DETAILS_CACHE_KEY, cacheKey, data); return data; });
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
  const cacheKey = (lang === "he" ? "he" : "en") + "|textsearch|" + query.trim().toLowerCase();
  const cached = getCacheEntry(LOCATION_DETAILS_CACHE_KEY, cacheKey, LOCATION_DETAILS_TTL_MS);
  if (cached !== null) return Promise.resolve(cached);
  const fieldMask = "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos,places.regularOpeningHours";
  return fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GOOGLE_PLACES_KEY, "X-Goog-FieldMask": fieldMask },
    body: JSON.stringify({ textQuery: query, languageCode: lang === "he" ? "he" : "en" }),
  })
    .then((r) => { if (!r.ok) return extractGoogleApiError(r); return r.json(); })
    .then((data) => (data.places && data.places[0]) || null)
    .then((result) => { setCacheEntry(LOCATION_DETAILS_CACHE_KEY, cacheKey, result); return result; });
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
      [field + "VerifiedUrl"]: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`, [field + "VerifiedText"]: text,
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
function nominatimSearch(query, lang) {
  if (!query || !query.trim()) return Promise.resolve([]);
  return throttledCall(() => fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&accept-language=${lang === "he" ? "he,en" : "en"}&q=${encodeURIComponent(query)}`, { headers: { Accept: "application/json" } })
    .then((r) => { if (!r.ok) throw new Error("http-" + r.status); return r.json(); }))
    .then((data) => (data || []).map((d) => ({
      source: "nominatim", lat: Number(d.lat), lon: Number(d.lon), text: d.display_name || d.name || query,
    })));
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
  const cacheKey = p + "|" + a.lat.toFixed(5) + "," + a.lon.toFixed(5) + "|" + b.lat.toFixed(5) + "," + b.lon.toFixed(5);
  const cached = getCacheEntry(ROUTE_CACHE_KEY, cacheKey, ROUTE_TTL_MS);
  if (cached) return Promise.resolve(cached);
  return throttledCall(() => fetch(`https://router.project-osrm.org/route/v1/${p}/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`)
    .then((r) => { if (!r.ok) throw new Error("http-" + r.status); return r.json(); })
    .then((data) => {
      const route = data && data.routes && data.routes[0];
      if (!route) return null;
      const result = { distanceKm: route.distance / 1000, durationMin: route.duration / 60 };
      setCacheEntry(ROUTE_CACHE_KEY, cacheKey, result);
      return result;
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
const __routeCache = new Map();
function fetchRouteInfo(a, b, typeId) {
  const key = `${a.lat.toFixed(5)},${a.lon.toFixed(5)}|${b.lat.toFixed(5)},${b.lon.toFixed(5)}|${typeId}`;
  if (__routeCache.has(key)) return __routeCache.get(key);
  const p = (hasGooglePlaces()
    ? computeGoogleRoute(a, b, googleTravelModeForType(typeId)).then((info) => info || fetchDrivingRoute(a, b, osrmProfileForType(typeId)))
    : fetchDrivingRoute(a, b, osrmProfileForType(typeId))
  ).then((info) => { if (!info) __routeCache.delete(key); return info; })
   .catch((err) => { __routeCache.delete(key); throw err; });
  __routeCache.set(key, p);
  return p;
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
const __weatherCache = new Map();
function fetchWeather(lat, lon, dateStr) {
  const key = `${Number(lat).toFixed(3)},${Number(lon).toFixed(3)}|${dateStr}`;
  if (__weatherCache.has(key)) return __weatherCache.get(key);
  // Open-Meteo's forecast endpoint only covers roughly the past 92 days to the next 16 days —
  // a date outside that window always returns 400, so don't even try; just report "not available".
  const daysAhead = Math.round((new Date(dateStr + "T00:00:00") - new Date(toLocalISODate(new Date()) + "T00:00:00")) / 86400000);
  if (daysAhead < -92 || daysAhead > 16) {
    const p = Promise.resolve(null);
    __weatherCache.set(key, p);
    return p;
  }
  const p = throttledCall(() => fetchJsonWithRetry(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`)
    .then((data) => {
      if (!data || !data.daily || !data.daily.time || !data.daily.time.length) return null;
      const codeArr = data.daily.weather_code || data.daily.weathercode;
      if (!codeArr) return null;
      return { code: codeArr[0], max: data.daily.temperature_2m_max[0], min: data.daily.temperature_2m_min[0] };
    })
  ).then((result) => { if (!result) __weatherCache.delete(key); return result; })
   .catch((err) => { __weatherCache.delete(key); throw err; });
  __weatherCache.set(key, p);
  return p;
}

const COL_WIDTHS = {
  handle: 26, actions: 72,
  date: 78, day: 48, icon: 43, type: 125, from: 165, to: 165, arrival: 132,
  startTime: 90, duration: 45, endTime: 90, stay: 40, route: 92, link: 39, cost: 58, notes: 32, weather: 42,
};
const COL_MIN_WIDTHS = { startTime: 90, endTime: 90, route: 70, from: 160, to: 160, type: 120, icon: 43, duration: 44, arrival: 132, stay: 36 };
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
  const hotelRows = relevant.filter((r) => ["checkin", "checkout", "hostel", "apartment"].includes(r.typeId));
  const hotelSubFrames = frames.filter((f) => frameIds.has(f.id) && effectiveFrameTypeOf(f, rows) === "hotel");
  const nightsOf = (f) => (f.startDate && f.endDate) ? Math.max(0, Math.round((new Date(f.endDate) - new Date(f.startDate)) / 86400000)) : 0;
  const thisFrame = frames.find((f) => f.id === fid);
  const isThisAHotelFrame = thisFrame && effectiveFrameTypeOf(thisFrame, rows) === "hotel";
  const distinctHotels = isThisAHotelFrame ? (hotelRows.length ? 1 : 0) : (hotelSubFrames.length || new Set(hotelRows.map((r) => (r.to || r.from || "").trim()).filter(Boolean)).size);
  const totalNights = isThisAHotelFrame ? nightsOf(thisFrame) : hotelSubFrames.reduce((s, f) => s + nightsOf(f), 0);
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
    if (r.endTime && !r.overnight) {
      if (lastEnd !== null && r.endTime < lastEnd) return false;
      if (r.startTime && r.endTime < r.startTime) return false;
      lastEnd = r.endTime;
    }
    // An overnight row's endTime belongs to the next calendar day, not this one — it's excluded
    // from same-day end-time comparisons entirely rather than compared as if it were today.
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
  return toLocalISODate(d);
}
function initialRows() {
  const day1 = seedDateOffset(0), day2 = seedDateOffset(1), day5 = seedDateOffset(4);
  const base = [
    { date: day1, typeId: "flight", from: "Ben Gurion Airport", to: "Aeroporto di Roma - Fiumicino Leonardo da Vinci", fromAlias: "תל אביב (TLV)", toAlias: "רומא (FCO)", startTime: "07:40", endTime: "10:35", link: "https://www.google.com/flights", costAmount: 1450, costCurrency: "₪", flightNumber: "LY386" },
    { date: day1, typeId: "taxi", from: "Aeroporto di Roma - Fiumicino Leonardo da Vinci", to: "Hilton Garden Inn Rome Airport", startTime: "11:15", endTime: "12:00", costAmount: 45, costCurrency: "€" },
    { date: day1, typeId: "checkin", from: "Hilton Garden Inn Rome Airport", to: "Hilton Garden Inn Rome Airport", startTime: "12:00", endTime: "15:00", notes: "מנוחה במלון", link: "https://www.booking.com", costAmount: 620, costCurrency: "€" },
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

function RowLine({ row, depth, hasChildren, collapsed, toggleCollapse, prevRow, columns, ctx }) {
  const { T, lang, types, visibleColumns: ctxVisibleColumns, updateRow, deleteRow, openCard, addRow,
    dragId, setDragId, onDropRow, typeMenuOpen, setTypeMenuOpen, arrivalMenuOpen, setArrivalMenuOpen, newTypeDraft, setNewTypeDraft, addCustomType, openHotelInfo } = ctx;
  const visibleColumns = columns || ctxVisibleColumns;
  const tm = typeMeta(row.typeId, types, T, lang);
  const Icon = ICONS[tm.icon] || Tag;
  const dur = computeDuration(row.startTime, row.endTime, row.overnight);
  const routeUrl = rowOwnRouteUrl(row, prevRow);
  const fromVerified = row.fromVerifiedUrl && row.fromVerifiedText === row.from;
  const toVerified = row.toVerifiedUrl && row.toVerifiedText === row.to;
  const [typeSearch, setTypeSearch] = useState("");
  const [showAddTypeForm, setShowAddTypeForm] = useState(false);
  const [arrivalSearch, setArrivalSearch] = useState("");
  const [showAddArrivalForm, setShowAddArrivalForm] = useState(false);
  const [distLoading, setDistLoading] = useState(false);

  const lastRouteCalcSig = useRef(null);
  const [routeCalcError, setRouteCalcError] = useState(null);
  function forceRecalcRoute() { lastRouteCalcSig.current = null; setRouteCalcError(null); fetchRouteDistance(); }
  function fetchRouteDistance() {
    const ownFrom = (!noOriginNeeded(row.typeId) && row.from && row.from.trim()) ? rowStartPoint(row) : "";
    const prevTo = prevRow ? rowEndPoint(prevRow) : "";
    let origin, originSource;
    if (ownFrom) { origin = ownFrom; originSource = "own"; }
    else { origin = prevTo; originSource = "prevTo"; }
    const dest = rowEndPoint(row);
    if (!origin || !dest) { setRouteCalcError(!origin ? T.routeErrNoOrigin : T.routeErrNoDest); return; }
    const originLat = originSource === "own" ? row.fromLat : (prevRow && prevRow.toLat);
    const originLon = originSource === "own" ? row.fromLon : (prevRow && prevRow.toLon);
    const hasCoords = (originLat != null && originLon != null) ? "c" : "t";
    const sig = origin + "|" + dest + "|" + row.typeId + "|" + hasCoords;
    // If this exact route was already resolved and saved (even in a previous session — routeCalcSig
    // is persisted on the row, unlike the in-memory ref below), trust the stored result instead of
    // re-fetching on every page load/remount.
    if (row.routeCalcSig === sig && row.routeDistanceKm != null && row.routeDurationMin != null) { lastRouteCalcSig.current = sig; return; }
    if (lastRouteCalcSig.current === sig || distLoading) return;
    lastRouteCalcSig.current = sig;
    setDistLoading(true);
    const originP = (originLat != null && originLon != null) ? Promise.resolve({ lat: originLat, lon: originLon }) : geocodeText(origin);
    const destP = (row.toLat != null && row.toLon != null) ? Promise.resolve({ lat: row.toLat, lon: row.toLon }) : geocodeText(dest);
    Promise.all([originP, destP]).then(([a, b]) => {
      setDistLoading(false);
      if (!a || !b) { lastRouteCalcSig.current = null; setRouteCalcError(!a ? `${T.routeErrGeocodeOrigin}: "${origin}"` : `${T.routeErrGeocodeDest}: "${dest}"`); return; }
      return fetchRouteInfo(a, b, effectiveTransportType(row)).then((info) => {
        if (!info) { lastRouteCalcSig.current = null; setRouteCalcError(T.routeErrNoRoute); return; }
        setRouteCalcError(null);
        const patch = { routeDistanceKm: info.distanceKm, routeDurationMin: info.durationMin, toLat: b.lat, toLon: b.lon, routeCalcSig: sig };
        if (originSource === "own") { patch.fromLat = a.lat; patch.fromLon = a.lon; }
        updateRow(row.id, patch);
      });
    }).catch(() => { lastRouteCalcSig.current = null; setDistLoading(false); setRouteCalcError(T.routeErrNetwork); });
  }
  useEffect(() => {
    fetchRouteDistance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id, row.from, row.to, row.fromAlias, row.toAlias, row.startTime, row.typeId, row.fromLat, row.fromLon, row.toLat, row.toLon, row.stayDurationMin, prevRow && prevRow.from, prevRow && prevRow.fromAlias, prevRow && prevRow.fromLat, prevRow && prevRow.fromLon, prevRow && prevRow.to, prevRow && prevRow.toAlias, prevRow && prevRow.toLat, prevRow && prevRow.toLon, prevRow && prevRow.endTime]);

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

  const isTypeMenuOpen = typeMenuOpen === row.id;
  const typeMenuFloating = useFloatingMenu(isTypeMenuOpen, (open) => {
    if (open) { setTypeSearch(""); setShowAddTypeForm(false); setTypeMenuOpen(row.id); }
    else setTypeMenuOpen(null);
  });
  const isArrivalMenuOpen = arrivalMenuOpen === row.id;
  const arrivalMenuFloating = useFloatingMenu(isArrivalMenuOpen, (open) => setArrivalMenuOpen(open ? row.id : null));

  function renderCell(col) {
    switch (col.key) {
      case "date": return depth === 0 ? fmtDate(row.date, lang) : "";
      case "day": return depth === 0 ? heDay(row.date, lang) : "";
      case "icon": {
        return <PlaceIconWithPreview row={row} tm={tm} Icon={Icon} onOpenFull={() => openHotelInfo(row)} />;
      }
      case "type": {
        const warnings = getRowWarning(row, T);
        return (
        <div className="mt-type-wrap">
          <button className="mt-type-btn" ref={typeMenuFloating.refs.setReference} {...typeMenuFloating.getReferenceProps()} title={warnings.length ? warningText(warnings) : tm.name}>
            <span className={"mt-type-text " + warningClass(warnings)}>{tm.name}</span> <ChevronDown size={12} />
          </button>
          {isTypeMenuOpen && (
            <>
              <div className="mt-floating-backdrop" onClick={() => setTypeMenuOpen(null)} />
              <div ref={typeMenuFloating.refs.setFloating} style={{ ...typeMenuFloating.floatingStyles, zIndex: 400 }} {...typeMenuFloating.getFloatingProps()} className="mt-type-menu">
                <div className="mt-type-search-wrap">
                  <Search size={13} />
                  <input autoFocus className="mt-type-search" placeholder={T.searchTypes} value={typeSearch} onChange={(e) => setTypeSearch(e.target.value)} />
                  {typeSearch && <button className="mt-type-search-clear" onClick={() => setTypeSearch("")}><X size={12} /></button>}
                </div>
                <div className="mt-type-list">
                  {(() => {
                    const renderOpt = (t) => { const TI = ICONS[t.icon] || Tag; const selected = t.id === row.typeId; return (
                      <button key={t.id} className={"opt" + (selected ? " selected" : "")} onClick={() => {
                        const patch = { typeId: t.id };
                        if (t.id === "transfer") patch.arrivalTypeId = "taxi";
                        if (noOriginNeeded(t.id)) { patch.from = ""; patch.fromAlias = ""; patch.fromLat = null; patch.fromLon = null; patch.fromVerifiedUrl = ""; patch.fromVerifiedText = ""; patch.fromPlaceId = null; }
                        updateRow(row.id, patch); setTypeMenuOpen(null);
                      }}>
                        <span className="mt-type-icon" style={{ background: t.color, width: 20, height: 20 }}><TI size={11} /></span>
                        <span style={{ flex: 1 }}>{typeDisplayName(t, lang)}</span>
                        {selected && <Check size={13} />}
                      </button>
                    ); };
                    const descTypes = types.filter((t) => t.kind === "desc");
                    return (
                      <>
                        {groupTypesByCategory(descTypes)
                          .map((grp) => ({ ...grp, items: grp.items.filter((t) => typeDisplayName(t, lang).toLowerCase().includes(typeSearch.toLowerCase())) }))
                          .filter((grp) => grp.items.length)
                          .map((grp) => (
                            <React.Fragment key={grp.category}>
                              <div className="mt-type-cat-label">{CATEGORY_LABELS[lang][grp.category] || grp.category}</div>
                              {grp.items.map(renderOpt)}
                            </React.Fragment>
                          ))}
                      </>
                    );
                  })()}
                </div>
                <div className="divider" />
                {showAddTypeForm ? (
                  <div className="mt-type-new-form">
                    <input type="text" autoFocus placeholder={T.typeName} value={newTypeDraft.name} onChange={(e) => setNewTypeDraft({ ...newTypeDraft, name: e.target.value })} />
                    <div className="mt-wizard-choices" style={{ marginBottom: 6 }}>
                      <button className={"mt-wizard-choice" + (newTypeDraft.kind === "desc" ? " selected" : "")} onClick={() => setNewTypeDraft({ ...newTypeDraft, kind: "desc" })}>{T.typeKindDesc}</button>
                      <button className={"mt-wizard-choice" + (newTypeDraft.kind === "arrival" ? " selected" : "")} onClick={() => setNewTypeDraft({ ...newTypeDraft, kind: "arrival" })}>{T.typeKindArrival}</button>
                    </div>
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
      case "arrival": {
        if (!noOriginNeeded(row.typeId)) return <span className="mt-hint" style={{ fontSize: 11 }}>—</span>;
        const am = typeMeta(row.arrivalTypeId, types, T, lang);
        const AmIcon = ICONS[am.icon] || Footprints;
        return (
          <div className="mt-type-wrap">
            <button className="mt-type-btn" ref={arrivalMenuFloating.refs.setReference} {...arrivalMenuFloating.getReferenceProps()} title={am.name}>
              <span className="mt-type-icon" style={{ background: am.color, width: 20, height: 20 }}><AmIcon size={11} /></span>
              <span className="mt-type-text">{am.name}</span> <ChevronDown size={12} />
            </button>
            {isArrivalMenuOpen && (
              <>
                <div className="mt-floating-backdrop" onClick={() => setArrivalMenuOpen(null)} />
                <div ref={arrivalMenuFloating.refs.setFloating} style={{ ...arrivalMenuFloating.floatingStyles, zIndex: 400 }} {...arrivalMenuFloating.getFloatingProps()} className="mt-type-menu">
                <div className="mt-type-search-wrap">
                  <Search size={13} />
                  <input autoFocus className="mt-type-search" placeholder={T.searchTypes} value={arrivalSearch} onChange={(e) => setArrivalSearch(e.target.value)} />
                  {arrivalSearch && <button className="mt-type-search-clear" onClick={() => setArrivalSearch("")}><X size={12} /></button>}
                </div>
                <div className="mt-type-list">
                  {(() => {
                    const arrivalTypes = types.filter((t) => t.kind === "arrival");
                    const renderOpt = (t) => { const TI = ICONS[t.icon] || Footprints; const selected = t.id === row.arrivalTypeId; return (
                      <button key={t.id} className={"opt" + (selected ? " selected" : "")} onClick={() => { updateRow(row.id, { arrivalTypeId: t.id }); setArrivalMenuOpen(null); }}>
                        <span className="mt-type-icon" style={{ background: t.color, width: 20, height: 20 }}><TI size={11} /></span>
                        <span style={{ flex: 1 }}>{typeDisplayName(t, lang)}</span>
                        {selected && <Check size={13} />}
                      </button>
                    ); };
                    return groupTypesByCategory(arrivalTypes)
                      .map((grp) => ({ ...grp, items: grp.items.filter((t) => typeDisplayName(t, lang).toLowerCase().includes(arrivalSearch.toLowerCase())) }))
                      .filter((grp) => grp.items.length)
                      .map((grp) => (
                        <React.Fragment key={grp.category}>
                          <div className="mt-type-cat-label">{CATEGORY_LABELS[lang][grp.category] || grp.category}</div>
                          {grp.items.map(renderOpt)}
                        </React.Fragment>
                      ));
                  })()}
                </div>
                <div className="divider" />
                {showAddArrivalForm ? (
                  <div className="mt-type-new-form">
                    <input type="text" autoFocus placeholder={T.typeName} value={newTypeDraft.name} onChange={(e) => setNewTypeDraft({ ...newTypeDraft, name: e.target.value })} />
                    <div className="mt-icon-pick-row">
                      {ICON_PALETTE.map((ic) => { const PI = ICONS[ic]; return (
                        <button key={ic} className={"mt-icon-pick" + (newTypeDraft.icon === ic ? " sel" : "")} onClick={() => setNewTypeDraft({ ...newTypeDraft, icon: ic })}><PI /></button>
                      ); })}
                    </div>
                    <button className="mt-btn primary" style={{ width: "100%" }} onClick={() => { addCustomType(row.id); setShowAddArrivalForm(false); }}><Plus size={12} /> {T.add}</button>
                  </div>
                ) : (
                  <button className="mt-type-add-toggle" onClick={() => { setNewTypeDraft({ ...newTypeDraft, kind: "arrival" }); setShowAddArrivalForm(true); }}><Plus size={13} /> {T.newType}</button>
                )}
                </div>
              </>
            )}
          </div>
        );
      }
      case "from": {
        if (noOriginNeeded(row.typeId)) return <span className="mt-hint" style={{ fontSize: 11 }}>—</span>;
        return (
          <span className={"mt-loc-cell" + (fromVerified ? " has-badge" : "")}>
            {lang === "he" && fromVerified && <a className="mt-loc-badge" href={row.fromVerifiedUrl} target="_blank" rel="noreferrer" title={T.openMap}><MapPin size={11} /></a>}
            {row.fromAlias ? (
              <input className="mt-editable" dir="auto" style={{ textAlign: detectTextAlign(row.fromAlias) }} title={row.from} value={row.fromAlias} onChange={(e) => updateRow(row.id, { fromAlias: e.target.value })} />
            ) : (
              <input className="mt-editable" dir="auto" style={{ textAlign: detectTextAlign(row.from) }} placeholder={getTypeHint(row.typeId, "from", lang)} value={row.from} onChange={(e) => updateRow(row.id, { from: e.target.value })} />
            )}
            {lang !== "he" && fromVerified && <a className="mt-loc-badge" href={row.fromVerifiedUrl} target="_blank" rel="noreferrer" title={T.openMap}><MapPin size={11} /></a>}
          </span>
        );
      }
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
      case "startTime": { const c = timeFieldColor(row, "start"); return <TimeField value={row.startTime} onChange={(e) => ctx.setStartTimeWithCascade(row.id, e.target.value)} T={T} className="mt-editable mt-time" style={c ? { borderBottom: `2px dashed ${c}` } : undefined} title={c ? T.computedStartTimeHint : undefined} />; }
      case "duration": return <span title={dur === null ? "" : dur} style={{ color: dur === null ? "var(--danger)" : "var(--muted)", fontSize: 12 }}>{dur === null ? "!" : dur}</span>;
      case "endTime": { const c = timeFieldColor(row, "end"); return <TimeField value={row.endTime} onChange={(e) => ctx.setEndTimeWithCascade(row.id, e.target.value)} T={T} className="mt-editable mt-time" style={c ? { borderBottom: `2px dashed ${c}` } : undefined} title={c ? T.computedEndTimeHint : undefined} />; }
      case "stay": return <StayDurationField compact value={row.stayDurationMin != null ? row.stayDurationMin : getDefaultStayMinutes(row.typeId)} onChange={(m) => updateRow(row.id, { stayDurationMin: m })} T={T} />;
      case "route": return (
        <span className="mt-route-mini">
          {routeUrl && <a className="mt-link-icon" href={routeUrl} target="_blank" rel="noreferrer" title={T.routeTooltip}><Route size={14} /></a>}
          {row.routeDistanceKm != null ? (
            <span className="mt-route-km">{row.routeDistanceKm.toFixed(1)} {T.km}</span>
          ) : distLoading ? (
            <span className="mt-route-km">…</span>
          ) : (
            <button className="mt-link-icon" title={routeCalcError || T.calcRoute} onClick={(e) => { e.stopPropagation(); forceRecalcRoute(); }}><RefreshCw size={13} /></button>
          )}
        </span>
      );
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

  const { attributes: dragAttrs, listeners: dragListeners, setNodeRef: setDragNodeRef } = useDraggable({ id: row.id, data: { type: "row" } });
  const { setNodeRef: setDropNodeRef, isOver: isRowOver } = useDroppable({ id: row.id, data: { type: "row" } });

  return (
    <tr ref={(el) => { setDragNodeRef(el); setDropNodeRef(el); }} className={(depth > 0 ? "is-sub" : "") + (isRowOver ? " mt-drop-hover" : "")} style={{ opacity: dragId === row.id ? 0.4 : 1 }}>
      <td className="handle">
        <div className="mt-handle-wrap" style={{ paddingInlineStart: depth * 14 }}>
          <span className="mt-drag-handle" title={T.dragHint} {...dragListeners} {...dragAttrs}><GripVertical size={13} /></span>
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
  const { refs, floatingStyles } = useFloating({
    open, onOpenChange: setOpen,
    placement: "bottom-start",
    strategy: "fixed",
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

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

  const dayCount = Math.round((new Date(frame.endDate + "T00:00:00") - new Date(frame.startDate + "T00:00:00")) / 86400000) + 1;

  return (
    <span style={{ position: "relative" }}>
      <button ref={refs.setReference} type="button" className="mt-frame-date-inline mt-frame-date-btn" onClick={openPicker}>
        <CalendarIcon size={13} />
        <span>{dayCount > 0 ? `${formatDayCount(dayCount, lang)} · ` : ""}<span dir="ltr">{fmtDate(frame.startDate, lang)} – {fmtDate(frame.endDate, lang)}</span></span>
      </button>
      {open && (
        <>
          <div className="mt-floating-backdrop" style={{ zIndex: 390 }} onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div ref={refs.setFloating} style={{ ...floatingStyles, zIndex: 400 }} className="mt-floating-menu mt-daterange-cal" dir="ltr" onClick={(e) => e.stopPropagation()}>
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

function DateField({ value, onChange, lang, T, initialViewMonth }) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => { const d = value ? new Date(value + "T00:00:00") : initialViewMonth ? new Date(initialViewMonth + "T00:00:00") : new Date(); d.setDate(1); return d; });
  useEffect(() => {
    if (!value && initialViewMonth) { const d = new Date(initialViewMonth + "T00:00:00"); d.setDate(1); setViewMonth(d); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialViewMonth]);
  const { refs, floatingStyles } = useFloating({
    open, onOpenChange: setOpen,
    placement: "bottom-start",
    strategy: "fixed",
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  function toggleOpen() {
    if (!open) { const d = value ? new Date(value + "T00:00:00") : initialViewMonth ? new Date(initialViewMonth + "T00:00:00") : new Date(); d.setDate(1); setViewMonth(d); }
    setOpen((v) => !v);
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function toISO(y, m, day) { return `${y}-${pad(m + 1)}-${pad(day)}`; }
  function clickDay(iso) { onChange({ target: { value: iso } }); setOpen(false); }
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
      <button ref={refs.setReference} type="button" className="mt-daterange-btn" onClick={toggleOpen}>
        <CalendarIcon size={14} />
        <span>{value ? fmtDate(value, lang) : "—"}</span>
      </button>
      {open && (
        <>
          <div className="mt-floating-backdrop" style={{ zIndex: 390 }} onClick={() => setOpen(false)} />
          <div ref={refs.setFloating} style={{ ...floatingStyles, zIndex: 400 }} className="mt-floating-menu mt-daterange-cal" dir="ltr">
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
                return (
                  <button type="button" key={i}
                    className={"mt-cal-day" + (iso === value ? " edge" : "")}
                    onClick={() => clickDay(iso)}>{d}</button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DateRangeField({ startDate, endDate, onChange, lang, T, initialViewMonth }) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => { const d = startDate ? new Date(startDate + "T00:00:00") : initialViewMonth ? new Date(initialViewMonth + "T00:00:00") : new Date(); d.setDate(1); return d; });
  useEffect(() => {
    if (!startDate && initialViewMonth) { const d = new Date(initialViewMonth + "T00:00:00"); d.setDate(1); setViewMonth(d); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialViewMonth]);
  const [tempStart, setTempStart] = useState(startDate || "");
  const [tempEnd, setTempEnd] = useState(endDate || "");
  const { refs, floatingStyles } = useFloating({
    open, onOpenChange: setOpen,
    placement: "bottom-start",
    strategy: "fixed",
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  function toggleOpen() {
    if (!open) { const d = tempStart ? new Date(tempStart + "T00:00:00") : initialViewMonth ? new Date(initialViewMonth + "T00:00:00") : new Date(); d.setDate(1); setViewMonth(d); }
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
      <button ref={refs.setReference} type="button" className="mt-daterange-btn" onClick={toggleOpen}>
        <CalendarIcon size={14} />
        <span>{startDate ? fmtDate(startDate, lang) : "—"} – {endDate ? fmtDate(endDate, lang) : "—"}</span>
      </button>
      {open && (
        <>
          <div className="mt-floating-backdrop" style={{ zIndex: 390 }} onClick={() => setOpen(false)} />
          <div ref={refs.setFloating} style={{ ...floatingStyles, zIndex: 400 }} className="mt-floating-menu mt-daterange-cal" dir="ltr">
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
            <button type="button" className="mt-btn primary" style={{ width: "100%", marginTop: 8 }} onClick={() => setOpen(false)}>{T.close}</button>
          </div>
        </>
      )}
    </div>
  );
}

function PlaceIconWithPreview({ row, tm, Icon, onOpenFull }) {
  const placeId = row.fromPlaceId || row.toPlaceId;
  function handleClick(e) {
    e.stopPropagation();
    if (!placeId || !hasGooglePlaces()) return;
    onOpenFull();
  }
  return (
    <button className="mt-type-icon mt-type-icon-btn" style={{ background: tm.color }} onClick={handleClick}><Icon /></button>
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
  const { refs, floatingStyles } = useFloating({
    open, onOpenChange: setOpen,
    placement: "bottom-start",
    strategy: "fixed",
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  function toggle(e) { e.stopPropagation(); setOpen((v) => !v); }
  function handleEnter() { if (trigger === "hover") setOpen(true); }
  function handleLeave() { if (trigger === "hover") setOpen(false); }
  return (
    <span style={{ display: "inline-flex", verticalAlign: "middle", marginInlineStart: 4 }} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button ref={refs.setReference} type="button" className="mt-info-icon-btn" style={color ? { color } : undefined} onClick={toggle}><IconComp size={13} /></button>
      {open && (
        <>
          <div className="mt-floating-backdrop" onClick={(e) => { e.stopPropagation(); setOpen(false); }} style={trigger === "hover" ? { pointerEvents: "none" } : undefined} />
          <div ref={refs.setFloating} style={floatingStyles} className="mt-info-popup" onClick={(e) => e.stopPropagation()}>{children}</div>
        </>
      )}
    </span>
  );
}

function PlaceInfoModal({ row, onClose, T }) {
  const placeId = row.fromPlaceId || row.toPlaceId;
  return (
    <div className="mt-modal-backdrop" onClick={onClose}>
      <div className="mt-modal" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <div className="mt-modal-body" style={{ padding: placeId ? 0 : undefined }}>
          <GooglePlaceDetailsFull placeId={placeId} T={T} />
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
  const routeUrl = rowOwnRouteUrl(row, prevRow);
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
    const prevTo = prevRow ? rowEndPoint(prevRow) : "";
    let origin, originSource;
    if (ownFrom) { origin = ownFrom; originSource = "own"; }
    else { origin = prevTo; originSource = "prevTo"; }
    const dest = rowEndPoint(row);
    if (!origin || !dest) return;
    const originLat = originSource === "own" ? row.fromLat : (prevRow && prevRow.toLat);
    const originLon = originSource === "own" ? row.fromLon : (prevRow && prevRow.toLon);
    const hasCoords = (originLat != null && originLon != null) ? "c" : "t";
    const sig = origin + "|" + dest + "|" + row.typeId + "|" + hasCoords;
    if (row.routeCalcSig === sig && row.routeDistanceKm != null && row.routeDurationMin != null) { lastRouteCalcSig.current = sig; return; }
    if (lastRouteCalcSig.current === sig || distLoading) return;
    lastRouteCalcSig.current = sig;
    setDistLoading(true);
    const originP = (originLat != null && originLon != null) ? Promise.resolve({ lat: originLat, lon: originLon }) : geocodeText(origin);
    const destP = (row.toLat != null && row.toLon != null) ? Promise.resolve({ lat: row.toLat, lon: row.toLon }) : geocodeText(dest);
    Promise.all([originP, destP]).then(([a, b]) => {
      setDistLoading(false);
      if (!a || !b) { lastRouteCalcSig.current = null; return; }
      return fetchRouteInfo(a, b, effectiveTransportType(row)).then((info) => {
        if (!info) { lastRouteCalcSig.current = null; return; }
        const patch = { routeDistanceKm: info.distanceKm, routeDurationMin: info.durationMin, toLat: b.lat, toLon: b.lon, routeCalcSig: sig };
        if (originSource === "own") { patch.fromLat = a.lat; patch.fromLon = a.lon; }
        updateRow(row.id, patch);
      });
    }).catch(() => { lastRouteCalcSig.current = null; setDistLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id, row.from, row.to, row.fromAlias, row.toAlias, row.startTime, row.typeId, row.fromLat, row.fromLon, row.toLat, row.toLon, row.stayDurationMin, prevRow && prevRow.from, prevRow && prevRow.fromAlias, prevRow && prevRow.fromLat, prevRow && prevRow.fromLon, prevRow && prevRow.to, prevRow && prevRow.toAlias, prevRow && prevRow.toLat, prevRow && prevRow.toLon, prevRow && prevRow.endTime]);

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
    if (weatherLoading) return <Cloud size={13} className="mt-weather-spin" />;
    if (hasWeather) { const meta = weatherMeta(row.weatherCode); const WI = WEATHER_ICONS[meta.icon] || Cloud; return <WI size={13} />; }
    return <Cloud size={13} style={{ opacity: 0.35 }} />;
  }

  return (
    <span className="mt-card-icons" onClick={(e) => e.stopPropagation()}>
      <span className="mt-route-mini" title={T.weatherAtArrival}>
        {weatherIconEl()}
        {hasWeather && <span className="mt-route-km">{Math.round(row.weatherMin)}°–{Math.round(row.weatherMax)}°</span>}
      </span>
      {routeUrl && (
        <span className="mt-route-mini">
          <a className="mt-link-icon" href={routeUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title={T.routeTooltip}><Route size={13} /></a>
          {row.routeDistanceKm != null ? (
            <span className="mt-route-km">{row.routeDistanceKm.toFixed(1)} {T.km}</span>
          ) : distLoading ? (
            <span className="mt-route-km">…</span>
          ) : null}
        </span>
      )}
      {row.link && <a className="mt-link-icon" href={row.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title={row.link}><Link2 size={13} /></a>}
      {row.notes && <button className="mt-link-icon has-note" title={row.notes} onClick={(e) => { e.stopPropagation(); openCard(row); }}><StickyNote size={13} /></button>}
      <button className="mt-link-icon" title={T.placeInfo} onClick={(e) => { e.stopPropagation(); openHotelInfo(row); }}><Info size={13} /></button>
    </span>
  );
}

function FlowView({ rows, types, lang, T, ctx }) {
  const { openCard } = ctx;
  const ArrowIcon = lang === "he" ? ArrowLeft : ArrowRight;
  if (!rows.length) return <div className="mt-flow-empty">{T.noRows}</div>;
  return (
    <div className="mt-flow-view">
      {rows.map((r, i) => {
        const tm = typeMeta(r.typeId, types, T, lang);
        const Icon = ICONS[tm.icon] || Tag;
        const label = r.toAlias || r.to || r.fromAlias || r.from || "";
        const nextRow = rows[i + 1];
        const nextArrivalMeta = nextRow && noOriginNeeded(nextRow.typeId) ? typeMeta(nextRow.arrivalTypeId, types, T, lang) : null;
        const NextArrivalIcon = nextArrivalMeta ? (ICONS[nextArrivalMeta.icon] || Footprints) : null;
        return (
          <React.Fragment key={r.id}>
            <button type="button" className="mt-flow-node" onClick={() => openCard(r)} title={tm.name}>
              <span className="mt-flow-icon" style={{ background: tm.color }}><Icon size={18} /></span>
              {r.startTime && <span className="mt-flow-time">{r.startTime}</span>}
              {label && <span className="mt-flow-label" dir="auto">{truncateChars(label, 12)}</span>}
            </button>
            {i < rows.length - 1 && <span className="mt-flow-arrow" title={nextArrivalMeta ? nextArrivalMeta.name : undefined}>{NextArrivalIcon ? <NextArrivalIcon size={14} /> : <ArrowIcon size={16} />}</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* Flight duration label ("2h 30m") shown under the arrival-mode icon on flight-type cards — the
   flight's own start-to-end span, matching the reference card's duration badge. */
function computeFlightDurationLabel(row) {
  if (!row.startTime || !row.endTime) return null;
  const [sh, sm] = row.startTime.split(":").map(Number);
  const [eh, em] = row.endTime.split(":").map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 1440;
  if (diff <= 0) return null;
  const h = Math.floor(diff / 60), m = diff % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}
function MobileRowCard({ r, prevRow, types, lang, T, ctx }) {
  const { openCard, openHotelInfo, dragId } = ctx;
  const tm = typeMeta(r.typeId, types, T, lang); const Icon = ICONS[tm.icon] || Tag;
  const fromLabel = noOriginNeeded(r.typeId) ? (prevRow ? (prevRow.toAlias || prevRow.to || "") : "") : (r.fromAlias || r.from);
  const toLabel = r.toAlias || r.to;
  const am = noOriginNeeded(r.typeId) ? typeMeta(r.arrivalTypeId, types, T, lang) : null;
  const AmIcon = am ? (ICONS[am.icon] || Footprints) : null;
  const cardWarnings = getRowWarning(r, T);
  const isFlightRow = isFlightType(r.typeId);
  const flightTitle = isFlightRow && r.flightNumber ? [tm.name, r.flightNumber, r.airline].filter(Boolean).join(" · ") : null;
  const rowDuration = computeFlightDurationLabel(r);
  const stayLabel = formatStayAnnotation(r.stayDurationMin != null ? r.stayDurationMin : getDefaultStayMinutes(r.typeId), T);
  const { attributes: dragAttrs, listeners: dragListeners, setNodeRef: setDragNodeRef } = useDraggable({ id: r.id, data: { type: "row" } });
  const { setNodeRef: setDropNodeRef, isOver: isRowOver } = useDroppable({ id: r.id, data: { type: "row" } });
  return (
    <div ref={(el) => { setDragNodeRef(el); setDropNodeRef(el); }} className={"mt-card" + (isRowOver ? " mt-drop-hover" : "")} style={{ opacity: dragId === r.id ? 0.4 : 1 }} onClick={() => openCard(r)}>
      <div className="mt-card-header">
        <PlaceIconWithPreview row={r} tm={tm} Icon={Icon} onOpenFull={() => openHotelInfo(r)} />
        <strong className={"mt-card-title" + (warningClass(cardWarnings) ? " " + warningClass(cardWarnings) : "")} title={cardWarnings.length ? warningText(cardWarnings) : undefined}>{flightTitle || tm.name}</strong>
        <span className="mt-card-drag-handle" onClick={(e) => e.stopPropagation()} {...dragListeners} {...dragAttrs}><GripVertical size={15} /></span>
      </div>
      <div className="mt-card-divider" />
      <div className="mt-card-times-row" dir="ltr">
        <div className="mt-card-time-block">
          <div className="mt-card-time-big" style={{ ...(r.startTime && Number(r.startTime.split(":")[0]) < 6 ? { color: "#C1543A" } : {}), ...(timeFieldColor(r, "start") ? { borderBottom: `2px dashed ${timeFieldColor(r, "start")}` } : {}) }}>{r.startTime || "—"}</div>
          {fromLabel && <div className="mt-card-time-sub" dir="auto" title={fromLabel}>{truncateChars(fromLabel, 13)}</div>}
        </div>
        <div className="mt-card-connector">
          <div className="mt-card-connector-line">
            <span className="mt-card-connector-icon">{AmIcon ? <AmIcon size={18} /> : <Icon size={18} />}</span>
          </div>
          <div className="mt-card-connector-sub">{rowDuration && <span className="mt-card-duration-text">{rowDuration}</span>}</div>
        </div>
        <div className="mt-card-time-block end">
          <div className="mt-card-time-big" style={{ ...(r.endTime && Number(r.endTime.split(":")[0]) < 6 ? { color: "#C1543A" } : {}), ...(timeFieldColor(r, "end") ? { borderBottom: `2px dashed ${timeFieldColor(r, "end")}` } : {}) }}>{r.endTime || "—"}</div>
          {toLabel && <div className="mt-card-time-sub" dir="auto" title={toLabel}>{truncateChars(toLabel, 13)}</div>}
        </div>
      </div>
      <div className="mt-card-bottom">
        <MobileCardMeta row={r} prevRow={prevRow} ctx={ctx} />
        {stayLabel && <span className="mt-stay-note">{stayLabel}</span>}
      </div>
    </div>
  );
}

function DayGroup({ g, fid, depth, ctx }) {
  const { T, lang, effectiveMobile, viewMode, collapsedGroups, setCollapsedGroups, collapsedParents, setCollapsedParents,
    addRow, openCard, types, visibleColumns, openAddDayModal, rows, frames, sortDayByTime, getColWidth, startResize, dragDayKey, setDragDayKey, dragId, openHotelInfo } = ctx;
  const parentFrame = frames.find((f) => f.id === fid) || null;
  const parentFrameType = effectiveFrameTypeOf(parentFrame, rows);
  const effectiveColumns = visibleColumns.filter((c) => {
    if (parentFrameType === "flight" && c.key === "arrival") return false;
    if (parentFrameType === "hotel" && c.key === "from") return false;
    return true;
  });
  const gk = (fid || "root") + "__" + g.date;
  const isToday = g.date === toLocalISODate(new Date());
  const { attributes: dayDragAttrs, listeners: dayDragListeners, setNodeRef: setDayDragNodeRef } = useDraggable({ id: "day:" + gk, data: { type: "day", gk } });
  const collapsed = !!collapsedGroups[gk];
  const childrenOf = (pid) => childrenOfPure(rows, pid);
  const allRowsHere = g.rows.flatMap((r) => [r, ...childrenOf(r.id)]);
  const dayRoute = dayRouteUrl(g.rows);
  const chronoOk = isChronological(g.rows);

  return (
    <div className={"mt-group" + (isToday ? " mt-group-today" : "")}>
      <div className={"mt-group-header" + (dragDayKey === gk ? " dragging" : "")} onClick={() => setCollapsedGroups((p) => ({ ...p, [gk]: !p[gk] }))}>
        <span className="mt-day-drag-handle" title={T.dragDayHint} ref={setDayDragNodeRef} onClick={(e) => e.stopPropagation()}
          {...dayDragListeners} {...dayDragAttrs}><GripVertical size={13} /></span>
        <span className="chev">{collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}</span>
        <span className="mt-day-badge">
          <span className="mt-day-badge-top" />
          <span className="mt-day-badge-body">
            <span className="mt-day-badge-num">{dayOfMonth(g.date)}</span>
            <span className="mt-day-badge-weekday">{heDay(g.date, lang)}</span>
          </span>
        </span>
      </div>
      {!chronoOk && (
        <div className="mt-chrono-warning">
          <Clock size={13} /> {T.chronoWarning}
          <button className="mt-btn ghost" style={{ marginInlineStart: "auto" }} onClick={() => sortDayByTime(fid, g.date)}><ArrowDownUp size={12} /> {T.sortByTime}</button>
        </div>
      )}
      {!collapsed && (viewMode === "flow" ? (
        <FlowView rows={allRowsHere} types={types} lang={lang} T={T} ctx={ctx} />
      ) : effectiveMobile ? (
        <div className="mt-cards">
          {allRowsHere.map((r, ri) => (
            <MobileRowCard key={r.id} r={r} prevRow={ctx.prevRowMap.get(r.id) || null} types={types} lang={lang} T={T} ctx={ctx} />
          ))}
          <div className="mt-group-footer-actions" style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8, flexWrap: "nowrap" }}>
            <button className="mt-group-add" onClick={() => addRow(g.date, null, fid)}><Plus size={13} /> {T.addRowShort}</button>
            <button className="mt-group-add" onClick={() => openAddDayModal(fid, g.date)}><Plus size={13} /> {T.addDayShort}</button>
            {dayRoute ? (
              <a className="mt-group-add" href={dayRoute} target="_blank" rel="noreferrer"><Waypoints size={13} /> {T.dayRoute}</a>
            ) : (
              <span className="mt-group-add disabled" title={T.noRoute}><Waypoints size={13} /> {T.dayRoute}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-table-wrap">
          <table className="mt-table">
            <colgroup>
              <col style={{ width: getColWidth("handle") }} />
              {effectiveColumns.map((c) => <col key={c.key} style={{ width: getColWidth(c.key) }} />)}
              <col style={{ width: getColWidth("actions") }} />
            </colgroup>
            <thead>
              <tr>
                <th className="handle"></th>
                {effectiveColumns.map((c) => {
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
                    collapsed={!!collapsedParents[r.id]} prevRow={ctx.prevRowMap.get(r.id) || null} columns={effectiveColumns}
                    toggleCollapse={() => setCollapsedParents((p) => ({ ...p, [r.id]: !p[r.id] }))} ctx={ctx} />
                  {!collapsedParents[r.id] && childrenOf(r.id).map((child) => (
                    <RowLine key={child.id} row={child} depth={1} hasChildren={false} collapsed={false} toggleCollapse={() => {}} prevRow={null} columns={effectiveColumns} ctx={ctx} />
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <div className="mt-group-footer-actions" style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8, flexWrap: "nowrap" }}>
            <button className="mt-group-add" onClick={() => addRow(g.date, null, fid)}><Plus size={13} /> {T.addRowShort}</button>
            <button className="mt-group-add" onClick={() => openAddDayModal(fid, g.date)}><Plus size={13} /> {T.addDayShort}</button>
            {dayRoute ? (
              <a className="mt-group-add" href={dayRoute} target="_blank" rel="noreferrer"><Waypoints size={13} /> {T.dayRoute}</a>
            ) : (
              <span className="mt-group-add disabled" title={T.noRoute}><Waypoints size={13} /> {T.dayRoute}</span>
            )}
          </div>
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
  const isHotelFrame = effectiveFrameTypeOf(frame, rows) === "hotel";
  return (
    <div className="mt-frame-summary">
      <button className="mt-frame-summary-toggle" onClick={() => setExpanded((v) => !v)}>
        <span>{T.tripSummary}</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {(!isHotelFrame || expanded) && (
        <div className="mt-frame-summary-line">
          <span>{convertedTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          <select className="mt-frame-summary-currency" value={summaryCurrency} onChange={(e) => setSummaryCurrency(e.target.value)} onClick={(e) => e.stopPropagation()}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}
      {(!isHotelFrame || expanded) && (
        <div className="mt-frame-summary-line" style={{ marginTop: 3 }}>
          <span>{stats.totalKm.toLocaleString(undefined, { maximumFractionDigits: 0 })} {T.km} {T.summaryTotal}</span>
          <span className="mt-hint">· {stats.totalKmNoFlights.toLocaleString(undefined, { maximumFractionDigits: 0 })} {T.km} {T.summaryKmNoFlights}</span>
        </div>
      )}
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
          {!isHotelFrame && <button className="mt-btn ghost" style={{ marginTop: 8 }} onClick={() => generateTravelJournal(frame.id)}><BookOpen size={13} /> {T.generateJournal}</button>}
        </>
      )}
    </div>
  );
}

function ChecklistRow({ item, cat, lang, T, onToggle, onUpload, onRemoveDoc, onRemove }) {
  const label = lang === "he" ? item.label_he : item.label_en;
  return (
    <div className="mt-checklist-row">
      <label className="mt-checkbox-row" style={{ flex: 1 }}>
        <input type="checkbox" checked={!!item.checked} onChange={() => onToggle(cat, item.id)} />
        <span className={item.checked ? "mt-checklist-done" : ""}>{label}</span>
      </label>
      {cat !== "packing" && (
        <span className="mt-checklist-docs-row">
          {(item.docs || []).map((doc) => (
            <span key={doc.id} className="mt-checklist-doc-icon-wrap">
              {doc.url ? (
                <a href={doc.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="mt-checklist-doc-icon" title={doc.title}><Paperclip size={14} /></a>
              ) : (
                <span className="mt-checklist-doc-icon" title={doc.title}><Paperclip size={14} /></span>
              )}
              <button className="mt-checklist-doc-x" onClick={() => onRemoveDoc(cat, item.id, doc.id)}><X size={9} /></button>
            </span>
          ))}
          <button className="mt-btn ghost mt-checklist-upload-btn" onClick={() => onUpload(cat, item.id)} title={T.checklistUpload}><Paperclip size={14} /></button>
        </span>
      )}
      {onRemove && <button className="mt-btn ghost" style={{ padding: "2px 6px" }} onClick={() => onRemove(cat, item.id)}><X size={12} /></button>}
    </div>
  );
}
function ChecklistAddRow({ cat, T, onAdd }) {
  const [val, setVal] = useState("");
  function submit() { onAdd(cat, val); setVal(""); }
  return (
    <div className="mt-checklist-add-row">
      <input value={val} onChange={(e) => setVal(e.target.value)} placeholder={T.checklistAddItem}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
      <button className="mt-btn ghost" onClick={submit}><Plus size={13} /></button>
    </div>
  );
}

function CHECKLIST_CAT_LABEL(cat, T) {
  const map = {
    reservations: T.checklistReservations, documents: T.checklistDocuments,
    checkin: T.checklistOther, currency: T.checklistOther, airport: T.checklistOther,
    packing: T.checklistPacking, shopping: T.checklistShopping,
  };
  return map[cat] || cat;
}
function FOLDER_LABEL(folderKey, T) {
  if (folderKey === "record") return T.fileManagerRecordsFolder;
  return CHECKLIST_CAT_LABEL(folderKey, T);
}
function formatFileSize(bytes) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
const FILE_TYPE_ICON = { image: ImagePlus, pdf: FileText, document: FileText, spreadsheet: FileSpreadsheet, presentation: Presentation, archive: FileArchive, other: FileUp };
function FileManagerFolderRow({ folderKey, count, T, onOpen }) {
  return (
    <button className="mt-file-folder-row" onClick={onOpen}>
      <span className="mt-file-manager-icon folder"><FolderOpen size={16} /></span>
      <span className="mt-file-manager-info"><strong>{FOLDER_LABEL(folderKey, T)}</strong></span>
      <span className="mt-hint">{count}</span>
    </button>
  );
}
function FileManagerFileRow({ file, T, lang }) {
  const Icon = FILE_TYPE_ICON[file.type] || FileUp;
  const d = new Date(file.uploadedAt);
  const dateStr = `${fmtDate(toLocalISODate(d), lang)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const content = (
    <>
      <span className="mt-file-manager-icon"><Icon size={15} /></span>
      <span className="mt-file-manager-info">
        <strong>{file.name}</strong>
        <span>{file.sourceLabel}</span>
      </span>
      <span className="mt-file-manager-meta">{dateStr}</span>
      <span className="mt-file-manager-meta">{formatFileSize(file.size)}</span>
    </>
  );
  return file.url ? (
    <a className="mt-checklist-row mt-file-row" href={file.url} target="_blank" rel="noreferrer">{content}</a>
  ) : (
    <div className="mt-checklist-row mt-file-row">{content}</div>
  );
}

function TimeField({ value, onChange, T, className, title, style, disabled }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState("hour");
  const faceRef = useRef(null);
  const [dh, dm] = (draft || "").split(":");
  const hh = dh || "00", mm = dm || "00";
  const hourNum = Number(hh), minNum = Number(mm);
  function openPicker() {
    if (disabled) return;
    setDraft(value || "00:00");
    setMode("hour");
    setOpen(true);
  }
  function commit() { onChange({ target: { value: draft } }); setOpen(false); }
  function clear() { onChange({ target: { value: "" } }); setOpen(false); }
  function setHour24(h24) {
    setDraft(`${String(h24).padStart(2, "0")}:${mm}`);
    setMode("minute");
  }
  function setMinute(m) { setDraft(`${hh}:${String(m).padStart(2, "0")}`); }
  function handleFaceClick(e) {
    const rect = faceRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - cx, dy = clientY - cy;
    let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    if (mode === "hour") {
      let h12 = Math.round(angle / 30) % 12;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const midR = (OUTER_R + INNER_R) / 2;
      const isInner = dist < midR;
      setHour24(isInner ? h12 + 12 : h12);
    } else {
      let m = Math.round(angle / 6) % 60;
      setMinute(m);
    }
  }
  const CX = 90, CY = 90, OUTER_R = 78, INNER_R = 50;
  const handLen = mode === "hour" ? (hourNum >= 12 ? INNER_R - 8 : OUTER_R - 8) : 62;
  const handAngle = mode === "hour" ? (hourNum % 12) * 30 : minNum * 6;
  const handRad = (handAngle - 90) * Math.PI / 180;
  const handX = CX + handLen * Math.cos(handRad), handY = CY + handLen * Math.sin(handRad);
  const hourMarks = [
    ...Array.from({ length: 12 }, (_, i) => ({ v: i, r: OUTER_R })),
    ...Array.from({ length: 12 }, (_, i) => ({ v: i + 12, r: INNER_R })),
  ];
  const minMarks = Array.from({ length: 12 }, (_, i) => ({ v: i * 5, r: OUTER_R }));
  const marks = mode === "hour" ? hourMarks : minMarks;
  return (
    <span style={{ position: "relative", display: "block" }}>
      <button type="button" disabled={disabled} className={"mt-type-field-btn" + (className ? " " + className : "")} style={{ ...style, ...(disabled ? { opacity: 0.6, cursor: "not-allowed" } : {}) }} title={title} onClick={openPicker}>
        <Clock size={14} />
        <span className="mt-type-text" dir="ltr" style={value && Number(value.split(":")[0]) < 6 ? { color: "#C1543A", fontWeight: 700 } : undefined}>{value || "--:--"}</span>
        {value && Number(value.split(":")[0]) < 6 && <span className="mt-hint" style={{ color: "#C1543A", fontSize: 10 }} title={T.afterMidnightHint}>🌙</span>}
      </button>
      {open && (
        <div className="mt-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="mt-modal mt-time-modal mt-clock-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mt-time-modal-header">
              <span>{T.selectTime}</span>
              <button className="mt-btn ghost" style={{ padding: "4px 6px" }} onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
            <div className="mt-clock-time-display" dir="ltr">
              <span className={"mt-clock-hh" + (mode === "hour" ? " active" : "")} onClick={() => setMode("hour")}>{hh}</span>
              <span className="mt-clock-colon">:</span>
              <span className={"mt-clock-mm" + (mode === "minute" ? " active" : "")} onClick={() => setMode("minute")}>{mm}</span>
            </div>
            <div className="mt-clock-face-wrap">
              <svg ref={faceRef} viewBox="0 0 180 180" className="mt-clock-face" onClick={handleFaceClick}>
                <circle cx={CX} cy={CY} r={OUTER_R} className="mt-clock-face-circle" />
                {mode === "hour" && <circle cx={CX} cy={CY} r={INNER_R} className="mt-clock-inner-ring" />}
                <circle cx={CX} cy={CY} r={3} className="mt-clock-center-dot" />
                <line x1={CX} y1={CY} x2={handX} y2={handY} className="mt-clock-hand" />
                {marks.map(({ v, r }) => {
                  const a = (mode === "hour" ? (v % 12) * 30 : v * 6) - 90;
                  const rad = a * Math.PI / 180;
                  const mx = CX + (r - 14) * Math.cos(rad), my = CY + (r - 14) * Math.sin(rad);
                  const isSelected = mode === "hour" ? v === hourNum : v === minNum;
                  return (
                    <g key={v}>
                      {isSelected && <circle cx={mx} cy={my} r={11} className="mt-clock-num-bg" />}
                      <text x={mx} y={my + 5} textAnchor="middle" className={"mt-clock-num" + (isSelected ? " selected" : "")}>{mode === "minute" ? String(v).padStart(2, "0") : v}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <button className="mt-btn ghost" style={{ flex: 1 }} onClick={clear}>{T.clearTime}</button>
              <button className="mt-btn primary" style={{ flex: 2 }} onClick={commit}><Check size={13} /> {T.done}</button>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}

function formatStayLabel(min, T) {
  const m = Number(min) || 0;
  if (m === 0) return T.stayNone;
  const hours = Number((m / 60).toFixed(2));
  return `${hours} ${T.hoursShort}`;
}
function StayDurationField({ value, onChange, T, max, compact }) {
  const [open, setOpen] = useState(false);
  const current = value != null ? value : 0;
  const options = [];
  for (let m = 0; m <= (max || 360); m += 30) options.push(m);
  return (
    <span style={{ position: "relative", display: "block" }}>
      <button type="button" className={compact ? "mt-editable" : "mt-type-field-btn"} style={compact ? { width: "100%", textAlign: "center", padding: "2px 1px" } : undefined} onClick={() => setOpen(true)} title={T.stayDurationHint}>
        {!compact && <Clock size={14} />}
        <span className={compact ? undefined : "mt-type-text"}>{formatStayLabel(current, T)}</span>
      </button>
      {open && (
        <div className="mt-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="mt-modal mt-type-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 220 }}>
            <div className="mt-time-modal-header">
              <span>{T.stayDuration}</span>
              <button className="mt-btn ghost" style={{ padding: "4px 6px" }} onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
            <div className="mt-type-list" style={{ maxHeight: 280 }}>
              {options.map((m) => (
                <button key={m} className={"opt" + (m === current ? " selected" : "")} onClick={() => { onChange(m); setOpen(false); }}>
                  {formatStayLabel(m, T)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
function TypeFieldPicker({ typeId, types, lang, T, onChange, kindFilter, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = typeMeta(typeId, types, T, lang);
  const SelIcon = ICONS[selected.icon] || Tag;
  const optionTypes = kindFilter ? types.filter((t) => t.kind === kindFilter) : types;
  function close() { setOpen(false); setSearch(""); }
  return (
    <span style={{ position: "relative", display: "block" }}>
      <button type="button" className="mt-type-field-btn" onClick={() => setOpen(true)}>
        {typeId && typeId !== "unset" ? (
          <>
            <span className="mt-type-icon" style={{ background: selected.color, width: 20, height: 20 }}><SelIcon size={11} /></span>
            <span className="mt-type-text">{selected.name}</span>
          </>
        ) : (
          <span className="mt-type-text" style={{ color: "var(--muted)" }}>{placeholder || T.selectType}</span>
        )}
        <ChevronDown size={13} style={{ marginInlineStart: "auto" }} />
      </button>
      {open && (
        <div className="mt-modal-backdrop" onClick={close}>
          <div dir={lang === "he" ? "rtl" : "ltr"} className="mt-modal mt-type-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mt-type-search-wrap">
              <Search size={13} />
              <input className="mt-type-search" placeholder={T.searchTypes} value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && <button className="mt-type-search-clear" onClick={() => setSearch("")}><X size={12} /></button>}
              <button className="mt-btn ghost" style={{ padding: "4px 6px" }} onClick={close}><X size={16} /></button>
            </div>
            <div className="mt-type-list">
              {groupTypesByCategory(optionTypes)
                .map((grp) => ({ ...grp, items: grp.items.filter((t) => typeDisplayName(t, lang).toLowerCase().includes(search.toLowerCase())) }))
                .filter((grp) => grp.items.length)
                .map((grp) => (
                  <React.Fragment key={grp.category}>
                    <div className="mt-type-cat-label">{CATEGORY_LABELS[lang][grp.category] || grp.category}</div>
                    {grp.items.map((t) => {
                      const TI = ICONS[t.icon] || Tag;
                      const isSel = t.id === typeId;
                      return (
                        <button key={t.id} className={"opt" + (isSel ? " selected" : "")} onClick={() => { onChange(t.id); close(); }}>
                          <span className="mt-type-icon" style={{ background: t.color, width: 20, height: 20 }}><TI size={11} /></span>
                          <span style={{ flex: 1 }}>{typeDisplayName(t, lang)}</span>
                          {isSel && <Check size={13} />}
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
            </div>
          </div>
        </div>
      )}
    </span>
  );
}

function HelpButton({ topic, lang, T, onOpenFull, size = 15, openTopic, setOpenTopic }) {
  const open = openTopic === topic;
  const setOpen = (v) => setOpenTopic(v ? topic : null);
  const { refs, floatingStyles } = useFloating({
    open, onOpenChange: setOpen,
    placement: "bottom-end",
    strategy: "fixed",
    middleware: [offset(6), flip(), shift({ padding: 10 })],
    whileElementsMounted: autoUpdate,
  });
  const topicData = HELP_TOPICS[topic];
  if (!topicData) return null;
  const Icon = ICONS[topicData.icon] || HelpCircle;
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button ref={refs.setReference} type="button" className="mt-help-btn" onClick={(e) => { e.stopPropagation(); setOpenTopic(open ? null : topic); }} title={lang === "he" ? "עזרה" : "Help"}>
        <HelpCircle size={size} />
      </button>
      {open && createPortal(
        <>
          <div className="mt-floating-backdrop" onClick={(e) => { e.stopPropagation(); setOpenTopic(null); }} style={{ background: "rgba(20,35,32,.4)" }} />
          <div ref={refs.setFloating} dir={lang === "he" ? "rtl" : "ltr"} style={{ ...floatingStyles, zIndex: 400 }} className="mt-floating-menu mt-help-popover" onClick={(e) => e.stopPropagation()}>
            <div className="mt-help-popover-title"><Icon size={14} /> {lang === "he" ? topicData.title_he : topicData.title_en}</div>
            <p className="mt-help-popover-text">{lang === "he" ? topicData.short_he : topicData.short_en}</p>
            <button className="mt-help-popover-more" onClick={() => { setOpenTopic(null); onOpenFull(topic); }}>{lang === "he" ? "עוד בעזרה ←" : "More in Help →"}</button>
          </div>
        </>,
        document.body
      )}
    </span>
  );
}

function FrameDateBadge({ date, lang }) {
  return (
    <span className="mt-frame-date-badge">
      <span className="mt-day-badge-top" />
      <span className="mt-day-badge-body">
        <span className="mt-day-badge-num">{dayOfMonth(date)}</span>
        <span className="mt-day-badge-mon">{monthAbbrev(date, lang)}</span>
      </span>
    </span>
  );
}

/* Best-effort city name for a hotel frame's subtitle. Tries the frame name's own "City, Hotel" or
   "Hotel (City)" conventions first; falls back to the verified address of one of its own
   checkin/checkout/transfer records — Google/Nominatim addresses for this trip consistently end in
   "..., City, Postal Code, Country", so the segment third from the end is the city/province. */
const CITY_NAME_HE = {
  "bangkok": "בנגקוק", "phuket": "פוקט", "pai": "פאי", "koh samui": "קוסמוי", "samui": "קוסמוי",
  "koh phangan": "קופנגן", "phangan": "קופנגן", "kanchanaburi": "קנצ'נבורי", "chiang mai": "צ'אנג מאי",
  "krabi": "קרבי", "koh tao": "קוטאו", "koh lanta": "קולנטה", "hua hin": "הואהין", "pattaya": "פטאיה",
  "ayutthaya": "איוטהאיה", "chiang rai": "צ'אנג ראי",
};
/* Shows the city label in Hebrew when the app is in Hebrew mode and a translation is known;
   otherwise falls back to whatever value is already stored (which may already be Hebrew). */
function hotelCityLabel(city, lang) {
  if (!city) return city;
  if (lang === "he") {
    const he = CITY_NAME_HE[city.trim().toLowerCase()];
    if (he) return he;
  }
  return city;
}
/* Hotel frame names can get long ("Saturdays Residence by Brown Starling..."), wrapping to a
   second line and breaking the compact header layout — truncate to a fixed length instead. */
function truncateFrameName(name, max) {
  if (!name || name.length <= max) return name;
  return name.slice(0, max) + "...";
}
function hotelCityForFrame(frame, rows) {
  if (frame.hotelRef && frame.hotelRef.city) return frame.hotelRef.city;
  const parenMatch = frame.name.match(/\(([^)]+)\)\s*$/);
  if (parenMatch) return parenMatch[1].trim();
  if (frame.name.includes(",")) return frame.name.split(",")[0].trim();
  const withAddress = rows.find((r) => r.frameId === frame.id && (r.toVerifiedText || r.fromVerifiedText));
  if (withAddress) {
    const address = withAddress.toVerifiedText || withAddress.fromVerifiedText;
    const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) return parts[parts.length - 3];
  }
  return null;
}
function FrameBlock({ frame, depth, ctx, renderContext }) {
  const { T, lang, toggleFrameCollapse, openFrameModal, setDeleteFrameConfirmId, openAddDayModal, addRow, lastDateInContext, frameTotals, displayCurrency, convertAmount, frameMenuOpenId, setFrameMenuOpenId, onDropDay, dragDayKey, rows, frames, openHotelInfo } = ctx;
  const totals = frameTotals(frame.id);
  const convertedTotal = Object.entries(totals).reduce((sum, [cur, amt]) => sum + convertAmount(amt, cur, displayCurrency), 0);
  const color = FRAME_COLORS[depth % FRAME_COLORS.length];
  const isMenuOpen = frameMenuOpenId === frame.id;
  const menuFloating = useFloatingMenu(isMenuOpen, (open) => setFrameMenuOpenId(open ? frame.id : null));
  const { setNodeRef: setFrameDropRef, isOver: isFrameOver } = useDroppable({ id: "frame:" + frame.id, data: { type: "frame", fid: frame.id } });
  const dayCount = frame.startDate && frame.endDate ? Math.round((new Date(frame.endDate + "T00:00:00") - new Date(frame.startDate + "T00:00:00")) / 86400000) + 1 : 0;
  const effectiveFrameType = effectiveFrameTypeOf(frame, rows);
  const hotelRowWithPlace = effectiveFrameType === "hotel" ? rows.find((r) => r.frameId === frame.id && (r.typeId === "checkin" || r.typeId === "checkout") && (r.fromPlaceId || r.toPlaceId)) : null;
  return (
    <div className="mt-frame-block" style={{ "--frame-color": color }}>
      <div ref={setFrameDropRef} className={"mt-frame-header" + (dragDayKey ? " droppable" : "") + (isFrameOver ? " mt-drop-hover" : "") + (effectiveFrameType ? " mt-frame-header-special" : "")} onClick={() => toggleFrameCollapse(frame.id)}>
        {effectiveFrameType ? (
          <div className="mt-frame-header-special-wrap">
            <div className="mt-frame-header-row1">
              <span className="chev">{frame.collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}</span>
              {effectiveFrameType === "trip" ? (
                <span className="mt-frame-type-icon"><Plane size={15} /></span>
              ) : effectiveFrameType === "flight" ? (
                <span className="mt-frame-type-icon"><PlaneTakeoff size={15} /></span>
              ) : (
                <button className="mt-frame-type-icon mt-frame-type-icon-btn" onClick={(e) => { e.stopPropagation(); if (hotelRowWithPlace) openHotelInfo(hotelRowWithPlace); }} title={hotelRowWithPlace ? T.placeInfo : undefined}><BedDouble size={15} /></button>
              )}
              <span className="mt-frame-name-full" title={frame.name}>{effectiveFrameType === "hotel" ? truncateFrameName(frame.name, 25) : frame.name}</span>
            </div>
            <div className="mt-frame-header-row2">
              <div className="mt-frame-header-row2-start">
                {effectiveFrameType === "hotel" && hotelCityForFrame(frame, rows) ? (
                  <span className="mt-frame-city">
                    {hotelCityLabel(hotelCityForFrame(frame, rows), lang)}
                    {dayCount > 0 && ` (${formatDayCount(dayCount, lang)})`}
                  </span>
                ) : (
                  dayCount > 0 && <span className="mt-frame-daycount">{formatDayCount(dayCount, lang)}</span>
                )}
                {convertedTotal > 0 && (
                  <span className="mt-frame-cost-inline">{displayCurrency} {convertedTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                )}
              </div>
              <div className="mt-frame-header-row2-end">
                <span className="mt-frame-date-cluster" dir="ltr">
                  <FrameDateBadge date={frame.startDate} lang={lang} />
                  <ArrowRight size={14} className="mt-frame-date-arrow" />
                  <FrameDateBadge date={frame.endDate} lang={lang} />
                </span>
                <span className="mt-frame-actions" onClick={(e) => e.stopPropagation()}>
                  <button ref={menuFloating.refs.setReference} {...menuFloating.getReferenceProps()} title={T.moreOptions}><MoreVertical size={16} /></button>
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-frame-header-top">
              <span className="chev">{frame.collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}</span>
              <span className="mt-frame-name">{frame.name}</span>
              <span className="mt-frame-end-group">
                {convertedTotal > 0 && (
                  <span className="mt-frame-cost-inline">{displayCurrency} {convertedTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                )}
                <span className="mt-frame-actions" onClick={(e) => e.stopPropagation()}>
                  <button ref={menuFloating.refs.setReference} {...menuFloating.getReferenceProps()} title={T.moreOptions}><MoreVertical size={16} /></button>
                </span>
              </span>
            </div>
            <div className="mt-frame-header-dates">
              <FrameInlineDatePicker frame={frame} ctx={ctx} />
            </div>
          </>
        )}
      </div>
      {isMenuOpen && (
        <>
          <div className="mt-floating-backdrop" onClick={() => setFrameMenuOpenId(null)} />
          <div ref={menuFloating.refs.setFloating} style={{ ...menuFloating.floatingStyles, zIndex: 400 }} {...menuFloating.getFloatingProps()} className="mt-floating-menu mt-kebab-menu">
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
            <button className="mt-share-opt" style={{ color: "var(--danger)" }} onClick={() => { setDeleteFrameConfirmId(frame.id); setFrameMenuOpenId(null); }}><Trash2 size={14} /> {T.delete}</button>
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
  const [rows, setRows] = useState([]);
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
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [narrowScreen, setNarrowScreen] = useState(false);
  const [cloudUser, setCloudUser] = useState(null);
  const [cloudAuthLoading, setCloudAuthLoading] = useState(supabaseEnabled);
  const [cloudSyncOpen, setCloudSyncOpen] = useState(false);
  const [cloudTrips, setCloudTrips] = useState([]);
  const [cloudTripsLoading, setCloudTripsLoading] = useState(false);
  const [cloudSaveStatus, setCloudSaveStatus] = useState(null);
  const [cloudSaveName, setCloudSaveName] = useState("");
  useEffect(() => {
    if (!supabaseEnabled) { setCloudAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setCloudUser((data.session && data.session.user) || null);
      setCloudAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCloudUser((session && session.user) || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    const todayStr = toLocalISODate(new Date());
    const initial = {};
    rows.forEach((r) => {
      if (r.date && r.date < todayStr) {
        const gk = (r.frameId || "root") + "__" + r.date;
        initial[gk] = true;
      }
    });
    return initial;
  });
  const [collapsedParents, setCollapsedParents] = useState({});
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colMenu = useFloatingMenu(colMenuOpen, setColMenuOpen);
  const [newColName, setNewColName] = useState("");
  const [typeMenuOpen, setTypeMenuOpen] = useState(null);
  const [arrivalMenuOpen, setArrivalMenuOpen] = useState(null);
  const [newTypeDraft, setNewTypeDraft] = useState({ name: "", icon: "Tag", kind: "desc" });
  const [addTypeOpen, setAddTypeOpen] = useState(false);
  const addTypeMenu = useFloatingMenu(addTypeOpen, setAddTypeOpen);
  const [addTypeDraft, setAddTypeDraft] = useState({ name: "", icon: "Tag", kind: "desc" });
  const [cardRowId, setCardRowId] = useState(null);
  const [cardDraft, setCardDraft] = useState(null);
  const [flightLookupMsg, setFlightLookupMsg] = useState("");
  const [savedHotelsOpen, setSavedHotelsOpen] = useState(false);
  const savedHotelsMenu = useFloatingMenu(savedHotelsOpen, setSavedHotelsOpen);
  const [weatherData, setWeatherData] = useState(null);
  const [remindersOn, setRemindersOn] = useState(false);
  const [firedReminders, setFiredReminders] = useState({});
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const actionsMenu = useFloatingMenu(actionsMenuOpen, setActionsMenuOpen);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const settingsMenu = useFloatingMenu(settingsMenuOpen, setSettingsMenuOpen);
  const [alertsMenuOpen, setAlertsMenuOpen] = useState(false);
  const alertsMenu = useFloatingMenu(alertsMenuOpen, setAlertsMenuOpen);
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
  const PRE_WIZARD_DEFAULTS = {
    hasTripPlan: "",
    // "yes" branch
    tripName: "טיול מקיף תאילנד", travelerCount: "couple", destination: "תאילנד",
    planStartDate: "2026-08-01", planEndDate: "2026-08-31",
    // "no" branch (AI-assisted)
    noPlanTravelerCount: "", preferredDestinations: "", budgetLevel: "", interests: [],
    accommodationPrefs: "", pace: "", planNotes: "",
    // step 2
    hasFlights: "yes",
    flights: [
      { flightNumber: "", from: "", fromAlias: "", to: "", toAlias: "", depDate: "2026-08-01", depTime: "", landTime: "", addTransferTo: true, addTransferFrom: true },
      { flightNumber: "", from: "", fromAlias: "", to: "", toAlias: "", depDate: "2026-08-31", depTime: "", landTime: "", addTransferTo: true, addTransferFrom: true },
    ],
    // step 3 (domestic)
    hasDomestic: "yes",
    domesticFlights: [
      { flightNumber: "", from: "", fromAlias: "", to: "", toAlias: "", depDate: "2026-08-09", depTime: "", landTime: "", addTransferTo: true, addTransferFrom: true },
      { flightNumber: "", from: "", fromAlias: "", to: "", toAlias: "", depDate: "2026-08-16", depTime: "", landTime: "", addTransferTo: true, addTransferFrom: true },
      { flightNumber: "", from: "", fromAlias: "", to: "", toAlias: "", depDate: "2026-08-23", depTime: "", landTime: "", addTransferTo: true, addTransferFrom: true },
    ],
    // step 4
    hasHotels: "yes",
    hotels: [
      { name: "מלון בצ'אנג מאי", alias: "", checkIn: "2026-08-01", checkOut: "2026-08-09" },
      { name: "מלון בקוסמוי", alias: "", checkIn: "2026-08-09", checkOut: "2026-08-12" },
      { name: "מלון בקופנגאן", alias: "", checkIn: "2026-08-12", checkOut: "2026-08-16" },
      { name: "מלון בפוקט", alias: "", checkIn: "2026-08-16", checkOut: "2026-08-23" },
      { name: "מלון בקנצ'נבורי", alias: "", checkIn: "2026-08-23", checkOut: "2026-08-27" },
      { name: "מלון בבנגקוק", alias: "", checkIn: "2026-08-27", checkOut: "2026-08-31" },
    ],
  };
  const [preWizardOpen, setPreWizardOpen] = useState(false);
  const [flightRefreshStatus, setFlightRefreshStatus] = useState(null);
  const [flightManagerOpen, setFlightManagerOpen] = useState(false);
  const [remindersManagerOpen, setRemindersManagerOpen] = useState(false);
  const [flightManagerRowStatus, setFlightManagerRowStatus] = useState({});
  const [hotelManagerOpen, setHotelManagerOpen] = useState(false);
  const [preWizardEditMode, setPreWizardEditMode] = useState(false);
  const [preWizardScreen, setPreWizardScreen] = useState(0);
  const [preWizardData, setPreWizardData] = useState(PRE_WIZARD_DEFAULTS);
  const [preWizardLastSubmitted, setPreWizardLastSubmitted] = useState(null);
  const [preWizardRefDate, setPreWizardRefDate] = useState("");
  useEffect(() => {
    if (!preWizardOpen) return;
    const { planStartDate, planEndDate } = preWizardData;
    if (!planStartDate && !planEndDate) return;
    setPreWizardData((d) => {
      if (!d.flights.length) return d;
      const flights = d.flights.slice();
      if (planStartDate) flights[0] = { ...flights[0], depDate: planStartDate };
      if (planEndDate && flights.length > 1) flights[flights.length - 1] = { ...flights[flights.length - 1], depDate: planEndDate };
      return { ...d, flights };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preWizardData.planStartDate, preWizardData.planEndDate, preWizardOpen]);
  const [preWizardCreatedIds, setPreWizardCreatedIds] = useState(null);
  const [frameMenuOpenId, setFrameMenuOpenId] = useState(null);
  const [frameDraft, setFrameDraft] = useState(null);
  const [deleteFrameConfirmId, setDeleteFrameConfirmId] = useState(null);
  const CHECKLIST_DEFAULTS = {
    reservations: [
      { id: "flight", label_he: "טיסות", label_en: "Flights", checked: false, doc: null },
      { id: "domesticFlight", label_he: "טיסות פנים", label_en: "Domestic flights", checked: false, doc: null },
      { id: "hotel", label_he: "מלון", label_en: "Hotel", checked: false, doc: null },
    ],
    documents: [
      { id: "passport", label_he: "דרכון", label_en: "Passport", checked: false, doc: null },
      { id: "visa", label_he: "ויזה", label_en: "Visa", checked: false, doc: null },
      { id: "medical", label_he: "מסמך רפואי", label_en: "Medical document", checked: false, doc: null },
      { id: "license", label_he: "רישיון בינלאומי", label_en: "International license", checked: false, doc: null },
    ],
    checkin: [{ id: "checkin", label_he: "צ'ק אין טיסות", label_en: "Flight check-in", checked: false, doc: null }],
    currency: [{ id: "currency", label_he: "המרת כסף", label_en: "Currency exchange", checked: false, doc: null }],
    airport: [{ id: "airport", label_he: "דרכי הגעה לשדה", label_en: "Ways to the airport", checked: false, doc: null }],
    shopping: [],
    packing: [
      { id: "pk1", label_he: "מטען טלפון", label_en: "Phone charger", checked: false, doc: null },
      { id: "pk2", label_he: "מתאם חשמל", label_en: "Power adapter", checked: false, doc: null },
      { id: "pk3", label_he: "פאוארבנק", label_en: "Power bank", checked: false, doc: null },
      { id: "pk4", label_he: "תרופות אישיות", label_en: "Personal medications", checked: false, doc: null },
      { id: "pk5", label_he: "משקפי שמש", label_en: "Sunglasses", checked: false, doc: null },
      { id: "pk6", label_he: "אוזניות", label_en: "Headphones", checked: false, doc: null },
      { id: "pk7", label_he: "כרית צוואר", label_en: "Neck pillow", checked: false, doc: null },
      { id: "pk8", label_he: "עותק צילום דרכון", label_en: "Passport photocopy", checked: false, doc: null },
      { id: "pk9", label_he: "מברשת ומשחת שיניים", label_en: "Toothbrush & toothpaste", checked: false, doc: null },
      { id: "pk10", label_he: "בגדים להחלפה", label_en: "Change of clothes", checked: false, doc: null },
    ],
  };
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklist, setChecklist] = useState(CHECKLIST_DEFAULTS);
  const checklistFileInputRef = useRef(null);
  const rowFileInputRef = useRef(null);
  const rowPhotoInputRef = useRef(null);
  const [rowUploadKind, setRowUploadKind] = useState(null);
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(false);
  const [checklistUploadTarget, setChecklistUploadTarget] = useState(null);
  const [fileUploadMsg, setFileUploadMsg] = useState(null);
  const [managedFiles, setManagedFiles] = useState([]);
  const [fileManagerOpen, setFileManagerOpen] = useState(false);
  const [fileManagerFolder, setFileManagerFolder] = useState(null);
  const [fileManagerSort, setFileManagerSort] = useState({ key: "date", dir: "desc" });
  const [helpCenterOpen, setHelpCenterOpen] = useState(false);
  const [helpPopoverOpen, setHelpPopoverOpen] = useState(null);
  useEffect(() => { if (!actionsMenuOpen) setHelpPopoverOpen(null); }, [actionsMenuOpen]);
  useEffect(() => { if (!addTypeOpen) setHelpPopoverOpen(null); }, [addTypeOpen]);
  const [helpCenterFocusTopic, setHelpCenterFocusTopic] = useState(null);
  const [packingListOpen, setPackingListOpen] = useState(false);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const checklistOtherItems = [
    ...checklist.reservations, ...checklist.documents, ...checklist.checkin, ...checklist.currency, ...checklist.airport,
  ];
  const checklistOtherPct = checklistOtherItems.length
    ? (checklistOtherItems.filter((it) => it.checked).length / checklistOtherItems.length) * 70
    : 0;
  const checklistPackingPct = checklist.packing.length
    ? (checklist.packing.filter((it) => it.checked).length / checklist.packing.length) * 30
    : 0;
  const checklistProgressPct = Math.round(checklistOtherPct + checklistPackingPct);
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
  function getColWidth(key) {
    const w = columnWidths[key] != null ? columnWidths[key] : colFixedWidth(key);
    return COL_MIN_WIDTHS[key] != null ? Math.max(COL_MIN_WIDTHS[key], w) : w;
  }
  function startResize(e, key) {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    const startWidth = getColWidth(key);
    const minW = COL_MIN_WIDTHS[key] != null ? COL_MIN_WIDTHS[key] : 24;
    function onMove(ev) {
      const delta = ev.clientX - startX;
      const signed = dir === "rtl" ? -delta : delta;
      setColumnWidths((prev) => ({ ...prev, [key]: Math.max(minW, startWidth + signed) }));
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
    setRows(recomputeChainTimesPure(snap.rows, snap.frames)); setFrames(snap.frames);
    setHistoryIndex(historyIndex - 1);
  }
  function redo() {
    if (historyIndex >= history.length - 1) return;
    const snap = history[historyIndex + 1];
    isApplyingHistory.current = true;
    setRows(recomputeChainTimesPure(snap.rows, snap.frames)); setFrames(snap.frames);
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
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem(SAVED_TRIPS_KEY) || "{}"); } catch (e) { stored = {}; }
    return { ...stored, ...BUILT_IN_TRIP_TEMPLATES };
  }
  function openSaveTripModal() { setSaveTripName(""); setSaveTripMsg(null); setSaveTripOpen(true); setActionsMenuOpen(false); }
  function confirmSaveTrip() {
    if (!saveTripName.trim()) return;
    try {
      const all = listSavedTrips();
      all[saveTripName.trim()] = { rows, frames, displayCurrency, checklist, managedFiles, savedAt: new Date().toISOString() };
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
    setRows(recomputeChainTimesPure(trip.rows || [], trip.frames || []));
    setFrames(trip.frames || []);
    if (trip.displayCurrency) setDisplayCurrency(trip.displayCurrency);
    setChecklist(trip.checklist || CHECKLIST_DEFAULTS);
    setManagedFiles(trip.managedFiles || []);
    setLoadTripOpen(false);
  }
  function deleteSavedTrip(name) {
    if (BUILT_IN_TRIP_TEMPLATES[name]) return;
    const all = listSavedTrips();
    delete all[name];
    try { localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(all)); } catch (e) {}
  }

  /* ---------- cloud sync (Supabase) ---------- */
  function signInWithGoogle() {
    if (!supabaseEnabled) return;
    supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href } });
  }
  function signOutCloud() {
    if (!supabaseEnabled) return;
    supabase.auth.signOut();
    setCloudTrips([]);
  }
  function openCloudSync() {
    setCloudSyncOpen(true);
    setCloudSaveName(frames.find((f) => !f.parentFrameId)?.name || "");
    if (cloudUser) refreshCloudTrips();
  }
  async function refreshCloudTrips() {
    if (!cloudUser) return;
    setCloudTripsLoading(true);
    const { data, error } = await supabase
      .from("trips")
      .select("id, name, updated_at")
      .order("updated_at", { ascending: false });
    setCloudTripsLoading(false);
    if (!error) setCloudTrips(data || []);
  }
  async function saveTripToCloud(nameOverride, silent) {
    if (!cloudUser) return;
    const name = (nameOverride != null ? nameOverride : cloudSaveName).trim() || T.cloudUntitledTrip;
    if (!silent) setCloudSaveStatus("saving");
    const { data: existing } = await supabase
      .from("trips").select("id").eq("owner_id", cloudUser.id).eq("name", name).limit(1).maybeSingle();
    const payload = { owner_id: cloudUser.id, name, rows, frames, display_currency: displayCurrency, checklist, managed_files: managedFiles };
    const { error } = existing
      ? await supabase.from("trips").update(payload).eq("id", existing.id)
      : await supabase.from("trips").insert(payload);
    if (!silent) {
      setCloudSaveStatus(error ? "error" : "saved");
      setTimeout(() => setCloudSaveStatus(null), 4000);
    }
    if (!error) refreshCloudTrips();
    return !error;
  }
  async function loadTripFromCloud(id) {
    setCloudTripsLoading(true);
    const { data, error } = await supabase.from("trips").select("*").eq("id", id).single();
    setCloudTripsLoading(false);
    if (error || !data) return;
    setRows(recomputeChainTimesPure(data.rows || [], data.frames || []));
    setFrames(data.frames || []);
    if (data.display_currency) setDisplayCurrency(data.display_currency);
    setChecklist(data.checklist && Object.keys(data.checklist).length ? data.checklist : CHECKLIST_DEFAULTS);
    setManagedFiles(data.managed_files || []);
    setCloudSyncOpen(false);
  }
  async function deleteCloudTrip(id) {
    await supabase.from("trips").delete().eq("id", id);
    refreshCloudTrips();
  }
  useEffect(() => {
    if (!cloudUser) return;
    const timer = setTimeout(() => { saveTripToCloud(T.cloudAutoSaveName, true); }, 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, frames, displayCurrency, cloudUser]);

  /* ---------- cloud file storage (Supabase Storage) ---------- */
  const STORAGE_BUCKET = "trip-files";
  async function uploadFileToStorage(file) {
    if (!supabaseEnabled || !cloudUser) return null;
    const path = `${cloudUser.id}/${uid()}-${file.name}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file);
    if (error) return null;
    const { data: signed } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
    return { path, url: (signed && signed.signedUrl) || null };
  }
  async function deleteFileFromStorage(path) {
    if (!supabaseEnabled || !path) return;
    await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  }

  function preWizardNext() {
    setPreWizardScreen((s) => Math.min(3, s + 1));
  }
  function preWizardBack() {
    setPreWizardScreen((s) => Math.max(0, s - 1));
  }
  function togglePreWizardInterest(key) {
    setPreWizardData((d) => ({ ...d, interests: d.interests.includes(key) ? d.interests.filter((k) => k !== key) : [...d.interests, key] }));
  }
  function toggleChecklistItem(cat, id) {
    setChecklist((c) => ({ ...c, [cat]: c[cat].map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)) }));
  }
  function addChecklistSubItem(cat, text) {
    if (!text || !text.trim()) return;
    setChecklist((c) => ({ ...c, [cat]: [...c[cat], { id: uid(), label_he: text, label_en: text, checked: false, doc: null }] }));
  }
  function removeChecklistItem(cat, id) {
    setChecklist((c) => ({ ...c, [cat]: c[cat].filter((it) => it.id !== id) }));
  }
  function inferFileType(filename) {
    const ext = (filename.split(".").pop() || "").toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "heic", "bmp", "svg"].includes(ext)) return "image";
    if (ext === "pdf") return "pdf";
    if (["doc", "docx", "rtf", "odt"].includes(ext)) return "document";
    if (["xls", "xlsx", "csv", "ods"].includes(ext)) return "spreadsheet";
    if (["ppt", "pptx", "odp"].includes(ext)) return "presentation";
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
    return "other";
  }
  function folderKeyFor(cat) {
    if (["checkin", "currency", "airport"].includes(cat)) return "other";
    return cat;
  }
  function openChecklistUpload(cat, id) {
    setChecklistUploadTarget({ cat, id });
    if (checklistFileInputRef.current) { checklistFileInputRef.current.value = ""; checklistFileInputRef.current.click(); }
  }
  async function handleChecklistFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file || !checklistUploadTarget) return;
    const { cat, id } = checklistUploadTarget;
    const item = checklist[cat].find((it) => it.id === id);
    const label = item ? (lang === "he" ? item.label_he : item.label_en) : "";
    setChecklistUploadTarget(null);
    const defaultTitle = file.name.replace(/\.[^.]+$/, "");
    const title = (window.prompt(T.checklistDocTitlePrompt, defaultTitle) || defaultTitle).trim();
    if (!cloudUser) {
      const doc = { id: uid(), name: file.name, title, url: null, path: null };
      setChecklist((c) => ({ ...c, [cat]: c[cat].map((it) => (it.id === id ? { ...it, docs: [...(it.docs || []), doc] } : it)) }));
      setManagedFiles((prev) => [...prev, { id: doc.id, name: file.name, url: null, path: null, size: file.size, type: inferFileType(file.name), sourceCat: cat, sourceId: id, sourceLabel: label, uploadedAt: Date.now() }]);
      setFileUploadMsg({ ok: false, reason: "not-signed-in" });
      setTimeout(() => setFileUploadMsg(null), 6000);
      return;
    }
    setFileUploadMsg({ uploading: true });
    const uploaded = await uploadFileToStorage(file);
    setFileUploadMsg(uploaded ? { ok: true } : { ok: false, reason: "error" });
    setTimeout(() => setFileUploadMsg(null), 4000);
    if (!uploaded) return;
    const doc = { id: uid(), name: file.name, title, url: uploaded.url, path: uploaded.path };
    setChecklist((c) => ({ ...c, [cat]: c[cat].map((it) => (it.id === id ? { ...it, docs: [...(it.docs || []), doc] } : it)) }));
    setManagedFiles((prev) => [...prev, { id: doc.id, name: file.name, url: uploaded.url, path: uploaded.path, size: file.size, type: inferFileType(file.name), sourceCat: cat, sourceId: id, sourceLabel: label, uploadedAt: Date.now() }]);
  }
  function removeChecklistDoc(cat, id, docId) {
    const item = checklist[cat].find((it) => it.id === id);
    const doc = item && (item.docs || []).find((d) => d.id === docId);
    if (doc && doc.path) deleteFileFromStorage(doc.path);
    setChecklist((c) => ({ ...c, [cat]: c[cat].map((it) => (it.id === id ? { ...it, docs: (it.docs || []).filter((d) => d.id !== docId) } : it)) }));
    setManagedFiles((prev) => prev.filter((f) => f.id !== docId));
  }
  function openRowUpload(kind) {
    setRowUploadKind(kind);
    const ref = kind === "photo" ? rowPhotoInputRef : rowFileInputRef;
    if (ref.current) { ref.current.value = ""; ref.current.click(); }
  }
  async function handleRowFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    const kind = rowUploadKind;
    setRowUploadKind(null);
    if (!file || !cardDraft) return;
    const tm = typeMeta(cardDraft.typeId, types, T, lang);
    const label = cardDraft.toAlias || cardDraft.to || tm.name;
    if (!cloudUser) {
      setFileUploadMsg({ ok: false, reason: "not-signed-in" });
      setTimeout(() => setFileUploadMsg(null), 6000);
      return;
    }
    setFileUploadMsg({ uploading: true });
    const uploaded = await uploadFileToStorage(file);
    setFileUploadMsg(uploaded ? { ok: true } : { ok: false, reason: "error" });
    setTimeout(() => setFileUploadMsg(null), 4000);
    if (!uploaded) return;
    const attachment = { id: uid(), name: file.name, url: uploaded.url, path: uploaded.path, size: file.size, type: kind === "photo" ? "image" : inferFileType(file.name), uploadedAt: Date.now() };
    setCardDraft((d) => ({ ...d, attachments: [...(d.attachments || []), attachment] }));
    setManagedFiles((prev) => [...prev, { id: attachment.id, name: attachment.name, url: attachment.url, path: attachment.path, size: attachment.size, type: attachment.type, sourceCat: "record", sourceId: cardDraft.id, sourceLabel: label, uploadedAt: attachment.uploadedAt }]);
  }
  function removeRowAttachment(attId) {
    const att = (cardDraft.attachments || []).find((a) => a.id === attId);
    if (att && att.path) deleteFileFromStorage(att.path);
    setCardDraft((d) => ({ ...d, attachments: (d.attachments || []).filter((a) => a.id !== attId) }));
    setManagedFiles((prev) => prev.filter((f) => f.id !== attId));
  }
  function openHelpTopic(topic) {
    setActionsMenuOpen(false);
    setColMenuOpen(false);
    setAddTypeOpen(false);
    setHelpCenterFocusTopic(topic);
    setHelpCenterOpen(true);
    setTimeout(() => {
      const el = document.getElementById("help-topic-" + topic);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }
  function activatePreWizardAiAgent() {
    const d = preWizardData;
    const start = toLocalISODate(new Date(Date.now() + 7 * 86400000));
    const end = toLocalISODate(new Date(Date.now() + 14 * 86400000));
    const nf = {
      id: uid(), name: T.preWizardAiPendingName, startDate: start, endDate: end, parentFrameId: null, collapsed: false, frameType: "trip",
      budgetLevel: d.budgetLevel, interests: d.interests, pace: d.pace, planningNotes: d.planNotes, accommodationType: d.accommodationPrefs,
    };
    setFrames((prev) => [...prev, nf]);
    closePreWizard();
    showDemoNotice(T.preWizardAiDemoNotice);
  }
  function addPreWizardFlight() {
    setPreWizardData((d) => ({ ...d, flights: [...d.flights, { flightNumber: "", from: "", fromAlias: "", to: "", toAlias: "", depDate: "", depTime: "", landTime: "", overnight: false, fromLat: null, fromLon: null, fromPlaceId: null, fromVerifiedUrl: "", toLat: null, toLon: null, toPlaceId: null, toVerifiedUrl: "", addTransferTo: true, addTransferFrom: true }] }));
  }
  function removePreWizardFlight(idx) {
    setPreWizardData((d) => ({ ...d, flights: d.flights.length > 1 ? d.flights.filter((_, i) => i !== idx) : d.flights }));
  }
  function addPreWizardDomesticFlight() {
    setPreWizardData((d) => ({ ...d, domesticFlights: [...d.domesticFlights, { flightNumber: "", from: "", fromAlias: "", to: "", toAlias: "", depDate: "", depTime: "", landTime: "", overnight: false, fromLat: null, fromLon: null, fromPlaceId: null, fromVerifiedUrl: "", toLat: null, toLon: null, toPlaceId: null, toVerifiedUrl: "", addTransferTo: true, addTransferFrom: true }] }));
  }
  function removePreWizardDomesticFlight(idx) {
    setPreWizardData((d) => ({ ...d, domesticFlights: d.domesticFlights.length > 1 ? d.domesticFlights.filter((_, i) => i !== idx) : d.domesticFlights }));
  }
  function addPreWizardHotel() {
    setPreWizardData((d) => ({ ...d, hotels: [...d.hotels, { name: "", alias: "", checkIn: "", checkOut: "", nameLat: null, nameLon: null, namePlaceId: null, nameVerifiedUrl: "" }] }));
  }
  function removePreWizardHotel(idx) {
    setPreWizardData((d) => ({ ...d, hotels: d.hotels.length > 1 ? d.hotels.filter((_, i) => i !== idx) : d.hotels }));
  }
  function openPreWizard() {
    setPreWizardData(PRE_WIZARD_DEFAULTS);
    setPreWizardScreen(0);
    setPreWizardRefDate(PRE_WIZARD_DEFAULTS.planStartDate || "");
    setPreWizardEditMode(false);
    setPreWizardOpen(true);
  }
  function buildWizardDataFromLive() {
    const mainFrame = frames.find((f) => !f.parentFrameId);
    if (!mainFrame) return null;
    function mapFlightRows(typeId) {
      return rows.filter((r) => r.frameId === mainFrame.id && r.typeId === typeId).map((r) => ({
        flightNumber: r.flightNumber || "", from: r.from || "", fromAlias: r.fromAlias || "", to: r.to || "", toAlias: r.toAlias || "",
        depDate: r.date || "", depTime: r.startTime || "", landTime: r.endTime || "", overnight: !!r.overnight,
        addTransferTo: false, addTransferFrom: false,
      }));
    }
    const liveFlights = mapFlightRows("flight");
    const liveDomestic = mapFlightRows("domestic-flight");
    const hotelSubFrames = frames.filter((f) => f.parentFrameId === mainFrame.id && f.frameType === "hotel");
    const liveHotels = hotelSubFrames.map((hf) => {
      const checkinRow = rows.find((r) => r.frameId === hf.id && r.typeId === "checkin");
      return {
        name: hf.name || "", alias: (checkinRow && checkinRow.toAlias) || "", checkIn: hf.startDate || "", checkOut: hf.endDate || "",
        nameLat: (checkinRow && checkinRow.toLat) || null, nameLon: (checkinRow && checkinRow.toLon) || null,
        namePlaceId: (checkinRow && checkinRow.toPlaceId) || null, nameVerifiedUrl: (checkinRow && checkinRow.toVerifiedUrl) || "",
        city: hotelCityForFrame(hf, rows) || "",
      };
    });
    return {
      hasTripPlan: "yes",
      tripName: mainFrame.name || "", planStartDate: mainFrame.startDate || "", planEndDate: mainFrame.endDate || "",
      hasFlights: liveFlights.length ? "yes" : "no", flights: liveFlights.length ? liveFlights : PRE_WIZARD_DEFAULTS.flights,
      hasDomestic: liveDomestic.length ? "yes" : "no", domesticFlights: liveDomestic.length ? liveDomestic : PRE_WIZARD_DEFAULTS.domesticFlights,
      hasHotels: liveHotels.length ? "yes" : "no", hotels: liveHotels.length ? liveHotels : PRE_WIZARD_DEFAULTS.hotels,
    };
  }
  function openEditTripDetails() {
    const liveData = buildWizardDataFromLive();
    const base = preWizardLastSubmitted ? { ...PRE_WIZARD_DEFAULTS, ...preWizardLastSubmitted } : PRE_WIZARD_DEFAULTS;
    const restored = liveData ? { ...base, ...liveData } : base;
    setPreWizardData(restored);
    setPreWizardScreen(0);
    setPreWizardRefDate(restored.planStartDate || "");
    setPreWizardEditMode(true);
    setPreWizardOpen(true);
  }
  function closePreWizard() {
    setPreWizardOpen(false);
    setPreWizardScreen(0);
    setPreWizardRefDate("");
    setPreWizardEditMode(false);
  }
  function updatePreWizardArrayItem(field, idx, patch) {
    setPreWizardData((d) => {
      const arr = d[field].slice();
      arr[idx] = { ...arr[idx], ...patch };
      return { ...d, [field]: arr };
    });
  }
  function movePreWizardArrayItem(field, idx, dir) {
    setPreWizardData((d) => {
      const arr = d[field].slice();
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return d;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return { ...d, [field]: arr };
    });
  }
  function movePreWizardArrayItem(field, idx, dir) {
    setPreWizardData((d) => {
      const arr = d[field].slice();
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return d;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return { ...d, [field]: arr };
    });
  }
  function fetchWizardFlightData(field, idx) {
    const item = preWizardData[field][idx];
    const num = item.flightNumber && item.flightNumber.trim();
    if (!num) { updatePreWizardArrayItem(field, idx, { flightLookupMsg: T.flightNoNumber }); return; }
    updatePreWizardArrayItem(field, idx, { flightLookupMsg: T.flightLookupLoading });
    const params = new URLSearchParams({ flight: num, date: item.depDate || "" });
    fetch(`/api/flight-lookup?${params.toString()}`)
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data || data.error) { updatePreWizardArrayItem(field, idx, { flightLookupMsg: (data && data.error) || T.flightLookupError }); return; }
        const patch = { flightLookupMsg: T.flightLookupSuccess };
        if (data.departureLocation) patch.from = data.departureLocation;
        if (data.arrivalLocation) patch.to = data.arrivalLocation;
        if (data.departureAlias) patch.fromAlias = data.departureAlias;
        if (data.arrivalAlias) patch.toAlias = data.arrivalAlias;
        if (data.airline) patch.airline = data.airline;
        if (data.departureDate) patch.depDate = data.departureDate;
        if (data.departureTime) patch.depTime = data.departureTime;
        if (data.arrivalTime) patch.landTime = data.arrivalTime;
        updatePreWizardArrayItem(field, idx, patch);
      })
      .catch(() => updatePreWizardArrayItem(field, idx, { flightLookupMsg: T.flightLookupError }));
  }
  function confirmPreWizard() {
    const d = preWizardData;
    const liveRowsSnapshot = rows;
    function addDaysToISO(dateStr, days) {
      if (!dateStr) return dateStr;
      const [y, m, dd] = dateStr.split("-").map(Number);
      const dt = new Date(y, m - 1, dd + days);
      return toLocalISODate(dt);
    }
    /* Finds whatever the trip was already doing right before/after a given date, so a new transfer
       can continue the chain instead of starting with a blank origin/destination. "before" looks at
       the closest earlier date's last record; "after" looks at the closest later date's first record.
       Combines the live trip's existing rows (for edit mode) with virtual checkin/checkout entries
       built from the wizard's own hotels list (for a brand-new trip, where the hotels aren't part of
       `rows` yet at this point) so adjacency works either way. */
    function findAdjacentRow(targetDate, direction, excludeFlight) {
      // Pseudo-rows are shaped to match what the consuming code reads for each direction: a "before"
      // search reads .to (where you were, about to leave — the checkout), an "after" search reads
      // .from (where you'll be, having just arrived — the checkin).
      const hotelPseudoRows = (d.hasHotels === "yes" ? d.hotels : []).flatMap((h) => [
        h.checkOut ? { date: h.checkOut, to: h.name, toAlias: h.alias, toLat: h.nameLat, toLon: h.nameLon, toPlaceId: h.namePlaceId, toVerifiedUrl: h.nameVerifiedUrl } : null,
        h.checkIn ? { date: h.checkIn, from: h.name, fromAlias: h.alias, fromLat: h.nameLat, fromLon: h.nameLon, fromPlaceId: h.namePlaceId, fromVerifiedUrl: h.nameVerifiedUrl } : null,
      ].filter(Boolean));
      const allFlightEntries = [...(d.hasFlights === "yes" ? d.flights : []), ...(d.hasDomestic === "yes" ? d.domesticFlights : [])].filter((fl) => fl !== excludeFlight);
      const flightPseudoRows = allFlightEntries.flatMap((fl) => [
        fl.depDate && fl.from ? { date: fl.depDate, to: fl.from, toAlias: fl.fromAlias, toLat: fl.fromLat, toLon: fl.fromLon, toPlaceId: fl.fromPlaceId, toVerifiedUrl: fl.fromVerifiedUrl } : null,
        fl.depDate && fl.to ? { date: fl.overnight ? addDaysToISO(fl.depDate, 1) : fl.depDate, from: fl.to, fromAlias: fl.toAlias, fromLat: fl.toLat, fromLon: fl.toLon, fromPlaceId: fl.toPlaceId, fromVerifiedUrl: fl.toVerifiedUrl } : null,
      ].filter(Boolean));
      const pool = [...liveRowsSnapshot, ...hotelPseudoRows, ...flightPseudoRows];
      // Same-day adjacency counts (e.g. hotel checkout happens the same calendar day as the flight),
      // so both directions include the target date itself, not just strictly before/after it.
      if (direction === "before") {
        const candidates = pool.filter((r) => r.date && r.date <= targetDate && r.to);
        if (!candidates.length) return null;
        const maxDate = candidates.reduce((m, r) => (r.date > m ? r.date : m), candidates[0].date);
        const sameDay = candidates.filter((r) => r.date === maxDate);
        return sameDay[sameDay.length - 1];
      }
      const candidates = pool.filter((r) => r.date && r.date >= targetDate && r.from);
      if (!candidates.length) return null;
      const minDate = candidates.reduce((m, r) => (r.date < m ? r.date : m), candidates[0].date);
      const sameDay = candidates.filter((r) => r.date === minDate);
      return sameDay[0];
    }
    /* Creates the "to the airport" (positioned directly before the flight) and/or "from the airport"
       (positioned directly after) transfer records, pasting the relevant airport's own details from
       the flight itself, and — where an adjacent record already exists — continuing the chain by
       pulling its location into the transfer's other end. Defaults to taxi.
       For an international flight specifically: the pre-flight transfer gets a 3-hour stay duration,
       and — if the flight's own departure time is known — its end time is set to depTime minus that
       3 hours; the post-flight transfer's start time is set to the flight's own arrival time plus its
       stay buffer (the same buffer already used to anchor the chain), so it's correct immediately
       rather than only after the next recompute pass. */
    function createAirportTransfers(f, frameId, flightRowId, isInternational) {
      const PRE_FLIGHT_STAY_MIN = 180;
      if (f.addTransferTo && f.from) {
        const idTo = addRowNear(f.depDate, frameId, flightRowId, "before");
        const prevRow = findAdjacentRow(f.depDate, "before", f);
        updateRow(idTo, {
          typeId: "transfer", arrivalTypeId: "taxi",
          to: f.from, toAlias: f.fromAlias, toLat: f.fromLat, toLon: f.fromLon, toPlaceId: f.fromPlaceId, toVerifiedUrl: f.fromVerifiedUrl,
          ...(prevRow && prevRow.to ? { from: prevRow.to, fromAlias: prevRow.toAlias, fromLat: prevRow.toLat, fromLon: prevRow.toLon, fromPlaceId: prevRow.toPlaceId, fromVerifiedUrl: prevRow.toVerifiedUrl } : {}),
          ...(isInternational ? { stayDurationMin: PRE_FLIGHT_STAY_MIN, ...(f.depTime ? { endTime: addMinutesToTime(f.depTime, -PRE_FLIGHT_STAY_MIN), endTimeAuto: false } : {}) } : {}),
        });
      }
      if (f.addTransferFrom && f.to) {
        const landDate = f.overnight ? addDaysToISO(f.depDate, 1) : f.depDate;
        const idFrom = addRowNear(landDate, frameId, flightRowId, "after");
        const nextRow = findAdjacentRow(landDate, "after", f);
        updateRow(idFrom, {
          typeId: "transfer", arrivalTypeId: "taxi",
          from: f.to, fromAlias: f.toAlias, fromLat: f.toLat, fromLon: f.toLon, fromPlaceId: f.toPlaceId, fromVerifiedUrl: f.toVerifiedUrl,
          ...(nextRow && nextRow.from ? { to: nextRow.from, toAlias: nextRow.fromAlias, toLat: nextRow.fromLat, toLon: nextRow.fromLon, toPlaceId: nextRow.fromPlaceId, toVerifiedUrl: nextRow.fromVerifiedUrl } : {}),
          ...(isInternational && f.landTime ? { startTime: addMinutesToTime(f.landTime, getDefaultStayMinutes("flight")), startTimeAuto: false } : {}),
        });
      }
    }
    const flights = d.hasFlights === "yes" ? d.flights.filter((f) => f.depDate) : [];
    const domesticFlights = d.hasDomestic === "yes" ? d.domesticFlights.filter((f) => f.depDate) : [];
    const hotels = d.hasHotels === "yes" ? d.hotels.filter((h) => h.checkIn && h.checkOut) : [];
    const allDates = [
      d.planStartDate, d.planEndDate,
      ...flights.flatMap((f) => [f.depDate, f.retDate]).filter(Boolean),
      ...domesticFlights.flatMap((f) => [f.depDate, f.retDate]).filter(Boolean),
      ...hotels.flatMap((h) => [h.checkIn, h.checkOut]),
    ].filter(Boolean).sort();
    const startDate = allDates[0] || toLocalISODate(new Date());
    const endDate = allDates[allDates.length - 1] || startDate;

    if (preWizardEditMode) {
      // Editing an existing trip must only ever update that trip — never spawn a second one.
      const rootFrame = frames.find((f) => !f.parentFrameId);
      if (rootFrame) {
        setFrames((prev) => prev.map((f) => (f.id === rootFrame.id
          ? { ...f, name: d.tripName || d.destination || f.name, startDate: allDates[0] || f.startDate, endDate: allDates[allDates.length - 1] || f.endDate }
          : f)));
      }
      // Sync flights/hotels into whatever already exists, by matching order (sorted by date) —
      // this works whether the trip was built by this wizard, loaded from a template, or imported,
      // since we're never blindly deleting-and-recreating: existing rows/frames are updated in
      // place, and only a count mismatch adds or removes entries.
      if (rootFrame) {
        function syncFlightRows(typeId, entries) {
          const existing = rows.filter((r) => r.frameId === rootFrame.id && r.typeId === typeId).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
          const ids = entries.map((f, i) => {
            const patch = { typeId, from: f.from, fromAlias: f.fromAlias, to: f.to, toAlias: f.toAlias, flightNumber: f.flightNumber, date: f.depDate, startTime: f.depTime || "", endTime: f.landTime || "", overnight: !!f.overnight, fromLat: f.fromLat, fromLon: f.fromLon, fromPlaceId: f.fromPlaceId, fromVerifiedUrl: f.fromVerifiedUrl, toLat: f.toLat, toLon: f.toLon, toPlaceId: f.toPlaceId, toVerifiedUrl: f.toVerifiedUrl };
            const id = existing[i] ? existing[i].id : addRow(f.depDate, null, rootFrame.id);
            updateRow(id, patch);
            return id;
          });
          existing.slice(entries.length).forEach((r) => deleteRow(r.id));
          return ids;
        }
        const flightIds = syncFlightRows("flight", flights);
        const domesticFlightIds = syncFlightRows("domestic-flight", domesticFlights);
        flights.forEach((f, i) => createAirportTransfers(f, rootFrame.id, flightIds[i], true));
        domesticFlights.forEach((f, i) => createAirportTransfers(f, rootFrame.id, domesticFlightIds[i], false));

        const existingHotelFrames = frames.filter((f) => f.parentFrameId === rootFrame.id && f.frameType === "hotel").sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
        hotels.forEach((h, i) => {
          const hf = existingHotelFrames[i];
          if (hf) {
            setFrames((prev) => prev.map((f) => (f.id === hf.id ? { ...f, name: h.alias || h.name || f.name, startDate: h.checkIn, endDate: h.checkOut, hotelRef: { ...h, city: h.city || (hf.hotelRef && hf.hotelRef.city) || "" } } : f)));
            const checkinRow = rows.find((r) => r.frameId === hf.id && r.typeId === "checkin");
            const checkoutRow = rows.find((r) => r.frameId === hf.id && r.typeId === "checkout");
            const transferRows = rows.filter((r) => r.frameId === hf.id && r.typeId === "transfer");
            // Only fill in location fields from the wizard when the row isn't already verified, or
            // the hotel's name was actually changed in the wizard (a rename should invalidate the
            // old verification) — otherwise a verified row's `to` (which may be a fuller/different
            // resolved address than the plain display name) would be silently overwritten every save.
            const isRowVerified = (r) => r && r.toVerifiedText === r.to && (r.toPlaceId || r.toVerifiedUrl);
            const nameChanged = h.name !== hf.name;
            const locationPatch = { to: h.name, toLat: h.nameLat, toLon: h.nameLon, toPlaceId: h.namePlaceId, toVerifiedUrl: h.nameVerifiedUrl };
            if (checkinRow) updateRow(checkinRow.id, { ...((nameChanged || !isRowVerified(checkinRow)) ? locationPatch : {}), toAlias: h.alias, date: h.checkIn });
            if (checkoutRow) updateRow(checkoutRow.id, { ...((nameChanged || !isRowVerified(checkoutRow)) ? locationPatch : {}), toAlias: h.alias, date: h.checkOut });
            transferRows.forEach((tr) => updateRow(tr.id, { date: tr.date === (checkoutRow && checkoutRow.date) ? h.checkOut : h.checkIn }));
          } else {
            const newFrame = { id: uid(), name: h.alias || h.name || T.hotelFrameNameFallback, startDate: h.checkIn, endDate: h.checkOut, parentFrameId: rootFrame.id, collapsed: false, frameType: "hotel", hotelRef: h };
            setFrames((prev) => [...prev, newFrame]);
            const id1 = addRow(h.checkIn, null, newFrame.id);
            updateRow(id1, { typeId: "checkin", startTime: "15:00", to: h.name, toAlias: h.alias, toLat: h.nameLat, toLon: h.nameLon, toPlaceId: h.namePlaceId, toVerifiedUrl: h.nameVerifiedUrl });
            const id2 = addRow(h.checkOut, null, newFrame.id);
            updateRow(id2, { typeId: "checkout", endTime: "11:00", to: h.name, toAlias: h.alias, toLat: h.nameLat, toLon: h.nameLon, toPlaceId: h.namePlaceId, toVerifiedUrl: h.nameVerifiedUrl });
          }
        });
        existingHotelFrames.slice(hotels.length).forEach((hf) => {
          applyRows((prev) => prev.filter((r) => r.frameId !== hf.id));
          setFrames((prev) => prev.filter((f) => f.id !== hf.id));
        });
      }
      setPreWizardLastSubmitted(d);
      closePreWizard();
      return;
    }

    if (preWizardCreatedIds) {
      const frameIdSet = new Set(preWizardCreatedIds.frameIds);
      const rowIdSet = new Set(preWizardCreatedIds.rowIds);
      setFrames((prev) => prev.filter((f) => !frameIdSet.has(f.id)));
      applyRows((prev) => prev.filter((r) => !rowIdSet.has(r.id)));
    }
    const mainFrame = { id: uid(), name: d.tripName || d.destination || (lang === "he" ? "טיול חדש" : "New trip"), startDate, endDate, parentFrameId: null, collapsed: false, frameType: "flight" };
    const newFrames = [mainFrame];

    const hotelFrames = hotels.map((h) => ({
      id: uid(), name: h.alias || h.name || T.hotelFrameNameFallback, startDate: h.checkIn, endDate: h.checkOut, parentFrameId: mainFrame.id, collapsed: false, frameType: "hotel", hotelRef: h,
    }));
    newFrames.push(...hotelFrames);

    setFrames((prev) => [...prev, ...newFrames]);

    const createdRowIds = [];
    flights.forEach((f) => {
      const id1 = addRow(f.depDate, null, mainFrame.id);
      updateRow(id1, { typeId: "flight", from: f.from, fromAlias: f.fromAlias, to: f.to, toAlias: f.toAlias, flightNumber: f.flightNumber, airline: f.airline, startTime: f.depTime || "", endTime: f.landTime || "", overnight: !!f.overnight, fromLat: f.fromLat, fromLon: f.fromLon, fromPlaceId: f.fromPlaceId, fromVerifiedUrl: f.fromVerifiedUrl, toLat: f.toLat, toLon: f.toLon, toPlaceId: f.toPlaceId, toVerifiedUrl: f.toVerifiedUrl });
      createdRowIds.push(id1);
      createAirportTransfers(f, mainFrame.id, id1, true);
    });
    domesticFlights.forEach((f) => {
      const id1 = addRow(f.depDate, null, mainFrame.id);
      updateRow(id1, { typeId: "domestic-flight", from: f.from, fromAlias: f.fromAlias, to: f.to, toAlias: f.toAlias, flightNumber: f.flightNumber, airline: f.airline, startTime: f.depTime || "", endTime: f.landTime || "", overnight: !!f.overnight, fromLat: f.fromLat, fromLon: f.fromLon, fromPlaceId: f.fromPlaceId, fromVerifiedUrl: f.fromVerifiedUrl, toLat: f.toLat, toLon: f.toLon, toPlaceId: f.toPlaceId, toVerifiedUrl: f.toVerifiedUrl });
      createdRowIds.push(id1);
      createAirportTransfers(f, mainFrame.id, id1, false);
    });

    hotelFrames.forEach((hf) => {
      const h = hf.hotelRef;
      const id1 = addRow(h.checkIn, null, hf.id);
      updateRow(id1, { typeId: "checkin", startTime: "15:00", to: h.name, toAlias: h.alias, toLat: h.nameLat, toLon: h.nameLon, toPlaceId: h.namePlaceId, toVerifiedUrl: h.nameVerifiedUrl });
      const id2 = addRow(h.checkOut, null, hf.id);
      updateRow(id2, { typeId: "checkout", endTime: "11:00", to: h.name, toAlias: h.alias, toLat: h.nameLat, toLon: h.nameLon, toPlaceId: h.namePlaceId, toVerifiedUrl: h.nameVerifiedUrl });
      createdRowIds.push(id1, id2);
    });

    setPreWizardCreatedIds({ frameIds: newFrames.map((f) => f.id), rowIds: createdRowIds });
    setPreWizardLastSubmitted(d);
    closePreWizard();
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
      const endTime = `${String(h % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const id = addRow(routeImportDate, null, fid);
      updateRow(id, { typeId: "poi", to: name, startTime, endTime });
    });
    setRouteImportOpen(false);
  }

  function buildShareHTML() {
    function esc(s) { return (s || "").toString().replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
    function rowHtml(r, depth, prevRow) {
      const tm = typeMeta(r.typeId, types, T, lang);
      const from = noOriginNeeded(r.typeId) ? (prevRow ? (prevRow.toAlias || prevRow.to || "") : "") : (r.fromAlias || r.from || "");
      const to = r.toAlias || r.to || "";
      return `<div style="padding:7px 0;padding-inline-start:${depth * 16}px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;gap:10px;">
        <div><strong>${esc(tm.name)}</strong> — ${esc(from)}${from && to ? " → " : ""}${esc(to)}${r.notes ? `<br><span style="color:#888;font-size:12px;">${esc(r.notes)}</span>` : ""}</div>
        <div style="color:#666;font-size:12px;white-space:nowrap;">${r.startTime || ""}${r.endTime ? " – " + r.endTime : ""}${Number(r.costAmount) > 0 ? ` · ${esc(r.costCurrency)}${r.costAmount}` : ""}</div>
      </div>`;
    }
    function dayHtml(fid) {
      return dayGroupsAt(fid).map((g) => {
        const rowsHtml = g.rows.map((r, i) => rowHtml(r, 0, i > 0 ? g.rows[i - 1] : null) + childrenOf(r.id).map((c) => rowHtml(c, 1, r)).join("")).join("");
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

    function journalRowHtml(r, depth, prevRow) {
      const tm = typeMeta(r.typeId, types, T, lang);
      const from = noOriginNeeded(r.typeId) ? (prevRow ? (prevRow.toAlias || prevRow.to || "") : "") : (r.fromAlias || r.from || "");
      const to = r.toAlias || r.to || "";
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
        const rowsHtml = g.rows.map((r, i) => journalRowHtml(r, 0, i > 0 ? g.rows[i - 1] : null) + childrenOf(r.id).map((c) => journalRowHtml(c, 1, r)).join("")).join("");
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
    a.href = url; a.download = `mytrip-journal-${toLocalISODate(new Date())}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function exportShareableHTML() {
    const html = buildShareHTML();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `mytrip-share-${toLocalISODate(new Date())}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function exportToFile() {
    const payload = { version: APP_VERSION, exportedAt: new Date().toISOString(), rows, frames, displayCurrency };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mytrip-export-${toLocalISODate(new Date())}.json`;
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
        const importedFrames = Array.isArray(data.frames) ? data.frames : [];
        setRows(recomputeChainTimesPure(data.rows, importedFrames));
        setFrames(importedFrames);
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
    return frame ? frame.startDate : toLocalISODate(new Date());
  }
  function nextDateInContext(fid) {
    const frame = fid ? frames.find((f) => f.id === fid) : null;
    const groups = dayGroupsAt(fid);
    const kids = childFrames(fid);
    let maxDate = groups.length ? groups[groups.length - 1].date : null;
    kids.forEach((k) => { if (k.endDate && (!maxDate || k.endDate > maxDate)) maxDate = k.endDate; });
    let base;
    if (maxDate) { const d = new Date(maxDate + "T00:00:00"); d.setDate(d.getDate() + 1); base = toLocalISODate(d); }
    else if (frame) base = frame.startDate;
    else base = toLocalISODate(new Date());
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
    if (minDate) { const d = new Date(minDate + "T00:00:00"); d.setDate(d.getDate() - 1); base = toLocalISODate(d); }
    else if (frame) base = frame.startDate;
    else base = toLocalISODate(new Date());
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
    applyRows((prev) => prev.map((r) => (!r.parentId && !r.frameId && r.date >= start && r.date <= end) ? { ...r, frameId: nf.id } : r));
    setDismissedKey(suggestionKey);
  }

  /* ---------- row mutators ---------- */
  /* Single choke point for all rows mutations: re-runs the global time chain after every change
     (add row, delete row, reorder, edit, route-duration arrival, load/undo) so times recompute live
     instead of needing a manual "recalculate" action. */
  function applyRows(updater) {
    setRows((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return recomputeChainTimesPure(next, frames);
    });
  }
  function updateRow(id, patch) { applyRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r))); }
  function setReminderOverride(rowId, ruleId, patch) {
    applyRows((prev) => prev.map((r) => {
      if (r.id !== rowId) return r;
      const current = (r.reminderSettings && r.reminderSettings[ruleId]) || {};
      return { ...r, reminderSettings: { ...(r.reminderSettings || {}), [ruleId]: { ...current, ...patch } } };
    }));
  }
  function getDayGroupRows(row) {
    return rows.filter((r) => !r.parentId && (r.frameId || null) === (row.frameId || null) && r.date === row.date);
  }
  /* Marks the field manual (or clears it back to auto) and lets applyRows' global recompute pass
     fill in the actual value and propagate forward — no local cascade loop needed here anymore. */
  function setStartTimeWithCascade(rowId, newStartTime) {
    const isManualSet = !!newStartTime;
    applyRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, startTime: newStartTime, startTimeAuto: !isManualSet, startTimeSource: undefined } : r)));
  }
  function setEndTimeWithCascade(rowId, newEndTime) {
    const isManualSet = !!newEndTime;
    applyRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, endTime: newEndTime, endTimeAuto: !isManualSet, endTimeSource: undefined } : r)));
  }
  function deleteRow(id) { applyRows((prev) => prev.filter((r) => r.id !== id && r.parentId !== id)); }
  function addRow(date, parentId = null, frameId = null) {
    const nr = {
      id: uid(), parentId, frameId, date: date || toLocalISODate(new Date()),
      typeId: "unset", arrivalTypeId: "walking", from: "", to: "", startTime: "", startTimeAuto: true, endTime: "", overnight: false, stayDurationMin: null,
      destination: "", link: "", mapLink: "", flightNumber: "", costAmount: 0, costCurrency: "₪", fromAlias: "", toAlias: "",
      notes: "", fromVerifiedUrl: "", fromVerifiedText: "", toVerifiedUrl: "", toVerifiedText: "",
      fromLat: null, fromLon: null, toLat: null, toLon: null, routeDistanceKm: null, routeDurationMin: null, custom: {},
    };
    applyRows((prev) => [...prev, nr]);
    return nr.id;
  }
  /* Same as addRow, but inserted directly before/after a specific anchor row in the array instead
     of always being appended at the end — guarantees visual ordering (e.g. a transfer landing
     immediately before or after the flight it belongs to) regardless of insertion order elsewhere. */
  function addRowNear(date, frameId, anchorId, position) {
    const nr = {
      id: uid(), parentId: null, frameId, date: date || toLocalISODate(new Date()),
      typeId: "unset", arrivalTypeId: "walking", from: "", to: "", startTime: "", startTimeAuto: true, endTime: "", overnight: false, stayDurationMin: null,
      destination: "", link: "", mapLink: "", flightNumber: "", costAmount: 0, costCurrency: "₪", fromAlias: "", toAlias: "",
      notes: "", fromVerifiedUrl: "", fromVerifiedText: "", toVerifiedUrl: "", toVerifiedText: "",
      fromLat: null, fromLon: null, toLat: null, toLon: null, routeDistanceKm: null, routeDurationMin: null, custom: {},
    };
    applyRows((prev) => {
      const idx = prev.findIndex((r) => r.id === anchorId);
      if (idx === -1) return [...prev, nr];
      const insertAt = position === "before" ? idx : idx + 1;
      return [...prev.slice(0, insertAt), nr, ...prev.slice(insertAt)];
    });
    return nr.id;
  }
  function sortDayByTime(fid, date) {
    applyRows((prev) => {
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
  function onDropRow(sourceId, targetId) {
    if (!sourceId || sourceId === targetId) return;
    applyRows((prev) => {
      const from = prev.find((r) => r.id === sourceId), to = prev.find((r) => r.id === targetId);
      if (!from || !to) return prev;
      const needsMove = from.date !== to.date || (from.frameId || null) !== (to.frameId || null) || from.parentId !== to.parentId;
      let arr = prev.map((r) => {
        if (r.id === sourceId) return needsMove ? { ...r, date: to.date, frameId: to.frameId, parentId: to.parentId } : r;
        if (needsMove && r.parentId === sourceId) return { ...r, date: to.date, frameId: to.frameId };
        return r;
      });
      const fi = arr.findIndex((r) => r.id === sourceId);
      const [moved] = arr.splice(fi, 1);
      const ti = arr.findIndex((r) => r.id === targetId);
      arr.splice(ti, 0, moved);
      return arr;
    });
  }
  function onDropDay(dayKey, targetFid) {
    if (!dayKey) return;
    const sep = dayKey.indexOf("__");
    const fidPart = dayKey.slice(0, sep), datePart = dayKey.slice(sep + 2);
    const sourceFid = fidPart === "root" ? null : fidPart;
    if ((sourceFid || null) === (targetFid || null)) return;
    applyRows((prev) => prev.map((r) => (((r.frameId || null) === (sourceFid || null)) && r.date === datePart) ? { ...r, frameId: targetFid } : r));
  }
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const { setNodeRef: setRootDropRef, isOver: isRootOver } = useDroppable({ id: "root-zone", data: { type: "root" } });
  function handleDndStart(event) {
    const t = event.active.data.current && event.active.data.current.type;
    if (t === "row") setDragId(event.active.id);
    else if (t === "day") setDragDayKey(event.active.data.current.gk);
    document.body.classList.add("mt-dragging-active");
  }
  function handleDndEnd(event) {
    const { active, over } = event;
    document.body.classList.remove("mt-dragging-active");
    const activeType = active.data.current && active.data.current.type;
    if (over) {
      if (activeType === "row") onDropRow(active.id, over.id);
      else if (activeType === "day") {
        const overType = over.data.current && over.data.current.type;
        if (overType === "frame") onDropDay(active.data.current.gk, over.data.current.fid);
        else if (overType === "root") onDropDay(active.data.current.gk, null);
      }
    }
    setDragId(null);
    setDragDayKey(null);
  }
  function handleDndCancel() {
    document.body.classList.remove("mt-dragging-active");
    setDragId(null);
    setDragDayKey(null);
  }

  /* ---------- add-day modal ---------- */
  function openAddDayModal(fid, afterDate) {
    let date;
    if (afterDate) { const d = new Date(afterDate + "T00:00:00"); d.setDate(d.getDate() + 1); date = toLocalISODate(d); }
    else date = nextDateInContext(fid);
    setAddDayCtx({ fid, date, addHotel: true, addTransport: true, addPoi: true });
  }
  function closeAddDayModal() { setAddDayCtx(null); }
  const addDayFrame = addDayCtx && addDayCtx.fid ? frames.find((f) => f.id === addDayCtx.fid) : null;
  const addDayIssue = addDayCtx && addDayFrame && (addDayCtx.date < addDayFrame.startDate || addDayCtx.date > addDayFrame.endDate) ? T.rowOutOfFrame : null;
  function findLastHotelInfo(beforeDate) {
    const hotelRows = rows.filter((r) => (r.typeId === "checkin" || r.typeId === "checkout") && r.date && r.date < beforeDate)
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
    const hotelRaw = prevHotel ? prevHotel.name : "";
    const hotelAlias = prevHotel ? prevHotel.alias : "";
    const hotelLat = prevHotel ? prevHotel.lat : null, hotelLon = prevHotel ? prevHotel.lon : null;
    if (addDayCtx.addHotel) {
      const id1 = addRow(addDayCtx.date, null, addDayCtx.fid);
      updateRow(id1, {
        typeId: "checkout", startTime: "08:00",
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
        typeId: "taxi", startTime: "13:45",
        from: T.demoRestaurantRaw, fromAlias: T.demoRestaurantName,
        to: hotelRaw, toAlias: hotelAlias, toLat: hotelLat, toLon: hotelLon,
      });
    }
    if (addDayCtx.addHotel) {
      const id2 = addRow(addDayCtx.date, null, addDayCtx.fid);
      updateRow(id2, {
        typeId: "checkin", endTime: "22:00",
        to: hotelRaw, toAlias: hotelAlias, toLat: hotelLat, toLon: hotelLon,
        toVerifiedUrl: prevHotel ? prevHotel.verifiedUrl : "", toVerifiedText: prevHotel ? prevHotel.verifiedText : "",
        toPlaceId: prevHotel ? prevHotel.placeId : null,
      });
    }
    if (!addDayCtx.addHotel && !addDayCtx.addTransport && !addDayCtx.addPoi) {
      addRow(addDayCtx.date, null, addDayCtx.fid);
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
    setTypes((prev) => [...prev, { id, name: newTypeDraft.name, icon: newTypeDraft.icon, color: CATEGORY_COLORS.other, category: "other", kind: newTypeDraft.kind }]);
    if (rowIdToApply) updateRow(rowIdToApply, newTypeDraft.kind === "arrival" ? { arrivalTypeId: id } : { typeId: id });
    setNewTypeDraft({ name: "", icon: "Tag", kind: "desc" }); setTypeMenuOpen(null);
  }
  function submitAddType() {
    if (!addTypeDraft.name.trim()) return;
    const id = "custom-" + uid();
    setTypes((prev) => [...prev, { id, name: addTypeDraft.name, icon: addTypeDraft.icon, color: CATEGORY_COLORS.other, category: "other", kind: addTypeDraft.kind }]);
    setAddTypeDraft({ name: "", icon: "Tag", kind: "desc" }); setAddTypeOpen(false);
  }

  /* ---------- location verification (OpenStreetMap Nominatim — free, no API key) ---------- */
  function openLocationPicker(field) {
    const initialQuery = cardDraft ? (cardDraft[field] || "") : "";
    setLocPicker({ field, wizardTarget: null, mode: "search", query: initialQuery, results: [], loading: false, error: null, mapMarker: null, mapCenter: DEFAULT_MAP_CENTER });
    if (initialQuery.trim()) runLocationSearch(initialQuery);
  }
  function openWizardLocationPicker(arrayField, idx, field) {
    const item = preWizardData[arrayField][idx];
    const initialQuery = (item && item[field]) || "";
    setLocPicker({ field, wizardTarget: { arrayField, idx }, mode: "search", query: initialQuery, results: [], loading: false, error: null, mapMarker: null, mapCenter: DEFAULT_MAP_CENTER });
    if (initialQuery.trim()) runLocationSearch(initialQuery);
  }
  function applyLocationPatch(field, basePatch, smartAlias) {
    const aliasField = field === "from" ? "fromAlias" : field === "to" ? "toAlias" : field === "name" ? "alias" : null;
    const patchBase = { ...basePatch };
    // Defense in depth: never let a coordinate-looking string ("13.123, 100.456") become the
    // location's actual name, no matter which path produced it.
    if (looksLikeCoordinates(patchBase[field])) delete patchBase[field];
    const { wizardTarget, hotelFrameTarget } = locPicker;
    if (hotelFrameTarget) {
      const matching = rows.filter((r) => r.frameId === hotelFrameTarget.frameId && r.to === hotelFrameTarget.targetText);
      matching.forEach((r) => {
        const patch = { ...patchBase };
        if (aliasField && !r[aliasField] && smartAlias) patch[aliasField] = smartAlias;
        updateRow(r.id, patch);
      });
    } else if (wizardTarget) {
      const current = preWizardData[wizardTarget.arrayField][wizardTarget.idx];
      const patch = { ...patchBase };
      if (aliasField && !current[aliasField] && smartAlias) patch[aliasField] = smartAlias;
      updatePreWizardArrayItem(wizardTarget.arrayField, wizardTarget.idx, patch);
    } else {
      setCardDraft((d) => {
        const patch = { ...patchBase };
        if (aliasField && !d[aliasField] && smartAlias) patch[aliasField] = smartAlias;
        return { ...d, ...patch };
      });
    }
    setLocPicker(null);
  }
  function runLocationSearch(queryOverride) {
    const q = (queryOverride !== undefined ? queryOverride : (locPicker && locPicker.query)) || "";
    if (!q.trim()) return;
    setLocPicker((p) => ({ ...p, loading: true, error: null }));
    if (!hasGooglePlaces()) {
      nominatimSearch(q, lang)
        .then((results) => setLocPicker((p) => (p ? { ...p, loading: false, error: results.length ? null : "no-results-fallback", results } : p)))
        .catch(() => setLocPicker((p) => (p ? { ...p, loading: false, results: [], error: "network" } : p)));
      return;
    }
    googlePlacesAutocomplete(q, lang)
      .then((results) => setLocPicker((p) => (p ? { ...p, loading: false, error: null, results } : p)))
      .catch(() => {
        nominatimSearch(q, lang)
          .then((results) => setLocPicker((p) => (p ? { ...p, loading: false, error: results.length ? null : "no-results-fallback", results } : p)))
          .catch(() => setLocPicker((p) => (p ? { ...p, loading: false, results: [], error: "network" } : p)));
      });
  }
  function pickGooglePlaceResult(prediction) {
    if (!locPicker) return;
    const field = locPicker.field;
    setLocPicker((p) => (p ? { ...p, loading: true } : p));
    googlePlaceDetails(prediction.placeId, lang).then((details) => {
      if (!details || !details.location) { setLocPicker((p) => (p ? { ...p, loading: false, error: "no-details" } : p)); return; }
      const label = (details.displayName && details.displayName.text) || details.formattedAddress || prediction.text;
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${details.location.latitude},${details.location.longitude}&query_place_id=${prediction.placeId}`;
      const smartAlias = (details.displayName && details.displayName.text) || label.split(",")[0];
      if (field === "from") applyLocationPatch("from", { from: label, fromVerifiedUrl: mapUrl, fromVerifiedText: label, fromLat: details.location.latitude, fromLon: details.location.longitude, fromPlaceId: prediction.placeId }, smartAlias);
      else if (field === "to") applyLocationPatch("to", { to: label, toVerifiedUrl: mapUrl, toVerifiedText: label, toLat: details.location.latitude, toLon: details.location.longitude, toPlaceId: prediction.placeId }, smartAlias);
      else if (field === "name") applyLocationPatch("name", { name: label, nameVerifiedUrl: mapUrl, nameVerifiedText: label, nameLat: details.location.latitude, nameLon: details.location.longitude, namePlaceId: prediction.placeId }, smartAlias);
      else if (field === "fromAlias") applyLocationPatch("fromAlias", { fromAlias: smartAlias });
      else if (field === "toAlias") applyLocationPatch("toAlias", { toAlias: smartAlias });
    }).catch(() => setLocPicker((p) => (p ? { ...p, loading: false, error: "network" } : p)));
  }
  function pickNominatimResult(result) {
    if (!locPicker) return;
    const field = locPicker.field;
    const label = result.text;
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
    const smartAlias = label.split(",")[0];
    if (field === "from") applyLocationPatch("from", { from: label, fromVerifiedUrl: mapUrl, fromVerifiedText: label, fromLat: result.lat, fromLon: result.lon, fromPlaceId: null }, smartAlias);
    else if (field === "to") applyLocationPatch("to", { to: label, toVerifiedUrl: mapUrl, toVerifiedText: label, toLat: result.lat, toLon: result.lon, toPlaceId: null }, smartAlias);
    else if (field === "name") applyLocationPatch("name", { name: label, nameVerifiedUrl: mapUrl, nameVerifiedText: label, nameLat: result.lat, nameLon: result.lon, namePlaceId: null }, smartAlias);
    else if (field === "fromAlias") applyLocationPatch("fromAlias", { fromAlias: smartAlias });
    else if (field === "toAlias") applyLocationPatch("toAlias", { toAlias: smartAlias });
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
    if (m.label) {
      pickLocation({ display_name: m.label, lat: m.lat, lon: m.lng, address: m.address, extratags: m.extratags });
    } else {
      // No reverse-geocoded name available for this pin — keep whatever name text is already
      // there (e.g. a guesthouse Nominatim doesn't know) and just attach real coordinates + a map
      // link, instead of overwriting the name with a raw "lat, lon" string.
      pickLocationCoordsOnly(m.lat, m.lng);
    }
  }
  function pickLocationCoordsOnly(lat, lon) {
    const { wizardTarget, hotelFrameTarget } = locPicker;
    const currentText = hotelFrameTarget
      ? hotelFrameTarget.targetText
      : wizardTarget
      ? ((preWizardData[wizardTarget.arrayField][wizardTarget.idx] && preWizardData[wizardTarget.arrayField][wizardTarget.idx][locPicker.field]) || "")
      : (cardDraft ? (cardDraft[locPicker.field] || "") : "");
    const mapUrl = currentText.trim() ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentText)}` : `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    if (locPicker.field === "from") applyLocationPatch("from", { fromVerifiedUrl: mapUrl, fromVerifiedText: currentText, fromLat: Number(lat), fromLon: Number(lon) }, null);
    else if (locPicker.field === "to") applyLocationPatch("to", { toVerifiedUrl: mapUrl, toVerifiedText: currentText, toLat: Number(lat), toLon: Number(lon) }, null);
    else if (locPicker.field === "name") applyLocationPatch("name", { nameVerifiedUrl: mapUrl, nameVerifiedText: currentText, nameLat: Number(lat), nameLon: Number(lon) }, null);
  }
  function pickLocation(result) {
    const label = result.display_name.split(",").slice(0, 2).join(",").trim();
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
    const { wizardTarget, hotelFrameTarget } = locPicker;
    const isFlightRow = hotelFrameTarget ? false : wizardTarget ? (wizardTarget.arrayField === "flights" || wizardTarget.arrayField === "domesticFlights") : (cardDraft && (cardDraft.typeId === "flight" || cardDraft.typeId === "domestic-flight"));
    const addr = result.address || {};
    const cityName = addr.city || addr.town || addr.village || addr.suburb || addr.county || addr.state || label.split(",")[0];
    const iata = result.extratags && (result.extratags.iata || result.extratags["iata"]);
    const smartAlias = isFlightRow && iata ? `${cityName} (${iata.toUpperCase()})` : cityName;
    if (locPicker.field === "from") applyLocationPatch("from", { from: label, fromVerifiedUrl: mapUrl, fromVerifiedText: label, fromLat: Number(result.lat), fromLon: Number(result.lon) }, smartAlias);
    else if (locPicker.field === "to") applyLocationPatch("to", { to: label, toVerifiedUrl: mapUrl, toVerifiedText: label, toLat: Number(result.lat), toLon: Number(result.lon) }, smartAlias);
    else if (locPicker.field === "name") applyLocationPatch("name", { name: label, nameVerifiedUrl: mapUrl, nameVerifiedText: label, nameLat: Number(result.lat), nameLon: Number(result.lon) }, smartAlias);
    else if (locPicker.field === "fromAlias") applyLocationPatch("fromAlias", { fromAlias: label });
    else if (locPicker.field === "toAlias") applyLocationPatch("toAlias", { toAlias: label });
  }

  /* ---------- record card ---------- */
  function openCard(row) {
    setCardRowId(row.id); setCardDraft({ ...row }); setFlightLookupMsg(""); setWeatherData(null); setAttachmentsExpanded(false);
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
  function buildGlobalRowOrder(fid) {
    const cf = childFrames(fid);
    const dg = dayGroupsAt(fid);
    const nodes = [
      ...cf.map((f) => ({ type: "frame", sort: f.startDate || "", frame: f })),
      ...dg.map((g) => ({ type: "day", sort: g.date, group: g })),
    ].sort((a, b) => {
      if (a.sort !== b.sort) return a.sort.localeCompare(b.sort);
      if (a.type !== b.type) return a.type === "day" ? -1 : 1;
      return 0;
    });
    let result = [];
    nodes.forEach((n) => {
      if (n.type === "day") result = result.concat(n.group.rows);
      else result = result.concat(buildGlobalRowOrder(n.frame.id));
    });
    return result;
  }
  const prevRowMap = useMemo(() => {
    const order = buildGlobalRowOrder(null);
    const m = new Map();
    for (let i = 1; i < order.length; i++) m.set(order[i].id, order[i - 1]);
    return m;
  }, [rows, frames]);
  const nextRowMap = useMemo(() => {
    const order = buildGlobalRowOrder(null);
    const m = new Map();
    for (let i = 0; i < order.length - 1; i++) m.set(order[i].id, order[i + 1]);
    return m;
  }, [rows, frames]);
  function findPrevRowInDay(rowId) {
    return prevRowMap.get(rowId) || null;
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
  const SAVED_HOTELS_KEY = "mytrip_saved_hotels";
  function getSavedHotels() {
    try { return JSON.parse(localStorage.getItem(SAVED_HOTELS_KEY) || "[]"); } catch (e) { return []; }
  }
  function getTripAlerts() {
    const now = new Date();
    const alerts = [];
    if (checklistProgressPct < 100) {
      const earliestDate = rows.reduce((min, r) => (r.date && (!min || r.date < min)) ? r.date : min, null);
      const hoursUntilTrip = earliestDate ? (new Date(earliestDate) - now) / 3600000 : Infinity;
      alerts.push({ id: "checklist", severity: hoursUntilTrip < 24 * 3 ? "red" : "orange", label: `${T.preFlightChecklist}: ${checklistProgressPct}%`, date: earliestDate });
    }
    rows.forEach((r) => {
      if (r.toFee === "yes" && !r.ticketPurchased) {
        const d = r.date ? new Date(r.date + "T" + (r.startTime || "00:00")) : null;
        const hoursUntil = d ? (d - now) / 3600000 : Infinity;
        alerts.push({ id: r.id + "-ticket", severity: hoursUntil < 24 ? "red" : hoursUntil < 24 * 7 ? "orange" : "orange", label: `${T.requiresTicket}: ${r.to || r.toAlias || ""}`, date: r.date });
      }
      if ((r.typeId === "flight" || r.typeId === "domestic-flight") && !r.checkedIn && r.date) {
        const d = new Date(r.date + "T" + (r.startTime || "00:00"));
        const hoursUntil = (d - now) / 3600000;
        if (hoursUntil < 24 * 7) {
          alerts.push({ id: r.id + "-checkin", severity: hoursUntil < 24 ? "red" : "orange", label: `${T.flightCheckedIn}: ${r.flightNumber || r.to || ""}`, date: r.date });
        }
      }
    });
    return alerts;
  }
  function getTripHotels() {
    const hotelFrames = frames.filter((f) => effectiveFrameTypeOf(f, rows) === "hotel");
    const list = hotelFrames.map((hf) => {
      const checkinRow = rows.find((r) => r.frameId === hf.id && r.typeId === "checkin");
      return {
        name: hf.name || (checkinRow && checkinRow.to) || "",
        alias: (checkinRow && checkinRow.toAlias) || "",
        lat: (checkinRow && checkinRow.toLat) || null, lon: (checkinRow && checkinRow.toLon) || null,
        placeId: (checkinRow && checkinRow.toPlaceId) || null, verifiedUrl: (checkinRow && checkinRow.toVerifiedUrl) || "",
        verifiedText: (checkinRow && checkinRow.toVerifiedText) || "",
      };
    }).filter((h) => h.name);
    const seen = new Set();
    return list.filter((h) => {
      const key = `${h.name}|${h.alias}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  function saveHotelToMemory(info) {
    if (!info || !info.name) return;
    try {
      const list = getSavedHotels();
      const key = info.placeId || info.name;
      const filtered = list.filter((h) => (h.placeId || h.name) !== key);
      filtered.unshift(info);
      localStorage.setItem(SAVED_HOTELS_KEY, JSON.stringify(filtered.slice(0, 20)));
    } catch (e) {}
  }
  function saveCard() {
    if (!cardDraft.date || cardHasTimeError || cardFrameIssue) return;
    if (isAccommodationType(cardDraft.typeId)) {
      const name = cardDraft.to || cardDraft.from;
      if (name) {
        saveHotelToMemory({
          name, alias: cardDraft.toAlias || cardDraft.fromAlias || "",
          lat: cardDraft.toLat != null ? cardDraft.toLat : cardDraft.fromLat,
          lon: cardDraft.toLon != null ? cardDraft.toLon : cardDraft.fromLon,
          placeId: cardDraft.toPlaceId || cardDraft.fromPlaceId || null,
          verifiedUrl: cardDraft.toVerifiedUrl || cardDraft.fromVerifiedUrl || "",
          verifiedText: cardDraft.toVerifiedText || cardDraft.fromVerifiedText || "",
        });
      }
    }
    updateRow(cardRowId, cardDraft);
    closeCard();
  }
  function fetchFlightData() {
    const num = cardDraft.flightNumber && cardDraft.flightNumber.trim();
    if (!num) { setFlightLookupMsg(T.flightNoNumber); return; }
    setFlightLookupMsg(T.flightLookupLoading);
    const params = new URLSearchParams({ flight: num, date: cardDraft.date || "" });
    fetch(`/api/flight-lookup?${params.toString()}`)
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data || data.error) { setFlightLookupMsg((data && data.error) || T.flightLookupError); return; }
        const patch = { flightLookedUpFor: num, flightLastFetchedAt: Date.now() };
        if (data.departureLocation) patch.from = data.departureLocation;
        if (data.arrivalLocation) patch.to = data.arrivalLocation;
        if (data.departureAlias) patch.fromAlias = data.departureAlias;
        if (data.arrivalAlias) patch.toAlias = data.arrivalAlias;
        if (data.airline) patch.airline = data.airline;
        if (data.departureTime) { patch.startTime = data.departureTime; patch.startTimeAuto = false; patch.startTimeSource = "api"; }
        if (data.arrivalTime) { patch.endTime = data.arrivalTime; patch.endTimeAuto = false; patch.endTimeSource = "api"; }
        const extras = [data.status, data.terminal ? `${T.flightTerminal} ${data.terminal}` : null, data.gate ? `${T.flightGate} ${data.gate}` : null].filter(Boolean);
        if (extras.length) patch.notes = [cardDraft.notes, extras.join(" · ")].filter(Boolean).join(" — ");
        setCardDraft((d) => ({ ...d, ...patch }));
        setFlightLookupMsg(T.flightLookupSuccess);
      })
      .catch(() => setFlightLookupMsg(T.flightLookupError));
  }

  /* Refreshes every flight/domestic-flight row that's due (per shouldFetchFlight's near/far
     cooldown), sequentially to avoid hammering the flight-data API, updating in place only what
     actually changed. Manual single-record fetches (fetchFlightData above) are never subject to
     this cooldown — it only governs this bulk action. */
  async function fetchFlightForRow(row) {
    const num = row.flightNumber.trim();
    try {
      const params = new URLSearchParams({ flight: num, date: row.date || "" });
      const res = await fetch(`/api/flight-lookup?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data || data.error) return { ok: false };
      const patch = { flightLookedUpFor: num, flightLastFetchedAt: Date.now() };
      if (data.departureLocation) patch.from = data.departureLocation;
      if (data.arrivalLocation) patch.to = data.arrivalLocation;
      if (data.departureAlias) patch.fromAlias = data.departureAlias;
      if (data.arrivalAlias) patch.toAlias = data.arrivalAlias;
      if (data.airline) patch.airline = data.airline;
      if (data.departureTime) { patch.startTime = data.departureTime; patch.startTimeAuto = false; patch.startTimeSource = "api"; }
      if (data.arrivalTime) { patch.endTime = data.arrivalTime; patch.endTimeAuto = false; patch.endTimeSource = "api"; }
      const extras = [data.status, data.terminal ? `${T.flightTerminal} ${data.terminal}` : null, data.gate ? `${T.flightGate} ${data.gate}` : null].filter(Boolean);
      if (extras.length) patch.notes = [row.notes, extras.join(" · ")].filter(Boolean).join(" — ");
      const changed = (patch.startTime !== undefined && patch.startTime !== row.startTime) || (patch.endTime !== undefined && patch.endTime !== row.endTime) || (patch.from !== undefined && patch.from !== row.from) || (patch.to !== undefined && patch.to !== row.to);
      updateRow(row.id, patch);
      return { ok: true, changed };
    } catch {
      return { ok: false };
    }
  }
  /* Manual per-row refresh from the flight manager panel — now subject to the same near/far
     cooldown as the bulk refresh, so there's no unrestricted path left for repeatedly hitting the
     flight-data API on the same record. */
  async function refreshOneFlightRow(rowId) {
    const row = rows.find((r) => r.id === rowId);
    if (!row || !row.flightNumber || !row.flightNumber.trim()) return;
    if (!shouldFetchFlight(row, Date.now())) return;
    setFlightManagerRowStatus((s) => ({ ...s, [rowId]: "running" }));
    const result = await fetchFlightForRow(row);
    setFlightManagerRowStatus((s) => ({ ...s, [rowId]: result.ok ? (result.changed ? "updated" : "unchanged") : "failed" }));
    setTimeout(() => setFlightManagerRowStatus((s) => { const n = { ...s }; delete n[rowId]; return n; }), 5000);
  }
  async function refreshAllFlights() {
    const now = Date.now();
    const flightRows = rows.filter((r) => isFlightType(r.typeId) && r.flightNumber && r.flightNumber.trim());
    const eligible = flightRows.filter((r) => shouldFetchFlight(r, now));
    if (!eligible.length) {
      setFlightRefreshStatus({ updated: 0, unchanged: 0, failed: 0, skipped: flightRows.length });
      setTimeout(() => setFlightRefreshStatus(null), 8000);
      return;
    }
    setFlightRefreshStatus({ running: true });
    let updated = 0, unchanged = 0, failed = 0;
    for (const row of eligible) {
      const result = await fetchFlightForRow(row);
      if (!result.ok) failed++;
      else if (result.changed) updated++;
      else unchanged++;
    }
    setFlightRefreshStatus({ updated, unchanged, failed, skipped: flightRows.length - eligible.length });
    setTimeout(() => setFlightRefreshStatus(null), 8000);
  }

  /* Whether a hotel frame's location is fully verified: its anchor row (checkin, or the first row
     with a `to` value) has a toVerifiedText that exactly matches its own `to`, plus a place id or
     verified URL — and every OTHER row in the frame sharing that same `to` text is verified too, not
     just one of them. */
  function isHotelFrameVerified(frame, rowsList) {
    const hotelRows = rowsList.filter((r) => r.frameId === frame.id && r.to && r.to.trim());
    if (!hotelRows.length) return false;
    const anchor = hotelRows.find((r) => r.typeId === "checkin") || hotelRows[0];
    const targetText = anchor.to;
    const matching = hotelRows.filter((r) => r.to === targetText);
    return matching.every((r) => r.toVerifiedText === r.to && (r.toPlaceId || r.toVerifiedUrl));
  }
  /* Opens the same manual search/map-pin location picker used inside a record's own edit modal,
     directly (no record card involved) — targets every row in the hotel frame that shares the same
     location text, and is pre-filled with the hotel's own name so no retyping is needed. */
  function openHotelLocationPicker(frameId) {
    const hotelRows = rows.filter((r) => r.frameId === frameId && r.to && r.to.trim());
    const anchor = hotelRows.find((r) => r.typeId === "checkin") || hotelRows[0];
    if (!anchor) return;
    const targetText = anchor.to;
    setLocPicker({ field: "to", wizardTarget: null, hotelFrameTarget: { frameId, targetText }, mode: "search", query: targetText, results: [], loading: false, error: null, mapMarker: null, mapCenter: DEFAULT_MAP_CENTER });
    runLocationSearch(targetText);
  }

  /* ---------- frame modal ---------- */

  function openFrameModal(frame, presetParentId) {
    setFrameDraft(frame ? { ...frame } : { id: null, name: "", startDate: "", endDate: "", parentFrameId: presetParentId || null, collapsed: false, frameType: "basic" });
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
    if (frameDraft.id) {
      setFrames((prev) => prev.map((f) => (f.id === frameDraft.id ? { ...frameDraft } : f)));
    } else {
      const newFrameId = uid();
      setFrames((prev) => [...prev, { ...frameDraft, id: newFrameId }]);
      if (frameDraft.frameType === "hotel") {
        const name = frameDraft.name.trim();
        const checkIn = frameDraft.startDate, checkOut = frameDraft.endDate;
        const id1 = addRow(checkIn, null, newFrameId);
        updateRow(id1, { typeId: "checkin", startTime: "15:00", to: name });
        const id2 = addRow(checkOut, null, newFrameId);
        updateRow(id2, { typeId: "checkout", endTime: "11:00", to: name });
      }
    }
    closeFrameModal();
  }
  function deleteFrameOnly(id) {
    const f = frames.find((x) => x.id === id);
    setFrames((prev) => prev.filter((x) => x.id !== id).map((x) => (x.parentFrameId === id ? { ...x, parentFrameId: f.parentFrameId } : x)));
    applyRows((prev) => prev.map((r) => (r.frameId === id ? { ...r, frameId: f.parentFrameId } : r)));
  }
  function deleteFrameWithContent(id) {
    const idsToDelete = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      frames.forEach((f) => {
        if (f.parentFrameId && idsToDelete.has(f.parentFrameId) && !idsToDelete.has(f.id)) { idsToDelete.add(f.id); changed = true; }
      });
    }
    setFrames((prev) => prev.filter((x) => !idsToDelete.has(x.id)));
    applyRows((prev) => prev.filter((r) => !(r.frameId && idsToDelete.has(r.frameId))));
  }
  function toggleFrameCollapse(id) { setFrames((prev) => prev.map((f) => (f.id === id ? { ...f, collapsed: !f.collapsed } : f))); }
  function updateFrameDates(frameId, start, end) { setFrames((prev) => prev.map((f) => (f.id === frameId ? { ...f, startDate: start, endDate: end } : f))); }

  /* ---------- recursive render ---------- */
  const ctx = {
    T, lang, types, visibleColumns, effectiveMobile, viewMode, rows, frames, prevRowMap, nextRowMap, setStartTimeWithCascade, setEndTimeWithCascade,
    updateRow, deleteRow, openCard, addRow, dragId, setDragId, onDropRow, dragDayKey, setDragDayKey, onDropDay,
    typeMenuOpen, setTypeMenuOpen, arrivalMenuOpen, setArrivalMenuOpen, newTypeDraft, setNewTypeDraft, addCustomType,
    collapsedParents, setCollapsedParents, collapsedGroups, setCollapsedGroups,
    toggleFrameCollapse, openFrameModal, setDeleteFrameConfirmId, updateFrameDates, nextDateInContext, lastDateInContext, frameTotals,
    openAddDayModal, sortDayByTime, getColWidth, startResize, displayCurrency, convertAmount, openHotelInfo,
    frameMenuOpenId, setFrameMenuOpenId, generateTravelJournal,
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
  /* Once a flight number has been successfully looked up, the fields it filled in are locked — editing
     them by hand would silently diverge from the real flight data. Clearing the flight number field
     unlocks everything again for manual entry. */
  const flightLocked = !!(cardDraft && showFlightHint && cardDraft.flightLookedUpFor && cardDraft.flightNumber && cardDraft.flightLookedUpFor === cardDraft.flightNumber.trim());

  /* ---------- render ---------- */
  return (
    <>
      {showIntro && <SplashIntro onFinish={() => setShowIntro(false)} lang={lang} />}
      <div className="mytrip-app" dir={dir}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&display=swap');
        :root { --bg:#F5F8F6; --surface:#FFFFFF; --ink:#1E2A28; --muted:#6B7C76; --border:#DEE7E2; --teal:#256D64; --teal-dark:#174C45; --teal-tint:#E6F0EE; --amber:#D98E3F; --amber-tint:#FBEEDD; --danger:#C1443A; }
        .mytrip-app {
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
        .mt-header-row1 { display:flex; align-items:center; justify-content:space-between; gap:8px; padding-block:8px 4px; padding-inline-start:10px; padding-inline-end:0; }
        .mt-header-row1-start { display:flex; align-items:center; gap:8px; }
        .mt-header-brand-group { display:flex; align-items:center; gap:6px; }
        .mt-brand-mark { width:30px; height:30px; border-radius:8px; background:var(--teal); display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
        .mt-brand-mark::after { content:''; position:absolute; width:44px; height:44px; border:2px solid rgba(255,255,255,.35); border-radius:50%; top:-14px; inset-inline-start:-8px; }
        .mt-brand-mark svg { color:#fff; width:16px; height:16px; z-index:1; }
        .mt-brand-name { font-size:18px; font-weight:700; line-height:1; }
        .mt-brand-version { font-size:9.5px; color:var(--muted); font-weight:600; letter-spacing:.02em; }
        .mt-header-actions { display:flex; align-items:center; justify-content:space-between; gap:5px; flex-wrap:wrap; padding:5px 14px; }
        .mt-header-actions-group { display:flex; align-items:center; gap:5px; flex-wrap:nowrap; flex-shrink:0; }
        .mt-icon-btn { border:1px solid var(--border); background:var(--surface); color:var(--ink); border-radius:8px; padding:5px 8px; display:flex; align-items:center; gap:5px; font-size:12.5px; font-weight:500; }
        .mt-header-collapse-btn { padding:5px; }
        .mt-toolbar { display:flex; align-items:center; justify-content:space-between; gap:5px; flex-wrap:wrap; padding:5px 14px 8px; }
        .mt-icon-btn:disabled { opacity:.35; cursor:not-allowed; }
        .mt-icon-btn:hover { background:var(--teal-tint); border-color:var(--teal); }
        .mt-icon-btn.active { background:var(--teal); color:#fff; border-color:var(--teal); }
        .mt-icon-btn svg { width:14px; height:14px; }
        .mt-avatar { width:26px; height:26px; border-radius:50%; background:var(--teal-tint); color:var(--teal-dark); display:flex; align-items:center; justify-content:center; border:1px solid var(--border); }
        .mt-toolbar-group { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
        .mt-floating-menu { background:var(--surface); color:var(--ink); border:1px solid var(--border); border-radius:10px; box-shadow:0 12px 32px rgba(20,40,35,.18); padding:10px; z-index:200; max-width:92vw; max-height:70vh; overflow-y:auto; }
        .mt-floating-backdrop { position:fixed; inset:0; z-index:390; background:transparent; }
        .mt-menu-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:7px; }
        .mt-menu-head strong { font-size:12.5px; }
        .mt-share-opt { width:100%; display:flex; align-items:center; gap:8px; padding:8px; border-radius:7px; background:none; border:none; font-size:12.5px; text-align:start; color:var(--ink); }
        .mt-share-opt:hover { background:var(--bg); }
        .mt-share-opt.disabled { color:var(--muted); }
        .mt-file-demo { width:100%; display:flex; align-items:center; justify-content:center; gap:8px; border:1.5px dashed var(--border); border-radius:10px; padding:12px; background:var(--bg); color:var(--muted); font-size:12px; }
        .mt-attachments-dropdown { border:1px solid var(--border); border-radius:10px; overflow:hidden; margin-bottom:8px; }
        .mt-attachments-summary { width:100%; display:flex; align-items:center; gap:8px; border:none; background:var(--bg); padding:10px 12px; font-size:13px; font-weight:600; color:var(--ink); cursor:pointer; }
        .mt-attachments-summary span { flex:1; text-align:start; }
        .mt-attachments-grid { border-top:1px solid var(--border); display:flex; flex-wrap:wrap; gap:8px; padding:10px 12px; max-height:180px; overflow-y:auto; }
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
        .mt-content { padding-inline-start:10px; padding-inline-end:0; padding-block-end:40px; }
        .mt-suggest { display:flex; align-items:center; gap:10px; background:var(--amber-tint); border:1px solid #EAC896; color:#7A4E17; padding:9px 14px; border-radius:10px; margin:14px 0; font-size:12.5px; flex-wrap:wrap; }
        .mt-suggest svg { width:15px; height:15px; flex-shrink:0; }
        .mt-suggest .mt-btn { margin-inline-start:auto; }
        .mt-frame-block { border:1px solid var(--border); border-inline-start:4px solid var(--frame-color,var(--teal)); border-radius:12px; margin-top:16px; background:var(--surface); }
        .mt-frame-header { display:flex; flex-direction:column; padding:10px 12px; cursor:pointer; user-select:none; background:#FBFDFC; border-radius:11px 11px 0 0; }
        .mt-frame-header-top { display:flex; align-items:center; gap:9px; }
        .mt-frame-header-special-wrap { display:flex; flex-direction:column; gap:6px; width:100%; }
        .mt-frame-header-row1 { display:flex; align-items:center; gap:9px; }
        .mt-frame-name-full { font-weight:700; font-size:15px; overflow-wrap:break-word; min-width:24px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .mt-frame-city { font-size:12.5px; font-weight:700; color:var(--frame-color, var(--teal)); white-space:nowrap; }
        .mt-frame-header-row2 { display:flex; align-items:center; justify-content:space-between; gap:9px; padding-inline-start:24px; }
        .mt-frame-header-row2-start { display:flex; align-items:center; gap:10px; min-width:0; }
        .mt-frame-header-row2-end { display:flex; align-items:center; gap:9px; flex-shrink:0; }
        .mt-frame-header-dates { margin-top:5px; padding-inline-start:24px; }
        .mt-frame-header-special { background:color-mix(in srgb, var(--frame-color) 14%, white); border-radius:10px 10px 0 0; padding:8px 10px; }
        .mt-frame-type-icon { width:28px; height:28px; border-radius:8px; background:var(--frame-color); color:#fff; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .mt-frame-type-icon-btn { border:none; cursor:pointer; }
        .mt-frame-date-cluster { display:flex; align-items:center; gap:6px; flex-shrink:0; margin-inline-start:auto; }
        .mt-frame-daycount { font-size:11px; font-weight:700; color:var(--muted); white-space:nowrap; }
        .mt-frame-date-arrow { color:var(--muted); flex-shrink:0; }
        .mt-frame-date-badge { display:flex; flex-direction:column; align-items:center; border-radius:8px; overflow:hidden; flex-shrink:0; width:36px; box-shadow:0 1px 3px rgba(0,0,0,.15); }
        .mt-frame-date-badge .mt-day-badge-top { height:6px; }
        .mt-frame-date-badge .mt-day-badge-body { padding:2px 0; }
        .mt-frame-name { font-weight:700; font-size:15px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:24px; flex-shrink:1; }
        .mt-frame-date-inline { font-size:12.5px; font-weight:600; color:var(--muted); white-space:nowrap; flex-shrink:0; font-variant-numeric:tabular-nums; display:flex; align-items:center; gap:5px; }
        .mt-frame-date-btn { border:none; background:none; padding:0; cursor:pointer; display:flex; align-items:center; gap:5px; color:inherit; }
        .mt-frame-date-btn:hover { color:var(--teal-dark); text-decoration:underline; }
        .mt-frame-cost-inline { font-size:12.5px; font-weight:700; color:var(--amber); white-space:nowrap; flex-shrink:0; }
        .mt-frame-end-group { display:flex; align-items:center; gap:8px; margin-inline-start:auto; flex-shrink:0; }
        .mt-frame-actions { display:flex; gap:2px; flex-shrink:0; }
        .mt-kebab-menu { min-width:180px; }
        .mt-daterange-btn { display:flex; align-items:center; gap:7px; width:100%; border:1px solid var(--border); border-radius:8px; padding:8px 10px; font-size:13px; background:#fff; color:var(--ink); }
        .mt-datefield { display:flex; align-items:center; gap:7px; width:100%; border:1px solid var(--border); border-radius:8px; padding:6px 10px; background:#fff; color:var(--teal-dark); }
        .mt-datefield input[type="date"] { border:none; background:none; padding:0; font-size:13px; color:var(--ink); flex:1; font-family:inherit; position:relative; }
        .mt-datefield input[type="date"]::-webkit-calendar-picker-indicator { -webkit-appearance:none; appearance:none; position:absolute; inset:0; width:100%; height:100%; margin:0; padding:0; background:transparent; cursor:pointer; opacity:0; }
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
        .mt-group-today { border:2px solid var(--teal); border-radius:12px; padding:8px; background:var(--teal-tint); }
        .mt-group-header { display:flex; align-items:center; gap:7px; padding:6px 4px; cursor:pointer; user-select:none; flex-wrap:wrap; }
        .mt-day-badge { display:flex; flex-direction:column; align-items:center; border-radius:7px; overflow:hidden; flex-shrink:0; width:32px; margin-inline-start:auto; box-shadow:0 1px 3px rgba(0,0,0,.15); }
        .mt-day-badge-top { background:var(--danger); width:100%; height:6px; flex-shrink:0; }
        .mt-day-badge-body { background:var(--surface); width:100%; display:flex; flex-direction:column; align-items:center; padding:2px 0; }
        .mt-day-badge-num { font-size:13px; font-weight:800; color:var(--ink); line-height:1; }
        .mt-day-badge-mon { font-size:7px; font-weight:700; color:var(--muted); text-transform:uppercase; line-height:1.2; }
        .mt-day-badge-weekday { font-size:7px; font-weight:700; color:var(--muted); line-height:1.2; }
        .mt-group-actions { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
        .mt-group-add { font-size:12px; color:var(--teal); display:flex; align-items:center; gap:3px; background:none; border:none; font-weight:600; text-decoration:none; }
        .mt-group-add:hover { text-decoration:underline; }
        .mt-group-add.disabled { color:var(--border); cursor:default; }
        .mt-group-add-bottom { display:flex; margin-top:6px; padding:6px 4px; }
        .mt-group-footer-actions { display:flex; align-items:center; justify-content:flex-start; gap:10px; flex-wrap:wrap; margin-top:0; padding:2px 4px; }
        .mt-chrono-warning { display:flex; align-items:center; gap:7px; background:#FBEAE8; color:var(--danger); font-size:11.5px; padding:6px 10px; border-radius:8px; margin:0 4px 8px; }
        .mt-table-wrap { width:100%; overflow-x:auto; border-radius:10px; }
        .mt-flow-view { display:flex; align-items:flex-start; gap:4px; flex-wrap:wrap; padding:16px 8px; background:var(--surface); border-radius:10px; border:1px solid var(--border); }
        .mt-flow-node { display:flex; flex-direction:column; align-items:center; gap:4px; border:none; background:none; padding:4px; border-radius:8px; min-width:60px; max-width:80px; }
        .mt-flow-node:hover { background:var(--teal-tint); }
        .mt-flow-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0; }
        .mt-flow-time { font-size:10.5px; font-weight:700; color:var(--ink); font-variant-numeric:tabular-nums; }
        .mt-flow-label { font-size:9.5px; color:var(--muted); text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:78px; }
        .mt-flow-arrow { display:flex; align-items:center; color:var(--border); flex-shrink:0; margin-top:15px; }
        .mt-flow-empty { padding:20px; text-align:center; color:var(--muted); font-size:13px; }
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
        .mt-card-header .mt-type-icon { width:27px; height:27px; border-radius:9px; }
        .mt-card-header .mt-type-icon svg { width:14px; height:14px; }
        .mt-type-icon-btn { border:none; cursor:pointer; }
        .has-warning-closed { color:var(--danger) !important; text-decoration:underline; text-decoration-style:wavy; text-underline-offset:2px; }
        .has-warning-fee { color:#B5651D !important; text-decoration:underline; text-decoration-style:wavy; text-underline-offset:2px; }
        .mt-type-icon-btn:hover { filter:brightness(1.1); box-shadow:0 0 0 2px var(--teal-tint); }
        .mt-hotel-photo-demo { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; height:110px; border-radius:10px; background:linear-gradient(135deg,var(--teal-tint),var(--bg)); color:var(--teal); border:1.5px dashed var(--border); font-size:11px; text-align:center; padding:8px; }
        .mt-hotel-photo-real { width:100%; height:150px; object-fit:cover; border-radius:10px; }
        .mt-hotel-rating-demo { display:flex; align-items:center; gap:2px; color:#D9A23D; }
        .mt-hotel-rating-demo .mt-hint { margin-inline-start:6px; color:var(--muted); }
        .mt-type-icon svg { width:12px; height:12px; color:#fff; }
        .mt-type-btn { border:none; background:none; padding:0; display:flex; align-items:center; gap:5px; font-size:12.8px; font-weight:500; color:var(--ink); max-width:100%; }
        .mt-type-field-btn { display:flex; align-items:center; gap:7px; width:100%; border:1px solid var(--border); border-radius:8px; padding:8px 10px; background:var(--surface); font-size:13px; font-weight:500; color:var(--ink); box-sizing:border-box; }
        .mt-type-field-btn:hover { border-color:var(--teal); }
        .mt-type-modal { max-width:340px; width:92vw; max-height:70vh; display:flex; flex-direction:column; padding:12px; }
        .mt-time-modal { max-width:240px; width:84vw; padding:18px; }
        .mt-clock-time-display { display:flex; align-items:center; justify-content:center; gap:2px; margin-bottom:16px; }
        .mt-clock-hh, .mt-clock-mm { font-size:32px; font-weight:700; color:var(--muted); cursor:pointer; padding:2px 6px; border-radius:8px; font-variant-numeric:tabular-nums; }
        .mt-clock-hh.active, .mt-clock-mm.active { color:var(--ink); background:var(--teal-tint); }
        .mt-clock-colon { font-size:32px; font-weight:300; color:var(--border); }
        .mt-clock-face-wrap { display:flex; justify-content:center; }
        .mt-clock-face { width:180px; height:180px; touch-action:none; cursor:pointer; }
        .mt-clock-face-circle { fill:var(--bg); stroke:var(--border); stroke-width:1; }
        .mt-clock-inner-ring { fill:none; stroke:var(--border); stroke-width:1; stroke-dasharray:2,3; }
        .mt-clock-center-dot { fill:var(--teal); }
        .mt-clock-hand { stroke:var(--teal); stroke-width:2.5; stroke-linecap:round; }
        .mt-clock-num-bg { fill:var(--teal); }
        .mt-clock-num { font-size:14px; font-weight:600; fill:var(--muted); user-select:none; font-variant-numeric:tabular-nums; }
        .mt-clock-num.selected { fill:#fff; font-weight:700; }
        .mt-time-modal-header { display:flex; align-items:center; justify-content:space-between; font-weight:600; font-size:12.5px; color:var(--muted); margin-bottom:14px; }
        .mt-time-cols { position:relative; display:flex; align-items:center; justify-content:center; gap:4px; height:190px; margin-bottom:16px; }
        .mt-time-highlight-band { position:absolute; top:50%; transform:translateY(-50%); left:4px; right:4px; height:36px; background:var(--teal-tint); border-radius:8px; pointer-events:none; z-index:1; }
        .mt-time-col { position:relative; display:flex; flex-direction:column; overflow-y:auto; overscroll-behavior:contain; height:100%; width:52px; scroll-snap-type:y mandatory; -webkit-mask-image:linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%); mask-image:linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%); }
        .mt-time-pad { height:77px; flex-shrink:0; }
        .mt-time-sep { font-size:16px; font-weight:300; color:var(--border); z-index:2; }
        .mt-time-opt { border:none; background:none; height:36px; flex-shrink:0; font-size:14px; font-weight:400; color:var(--muted); font-variant-numeric:tabular-nums; scroll-snap-align:center; transition:color .15s ease, font-weight .15s ease, font-size .15s ease; z-index:2; position:relative; }
        .mt-time-opt.selected { color:var(--ink); font-weight:700; font-size:19px; }
        .mt-type-modal .mt-type-search-wrap { margin-bottom:8px; }
        .mt-type-modal .mt-type-list { overflow-y:auto; flex:1; overscroll-behavior:contain; }
        .mt-arrival-btn { border:1px solid var(--border); background:var(--surface); color:var(--muted); border-radius:6px; padding:3px; display:flex; align-items:center; justify-content:center; margin-inline-start:4px; }
        .mt-arrival-btn:hover { border-color:var(--teal); color:var(--teal); }
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
        .mt-computed-field { border-bottom:2px dashed #3E7CB1 !important; }
        .mt-stay-note { font-size:10.5px; color:var(--muted); margin-inline-start:2px; }
        .mt-time-cell { display:inline-flex; align-items:center; gap:2px; }
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
        .mt-card-drag-handle { cursor:grab; color:#9FB0AA; display:flex; align-items:center; margin-inline-start:auto; touch-action:none; }
        body.mt-dragging-active { cursor:grabbing; user-select:none; -webkit-user-select:none; }
        body.mt-dragging-active * { cursor:grabbing !important; }
        .mt-group-header.dragging { opacity:.4; }
        .mt-frame-header.droppable { outline:2px dashed var(--teal); outline-offset:-2px; }
        .mt-root-drop-zone { border:2px dashed var(--teal); border-radius:10px; padding:14px; text-align:center; color:var(--teal-dark); font-size:12.5px; font-weight:600; background:var(--teal-tint); margin-bottom:10px; }
        .mt-drop-hover { outline:2px dashed var(--teal); outline-offset:-2px; background:var(--teal-tint); }
        .mt-drag-handle:hover { color:var(--teal-dark); }
        .mt-empty { padding:16px; text-align:center; color:var(--muted); font-size:12.5px; background:var(--surface); border:1px dashed var(--border); border-radius:12px; }
        .mt-summary { margin-top:20px; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
        .mt-summary-label { font-size:12px; color:var(--muted); font-weight:600; }
        .mt-chip { background:var(--amber-tint); color:#8A5A1F; font-weight:700; font-size:12.5px; padding:4px 11px; border-radius:20px; }
        .mt-chip.small { font-size:11px; padding:2px 8px; font-weight:600; }
        .mt-chip-total { font-size:15px; padding:6px 14px; }
        .mt-fx-select { border:1px solid var(--border); border-radius:8px; padding:5px 8px; font-size:12.5px; background:#fff; color:var(--ink); }
        .mt-fx-note { font-size:10.5px; color:var(--muted); font-style:italic; }
        .mt-type-menu { z-index:200; background:var(--surface); border:1px solid var(--border); border-radius:10px; box-shadow:0 12px 32px rgba(20,40,35,.18); padding:8px; min-width:210px; max-height:min(360px, 70vh); display:flex; flex-direction:column; color:var(--ink); }
        .mt-type-search-wrap { display:flex; align-items:center; gap:6px; border:1px solid var(--border); border-radius:8px; padding:6px 8px; margin-bottom:6px; background:#fff; flex-shrink:0; }
        .mt-type-search-wrap svg { color:var(--muted); flex-shrink:0; }
        .mt-type-search { border:none; outline:none; flex:1; font-size:12.5px; background:transparent; color:var(--ink); min-width:0; }
        .mt-type-search-clear { border:none; background:none; color:var(--muted); display:flex; padding:2px; }
        .mt-type-list { overflow-y:auto; flex:1; min-height:0; }
        .mt-type-add-toggle { width:100%; display:flex; align-items:center; justify-content:center; gap:6px; padding:8px; border-radius:7px; background:none; border:none; font-size:12px; color:var(--teal); font-weight:600; flex-shrink:0; }
        .mt-type-add-toggle:hover { background:var(--bg); }
        .mt-type-cat-label { font-size:10px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); font-weight:700; padding:8px 8px 3px; }
        .mt-action-cat-label { font-size:14px; font-weight:700; color:var(--teal-dark); text-align:start; padding:10px 8px 4px; display:flex; align-items:center; gap:5px; justify-content:space-between; }
        .mt-type-menu button.opt, .mt-type-modal button.opt { width:100%; display:flex; align-items:center; gap:8px; padding:7px 8px; border-radius:7px; background:none; border:none; font-size:12.5px; text-align:start; color:var(--ink); }
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
        .mt-modal { background:var(--surface); border-radius:16px; width:100%; max-width:440px; max-height:86vh; overflow-y:auto; overscroll-behavior:contain; box-shadow:0 20px 60px rgba(0,0,0,.25); }
        .mt-modal.narrow { max-width:360px; }
        .mt-modal-header { display:flex; align-items:center; justify-content:space-between; padding:15px 18px; border-bottom:1px solid var(--border); position:sticky; top:0; background:var(--surface); }
        .mt-modal-title { font-size:17px; font-weight:700; }
        .mt-modal-body { padding:14px 18px; display:flex; flex-direction:column; gap:9px; }
        .mt-field label { display:block; font-size:12.5px; font-weight:700; color:var(--ink); margin-bottom:4px; text-align:right; line-height:1.3; }
        .mt-field input, .mt-field select, .mt-field textarea { width:100%; border:1px solid var(--border); border-radius:8px; padding:7px 9px; font-size:13px; font-family:inherit; background:#fff; color:var(--ink); }
        .mt-field input:focus, .mt-field select:focus, .mt-field textarea:focus { outline:none; border-color:var(--teal); }
        .mt-field textarea { resize:vertical; min-height:60px; }
        .mt-section-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); margin-top:6px; }
        .mt-trip-check-section { padding:12px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:6px; }
        .mt-wizard-stepper { display:flex; align-items:center; padding:14px 24px 10px; }
        .mt-wizard-step-circle { width:26px; height:26px; border-radius:50%; border:2px solid var(--border); background:var(--surface); color:var(--muted); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; transition:all .2s ease; }
        .mt-wizard-step-circle.active { border-color:var(--teal); background:var(--teal); color:#fff; }
        .mt-wizard-step-line { flex:1; height:2px; background:var(--border); margin:0 4px; transition:background .2s ease; }
        .mt-wizard-step-line.active { background:var(--teal); }
        .mt-wizard-choices { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
        .mt-wizard-subgroup { border:1px solid var(--border); border-radius:10px; padding:10px; margin-bottom:10px; background:var(--bg); }
        .mt-ai-suggest-box { border:1px solid var(--teal); border-radius:10px; padding:12px; margin-top:10px; background:var(--teal-tint); }
        .mt-wizard-qa { margin-bottom:14px; display:flex; align-items:center; gap:8px; }
        .mt-wizard-qa > label { flex:0 0 100px; font-size:12.5px; font-weight:600; }
        .mt-wizard-qa > *:not(label) { flex:1; min-width:0; }
        .mt-modal-body .mt-field { margin-bottom:14px; }
        .mt-wizard-qa label { flex:1 1 0; font-weight:700; font-size:12.5px; color:var(--ink); text-align:right; line-height:1.3; }
        .mt-wizard-qa input, .mt-wizard-qa textarea, .mt-wizard-qa .mt-daterange-btn, .mt-wizard-qa .mt-datefield { flex:2 1 0; min-width:0; border:1px solid var(--border); border-radius:8px; padding:7px 9px; font-size:13px; font-family:inherit; box-sizing:border-box; text-align:right; color:var(--ink); }
        .mt-wizard-qa input:focus { outline:none; border-color:var(--teal); }
        .mt-wizard-qa input[type="number"] { text-align:center; }
        .mt-wizard-choice { border:1.5px solid var(--border); background:var(--surface); color:var(--ink); border-radius:20px; padding:6px 14px; font-size:12.5px; font-weight:500; cursor:pointer; }
        .mt-wizard-choice.selected { background:var(--teal); border-color:var(--teal); color:#fff; }
        .mt-wizard-summary { margin-top:10px; padding:10px; background:var(--teal-tint); border-radius:8px; }
        .mt-loc-grid { display:grid; grid-template-columns:auto auto 2fr auto 1fr; align-items:center; gap:6px 6px; margin-top:4px; }
        .mt-loc-col-header { font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.03em; text-align:start; }
        .mt-loc-row-label { font-size:12px; font-weight:700; color:var(--ink); white-space:nowrap; }
        .mt-loc-icons { display:flex; align-items:center; gap:0; }
        .mt-loc-icons .mt-btn-icon { padding:5px 5px; }
        .mt-loc-grid-input { width:100%; border:1px solid var(--border); border-radius:8px; padding:6px 8px; font-size:12.5px; font-family:inherit; background:#fff; color:var(--ink); }
        .mt-editable:disabled, .mt-loc-grid-input:disabled, .mt-loc-alias-cell input:disabled, .mt-loc-mobile-alias-row input:disabled { background:#F0F2F1; color:var(--muted); cursor:not-allowed; border-color:#E5E9E7; }
        .mt-btn-icon:disabled { opacity:.35; cursor:not-allowed; }
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
        .mt-info-popup { z-index:400; background:var(--surface); border:1px solid var(--border); border-radius:8px; box-shadow:0 8px 24px rgba(20,40,35,.18); padding:9px 11px; font-size:12px; max-width:300px; color:var(--ink); line-height:1.5; }
        .mt-info-popup-widget { margin:-9px -11px 0; overflow:hidden; border-radius:8px 8px 0 0; }
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
        .mt-field-inline { display:flex; gap:6px; align-items:stretch; }
        .mt-field-inline input { flex:1 1 0; min-width:0; max-width:120px; }
        .mt-field-inline button { flex:0 0 auto; white-space:nowrap; }
        .mt-field-inline > div:first-child { flex:1; }
        .mt-checkbox-row { display:flex; align-items:center; gap:7px; font-size:12.5px; }
        .mt-checklist-row { display:flex; align-items:center; gap:8px; padding:8px 4px; border-bottom:1px solid var(--border); }
        a.mt-checklist-row { text-decoration:none; color:inherit; cursor:pointer; }
        a.mt-checklist-doc-icon { text-decoration:none; }
        .mt-checklist-done { text-decoration:line-through; color:var(--muted); }
        .mt-checklist-docs-row { display:flex; align-items:center; gap:5px; }
        .mt-checklist-doc-icon-wrap { position:relative; display:flex; }
        .mt-checklist-doc-icon { display:flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:8px; background:var(--teal-tint); color:var(--teal-dark); }
        .mt-checklist-doc-x { position:absolute; top:-4px; inset-inline-end:-4px; border:1px solid var(--surface); background:var(--danger); color:#fff; border-radius:50%; width:13px; height:13px; padding:0; display:flex; align-items:center; justify-content:center; }
        .mt-checklist-upload-btn { padding:6px; display:flex; align-items:center; justify-content:center; }
        .mt-checklist-progress-wrap { display:flex; align-items:center; gap:10px; padding:12px 20px 10px; position:sticky; top:0; z-index:5; background:var(--surface); border-bottom:1px solid var(--border); }
        .mt-checklist-progress-track { flex:1; height:8px; border-radius:4px; background:var(--border); overflow:hidden; }
        .mt-checklist-progress-fill { height:100%; background:var(--danger); border-radius:4px; transition:width .3s ease, background .3s ease; }
        .mt-checklist-progress-fill.complete { background:var(--teal); }
        .mt-checklist-progress-pct { font-size:12.5px; font-weight:700; color:var(--danger); min-width:34px; text-align:left; }
        .mt-checklist-progress-pct.complete { color:var(--teal-dark); }
        .mt-checklist-nav-card { display:flex; align-items:center; gap:10px; width:100%; padding:12px; border:1px solid var(--border); border-radius:10px; background:var(--surface); margin-bottom:8px; text-align:right; color:var(--ink); }
        .mt-checklist-nav-card:hover { background:var(--bg); border-color:var(--teal); }
        .mt-checklist-nav-icon { width:32px; height:32px; border-radius:8px; background:var(--teal-tint); color:var(--teal-dark); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .mt-checklist-nav-text { display:flex; flex-direction:column; gap:2px; flex:1; }
        .mt-checklist-nav-text strong { font-size:13.5px; }
        .mt-checklist-nav-text span { font-size:11.5px; color:var(--muted); }
        .mt-help-btn { border:none; background:none; color:var(--muted); padding:3px; display:flex; align-items:center; justify-content:center; border-radius:50%; flex-shrink:0; }
        .mt-help-btn:hover { color:var(--teal); background:var(--teal-tint); }
        .mt-help-popover { width:260px; max-width:calc(100vw - 16px); padding:12px; box-shadow:0 8px 24px rgba(20,40,35,.18); border-radius:10px; background:var(--surface); box-sizing:border-box; }
        .mt-help-popover-title { display:flex; align-items:center; gap:6px; font-size:13px; font-weight:700; color:var(--ink); margin-bottom:6px; text-align:right; }
        .mt-help-popover-text { font-size:12px; color:var(--muted); line-height:1.5; margin:0 0 8px; text-align:right; }
        .mt-help-popover-more { border:none; background:none; color:var(--teal-dark); font-size:12px; font-weight:700; padding:0; }
        .mt-help-section { padding:12px 0; border-bottom:1px solid var(--border); transition:background .4s ease; }
        .mt-help-section.focused { background:var(--teal-tint); border-radius:8px; padding:12px 10px; }
        .mt-help-section-title { display:flex; align-items:center; gap:7px; font-size:14.5px; font-weight:700; color:var(--ink); margin-bottom:6px; text-align:right; }
        .mt-file-manager-tabs { display:flex; gap:6px; padding:10px 16px 0; border-bottom:1px solid var(--border); }
        .mt-flight-manager-toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:4px; }
        .mt-reminders-day-group { margin-bottom:14px; }
        .mt-reminders-day-header { font-weight:700; font-size:13px; color:var(--teal); margin-bottom:6px; padding-bottom:4px; border-bottom:1px solid var(--border); }
        .mt-reminder-row { display:flex; align-items:center; gap:9px; padding:7px 2px; border-bottom:1px solid var(--border); }
        .mt-reminder-row.disabled { opacity:0.45; }
        .mt-reminder-row:last-child { border-bottom:none; }
        .mt-reminder-kind-icon { flex-shrink:0; display:flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:8px; }
        .mt-reminder-kind-icon.reminder { background:var(--teal-tint); color:var(--teal); }
        .mt-reminder-kind-icon.alert { background:#FBEAEA; color:var(--danger); }
        .mt-reminder-main { flex:1; min-width:0; }
        .mt-reminder-label { font-weight:600; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .mt-reminder-offset { display:flex; align-items:center; gap:4px; flex-shrink:0; }
        .mt-reminder-offset-input { width:44px; padding:3px 4px; border:1px solid var(--border); border-radius:6px; text-align:center; font-size:12.5px; }
        .mt-flight-manager-row { border:1px solid var(--border); border-radius:10px; padding:9px 11px; margin-bottom:8px; display:flex; flex-direction:column; gap:4px; }
        .mt-hotel-verify-badge { font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:20px; background:#FBEAEA; color:var(--danger); flex-shrink:0; }
        .mt-hotel-verify-badge.ok { background:var(--teal-tint); color:var(--teal); }
        .mt-flight-manager-row-top { display:flex; align-items:center; justify-content:space-between; gap:8px; font-weight:700; font-size:13.5px; }
        .mt-flight-manager-route { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .mt-flight-manager-num { color:var(--teal); font-size:12.5px; flex-shrink:0; }
        .mt-flight-manager-row-mid { display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:12.5px; color:var(--muted); }
        .mt-flight-manager-row-bottom { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
        .mt-spin { animation:mt-spin-anim 1s linear infinite; }
        @keyframes mt-spin-anim { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .mt-file-folder-row { display:flex; align-items:center; gap:10px; width:100%; padding:9px 4px; border:none; background:none; border-bottom:1px solid var(--border); text-align:start; cursor:pointer; }
        .mt-file-manager-icon.folder { background:var(--amber-tint); color:var(--amber); }
        .mt-file-row { justify-content:space-between; }
        .mt-file-manager-meta { font-size:11px; color:var(--muted); flex-shrink:0; white-space:nowrap; padding-inline-start:8px; }
        .mt-file-sort-row { display:flex; align-items:center; gap:8px; padding:4px 4px 6px; border-bottom:1px solid var(--border); margin-bottom:2px; }
        .mt-file-sort-header-spacer { width:30px; flex-shrink:0; }
        .mt-file-sort-header { display:flex; align-items:center; gap:2px; border:none; background:none; font-size:11px; font-weight:700; color:var(--muted); padding:0; flex:1; }
        .mt-file-sort-header:nth-child(2) { flex:1; }
        .mt-file-sort-header.active { color:var(--teal-dark); }
        .mt-file-manager-icon { width:30px; height:30px; border-radius:8px; background:var(--teal-tint); color:var(--teal-dark); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .mt-file-manager-info { display:flex; flex-direction:column; gap:2px; flex:1; overflow:hidden; }
        .mt-file-manager-info strong { font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .mt-file-manager-info span { font-size:11px; color:var(--muted); }
        .mt-help-section-text { font-size:12.5px; color:var(--muted); line-height:1.6; margin:0; text-align:right; }
        .mt-checklist-add-row { display:flex; align-items:center; gap:6px; padding:8px 4px 14px; }
        .mt-checklist-add-row input { flex:1; border:1px solid var(--border); border-radius:8px; padding:7px 9px; font-size:13px; font-family:inherit; text-align:right; }
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
        .mt-modal-footer { display:flex; justify-content:flex-end; align-items:center; gap:6px; padding:11px 14px; border-top:1px solid var(--border); position:sticky; bottom:0; background:var(--surface); flex-wrap:nowrap; overflow-x:auto; }
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
        .mt-cards { display:flex; flex-direction:column; gap:5px; position:relative; }
        .mt-card { background:var(--surface); border:1px solid #CBD8D2; border-radius:12px; padding:14px 16px; display:flex; flex-direction:column; gap:10px; position:relative; z-index:1; box-shadow:0 1px 3px rgba(30,42,40,0.08), 0 4px 14px rgba(30,42,40,0.09); }
        .mt-card-header { display:flex; align-items:center; gap:9px; }
        .mt-card-title { font-size:13.5px; font-weight:700; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:right; }
        .mt-card-divider { height:1px; background:var(--border); margin:0 -16px; }
        .mt-card-times-row { display:flex; align-items:flex-start; gap:8px; overflow:hidden; }
        .mt-card-time-block { display:flex; flex-direction:column; align-items:flex-start; gap:2px; min-width:0; flex:0 1 auto; }
        .mt-card-time-block.end { align-items:flex-end; }
        .mt-card-time-big { font-size:16px; font-weight:800; color:var(--ink); font-variant-numeric:tabular-nums; line-height:1.1; }
        .mt-card-time-sub { font-size:16px; font-weight:600; color:var(--muted); max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .mt-card-connector { flex:1 1 34px; min-width:34px; display:flex; flex-direction:column; align-items:center; gap:2px; }
        .mt-card-connector-line { position:relative; width:100%; height:20px; display:flex; align-items:center; justify-content:center; }
        .mt-card-connector-line::before { content:""; position:absolute; inset-inline:0; top:50%; border-top:1.5px dashed var(--border); }
        .mt-card-connector-icon { position:relative; z-index:1; background:var(--surface); color:var(--muted); display:flex; align-items:center; justify-content:center; padding:0 4px; }
        .mt-card-connector-sub { height:20px; display:flex; align-items:center; justify-content:center; }
        .mt-card-duration-text { font-size:10.5px; font-weight:600; color:var(--muted); white-space:nowrap; }
        .mt-card-bottom { display:flex; align-items:center; justify-content:space-between; padding-top:9px; border-top:1px solid var(--border); }
        .mt-card-icons { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .mt-card-icons .mt-link-icon { padding:4px; }
        .mt-route-mini { display:flex; align-items:center; gap:2px; }
        .mt-route-km { font-size:11px; color:var(--muted); font-variant-numeric:tabular-nums; }
        .mt-route-km-btn { border:none; background:none; color:var(--muted); font-size:10.5px; padding:0 2px; text-decoration:underline; }
        .mt-note { font-size:11px; color:var(--muted); margin-top:4px; }

        @media (max-width: 640px) {
          .mt-group-footer-actions { flex-wrap:nowrap; gap:8px; justify-content:flex-start; }
          .mt-group-footer-actions .mt-group-add { font-size:11px; white-space:nowrap; }
          .mt-header-row1 { padding-block:8px 4px; padding-inline-start:8px; padding-inline-end:0; }
          .mt-header-actions { padding:4px 10px; }
          .mt-toolbar { padding:4px 10px 8px; gap:5px; }
          .mt-content { padding-inline-start:8px; padding-inline-end:0; padding-block-end:32px; }
          .mt-frame-header { padding:12px 10px; gap:7px; }
          .mt-frame-actions button, .mt-row-actions button { min-width:32px; min-height:32px; justify-content:center; }
          .mt-group-header { padding:5px 6px; }
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
        .mt-intro-logo { font-size:24px; font-weight:700; color:#174C45; letter-spacing:.02em; }
        .mt-intro-version { font-size:10.5px; color:#9AAAA5; font-variant-numeric:tabular-nums; }
        .mt-intro-tag { font-size:12.5px; color:#6B7C76; margin-top:2px; }

        @media print {
          .mt-header-row1, .mt-header-actions, .mt-toolbar, .mt-suggest, .mt-row-actions, .mt-frame-actions, .mt-group-actions,
          .mt-drag-handle, .mt-col-resizer, .mt-frame-add-row, .mt-group-add-bottom, .mt-group-footer-actions, .mt-fx-select, .mt-fx-note,
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
        <div className="mt-header-row1-start">
          <span className="mt-brand-version">v{APP_VERSION}</span>
          <button className="mt-icon-btn mt-header-collapse-btn" onClick={() => setHeaderCollapsed((v) => !v)} title={headerCollapsed ? T.showHeader : T.hideHeader}>
            {headerCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
        <div className="mt-header-brand-group">
          <span className="mt-brand-name">{T.appName}</span>
          <div className="mt-brand-mark"><Plane /></div>
          <HelpButton topic="general" lang={lang} T={T} onOpenFull={openHelpTopic} openTopic={helpPopoverOpen} setOpenTopic={setHelpPopoverOpen} />
        </div>
      </div>
      {!headerCollapsed && (
      <>
      <div className="mt-header-actions">
        <div className="mt-header-actions-group">
          <button className="mt-icon-btn" onClick={() => setLang(lang === "he" ? "en" : "he")}><Globe /> {T.lang}</button>
        </div>
        {!cloudUser ? (
          <button className="mt-icon-btn" onClick={openCloudSync}><LogIn /> {T.login}</button>
        ) : (
          <button className="mt-icon-btn" onClick={openCloudSync} title={cloudUser.email}><span className="mt-avatar"><User size={14} /></span> {cloudUser.email ? cloudUser.email.split("@")[0] : T.logout}</button>
        )}
      </div>
      {cloudSyncOpen && (
        <div className="mt-modal-backdrop" onClick={() => setCloudSyncOpen(false)}>
          <div className="mt-modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header"><span className="mt-modal-title">{T.cloudSyncTitle}</span><button className="mt-btn ghost" onClick={() => setCloudSyncOpen(false)}><X size={16} /></button></div>
            <div className="mt-modal-body">
              {!supabaseEnabled ? (
                <p className="mt-hint">{T.cloudNotConfigured}</p>
              ) : cloudAuthLoading ? (
                <p className="mt-hint">{T.cloudLoading}</p>
              ) : !cloudUser ? (
                <>
                  <p className="mt-hint" style={{ marginBottom: 10 }}>{T.cloudSignInHint}</p>
                  <button className="mt-btn primary" style={{ width: "100%" }} onClick={signInWithGoogle}><LogIn size={14} /> {T.cloudSignInGoogle}</button>
                </>
              ) : (
                <>
                  <div className="mt-flight-manager-row-top" style={{ marginBottom: 10 }}>
                    <span className="mt-hint">{cloudUser.email}</span>
                    <button className="mt-btn ghost" style={{ padding: "3px 8px" }} onClick={signOutCloud}>{T.logout}</button>
                  </div>
                  <div className="mt-field-inline" style={{ marginBottom: 8 }}>
                    <input style={{ fontSize: 15, padding: "8px 10px", maxWidth: "none" }} value={cloudSaveName} onChange={(e) => setCloudSaveName(e.target.value)} placeholder={T.cloudTripNamePlaceholder} />
                    <button className="mt-btn primary" onClick={() => saveTripToCloud()} disabled={cloudSaveStatus === "saving"}>
                      <Save size={13} /> {cloudSaveStatus === "saving" ? T.cloudSaving : T.cloudSaveCurrentTrip}
                    </button>
                  </div>
                  {cloudSaveStatus === "saved" && <p className="mt-hint" style={{ color: "var(--teal)" }}>{T.cloudSaveSuccess}</p>}
                  {cloudSaveStatus === "error" && <p className="mt-hint" style={{ color: "var(--danger)" }}>{T.cloudSaveError}</p>}
                  <p className="mt-hint" style={{ margin: "10px 0 6px", fontWeight: 700 }}>{T.cloudYourTrips}</p>
                  {cloudTripsLoading ? (
                    <p className="mt-hint">{T.cloudLoading}</p>
                  ) : !cloudTrips.length ? (
                    <p className="mt-hint">{T.cloudNoTrips}</p>
                  ) : cloudTrips.map((t) => {
                    const updatedAt = new Date(t.updated_at);
                    const hh = String(updatedAt.getHours()).padStart(2, "0");
                    const mm = String(updatedAt.getMinutes()).padStart(2, "0");
                    return (
                      <div className="mt-flight-manager-row" key={t.id} style={{ padding: "7px 9px" }}>
                        <div className="mt-flight-manager-row-top">
                          <span className="mt-flight-manager-route" dir="auto">{t.name}</span>
                        </div>
                        <div className="mt-flight-manager-row-bottom">
                          <span className="mt-hint">{fmtDate(toLocalISODate(updatedAt), lang)} <span dir="ltr">{hh}:{mm}</span></span>
                          <span style={{ display: "flex", gap: 6 }}>
                            <button className="mt-btn ghost" style={{ padding: "3px 8px" }} onClick={() => loadTripFromCloud(t.id)}>{T.load}</button>
                            <button className="mt-btn ghost" style={{ padding: "3px 8px", color: "var(--danger)", borderColor: "var(--danger)" }} onClick={() => deleteCloudTrip(t.id)}><Trash2 size={12} /></button>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="mt-toolbar">
        <div className="mt-toolbar-group">
          {(() => {
            const alerts = getTripAlerts();
            const severity = alerts.some((a) => a.severity === "red") ? "red" : alerts.length ? "orange" : "green";
            const color = severity === "red" ? "#C1443A" : severity === "orange" ? "#D98E3F" : "#3E8E5A";
            return (
              <span style={{ position: "relative", display: "inline-flex" }}>
                <button className="mt-icon-btn" ref={alertsMenu.refs.setReference} {...alertsMenu.getReferenceProps()} title={T.tripAlerts} style={{ color }}>
                  <Bell size={16} fill={severity === "green" ? "none" : color} />
                </button>
                {alertsMenuOpen && (
                  <>
                    <div className="mt-floating-backdrop" onClick={() => setAlertsMenuOpen(false)} />
                    <div ref={alertsMenu.refs.setFloating} style={{ ...alertsMenu.floatingStyles, zIndex: 400, minWidth: 220 }} {...alertsMenu.getFloatingProps()} className="mt-floating-menu">
                      {alerts.length === 0 ? (
                        <div className="mt-hint" style={{ padding: 8 }}>{T.noTripAlerts}</div>
                      ) : alerts.map((a) => (
                        <div key={a.id} className="mt-share-opt" style={{ cursor: "default" }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: a.severity === "red" ? "#C1443A" : "#D98E3F", flexShrink: 0 }} />
                          <span style={{ flex: 1, textAlign: "start", fontSize: 12 }}>{a.label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </span>
            );
          })()}
          <button className="mt-icon-btn" ref={(el) => { settingsBtnRef.current = el; settingsMenu.refs.setReference(el); }} {...settingsMenu.getReferenceProps()}><Menu /> {T.settings}</button>
        </div>
        <div className="mt-toolbar-group">
          <button className="mt-icon-btn" onClick={undo} disabled={!canUndo} title={T.undo}><Undo2 /></button>
          <button className="mt-icon-btn" onClick={redo} disabled={!canRedo} title={T.redo}><Redo2 /></button>
          <button className="mt-icon-btn" ref={(el) => { actionsBtnRef.current = el; actionsMenu.refs.setReference(el); }} {...actionsMenu.getReferenceProps()}><Menu /> {T.actions}</button>
          <input ref={importInputRef} type="file" accept="application/json,.json" style={{ display: "none" }}
            onChange={(e) => { importFromFile(e.target.files && e.target.files[0]); e.target.value = ""; }} />
          {importMsg && <span className="mt-hint" style={{ color: importMsg.ok ? "#3E8E5A" : "var(--danger)" }}>{importMsg.ok ? T.importSuccess : T.importError}</span>}
        </div>
      </div>
      </>
      )}
      </div>

      {settingsMenuOpen && (
        <>
          <div className="mt-floating-backdrop" onClick={() => setSettingsMenuOpen(false)} />
          <div ref={settingsMenu.refs.setFloating} style={{ ...settingsMenu.floatingStyles, zIndex: 400 }} {...settingsMenu.getFloatingProps()} className="mt-floating-menu mt-kebab-menu" >
            <div className="mt-action-cat-label"><span>{T.catViews}</span><HelpButton topic="views" lang={lang} T={T} onOpenFull={openHelpTopic} size={13} openTopic={helpPopoverOpen} setOpenTopic={setHelpPopoverOpen} /></div>
            <button className="mt-share-opt" onClick={() => { setViewMode("desktop"); setSettingsMenuOpen(false); }}>
              <Monitor size={14} /> {T.desktop}{viewMode === "desktop" && <Check size={13} style={{ marginInlineStart: "auto" }} />}
            </button>
            <button className="mt-share-opt" onClick={() => { setViewMode("mobile"); setSettingsMenuOpen(false); }}>
              <Smartphone size={14} /> {T.mobile}{viewMode === "mobile" && <Check size={13} style={{ marginInlineStart: "auto" }} />}
            </button>
            <button className="mt-share-opt" onClick={() => { setViewMode("flow"); setSettingsMenuOpen(false); }}>
              <Workflow size={14} /> {T.flowView}{viewMode === "flow" && <Check size={13} style={{ marginInlineStart: "auto" }} />}
            </button>
            <div className="divider" />
            <div className="mt-action-cat-label">{T.catGeneral}</div>
            <button className="mt-share-opt" onClick={() => { setSettingsMenuOpen(false); colMenu.refs.setReference(settingsBtnRef.current); setColMenuOpen(true); }}><Settings2 size={14} /> {T.manageColumns}</button>
            <button className="mt-share-opt" onClick={() => { setSettingsMenuOpen(false); addTypeMenu.refs.setReference(settingsBtnRef.current); setAddTypeOpen(true); }}><Plus size={14} /> {T.addType}</button>
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
          <div ref={actionsMenu.refs.setFloating} style={{ ...actionsMenu.floatingStyles, maxWidth: "min(240px, 92vw)", zIndex: 400 }} {...actionsMenu.getFloatingProps()} className="mt-floating-menu mt-kebab-menu">
            <div className="mt-action-cat-label"><span>{T.catNewFrame}</span><HelpButton topic="frames" lang={lang} T={T} onOpenFull={openHelpTopic} size={13} openTopic={helpPopoverOpen} setOpenTopic={setHelpPopoverOpen} /></div>
            <button className="mt-share-opt" onClick={() => { openFrameModal(null, null); setActionsMenuOpen(false); }}><FolderPlus size={14} /> {T.newFrame}</button>
            <button className="mt-share-opt" onClick={() => { openPreWizard(); setActionsMenuOpen(false); }}><Wand2 size={14} /> {T.tripWizard}</button>
            <button className="mt-share-opt" onClick={() => { openEditTripDetails(); setActionsMenuOpen(false); }}><Pencil size={14} /> {T.editTripDetails}</button>
            <button className="mt-share-opt" onClick={() => { setFlightManagerOpen(true); setActionsMenuOpen(false); }}><RefreshCw size={14} /> {T.refreshAllFlights}</button>
            <button className="mt-share-opt" onClick={() => { setHotelManagerOpen(true); setActionsMenuOpen(false); }}><BedDouble size={14} /> {T.hotelManagerTitle}</button>
            <button className="mt-share-opt" onClick={() => { setRemindersManagerOpen(true); setActionsMenuOpen(false); }}><Bell size={14} /> {T.remindersManagerTitle}</button>
            <div className="mt-action-cat-label"><span>{T.catSaveExport}</span><HelpButton topic="sharing" lang={lang} T={T} onOpenFull={openHelpTopic} size={13} openTopic={helpPopoverOpen} setOpenTopic={setHelpPopoverOpen} /></div>
            <button className="mt-share-opt" onClick={openSaveTripModal}><Save size={14} /> {T.saveTripByName}</button>
            <button className="mt-share-opt" onClick={openLoadTripModal}><FolderOpen size={14} /> {T.loadSavedTrip}</button>
            <button className="mt-share-opt" onClick={() => { exportToFile(); setActionsMenuOpen(false); }}><Download size={14} /> {T.exportFile}</button>
            <button className="mt-share-opt" onClick={() => { importInputRef.current && importInputRef.current.click(); setActionsMenuOpen(false); }}><Upload size={14} /> {T.importFile}</button>
            <button className="mt-share-opt" onClick={() => { exportToPDF(); setActionsMenuOpen(false); }}><Printer size={14} /> {T.exportPdf}</button>
            <button className="mt-share-opt" onClick={openRouteImport}><Route size={14} /> {T.importRoute}</button>
            <div className="mt-action-cat-label">{T.catSharing}</div>
            <button className="mt-share-opt disabled" onClick={() => { showDemoNotice(T.demoNeedsAccounts); setActionsMenuOpen(false); }}><UserPlus size={14} /> {T.shareWithUser}</button>
            <button className="mt-share-opt disabled" onClick={() => { showDemoNotice(T.demoNeedsAccounts); setActionsMenuOpen(false); }}><Users size={14} /> {T.shareEditAccess}</button>
            <button className="mt-share-opt" onClick={() => { exportShareableHTML(); setActionsMenuOpen(false); }}><Share2 size={14} /> {T.shareExportHtml}</button>
            <div className="mt-action-cat-label">{T.catTools}</div>
            <button className="mt-share-opt" onClick={() => { toggleReminders(); setActionsMenuOpen(false); }}><Bell size={14} /> {T.reminders}{remindersOn ? ` (${T.on})` : ""}</button>
            <button className="mt-share-opt" onClick={() => { setAiPanelOpen(true); setActionsMenuOpen(false); }}><Wand2 size={14} /> {T.aiAssistant}</button>
            <button className="mt-share-opt" onClick={() => { setChecklistOpen(true); setActionsMenuOpen(false); }}><CheckSquare size={14} /> {T.preFlightChecklist}</button>
            <button className="mt-share-opt" onClick={() => { setFileManagerOpen(true); setFileManagerFolder(null); setActionsMenuOpen(false); }}><FileUp size={14} /> {T.fileManagerTitle}</button>
        </div>
        </>
      )}
      {demoNotice && (
        <>
          <div className="mt-floating-backdrop" onClick={() => setDemoNotice(null)} />
          <div className="mt-floating-menu" style={{ top: "40vh", insetInlineStart: "50%", transform: "translateX(50%)", maxWidth: 300, textAlign: "center", zIndex: 400 }}>
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
                    <div className="mt-hint">{BUILT_IN_TRIP_TEMPLATES[name] ? T.builtInTemplate : new Date(trip.savedAt).toLocaleString(lang === "he" ? "he-IL" : "en-US")}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="mt-btn primary" onClick={() => loadSavedTrip(name)}>{T.load}</button>
                    {!BUILT_IN_TRIP_TEMPLATES[name] && (
                      <button className="mt-btn ghost" onClick={() => { if (confirm(T.confirmDeleteTrip)) { deleteSavedTrip(name); setLoadTripOpen(false); setTimeout(() => setLoadTripOpen(true), 0); } }}><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {preWizardOpen && (
        <div className="mt-modal-backdrop" onClick={closePreWizard}>
          <div className="mt-modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header"><span style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="mt-modal-title">{T.preWizardTitle}</span><HelpButton topic="wizard" lang={lang} T={T} onOpenFull={openHelpTopic} openTopic={helpPopoverOpen} setOpenTopic={setHelpPopoverOpen} /></span><button className="mt-btn ghost" onClick={closePreWizard}><X size={16} /></button></div>
            {preWizardScreen > 0 && (
              <div className="mt-wizard-stepper">
                {[1, 2, 3].map((n) => (
                  <React.Fragment key={n}>
                    <div className={"mt-wizard-step-circle" + (n <= preWizardScreen ? " active" : "")}>{n}</div>
                    {n < 3 && <div className={"mt-wizard-step-line" + (n < preWizardScreen ? " active" : "")} />}
                  </React.Fragment>
                ))}
              </div>
            )}
            <div className="mt-modal-body">
              {preWizardScreen === 0 && (
                <>
                  <div className="mt-wizard-qa">
                    <label>{T.preWizardHasPlan}</label>
                    <div className="mt-wizard-choices">
                      <button className={"mt-wizard-choice" + (preWizardData.hasTripPlan === "yes" ? " selected" : "")} onClick={() => setPreWizardData({ ...preWizardData, hasTripPlan: "yes" })}>{T.yes}</button>
                      <button className={"mt-wizard-choice" + (preWizardData.hasTripPlan === "no" ? " selected" : "")} onClick={() => setPreWizardData({ ...preWizardData, hasTripPlan: "no" })}>{T.no}</button>
                    </div>
                  </div>
                  {preWizardData.hasTripPlan === "yes" && (
                    <>
                      <div className="mt-wizard-qa"><label>{T.preWizardQName}</label><input value={preWizardData.tripName} onChange={(e) => setPreWizardData({ ...preWizardData, tripName: e.target.value })} placeholder={T.wizardTripNameHint} /></div>
                      <div className="mt-wizard-qa">
                        <label>{T.preWizardTravelerCount}</label>
                        <div className="mt-wizard-choices">
                          {["solo", "couple", "family", "group"].map((k) => (
                            <button key={k} className={"mt-wizard-choice" + (preWizardData.travelerCount === k ? " selected" : "")} onClick={() => setPreWizardData({ ...preWizardData, travelerCount: k })}>{T["wizardTravelers_" + k]}</button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-wizard-qa"><label>{T.preWizardDestination}</label><input value={preWizardData.destination} onChange={(e) => setPreWizardData({ ...preWizardData, destination: e.target.value })} /></div>
                      <div className="mt-wizard-qa">
                        <label>{T.preWizardTripDates}</label>
                        <DateRangeField startDate={preWizardData.planStartDate} endDate={preWizardData.planEndDate} lang={lang} T={T} initialViewMonth={preWizardRefDate}
                          onChange={(s, e) => { setPreWizardData({ ...preWizardData, planStartDate: s, planEndDate: e }); if (s) setPreWizardRefDate(s); }} />
                      </div>
                    </>
                  )}
                  {preWizardData.hasTripPlan === "no" && (
                    <>
                      <div className="mt-section-label">{T.preWizardAiSectionLabel}</div>
                      <div className="mt-wizard-qa">
                        <label>{T.preWizardTravelerCount}</label>
                        <div className="mt-wizard-choices">
                          {["solo", "couple", "family", "group"].map((k) => (
                            <button key={k} className={"mt-wizard-choice" + (preWizardData.travelerCount === k ? " selected" : "")} onClick={() => setPreWizardData({ ...preWizardData, travelerCount: k })}>{T["wizardTravelers_" + k]}</button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-wizard-qa"><label>{T.preWizardPreferredDest}</label><input value={preWizardData.preferredDestinations} onChange={(e) => setPreWizardData({ ...preWizardData, preferredDestinations: e.target.value })} /></div>
                      <div className="mt-field">
                        <label>{T.wizardBudget}</label>
                        <div className="mt-wizard-choices">
                          {["low", "mid", "high"].map((k) => (
                            <button key={k} className={"mt-wizard-choice" + (preWizardData.budgetLevel === k ? " selected" : "")} onClick={() => setPreWizardData({ ...preWizardData, budgetLevel: k })}>{T["wizardBudget_" + k]}</button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-field">
                        <label>{T.wizardInterests}</label>
                        <div className="mt-wizard-choices">
                          {["history", "food", "nature", "nightlife", "shopping", "art", "adventure"].map((k) => (
                            <button key={k} className={"mt-wizard-choice" + (preWizardData.interests.includes(k) ? " selected" : "")} onClick={() => togglePreWizardInterest(k)}>{T["wizardInterest_" + k]}</button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-field">
                        <label>{T.wizardAccommodation}</label>
                        <div className="mt-wizard-choices">
                          {["hotel", "apartment", "hostel", "flexible"].map((k) => (
                            <button key={k} className={"mt-wizard-choice" + (preWizardData.accommodationPrefs === k ? " selected" : "")} onClick={() => setPreWizardData({ ...preWizardData, accommodationPrefs: k })}>{T["wizardAccommodation_" + k]}</button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-field">
                        <label>{T.wizardPace}</label>
                        <div className="mt-wizard-choices">
                          {["relaxed", "balanced", "packed"].map((k) => (
                            <button key={k} className={"mt-wizard-choice" + (preWizardData.pace === k ? " selected" : "")} onClick={() => setPreWizardData({ ...preWizardData, pace: k })}>{T["wizardPace_" + k]}</button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-field"><label>{T.preWizardNotes}</label><textarea rows={5} value={preWizardData.planNotes} onChange={(e) => setPreWizardData({ ...preWizardData, planNotes: e.target.value })} /></div>
                      <div className="mt-ai-suggest-box">
                        <p className="mt-hint" style={{ margin: "0 0 8px" }}>{T.preWizardAiPitch}</p>
                        <button className="mt-btn primary" style={{ width: "100%" }} onClick={activatePreWizardAiAgent}><Wand2 size={13} /> {T.preWizardActivateAi}</button>
                      </div>
                    </>
                  )}
                </>
              )}
              {preWizardScreen === 1 && (
                <>
                  <div className="mt-wizard-qa">
                    <label>{T.preWizardHasFlights}</label>
                    <div className="mt-wizard-choices">
                      <button className={"mt-wizard-choice" + (preWizardData.hasFlights === "yes" ? " selected" : "")} onClick={() => setPreWizardData({ ...preWizardData, hasFlights: "yes" })}>{T.yes}</button>
                      <button className={"mt-wizard-choice" + (preWizardData.hasFlights === "no" ? " selected" : "")} onClick={() => setPreWizardData({ ...preWizardData, hasFlights: "no" })}>{T.no}</button>
                    </div>
                  </div>
                  {preWizardData.hasFlights === "yes" && (
                    <>
                      {preWizardData.flights.map((f, i) => (
                        <div key={i} className="mt-wizard-subgroup">
                          <div className="mt-section-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>{T.preWizardFlightN.replace("{n}", i + 1)}</span>
                            <span style={{ display: "flex", gap: 2 }}>
                              <button className="mt-btn ghost" style={{ padding: "2px 6px", marginTop: "-8px" }} disabled={i === 0} onClick={() => movePreWizardArrayItem("flights", i, -1)}><ChevronUp size={12} /></button>
                              <button className="mt-btn ghost" style={{ padding: "2px 6px", marginTop: "-8px" }} disabled={i === preWizardData.flights.length - 1} onClick={() => movePreWizardArrayItem("flights", i, 1)}><ChevronDown size={12} /></button>
                              {preWizardData.flights.length > 1 && <button className="mt-btn ghost" style={{ padding: "2px 6px", marginTop: "-8px" }} onClick={() => removePreWizardFlight(i)}><X size={12} /></button>}
                            </span>
                          </div>
                          <div className="mt-wizard-qa">
                            <label>{T.flightNoCheck}</label>
                            <div className="mt-field-inline">
                              <input value={f.flightNumber || ""} onChange={(e) => updatePreWizardArrayItem("flights", i, { flightNumber: e.target.value })} />
                              <button className="mt-btn ghost" onClick={() => fetchWizardFlightData("flights", i)}><Download size={13} /> {T.fetchFlightData}</button>
                            </div>
                          </div>
                          <div className="mt-hint" style={{ marginTop: "-8px", marginBottom: 8 }}>{T.flightNoCheckHint}</div>
                          {f.flightLookupMsg && <div className="mt-hint" style={{ marginBottom: 8 }}>{f.flightLookupMsg}</div>}
                          <div className="mt-wizard-qa"><label>{T.from}</label><div className="mt-field-inline" style={{ flex: 2 }}><input value={f.from} onChange={(e) => updatePreWizardArrayItem("flights", i, { from: e.target.value })} /><button className="mt-btn ghost mt-btn-icon" title={T.verify} onClick={() => openWizardLocationPicker("flights", i, "from")}><MapPin size={13} /></button></div></div>
                          <div className="mt-wizard-qa"><label>{T.aliasLabel}</label><input value={f.fromAlias} onChange={(e) => updatePreWizardArrayItem("flights", i, { fromAlias: e.target.value })} /></div>
                          <div className="mt-wizard-qa"><label>{T.to}</label><div className="mt-field-inline" style={{ flex: 2 }}><input value={f.to} onChange={(e) => updatePreWizardArrayItem("flights", i, { to: e.target.value })} /><button className="mt-btn ghost mt-btn-icon" title={T.verify} onClick={() => openWizardLocationPicker("flights", i, "to")}><MapPin size={13} /></button></div></div>
                          <div className="mt-wizard-qa"><label>{T.aliasLabel}</label><input value={f.toAlias} onChange={(e) => updatePreWizardArrayItem("flights", i, { toAlias: e.target.value })} /></div>
                          <div className="mt-wizard-qa">
                            <label>{T.date}</label>
                            <DateField value={f.depDate} lang={lang} T={T} initialViewMonth={preWizardRefDate} onChange={(e) => { updatePreWizardArrayItem("flights", i, { depDate: e.target.value }); if (e.target.value) setPreWizardRefDate(e.target.value); }} />
                          </div>
                          <div className="mt-field-row">
                            <div className="mt-field"><label>{T.flightDepTime}</label><TimeField value={f.depTime} onChange={(e) => updatePreWizardArrayItem("flights", i, { depTime: e.target.value })} T={T} /></div>
                            <div className="mt-field"><label>{T.flightLandTime}</label><TimeField value={f.landTime} onChange={(e) => updatePreWizardArrayItem("flights", i, { landTime: e.target.value })} T={T} /></div>
                          </div>
                          <label className="mt-checkbox-row"><input type="checkbox" checked={!!f.overnight} onChange={(e) => updatePreWizardArrayItem("flights", i, { overnight: e.target.checked })} />{T.overnight}</label>
                          <label className="mt-checkbox-row"><input type="checkbox" checked={!!f.addTransferTo} onChange={(e) => updatePreWizardArrayItem("flights", i, { addTransferTo: e.target.checked })} />{T.addTransferToAirport}</label>
                          <label className="mt-checkbox-row"><input type="checkbox" checked={!!f.addTransferFrom} onChange={(e) => updatePreWizardArrayItem("flights", i, { addTransferFrom: e.target.checked })} />{T.addTransferFromAirport}</label>
                        </div>
                      ))}
                      <button className="mt-btn ghost" style={{ width: "100%" }} onClick={addPreWizardFlight}><Plus size={13} /> {T.preWizardAddFlight}</button>
                    </>
                  )}
                </>
              )}
              {preWizardScreen === 2 && (
                <>
                  <div className="mt-wizard-qa">
                    <label>{T.preWizardHasDomestic}</label>
                    <div className="mt-wizard-choices">
                      <button className={"mt-wizard-choice" + (preWizardData.hasDomestic === "yes" ? " selected" : "")} onClick={() => setPreWizardData({ ...preWizardData, hasDomestic: "yes" })}>{T.yes}</button>
                      <button className={"mt-wizard-choice" + (preWizardData.hasDomestic === "no" ? " selected" : "")} onClick={() => setPreWizardData({ ...preWizardData, hasDomestic: "no" })}>{T.no}</button>
                    </div>
                  </div>
                  {preWizardData.hasDomestic === "yes" && (
                    <>
                      {preWizardData.domesticFlights.map((f, i) => (
                        <div key={i} className="mt-wizard-subgroup">
                          <div className="mt-section-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>{T.preWizardFlightN.replace("{n}", i + 1)}</span>
                            <span style={{ display: "flex", gap: 2 }}>
                              <button className="mt-btn ghost" style={{ padding: "2px 6px", marginTop: "-8px" }} disabled={i === 0} onClick={() => movePreWizardArrayItem("domesticFlights", i, -1)}><ChevronUp size={12} /></button>
                              <button className="mt-btn ghost" style={{ padding: "2px 6px", marginTop: "-8px" }} disabled={i === preWizardData.domesticFlights.length - 1} onClick={() => movePreWizardArrayItem("domesticFlights", i, 1)}><ChevronDown size={12} /></button>
                              {preWizardData.domesticFlights.length > 1 && <button className="mt-btn ghost" style={{ padding: "2px 6px", marginTop: "-8px" }} onClick={() => removePreWizardDomesticFlight(i)}><X size={12} /></button>}
                            </span>
                          </div>
                          <div className="mt-wizard-qa">
                            <label>{T.flightNoCheck}</label>
                            <div className="mt-field-inline">
                              <input value={f.flightNumber || ""} onChange={(e) => updatePreWizardArrayItem("domesticFlights", i, { flightNumber: e.target.value })} />
                              <button className="mt-btn ghost" onClick={() => fetchWizardFlightData("domesticFlights", i)}><Download size={13} /> {T.fetchFlightData}</button>
                            </div>
                          </div>
                          <div className="mt-hint" style={{ marginTop: "-8px", marginBottom: 8 }}>{T.flightNoCheckHint}</div>
                          {f.flightLookupMsg && <div className="mt-hint" style={{ marginBottom: 8 }}>{f.flightLookupMsg}</div>}
                          <div className="mt-wizard-qa"><label>{T.from}</label><div className="mt-field-inline" style={{ flex: 2 }}><input value={f.from} onChange={(e) => updatePreWizardArrayItem("domesticFlights", i, { from: e.target.value })} /><button className="mt-btn ghost mt-btn-icon" title={T.verify} onClick={() => openWizardLocationPicker("domesticFlights", i, "from")}><MapPin size={13} /></button></div></div>
                          <div className="mt-wizard-qa"><label>{T.aliasLabel}</label><input value={f.fromAlias} onChange={(e) => updatePreWizardArrayItem("domesticFlights", i, { fromAlias: e.target.value })} /></div>
                          <div className="mt-wizard-qa"><label>{T.to}</label><div className="mt-field-inline" style={{ flex: 2 }}><input value={f.to} onChange={(e) => updatePreWizardArrayItem("domesticFlights", i, { to: e.target.value })} /><button className="mt-btn ghost mt-btn-icon" title={T.verify} onClick={() => openWizardLocationPicker("domesticFlights", i, "to")}><MapPin size={13} /></button></div></div>
                          <div className="mt-wizard-qa"><label>{T.aliasLabel}</label><input value={f.toAlias} onChange={(e) => updatePreWizardArrayItem("domesticFlights", i, { toAlias: e.target.value })} /></div>
                          <div className="mt-wizard-qa">
                            <label>{T.date}</label>
                            <DateField value={f.depDate} lang={lang} T={T} initialViewMonth={preWizardRefDate} onChange={(e) => { updatePreWizardArrayItem("domesticFlights", i, { depDate: e.target.value }); if (e.target.value) setPreWizardRefDate(e.target.value); }} />
                          </div>
                          <div className="mt-field-row">
                            <div className="mt-field"><label>{T.flightDepTime}</label><TimeField value={f.depTime} onChange={(e) => updatePreWizardArrayItem("domesticFlights", i, { depTime: e.target.value })} T={T} /></div>
                            <div className="mt-field"><label>{T.flightLandTime}</label><TimeField value={f.landTime} onChange={(e) => updatePreWizardArrayItem("domesticFlights", i, { landTime: e.target.value })} T={T} /></div>
                          </div>
                          <label className="mt-checkbox-row"><input type="checkbox" checked={!!f.overnight} onChange={(e) => updatePreWizardArrayItem("domesticFlights", i, { overnight: e.target.checked })} />{T.overnight}</label>
                          <label className="mt-checkbox-row"><input type="checkbox" checked={!!f.addTransferTo} onChange={(e) => updatePreWizardArrayItem("domesticFlights", i, { addTransferTo: e.target.checked })} />{T.addTransferToAirport}</label>
                          <label className="mt-checkbox-row"><input type="checkbox" checked={!!f.addTransferFrom} onChange={(e) => updatePreWizardArrayItem("domesticFlights", i, { addTransferFrom: e.target.checked })} />{T.addTransferFromAirport}</label>
                        </div>
                      ))}
                      <button className="mt-btn ghost" style={{ width: "100%" }} onClick={addPreWizardDomesticFlight}><Plus size={13} /> {T.preWizardAddFlight}</button>
                    </>
                  )}
                </>
              )}
              {preWizardScreen === 3 && (
                <>
                  <div className="mt-wizard-qa">
                    <label>{T.preWizardHasHotels}</label>
                    <div className="mt-wizard-choices">
                      <button className={"mt-wizard-choice" + (preWizardData.hasHotels === "yes" ? " selected" : "")} onClick={() => setPreWizardData({ ...preWizardData, hasHotels: "yes" })}>{T.yes}</button>
                      <button className={"mt-wizard-choice" + (preWizardData.hasHotels === "no" ? " selected" : "")} onClick={() => setPreWizardData({ ...preWizardData, hasHotels: "no" })}>{T.no}</button>
                    </div>
                  </div>
                  {preWizardData.hasHotels === "yes" && (
                    <>
                      {preWizardData.hotels.map((h, i) => (
                        <div key={i} className="mt-wizard-subgroup">
                          <div className="mt-section-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>{T.preWizardHotelN.replace("{n}", i + 1)}</span>
                            <span style={{ display: "flex", gap: 2 }}>
                              <button className="mt-btn ghost" style={{ padding: "2px 6px", marginTop: "-8px" }} disabled={i === 0} onClick={() => movePreWizardArrayItem("hotels", i, -1)}><ChevronUp size={12} /></button>
                              <button className="mt-btn ghost" style={{ padding: "2px 6px", marginTop: "-8px" }} disabled={i === preWizardData.hotels.length - 1} onClick={() => movePreWizardArrayItem("hotels", i, 1)}><ChevronDown size={12} /></button>
                              {preWizardData.hotels.length > 1 && <button className="mt-btn ghost" style={{ padding: "2px 6px", marginTop: "-8px" }} onClick={() => removePreWizardHotel(i)}><X size={12} /></button>}
                            </span>
                          </div>
                          <div className="mt-wizard-qa"><label>{T.hotelName}</label><div className="mt-field-inline" style={{ flex: 2 }}><input value={h.name} onChange={(e) => updatePreWizardArrayItem("hotels", i, { name: e.target.value })} /><button className="mt-btn ghost mt-btn-icon" title={T.verify} onClick={() => openWizardLocationPicker("hotels", i, "name")}><MapPin size={13} /></button></div></div>
                          <div className="mt-wizard-qa"><label>{T.aliasLabel}</label><input value={h.alias} onChange={(e) => updatePreWizardArrayItem("hotels", i, { alias: e.target.value })} /></div>
                          <div className="mt-wizard-qa">
                            <label>{T.checkInOut}</label>
                            <DateRangeField startDate={h.checkIn} endDate={h.checkOut} lang={lang} T={T} initialViewMonth={preWizardRefDate}
                              onChange={(s, e) => { updatePreWizardArrayItem("hotels", i, { checkIn: s, checkOut: e }); if (s) setPreWizardRefDate(s); }} />
                          </div>
                        </div>
                      ))}
                      <button className="mt-btn ghost" style={{ width: "100%" }} onClick={addPreWizardHotel}><Plus size={13} /> {T.preWizardAddHotel}</button>
                    </>
                  )}
                  <div className="divider" />
                  <p className="mt-hint">{T.preWizardSummary}</p>
                </>
              )}
            </div>
            <div className="mt-modal-footer">
              {preWizardScreen === 0 && <button className="mt-btn ghost" onClick={closePreWizard}>{T.skip}</button>}
              {preWizardScreen > 0 && <button className="mt-btn ghost" onClick={preWizardBack}>{T.wizardBack}</button>}
              {preWizardScreen < 3 ? (
                <button className="mt-btn primary" onClick={preWizardNext}>{T.wizardNext}</button>
              ) : (
                <button className="mt-btn primary" onClick={confirmPreWizard}><Check size={13} /> {preWizardEditMode ? T.wizardUpdate : T.wizardCreate}</button>
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
                    <div className="mt-field"><label>{T.addDayDate}</label><DateField value={routeImportDate} lang={lang} T={T} onChange={(e) => setRouteImportDate(e.target.value)} /></div>
                    <div className="mt-field"><label>{T.start}</label><TimeField value={routeImportStartTime} onChange={(e) => setRouteImportStartTime(e.target.value)} T={T} /></div>
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
          <div ref={colMenu.refs.setFloating} style={{ ...colMenu.floatingStyles, zIndex: 400 }} {...colMenu.getFloatingProps()} className="mt-floating-menu mt-columns-menu">
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
          <div ref={addTypeMenu.refs.setFloating} style={{ ...addTypeMenu.floatingStyles, minWidth: 200, zIndex: 400 }} {...addTypeMenu.getFloatingProps()} className="mt-floating-menu">
            <div className="mt-menu-head"><span style={{ display: "flex", alignItems: "center", gap: 5 }}><strong>{T.newType}</strong><HelpButton topic="types" lang={lang} T={T} onOpenFull={openHelpTopic} size={13} openTopic={helpPopoverOpen} setOpenTopic={setHelpPopoverOpen} /></span><button className="mt-btn ghost" style={{ padding: "2px 6px" }} onClick={() => setAddTypeOpen(false)}><X size={14} /></button></div>
            <input type="text" placeholder={T.typeName} value={addTypeDraft.name} onChange={(e) => setAddTypeDraft({ ...addTypeDraft, name: e.target.value })} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 7px", fontSize: 12.5, marginBottom: 8, color: "var(--ink)", background: "#fff" }} />
            <div className="mt-wizard-choices" style={{ marginBottom: 8 }}>
              <button className={"mt-wizard-choice" + (addTypeDraft.kind === "desc" ? " selected" : "")} onClick={() => setAddTypeDraft({ ...addTypeDraft, kind: "desc" })}>{T.typeKindDesc}</button>
              <button className={"mt-wizard-choice" + (addTypeDraft.kind === "arrival" ? " selected" : "")} onClick={() => setAddTypeDraft({ ...addTypeDraft, kind: "arrival" })}>{T.typeKindArrival}</button>
            </div>
            <div className="mt-icon-pick-row">
              {ICON_PALETTE.map((ic) => { const PI = ICONS[ic]; return (
                <button key={ic} className={"mt-icon-pick" + (addTypeDraft.icon === ic ? " sel" : "")} onClick={() => setAddTypeDraft({ ...addTypeDraft, icon: ic })}><PI /></button>
              ); })}
            </div>
            <button className="mt-btn primary" style={{ width: "100%" }} onClick={submitAddType}><Plus size={13} /> {T.add}</button>
          </div>
        </>
      )}

      <DndContext sensors={dndSensors} onDragStart={handleDndStart} onDragEnd={handleDndEnd} onDragCancel={handleDndCancel}>
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
          <div ref={setRootDropRef} className={"mt-root-drop-zone" + (isRootOver ? " mt-drop-hover" : "")}>{T.dropDayToRoot}</div>
        )}

        {renderContext(null, 0)}

        <div className="mt-note"></div>
      </div>
      </DndContext>

      {/* add-day modal */}
      {addDayCtx && (
        <div className="mt-modal-backdrop" onClick={closeAddDayModal}>
          <div className="mt-modal narrow" onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header"><span className="mt-modal-title">{T.addDayModalTitle}</span><button className="mt-btn ghost" onClick={closeAddDayModal}><X size={16} /></button></div>
            <div className="mt-modal-body">
              <div className="mt-field"><label>{T.addDayDate}</label><DateField value={addDayCtx.date} lang={lang} T={T} onChange={(e) => setAddDayCtx({ ...addDayCtx, date: e.target.value })} /></div>
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
                {!locPicker.loading && locPicker.error === "no-results-fallback" && (
                  <div className="mt-error"><AlertTriangle /> <span>{T.locFallbackNoResults}</span></div>
                )}
                {!locPicker.loading && locPicker.error && locPicker.error !== "no-google-key" && locPicker.error !== "no-results-fallback" && (
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
                    <button key={i} className="mt-loc-result" onClick={() => (r.source === "nominatim" ? pickNominatimResult(r) : pickGooglePlaceResult(r))}>{r.text}</button>
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
            <div className="mt-modal-header"><span style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="mt-modal-title">{T.editRecord}</span><HelpButton topic="places" lang={lang} T={T} onOpenFull={openHelpTopic} openTopic={helpPopoverOpen} setOpenTopic={setHelpPopoverOpen} /></span><button className="mt-btn ghost" onClick={closeCard}><X size={16} /></button></div>
            <div className="mt-modal-body">
              <div className="mt-field">
                <label>{T.frame}</label>
                <select value={cardDraft.frameId || ""} onChange={(e) => setCardDraft({ ...cardDraft, frameId: e.target.value || null })}>
                  <option value="">{T.noFrame}</option>
                  {frameOptionsList(null).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              {cardFrameIssue && <div className="mt-error"><AlertTriangle /> {cardFrameIssue}</div>}

              <div className="mt-field">
                <label>{T.type}</label>
                <TypeFieldPicker typeId={cardDraft.typeId} types={types} lang={lang} T={T} kindFilter="desc" onChange={(newType) => {
                  const extra = newType === "transfer" ? { arrivalTypeId: "taxi" } : {};
                  if (noOriginNeeded(newType)) setCardDraft({ ...cardDraft, ...extra, typeId: newType, from: "", fromAlias: "", fromLat: null, fromLon: null, fromVerifiedUrl: "", fromVerifiedText: "", fromPlaceId: null });
                  else setCardDraft({ ...cardDraft, ...extra, typeId: newType });
                }} />
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

              {!noOriginNeeded(cardDraft.typeId) && (
                <div className="mt-field">
                  <label>{T.from}</label>
                  <div className="mt-loc-icons" style={{ marginBottom: 4 }}>
                    <input className="mt-loc-grid-input" dir="auto" value={cardDraft.from} disabled={flightLocked} placeholder={getTypeHint(cardDraft.typeId, "from", lang)} onChange={(e) => setCardDraft({ ...cardDraft, from: e.target.value })} />
                    <button className="mt-btn ghost mt-btn-icon" title={T.copyPrevDest} disabled={!prevRowForCard || !prevRowForCard.to} onClick={copyPrevDestinationToFrom}><Copy size={13} /></button>
                    <button className="mt-btn ghost mt-btn-icon" title={T.verify} onClick={() => openLocationPicker("from")}><MapPin size={13} /></button>
                    {fromVerifiedCard && (
                      <PopoverInfoIcon icon={CircleCheck} color="#3E8E5A">
                        {cardDraft.fromPlaceId ? <div className="mt-info-popup-widget"><GooglePlaceDetailsFull placeId={cardDraft.fromPlaceId} T={T} /></div> : <div>{T.verified}</div>}
                        <a href={cardDraft.fromVerifiedUrl} target="_blank" rel="noreferrer" style={{ display: "block", padding: "6px 10px" }}>{T.openMap}</a>
                      </PopoverInfoIcon>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input dir="auto" style={{ flex: 1 }} value={cardDraft.fromAlias || ""} placeholder={getTypeHint(cardDraft.typeId, "fromAlias", lang)} onChange={(e) => setCardDraft({ ...cardDraft, fromAlias: e.target.value })} />
                    <PopoverInfoIcon icon={Info} trigger="hover">{T.aliasHint}</PopoverInfoIcon>
                  </div>
                </div>
              )}

              {["checkin", "checkout", "transfer"].includes(cardDraft.typeId) && (
                <div style={{ position: "relative", marginBottom: 6 }}>
                  <button type="button" className="mt-btn ghost" ref={savedHotelsMenu.refs.setReference} {...savedHotelsMenu.getReferenceProps()}><BedDouble size={13} /> {T.pickTripHotel}</button>
                  {savedHotelsOpen && (
                    <>
                      <div className="mt-floating-backdrop" onClick={() => setSavedHotelsOpen(false)} />
                      <div ref={savedHotelsMenu.refs.setFloating} style={{ ...savedHotelsMenu.floatingStyles, zIndex: 400 }} {...savedHotelsMenu.getFloatingProps()} className="mt-floating-menu" >
                        {getTripHotels().length === 0 ? (
                          <div className="mt-hint" style={{ padding: 8 }}>{T.noTripHotels}</div>
                        ) : getTripHotels().map((h) => (
                          <button key={h.placeId || h.name} className="mt-share-opt" onClick={() => {
                            setCardDraft((d) => ({ ...d, to: h.name, toAlias: h.alias, toLat: h.lat, toLon: h.lon, toPlaceId: h.placeId, toVerifiedUrl: h.verifiedUrl, toVerifiedText: h.verifiedText }));
                            setSavedHotelsOpen(false);
                          }}>
                            <BedDouble size={13} /> <span style={{ flex: 1, textAlign: "start" }}>{h.alias || h.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="mt-field">
                <label>{T.to}</label>
                <div className="mt-loc-icons" style={{ marginBottom: 4 }}>
                  <input className="mt-loc-grid-input" dir="auto" value={cardDraft.to} disabled={flightLocked} placeholder={getTypeHint(cardDraft.typeId, "to", lang)} onChange={(e) => setCardDraft({ ...cardDraft, to: e.target.value })} />
                  <button className="mt-btn ghost mt-btn-icon" title={T.copyFromOrigin} disabled={!cardDraft.from} onClick={() => setCardDraft({ ...cardDraft, to: cardDraft.from })}><Copy size={13} /></button>
                  <button className="mt-btn ghost mt-btn-icon" title={T.verify} onClick={() => openLocationPicker("to")}><MapPin size={13} /></button>
                  {toVerifiedCard && (
                    <PopoverInfoIcon icon={CircleCheck} color="#3E8E5A">
                      {cardDraft.toPlaceId ? <div className="mt-info-popup-widget"><GooglePlaceDetailsFull placeId={cardDraft.toPlaceId} T={T} /></div> : <div>{T.verified}</div>}
                      <a href={cardDraft.toVerifiedUrl} target="_blank" rel="noreferrer" style={{ display: "block", padding: "6px 10px" }}>{T.openMap}</a>
                    </PopoverInfoIcon>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input dir="auto" style={{ flex: 1 }} value={cardDraft.toAlias || ""} placeholder={getTypeHint(cardDraft.typeId, "toAlias", lang)} onChange={(e) => setCardDraft({ ...cardDraft, toAlias: e.target.value })} />
                  <PopoverInfoIcon icon={Info} trigger="hover">{T.aliasHint}</PopoverInfoIcon>
                </div>
              </div>

              {(types.find((t) => t.id === cardDraft.typeId) || {}).category === "activities" && (
                <>
                  <label className="mt-checkbox-row" style={{ marginBottom: 4 }}><input type="checkbox" checked={cardDraft.toFee === "yes"} onChange={(e) => setCardDraft({ ...cardDraft, toFee: e.target.checked ? "yes" : null, ...(e.target.checked ? {} : { ticketPurchased: false }) })} />{T.requiresTicket}</label>
                  {cardDraft.toFee === "yes" && (
                    <label className="mt-checkbox-row" style={{ marginBottom: 4, marginInlineStart: 20 }}><input type="checkbox" checked={!!cardDraft.ticketPurchased} onChange={(e) => setCardDraft({ ...cardDraft, ticketPurchased: e.target.checked })} />{T.ticketPurchased}</label>
                  )}
                </>
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

              {noOriginNeeded(cardDraft.typeId) && (
                <div className="mt-field" style={{ marginTop: 16 }}>
                  <label>{T.arrivalMethod}</label>
                  <TypeFieldPicker typeId={cardDraft.arrivalTypeId} types={types} lang={lang} T={T} kindFilter="arrival" onChange={(id) => setCardDraft({ ...cardDraft, arrivalTypeId: id })} />
                </div>
              )}

              <div className="mt-field-row">
                <div className="mt-field"><label>תאריך</label><DateField value={cardDraft.date} lang={lang} T={T} onChange={(e) => setCardDraft({ ...cardDraft, date: e.target.value })} /></div>
              </div>

              <div className="mt-field-row">
                <div className="mt-field"><label>{T.start}</label><TimeField value={cardDraft.startTime} onChange={(e) => setCardDraft({ ...cardDraft, startTime: e.target.value, startTimeAuto: !e.target.value, startTimeSource: undefined })} T={T} disabled={flightLocked} style={timeFieldColor(cardDraft, "start") ? { borderBottom: `2px dashed ${timeFieldColor(cardDraft, "start")}` } : undefined} title={flightLocked ? T.flightLockedHint : (timeFieldColor(cardDraft, "start") ? T.computedStartTimeHint : undefined)} /></div>
                <div className="mt-field"><label>{T.end}</label><TimeField value={cardDraft.endTime} onChange={(e) => setCardDraft({ ...cardDraft, endTime: e.target.value, endTimeAuto: !e.target.value, endTimeSource: undefined })} T={T} disabled={flightLocked} style={timeFieldColor(cardDraft, "end") ? { borderBottom: `2px dashed ${timeFieldColor(cardDraft, "end")}` } : undefined} title={flightLocked ? T.flightLockedHint : (timeFieldColor(cardDraft, "end") ? T.computedEndTimeHint : undefined)} /></div>
                <div className="mt-field" style={{ maxWidth: 110 }}>
                  <label>{T.stayDuration}</label>
                  <StayDurationField value={cardDraft.stayDurationMin != null ? cardDraft.stayDurationMin : getDefaultStayMinutes(cardDraft.typeId)} onChange={(m) => setCardDraft({ ...cardDraft, stayDurationMin: m })} T={T} />
                </div>
              </div>
              <label className="mt-checkbox-row"><input type="checkbox" checked={!!cardDraft.overnight} onChange={(e) => setCardDraft({ ...cardDraft, overnight: e.target.checked })} />{T.overnight}</label>
              {cardHasTimeError && <div className="mt-error"><AlertTriangle /> {T.timeError}</div>}
              {showTzHint && <div className="mt-hint">{T.tzNote}</div>}

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
              <input ref={rowFileInputRef} type="file" style={{ display: "none" }} onChange={handleRowFileSelected} />
              <input ref={rowPhotoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleRowFileSelected} />
              {fileUploadMsg && (
                <p className="mt-hint" style={{ color: fileUploadMsg.ok ? "var(--teal)" : "var(--danger)", margin: "0 0 8px" }}>
                  {fileUploadMsg.uploading ? T.fileUploading : fileUploadMsg.ok ? T.fileUploadSuccess : fileUploadMsg.reason === "not-signed-in" ? T.fileUploadNeedsSignIn : T.fileUploadError}
                </p>
              )}
              {(cardDraft.attachments || []).length > 0 && (
                <div className="mt-attachments-dropdown">
                  <button type="button" className="mt-attachments-summary" onClick={() => setAttachmentsExpanded((v) => !v)}>
                    <Paperclip size={14} />
                    <span>{T.attachedFilesCount.replace("{n}", cardDraft.attachments.length)}</span>
                    {attachmentsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {attachmentsExpanded && (
                    <div className="mt-attachments-grid">
                      {cardDraft.attachments.map((att) => (
                        <span key={att.id} className="mt-checklist-doc-icon-wrap">
                          {att.url ? (
                            <a href={att.url} target="_blank" rel="noreferrer" className="mt-checklist-doc-icon" title={att.name}>{att.type === "image" ? <ImagePlus size={14} /> : <FileUp size={14} />}</a>
                          ) : (
                            <span className="mt-checklist-doc-icon" title={att.name}>{att.type === "image" ? <ImagePlus size={14} /> : <FileUp size={14} />}</span>
                          )}
                          <button className="mt-checklist-doc-x" onClick={() => removeRowAttachment(att.id)}><X size={9} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button className="mt-file-demo" onClick={() => openRowUpload("file")}>
                <FileUp size={16} /> <span>{T.uploadFile}</span>
              </button>
              <button className="mt-file-demo" onClick={() => openRowUpload("photo")}>
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
              <button className="mt-btn danger" style={{ padding: "6px 8px" }} title={T.delete} onClick={() => { deleteRow(cardRowId); closeCard(); }}><Trash2 size={13} /></button>
              <button className="mt-btn ghost" onClick={closeCard}>{T.cancel}</button>
              <button className="mt-btn primary" disabled={!cardDraft.date || cardHasTimeError || !!cardFrameIssue} onClick={saveCard}><Check size={13} /> {T.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* frame modal */}
      {fileManagerOpen && (
        <div className="mt-modal-backdrop" onClick={() => setFileManagerOpen(false)}>
          <div className="mt-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header">
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {fileManagerFolder && <button className="mt-btn ghost" style={{ padding: "3px 6px" }} onClick={() => setFileManagerFolder(null)}>{lang === "he" ? <ArrowRight size={15} /> : <ArrowLeft size={15} />}</button>}
                <span className="mt-modal-title">{fileManagerFolder ? FOLDER_LABEL(fileManagerFolder, T) : T.fileManagerTitle}</span>
              </span>
              <button className="mt-btn ghost" onClick={() => { setFileManagerOpen(false); setFileManagerFolder(null); }}><X size={16} /></button>
            </div>
            <div className="mt-modal-body">
              {managedFiles.length === 0 && <p className="mt-hint" style={{ margin: "10px 0" }}>{T.fileManagerEmpty}</p>}
              {managedFiles.length > 0 && (() => {
                const grouped = managedFiles.reduce((acc, f) => { const k = folderKeyFor(f.sourceCat); (acc[k] = acc[k] || []).push(f); return acc; }, {});
                if (!fileManagerFolder) {
                  return Object.entries(grouped)
                    .sort((a, b) => FOLDER_LABEL(a[0], T).localeCompare(FOLDER_LABEL(b[0], T)))
                    .map(([key, files]) => <FileManagerFolderRow key={key} folderKey={key} count={files.length} T={T} onOpen={() => setFileManagerFolder(key)} />);
                }
                const files = (grouped[fileManagerFolder] || []).slice().sort((a, b) => {
                  const dir = fileManagerSort.dir === "asc" ? 1 : -1;
                  if (fileManagerSort.key === "name") return a.name.localeCompare(b.name) * dir;
                  if (fileManagerSort.key === "size") return ((a.size || 0) - (b.size || 0)) * dir;
                  return ((a.uploadedAt || 0) - (b.uploadedAt || 0)) * dir;
                });
                function sortHeader(key, label) {
                  const active = fileManagerSort.key === key;
                  return (
                    <button className={"mt-file-sort-header" + (active ? " active" : "")}
                      onClick={() => setFileManagerSort({ key, dir: active && fileManagerSort.dir === "asc" ? "desc" : "asc" })}>
                      {label}{active && (fileManagerSort.dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </button>
                  );
                }
                return (
                  <>
                    <div className="mt-file-sort-row">
                      <span className="mt-file-sort-header-spacer" />
                      {sortHeader("name", T.fileSortName)}
                      {sortHeader("date", T.fileSortDate)}
                      {sortHeader("size", T.fileSortSize)}
                    </div>
                    {files.map((f) => <FileManagerFileRow key={f.id} file={f} T={T} lang={lang} />)}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {flightManagerOpen && (
        <div className="mt-modal-backdrop" onClick={() => setFlightManagerOpen(false)}>
          <div className="mt-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header"><span className="mt-modal-title">{T.flightManagerTitle}</span><button className="mt-btn ghost" onClick={() => setFlightManagerOpen(false)}><X size={16} /></button></div>
            <div className="mt-modal-body">
              <div className="mt-flight-manager-toolbar">
                <button className="mt-btn primary" onClick={refreshAllFlights} disabled={flightRefreshStatus && flightRefreshStatus.running}>
                  <RefreshCw size={13} /> {flightRefreshStatus && flightRefreshStatus.running ? T.flightRefreshRunning : T.refreshEligibleNow}
                </button>
                {flightRefreshStatus && !flightRefreshStatus.running && (
                  <span className="mt-hint">
                    {T.flightRefreshSummary
                      .replace("{updated}", flightRefreshStatus.updated)
                      .replace("{unchanged}", flightRefreshStatus.unchanged)
                      .replace("{skipped}", flightRefreshStatus.skipped)}
                  </span>
                )}
              </div>
              <p className="mt-hint" style={{ margin: "2px 0 10px" }}>{T.flightManagerCooldownHint.replace("{near}", FLIGHT_REFRESH_NEAR_DAYS)}</p>
              {(() => {
                const now = Date.now();
                const flightRows = rows.filter((r) => isFlightType(r.typeId)).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
                if (!flightRows.length) return <p className="mt-hint">{T.flightManagerEmpty}</p>;
                return flightRows.map((r) => {
                  const hasNumber = r.flightNumber && r.flightNumber.trim();
                  const rowStatus = flightManagerRowStatus[r.id];
                  const nextAt = hasNumber ? nextFetchEligibleAt(r, now) : null;
                  return (
                    <div className="mt-flight-manager-row" key={r.id}>
                      <div className="mt-flight-manager-row-top">
                        <span className="mt-flight-manager-route" dir="auto">
                          {truncateChars(r.fromAlias || r.from, 16) || "—"} → {truncateChars(r.toAlias || r.to, 16) || "—"}
                        </span>
                        <span className="mt-flight-manager-num">{r.flightNumber || T.flightManagerNoNumber}</span>
                      </div>
                      <div className="mt-flight-manager-row-mid">
                        <span>{r.date}</span>
                        <span dir="ltr">{r.startTime || "—:—"} → {r.endTime || "—:—"}</span>
                      </div>
                      {hasNumber && (
                        <div className="mt-flight-manager-row-bottom">
                          <span className="mt-hint">
                            {r.flightLastFetchedAt
                              ? `${T.flightManagerLastSynced}: ${formatRelativeTime(r.flightLastFetchedAt, now, lang)}`
                              : T.flightManagerNeverSynced}
                            {nextAt && ` · ${T.flightManagerNextCheck}: ${formatRelativeTime(nextAt, now, lang)}`}
                          </span>
                          <button className="mt-btn ghost" style={{ padding: "3px 8px" }} disabled={rowStatus === "running" || !!nextAt} onClick={() => refreshOneFlightRow(r.id)}>
                            {rowStatus === "running" ? <RefreshCw size={12} className="mt-spin" /> : <RefreshCw size={12} />}
                            {" "}
                            {rowStatus === "updated" ? T.flightManagerUpdated : rowStatus === "unchanged" ? T.flightManagerUnchanged : rowStatus === "failed" ? T.flightLookupError : nextAt ? T.flightManagerOnCooldown : T.refreshNow}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {hotelManagerOpen && (
        <div className="mt-modal-backdrop" onClick={() => setHotelManagerOpen(false)}>
          <div className="mt-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header"><span className="mt-modal-title">{T.hotelManagerTitle}</span><button className="mt-btn ghost" onClick={() => setHotelManagerOpen(false)}><X size={16} /></button></div>
            <div className="mt-modal-body">
              <p className="mt-hint" style={{ margin: "2px 0 10px" }}>{T.hotelManagerHint}</p>
              {(() => {
                const hotelFrames = frames.filter((f) => effectiveFrameTypeOf(f, rows) === "hotel").sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
                if (!hotelFrames.length) return <p className="mt-hint">{T.hotelManagerEmpty}</p>;
                return hotelFrames.map((f) => {
                  const verified = isHotelFrameVerified(f, rows);
                  const city = hotelCityForFrame(f, rows);
                  const hotelRows = rows.filter((r) => r.frameId === f.id && r.to && r.to.trim());
                  const anchor = hotelRows.find((r) => r.typeId === "checkin") || hotelRows[0];
                  const mapUrl = anchor && (anchor.toVerifiedUrl || (anchor.toLat != null && anchor.toLon != null ? mapsSearchUrl(anchor.toLat, anchor.toLon) : null));
                  return (
                    <div className="mt-flight-manager-row" key={f.id}>
                      <div className="mt-flight-manager-row-top">
                        <span className="mt-flight-manager-route" dir="auto">{truncateFrameName(f.name, 25)}{city ? ` · ${hotelCityLabel(city, lang)}` : ""}</span>
                        <span className={"mt-hotel-verify-badge" + (verified ? " ok" : "")}>{verified ? T.hotelManagerVerified : T.hotelManagerUnverified}</span>
                      </div>
                      <div className="mt-flight-manager-row-mid">
                        <span>{fmtDate(f.startDate, lang)} → {fmtDate(f.endDate, lang)}</span>
                      </div>
                      <div className="mt-flight-manager-row-bottom">
                        <button className="mt-btn ghost" style={{ padding: "3px 8px" }} onClick={() => openHotelLocationPicker(f.id)}>
                          <Search size={12} /> {T.hotelManagerSearchManually}
                        </button>
                        {mapUrl ? (
                          <a className="mt-btn ghost" style={{ padding: "3px 8px" }} href={mapUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                            <MapPin size={12} /> {T.hotelManagerShowOnMap}
                          </a>
                        ) : <span />}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {remindersManagerOpen && (
        <div className="mt-modal-backdrop" onClick={() => setRemindersManagerOpen(false)}>
          <div className="mt-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header"><span className="mt-modal-title">{T.remindersManagerTitle}</span><button className="mt-btn ghost" onClick={() => setRemindersManagerOpen(false)}><X size={16} /></button></div>
            <div className="mt-modal-body">
              <p className="mt-hint" style={{ margin: "2px 0 10px" }}>{T.remindersManagerHint}</p>
              {(() => {
                const instances = buildReminderInstances(rows);
                if (!instances.length) return <p className="mt-hint">{T.remindersManagerEmpty}</p>;
                const groups = [];
                let lastDateKey = null;
                instances.forEach((inst) => {
                  const dateKey = toLocalISODate(inst.fireAt);
                  if (dateKey !== lastDateKey) { groups.push({ dateKey, items: [] }); lastDateKey = dateKey; }
                  groups[groups.length - 1].items.push(inst);
                });
                return groups.map((g) => (
                  <div key={g.dateKey} className="mt-reminders-day-group">
                    <div className="mt-reminders-day-header">{fmtDate(g.dateKey, lang)} · {heDay(g.dateKey, lang)}</div>
                    {g.items.map((inst) => {
                      const override = (inst.row.reminderSettings && inst.row.reminderSettings[inst.ruleId]) || {};
                      const enabled = override.enabled !== false;
                      const hoursBefore = Math.round((-inst.offsetMinutes / 60) * 10) / 10;
                      const hh = String(inst.fireAt.getHours()).padStart(2, "0");
                      const mm = String(inst.fireAt.getMinutes()).padStart(2, "0");
                      const recordLabel = inst.row.toAlias || inst.row.to || typeMeta(inst.row.typeId, types, T, lang).name;
                      return (
                        <div key={inst.rowId + inst.ruleId} className={"mt-reminder-row" + (enabled ? "" : " disabled")}>
                          <span className={"mt-reminder-kind-icon " + inst.kind}>{inst.kind === "alert" ? <BellRing size={14} /> : <Bell size={14} />}</span>
                          <div className="mt-reminder-main">
                            <div className="mt-reminder-label">{lang === "he" ? inst.label_he : inst.label_en}</div>
                            <div className="mt-hint" dir="auto">{recordLabel} · <span dir="ltr">{hh}:{mm}</span></div>
                          </div>
                          <div className="mt-reminder-offset">
                            <input type="number" step="0.5" min="0" className="mt-reminder-offset-input" value={hoursBefore}
                              disabled={!enabled}
                              onChange={(e) => setReminderOverride(inst.rowId, inst.ruleId, { offsetMinutes: -Number(e.target.value) * 60 })} />
                            <span className="mt-hint">{T.hoursBeforeShort}</span>
                          </div>
                          <input type="checkbox" checked={enabled} onChange={(e) => setReminderOverride(inst.rowId, inst.ruleId, { enabled: e.target.checked })} />
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
      {helpCenterOpen && (
        <div className="mt-modal-backdrop" onClick={() => setHelpCenterOpen(false)}>
          <div className="mt-modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header"><span className="mt-modal-title">{T.helpCenterTitle}</span><button className="mt-btn ghost" onClick={() => setHelpCenterOpen(false)}><X size={16} /></button></div>
            <div className="mt-modal-body">
              {Object.entries(HELP_TOPICS).map(([key, topicData]) => {
                const Icon = ICONS[topicData.icon] || HelpCircle;
                return (
                  <div key={key} id={"help-topic-" + key} className={"mt-help-section" + (helpCenterFocusTopic === key ? " focused" : "")}>
                    <div className="mt-help-section-title"><Icon size={16} /> {lang === "he" ? topicData.title_he : topicData.title_en}</div>
                    <p className="mt-help-section-text">{lang === "he" ? topicData.full_he : topicData.full_en}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {checklistOpen && (
        <div className="mt-modal-backdrop" onClick={() => setChecklistOpen(false)}>
          <div className="mt-modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header"><span style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="mt-modal-title">{T.preFlightChecklist}</span><HelpButton topic="checklist" lang={lang} T={T} onOpenFull={openHelpTopic} openTopic={helpPopoverOpen} setOpenTopic={setHelpPopoverOpen} /></span><button className="mt-btn ghost" onClick={() => setChecklistOpen(false)}><X size={16} /></button></div>
            <div className="mt-checklist-progress-wrap">
              <div className="mt-checklist-progress-track"><div className={"mt-checklist-progress-fill" + (checklistProgressPct >= 100 ? " complete" : "")} style={{ width: `${checklistProgressPct}%` }} /></div>
              <span className={"mt-checklist-progress-pct" + (checklistProgressPct >= 100 ? " complete" : "")}>{checklistProgressPct}%</span>
            </div>
            <div className="mt-modal-body">
              <input ref={checklistFileInputRef} type="file" style={{ display: "none" }} onChange={handleChecklistFileSelected} />
              {fileUploadMsg && (
                <p className="mt-hint" style={{ color: fileUploadMsg.ok ? "var(--teal)" : "var(--danger)", margin: "0 0 8px" }}>
                  {fileUploadMsg.uploading ? T.fileUploading : fileUploadMsg.ok ? T.fileUploadSuccess : fileUploadMsg.reason === "not-signed-in" ? T.fileUploadNeedsSignIn : T.fileUploadError}
                </p>
              )}
              <div className="mt-section-label">{T.checklistReservations}</div>
              {checklist.reservations.map((it) => (
                <ChecklistRow key={it.id} item={it} cat="reservations" lang={lang} T={T}
                  onToggle={toggleChecklistItem} onUpload={openChecklistUpload} onRemoveDoc={removeChecklistDoc} onRemove={removeChecklistItem} />
              ))}
              <ChecklistAddRow cat="reservations" T={T} onAdd={addChecklistSubItem} />
              <div className="mt-section-label">{T.checklistDocuments}</div>
              {checklist.documents.map((it) => (
                <ChecklistRow key={it.id} item={it} cat="documents" lang={lang} T={T}
                  onToggle={toggleChecklistItem} onUpload={openChecklistUpload} onRemoveDoc={removeChecklistDoc} onRemove={removeChecklistItem} />
              ))}
              <ChecklistAddRow cat="documents" T={T} onAdd={addChecklistSubItem} />
              <div className="mt-section-label">{T.checklistOther}</div>
              {checklist.checkin.map((it) => (
                <ChecklistRow key={it.id} item={it} cat="checkin" lang={lang} T={T}
                  onToggle={toggleChecklistItem} onUpload={openChecklistUpload} onRemoveDoc={removeChecklistDoc} onRemove={removeChecklistItem} />
              ))}
              {checklist.currency.map((it) => (
                <ChecklistRow key={it.id} item={it} cat="currency" lang={lang} T={T}
                  onToggle={toggleChecklistItem} onUpload={openChecklistUpload} onRemoveDoc={removeChecklistDoc} onRemove={removeChecklistItem} />
              ))}
              {checklist.airport.map((it) => (
                <ChecklistRow key={it.id} item={it} cat="airport" lang={lang} T={T}
                  onToggle={toggleChecklistItem} onUpload={openChecklistUpload} onRemoveDoc={removeChecklistDoc} onRemove={removeChecklistItem} />
              ))}
              <ChecklistAddRow cat="airport" T={T} onAdd={addChecklistSubItem} />
              <div className="divider" style={{ margin: "14px 0" }} />
              <button className="mt-checklist-nav-card" onClick={() => { setChecklistOpen(false); setPackingListOpen(true); }}>
                <span className="mt-checklist-nav-icon"><Briefcase size={16} /></span>
                <span className="mt-checklist-nav-text">
                  <strong>{T.checklistPacking}</strong>
                  <span>{T.checklistPackingSub.replace("{n}", checklist.packing.filter((it) => it.checked).length).replace("{total}", checklist.packing.length)}</span>
                </span>
                <ChevronLeft size={18} />
              </button>
              <button className="mt-checklist-nav-card" onClick={() => { setChecklistOpen(false); setShoppingListOpen(true); }}>
                <span className="mt-checklist-nav-icon"><ShoppingBag size={16} /></span>
                <span className="mt-checklist-nav-text">
                  <strong>{T.checklistShopping}</strong>
                  <span>{T.checklistShoppingSub.replace("{n}", checklist.shopping.length)}</span>
                </span>
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {packingListOpen && (
        <div className="mt-modal-backdrop" onClick={() => setPackingListOpen(false)}>
          <div className="mt-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header">
              <button className="mt-btn ghost" onClick={() => { setPackingListOpen(false); setChecklistOpen(true); }}><ChevronRight size={16} /></button>
              <span className="mt-modal-title">{T.checklistPacking}</span>
              <button className="mt-btn ghost" onClick={() => setPackingListOpen(false)}><X size={16} /></button>
            </div>
            <div className="mt-modal-body">
              {checklist.packing.map((it) => (
                <ChecklistRow key={it.id} item={it} cat="packing" lang={lang} T={T}
                  onToggle={toggleChecklistItem} onUpload={openChecklistUpload} onRemoveDoc={removeChecklistDoc} onRemove={removeChecklistItem} />
              ))}
              <ChecklistAddRow cat="packing" T={T} onAdd={addChecklistSubItem} />
            </div>
          </div>
        </div>
      )}

      {shoppingListOpen && (
        <div className="mt-modal-backdrop" onClick={() => setShoppingListOpen(false)}>
          <div className="mt-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header">
              <button className="mt-btn ghost" onClick={() => { setShoppingListOpen(false); setChecklistOpen(true); }}><ChevronRight size={16} /></button>
              <span className="mt-modal-title">{T.checklistShopping}</span>
              <button className="mt-btn ghost" onClick={() => setShoppingListOpen(false)}><X size={16} /></button>
            </div>
            <div className="mt-modal-body">
              {checklist.shopping.length === 0 && <p className="mt-hint" style={{ margin: "0 0 10px" }}>{T.checklistShoppingEmpty}</p>}
              {checklist.shopping.map((it) => (
                <ChecklistRow key={it.id} item={it} cat="shopping" lang={lang} T={T}
                  onToggle={toggleChecklistItem} onUpload={openChecklistUpload} onRemoveDoc={removeChecklistDoc} onRemove={removeChecklistItem} />
              ))}
              <ChecklistAddRow cat="shopping" T={T} onAdd={addChecklistSubItem} />
            </div>
          </div>
        </div>
      )}

      {deleteFrameConfirmId && (
        <div className="mt-modal-backdrop" onClick={() => setDeleteFrameConfirmId(null)}>
          <div className="mt-modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header"><span className="mt-modal-title">{T.deleteFrameTitle}</span><button className="mt-btn ghost" onClick={() => setDeleteFrameConfirmId(null)}><X size={16} /></button></div>
            <div className="mt-modal-body">
              <p className="mt-hint" style={{ margin: "0 0 12px" }}>{T.deleteFrameHint}</p>
              <button className="mt-btn ghost" style={{ width: "100%", marginBottom: 8 }} onClick={() => { deleteFrameOnly(deleteFrameConfirmId); setDeleteFrameConfirmId(null); }}>{T.deleteFrameOnly}</button>
              <button className="mt-btn" style={{ width: "100%", background: "var(--danger)", color: "#fff", border: "none" }} onClick={() => { deleteFrameWithContent(deleteFrameConfirmId); setDeleteFrameConfirmId(null); }}><Trash2 size={13} /> {T.deleteFrameWithContent}</button>
            </div>
          </div>
        </div>
      )}

      {frameDraft && (
        <div className="mt-modal-backdrop" onClick={closeFrameModal}>
          <div className="mt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-header">
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="mt-modal-title">{frameDraft.id ? T.frameModalEdit : T.frameModalNew}</span>
                <HelpButton topic="frames" lang={lang} T={T} onOpenFull={openHelpTopic} openTopic={helpPopoverOpen} setOpenTopic={setHelpPopoverOpen} />
              </span>
              <button className="mt-btn ghost" onClick={closeFrameModal}><X size={16} /></button>
            </div>
            <div className="mt-modal-body">
              <div className="mt-field">
                <label>{T.frameTypeLabel}</label>
                <div className="mt-wizard-choices">
                  <button className={"mt-wizard-choice" + (frameDraft.frameType === "basic" || !frameDraft.frameType ? " selected" : "")} onClick={() => setFrameDraft({ ...frameDraft, frameType: "basic" })}>{T.frameTypeBasic}</button>
                  <button className={"mt-wizard-choice" + (frameDraft.frameType === "trip" ? " selected" : "")} onClick={() => setFrameDraft({ ...frameDraft, frameType: "trip" })}>{T.frameTypeTrip}</button>
                  <button className={"mt-wizard-choice" + (frameDraft.frameType === "flight" ? " selected" : "")} onClick={() => setFrameDraft({ ...frameDraft, frameType: "flight" })}>{T.frameTypeFlight}</button>
                  <button className={"mt-wizard-choice" + (frameDraft.frameType === "hotel" ? " selected" : "")} onClick={() => setFrameDraft({ ...frameDraft, frameType: "hotel" })}>{T.frameTypeHotel}</button>
                </div>
              </div>
              <div className="mt-field">
                <label>{T.parentFrame}</label>
                <select value={frameDraft.parentFrameId || ""} onChange={(e) => setFrameDraft({ ...frameDraft, parentFrameId: e.target.value || null })}>
                  <option value="">{T.noFrame}</option>
                  {frameOptionsList(frameDraft.id).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div className="mt-field"><label>{T.frameName}</label><input value={frameDraft.name} onChange={(e) => setFrameDraft({ ...frameDraft, name: e.target.value })} /></div>
              <div className="mt-field">
                <label>{T.frameDateRange}</label>
                <DateRangeField startDate={frameDraft.startDate} endDate={frameDraft.endDate} lang={lang} T={T}
                  onChange={(s, e) => setFrameDraft({ ...frameDraft, startDate: s, endDate: e })} />
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
