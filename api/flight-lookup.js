// Vercel Serverless Function — proxies AviationStack so the API key never reaches the browser.
// Setup:
//   1. Create a free account at https://aviationstack.com (Free Plan: 100 requests/month, no card needed)
//   2. In Vercel: Project Settings → Environment Variables → add AVIATIONSTACK_API_KEY = <your key>
//   3. Redeploy. The app calls /api/flight-lookup?flight=LY001&date=2026-07-20
//
// This is called ONLY when the person clicks "Fetch flight data" in the record card —
// never automatically on page load/refresh. See fetchFlightData() in the client code.
//
// NOTE: This mapping follows AviationStack's documented v1/flights response shape
// (data: [{ flight_date, flight_status, departure: {...}, arrival: {...} }]). It's the
// same shape AviationStack has used for years, so this should need little adjustment —
// but if any field comes back empty on your first real test, uncomment the console.log
// below, check the Vercel function logs, and tell Claude the exact shape so it can adjust.

export default async function handler(req, res) {
  const { flight, date } = req.query;

  if (!flight || !flight.trim()) {
    return res.status(400).json({ error: "Missing flight number" });
  }

  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ error: "AVIATIONSTACK_API_KEY is not configured on the server yet." });
  }

  try {
    const params = new URLSearchParams({ access_key: apiKey, flight_iata: flight.trim().toUpperCase() });
    const url = `http://api.aviationstack.com/v1/flights?${params.toString()}`;
    const r = await fetch(url);
    const data = await r.json();

    // Uncomment while testing against a real key, to see the exact shape AviationStack returns:
    // console.log(JSON.stringify(data, null, 2));

    if (!r.ok || data.error) {
      return res.status(200).json({ error: (data.error && (data.error.message || data.error.info)) || "Flight lookup failed." });
    }

    const list = Array.isArray(data.data) ? data.data : [];
    if (!list.length) {
      return res.status(200).json({ error: "No matching flight found." });
    }

    // If a date was supplied, prefer the entry matching it; otherwise take the first (most recent) result.
    const entry = (date && list.find((f) => f.flight_date === date)) || list[0];

    return res.status(200).json(normalize(entry));
  } catch (err) {
    return res.status(200).json({ error: "Could not reach the flight data provider." });
  }
}

function normalize(entry) {
  if (!entry) return { error: "No matching flight found." };
  const dep = entry.departure || {};
  const arr = entry.arrival || {};
  return {
    departureLocation: preciseLocation(dep),
    arrivalLocation: preciseLocation(arr),
    departureAlias: shortAliasWithCode(dep),
    arrivalAlias: shortAliasWithCode(arr),
    departureTime: toHHMM(dep.scheduled || dep.estimated),
    arrivalTime: toHHMM(arr.scheduled || arr.estimated),
    terminal: dep.terminal || "",
    gate: dep.gate || "",
    status: entry.flight_status || "",
  };
}

// The precise, geocodable value for the from/to fields: the full airport name with no code or
// parentheses attached (which can confuse geocoding and route calculation between the two points).
// If the name doesn't mention "airport" at all (AviationStack sometimes returns just a bare place
// name like "Koh Samui" instead of "Samui International Airport"), append it — otherwise geocoding
// can resolve to the whole island/city instead of the actual airport.
function preciseLocation(side) {
  const name = side.airport || "";
  if (!name) return side.iata || "";
  return /airport/i.test(name) ? name : `${name} Airport`;
}

// The short display label for the alias fields: shortened name + IATA code, e.g. "Suvarnabhumi (BKK)".
function shortAliasWithCode(side) {
  const name = side.airport || "";
  const code = side.iata || "";
  const shortName = name.replace(/\s+International Airport$/i, "").replace(/\s+Airport$/i, "").trim() || name;
  if (shortName && code) return `(${code}) ${shortName}`;
  return shortName || code || "";
}

function toHHMM(iso) {
  if (!iso) return "";
  const m = String(iso).match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "";
}
