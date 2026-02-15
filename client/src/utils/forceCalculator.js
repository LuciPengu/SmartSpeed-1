const SKILL_RANGES = {
  Beginner: { minSpeed: 12, maxSpeed: 18 },
  Amateur: { minSpeed: 18, maxSpeed: 26 },
  Professional: { minSpeed: 24, maxSpeed: 35 },
  Elite: { minSpeed: 32, maxSpeed: 48 },
};

export function calculateForceMetrics(impact, fighterSettings) {
  const { skill, weight, throwingIntensity = 100 } = fighterSettings;
  const range = SKILL_RANGES[skill] || SKILL_RANGES.Professional;

  const intensityFactor = throwingIntensity / 100;

  const seed = impact.id || 1;
  const variation = ((Math.sin(seed * 12.9898) * 43758.5453) % 1) * 0.15 - 0.075;

  const speedMin = Math.round((range.minSpeed + (range.maxSpeed - range.minSpeed) * 0.2) * intensityFactor * (1 + variation));
  const speedMax = Math.round((range.minSpeed + (range.maxSpeed - range.minSpeed) * 0.8) * intensityFactor * (1 + variation));

  const avgSpeedMph = (speedMin + speedMax) / 2;
  const avgSpeedMs = avgSpeedMph * 0.44704;
  const effectiveMass = weight * 0.04;
  const contactTime = 0.01;
  const avgForce = (effectiveMass * avgSpeedMs) / contactTime;

  const motionIntensity = impact.motionIntensity || 0.7;
  const severityMultiplier = 0.8 + motionIntensity * 0.4;

  return {
    speedMin,
    speedMax,
    forceMin: Math.round(avgForce * 0.8),
    forceMax: Math.round(avgForce * 1.2),
    avgForce: Math.round(avgForce * severityMultiplier),
    gForce: Math.round((avgForce / (4.5 * 9.81)) * 10) / 10,
  };
}
