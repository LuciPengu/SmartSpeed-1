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

MEMORY_QUESTIONS = [
    {"id": "venue", "question": "What venue are we at today?", "category": "orientation"},
    {"id": "half", "question": "Which half/round is it now?", "category": "orientation"},
    {"id": "scored_last", "question": "Who scored/hit last in this match?", "category": "memory"},
    {"id": "last_opponent", "question": "What team/opponent did you face last week?", "category": "memory"},
    {"id": "win_last", "question": "Did your team win the last match?", "category": "memory"}
]

ORIENTATION_QUESTIONS = [
    {"id": "month", "question": "What month is it?", "points": 1},
    {"id": "date", "question": "What is the date today?", "points": 1},
    {"id": "day", "question": "What is the day of the week?", "points": 1},
    {"id": "year", "question": "What year is it?", "points": 1},
    {"id": "time", "question": "What time is it right now? (within 1 hour)", "points": 1}
]


def get_assessment_questions() -> Dict[str, Any]:
    return {
        "red_flags": RED_FLAGS,
        "symptoms": SCAT5_SYMPTOMS,
        "memory_questions": MEMORY_QUESTIONS,
        "orientation_questions": ORIENTATION_QUESTIONS,
        "instructions": {
            "symptoms": "Rate each symptom from 0 (none) to 6 (severe)",
            "red_flags": "Check if any of these warning signs are present",
            "memory": "Answer each question correctly (yes/no)",
            "orientation": "Answer each question correctly (yes/no)"
        }
    }


def evaluate_assessment(responses: Dict[str, Any]) -> Dict[str, Any]:
    
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
    
    orientation_score = 0
    for question in responses.get('orientation', []):
        if question.get('correct', False):
            orientation_score += 1
    
    memory_score = 0
    for question in responses.get('memory', []):
        if question.get('correct', False):
            memory_score += 1
    
    if red_flags_present:
        urgency = 'emergency'
        recommendation = 'EMERGENCY: Red flag symptoms detected. Seek immediate medical attention. Do not continue any physical activity.'
    elif symptom_severity > 50 or symptom_total > 10:
        urgency = 'high'
        recommendation = 'HIGH CONCERN: Significant symptoms present. Medical evaluation strongly recommended before any return to activity.'
    elif symptom_severity > 25 or symptom_total > 5 or orientation_score < 3:
        urgency = 'moderate'
        recommendation = 'MODERATE CONCERN: Notable symptoms present. Rest and monitor. Consider medical evaluation if symptoms persist or worsen.'
    elif symptom_total > 0:
        urgency = 'low'
        recommendation = 'LOW CONCERN: Mild symptoms present. Rest recommended. Monitor symptoms and seek medical attention if they worsen.'
    else:
        urgency = 'none'
        recommendation = 'No concerning symptoms reported. However, symptoms can develop later. Continue to monitor and rest as appropriate.'
    
    return {
        'urgency_level': urgency,
        'red_flags': red_flags_present,
        'red_flags_count': len(red_flags_present),
        'symptom_total': symptom_total,
        'symptom_severity_score': symptom_severity,
        'max_symptom_severity': 132,
        'symptom_details': sorted(symptom_details, key=lambda x: x['severity'], reverse=True),
        'orientation_score': orientation_score,
        'orientation_max': 5,
        'memory_score': memory_score,
        'memory_max': 5,
        'recommendation': recommendation,
        'disclaimer': 'This is a screening tool only, not a medical diagnosis. A concussion should only be diagnosed by a qualified healthcare professional. Always seek professional medical evaluation after any suspected head injury.'
    }
