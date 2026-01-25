let currentSession = null;
let selectedImpacts = new Set();
let assessmentData = null;
let assessmentResult = null;
let riskData = null;
let currentUser = null;
let aiSummaryText = '';
let conversationHistory = [];
let fighterSettings = {
    fighter1: { skill: 'professional', weight: 75, intensity: 70 },
    fighter2: { skill: 'professional', weight: 75, intensity: 70 }
};

const SKILL_SPEED_RANGES = {
    beginner: { min: 12, max: 18, avg: 15 },
    amateur: { min: 18, max: 28, avg: 23 },
    professional: { min: 24, max: 35, avg: 29 },
    elite: { min: 30, max: 45, avg: 37 }
};

const RANKS = [
    { name: 'Rookie', icon: '🥉', minScore: 0 },
    { name: 'Contender', icon: '🥈', minScore: 40 },
    { name: 'Champion', icon: '🥇', minScore: 60 },
    { name: 'Elite', icon: '💎', minScore: 80 },
    { name: 'Legend', icon: '👑', minScore: 95 }
];

const BADGE_ICONS = {
    first_strike: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>',
    iron_chin: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
    quick_recovery: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
    thorough: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>',
    safety_first: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>',
    warrior: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"></path><path d="M13 19l6-6"></path><path d="M16 16l4 4"></path><path d="M19 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path></svg>'
};

const BADGES = [
    { id: 'first_analysis', name: 'First Strike', iconKey: 'first_strike', condition: () => true },
    { id: 'no_symptoms', name: 'Iron Chin', iconKey: 'iron_chin', condition: (data) => data.symptomCount === 0 },
    { id: 'quick_recovery', name: 'Quick Recovery', iconKey: 'quick_recovery', condition: (data) => data.urgency === 'none' || data.urgency === 'low' },
    { id: 'thorough', name: 'Thorough Check', iconKey: 'thorough', condition: (data) => data.impactCount >= 3 },
    { id: 'safety_first', name: 'Safety First', iconKey: 'safety_first', condition: (data) => data.safetyScore >= 80 },
    { id: 'warrior', name: 'Warrior Spirit', iconKey: 'warrior', condition: (data) => data.impactCount >= 5 }
];

function calculateSafetyScore() {
    if (!assessmentResult) return 50;
    
    let score = 100;
    
    score -= (assessmentResult.symptom_total || 0) * 3;
    score -= (assessmentResult.symptom_severity_score || 0) * 0.5;
    
    if ((assessmentResult.red_flags_count || 0) > 0) score -= 40;
    
    const orientationMax = assessmentResult.orientation_max || 5;
    const memoryMax = assessmentResult.memory_max || 5;
    score += ((assessmentResult.orientation_score || 0) / orientationMax) * 10;
    score += ((assessmentResult.memory_score || 0) / memoryMax) * 10;
    
    const urgencyPenalty = {
        'none': 0,
        'low': 5,
        'moderate': 15,
        'high': 30,
        'emergency': 50
    };
    score -= urgencyPenalty[assessmentResult.urgency_level] || 0;
    
    return Math.max(0, Math.min(100, Math.round(score)));
}

function getRank(score) {
    let currentRank = RANKS[0];
    for (const rank of RANKS) {
        if (score >= rank.minScore) {
            currentRank = rank;
        }
    }
    return currentRank;
}

function getEarnedBadges() {
    const data = {
        symptomCount: assessmentResult?.symptom_total || 0,
        urgency: assessmentResult?.urgency_level || 'none',
        impactCount: riskData?.impact_count || 0,
        safetyScore: calculateSafetyScore()
    };
    
    return BADGES.filter(badge => badge.condition(data));
}

function animateNumber(element, endValue, duration = 1000, suffix = '') {
    const startValue = 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(startValue + (endValue - startValue) * easeProgress);
        element.textContent = currentValue + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function showFloatingPoints(x, y, text) {
    const points = document.createElement('div');
    points.className = 'floating-points';
    points.textContent = text;
    points.style.left = x + 'px';
    points.style.top = y + 'px';
    document.body.appendChild(points);
    
    setTimeout(() => points.remove(), 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    initializeUpload();
    initializeFighterSettings();
    initializeAuth();
    loadUserFromStorage();
});

function initializeFighterSettings() {
    document.getElementById('fighter1-skill').addEventListener('change', (e) => {
        fighterSettings.fighter1.skill = e.target.value;
    });
    document.getElementById('fighter1-weight').addEventListener('change', (e) => {
        fighterSettings.fighter1.weight = parseFloat(e.target.value) || 75;
    });
    document.getElementById('fighter1-intensity').addEventListener('input', (e) => {
        fighterSettings.fighter1.intensity = parseInt(e.target.value);
        document.getElementById('fighter1-intensity-value').textContent = e.target.value + '%';
    });
    document.getElementById('fighter2-skill').addEventListener('change', (e) => {
        fighterSettings.fighter2.skill = e.target.value;
    });
    document.getElementById('fighter2-weight').addEventListener('change', (e) => {
        fighterSettings.fighter2.weight = parseFloat(e.target.value) || 75;
    });
    document.getElementById('fighter2-intensity').addEventListener('input', (e) => {
        fighterSettings.fighter2.intensity = parseInt(e.target.value);
        document.getElementById('fighter2-intensity-value').textContent = e.target.value + '%';
    });
}

function initializeUpload() {
    const uploadArea = document.getElementById('upload-area');
    const videoInput = document.getElementById('video-input');

    uploadArea.addEventListener('click', () => videoInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    });

    videoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFileUpload(file);
    });
}

