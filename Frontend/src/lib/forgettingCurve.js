/** Slugify topic label for stable graph keys */
export function slugifyTopic(label) {
  return String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96) || "topic";
}

/**
 * Ebbinghaus-style retention R(t) = 100 * exp(-t / S)
 * where S = stability in days (from SM-2 interval + ease)
 */
export function retentionAtDay(stabilityDays, day) {
  const S = Math.max(0.5, stabilityDays || 1);
  return Math.round(100 * Math.exp(-day / S));
}

/** Points for chart: { day, retention } for 0..maxDay */
export function buildRetentionCurve(stabilityDays, maxDay = 14) {
  const points = [];
  for (let d = 0; d <= maxDay; d += 1) {
    points.push({
      day: d,
      retention: retentionAtDay(stabilityDays, d),
    });
  }
  return points;
}

/** SM-2 quality: 0=blackout … 5=perfect. */
export function applySm2Step(card, quality) {
  const q = Math.max(0, Math.min(5, quality));
  let { easeFactor = 2.5, intervalDays = 1, repetitions = 0 } = card;

  if (q < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
    repetitions += 1;
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );

  const next = new Date();
  next.setDate(next.getDate() + intervalDays);

  const strength = Math.min(100, Math.round(40 + easeFactor * 15 + repetitions * 8));

  return {
    easeFactor,
    intervalDays,
    repetitions,
    nextReview: next.toISOString(),
    strength,
  };
}
