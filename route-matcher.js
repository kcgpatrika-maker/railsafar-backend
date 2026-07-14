// ==========================================
// RailSafar Backend V2
// Route Matching Engine V1
// ==========================================

// ----------------------------
// Normalize Station Name
// ----------------------------
export function normalizeStationName(name = "") {

    return String(name)
        .toLowerCase()
        .replace(/junction|jn|jn\./gi, "")
        .replace(/road/gi, "")
        .replace(/city/gi, "")
        .replace(/\s+/g, " ")
        .trim();

}

// ----------------------------
// Find Station Index
// ----------------------------
export function findStationIndex(routeStations = [], stationName = "") {

    if (!stationName) return -1;

    const search = normalizeStationName(stationName);

    for (let i = 0; i < routeStations.length; i++) {

        const station =
            normalizeStationName(
                routeStations[i]?.station_name || ""
            );

        if (
            station === search ||
            station.includes(search) ||
            search.includes(station)
        ) {
            return i;
        }

    }

    return -1;

}

// ----------------------------
// Build Route Score
// ----------------------------
export function buildRouteScore(
    routeStations = [],
    destination = "",
    queryStation = ""
) {

    let score = 0;

    const reasons = [];

    const destinationIndex =
        findStationIndex(
            routeStations,
            destination
        );

    const stationIndex =
        findStationIndex(
            routeStations,
            queryStation
        );

    if (destinationIndex >= 0) {

        score += 60;

        reasons.push(
            "Destination Matched"
        );

    }

    if (stationIndex >= 0) {

        score += 40;

        reasons.push(
            "Station Matched"
        );

    }

    if (
        destinationIndex >= 0 &&
        stationIndex >= 0 &&
        stationIndex < destinationIndex
    ) {

        score += 30;

        reasons.push(
            "Correct Route Direction"
        );

    }

    return {

        score,

        destinationIndex,

        stationIndex,

        reasons

    };

}

// ----------------------------
// Select Best Train
// ----------------------------
export function selectBestTrain(
    candidates = []
) {

    if (
        !Array.isArray(candidates) ||
        candidates.length === 0
    ) {

        return null;

    }

    candidates.sort(

        (a, b) =>

            (b.routeScore || 0) -
            (a.routeScore || 0)

    );

    return candidates[0];

}
