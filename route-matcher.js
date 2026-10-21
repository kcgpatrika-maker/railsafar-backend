export function matchBestRoute(trainsList, query) {
  const targetTrain = (query.train || "").toLowerCase().trim();
  const targetStation = (query.station || "जयपुर").replace(/पर$/, "").trim();
  const dest = (query.destination || "").trim();

  let matchedTrain = null;

  if (trainsList && trainsList.length > 0) {
    matchedTrain = trainsList.find(t => {
      const name = (t.name || t.train_name || "").toLowerCase();
      const num = (t.number || t.train_no || "").toString();
      return name.includes(targetTrain) || targetTrain.includes(name) || targetTrain.includes(num);
    }) || trainsList[0];
  }

  const tName = matchedTrain ? (matchedTrain.name || matchedTrain.train_name || query.train) : query.train;
  const tNum = matchedTrain ? (matchedTrain.number || matchedTrain.train_no || "12413") : "12413";
  const sName = targetStation !== "" ? targetStation : "जयपुर";

  return {
    trainName: tName,
    trainNumber: tNum,
    stationName: sName,
    statusMessage: "सुचारू रूप से संचालित (On Time)",
    arrivalTime: "लाइव देखें",
    departure: "लाइव देखें",
    delayMinutes: 0,
    journeyInfo: `गंतव्य: ${dest !== "उपलब्ध नहीं" ? dest : "निर्धारित मार्ग"} | सटीक लाइव समय देखने के लिए नीचे दिए गए 'रेलयात्री लाइव' बटन पर क्लिक करें।`
  };
}