const MAX_FILE_SIZE_MB = 50;

function validateFighterSettings() {
    const f1Weight = parseFloat(document.getElementById('fighter1-weight').value);
    const f2Weight = parseFloat(document.getElementById('fighter2-weight').value);
    
    if (isNaN(f1Weight) || f1Weight < 40 || f1Weight > 200) {
        alert('Fighter 1 weight must be between 40 and 200 kg');
        return false;
    }
    if (isNaN(f2Weight) || f2Weight < 40 || f2Weight > 200) {
        alert('Fighter 2 weight must be between 40 and 200 kg');
        return false;
    }
    
    fighterSettings.fighter1.skill = document.getElementById('fighter1-skill').value;
    fighterSettings.fighter1.weight = f1Weight;
    fighterSettings.fighter1.intensity = parseInt(document.getElementById('fighter1-intensity').value) || 70;
    fighterSettings.fighter2.skill = document.getElementById('fighter2-skill').value;
    fighterSettings.fighter2.weight = f2Weight;
    fighterSettings.fighter2.intensity = parseInt(document.getElementById('fighter2-intensity').value) || 70;
    
    return true;
}

async function handleFileUpload(file) {
    if (!currentUser) {
        alert('Please sign in before starting an analysis. Click the Sign In button in the top right corner.');
        return;
    }
    
    const validTypes = ['.mp4', '.avi', '.mov', '.mkv'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(fileExt)) {
        alert('Please upload a valid video file (MP4, AVI, MOV, or MKV)');
        return;
    }
    
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
        alert(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB. Your file is ${fileSizeMB.toFixed(1)}MB.`);
        return;
    }

    if (!validateFighterSettings()) {
        return;
    }

    const uploadArea = document.getElementById('upload-area');
    const progressContainer = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    uploadArea.classList.add('hidden');
    progressContainer.classList.remove('hidden');

    progressFill.style.width = '30%';
    progressText.textContent = 'Uploading video...';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fighter_settings', JSON.stringify(fighterSettings));

    try {
        progressFill.style.width = '50%';
        progressText.textContent = 'Analyzing video for punch impacts...';

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Upload failed');
        }

        progressFill.style.width = '100%';
        progressText.textContent = 'Analysis complete!';

        const data = await response.json();
        currentSession = data;

        setTimeout(() => showStep2(data), 500);

    } catch (error) {
        alert('Error: ' + error.message);
        uploadArea.classList.remove('hidden');
        progressContainer.classList.add('hidden');
    }
}

function calculateSpeedRange(impact, fighterIdx) {
    const settings = fighterIdx === 1 ? fighterSettings.fighter1 : fighterSettings.fighter2;
    const skillRanges = SKILL_SPEED_RANGES[settings.skill];
    
    const motionIntensity = Math.min(1, impact.motion_intensity || 0.7);
    const throwingIntensity = (settings.intensity || 70) / 100;
    const combinedIntensity = motionIntensity * throwingIntensity;
    
    const baseMin = skillRanges.min + (skillRanges.avg - skillRanges.min) * combinedIntensity * 0.5;
    const baseMax = skillRanges.min + (skillRanges.max - skillRanges.min) * combinedIntensity;
    
    const seedVal = (impact.id || 1) * (impact.frame || 1) * (fighterIdx + 1);
    const pseudoRandom1 = Math.sin(seedVal * 12.9898) * 43758.5453 % 1;
    const pseudoRandom2 = Math.sin(seedVal * 78.233) * 43758.5453 % 1;
    const variationMin = (Math.abs(pseudoRandom1) - 0.5) * 4;
    const variationMax = (Math.abs(pseudoRandom2) - 0.5) * 6;
    
    const adjustedMin = baseMin + variationMin;
    const adjustedMax = baseMax + variationMax;
    
    return {
        min: Math.round(Math.max(skillRanges.min * 0.8, adjustedMin)),
        max: Math.round(Math.min(skillRanges.max * 1.1, adjustedMax)),
        unit: 'mph'
    };
}

function calculatePowerRange(impact, fighterIdx) {
    const settings = fighterIdx === 1 ? fighterSettings.fighter1 : fighterSettings.fighter2;
    const speedRange = calculateSpeedRange(impact, fighterIdx);
    
    const mphToMs = 0.44704;
    const minSpeed = speedRange.min * mphToMs;
    const maxSpeed = speedRange.max * mphToMs;
    
    const effectiveMass = settings.weight * 0.04;
    
    const seedVal = (impact.id || 1) * (impact.frame || 1) * (fighterIdx + 1);
    const pseudoRandom = Math.sin(seedVal * 34.567) * 43758.5453 % 1;
    const contactTimeVariation = 0.008 + Math.abs(pseudoRandom) * 0.004;
    
    const minForce = (effectiveMass * minSpeed) / contactTimeVariation;
    const maxForce = (effectiveMass * maxSpeed) / contactTimeVariation;
    
    return {
        min: Math.round(minForce),
        max: Math.round(maxForce),
        unit: 'N'
    };
}

function showStep2(data) {
    document.getElementById('step-1').classList.add('hidden');
    document.getElementById('step-2').classList.remove('hidden');

    const summaryHtml = `
        <div class="summary-item">
            <div class="summary-value">${data.impact_count}</div>
            <div class="summary-label">Impacts Detected</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${data.duration.toFixed(2)}s</div>
            <div class="summary-label">Video Duration</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${data.total_frames}</div>
            <div class="summary-label">Total Frames</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${data.fps.toFixed(1)}</div>
            <div class="summary-label">FPS</div>
        </div>
    `;
    document.getElementById('results-summary').innerHTML = summaryHtml;

    const impactsGrid = document.getElementById('impacts-grid');
    
    if (data.impacts.length === 0) {
        impactsGrid.innerHTML = '<p>No punch impacts were detected in this video. Try uploading a different video with clearer fighting footage.</p>';
        document.getElementById('continue-to-assessment-btn').disabled = false;
        document.getElementById('continue-to-assessment-btn').addEventListener('click', continueToAssessment);
        return;
    }

    impactsGrid.innerHTML = data.impacts.map(impact => {
        return `
            <div class="impact-card" data-id="${impact.id}" onclick="toggleImpact(${impact.id}, event)">
                <img src="${impact.image_path}" alt="Impact ${impact.id}">
                <div class="impact-info">
                    <div class="impact-title">
                        <span>Fighter ${impact.fighter} - Frame ${impact.frame}</span>
                        <span class="impact-hand">${impact.hand}</span>
                    </div>
                    <div class="impact-stats">
                        <div>Time: <span class="impact-stat-value">${impact.time.toFixed(2)}s</span></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('continue-to-assessment-btn').addEventListener('click', continueToAssessment);
}

function toggleImpact(id, event) {
    const card = document.querySelector(`.impact-card[data-id="${id}"]`);
    
    if (selectedImpacts.has(id)) {
        selectedImpacts.delete(id);
        card.classList.remove('selected');
        card.style.transform = 'scale(0.95)';
        setTimeout(() => card.style.transform = '', 150);
    } else {
        selectedImpacts.add(id);
        card.classList.add('selected');
        card.style.transform = 'scale(1.05)';
        setTimeout(() => card.style.transform = '', 150);
        
        if (event) {
            const rect = card.getBoundingClientRect();
            showFloatingPoints(rect.left + rect.width / 2, rect.top, '+1');
        }
    }

    document.getElementById('continue-to-assessment-btn').disabled = selectedImpacts.size === 0;
}

async function continueToAssessment() {
    if (selectedImpacts.size > 0) {
        const selectedImpactData = currentSession.impacts
            .filter(i => selectedImpacts.has(i.id))
            .map(impact => {
                const speedRange = calculateSpeedRange(impact, impact.fighter);
                const powerRange = calculatePowerRange(impact, impact.fighter);
                return {
                    ...impact,
                    speed_range: speedRange,
                    power_range: powerRange,
                    fighter_weight: impact.fighter === 1 ? fighterSettings.fighter1.weight : fighterSettings.fighter2.weight
                };
            });

        try {
            const response = await fetch('/api/calculate-risk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: currentSession.session_id,
                    selected_impact_ids: Array.from(selectedImpacts),
                    impact_data: selectedImpactData,
                    fighter_settings: fighterSettings
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Calculation failed');
            }

            riskData = await response.json();
        } catch (error) {
            alert('Error calculating risk: ' + error.message);
            return;
        }
    }

    try {
        const response = await fetch('/api/concussion-assessment');
        assessmentData = await response.json();
        showStep3();
    } catch (error) {
        alert('Error loading assessment: ' + error.message);
    }
}

function showStep3() {
    document.getElementById('step-2').classList.add('hidden');
    document.getElementById('step-3').classList.remove('hidden');

    document.getElementById('red-flags-list').innerHTML = assessmentData.red_flags.map(flag => `
        <div class="red-flag-item">
            <input type="checkbox" id="flag-${flag.id}" data-id="${flag.id}">
            <label for="flag-${flag.id}">${flag.name}</label>
        </div>
    `).join('');

    document.getElementById('symptoms-list').innerHTML = assessmentData.symptoms.map(symptom => `
        <div class="symptom-item">
            <span>${symptom.name}</span>
            <div class="symptom-slider">
                <input type="range" min="0" max="6" value="0" 
                       id="symptom-${symptom.id}" 
                       data-id="${symptom.id}"
                       oninput="updateSymptomValue('${symptom.id}')">
                <span class="symptom-value" id="symptom-value-${symptom.id}">0</span>
            </div>
        </div>
    `).join('');

    document.getElementById('orientation-list').innerHTML = assessmentData.orientation_questions.map(q => `
        <div class="question-item">
            <span>${q.question}</span>
            <div class="question-toggle">
                <button class="toggle-btn" data-id="${q.id}" data-correct="true" onclick="toggleQuestion(this, '${q.id}', 'orientation')">Correct</button>
                <button class="toggle-btn incorrect" data-id="${q.id}" data-correct="false" onclick="toggleQuestion(this, '${q.id}', 'orientation')">Incorrect</button>
            </div>
        </div>
    `).join('');

    document.getElementById('memory-list').innerHTML = assessmentData.memory_questions.map(q => `
        <div class="question-item">
            <span>${q.question}</span>
            <div class="question-toggle">
                <button class="toggle-btn" data-id="${q.id}" data-correct="true" onclick="toggleQuestion(this, '${q.id}', 'memory')">Correct</button>
                <button class="toggle-btn incorrect" data-id="${q.id}" data-correct="false" onclick="toggleQuestion(this, '${q.id}', 'memory')">Incorrect</button>
            </div>
        </div>
    `).join('');

    document.getElementById('submit-assessment-btn').addEventListener('click', submitAssessment);
}

function updateSymptomValue(id) {
    const slider = document.getElementById(`symptom-${id}`);
    const valueDisplay = document.getElementById(`symptom-value-${id}`);
    valueDisplay.textContent = slider.value;
}

function toggleQuestion(btn, id, section) {
    const siblings = btn.parentElement.querySelectorAll('.toggle-btn');
    siblings.forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
}

async function submitAssessment() {
    const redFlags = Array.from(document.querySelectorAll('#red-flags-list input[type="checkbox"]')).map(cb => ({
        id: cb.dataset.id,
        present: cb.checked
    }));

    const symptoms = Array.from(document.querySelectorAll('#symptoms-list input[type="range"]')).map(slider => ({
        id: slider.dataset.id,
        severity: parseInt(slider.value)
    }));

    const orientation = assessmentData.orientation_questions.map(q => {
        const correctBtn = document.querySelector(`#orientation-list .toggle-btn[data-id="${q.id}"][data-correct="true"]`);
        return {
            id: q.id,
            correct: correctBtn ? correctBtn.classList.contains('active') : false
        };
    });

    const memory = assessmentData.memory_questions.map(q => {
        const correctBtn = document.querySelector(`#memory-list .toggle-btn[data-id="${q.id}"][data-correct="true"]`);
        return {
            id: q.id,
            correct: correctBtn ? correctBtn.classList.contains('active') : false
        };
    });

    try {
        const response = await fetch('/api/concussion-assessment/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                red_flags: redFlags, 
                symptoms, 
                orientation, 
                memory,
                strike_data: riskData
            })
        });

        assessmentResult = await response.json();
        showStep4();
    } catch (error) {
        alert('Error submitting assessment: ' + error.message);
    }
}

