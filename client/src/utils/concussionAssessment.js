export const SCAT5_SYMPTOMS = [
  { id: 'headache', name: 'Headache', category: 'physical' },
  { id: 'pressure_head', name: 'Pressure in head', category: 'physical' },
  { id: 'neck_pain', name: 'Neck pain', category: 'physical' },
  { id: 'nausea', name: 'Nausea or vomiting', category: 'physical' },
  { id: 'dizziness', name: 'Dizziness', category: 'physical' },
  { id: 'blurred_vision', name: 'Blurred vision', category: 'physical' },
  { id: 'balance_problems', name: 'Balance problems', category: 'physical' },
  { id: 'light_sensitivity', name: 'Sensitivity to light', category: 'physical' },
  { id: 'noise_sensitivity', name: 'Sensitivity to noise', category: 'physical' },
  { id: 'feeling_slowed', name: 'Feeling slowed down', category: 'cognitive' },
  { id: 'feeling_foggy', name: "Feeling like 'in a fog'", category: 'cognitive' },
  { id: 'not_feeling_right', name: "Don't feel right", category: 'cognitive' },
  { id: 'difficulty_concentrating', name: 'Difficulty concentrating', category: 'cognitive' },
  { id: 'difficulty_remembering', name: 'Difficulty remembering', category: 'cognitive' },
  { id: 'fatigue', name: 'Fatigue or low energy', category: 'physical' },
  { id: 'confusion', name: 'Confusion', category: 'cognitive' },
  { id: 'drowsiness', name: 'Drowsiness', category: 'physical' },
  { id: 'trouble_sleeping', name: 'Trouble falling asleep', category: 'sleep' },
  { id: 'more_emotional', name: 'More emotional', category: 'emotional' },
  { id: 'irritability', name: 'Irritability', category: 'emotional' },
  { id: 'sadness', name: 'Sadness', category: 'emotional' },
  { id: 'nervous_anxious', name: 'Nervous or anxious', category: 'emotional' },
];

export const RED_FLAGS = [
  { id: 'neck_pain_severe', name: 'Severe or increasing neck pain', critical: true },
  { id: 'double_vision', name: 'Double vision', critical: true },
  { id: 'weakness_tingling', name: 'Weakness or tingling/burning in arms or legs', critical: true },
  { id: 'severe_headache', name: 'Severe or increasing headache', critical: true },
  { id: 'seizure', name: 'Seizure or convulsion', critical: true },
  { id: 'loss_consciousness', name: 'Loss of consciousness', critical: true },
  { id: 'deteriorating_conscious', name: 'Deteriorating conscious state', critical: true },
  { id: 'vomiting', name: 'Vomiting', critical: true },
  { id: 'restlessness', name: 'Increasing restlessness, agitation or combativeness', critical: true },
];

export function getAssessmentQuestions() {
  return {
    red_flags: RED_FLAGS,
    symptoms: SCAT5_SYMPTOMS,
    instructions: {
      symptoms: 'Rate each symptom from 0 (none) to 6 (severe)',
      red_flags: 'Check if any of these warning signs are present',
    },
  };
}

