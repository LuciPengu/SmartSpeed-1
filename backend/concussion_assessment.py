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

MEMORY_WORD_LISTS = [
    ["elbow", "apple", "carpet", "saddle", "bubble"],
    ["candle", "paper", "sugar", "sandwich", "wagon"],
    ["baby", "monkey", "perfume", "sunset", "iron"],
    ["finger", "penny", "blanket", "lemon", "insect"]
]

ORIENTATION_QUESTIONS = [
    {"id": "month", "question": "What month is it?", "input_type": "select", 
     "options": ["January", "February", "March", "April", "May", "June", 
                 "July", "August", "September", "October", "November", "December"]},
    {"id": "date", "question": "What is today's date (day of month)?", "input_type": "number", "min": 1, "max": 31},
    {"id": "day", "question": "What day of the week is it?", "input_type": "select",
     "options": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]},
    {"id": "year", "question": "What year is it?", "input_type": "number", "min": 2020, "max": 2030}
]


def get_assessment_questions() -> Dict[str, Any]:
    from datetime import datetime
    
    now = datetime.now()
    correct_answers = {
        "month": now.strftime("%B"),
        "date": now.day,
        "day": now.strftime("%A"),
        "year": now.year
    }
    
    return {
        "red_flags": RED_FLAGS,
        "symptoms": SCAT5_SYMPTOMS,
        "orientation_questions": ORIENTATION_QUESTIONS,
        "correct_answers": correct_answers,
        "instructions": {
            "symptoms": "Rate each symptom from 0 (none) to 6 (severe) based on how you feel RIGHT NOW",
            "red_flags": "Check if you are experiencing any of these warning signs",
            "orientation": "Answer each question to the best of your ability"
        }
    }


def get_memory_test_words() -> Dict[str, Any]:
    import random
    word_list = random.choice(MEMORY_WORD_LISTS)
    return {
        "words": word_list,
        "instructions": "You will be shown 5 words for 10 seconds. Try to memorize them. You will then be asked to recall them."
    }


def evaluate_assessment(responses: Dict[str, Any]) -> Dict[str, Any]:
    from datetime import datetime
    
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
    
    now = datetime.now()
    correct_answers = {
        "month": now.strftime("%B"),
        "date": now.day,
        "day": now.strftime("%A"),
        "year": now.year
    }
    
    orientation_score = 0
    for answer in responses.get('orientation', []):
        q_id = answer.get('id')
        user_answer = answer.get('answer')
        if q_id in correct_answers:
            correct = correct_answers[q_id]
            if q_id in ['date', 'year']:
                try:
                    if int(user_answer) == int(correct):
                        orientation_score += 1
                except:
                    pass
            else:
                if str(user_answer).lower() == str(correct).lower():
                    orientation_score += 1
    
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
        'orientation_max': 4,
        'recommendation': recommendation,
        'disclaimer': 'This is a screening tool only, not a medical diagnosis. A concussion should only be diagnosed by a qualified healthcare professional. Always seek professional medical evaluation after any suspected head injury.'
    }


def evaluate_memory_test(recalled_words: List[str], original_words: List[str], baseline_score: int | None = None) -> Dict[str, Any]:
    original_set = set(w.lower() for w in original_words)
    correct_count = 0
    
    for word in recalled_words:
        if word.lower().strip() in original_set:
            correct_count += 1
    
    result = {
        'current_score': correct_count,
        'max_score': len(original_words),
        'words_recalled': recalled_words,
        'original_words': original_words
    }
    
    if baseline_score is not None:
        result['baseline_score'] = baseline_score
        result['score_difference'] = correct_count - baseline_score
        
        if correct_count >= baseline_score:
            result['comparison'] = 'at_or_above_baseline'
            result['memory_status'] = 'Your memory performance is at or above your baseline level.'
        elif correct_count >= baseline_score - 1:
            result['comparison'] = 'slightly_below_baseline'
            result['memory_status'] = 'Your memory performance is slightly below your baseline. This may be normal variation, but monitor for other symptoms.'
        else:
            result['comparison'] = 'below_baseline'
            result['memory_status'] = 'Your memory performance is notably below your baseline. This could indicate cognitive effects from impact. Consider medical evaluation.'
    else:
        result['baseline_score'] = None
        result['comparison'] = 'no_baseline'
        result['memory_status'] = 'No baseline available for comparison. Consider creating a baseline when you are healthy and well-rested.'
    
    return result