function showStep4() {
    document.getElementById('step-3').classList.add('hidden');
    document.getElementById('step-4').classList.remove('hidden');

    displayAssessmentResults();
    displayImpactFrames();
    
    updateUserUI();
    
    setTimeout(() => {
        streamAISummary();
    }, 1500);
    
    document.getElementById('restart-btn').addEventListener('click', () => location.reload());
}

function displayAssessmentResults() {
    const safetyScore = calculateSafetyScore();
    const rank = getRank(safetyScore);
    const earnedBadges = getEarnedBadges();
    
    let symptomDetailsHtml = '';
    const symptomDetails = assessmentResult.symptom_details || [];
    if (symptomDetails.length > 0) {
        symptomDetailsHtml = `
            <h4>Reported Symptoms (by severity):</h4>
            <ul>
                ${symptomDetails.map(s => `<li>${s.name}: ${s.severity}/6</li>`).join('')}
            </ul>
        `;
    }

    let redFlagWarning = '';
    if (assessmentResult.red_flags_count > 0) {
        redFlagWarning = `
            <div class="warning" style="background: rgba(255, 68, 68, 0.2); border-color: #ff4444;">
                <strong>RED FLAGS DETECTED!</strong><br>
                Seek immediate medical attention.
            </div>
        `;
    }
    
    const badgesHtml = BADGES.map((badge, index) => {
        const isEarned = earnedBadges.find(b => b.id === badge.id);
        return `
            <div class="badge ${isEarned ? 'earned' : ''}" style="animation-delay: ${index * 0.1}s">
                <span class="badge-icon">${BADGE_ICONS[badge.iconKey]}</span>
                <span class="badge-name">${badge.name}</span>
            </div>
        `;
    }).join('');

    const resultHtml = `
        <div class="score-display animate-score">
            <span class="score-label">Safety Score</span>
            <span class="score-value" id="safety-score-value">0</span>
            <div class="score-rank">
                <span class="rank-icon">${rank.icon}</span>
                <span>${rank.name}</span>
            </div>
        </div>
        
        <div class="xp-bar-container">
            <div class="xp-bar-label">
                <span>Progress to next rank</span>
                <span id="xp-progress-text">0%</span>
            </div>
            <div class="xp-bar">
                <div class="xp-bar-fill" id="xp-bar-fill"></div>
            </div>
        </div>
        
        <h4 style="text-align: center; margin: 20px 0 15px; color: var(--text-secondary);">Achievements Earned</h4>
        <div class="badges-container">
            ${badgesHtml}
        </div>
        
        <div class="assessment-result-card" style="margin-top: 25px;">
            <h3>Concussion Screening Results</h3>
            ${redFlagWarning}
            <span class="urgency-badge ${assessmentResult.urgency_level}">${assessmentResult.urgency_level}</span>
            
            <div class="risk-recommendation">
                <strong>Recommendation:</strong><br>
                ${assessmentResult.recommendation}
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number" id="stat-symptoms">0</div>
                    <div class="stat-label">Symptoms</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="stat-severity">0</div>
                    <div class="stat-label">Severity</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="stat-orientation">0</div>
                    <div class="stat-label">Orientation</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="stat-memory">0</div>
                    <div class="stat-label">Memory</div>
                </div>
            </div>

            ${symptomDetailsHtml}

            <p class="disclaimer">${assessmentResult.disclaimer}</p>
        </div>
    `;

    document.getElementById('assessment-results-section').innerHTML = resultHtml;
    
    setTimeout(() => {
        const scoreEl = document.getElementById('safety-score-value');
        const symptomsEl = document.getElementById('stat-symptoms');
        const severityEl = document.getElementById('stat-severity');
        const orientationEl = document.getElementById('stat-orientation');
        const memoryEl = document.getElementById('stat-memory');
        
        if (scoreEl) animateNumber(scoreEl, safetyScore, 1500);
        if (symptomsEl) animateNumber(symptomsEl, assessmentResult.symptom_total || 0, 800);
        if (severityEl) animateNumber(severityEl, assessmentResult.symptom_severity_score || 0, 800);
        if (orientationEl) animateNumber(orientationEl, assessmentResult.orientation_score || 0, 800);
        if (memoryEl) animateNumber(memoryEl, assessmentResult.memory_score || 0, 800);
        
        const currentRankIndex = RANKS.indexOf(rank);
        const nextRank = RANKS[currentRankIndex + 1];
        let xpPercent = 100;
        if (nextRank) {
            const rangeStart = rank.minScore;
            const rangeEnd = nextRank.minScore;
            xpPercent = ((safetyScore - rangeStart) / (rangeEnd - rangeStart)) * 100;
        }
        
        setTimeout(() => {
            const xpFill = document.getElementById('xp-bar-fill');
            const xpText = document.getElementById('xp-progress-text');
            if (xpFill) xpFill.style.width = xpPercent + '%';
            if (xpText) xpText.textContent = Math.round(xpPercent) + '%';
        }, 500);
        
        document.querySelectorAll('.badge').forEach((badge, index) => {
            setTimeout(() => {
                badge.style.opacity = '1';
                if (badge.classList.contains('earned')) {
                    badge.classList.add('animate-badge');
                }
            }, 800 + index * 150);
        });
    }, 300);
}

