export function parseRailQuery(query = "") {

  const result = {
    trainText: "",
    boardingStation: "",
    destinationStation: "",
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
    lower.includes("अभी कहाँ") ||
    lower.includes("अभी कहां") ||
    lower.includes("where")
  ) {
    result.intent = "location";
  }

  // BOARDING STATION
  // जयपुर स्टेशन पर

  const stationMatch =
    query.match(/(.+?)\s*स्टेशन/);

  if (stationMatch) {
    result.boardingStation =
      stationMatch[1].trim();
  }

  // DESTINATION STATION
  // अलवर जाने वाली

  const destinationMatch =
    query.match(/(.+?)\s*जाने\s*वाली/);

  if (destinationMatch) {
    result.destinationStation =
      destinationMatch[1].trim();
  }

  return result;
}