export function evaluateAssessment(responses, strikeData = null) {
  const redFlagsPresent = [];
  for (const flag of responses.red_flags || []) {
    if (flag.present) {
      redFlagsPresent.push(flag.id);
    }
  }

  let symptomTotal = 0;
  let symptomSeverity = 0;
  const symptomDetails = [];

  for (const symptom of responses.symptoms || []) {
    const severity = symptom.severity || 0;
    if (severity > 0) {
      symptomTotal += 1;
      symptomSeverity += severity;
      const found = SCAT5_SYMPTOMS.find((s) => s.id === symptom.id);
      symptomDetails.push({
        id: symptom.id,
        name: found ? found.name : symptom.id,
        severity,
      });
    }
  }

  let strikeRiskModifier = 0;
  let strikeAnalysis = null;

  if (strikeData) {
    const impactCount = strikeData.impact_count || 0;
    const riskPercentage = strikeData.risk_percentage || 0;
    const maxForce = strikeData.max_single_impact_force || 0;
    const totalForce = strikeData.total_force_estimate || 0;
    const avgGForce = strikeData.avg_g_force || 0;

    if (impactCount >= 10 || riskPercentage > 60 || maxForce > 2000) {
      strikeRiskModifier = 3;
    } else if (impactCount >= 5 || riskPercentage > 35 || maxForce > 1500) {
      strikeRiskModifier = 2;
    } else if (impactCount >= 3 || riskPercentage > 15 || maxForce > 1000) {
      strikeRiskModifier = 1;
    }

    strikeAnalysis = {
      impact_count: impactCount,
      risk_percentage: riskPercentage,
      max_force: maxForce,
      total_force: totalForce,
      avg_g_force: avgGForce,
      strike_risk_level:
        strikeRiskModifier >= 3
          ? 'high'
          : strikeRiskModifier >= 2
            ? 'moderate'
            : strikeRiskModifier >= 1
              ? 'low'
              : 'minimal',
    };
  }

  const combinedSeverity = symptomSeverity + strikeRiskModifier * 15;
  const combinedSymptomCount = symptomTotal + strikeRiskModifier;

  let urgency, recommendation;

  if (redFlagsPresent.length > 0) {
    urgency = 'emergency';
    recommendation = 'EMERGENCY: Red flag symptoms detected. Seek immediate medical attention. Do not continue any physical activity.';
  } else if (combinedSeverity > 50 || combinedSymptomCount > 10 || (strikeRiskModifier >= 3 && symptomTotal > 0)) {
    urgency = 'high';
    if (strikeRiskModifier >= 2) {
      recommendation = 'HIGH CONCERN: Significant symptoms combined with high-impact strikes detected. Medical evaluation strongly recommended. The combination of symptoms and strike intensity increases concussion risk.';
    } else {
      recommendation = 'HIGH CONCERN: Significant symptoms present. Medical evaluation strongly recommended before any return to activity.';
    }
  } else if (combinedSeverity > 25 || combinedSymptomCount > 5 || (strikeRiskModifier >= 2 && symptomTotal > 0)) {
    urgency = 'moderate';
    if (strikeRiskModifier >= 1) {
      recommendation = 'MODERATE CONCERN: Notable symptoms combined with impact exposure. Rest and monitor closely. Medical evaluation recommended if symptoms persist or worsen.';
    } else {
      recommendation = 'MODERATE CONCERN: Notable symptoms present. Rest and monitor. Consider medical evaluation if symptoms persist or worsen.';
    }
  } else if (symptomTotal > 0 || strikeRiskModifier >= 2) {
    urgency = 'low';
    if (strikeRiskModifier >= 2 && symptomTotal === 0) {
      recommendation = 'LOW CONCERN: No current symptoms but significant impact exposure detected. Rest recommended and monitor for delayed symptom onset over the next 24-48 hours.';
    } else {
      recommendation = 'LOW CONCERN: Mild symptoms present. Rest recommended. Monitor symptoms and seek medical attention if they worsen.';
    }
  } else {
    urgency = 'none';
    recommendation = 'No concerning symptoms reported. However, symptoms can develop later. Continue to monitor and rest as appropriate.';
  }

  const result = {
    urgency_level: urgency,
    red_flags: redFlagsPresent,
    red_flags_count: redFlagsPresent.length,
    symptom_total: symptomTotal,
    symptom_severity_score: symptomSeverity,
    max_symptom_severity: 132,
    symptom_details: symptomDetails.sort((a, b) => b.severity - a.severity),
    recommendation,
    disclaimer: 'This is a screening tool only, not a medical diagnosis. A concussion should only be diagnosed by a qualified healthcare professional. Always seek professional medical evaluation after any suspected head injury.',
  };

  if (strikeAnalysis) {
    result.strike_analysis = strikeAnalysis;
    result.combined_risk_assessment = true;
  }

  return result;
}
