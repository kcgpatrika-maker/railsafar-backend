import express from "express";
import cors from "cors";
import { parseRailQuery } from "./rail-parser.mjs";
const app = express();

app.use(cors());

app.use(express.json());

// LIVE STATUS PARSER

function extractLiveStatus(html){
  const nextDataMatch = html.match(
  /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s
);

if(nextDataMatch){

  try{

    const json = JSON.parse(
      nextDataMatch[1]
    );

    const lts =
  json?.props?.pageProps?.ltsData;

    console.log(
  "PAGE PROPS KEYS:",
  Object.keys(
    json?.props?.pageProps || {}
  )
);
  console.log(
  "LTS EXISTS:",
  !!lts
);

if(
  lts &&
  !Array.isArray(lts)
){

  console.log(
    "LTS DATA:",
    JSON.stringify(lts, null, 2)
  );

  console.log(
    "LTS KEYS:",
    Object.keys(lts)
  );

  console.log(
    "STATIONS COUNT:",
    lts?.all_stations?.length
  );

  console.log(
  "UPCOMING COUNT:",
  lts?.upcoming_stations?.length
);

console.log(
  "FIRST UPCOMING:",
  JSON.stringify(
    lts?.upcoming_stations?.[0],
    null,
    2
  )
);

console.log(
  "LAST PREVIOUS:",
  JSON.stringify(
    lts?.previous_stations?.[
      lts?.previous_stations?.length - 1
    ],
    null,
    2
  )
);

  return {
    liveStatus:
      lts.delay > 0
      ? `⏱️ ट्रेन लगभग ${lts.delay} मिनट देरी से चल रही है`
      : "✅ ट्रेन समय पर चल रही है",

    delayMinutes:
      lts.delay || 0,
  currentLocation:
    lts.current_station_name || "",

  nextStation:
    lts.upcoming_stations?.[0]?.station_name || "",

  platformNumber:
    lts.platform_number || "",

  statusAsOf:
    lts.status_as_of || "",

  distanceInfo:
    lts.upcoming_stations?.[0]
      ?.distance_from_current_station_txt || ""

};

    }

  }catch(err){

    console.log(
      "NEXT JSON ERROR:",
      err.message
    );

  }

}

  console.log(
    "HTML LENGTH:",
    html.length
  );

  // LOWERCASE

  const lower =
    html.toLowerCase();

  // =========================
  // ON TIME
  // =========================

  if(

    lower.includes("right time") ||

    lower.includes("on time") ||

    lower.includes("ontime")

  ){

    return {

      liveStatus:
        "✅ ट्रेन समय पर चल रही है",

      delayMinutes:0
    };
  }

  // =========================
  // CANCELLED
  // =========================

  if(
    lower.includes("cancelled")
  ){

    return {

      liveStatus:
        "❌ ट्रेन रद्द दिखाई दे रही है",

      delayMinutes:0
    };
  }

  // =========================
  // RESCHEDULED
  // =========================

  if(
    lower.includes("rescheduled")
  ){

    return {

      liveStatus:
        "🚨 ट्रेन पुनर्निर्धारित दिखाई दे रही है",

      delayMinutes:120
    };
  }

  // =========================
  // DELAY PATTERNS
  // =========================

  const patterns = [

    /(\d+)\s*min\s*late/gi,

    /late\s*by\s*(\d+)\s*min/gi,

    /delayed\s*by\s*(\d+)\s*min/gi,

    /(\d+)\s*minutes\s*late/gi

  ];

  let maxDelay = 0;

  for(const pattern of patterns){

    const matches =
      [...html.matchAll(pattern)];

    for(const match of matches){

      const mins =

        parseInt(match[1]);

      if(mins > maxDelay){

        maxDelay = mins;
      }
    }
  }

  // DELAY FOUND

  if(maxDelay > 0){

    return {

      liveStatus:
        `⏱️ ट्रेन लगभग ${maxDelay} मिनट देरी से चल रही है`,

      delayMinutes:
        maxDelay
    };
  }

  // =========================
// CURRENT LOCATION
// =========================

let currentLocation =
  "स्थिति उपलब्ध नहीं";

let nextStation =
  "अगला स्टेशन उपलब्ध नहीं";

// CURRENTLY AT

const currentMatch = html.match(

  /Currently\s+at\s+([A-Za-z\s]+)/i
);

if(currentMatch){

  currentLocation =

    currentMatch[1].trim();
}

// NEXT STOP

const nextMatch = html.match(

  /Next\s+Stop\s+([A-Za-z\s]+)/i
);

if(nextMatch){

  nextStation =

    nextMatch[1].trim();
}

  // =========================
  // UNKNOWN
  // =========================

  return {

  liveStatus:
    "📡 लाइव स्थिति फिलहाल उपलब्ध नहीं है",

  delayMinutes:0,

  currentLocation,

  nextStation
};
}

