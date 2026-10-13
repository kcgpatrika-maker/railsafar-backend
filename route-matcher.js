export function matchBestRoute(trainsList, query) {
  if (!trainsList || trainsList.length === 0) return null;

  const targetTrain = query.train.toLowerCase().trim();
  const targetStation = query.station.toLowerCase().trim();

  let bestMatch = null;
  let highestScore = -1;

  for (const train of trainsList) {
    let score = 0;
    const name = (train.name || train.train_name || "").toLowerCase();
    const number = (train.number || train.train_no || "").toString();

    // 1. अगर ट्रेन के नाम में पूरा या आंशिक शब्द मिलता है
    if (name.includes(targetTrain) || targetTrain.includes(name)) {
      score += 10;
    }

    // 2. अगर यूजर ने नंबर बोला हो और वह नंबर मैच हो जाए
    if (targetTrain.includes(number) && number.length > 2) {
      score += 20;
    }

    // अगर यह अब तक की सबसे अच्छी मैचिंग है
    if (score > highestScore) {
      highestScore = score;
      bestMatch = train;
    }
  }

  // अगर कोई भी रीज़नेबल मैच मिल जाता है
  if (bestMatch && highestScore >= 0) {
    const tName = bestMatch.name || bestMatch.train_name || query.train;
    const tNum = bestMatch.number || bestMatch.train_no || "00000";
    const sName = query.station !== "मुख्य स्टेशन" ? query.station : "निर्धारित जंक्शन";

    return {
      trainName: tName,
      trainNumber: tNum,
      stationName: sName,
      statusMessage: "सुचारू रूप से संचालित",
      arrivalTime: "अनुमानित समय",
      departure: "निर्धारित समय",
      delayMinutes: 0,
      journeyInfo: `गाड़ी ${tName} (${tNum}) ${sName} स्टेशन पर उपलब्ध है। गंतव्य: ${query.destination || 'निर्धारित'}`
    };
  }

  // यदि कोई सटीक स्कोर न मिले तो लिस्ट की पहली ट्रेन लौटा दें
  const defaultTrain = trainsList[0];
  const tName = defaultTrain.name || defaultTrain.train_name || query.train;
  const tNum = defaultTrain.number || defaultTrain.train_no || "00000";
  const sName = query.station !== "मुख्य स्टेशन" ? query.station : "मुख्य जंक्शन";

  return {
    trainName: tName,
    trainNumber: tNum,
    stationName: sName,
    statusMessage: "समय सारणी के अनुसार",
    arrivalTime: "समय पर",
    departure: "समय पर",
    delayMinutes: 0,
    journeyInfo: `गंतव्य: ${query.destination || 'उपलब्ध नहीं'}`
  };
}
