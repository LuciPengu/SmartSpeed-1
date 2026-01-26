from typing import List, Dict, Any, Optional
import math

def calculate_brain_injury_risk(impacts: List[Dict[str, Any]], fighter_settings: Optional[Dict] = None) -> Dict[str, Any]:
    
    if not impacts:
        return {
            'overall_risk': 'low',
            'risk_percentage': 0,
            'total_force_estimate': 0,
            'impact_details': [],
            'recommendation': 'No significant impacts detected.'
        }
    
    impact_details = []
    total_force = 0
    max_force = 0
    
    for impact in impacts:
        fighter_idx = impact.get('fighter', 1)
        
        if fighter_settings:
            fighter_key = f'fighter{fighter_idx}'
            settings = fighter_settings.get(fighter_key, {'weight': 75, 'skill': 'professional'})
            puncher_weight = settings.get('weight', 75)
        else:
            puncher_weight = impact.get('fighter_weight', 75)
        
        speed_range = impact.get('speed_range')
        power_range = impact.get('power_range')
        
        if speed_range:
            speed_min = speed_range.get('min', 20)
            speed_max = speed_range.get('max', 30)
            avg_speed_mph = (speed_min + speed_max) / 2
        else:
            avg_speed_mph = 25
            speed_min = 20
            speed_max = 30
        
        if power_range:
            force_min = power_range.get('min', 200)
            force_max = power_range.get('max', 400)
            avg_force = (force_min + force_max) / 2
        else:
            mph_to_ms = 0.44704
            avg_speed_ms = avg_speed_mph * mph_to_ms
            effective_mass = puncher_weight * 0.04
            contact_time = 0.01
            avg_force = (effective_mass * avg_speed_ms) / contact_time
            force_min = avg_force * 0.8
            force_max = avg_force * 1.2
        
        # G-force = Force / (head_mass * gravity)
        # Average adult head mass is ~4.5-5 kg
        head_mass_kg = 4.5
        g_force = avg_force / (head_mass_kg * 9.81)
        
        motion_intensity = impact.get('motion_intensity', 0.7)
        severity_multiplier = 0.8 + (motion_intensity * 0.4)
        
        adjusted_force = avg_force * severity_multiplier
        
        total_force += adjusted_force
        max_force = max(max_force, adjusted_force)
        
        if g_force > 100:
            impact_risk = 'high'
            injury_probability = min(95, 50 + (g_force - 100) * 0.5)
        elif g_force > 60:
            impact_risk = 'moderate'
            injury_probability = 20 + (g_force - 60) * 0.75
        elif g_force > 30:
            impact_risk = 'low-moderate'
            injury_probability = 5 + (g_force - 30) * 0.5
        else:
            impact_risk = 'low'
            injury_probability = g_force * 0.15
        
        impact_details.append({
            'id': impact.get('id'),
            'frame': impact.get('frame'),
            'time': impact.get('time'),
            'hand': impact.get('hand'),
            'speed_min': int(speed_min),
            'speed_max': int(speed_max),
            'force_min': int(force_min),
            'force_max': int(force_max),
            'estimated_force_newtons': round(adjusted_force, 2),
            'g_force': round(g_force, 2),
            'risk_level': impact_risk,
            'injury_probability': round(min(100, injury_probability), 1),
            'motion_intensity': motion_intensity
        })
    
    cumulative_probability = 0
    for detail in impact_details:
        remaining = 100 - cumulative_probability
        contribution = (remaining * detail['injury_probability']) / 100
        cumulative_probability += contribution
    
    cumulative_probability = min(95, cumulative_probability)
    
    if cumulative_probability > 70:
        overall_risk = 'critical'
        recommendation = 'URGENT: Immediate medical evaluation recommended. Multiple high-force impacts detected. Stop all activity and seek professional assessment.'
    elif cumulative_probability > 50:
        overall_risk = 'high'
        recommendation = 'HIGH CONCERN: Significant impact forces detected. Rest recommended. Consider medical evaluation before continuing training.'
    elif cumulative_probability > 25:
        overall_risk = 'moderate'
        recommendation = 'MODERATE: Notable impacts detected. Monitor for symptoms. Rest advised for at least 24-48 hours.'
    elif cumulative_probability > 10:
        overall_risk = 'low-moderate'
        recommendation = 'LOW-MODERATE: Some impact forces detected. Standard post-sparring rest recommended. Monitor for any unusual symptoms.'
    else:
        overall_risk = 'low'
        recommendation = 'LOW: Minimal impact forces detected. Standard recovery protocols apply.'
    
    return {
        'overall_risk': overall_risk,
        'risk_percentage': round(cumulative_probability, 1),
        'total_force_estimate': round(total_force, 2),
        'max_single_impact_force': round(max_force, 2),
        'impact_count': len(impacts),
        'impact_details': impact_details,
        'recommendation': recommendation,
        'disclaimer': 'This is an estimation tool only. Speed and force values are based on typical ranges for the selected skill level. Always consult a healthcare professional for proper assessment.'
    }


def calculate_single_impact_risk(velocity: float, acceleration: float, 
                                  power_index: float, puncher_weight_kg: float) -> Dict[str, Any]:
    
    velocity_mps = velocity * 0.3
    force_estimate = puncher_weight_kg * velocity_mps * (1 + (acceleration / 100))
    # G-force = Force / (head_mass * gravity)
    head_mass_kg = 4.5
    g_force = force_estimate / (head_mass_kg * 9.81)
    
    if power_index > 2000:
        severity_multiplier = 1.5
    elif power_index > 1000:
        severity_multiplier = 1.2
    else:
        severity_multiplier = 1.0
    
    adjusted_force = force_estimate * severity_multiplier
    
    if g_force > 100:
        risk_level = 'high'
        injury_probability = min(95, 50 + (g_force - 100) * 0.5)
    elif g_force > 60:
        risk_level = 'moderate'
        injury_probability = 20 + (g_force - 60) * 0.75
    elif g_force > 30:
        risk_level = 'low-moderate'
        injury_probability = 5 + (g_force - 30) * 0.5
    else:
        risk_level = 'low'
        injury_probability = g_force * 0.15
    
    return {
        'estimated_force_newtons': round(adjusted_force, 2),
        'g_force': round(g_force, 2),
        'risk_level': risk_level,
        'injury_probability': round(min(100, injury_probability), 1)
    }