function displayRiskResults() {
    const riskResultsSection = document.getElementById('risk-results-section');
    
    if (!riskData) {
        riskResultsSection.innerHTML = '<h3>Brain Injury Risk Assessment</h3><p>No impacts were selected for risk analysis.</p>';
        return;
    }

    const riskHtml = `
        <div class="risk-overview">
            <div class="risk-gauge">
                <div class="risk-level ${riskData.overall_risk}">${riskData.overall_risk}</div>
                <div class="risk-percentage">${riskData.risk_percentage}%</div>
                <div class="summary-label">Estimated Injury Risk</div>
            </div>
            <div class="risk-details">
                <div class="risk-recommendation">
                    <strong>Recommendation:</strong><br>
                    ${riskData.recommendation}
                </div>
                <div class="impact-stats">
                    <p>Selected Impacts: <strong>${riskData.impact_count}</strong></p>
                    <p>Max Single Impact Force: <strong>${riskData.max_single_impact_force.toFixed(0)} - ${(riskData.max_single_impact_force * 1.4).toFixed(0)} N</strong></p>
                    <p>Total Cumulative Force: <strong>${riskData.total_force_estimate.toFixed(0)} - ${(riskData.total_force_estimate * 1.4).toFixed(0)} N</strong></p>
                </div>
            </div>
        </div>
        
        <h4>Impact Details</h4>
        <table class="impact-details-table">
            <thead>
                <tr>
                    <th>Frame</th>
                    <th>Time</th>
                    <th>Hand</th>
                    <th>Speed Range</th>
                    <th>Force Range</th>
                    <th>G-Force</th>
                    <th>Risk Level</th>
                </tr>
            </thead>
            <tbody>
                ${riskData.impact_details.map(d => `
                    <tr>
                        <td>${d.frame}</td>
                        <td>${d.time.toFixed(2)}s</td>
                        <td>${d.hand}</td>
                        <td>${d.speed_min || '-'} - ${d.speed_max || '-'} mph</td>
                        <td>${d.force_min || d.estimated_force_newtons.toFixed(0)} - ${d.force_max || (d.estimated_force_newtons * 1.4).toFixed(0)} N</td>
                        <td>${d.g_force.toFixed(1)}</td>
                        <td class="risk-level ${d.risk_level}">${d.risk_level}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <p class="disclaimer">${riskData.disclaimer}</p>
    `;

    document.getElementById('risk-results').innerHTML = riskHtml;
}

function displayImpactFrames() {
    const data = currentSession;
    const selectedImpactsList = data.impacts.filter(impact => selectedImpacts.has(impact.id));
    
    const summaryHtml = `
        <div class="summary-item">
            <div class="summary-value">${selectedImpactsList.length}</div>
            <div class="summary-label">Impacts Analyzed</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${data.duration.toFixed(2)}s</div>
            <div class="summary-label">Video Duration</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${fighterSettings.fighter1.intensity}%</div>
            <div class="summary-label">Fighter 1 Intensity</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${fighterSettings.fighter2.intensity}%</div>
            <div class="summary-label">Fighter 2 Intensity</div>
        </div>
    `;
    document.getElementById('final-results-summary').innerHTML = summaryHtml;

    const impactsGrid = document.getElementById('final-impacts-grid');
    
    if (selectedImpactsList.length === 0) {
        impactsGrid.innerHTML = '<p>No impacts were selected for analysis.</p>';
        return;
    }

    impactsGrid.innerHTML = selectedImpactsList.map(impact => {
        const speedRange = calculateSpeedRange(impact, impact.fighter);
        const powerRange = calculatePowerRange(impact, impact.fighter);
        const settings = impact.fighter === 1 ? fighterSettings.fighter1 : fighterSettings.fighter2;
        
        return `
            <div class="impact-card selected" data-id="${impact.id}">
                <img src="${impact.image_path}" alt="Impact ${impact.id}">
                <div class="impact-info">
                    <div class="impact-title">
                        <span>Fighter ${impact.fighter} - Frame ${impact.frame}</span>
                        <span class="impact-hand">${impact.hand}</span>
                    </div>
                    <div class="impact-stats">
                        <div>Time: <span class="impact-stat-value">${impact.time.toFixed(2)}s</span></div>
                        <div>Throwing: <span class="impact-stat-value">${settings.intensity}%</span></div>
                    </div>
                    <div class="speed-range">
                        <div class="speed-range-label">Est. Speed</div>
                        <div class="speed-range-value">${speedRange.min} - ${speedRange.max} ${speedRange.unit}</div>
                    </div>
                    <div class="power-range">
                        <div class="power-range-label">Est. Force</div>
                        <div class="power-range-value">${powerRange.min} - ${powerRange.max} ${powerRange.unit}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

let isRegisterMode = false;

function initializeAuth() {
    document.getElementById('login-btn').addEventListener('click', showAuthModal);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('history-btn').addEventListener('click', showHistory);
    document.getElementById('close-history-btn').addEventListener('click', () => {
        document.getElementById('history-modal').classList.add('hidden');
    });
    document.getElementById('close-auth-btn').addEventListener('click', () => {
        document.getElementById('auth-modal').classList.add('hidden');
    });
    document.getElementById('auth-toggle-link').addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthMode();
    });
    document.getElementById('auth-submit-btn').addEventListener('click', handleAuthSubmit);
    document.getElementById('auth-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAuthSubmit();
    });
    
    const saveBtn = document.getElementById('save-session-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSession);
    }
    
    checkAuthStatus();
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth_success') === 'true') {
        checkAuthStatus();
        window.history.replaceState({}, document.title, '/');
    }
    if (urlParams.get('auth_error')) {
        console.error('Authentication error:', urlParams.get('auth_error'));
        window.history.replaceState({}, document.title, '/');
    }
}

