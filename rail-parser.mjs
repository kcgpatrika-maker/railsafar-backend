export function parseRailQuery(query = "") {

  const result = {
    trainText: "",
    stationText: "",
    destinationText: "",
    intent: "status"
  };

  const lower = query.toLowerCase();

  // INTENT

  if (
    lower.includes("कब आएगी") ||
    lower.includes("आ रही है") ||
    lower.includes("arrival")
  ) {
    result.intent = "arrival";
  }

  else if (
    lower.includes("कब जाएगी") ||
    lower.includes("जा रही है") ||
    lower.includes("departure")
  ) {
    result.intent = "departure";
  }

  else if (
    lower.includes("कहाँ है") ||
    lower.includes("कहां है") ||
    lower.includes("किस जगह है") ||
    lower.includes("where")
  ) {
    result.intent = "location";
  }

  // DESTINATION

  const destinationMatch = query.match(
    /(.+?)\s+जाने\s+वाली/
  );

  if (destinationMatch) {
    result.destinationText =
      destinationMatch[1].trim();
  }

  // STATION

  const stationMatch = query.match(
    /([^\s]+)\s*स्टेशन/
  );

  if (stationMatch) {
    result.stationText =
      stationMatch[1].trim();
  }

  // TRAIN NAME

  const trainMatch = query.match(
    /([^\n]+?)(एक्सप्रेस|superfast|सुपरफास्ट)/i
  );

  if (trainMatch) {
    result.trainText =
      trainMatch[0].trim();
  }

  return result;
}
