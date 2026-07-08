export function parseRailQuery(query = "") {

const result = {
trainText: "",
stationText: "",
destinationText: "",
intent: "status",
hasTrain: false,
hasDestination: false,
hasStation: false,
hasIntent: false,
isValid: false
};

const lower = query.toLowerCase();

// =====================
// INTENT
// =====================

if (
query.includes("कब आएगी") ||
query.includes("कब आयेगी") ||
query.includes("आ रही है") ||
lower.includes("arrival")
) {

result.intent = "arrival";
result.hasIntent = true;

}
else if (
query.includes("कब जाएगी") ||
query.includes("कब जायेगी") ||
query.includes("जा रही है") ||
lower.includes("departure")
) {

result.intent = "departure";
result.hasIntent = true;

}
else if (
query.includes("कहाँ है") ||
query.includes("कहां है") ||
query.includes("किस जगह है") ||
lower.includes("where")
) {

result.intent = "location";
result.hasIntent = true;

}

// =====================
// DESTINATION
// =====================

const destinationMatch =
query.match(/(.+?)\s+जाने\s+वाली/i);

if (destinationMatch) {

result.destinationText =
destinationMatch[1].trim();

result.hasDestination = true;
}

// =====================
// STATION
// =====================

const stationMatch =
query.match(/([^\s]+)\s*स्टेशन/i);

if (stationMatch) {

result.stationText =
stationMatch[1].trim();

result.hasStation = true;
}

// =====================
// TRAIN NAME
// =====================
const trainKeywords = [

"एक्सप्रेस",

"express",

"superfast",

"सुपरफास्ट",

"intercity",

"इंटरसिटी",

"passenger",

"पैसेंजर",

"mail",

"मेल",

"memu",

"demu",

"jan shatabdi",

"जन शताब्दी",

"shatabdi",

"शताब्दी",

"rajdhani",

"राजधानी",

"duronto",

"दुरंतो",

"garib rath",

"गरीब रथ",

"humsafar",

"हमसफर",

"vande bharat",

"वंदे भारत"

];

let trainFound = "";

for(const keyword of trainKeywords){

    const regex =
    new RegExp(
        `([^\\n]+?${keyword})`,
        "i"
    );

    const match =
    query.match(regex);

    if(match){

        trainFound =
        match[1].trim();

        break;

    }

}

if(trainFound){

    trainFound =
    trainFound.replace(
        /^.*?जाने\s+वाली\s+/i,
        ""
    );

    trainFound =
    trainFound.replace(
        /^.*?going\s+to\s+/i,
        ""
    );

    result.trainText =
    trainFound.trim();

    result.hasTrain = true;

}
// =====================
// VALIDATION
// =====================

if (
result.hasTrain &&
result.hasStation
) {

result.isValid = true;
}

return result;
}
