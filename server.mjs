import express from "express";
import cors from "cors";
import { buildRouteScore, selectBestTrain } from "./route-matcher.js";

const app = express();

app.use(cors());
app.use(express.json());

// सिर्फ इतने कैंडिडेट ट्रेनों के रूट/लाइव-स्टेटस पेज fetch करेंगे
// (ज़्यादा रखने से Render जैसे free hosting पर टाइमआउट होता है)
const MAX_CANDIDATES = 3;

// ==========================================================
// TEXT / NAME HELPERS
// ==========================================================

function cleanText(text = "") {
  return text
    .toLowerCase()
    .replace(/[-_,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTrainName(name = "") {
  return cleanText(name)
    .replace(/\bsf\b/g, "")
    .replace(/\bsuperfast\b/g, "")
    .replace(/\bexpress\b/g, "")
    .replace(/\bexp\b/g, "")
    .replace(/\bintercity\b/g, "")
    .replace(/\bpassenger\b/g, "")
    .replace(/\bmemu\b/g, "")
    .replace(/\bdemu\b/g, "")
    .replace(/\bspecial\b/g, "")
    .trim();
}

function calculateTrainScore(searchName, resultName) {
  const search = normalizeTrainName(searchName);
  const result = normalizeTrainName(resultName);

  if (search === result) return 100;
  if (result.includes(search)) return 80;
  if (search.includes(result)) return 60;
  return 0;
}

// हिंदी → English ट्रेन-नाम (पूरा नाम पहले से पता हो तो)
const trainNameMap = {
  "रानीखेत एक्सप्रेस": "Ranikhet Express",
  "मरुधर एक्सप्रेस": "Marudhar Express",
  "पूजा एक्सप्रेस": "Pooja Express",
  "गोमती एक्सप्रेस": "Gomti Express",
  "अमृतसर एक्सप्रेस": "Amritsar Express",
  "दौलतपुर एक्सप्रेस": "Daulatpur Express",
  "प्रयागराज एक्सप्रेस": "Prayagraj Express",
  "शताब्दी एक्सप्रेस": "Shatabdi Express",
  "राजधानी एक्सप्रेस": "Rajdhani Express",
  "जन शताब्दी एक्सप्रेस": "Jan Shatabdi Express"
};

// शब्द-दर-शब्द ट्रांसलिटरेशन (train नाम + station नाम दोनों के लिए,
// पहले तीन अलग-अलग डिक्शनरी थीं — अब एक ही जगह)
const wordMap = {
  "प्रयागराज": "Prayagraj",
  "मरुधर": "Marudhar",
  "पूजा": "Pooja",
  "गोमती": "Gomti",
  "अमृतसर": "Amritsar",
  "दौलतपुर": "Daulatpur",
  "रानीखेत": "Ranikhet",
  "शताब्दी": "Shatabdi",
  "राजधानी": "Rajdhani",
  "जन शताब्दी": "Jan Shatabdi",
  "आगरा फोर्ट": "Agra Fort",
  "इंटरसिटी": "Intercity",
  "संगम": "Sangam",
  "गंगा गोमती": "Ganga Gomti",
  "कानपुर": "Kanpur",
  "अलवर": "Alwar",
  "अजमेर": "Ajmer",
  "जयपुर": "Jaipur",
  "दिल्ली": "Delhi",
  "जोधपुर": "Jodhpur",
  "वाराणसी": "Varanasi",
  "लखनऊ": "Lucknow",
  "आगरा": "Agra"
};

function transliterate(text = "") {
  let result = text;
  for (const key in wordMap) {
    if (result.includes(key)) {
      result = result.split(key).join(wordMap[key]);
    }
  }
  return result;
}

function normalizeTrainQuery(trainName = "") {
  let name = trainNameMap[trainName] || transliterate(trainName);

  const lower = name.toLowerCase();
  const hasType = [
    "express", "intercity", "inter city", "superfast",
    "super fast", "sf", "passenger", "vande bharat",
    "humsafar", "duronto", "shatabdi", "rajdhani"
  ].some(k => lower.includes(k));

  if (!hasType) name = name.trim() + " Express";

  return name.trim();
}

// ==========================================================
// STEP 1 — TRAIN NAME SEARCH (सिर्फ टॉप candidates आगे भेजें)
// ==========================================================

async function findTrainByName(trainName) {
  if (!trainName) return [];

  const normalized = normalizeTrainQuery(trainName);
  const words = normalized.split(/\s+/).filter(w => w.length > 2);
  const q = encodeURIComponent(words.join(" "));
  const url = `https://search.railyatri.in/mobile/trainsearch?q=${q}&slip_type=1`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const candidates = (Array.isArray(data) ? data : []).map(item => ({
      number: item[0],
      name: item[1] || "",
      searchScore: calculateTrainScore(normalized, item[1] || ""),
      route: [],
      liveData: null
    }));

    candidates.sort((a, b) => b.searchScore - a.searchScore);

    // पेज fetch करने से पहले ही लिस्ट छोटी कर दें
    return candidates.slice(0, MAX_CANDIDATES);

  } catch (error) {
    console.log("TRAIN SEARCH ERROR:", error.message);
    return [];
  }
}

// ==========================================================
// LIVE STATUS HTML PARSER
// ==========================================================

function extractLiveStatus(html) {
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);

  if (nextDataMatch) {
    try {
      const json = JSON.parse(nextDataMatch[1]);
      const lts = json?.props?.pageProps?.ltsData;

      if (lts && !Array.isArray(lts)) {
        return {
          liveStatus: lts.delay > 0
            ? `⏱️ ट्रेन लगभग ${lts.delay} मिनट देरी से चल रही है`
            : "✅ ट्रेन समय पर चल रही है",
          delayMinutes: lts.delay || 0,
          currentLocation: lts.current_station_name || lts.source_stn_name || "",
          nextStation: lts.next_station_name || "",
          platformNumber: lts.platform_number || "",
          statusAsOf: lts.status_as_of || lts.title || "",
          distanceInfo: lts.distance_info || "",
          ltsData: lts
        };
      }
    } catch (err) {
      console.log("NEXT_DATA PARSE ERROR:", err.message);
    }
  }

  return {
    liveStatus: "📡 लाइव स्थिति फिलहाल उपलब्ध नहीं है",
    delayMinutes: 0,
    currentLocation: "",
    nextStation: "",
    ltsData: null
  };
}

function findStationETA(lts, stationName) {
  if (!lts || !stationName) return null;

  const search = (wordMap[stationName.trim()] || stationName).toLowerCase().trim();
  const lists = [lts.upcoming_stations || [], lts.previous_stations || []];

  for (const list of lists) {
    for (const station of list) {
      const name = (station.station_name || "").toLowerCase().trim();
      if (name.includes(search)) {
        return {
          stationName: station.station_name,
          eta: station.eta || "",
          etd: station.etd || "",
          arrivalDelay: station.arrival_delay || 0,
          departureDelay: station.departure_delay || 0,
          platformNumber: station.platform_number || ""
        };
      }
    }
  }
  return null;
}

// ==========================================================
// STEP 2 — हर candidate का पेज EK BAAR fetch करें
// (route + live status दोनों इसी एक HTML से निकलेंगे,
//  पहले जैसे दो/तीन बार अलग-अलग fetch नहीं होगा)
// ==========================================================

async function fetchTrainPage(train) {
  try {
    const url = `https://www.railyatri.in/live-train-status/${train.number}`;
    const response = await fetch(url);
    const html = await response.text();

    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
    train.route = match
      ? (JSON.parse(match[1])?.props?.pageProps?.timeTableData?.[0]?.route || [])
      : [];

    train.liveData = extractLiveStatus(html);

  } catch (err) {
    console.log("PAGE FETCH ERROR:", train.number, err.message);
    train.route = [];
    train.liveData = null;
  }

  return train;
}

// ==========================================================
// STEP 3 — SMART TRAIN FINDER
// ==========================================================

async function smartTrainFinder(destination, station, trainName) {
  const candidates = await findTrainByName(trainName);
  if (candidates.length === 0) return null;

  // सभी candidates के पेज एक साथ (parallel) fetch करें — sequential नहीं
  await Promise.all(candidates.map(fetchTrainPage));

  for (const train of candidates) {
    const result = buildRouteScore(train.route, destination, station);
    train.routeScore = result.score;
    train.finalScore = (train.searchScore || 0) + (train.routeScore || 0);
  }

  candidates.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

  return selectBestTrain(candidates);
}

// ==========================================================
// TIME FORMAT
// ==========================================================

function formatRailTime(value) {
  if (!value) return "";
  if (typeof value === "string" && value.includes(":")) return value;
  const num = parseInt(value);
  if (isNaN(num)) return "";
  const hours = Math.floor(num / 60);
  const mins = num % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// ==========================================================
// MAIN ROUTE — फ्रंटएंड पहले ही तीनों जानकारी (destination,
// train, station) फिक्स्ड-टेम्पलेट से साफ़ करके भेजता है,
// इसलिए यहां दोबारा natural-language parsing की ज़रूरत नहीं
// ==========================================================

app.post("/rail-query", async (req, res) => {
  try {
    const destinationText = (req.body.destination || "").trim();
    const trainText = (req.body.train || "").trim();
    const stationText = (req.body.station || "").trim();

    console.log("QUERY:", { destinationText, trainText, stationText });

    if (!trainText || !stationText || !destinationText) {
      return res.json({
        success: false,
        message: "कृपया गंतव्य, ट्रेन का नाम और स्टेशन तीनों बताइए।"
      });
    }

    const bestTrain = await smartTrainFinder(destinationText, stationText, trainText);

    if (!bestTrain) {
      return res.json({ success: false, message: "❌ ट्रेन पहचान में नहीं आई" });
    }

    // यह पेज smartTrainFinder में पहले ही fetch हो चुका है — दोबारा नहीं मंगाएंगे
    const liveData = bestTrain.liveData || {};
    const stationETA = findStationETA(liveData.ltsData, stationText);

    res.json({
      success: true,
      train: {
        number: bestTrain.number,
        hindi: trainText,
        english: bestTrain.name
      },
      station: {
        name: stationText,
        code: "",
        arrival: "",
        departure: ""
      },
      liveStatus: liveData.liveStatus || "📡 लाइव स्थिति उपलब्ध नहीं है",
      delayMinutes: liveData.delayMinutes || 0,
      currentLocation: liveData.currentLocation || "",
      nextStation: liveData.nextStation || "",
      platformNumber: liveData.platformNumber || "",
      statusAsOf: liveData.statusAsOf || "",
      distanceInfo: liveData.distanceInfo || "",
      eta: stationETA ? formatRailTime(stationETA.eta) : "",
      etd: stationETA ? formatRailTime(stationETA.etd) : "",
      arrivalDelay: stationETA?.arrivalDelay || 0,
      departureDelay: stationETA?.departureDelay || 0,
      stationPlatform: stationETA?.platformNumber || "",
      sourceUrl: `https://www.railyatri.in/live-train-status/${bestTrain.number}`
    });

  } catch (error) {
    console.log("RAIL QUERY ERROR:", error.message);
    res.json({
      success: false,
      message: "❌ Query process में error",
      error: error.message
    });
  }
});

// ==========================================================
// EXTRA FEATURES
// ==========================================================

app.get("/open-pnr", (req, res) => {
  res.redirect("https://www.railyatri.in/pnr-status");
});

app.get("/open-ticket", (req, res) => {
  res.redirect("https://www.irctc.co.in");
});

app.get("/open-timetable", (req, res) => {
  res.redirect("https://enquiry.indianrail.gov.in/mntes/");
});

// डिबगिंग के लिए — किसी भी नाम से सर्च टेस्ट करें
app.get("/test-search/:name", async (req, res) => {
  try {
    const result = await findTrainByName(req.params.name);
    res.json(result);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ROOT
app.get("/", (req, res) => {
  res.send("RailSafar Backend Running");
});

// ==========================================================
// START SERVER
// ==========================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`RailSafar backend running on ${PORT}`);
});
