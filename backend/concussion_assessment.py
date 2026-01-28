from typing import Dict, Any, List

SCAT5_SYMPTOMS = [
    {"id": "headache", "name": "Headache", "category": "physical"},
    {"id": "pressure_head", "name": "Pressure in head", "category": "physical"},
    {"id": "neck_pain", "name": "Neck pain", "category": "physical"},
    {"id": "nausea", "name": "Nausea or vomiting", "category": "physical"},
    {"id": "dizziness", "name": "Dizziness", "category": "physical"},
    {"id": "blurred_vision", "name": "Blurred vision", "category": "physical"},
    {"id": "balance_problems", "name": "Balance problems", "category": "physical"},
    {"id": "light_sensitivity", "name": "Sensitivity to light", "category": "physical"},
    {"id": "noise_sensitivity", "name": "Sensitivity to noise", "category": "physical"},
    {"id": "feeling_slowed", "name": "Feeling slowed down", "category": "cognitive"},
    {"id": "feeling_foggy", "name": "Feeling like 'in a fog'", "category": "cognitive"},
    {"id": "not_feeling_right", "name": "Don't feel right", "category": "cognitive"},
    {"id": "difficulty_concentrating", "name": "Difficulty concentrating", "category": "cognitive"},
    {"id": "difficulty_remembering", "name": "Difficulty remembering", "category": "cognitive"},
    {"id": "fatigue", "name": "Fatigue or low energy", "category": "physical"},
    {"id": "confusion", "name": "Confusion", "category": "cognitive"},
    {"id": "drowsiness", "name": "Drowsiness", "category": "physical"},
    {"id": "trouble_sleeping", "name": "Trouble falling asleep", "category": "sleep"},
    {"id": "more_emotional", "name": "More emotional", "category": "emotional"},
    {"id": "irritability", "name": "Irritability", "category": "emotional"},
    {"id": "sadness", "name": "Sadness", "category": "emotional"},
    {"id": "nervous_anxious", "name": "Nervous or anxious", "category": "emotional"}
]

RED_FLAGS = [
    {"id": "neck_pain_severe", "name": "Severe or increasing neck pain", "critical": True},
    {"id": "double_vision", "name": "Double vision", "critical": True},
    {"id": "weakness_tingling", "name": "Weakness or tingling/burning in arms or legs", "critical": True},
    {"id": "severe_headache", "name": "Severe or increasing headache", "critical": True},
    {"id": "seizure", "name": "Seizure or convulsion", "critical": True},
    {"id": "loss_consciousness", "name": "Loss of consciousness", "critical": True},
    {"id": "deteriorating_conscious", "name": "Deteriorating conscious state", "critical": True},
    {"id": "vomiting", "name": "Vomiting", "critical": True},
    {"id": "restlessness", "name": "Increasing restlessness, agitation or combativeness", "critical": True}
]

def get_assessment_questions() -> Dict[str, Any]:
    return {
        "red_flags": RED_FLAGS,
        "symptoms": SCAT5_SYMPTOMS,
        "instructions": {
            "symptoms": "Rate each symptom from 0 (none) to 6 (severe)",
            "red_flags": "Check if any of these warning signs are present"
        }
    }