function findStationETA(lts, stationName){

if(
  !lts ||
  !stationName
){
  return null;
}

const hindiToEnglish = {

  "अजमेर":"ajmer",
  "जयपुर":"jaipur",
  "दिल्ली":"delhi",
  "जोधपुर":"jodhpur",
  "वाराणसी":"varanasi",
  "लखनऊ":"lucknow",
  "आगरा":"agra",
  "अलवर":"alwar"

};

const search =
(
  hindiToEnglish[
    stationName.trim()
  ] ||
  stationName
)
.toLowerCase()
.trim();

// पहले upcoming_stations में खोजो

const upcoming =
  lts.upcoming_stations || [];

for(
  const station
  of upcoming
){

  const name =
    (station.station_name || "")
      .toLowerCase()
      .trim();

  if(
    name.includes(search)
  ){

    return {

      stationName:
        station.station_name,

      eta:
        station.eta || "",

      etd:
        station.etd || "",

      arrivalDelay:
        station.arrival_delay || 0,

      departureDelay:
        station.departure_delay || 0,

      platformNumber:
        station.platform_number || ""

    };
  }
}

// फिर previous_stations में खोजो

const previous =
  lts.previous_stations || [];

for(
  const station
  of previous
){

  const name =
    (station.station_name || "")
      .toLowerCase()
      .trim();

  if(
    name.includes(search)
  ){

    return {

      stationName:
        station.station_name,

      eta:
        station.eta || "",

      etd:
        station.etd || "",

      arrivalDelay:
        station.arrival_delay || 0,

      departureDelay:
        station.departure_delay || 0,

      platformNumber:
        station.platform_number || ""

    };
  }
}

return null;

}

// =============================
// FIND TRAIN BY NAME (UPDATED)
// =============================
async function findTrainByName(trainName) {
  console.log("TRAIN NAME INPUT:", trainName);

  try {
    if (!trainName) return null;

    // हिंदी → English mapping (common trains)
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

    // Auto-transliteration fallback
    function transliterateHindiToEnglish(text){
      const map = {
        "प्रयागराज":"Prayagraj",
        "मरुधर":"Marudhar",
        "पूजा":"Pooja",
        "गोमती":"Gomti",
        "अमृतसर":"Amritsar",
        "दौलतपुर":"Daulatpur",
        "रानीखेत":"Ranikhet",
        "शताब्दी":"Shatabdi",
        "राजधानी":"Rajdhani",
        "जन शताब्दी":"Jan Shatabdi"
      };
      for(const key in map){
        if(text.includes(key)){
          return text.replace(key, map[key]);
        }
      }
      return text;
    }

    trainName = trainNameMap[trainName] || trainName;
    trainName = transliterateHindiToEnglish(trainName);

    const lowerName = trainName.toLowerCase();

    if (
    !lowerName.includes("express") &&
    !lowerName.includes("intercity") &&
    !lowerName.includes("superfast") &&
    !lowerName.includes("sf")
   ) {
    trainName = trainName.trim() + " Express";
  }

    console.log("NORMALIZED TRAIN:", trainName);

    const q = encodeURIComponent(trainName.split(" ")[0]);
    const url = `https://search.railyatri.in/mobile/trainsearch?q=${q}&slip_type=1`;

    const response = await fetch(url);
    const data = await response.json();

    console.log("SEARCH RESULTS:", JSON.stringify(data.slice(0, 10), null, 2));

    const searchText = trainName.split(" ")[0].toLowerCase();
    for (const item of data) {
      const trainNumber = item[0];
      const trainNameFound = item[1];
      if (!trainNameFound) continue;

      if (trainNameFound.toLowerCase().includes(searchText)) {
        console.log("MATCH FOUND:", trainNumber, trainNameFound);
        return { number: trainNumber, name: trainNameFound };
      }
    }

    console.log("NO TRAIN MATCH FOUND");
    return null;

  } catch (error) {
    console.log("TRAIN SEARCH ERROR:", error.message);
    return null;
  }
}

