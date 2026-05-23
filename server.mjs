import express from "express";
import cors from "cors";

const app = express();

app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {

  res.send("RailSafar Backend Running");
});

app.post("/rail-query", async (req, res) => {

  try{

    const query =
      (req.body.query || "")
      .toLowerCase();

    let train = null;

    // TRAIN MATCH

    if(
      query.includes("अमृतसर") ||
      query.includes("अमरसर")
    ){

      train = {

        number:"12413",

        name:"अमृतसर एक्सप्रेस",

        slug:"Amritsar-Express-12413"
      };
    }

    else if(
      query.includes("मरुधर")
    ){

      train = {

        number:"14864",

        name:"मरुधर एक्सप्रेस",

        slug:"Marudhar-Express-14864"
      };
    }

    // STATION MATCH

    let station = null;

    if(
      query.includes("जयपुर")
    ){

      station = {

        code:"JP",

        name:"जयपुर जंक्शन"
      };
    }

    else if(
      query.includes("अजमेर")
    ){

      station = {

        code:"AII",

        name:"अजमेर जंक्शन"
      };
    }

    // INTENT

    let intent = "arrival";

    if(
      query.includes("जाएगी") ||
      query.includes("निकलेगी")
    ){

      intent = "departure";
    }

    res.json({

      success:true,

      originalQuery:query,

      train,

      station,

      intent
    });

  }catch(error){

    res.status(500).json({

      success:false,

      error:error.message
    });
  }
});

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `RailSafar backend running on ${PORT}`
  );
});
