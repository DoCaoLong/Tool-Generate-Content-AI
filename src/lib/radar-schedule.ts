const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const RADAR_HOUR = 7;

export function nextRadarRefreshAt(fetchedAt: number) {
  const dayIndex = Math.floor((fetchedAt + ICT_OFFSET_MS) / DAY_MS);
  const nextMidnightUtc = (dayIndex + 1) * DAY_MS - ICT_OFFSET_MS;
  return nextMidnightUtc + RADAR_HOUR * 60 * 60 * 1000;
}

export function radarStillFresh(fetchedAt: number, now = Date.now()) {
  return Number.isFinite(fetchedAt) && now < nextRadarRefreshAt(fetchedAt);
}