function loadUserFromStorage() {
    checkAuthStatus();
}

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/user', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.authenticated && data.user) {
            currentUser = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.first_name || data.user.email?.split('@')[0] || 'User',
                avatar: data.user.profile_image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.user.first_name || 'U')}`
            };
            updateUserUI();
        } else {
            currentUser = null;
            updateUserUI();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        currentUser = null;
        updateUserUI();
    }
}

function showAuthModal() {
    isRegisterMode = false;
    updateAuthModalUI();
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('auth-email').focus();
}

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    updateAuthModalUI();
}

function updateAuthModalUI() {
    const title = document.getElementById('auth-modal-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleLink = document.getElementById('auth-toggle-link');
    const nameFields = document.getElementById('auth-name-fields');
    const errorDiv = document.getElementById('auth-error');
    
    errorDiv.classList.add('hidden');
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-password').value = '';
    
    if (isRegisterMode) {
        title.textContent = 'Create Account';
        submitBtn.textContent = 'Sign Up';
        toggleText.textContent = 'Already have an account?';
        toggleLink.textContent = 'Sign in';
        nameFields.classList.remove('hidden');
    } else {
        title.textContent = 'Sign In';
        submitBtn.textContent = 'Sign In';
        toggleText.textContent = "Don't have an account?";
        toggleLink.textContent = 'Create one';
        nameFields.classList.add('hidden');
    }
}

async function handleAuthSubmit() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorDiv = document.getElementById('auth-error');
    const submitBtn = document.getElementById('auth-submit-btn');
    
    if (!email || !password) {
        errorDiv.textContent = 'Please enter email and password';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    if (password.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = isRegisterMode ? 'Creating account...' : 'Signing in...';
    
    try {
        const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
        const body = { email, password };
        
        if (isRegisterMode) {
            body.first_name = document.getElementById('auth-first-name').value.trim() || null;
            body.last_name = document.getElementById('auth-last-name').value.trim() || null;
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Authentication failed');
        }
        
        currentUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.first_name || data.user.email.split('@')[0],
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.first_name || data.user.email)}&background=10b981&color=fff`
        };
        
        updateUserUI();
        document.getElementById('auth-modal').classList.add('hidden');
        
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isRegisterMode ? 'Sign Up' : 'Sign In';
    }
}

