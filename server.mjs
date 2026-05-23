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
        code:"JP"
      },

      {
        name:"अजमेर",
        code:"AII"
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
        code:"JP"
      }

    ]
  }

];

// LIVE PARSER

function extractLiveStatus(html){

  const lower =
    html.toLowerCase();

  console.log(
    "HTML LENGTH:",
    html.length
  );

  // DEBUG PREVIEW

  console.log(

    html.substring(0, 3000)

  );

  // DELAY 37m

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

  // DELAYED BY

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

  // FALLBACK

  return {

    liveStatus:
      "📡 लाइव स्थिति नहीं पढ़ी जा सकी",

    delayMinutes:0
  };
}

// ROOT

app.get("/", (req, res) => {

  res.send(
    "RailSafar Backend Running"
  );
});

// DEBUG ROUTE

app.get("/debug-train/:number", async (req, res) => {

  try{

    const number =
      req.params.number;

    const liveUrl =

      `https://www.railyatri.in/live-train-status/${number}`;

    console.log(
      "FETCHING:",
      liveUrl
    );

    const response =
      await fetch(liveUrl);

    const html =
      await response.text();

    const parsed =
      extractLiveStatus(html);

    res.json({

      success:true,

      train:number,

      htmlLength:
        html.length,

      preview:
        html.substring(0, 2000),

      parsed
    });

  }catch(error){

    res.json({

      success:false,

      error:error.message
    });
  }
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

    // NOT FOUND

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

    // LIVE STATUS

    let liveStatus =
      "📡 लाइव जानकारी नहीं मिली";

    let delayMinutes = 0;

    let sourceUrl =

      `https://www.railyatri.in/live-train-status/${matchedTrain.number}`;

    try{

      console.log(
        "LIVE URL:",
        sourceUrl
      );

      const response =
        await fetch(sourceUrl);

      const html =
        await response.text();

      const parsed =
        extractLiveStatus(html);

      liveStatus =
        parsed.liveStatus;

      delayMinutes =
        parsed.delayMinutes;

    }catch(error){

      console.log(
        "LIVE FETCH ERROR:",
        error.message
      );
    }

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
          matchedStation.code
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

// START SERVER

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `RailSafar backend running on ${PORT}`
  );
});
