// ---- Anonymous name generator ----
const ADJECTIVES = [
  "Quiet", "Restless", "Curious", "Lone", "Amber", "Silver", "Velvet", "Rustic",
  "Hidden", "Gentle", "Bold", "Drifting", "Midnight", "Golden", "Crimson", "Misty",
  "Wandering", "Electric", "Frosty", "Sunlit"
];
const NOUNS = [
  "Falcon", "Otter", "Maple", "Lantern", "Comet", "Heron", "Cobra", "Willow",
  "Sparrow", "Tiger", "Ember", "Panther", "Harbor", "Nomad", "Rickshaw", "Fox",
  "Cricket", "Monsoon", "Kite", "River"
];

export function generateAnonName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${adj}${noun}${num}`;
}

// ---- Geo helpers ----
// Haversine distance in meters between two lat/lng points
export function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function makeId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