async function handleLogout() {
    await fetch('/api/auth/logout');
    currentUser = null;
    updateUserUI();
}

function updateUserUI() {
    const loginBtn = document.getElementById('login-btn');
    const loggedInSection = document.getElementById('user-logged-in');
    const saveBtn = document.getElementById('save-session-btn');
    
    if (currentUser) {
        loginBtn.classList.add('hidden');
        loggedInSection.classList.remove('hidden');
        document.getElementById('user-avatar').src = currentUser.avatar;
        document.getElementById('user-name').textContent = currentUser.name;
        if (saveBtn) saveBtn.style.display = 'inline-flex';
    } else {
        loginBtn.classList.remove('hidden');
        loggedInSection.classList.add('hidden');
        if (saveBtn) saveBtn.style.display = 'none';
    }
}

async function showHistory() {
    if (!currentUser) {
        alert('Please sign in to view your history');
        return;
    }
    
    document.getElementById('history-modal').classList.remove('hidden');
    document.getElementById('history-list').innerHTML = '<p class="loading-history">Loading history...</p>';
    
    try {
        const response = await fetch(`/api/sessions/${currentUser.id}`);
        const data = await response.json();
        
        if (data.sessions && data.sessions.length > 0) {
            document.getElementById('history-list').innerHTML = data.sessions.map(session => `
                <div class="history-item" onclick="viewHistorySession(${session.id})">
                    <div class="history-item-header">
                        <span class="history-date">${new Date(session.created_at).toLocaleString()}</span>
                        <span class="history-risk ${session.overall_risk}">${session.overall_risk || 'N/A'}</span>
                    </div>
                    <div class="history-stats">
                        <span>Impacts: ${session.impact_count || 0}</span>
                        <span>Risk: ${session.risk_percentage ? session.risk_percentage.toFixed(1) + '%' : 'N/A'}</span>
                        <span>Force: ${session.total_force ? session.total_force.toFixed(0) + 'N' : 'N/A'}</span>
                    </div>
                    ${session.ai_summary ? `<div class="history-summary">${session.ai_summary}</div>` : ''}
                </div>
            `).join('');
        } else {
            document.getElementById('history-list').innerHTML = '<p class="no-history">No injury history found. Complete an analysis to save it here.</p>';
        }
    } catch (error) {
        document.getElementById('history-list').innerHTML = `<p class="no-history">Error loading history: ${error.message}</p>`;
    }
}