def evaluate_assessment(responses: Dict[str, Any], strike_data: Dict[str, Any] = None) -> Dict[str, Any]:
    
    red_flags_present = []
    for flag in responses.get('red_flags', []):
        if flag.get('present', False):
            red_flags_present.append(flag.get('id'))
    
    symptom_total = 0
    symptom_severity = 0
    symptom_details = []
    
    for symptom in responses.get('symptoms', []):
        severity = symptom.get('severity', 0)
        if severity > 0:
            symptom_total += 1
            symptom_severity += severity
            symptom_details.append({
                'id': symptom.get('id'),
                'name': next((s['name'] for s in SCAT5_SYMPTOMS if s['id'] == symptom.get('id')), symptom.get('id')),
                'severity': severity
            })
    
    strike_risk_modifier = 0
    strike_analysis = None
    
    if strike_data:
        impact_count = strike_data.get('impact_count', 0)
        risk_percentage = strike_data.get('risk_percentage', 0)
        max_force = strike_data.get('max_single_impact_force', 0)
        total_force = strike_data.get('total_force_estimate', 0)
        avg_g_force = strike_data.get('avg_g_force', 0)
        
        if impact_count >= 10 or risk_percentage > 60 or max_force > 2000:
            strike_risk_modifier = 3
        elif impact_count >= 5 or risk_percentage > 35 or max_force > 1500:
            strike_risk_modifier = 2
        elif impact_count >= 3 or risk_percentage > 15 or max_force > 1000:
            strike_risk_modifier = 1
        
        strike_analysis = {
            'impact_count': impact_count,
            'risk_percentage': risk_percentage,
            'max_force': max_force,
            'total_force': total_force,
            'avg_g_force': avg_g_force,
            'strike_risk_level': 'high' if strike_risk_modifier >= 3 else 'moderate' if strike_risk_modifier >= 2 else 'low' if strike_risk_modifier >= 1 else 'minimal'
        }
    
    combined_severity = symptom_severity + (strike_risk_modifier * 15)
    combined_symptom_count = symptom_total + strike_risk_modifier
    
    if red_flags_present:
        urgency = 'emergency'
        recommendation = 'EMERGENCY: Red flag symptoms detected. Seek immediate medical attention. Do not continue any physical activity.'
    elif combined_severity > 50 or combined_symptom_count > 10 or (strike_risk_modifier >= 3 and symptom_total > 0):
        urgency = 'high'
        if strike_risk_modifier >= 2:
            recommendation = 'HIGH CONCERN: Significant symptoms combined with high-impact strikes detected. Medical evaluation strongly recommended. The combination of symptoms and strike intensity increases concussion risk.'
        else:
            recommendation = 'HIGH CONCERN: Significant symptoms present. Medical evaluation strongly recommended before any return to activity.'
    elif combined_severity > 25 or combined_symptom_count > 5 or (strike_risk_modifier >= 2 and symptom_total > 0):
        urgency = 'moderate'
        if strike_risk_modifier >= 1:
            recommendation = 'MODERATE CONCERN: Notable symptoms combined with impact exposure. Rest and monitor closely. Medical evaluation recommended if symptoms persist or worsen.'
        else:
            recommendation = 'MODERATE CONCERN: Notable symptoms present. Rest and monitor. Consider medical evaluation if symptoms persist or worsen.'
    elif symptom_total > 0 or strike_risk_modifier >= 2:
        urgency = 'low'
        if strike_risk_modifier >= 2 and symptom_total == 0:
            recommendation = 'LOW CONCERN: No current symptoms but significant impact exposure detected. Rest recommended and monitor for delayed symptom onset over the next 24-48 hours.'
        else:
            recommendation = 'LOW CONCERN: Mild symptoms present. Rest recommended. Monitor symptoms and seek medical attention if they worsen.'
    else:
        urgency = 'none'
        recommendation = 'No concerning symptoms reported. However, symptoms can develop later. Continue to monitor and rest as appropriate.'
    
    result = {
        'urgency_level': urgency,
        'red_flags': red_flags_present,
        'red_flags_count': len(red_flags_present),
        'symptom_total': symptom_total,
        'symptom_severity_score': symptom_severity,
        'max_symptom_severity': 132,
        'symptom_details': sorted(symptom_details, key=lambda x: x['severity'], reverse=True),
        'recommendation': recommendation,
        'disclaimer': 'This is a screening tool only, not a medical diagnosis. A concussion should only be diagnosed by a qualified healthcare professional. Always seek professional medical evaluation after any suspected head injury.'
    }
    
    if strike_analysis:
        result['strike_analysis'] = strike_analysis
        result['combined_risk_assessment'] = True
    
    return result
