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
      "पूजा एक्सप्रेस",
      "पूजा",
      "अमृतसर एक्सप्रेस",
      "अमृतसर"
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

  // DELAY

  const delayMatch =

    html.match(
      /Delay\s+(\d+)m/i
    );

  if(delayMatch){

    return {

      liveStatus:
        `⏱️ ट्रेन लगभग ${delayMatch[1]} मिनट देरी से चल रही है`,

      delayMinutes:
        parseInt(delayMatch[1])
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

  // FALLBACK

  return {

    liveStatus:
      "📡 लाइव स्थिति स्पष्ट नहीं मिली",

    delayMinutes:0
  };
}

// MAIN ROUTE

app.post("/rail-query", async (req, res) => {

  try{

    const query =
      req.body.query || "";

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

    let matchedStation = null;

    for(const station of matchedTrain.stations){

      if(
        query.includes(station.name)
      ){

        matchedStation = station;

        break;
      }
    }

    // DEFAULT STATION

    if(!matchedStation){

      matchedStation =
        matchedTrain.stations[0];
    }

    // LIVE FETCH

    let liveStatus =
      "📡 लाइव स्थिति स्पष्ट नहीं मिली";

    let delayMinutes = 0;

    try{

      const liveUrl =

        `https://www.railyatri.in/live-train-status/${matchedTrain.number}`;

      console.log(liveUrl);

      const response =
        await fetch(liveUrl);

      const html =
        await response.text();

      const liveData =
        extractLiveStatus(html);

      liveStatus =
        liveData.liveStatus;

      delayMinutes =
        liveData.delayMinutes;

    }catch(error){

      console.log(
        "Live fetch failed"
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

      liveStatus:
        liveStatus,

      delayMinutes:
        delayMinutes
    });

  }catch(error){

    res.json({

      success:false,

      error:error.message
    });
  }
});

// ROOT

app.get("/", (req, res) => {

  res.send(
    "RailSafar Backend Running"
  );
});

// PORT

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `Server running on ${PORT}`
  );
});