// =============================
// CONFIRM TRAIN QUERY (FIXED)
// =============================
async function confirmTrainQuery(queryText, res) {
  console.log("QUERY RECEIVED:", queryText);

  try {
    if (!queryText) return res.json({ success:false, message:"Empty query" });

    // Step 1: Parse query (English line से ट्रेन/स्टेशन निकालना)
    const parsed = parseRailQuery(queryText);
    console.log("PARSED QUERY:", parsed);

    if (!parsed.isValid) {
      return res.json({ success:false, message:"❌ Query समझ में नहीं आई", parsed });
    }

    const trainName = parsed.trainText;
    const stationName = parsed.stationText;
    const destinationName = parsed.destinationText;

    console.log("TRAIN:", trainName);
    console.log("STATION:", stationName);
    console.log("DESTINATION:", destinationName);

    // Step 3: Train search
    const trainResult = await findTrainByName(trainName);
    if (!trainResult) {
      return res.json({ success:false, message:"❌ ट्रेन नहीं मिली: " + trainName });
    }

    console.log("MATCH FOUND:", trainResult);

    // Step 4: API call for live status
    const statusUrl = `https://api.railyatri.in/v1/train/${trainResult.number}/status?station=${encodeURIComponent(stationName)}&dest=${encodeURIComponent(destinationName)}`;
    console.log("STATUS URL:", statusUrl);

    const response = await fetch(statusUrl);
    const data = await response.json();

    console.log("LIVE STATUS:", data);

    // Step 5: Result
    if (data && data.arrival_time) {
      const message = `📡 ${trainResult.name} ${stationName} स्टेशन पर ${data.arrival_time} बजे आएगी।`;
      return res.json({ success:true, message });
    } else {
      return res.json({ success:false, message:"❌ ट्रेन का समय नहीं मिला" });
    }

  } catch (error) {
    console.log("CONFIRM QUERY ERROR:", error.message);
    return res.json({ success:false, message:"❌ Query process में error" });
  }
}

// EXTRA FEATURES ROUTES

app.get("/open-pnr", (req, res) => {

  res.redirect(
    "https://www.railyatri.in/pnr-status"
  );
});

app.get("/open-ticket", (req, res) => {

  res.redirect(
    "https://www.irctc.co.in"
  );
});

app.get("/open-timetable", (req, res) => {

  res.redirect(
    "https://enquiry.indianrail.gov.in/mntes/"
  );
});

app.get("/test-marudhar", async (req,res)=>{

  const response = await fetch(
    "https://search.railyatri.in/mobile/trainsearch?q=marudhar&slip_type=1"
  );

  const data = await response.json();

  res.json(data);

});
app.get("/test-route", async (req,res)=>{

  try{

    const response = await fetch(
      "https://www.railyatri.in/routes/jp-jaipur-to-asr-amritsar-jn"
    );

    const html = await response.text();

    res.send(html.slice(0,15000));

  }catch(err){

    res.send(err.message);

  }

});

app.get("/test-search", async (req, res) => {

const result =
await findTrainByName(
  "Ranikhet Express"
);
res.json(result);

});
app.get("/test-train/:name", async (req,res)=>{

  try{

    const q =
      encodeURIComponent(
        req.params.name
      );

    const url =
      `https://search.railyatri.in/mobile/trainsearch?q=${q}&slip_type=1`;

    const response =
      await fetch(url);

    const data =
      await response.json();

    res.json(data);

  }catch(err){

    res.json({
      error: err.message
    });

  }

});
// ROOT

