import os
import replicate
from typing import Dict, Any, List, Generator

REPLICATE_API_TOKEN = os.environ.get("REPLICATE_API_TOKEN")

def generate_ai_summary_stream(risk_data: Dict[str, Any], fighter_settings: Dict[str, Any] = None) -> Generator[str, None, None]:  # type: ignore
    if not REPLICATE_API_TOKEN:
        yield "AI summary unavailable - API key not configured."
        return
    
    impact_details = risk_data.get('impact_details', [])
    overall_risk = risk_data.get('overall_risk', 'unknown')
    risk_percentage = risk_data.get('risk_percentage', 0)
    recommendation = risk_data.get('recommendation', '')
    impact_count = risk_data.get('impact_count', 0)
    total_force = risk_data.get('total_force_estimate', 0)
    max_force = risk_data.get('max_single_impact_force', 0)
    
    fighter_info = ""
    if fighter_settings:
        f1 = fighter_settings.get('fighter1', {})
        f2 = fighter_settings.get('fighter2', {})
        fighter_info = f"""
Fighter 1: {f1.get('skill', 'Professional')} level, {f1.get('weight', 75)}kg
Fighter 2: {f2.get('skill', 'Professional')} level, {f2.get('weight', 75)}kg
"""
    
    impacts_summary = []
    for i, impact in enumerate(impact_details[:5], 1):
        impacts_summary.append(
            f"Impact {i}: {impact.get('hand', 'unknown')} hand at {impact.get('time', 0):.2f}s, "
            f"speed {impact.get('speed_min', 0)}-{impact.get('speed_max', 0)} mph, "
            f"force {impact.get('force_min', 0)}-{impact.get('force_max', 0)} N, "
            f"G-force: {impact.get('g_force', 0):.1f}g, risk: {impact.get('risk_level', 'unknown')}"
        )
    
    prompt = f"""You are a sports medicine AI assistant specializing in combat sports injury analysis. Analyze the following sparring session data and provide a brief, actionable summary.

SESSION DATA:
{fighter_info}
Total impacts detected: {impact_count}
Overall risk level: {overall_risk}
Cumulative injury probability: {risk_percentage:.1f}%
Total estimated force: {total_force:.0f} N
Maximum single impact force: {max_force:.0f} N

TOP IMPACTS:
{chr(10).join(impacts_summary) if impacts_summary else "No significant impacts detected"}

SYSTEM RECOMMENDATION: {recommendation}

Provide a 3-4 sentence personalized analysis that:
1. Summarizes the key risks observed
2. Explains what the force levels mean for brain health
3. Gives specific recovery advice
4. Mentions any warning signs to watch for

Be concise, professional, and focus on actionable guidance. Do not use markdown formatting."""

    try:
        for event in replicate.stream(
            "openai/gpt-4o",
            input={
                "top_p": 1,
                "prompt": prompt,
                "messages": [],
                "image_input": [],
                "temperature": 0.7,
                "system_prompt": "You are a sports medicine expert specializing in combat sports and brain injury prevention. Provide concise, professional medical guidance.",
                "presence_penalty": 0,
                "frequency_penalty": 0,
                "max_completion_tokens": 500
            },
        ):
            chunk = str(event) if event else ""
            if chunk and chunk != "None":
                yield chunk
    except Exception as e:
        yield f"Error generating AI summary: {str(e)}"

def generate_ai_summary(risk_data: Dict[str, Any], fighter_settings: Dict[str, Any] = None) -> str:  # type: ignore
    result = ""
    for chunk in generate_ai_summary_stream(risk_data, fighter_settings):
        result += chunk
    return result
