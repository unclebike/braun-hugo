const EARTH_RADIUS_KM = 6371;
const toRadians = (value) => (value * Math.PI) / 180;
const parseJson = (value) => {
    try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
    }
    catch {
    }
    return {};
};
const normalizePostalCode = (postalCode) => {
    if (!postalCode)
        return '';
    return postalCode.replace(/\s+/g, '').toUpperCase();
};
const firstThree = (postalCode) => normalizePostalCode(postalCode).slice(0, 3);
const haversineKm = (lat1, lng1, lat2, lng2) => {
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
};
const toGeofencePoint = (value) => {
    if (Array.isArray(value) && value.length >= 2) {
        const a = Number(value[0]);
        const b = Number(value[1]);
        if (Number.isFinite(a) && Number.isFinite(b)) {
            // Historically we have stored both [lng, lat] and [lat, lng].
            // Leaflet's LatLng is (lat, lng) and our admin UI currently serializes [lat, lng].
            // Range-based detection alone is ambiguous for many North American longitudes
            // (e.g. -77 is valid for both lat and lng), so we also use a sign heuristic.
            const absA = Math.abs(a);
            const absB = Math.abs(b);
            // If one value is clearly longitude (> 90), it's unambiguous.
            if (absA > 90 && absA <= 180 && absB <= 90) {
                return { lat: b, lng: a };
            }
            if (absB > 90 && absB <= 180 && absA <= 90) {
                return { lat: a, lng: b };
            }
            // If exactly one is negative, assume negative is longitude and positive is latitude.
            // This matches our typical service areas (Canada/US): lat > 0, lng < 0.
            if ((a < 0 && b > 0) || (a > 0 && b < 0)) {
                const lat = a > 0 ? a : b;
                const lng = a < 0 ? a : b;
                if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                    return { lat, lng };
                }
            }
            // Ambiguous ranges (both could be lat/lng). Default to [lat, lng]
            // because that's what our current admin UI emits.
            return { lat: a, lng: b };
        }
    }
    if (value && typeof value === 'object') {
        const candidate = value;
        const lat = Number(candidate.lat);
        const lng = Number(candidate.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { lat, lng };
        }
    }
    return null;
};
const pointInPolygon = (point, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const pi = polygon[i];
        const pj = polygon[j];
        const intersects = (pi.lat > point.lat) !== (pj.lat > point.lat) &&
            point.lng < ((pj.lng - pi.lng) * (point.lat - pi.lat)) / ((pj.lat - pi.lat) || Number.EPSILON) + pi.lng;
        if (intersects)
            inside = !inside;
    }
    return inside;
};
export function checkServiceArea(areaType, areaData, location, _bufferKm = 0) {
    const parsed = parseJson(areaData);
    if (areaType === 'zip') {
        const zipPrefixesRaw = parsed.zip_codes ?? parsed.zipCodes;
        const zipPrefixes = Array.isArray(zipPrefixesRaw)
            ? zipPrefixesRaw.map((z) => firstThree(String(z))).filter(Boolean)
            : [];
        const locationPrefix = firstThree(location.postalCode);
        if (!locationPrefix || zipPrefixes.length === 0) {
            return { within: false };
        }
        return { within: zipPrefixes.some((prefix) => locationPrefix.startsWith(prefix)) };
    }
    if (areaType === 'radius') {
        const radiusData = parsed;
        const centerLat = Number(radiusData.center?.lat);
        const centerLng = Number(radiusData.center?.lng);
        const radiusMiles = Number(radiusData.radius_miles);
        if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng) || !Number.isFinite(radiusMiles)) {
            return { within: false };
        }
        if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
            return { within: false };
        }
        const distanceKm = haversineKm(centerLat, centerLng, location.lat, location.lng);
        const radiusKm = radiusMiles * 1.609344;
        return {
            within: distanceKm <= radiusKm,
            distance: distanceKm,
        };
    }
    if (areaType === 'geofence') {
        const rawPolygon = parsed.polygon;
        const polygon = Array.isArray(rawPolygon)
            ? rawPolygon.map((p) => toGeofencePoint(p)).filter((p) => p !== null)
            : [];
        if (polygon.length < 3 || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
            return { within: false };
        }
        return {
            within: pointInPolygon({ lat: location.lat, lng: location.lng }, polygon),
        };
    }
    return { within: false };
}
//# sourceMappingURL=service-area.js.map