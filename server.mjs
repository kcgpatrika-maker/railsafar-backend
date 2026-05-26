import express from "express";
import cors from "cors";

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

  const lower =
    html.toLowerCase();

  // DELAY XXm

  let match =

    html.match(
      /Delay\s*(\d+)m/i
    );

  if(match){

    return {

      liveStatus:
        `⏱️ ट्रेन लगभग ${match[1]} मिनट देरी से चल रही है`,

      delayMinutes:
        parseInt(match[1])
    };
  }

  // DELAYED BY XX

  match =

    html.match(
      /delayed\s*by\s*(\d+)/i
    );

  if(match){

    return {

      liveStatus:
        `⏱️ ट्रेन लगभग ${match[1]} मिनट देरी से चल रही है`,

      delayMinutes:
        parseInt(match[1])
    };
  }

  // RIGHT TIME

  if(
    lower.includes("right time")
  ){

    return {

      liveStatus:
        "✅ ट्रेन समय पर चल रही है",

      delayMinutes:0
    };
  }

  // ON TIME

  if(
    lower.includes("on time")
  ){

    return {

      liveStatus:
        "✅ ट्रेन समय पर चल रही है",

      delayMinutes:0
    };
  }

  // CANCELLED

  if(
    lower.includes("cancelled")
  ){

    return {

      liveStatus:
        "❌ ट्रेन रद्द दिखाई दे रही है",

      delayMinutes:0
    };
  }

  // RESCHEDULED

  if(
    lower.includes("rescheduled")
  ){

    return {

      liveStatus:
        "🚨 ट्रेन पुनर्निर्धारित दिखाई दे रही है",

      delayMinutes:120
    };
  }

  // REACHED

  if(
    lower.includes("has reached")
  ){

    return {

      liveStatus:
        "📍 ट्रेन स्टेशन पहुंच चुकी है",

      delayMinutes:0
    };
  }

  // DEPARTED

  if(
    lower.includes("departed")
  ){

    return {

      liveStatus:
        "🚆 ट्रेन स्टेशन से निकल चुकी है",

      delayMinutes:0
    };
  }

  // PLATFORM

  if(
    lower.includes("platform")
  ){

    return {

      liveStatus:
        "🚉 ट्रेन स्टेशन पर उपलब्ध दिखाई दे रही है",

      delayMinutes:0
    };
  }

  // DEFAULT

  return {

    liveStatus:
      "📡 लाइव स्थिति प्राप्त नहीं हो सकी",

    delayMinutes:0
  };
}

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
    delayMinutes

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