app.get("/", (req, res) => {

  res.send(
    "RailSafar Backend Running"
  );
});
app.get("/test-search", async (req,res)=>{

  try{

    const response = await fetch(
      "https://search.railyatri.in/mobile/trainsearch?q=mar&slip_type=1"
    );

    const data = await response.json();

    res.json(data.slice(0,20));

  }catch(err){

    res.json({
      error: err.message
    });

  }

});
// =============================
// MAIN ROUTE (continued)
// =============================
app.post("/rail-query", async (req, res) => {
  try {
    const query = req.body;

console.log(
  "BODY RECEIVED:",
  JSON.stringify(query, null, 2)
);
    const destinationText =
  req.body.destination || "";

const trainText =
  req.body.train || "";

const stationText =
  req.body.station || "";

console.log(
  "DESTINATION:",
  destinationText
);

console.log(
  "TRAIN:",
  trainText
);

console.log(
  "STATION:",
  stationText
);

const testTrain =
  await findTrainByName(
    trainText
  );

console.log(
  "TRAIN RESULT:",
  testTrain
);

const parsedQuery = {

  trainText,

  stationText,

  destinationText,

  isValid:true

};
    console.log("PARSED QUERY:", JSON.stringify(parsedQuery, null, 2));

    if (!parsedQuery.isValid) {
      return res.json({
        success: false,
        validation: true,
        message: "कृपया ट्रेन का नाम, गंतव्य स्टेशन, स्टेशन का नाम और आगमन/प्रस्थान बताइए।",
        parsedQuery
      });
    }

    console.log("QUERY:", query);
    console.log("TRAIN FROM PARSER:", parsedQuery.trainText);

    const searchedTrain = await findTrainByName(parsedQuery.trainText);
    if (!searchedTrain) {
      return res.json({ success: false, message: "Train not found" });
    }

    const matchedTrain = {
      number: searchedTrain.number,
      hindi: parsedQuery.trainText,
      english: searchedTrain.name,
      aliases: [],
      stations: [
        {
          name: parsedQuery.stationText,
          code: "",
          arrival: "",
          departure: ""
        }
      ]
    };

    console.log("LIVE SEARCH TRAIN:", matchedTrain);

console.log("STEP-1");

let matchedStation = matchedTrain.stations[0];

console.log("STEP-2");

for (const station of matchedTrain.stations) {

  if (
    station.name &&
    JSON.stringify(query).includes(station.name)
  ) {

    matchedStation = station;
    break;

  }

}

console.log("STEP-3");
    
    // Default values
    let liveStatus = "📡 लाइव जानकारी उपलब्ध नहीं है";
    let delayMinutes = 0;
    let currentLocation = "";
    let nextStation = "";
    let platformNumber = "";
    let statusAsOf = "";
    let distanceInfo = "";
    let stationETA = null;
    let eta = "";
    let etd = "";
    let arrivalDelay = 0;
    let departureDelay = 0;
    let stationPlatform = "";

    const sourceUrl = `https://www.railyatri.in/live-train-status/${matchedTrain.number}`;
    console.log("TRAIN NUMBER:", matchedTrain.number);
    console.log("SOURCE URL:", sourceUrl);

    try {
      const response = await fetch(sourceUrl);
      const html = await response.text();

      console.log("HTML LENGTH:", html.length);
      console.log("__NEXT_DATA__:", html.includes("__NEXT_DATA__"));

      const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
      if (nextDataMatch) {
        try {
          const json = JSON.parse(nextDataMatch[1]);
          const lts = json?.props?.pageProps?.ltsData;
          const routeStations = json?.props?.pageProps?.timeTableData?.[0]?.route || [];

          stationETA = findStationETA(lts, parsedQuery.stationText);

          if (!stationETA && routeStations.length > 0) {
            const search = (parsedQuery.stationText || "").toLowerCase();
            for (const station of routeStations) {
              const stationName = (station.station_name || "").toLowerCase();
              if (stationName.includes(search)) {
                stationETA = {
                  stationName: station.station_name,
                  eta: station.eta || station.sta || "",
                  etd: station.etd || station.std || "",
                  arrivalDelay: station.arrival_delay || 0,
                  departureDelay: station.departure_delay || 0,
                  platformNumber: station.platform_number || ""
                };
                break;
              }
            }
          }
        } catch (err) {
          console.log("ETA ERROR:", err.message);
        }
      }

      const parsed = extractLiveStatus(html);
      console.log("PARSED DATA:", JSON.stringify(parsed, null, 2));

      liveStatus = parsed.liveStatus;
      delayMinutes = parsed.delayMinutes;
      currentLocation = parsed.currentLocation || "";
      nextStation = parsed.nextStation || "";
      platformNumber = parsed.platformNumber || "";
      statusAsOf = parsed.statusAsOf || "";
      distanceInfo = parsed.distanceInfo || "";

      function formatRailTime(value) {
        if (!value) return "";
        if (typeof value === "string" && value.includes(":")) return value;
        const num = parseInt(value);
        if (isNaN(num)) return "";
        const hours = Math.floor(num / 60);
        const mins = num % 60;
        return `${String(hours).padStart(2,"0")}:${String(mins).padStart(2,"0")}`;
      }

      if (stationETA) {
        eta = formatRailTime(stationETA.eta);
        etd = formatRailTime(stationETA.etd);
        arrivalDelay = stationETA.arrivalDelay || 0;
        departureDelay = stationETA.departureDelay || 0;
        stationPlatform = stationETA.platformNumber || "";
      }

    } catch (error) {
      console.log("LIVE ERROR:", error.message);
    }

    console.log("FINAL RESPONSE:", JSON.stringify({
      train: matchedTrain.hindi,
      station: matchedStation.name,
      liveStatus,
      delayMinutes,
      currentLocation,
      nextStation,
      eta,
      etd,
      stationPlatform
    }, null, 2));

    // RESPONSE
    res.json({
      success: true,
      train: {
        number: matchedTrain.number,
        hindi: matchedTrain.hindi,
        english: matchedTrain.english
      },
      station: {
        name: matchedStation.name,
        code: matchedStation.code,
        arrival: matchedStation.arrival,
        departure: matchedStation.departure
      },
      liveStatus,
      delayMinutes,
      currentLocation,
      nextStation,
      platformNumber,
      statusAsOf,
      distanceInfo,
      eta,
      etd,
      arrivalDelay,
      departureDelay,
      stationPlatform,
      sourceUrl
    });

  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// =============================
// START SERVER
// =============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`RailSafar backend running on ${PORT}`);
});