async function viewHistorySession(sessionDbId) {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/api/sessions/${currentUser.id}/${sessionDbId}`);
        const session = await response.json();
        
        if (session.error) {
            alert('Error loading session: ' + session.error);
            return;
        }
        
        document.getElementById('history-modal').classList.add('hidden');
        
        alert(`Session Details:\n\nDate: ${new Date(session.created_at).toLocaleString()}\nRisk: ${session.overall_risk} (${session.risk_percentage}%)\nImpacts: ${session.impact_count}\nTotal Force: ${session.total_force?.toFixed(0)}N\n\nAI Summary:\n${session.ai_summary || 'Not available'}\n\nRecommendation:\n${session.recommendation || 'Not available'}`);
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function saveSession() {
    if (!currentUser || !currentSession || !riskData) {
        alert('No session data to save');
        return;
    }
    
    try {
        const response = await fetch('/api/sessions/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                session_id: currentSession.session_id,
                fighter_settings: fighterSettings,
                risk_data: riskData,
                ai_summary: aiSummaryText,
                assessment_result: assessmentResult
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Session saved to your history!');
            document.getElementById('save-session-btn').style.display = 'none';
        } else {
            alert('Failed to save: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Error saving session: ' + error.message);
    }
}

async function streamAISummary() {
    const container = document.getElementById('ai-summary-content');
    container.innerHTML = '<div class="ai-loading"><div class="ai-pulse"></div><span>Generating AI analysis...</span></div>';
    aiSummaryText = '';
    
    try {
        const response = await fetch('/api/ai-summary/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                risk_data: riskData,
                fighter_settings: fighterSettings
            })
        });
        
        container.innerHTML = '';
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('data: ')) {
                    const data = trimmedLine.slice(6).trim();
                    if (data === '[DONE]' || data === '') {
                        continue;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.text && parsed.text !== 'None') {
                            aiSummaryText += parsed.text;
                            container.textContent = aiSummaryText;
                        }
                    } catch (e) {
                    }
                }
            }
        }
        
        if (buffer.trim().startsWith('data: ')) {
            const data = buffer.trim().slice(6).trim();
            if (data !== '[DONE]' && data !== '') {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.text && parsed.text !== 'None') {
                        aiSummaryText += parsed.text;
                        container.textContent = aiSummaryText;
                    }
                } catch (e) {
                }
            }
        }
        
        if (!aiSummaryText) {
            container.innerHTML = '<span style="color: var(--text-secondary);">AI analysis not available.</span>';
        } else {
            conversationHistory = [{ role: 'assistant', content: aiSummaryText }];
            showChatInput();
        }
    } catch (error) {
        container.innerHTML = `<span style="color: var(--danger);">Error generating AI summary: ${error.message}</span>`;
    }
}

let chatInputInitialized = false;

function showChatInput() {
    const chatInputSection = document.getElementById('ai-chat-input-section');
    chatInputSection.classList.remove('hidden');
    
    if (chatInputInitialized) return;
    chatInputInitialized = true;
    
    const chatInput = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('ai-chat-send-btn');
    
    sendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
}

async function sendChatMessage() {
    const chatInput = document.getElementById('ai-chat-input');
    const chatHistory = document.getElementById('ai-chat-history');
    const sendBtn = document.getElementById('ai-chat-send-btn');
    
    const message = chatInput.value.trim();
    if (!message) return;
    
    chatHistory.classList.remove('hidden');
    
    chatHistory.innerHTML += `<div class="ai-chat-message user">${escapeHtml(message)}</div>`;
    conversationHistory.push({ role: 'user', content: message });
    
    chatInput.value = '';
    chatInput.disabled = true;
    sendBtn.disabled = true;
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'ai-chat-message assistant loading';
    loadingDiv.innerHTML = '<div class="ai-pulse"></div><span>Thinking...</span>';
    chatHistory.appendChild(loadingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    try {
        const response = await fetch('/api/ai-chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                conversation_history: conversationHistory,
                session_context: {
                    risk_data: riskData,
                    fighter_settings: fighterSettings,
                    assessment_result: assessmentResult
                }
            })
        });
        
        chatHistory.removeChild(loadingDiv);
        
        const responseDiv = document.createElement('div');
        responseDiv.className = 'ai-chat-message assistant';
        chatHistory.appendChild(responseDiv);
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let responseText = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('data: ')) {
                    const data = trimmedLine.slice(6).trim();
                    if (data === '[DONE]' || data === '') continue;
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.text && parsed.text !== 'None') {
                            responseText += parsed.text;
                            responseDiv.textContent = responseText;
                            chatHistory.scrollTop = chatHistory.scrollHeight;
                        }
                    } catch (e) {}
                }
            }
        }
        
        if (buffer.trim().startsWith('data: ')) {
            const data = buffer.trim().slice(6).trim();
            if (data !== '[DONE]' && data !== '') {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.text && parsed.text !== 'None') {
                        responseText += parsed.text;
                        responseDiv.textContent = responseText;
                    }
                } catch (e) {}
            }
        }
        
        conversationHistory.push({ role: 'assistant', content: responseText });
        
    } catch (error) {
        chatHistory.removeChild(loadingDiv);
        chatHistory.innerHTML += `<div class="ai-chat-message assistant" style="color: var(--danger);">Error: ${error.message}</div>`;
    }
    
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.focus();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
