export function calculateBrainInjuryRisk(impacts, fighterSettings = null) {
  if (!impacts || impacts.length === 0) {
    return {
      overall_risk: 'low',
      risk_percentage: 0,
      total_force_estimate: 0,
      impact_details: [],
      recommendation: 'No significant impacts detected.',
    };
  }

  const impactDetails = [];
  let totalForce = 0;
  let maxForce = 0;

  for (const impact of impacts) {
    const fighterIdx = impact.fighter || 1;
    let puncherWeight = 75;

    if (fighterSettings) {
      const fighterKey = `fighter${fighterIdx}`;
      const settings = fighterSettings[fighterKey] || { weight: 75, skill: 'professional' };
      puncherWeight = settings.weight || 75;
    } else {
      puncherWeight = impact.fighter_weight || 75;
    }

    let speedMin, speedMax, avgSpeedMph;
    const speedRange = impact.speed_range;
    if (speedRange) {
      speedMin = speedRange.min || 20;
      speedMax = speedRange.max || 30;
      avgSpeedMph = (speedMin + speedMax) / 2;
    } else {
      avgSpeedMph = 25;
      speedMin = 20;
      speedMax = 30;
    }

    let forceMin, forceMax, avgForce;
    const powerRange = impact.power_range;
    if (powerRange) {
      forceMin = powerRange.min || 200;
      forceMax = powerRange.max || 400;
      avgForce = (forceMin + forceMax) / 2;
    } else {
      const mphToMs = 0.44704;
      const avgSpeedMs = avgSpeedMph * mphToMs;
      const effectiveMass = puncherWeight * 0.04;
      const contactTime = 0.01;
      avgForce = (effectiveMass * avgSpeedMs) / contactTime;
      forceMin = avgForce * 0.8;
      forceMax = avgForce * 1.2;
    }

    const headMassKg = 4.5;
    const gForce = avgForce / (headMassKg * 9.81);

    const motionIntensity = impact.motion_intensity || 0.7;
    const severityMultiplier = 0.8 + motionIntensity * 0.4;
    const adjustedForce = avgForce * severityMultiplier;

    totalForce += adjustedForce;
    maxForce = Math.max(maxForce, adjustedForce);

    let impactRisk, injuryProbability;
    if (gForce > 100) {
      impactRisk = 'high';
      injuryProbability = Math.min(95, 50 + (gForce - 100) * 0.5);
    } else if (gForce > 60) {
      impactRisk = 'moderate';
      injuryProbability = 20 + (gForce - 60) * 0.75;
    } else if (gForce > 30) {
      impactRisk = 'low-moderate';
      injuryProbability = 5 + (gForce - 30) * 0.5;
    } else {
      impactRisk = 'low';
      injuryProbability = gForce * 0.15;
    }

    impactDetails.push({
      id: impact.id,
      frame: impact.frame,
      time: impact.time,
      hand: impact.hand,
      speed_min: Math.round(speedMin),
      speed_max: Math.round(speedMax),
      force_min: Math.round(forceMin),
      force_max: Math.round(forceMax),
      estimated_force_newtons: Math.round(adjustedForce * 100) / 100,
      g_force: Math.round(gForce * 100) / 100,
      risk_level: impactRisk,
      injury_probability: Math.round(Math.min(100, injuryProbability) * 10) / 10,
      motion_intensity: motionIntensity,
    });
  }

  let cumulativeProbability = 0;
  for (const detail of impactDetails) {
    const remaining = 100 - cumulativeProbability;
    const contribution = (remaining * detail.injury_probability) / 100;
    cumulativeProbability += contribution;
  }
  cumulativeProbability = Math.min(95, cumulativeProbability);

  let overallRisk, recommendation;
  if (cumulativeProbability > 70) {
    overallRisk = 'critical';
    recommendation = 'URGENT: Immediate medical evaluation recommended. Multiple high-force impacts detected. Stop all activity and seek professional assessment.';
  } else if (cumulativeProbability > 50) {
    overallRisk = 'high';
    recommendation = 'HIGH CONCERN: Significant impact forces detected. Rest recommended. Consider medical evaluation before continuing training.';
  } else if (cumulativeProbability > 25) {
    overallRisk = 'moderate';
    recommendation = 'MODERATE: Notable impacts detected. Monitor for symptoms. Rest advised for at least 24-48 hours.';
  } else if (cumulativeProbability > 10) {
    overallRisk = 'low-moderate';
    recommendation = 'LOW-MODERATE: Some impact forces detected. Standard post-sparring rest recommended. Monitor for any unusual symptoms.';
  } else {
    overallRisk = 'low';
    recommendation = 'LOW: Minimal impact forces detected. Standard recovery protocols apply.';
  }

  return {
    overall_risk: overallRisk,
    risk_percentage: Math.round(cumulativeProbability * 10) / 10,
    total_force_estimate: Math.round(totalForce * 100) / 100,
    max_single_impact_force: Math.round(maxForce * 100) / 100,
    impact_count: impacts.length,
    impact_details: impactDetails,
    recommendation,
    disclaimer: 'This is an estimation tool only. Speed and force values are based on typical ranges for the selected skill level. Always consult a healthcare professional for proper assessment.',
  };
}
