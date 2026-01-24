let currentSession = null;
let selectedImpacts = new Set();
let assessmentData = null;
let assessmentResult = null;
let riskData = null;
let fighterSettings = {
    fighter1: { skill: 'professional', weight: 75 },
    fighter2: { skill: 'professional', weight: 75 }
};

const SKILL_SPEED_RANGES = {
    beginner: { min: 12, max: 18, avg: 15 },
    amateur: { min: 18, max: 28, avg: 23 },
    professional: { min: 24, max: 35, avg: 29 },
    elite: { min: 30, max: 45, avg: 37 }
};

document.addEventListener('DOMContentLoaded', () => {
    initializeUpload();
    initializeFighterSettings();
});

function initializeFighterSettings() {
    document.getElementById('fighter1-skill').addEventListener('change', (e) => {
        fighterSettings.fighter1.skill = e.target.value;
    });
    document.getElementById('fighter1-weight').addEventListener('change', (e) => {
        fighterSettings.fighter1.weight = parseFloat(e.target.value) || 75;
    });
    document.getElementById('fighter2-skill').addEventListener('change', (e) => {
        fighterSettings.fighter2.skill = e.target.value;
    });
    document.getElementById('fighter2-weight').addEventListener('change', (e) => {
        fighterSettings.fighter2.weight = parseFloat(e.target.value) || 75;
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
    fighterSettings.fighter2.skill = document.getElementById('fighter2-skill').value;
    fighterSettings.fighter2.weight = f2Weight;
    
    return true;
}

async function handleFileUpload(file) {
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
    
    const intensity = Math.min(1, impact.motion_intensity || 0.7);
    
    const adjustedMin = skillRanges.min + (skillRanges.avg - skillRanges.min) * intensity * 0.5;
    const adjustedMax = skillRanges.min + (skillRanges.max - skillRanges.min) * intensity;
    
    return {
        min: Math.round(adjustedMin),
        max: Math.round(adjustedMax),
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
    
    const contactTime = 0.01;
    
    const minForce = (effectiveMass * minSpeed) / contactTime;
    const maxForce = (effectiveMass * maxSpeed) / contactTime;
    
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
        const speedRange = calculateSpeedRange(impact, impact.fighter);
        const powerRange = calculatePowerRange(impact, impact.fighter);
        
        return `
            <div class="impact-card" data-id="${impact.id}" onclick="toggleImpact(${impact.id})">
                <img src="${impact.image_path}" alt="Impact ${impact.id}">
                <div class="impact-info">
                    <div class="impact-title">
                        <span>Fighter ${impact.fighter} - Frame ${impact.frame}</span>
                        <span class="impact-hand">${impact.hand}</span>
                    </div>
                    <div class="impact-stats">
                        <div>Time: <span class="impact-stat-value">${impact.time.toFixed(2)}s</span></div>
                        <div>Intensity: <span class="impact-stat-value">${((impact.motion_intensity || 0.7) * 100).toFixed(0)}%</span></div>
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

    document.getElementById('continue-to-assessment-btn').addEventListener('click', continueToAssessment);
}

function toggleImpact(id) {
    const card = document.querySelector(`.impact-card[data-id="${id}"]`);
    
    if (selectedImpacts.has(id)) {
        selectedImpacts.delete(id);
        card.classList.remove('selected');
    } else {
        selectedImpacts.add(id);
        card.classList.add('selected');
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
            body: JSON.stringify({ red_flags: redFlags, symptoms, orientation, memory })
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
    displayRiskResults();
    displayImpactFrames();
    
    document.getElementById('restart-btn').addEventListener('click', () => location.reload());
}

function displayAssessmentResults() {
    let symptomDetailsHtml = '';
    if (assessmentResult.symptom_details.length > 0) {
        symptomDetailsHtml = `
            <h4>Reported Symptoms (by severity):</h4>
            <ul>
                ${assessmentResult.symptom_details.map(s => `<li>${s.name}: ${s.severity}/6</li>`).join('')}
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
            <span class="urgency-badge ${assessmentResult.urgency_level}">${assessmentResult.urgency_level}</span>
            
            <div class="risk-recommendation">
                <strong>Recommendation:</strong><br>
                ${assessmentResult.recommendation}
            </div>

            <div class="scores-grid">
                <div class="score-item">
                    <div class="score-value">${assessmentResult.symptom_total}/22</div>
                    <div class="score-label">Symptoms Present</div>
                </div>
                <div class="score-item">
                    <div class="score-value">${assessmentResult.symptom_severity_score}/${assessmentResult.max_symptom_severity}</div>
                    <div class="score-label">Symptom Severity</div>
                </div>
                <div class="score-item">
                    <div class="score-value">${assessmentResult.orientation_score}/${assessmentResult.orientation_max}</div>
                    <div class="score-label">Orientation Score</div>
                </div>
                <div class="score-item">
                    <div class="score-value">${assessmentResult.memory_score}/${assessmentResult.memory_max}</div>
                    <div class="score-label">Memory Score</div>
                </div>
            </div>

            ${symptomDetailsHtml}

            <p class="disclaimer">${assessmentResult.disclaimer}</p>
        </div>
    `;

    document.getElementById('assessment-results-section').innerHTML = resultHtml;
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
    document.getElementById('final-results-summary').innerHTML = summaryHtml;

    const impactsGrid = document.getElementById('final-impacts-grid');
    
    if (data.impacts.length === 0) {
        impactsGrid.innerHTML = '<p>No punch impacts were detected in this video.</p>';
        return;
    }

    impactsGrid.innerHTML = data.impacts.map(impact => {
        const isSelected = selectedImpacts.has(impact.id);
        const speedRange = calculateSpeedRange(impact, impact.fighter);
        const powerRange = calculatePowerRange(impact, impact.fighter);
        
        return `
            <div class="impact-card ${isSelected ? 'selected' : ''}" data-id="${impact.id}">
                <img src="${impact.image_path}" alt="Impact ${impact.id}">
                <div class="impact-info">
                    <div class="impact-title">
                        <span>Fighter ${impact.fighter} - Frame ${impact.frame}</span>
                        <span class="impact-hand">${impact.hand}</span>
                    </div>
                    <div class="impact-stats">
                        <div>Time: <span class="impact-stat-value">${impact.time.toFixed(2)}s</span></div>
                        <div>Intensity: <span class="impact-stat-value">${((impact.motion_intensity || 0.7) * 100).toFixed(0)}%</span></div>
                    </div>
                    <div class="speed-range">
                        <div class="speed-range-label">Est. Speed</div>
                        <div class="speed-range-value">${speedRange.min} - ${speedRange.max} ${speedRange.unit}</div>
                    </div>
                    <div class="power-range">
                        <div class="power-range-label">Est. Force</div>
                        <div class="power-range-value">${powerRange.min} - ${powerRange.max} ${powerRange.unit}</div>
                    </div>
                    ${isSelected ? '<div class="selected-badge">Selected for Analysis</div>' : ''}
                </div>
            </div>
        `;
    }).join('');
}
