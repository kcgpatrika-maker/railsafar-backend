import express from "express";
import cors from "cors";
import { parseRailQuery } from "./rail-parser.mjs";
const app = express();

app.use(cors());

app.use(express.json());

// TRAIN DATABASE

const trains = [

  {

    number:"14864",

    hindi:"मरुधर एक्सप्रेस",

    english:"Marudhar Express",

    aliases:[
      "मरुधर",
      "मरुधर ट्रेन"
    ],

    stations:[

      {
        name:"जयपुर",
        code:"JP",
        arrival:"01:35 AM",
        departure:"01:45 AM"
      },

      {
        name:"अजमेर",
        code:"AII",
        arrival:"11:20 PM",
        departure:"11:30 PM"
      }

    ]
  },

  {

    number:"12413",

    hindi:"पूजा एक्सप्रेस",

    english:"Pooja Express",

    aliases:[
      "पूजा",
      "पूजा एक्सप्रेस"
    ],

    stations:[

      {
        name:"जयपुर",
        code:"JP",
        arrival:"04:00 PM",
        departure:"04:10 PM"
      }

    ]
  }

];

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

async function findTrainByName(trainName) {

console.log(
"TRAIN NAME INPUT:",
trainName
);

try {

if (!trainName) {
  return null;
}

const trainNameMap = {

  "रानीखेत एक्सप्रेस":
    "Ranikhet Express",

  "मरुधर एक्सप्रेस":
    "Marudhar Express",

  "पूजा एक्सप्रेस":
    "Pooja Express",

  "गोमती एक्सप्रेस":
    "Gomti Express"

};
trainName =
  trainNameMap[trainName] || trainName;

console.log(
  "NORMALIZED TRAIN:",
  trainName
);

// अब पूरे नाम से search

const q =
  encodeURIComponent(
    trainName
  );

const url =
  `https://search.railyatri.in/mobile/trainsearch?q=${q}&slip_type=1`;

console.log(
  "TRAIN SEARCH:",
  url
);

const response =
  await fetch(url);

const data =
  await response.json();

console.log(
  "SEARCH RESULTS:",
  JSON.stringify(
    data.slice(0, 20),
    null,
    2
  )
);

const searchText =
  trainName.toLowerCase();

for (const item of data) {

  const trainNumber =
    item[0];

  const trainNameFound =
    item[1];

  if (
    trainNameFound &&
    trainNameFound
      .toLowerCase()
      .includes(searchText)
  ) {

    console.log(
      "MATCH FOUND:",
      trainNumber,
      trainNameFound
    );

    return {

      number:
        trainNumber,

      name:
        trainNameFound

    };
  }
}

console.log(
"NO TRAIN MATCH FOUND"
);

return null;

} catch (error) {

console.log(
"TRAIN SEARCH ERROR:",
error.message
);
return null;
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

app.get("/test-search", async (req, res) => {

const result =
await findTrainByName(
  "Ranikhet Express"
);
res.json(result);

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
// MAIN ROUTE

app.post("/rail-query", async (req, res) => {

  try{

    const query =
  req.body.query || "";

const parsedQuery =
  parseRailQuery(query);

console.log(
  "PARSED QUERY:",
  JSON.stringify(parsedQuery, null, 2)
);

if(!parsedQuery.isValid){

  return res.json({

    success:false,

    validation:true,

    message:
      "कृपया ट्रेन का नाम, गंतव्य स्टेशन, स्टेशन का नाम और आगमन/प्रस्थान बताइए।",

    parsedQuery

  });
}

console.log(
  "QUERY:",
  query
);

// TRAIN FIND

let matchedTrain = null;

console.log(
  "TRAIN FROM PARSER:",
  parsedQuery.trainText
);

for(const train of trains){

  if(
    query.includes(train.hindi)
  ){

    matchedTrain = train;
        break;
      }

      if(
        query.includes(train.english)
      ){

        matchedTrain = train;

        break;
      }

      for(const alias of train.aliases){

        if(
          query.includes(alias)
        ){

          matchedTrain = train;

          break;
        }
      }

      if(matchedTrain) break;
    }

    // TRAIN NOT FOUND

if(!matchedTrain){

  console.log(
    "LOCAL TRAIN NOT FOUND"
  );

  const searchedTrain =
    await findTrainByName(
      parsedQuery.trainText
    );

  if(!searchedTrain){

    return res.json({

      success:false,

      message:
        "Train not found"

    });
  }

  matchedTrain = {

    number:
      searchedTrain.number,

    hindi:
      parsedQuery.trainText,

    english:
      searchedTrain.name,

    aliases:[],

    stations:[

      {

        name:
          parsedQuery.stationText,

        code:"",

        arrival:"",

        departure:""

      }

    ]
  };

  console.log(
    "SEARCH TRAIN FOUND:",
    matchedTrain
  );
}

    // STATION FIND

    let matchedStation =
      matchedTrain.stations[0];

    for(const station of matchedTrain.stations){

      if(
        query.includes(station.name)
      ){

        matchedStation =
          station;

        break;
      }
    }

    // LIVE FETCH

let liveStatus =
  "📡 लाइव जानकारी उपलब्ध नहीं है";

let delayMinutes = 0;

// NEW
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

const sourceUrl =

  `https://www.railyatri.in/live-train-status/${matchedTrain.number}`;
    try{

      console.log(
        "FETCH:",
        sourceUrl
      );

      const response =
        await fetch(sourceUrl);

      const html =
        await response.text();
      console.log(
  html.includes("Next Stop")
);

console.log(
  html.includes("Currently")
);

console.log(
  html.includes("__NEXT_DATA__")
);
      const nextDataMatch = html.match(
  /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s
);

if(nextDataMatch){

  console.log(
    "NEXT_DATA FOUND"
  );

  console.log(
    nextDataMatch[1].slice(0,3000)
  );

}else{

  console.log(
    "NEXT_DATA NOT FOUND"
  );

}


const nextDataMatch2 = html.match(
  /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s
);

if(nextDataMatch2){

  try{

  const json = JSON.parse(
  nextDataMatch2[1]
);
console.log(
  "PAGE PROPS KEYS:",
  Object.keys(
    json?.props?.pageProps || {}
  )
);

console.log(
  "HAS LTS:",
  !!json?.props?.pageProps?.ltsData
);

console.log(
  "HAS TIMETABLE:",
  !!json?.props?.pageProps?.timeTableData
);
const lts =
  json?.props?.pageProps?.ltsData;

const routeStations =
  json?.props?.pageProps
    ?.timeTableData?.[0]
    ?.route || [];

stationETA =
  findStationETA(
    lts,
    parsedQuery.stationText
  );

if(
  !stationETA &&
  routeStations.length > 0
){

  const stationMap = {

  "अजमेर":"ajmer",
  "जयपुर":"jaipur",
  "दिल्ली":"delhi",
  "जोधपुर":"jodhpur",
  "वाराणसी":"varanasi"

};

const search =
(
  stationMap[
    parsedQuery.stationText
  ] ||
  parsedQuery.stationText
)
.toLowerCase();
  console.log(
  "SEARCHING STATION:",
  search
);

console.log(
  "ROUTE SAMPLE:",
  routeStations
    .slice(0,20)
    .map(x => x.station_name)
);
console.log(
  "ALL ROUTE STATIONS:",
  routeStations.map(
    x => x.station_name
  )
);
  for(
    const station
    of routeStations
  ){
if(
  station.station_name
    .toLowerCase()
    .includes("ajmer")
){
  console.log(
    "AJMER FOUND IN ROUTE:",
    JSON.stringify(
      station,
      null,
      2
    )
  );
}
    const stationName =
      (
        station.station_name || ""
      )
      .toLowerCase();
    if(
  stationName.includes("ajmer")
){
  console.log(
    "AJMER FOUND IN ROUTE:",
    station.station_name
  );
}

    if(

  stationName.includes(search)

  ||

  (
    search.includes("अजमेर")
    &&
    stationName.includes("ajmer")
  )

){

      stationETA = {

  stationName:
    station.station_name,

  eta:
    station.eta ||
    station.sta ||
    "",

  etd:
    station.etd ||
    station.std ||
    "",

  arrivalDelay:
    station.arrival_delay || 0,

  departureDelay:
    station.departure_delay || 0,

  platformNumber:
    station.platform_number || ""

};

      break;
    }
  }
}

console.log(
  "STATION ETA RAW:",
  stationETA
);
    console.log(
  "TIMETABLE ROUTE COUNT:",
  json?.props?.pageProps
      ?.timeTableData?.[0]
      ?.route?.length
);
    console.log(
  "FIRST ROUTE STATION:",
  JSON.stringify(
    json?.props?.pageProps
      ?.timeTableData?.[0]
      ?.route?.[0],
    null,
    2
  )
);

  }catch(err){

    console.log(
      "ETA ERROR:",
      err.message
    );

  }
}
      const parsed =
        extractLiveStatus(html);
      console.log(

  "PARSED DATA:",

  JSON.stringify(parsed, null, 2)

);

      liveStatus =
  parsed.liveStatus;

delayMinutes =
  parsed.delayMinutes;

currentLocation =
  parsed.currentLocation || "";

nextStation =
  parsed.nextStation || "";
platformNumber =
  parsed.platformNumber || "";

statusAsOf =
  parsed.statusAsOf || "";

distanceInfo =
  parsed.distanceInfo || "";

function formatRailTime(value){

  if(
    value === undefined ||
    value === null ||
    value === ""
  ){
    return "";
  }

  // पहले से HH:MM है
  if(
    typeof value === "string" &&
    value.includes(":")
  ){
    return value;
  }

  const num = parseInt(value);

  if(isNaN(num)){
    return "";
  }

  const hours =
    Math.floor(num / 60);

  const mins =
    num % 60;

  return `${String(hours).padStart(2,"0")}:${String(mins).padStart(2,"0")}`;
}
  if(stationETA){

  eta =
    formatRailTime(
      stationETA.eta
    );

  etd =
    formatRailTime(
      stationETA.etd
    );

  arrivalDelay =
    stationETA.arrivalDelay || 0;

  departureDelay =
    stationETA.departureDelay || 0;

  stationPlatform =
    stationETA.platformNumber || "";
}      

    }catch(error){

      console.log(
        "LIVE ERROR:",
        error.message
      );
    }
    console.log(

  "FINAL RESPONSE:",

  JSON.stringify({

  train:matchedTrain.hindi,
  station:matchedStation.name,
  liveStatus,
  delayMinutes,
  currentLocation,
  nextStation,
  eta,
  etd,
  stationPlatform

}, null, 2)

);

    // RESPONSE

    res.json({

      success:true,

      train:{

        number:
          matchedTrain.number,

        hindi:
          matchedTrain.hindi,

        english:
          matchedTrain.english
      },

      station:{

        name:
          matchedStation.name,

        code:
          matchedStation.code,

        arrival:
          matchedStation.arrival,

        departure:
          matchedStation.departure
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

  }catch(error){

    res.json({

      success:false,

      error:error.message
    });
  }
});

// START

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `RailSafar backend running on ${PORT}`
  );
});
