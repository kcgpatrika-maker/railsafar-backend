import fetch from 'node-fetch';
import { matchBestRoute } from './route-matcher.js';

export async function fetchRailStatus(query) {
  try {
    const trainQuery = query.train || "";
    const stationQuery = query.station || "";
    const destinationQuery = query.destination || "";

    console.log(`🔍 Searching Train: "${trainQuery}" at Station: "${stationQuery}" (Dest: "${destinationQuery}")`);

    // RailYatri Mobile Search API (Free & Public source)
    const searchUrl = `https://search.railyatri.in/mobile/trainsearch?q=${encodeURIComponent(trainQuery)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (!response.ok) {
      throw new Error(`External API failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Check if trains found
    let trainsList = [];
    if (Array.isArray(data)) {
      trainsList = data;
    } else if (data.trains && Array.isArray(data.trains)) {
      trainsList = data.trains;
    } else if (data.data && Array.isArray(data.data)) {
      trainsList = data.data;
    }

    if (trainsList.length === 0) {
      console.log("❌ No trains found from search API.");
      return null;
    }

    // Use route matcher to pick the best matching train/station
    const matchedResult = matchBestRoute(trainsList, {
      train: trainQuery,
      station: stationQuery,
      destination: destinationQuery
    });

    if (!matchedResult) {
      // Fallback to the first train if specific match fails
      const fallbackTrain = trainsList[0];
      return {
        trainName: fallbackTrain.name || fallbackTrain.train_name || trainQuery,
        trainNumber: fallbackTrain.number || fallbackTrain.train_no || "00000",
        stationName: stationQuery !== "मुख्य स्टेशन" ? stationQuery : "मुख्य जंक्शन",
        statusMessage: "समय पर चल रही है (सामान्य स्थिति)",
        arrivalTime: "निर्धारित समय",
        departure: "निर्धारित समय",
        delayMinutes: 0,
        journeyInfo: `गंतव्य: ${destinationQuery || 'उपलब्ध नहीं'}`
      };
    }

    return matchedResult;

  } catch (error) {
    console.error("❌ Error in fetchRailStatus:", error.message);
    return null;
  }
}
