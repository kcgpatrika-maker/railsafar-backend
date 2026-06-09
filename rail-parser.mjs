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

// INTENT

if (
lower.includes("कब आएगी") ||
lower.includes("आ रही है") ||
lower.includes("arrival")
) {
result.intent = "arrival";
result.hasIntent = true;
}

else if (
lower.includes("कब जाएगी") ||
lower.includes("जा रही है") ||
lower.includes("departure")
) {
result.intent = "departure";
result.hasIntent = true;
}

else if (
lower.includes("कहाँ है") ||
lower.includes("कहां है") ||
lower.includes("किस जगह है") ||
lower.includes("where")
) {
result.intent = "location";
result.hasIntent = true;
}

// DESTINATION

const destinationMatch =
query.match(/(.+?)\s+जाने\s+वाली/i);

if (destinationMatch) {

```
result.destinationText =
  destinationMatch[1].trim();

result.hasDestination = true;
```

}

// STATION

const stationMatch =
query.match(/([^\s]+)\s*स्टेशन/i);

if (stationMatch) {

```
result.stationText =
  stationMatch[1].trim();

result.hasStation = true;
```

}

// TRAIN NAME

const trainMatch =
query.match(/([^\n]+?)(एक्सप्रेस|superfast|सुपरफास्ट)/i);

if (trainMatch) {

```
let trainName =
  trainMatch[0].trim();

trainName =
  trainName.replace(/^.*?जाने\s+वाली\s+/i, "");

result.trainText = trainName;

result.hasTrain = true;
```

}

// FINAL VALIDATION

if (
result.hasTrain &&
result.hasDestination &&
result.hasStation &&
result.hasIntent
) {
result.isValid = true;
}

return result;
}
