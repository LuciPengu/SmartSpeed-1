let currentSession = null;
let selectedImpacts = new Set();
let assessmentData = null;
let assessmentResult = null;
let riskData = null;
let currentUser = null;
let authCheckPromise = null;
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

function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${getToastIcon(type)}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function getToastIcon(type) {
    const icons = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
        warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };
    return icons[type] || icons.info;
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
        showToast('Fighter 1 weight must be between 40 and 200 kg', 'error');
        return false;
    }
    if (isNaN(f2Weight) || f2Weight < 40 || f2Weight > 200) {
        showToast('Fighter 2 weight must be between 40 and 200 kg', 'error');
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
    // Wait for auth check to complete before checking user status
    if (authCheckPromise) {
        await authCheckPromise;
    }
    
    if (!currentUser) {
        showToast('Please sign in before starting an analysis', 'warning');
        return;
    }
    
    const validTypes = ['.mp4', '.avi', '.mov', '.mkv'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(fileExt)) {
        showToast('Please upload a valid video file (MP4, AVI, MOV, or MKV)', 'error');
        return;
    }
    
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
        showToast(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB. Your file is ${fileSizeMB.toFixed(1)}MB.`, 'error');
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
        showToast('Error: ' + error.message, 'error');
        uploadArea.classList.remove('hidden');
        progressContainer.classList.add('hidden');
    }
}

function calculateSpeedRange(impact, fighterIdx) {
    const settings = fighterIdx === 1 ? fighterSettings.fighter1 : fighterSettings.fighter2;
    const skillRanges = SKILL_SPEED_RANGES[settings.skill];
    
    const motionIntensity = Math.min(1, impact.motion_intensity || 0.7);
    const throwingIntensity = (settings.intensity || 70) / 100;
    
    const seedVal = (impact.frame || 1) * (fighterIdx + 1) * (impact.hand === 'LEFT' ? 1 : 2);
    const pseudoRandom1 = Math.sin(seedVal * 12.9898) * 43758.5453 % 1;
    const pseudoRandom2 = Math.sin(seedVal * 78.233) * 43758.5453 % 1;
    
    const variationRange = 0.03;
    const variation1 = (Math.abs(pseudoRandom1) - 0.5) * 2 * variationRange;
    const variation2 = (Math.abs(pseudoRandom2) - 0.5) * 2 * variationRange;
    
    const floorSpeed = skillRanges.min * 0.5;
    const fullRange = skillRanges.max - floorSpeed;
    const targetSpeed = floorSpeed + fullRange * throwingIntensity;
    
    const motionAdjust = 0.9 + (motionIntensity * 0.1);
    const baseSpeed = targetSpeed * motionAdjust;
    
    const minSpeed = baseSpeed * (0.88 + variation1);
    const maxSpeed = baseSpeed * (1.02 + variation2);
    
    return {
        min: Math.round(Math.max(floorSpeed, minSpeed)),
        max: Math.round(Math.min(skillRanges.max * 1.1, maxSpeed)),
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
    
    const throwingIntensity = (settings.intensity || 70) / 100;
    const seedVal = (impact.frame || 1) * (fighterIdx + 1) * (impact.hand === 'LEFT' ? 1 : 2);
    const pseudoRandom = Math.sin(seedVal * 34.567) * 43758.5453 % 1;
    const contactTimeVariation = 0.009 + Math.abs(pseudoRandom) * 0.002 * throwingIntensity;
    
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
            showToast('Error calculating risk: ' + error.message, 'error');
            return;
        }
    }

    try {
        const response = await fetch('/api/concussion-assessment');
        assessmentData = await response.json();
        showStep3();
    } catch (error) {
        showToast('Error loading assessment: ' + error.message, 'error');
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
        showToast('Error submitting assessment: ' + error.message, 'error');
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

    const resultHtml = `
        <div class="assessment-result-card">
            <h3>Concussion Screening Results</h3>
            ${redFlagWarning}
            <span class="urgency-badge ${assessmentResult.urgency_level}">${assessmentResult.urgency_level.toUpperCase()}</span>
            
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
                    <div class="stat-label">Severity Score</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="stat-orientation">0</div>
                    <div class="stat-label">Orientation (/${assessmentResult.orientation_max || 5})</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="stat-memory">0</div>
                    <div class="stat-label">Memory (/${assessmentResult.memory_max || 5})</div>
                </div>
            </div>

            ${symptomDetailsHtml}

            <p class="disclaimer">${assessmentResult.disclaimer}</p>
        </div>
    `;

    document.getElementById('assessment-results-section').innerHTML = resultHtml;
    
    setTimeout(() => {
        const symptomsEl = document.getElementById('stat-symptoms');
        const severityEl = document.getElementById('stat-severity');
        const orientationEl = document.getElementById('stat-orientation');
        const memoryEl = document.getElementById('stat-memory');
        
        if (symptomsEl) animateNumber(symptomsEl, assessmentResult.symptom_total || 0, 800);
        if (severityEl) animateNumber(severityEl, assessmentResult.symptom_severity_score || 0, 800);
        if (orientationEl) animateNumber(orientationEl, assessmentResult.orientation_score || 0, 800);
        if (memoryEl) animateNumber(memoryEl, assessmentResult.memory_score || 0, 800);
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

    const gForceValues = [];
    
    impactsGrid.innerHTML = selectedImpactsList.map(impact => {
        const speedRange = calculateSpeedRange(impact, impact.fighter);
        const powerRange = calculatePowerRange(impact, impact.fighter);
        const settings = impact.fighter === 1 ? fighterSettings.fighter1 : fighterSettings.fighter2;
        
        const avgForce = (powerRange.min + powerRange.max) / 2;
        const headMass = 4.5;
        const gForce = avgForce / (headMass * 9.81);
        gForceValues.push({ id: impact.id, gForce: gForce, fighter: impact.fighter });
        
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
                    <div class="g-force-display">
                        <div class="g-force-label">G-Force</div>
                        <div class="g-force-value">${gForce.toFixed(1)}g</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    displayGForceMarkers(gForceValues);
}

function displayGForceMarkers(gForceValues) {
    const markersContainer = document.getElementById('user-g-markers');
    if (!markersContainer) return;
    
    const maxG = 316;
    
    markersContainer.innerHTML = gForceValues.map((item, index) => {
        const percentage = Math.min(100, (item.gForce / maxG) * 100);
        const impact = selectedImpactsList.find(i => i.id === item.id);
        const settings = item.fighter === 1 ? fighterSettings.fighter1 : fighterSettings.fighter2;
        const speedRange = impact ? calculateSpeedRange(impact, item.fighter) : { min: 0, max: 0 };
        const powerRange = impact ? calculatePowerRange(impact, item.fighter) : { min: 0, max: 0 };
        
        let riskLevel = 'Low';
        if (item.gForce >= 120) riskLevel = 'Severe';
        else if (item.gForce >= 70) riskLevel = 'High';
        else if (item.gForce >= 32) riskLevel = 'Moderate';
        
        return `
            <div class="user-g-marker" style="left: ${percentage}%;" data-impact-id="${item.id}" onclick="scrollToImpact('${item.id}')">
                <div class="marker-tooltip">
                    <div class="marker-tooltip-title">Fighter ${item.fighter} - ${impact?.hand || 'Punch'}</div>
                    <div class="marker-tooltip-row">G-Force: <span>${item.gForce.toFixed(1)}g</span></div>
                    <div class="marker-tooltip-row">Speed: <span>${speedRange.min}-${speedRange.max} mph</span></div>
                    <div class="marker-tooltip-row">Force: <span>${powerRange.min}-${powerRange.max} N</span></div>
                    <div class="marker-tooltip-row">Risk: <span>${riskLevel}</span></div>
                    <div class="marker-tooltip-row" style="margin-top:6px;font-size:0.65rem;color:var(--text-muted);">Click to view</div>
                </div>
                <div class="marker-label">${item.gForce.toFixed(1)}g</div>
                <div class="marker-dot"></div>
            </div>
        `;
    }).join('');
}

function scrollToImpact(impactId) {
    const impactCard = document.querySelector(`.impact-card[data-id="${impactId}"]`);
    if (impactCard) {
        impactCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        impactCard.classList.add('highlight');
        setTimeout(() => impactCard.classList.remove('highlight'), 2000);
    }
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
    authCheckPromise = (async () => {
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
    })();
    return authCheckPromise;
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
        showToast('Please sign in to view your history', 'warning');
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
            showToast('Error loading session: ' + session.error, 'error');
            return;
        }
        
        document.getElementById('history-modal').classList.add('hidden');
        
        showSessionDetails(session);
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

function showSessionDetails(session) {
    const assessmentHtml = session.assessment_result ? `
        <div class="session-detail-section">
            <h4>Concussion Screening</h4>
            <p><strong>Urgency:</strong> ${session.assessment_result.urgency_level || 'N/A'}</p>
            <p><strong>Symptoms:</strong> ${session.assessment_result.symptom_total || 0}</p>
            <p><strong>Severity Score:</strong> ${session.assessment_result.symptom_severity_score || 0}</p>
            <p><strong>Orientation:</strong> ${session.assessment_result.orientation_score || 0}/${session.assessment_result.orientation_max || 5}</p>
            <p><strong>Memory:</strong> ${session.assessment_result.memory_score || 0}/${session.assessment_result.memory_max || 5}</p>
            ${session.assessment_result.red_flags_count > 0 ? '<p class="red-flag-text"><strong>Red Flags Detected!</strong></p>' : ''}
        </div>
    ` : '';
    
    const detailsHtml = `
        <div class="session-details-modal" onclick="if(event.target === this) this.remove()">
            <div class="session-details-content">
                <div class="modal-header">
                    <h2>Session Details</h2>
                    <button class="close-btn" onclick="this.closest('.session-details-modal').remove()">&times;</button>
                </div>
                <div class="session-details-body">
                    <p><strong>Date:</strong> ${new Date(session.created_at).toLocaleString()}</p>
                    <p><strong>Risk Level:</strong> <span class="urgency-badge ${session.overall_risk}">${session.overall_risk || 'N/A'}</span></p>
                    <p><strong>Risk Percentage:</strong> ${session.risk_percentage ? session.risk_percentage.toFixed(1) + '%' : 'N/A'}</p>
                    <p><strong>Impacts:</strong> ${session.impact_count || 0}</p>
                    <p><strong>Total Force:</strong> ${session.total_force ? session.total_force.toFixed(0) + 'N' : 'N/A'}</p>
                    
                    ${assessmentHtml}
                    
                    <div class="session-detail-section">
                        <h4>Recommendation</h4>
                        <p>${session.recommendation || 'Not available'}</p>
                    </div>
                    
                    ${session.ai_summary ? `
                        <div class="session-detail-section">
                            <h4>AI Summary</h4>
                            <p>${session.ai_summary}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', detailsHtml);
}

async function saveSession() {
    if (!currentUser || !currentSession || !riskData) {
        showToast('No session data to save', 'warning');
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
            showToast('Session saved to your history!', 'success');
            document.getElementById('save-session-btn').style.display = 'none';
        } else {
            showToast('Failed to save: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        showToast('Error saving session: ' + error.message, 'error');
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
