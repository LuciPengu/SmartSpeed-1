let currentSession = null;
let selectedImpacts = new Set();
let assessmentData = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeUpload();
});

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

async function handleFileUpload(file) {
    const validTypes = ['.mp4', '.avi', '.mov', '.mkv'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(fileExt)) {
        alert('Please upload a valid video file (MP4, AVI, MOV, or MKV)');
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
        return;
    }

    impactsGrid.innerHTML = data.impacts.map(impact => `
        <div class="impact-card" data-id="${impact.id}" onclick="toggleImpact(${impact.id})">
            <img src="${impact.image_path}" alt="Impact ${impact.id}">
            <div class="impact-info">
                <div class="impact-title">
                    <span>Fighter ${impact.fighter} - Frame ${impact.frame}</span>
                    <span class="impact-hand">${impact.hand}</span>
                </div>
                <div class="impact-stats">
                    <div>Time: <span class="impact-stat-value">${impact.time.toFixed(2)}s</span></div>
                    <div>Velocity: <span class="impact-stat-value">${impact.velocity.toFixed(1)} T/s</span></div>
                    <div>Accel: <span class="impact-stat-value">${impact.acceleration.toFixed(1)} T/s²</span></div>
                    <div>Power: <span class="impact-stat-value">${impact.power_index.toFixed(1)}</span></div>
                </div>
            </div>
        </div>
    `).join('');

    document.getElementById('calculate-risk-btn').addEventListener('click', calculateRisk);
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

    document.getElementById('calculate-risk-btn').disabled = selectedImpacts.size === 0;
}

async function calculateRisk() {
    const weight = parseFloat(document.getElementById('puncher-weight').value);
    
    if (isNaN(weight) || weight < 40 || weight > 200) {
        alert('Please enter a valid weight between 40 and 200 kg');
        return;
    }

    try {
        const response = await fetch('/api/calculate-risk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentSession.session_id,
                selected_impact_ids: Array.from(selectedImpacts),
                puncher_weight_kg: weight
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Calculation failed');
        }

        const riskData = await response.json();
        showStep3(riskData);

    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function showStep3(riskData) {
    document.getElementById('step-2').classList.add('hidden');
    document.getElementById('step-3').classList.remove('hidden');

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
                    <p>Max Single Impact Force: <strong>${riskData.max_single_impact_force.toFixed(1)} N</strong></p>
                    <p>Total Cumulative Force: <strong>${riskData.total_force_estimate.toFixed(1)} N</strong></p>
                    <p>Puncher Weight: <strong>${riskData.puncher_weight_kg} kg</strong></p>
                </div>
            </div>
        </div>
        
        <h3>Impact Details</h3>
        <table class="impact-details-table">
            <thead>
                <tr>
                    <th>Frame</th>
                    <th>Time</th>
                    <th>Hand</th>
                    <th>Est. Force (N)</th>
                    <th>G-Force</th>
                    <th>Risk Level</th>
                    <th>Injury Prob.</th>
                </tr>
            </thead>
            <tbody>
                ${riskData.impact_details.map(d => `
                    <tr>
                        <td>${d.frame}</td>
                        <td>${d.time.toFixed(2)}s</td>
                        <td>${d.hand}</td>
                        <td>${d.estimated_force_newtons.toFixed(1)}</td>
                        <td>${d.g_force.toFixed(1)}</td>
                        <td class="risk-level ${d.risk_level}">${d.risk_level}</td>
                        <td>${d.injury_probability.toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <p class="disclaimer">${riskData.disclaimer}</p>
    `;

    document.getElementById('risk-results').innerHTML = riskHtml;
    document.getElementById('start-assessment-btn').addEventListener('click', loadConcussionAssessment);
}

async function loadConcussionAssessment() {
    try {
        const response = await fetch('/api/concussion-assessment');
        assessmentData = await response.json();
        showStep4();
    } catch (error) {
        alert('Error loading assessment: ' + error.message);
    }
}

function showStep4() {
    document.getElementById('step-3').classList.add('hidden');
    document.getElementById('step-4').classList.remove('hidden');

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

        const result = await response.json();
        showStep5(result);
    } catch (error) {
        alert('Error submitting assessment: ' + error.message);
    }
}

function showStep5(result) {
    document.getElementById('step-4').classList.add('hidden');
    document.getElementById('step-5').classList.remove('hidden');

    let symptomDetailsHtml = '';
    if (result.symptom_details.length > 0) {
        symptomDetailsHtml = `
            <h4>Reported Symptoms (by severity):</h4>
            <ul>
                ${result.symptom_details.map(s => `<li>${s.name}: ${s.severity}/6</li>`).join('')}
            </ul>
        `;
    }

    let redFlagWarning = '';
    if (result.red_flags_count > 0) {
        redFlagWarning = `
            <div class="warning" style="background: rgba(211, 47, 47, 0.3); border-color: #d32f2f;">
                <strong>RED FLAGS DETECTED!</strong><br>
                Seek immediate medical attention.
            </div>
        `;
    }

    const resultHtml = `
        <div class="assessment-result-card">
            ${redFlagWarning}
            <span class="urgency-badge ${result.urgency_level}">${result.urgency_level}</span>
            
            <div class="risk-recommendation">
                <strong>Recommendation:</strong><br>
                ${result.recommendation}
            </div>

            <div class="scores-grid">
                <div class="score-item">
                    <div class="score-value">${result.symptom_total}/22</div>
                    <div class="score-label">Symptoms Present</div>
                </div>
                <div class="score-item">
                    <div class="score-value">${result.symptom_severity_score}/${result.max_symptom_severity}</div>
                    <div class="score-label">Symptom Severity</div>
                </div>
                <div class="score-item">
                    <div class="score-value">${result.orientation_score}/${result.orientation_max}</div>
                    <div class="score-label">Orientation Score</div>
                </div>
                <div class="score-item">
                    <div class="score-value">${result.memory_score}/${result.memory_max}</div>
                    <div class="score-label">Memory Score</div>
                </div>
            </div>

            ${symptomDetailsHtml}

            <p class="disclaimer">${result.disclaimer}</p>
        </div>
    `;

    document.getElementById('assessment-results').innerHTML = resultHtml;
    document.getElementById('restart-btn').addEventListener('click', () => location.reload());
}
