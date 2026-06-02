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

    if(lts){

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

app.get("/open-railwiki", (req, res) => {

  res.redirect(
    "https://en.wikipedia.org/wiki/Indian_Railways"
  );
});
// ROOT

app.get("/", (req, res) => {

  res.send(
    "RailSafar Backend Running"
  );
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
  parsedQuery
);

console.log(
  "QUERY:",
  query
);

    // TRAIN FIND

    let matchedTrain = null;

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

      return res.json({

        success:false,

        message:
          "Train not found"
      });
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
  nextStation

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
