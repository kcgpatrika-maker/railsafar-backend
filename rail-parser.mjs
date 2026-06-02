export function parseRailQuery(query = "") {

  const result = {
    trainText: "",
    stationText: "",
    intent: "status"
  };

  const lower = query.toLowerCase();

  // INTENT

  if (
    lower.includes("कब आएगी") ||
    lower.includes("आएगी") ||
    lower.includes("arrival")
  ) {
    result.intent = "arrival";
  }

  else if (
    lower.includes("कब जाएगी") ||
    lower.includes("जाएगी") ||
    lower.includes("departure")
  ) {
    result.intent = "departure";
  }

  else if (
    lower.includes("कहाँ है") ||
    lower.includes("कहां है") ||
    lower.includes("where")
  ) {
    result.intent = "location";
  }

  // STATION

  const stationMatch = query.match(
    /(.+?)\s*स्टेशन/
  );

  if (stationMatch) {
    result.stationText =
      stationMatch[1].trim();
  }

  return result;
}
