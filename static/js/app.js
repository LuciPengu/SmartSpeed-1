let currentSession = null;
let selectedImpacts = new Set();
let assessmentData = null;
let savedRiskData = null;
let scat5Results = null;
let memoryTestWords = [];
let memoryBaseline = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeUpload();
    loadBaseline();
});

function loadBaseline() {
    const stored = localStorage.getItem('memoryBaseline');
    if (stored) {
        memoryBaseline = JSON.parse(stored);
    }
}

function saveBaseline(score, words) {
    memoryBaseline = {
        score: score,
        words: words,
        date: new Date().toISOString()
    };
    localStorage.setItem('memoryBaseline', JSON.stringify(memoryBaseline));
}

function restartAnalysis() {
    currentSession = null;
    selectedImpacts = new Set();
    savedRiskData = null;
    scat5Results = null;
    memoryTestWords = [];
    
    document.querySelectorAll('.step').forEach(step => {
        step.classList.add('hidden');
    });
    document.getElementById('step-1').classList.remove('hidden');
    document.getElementById('step-1').classList.add('active');
    
    const uploadArea = document.getElementById('upload-area');
    const progressContainer = document.getElementById('upload-progress');
    uploadArea.classList.remove('hidden');
    progressContainer.classList.add('hidden');
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
        impactsGrid.innerHTML = '<p class="no-impacts">No punch impacts were detected in this video.</p>';
        document.getElementById('calculate-risk-btn').disabled = true;
        return;
    }
    
    impactsGrid.innerHTML = data.impacts.map(impact => `
        <div class="impact-card" data-id="${impact.id}" onclick="toggleImpact(${impact.id})">
            <img src="${impact.frame_path}" alt="Frame ${impact.frame_number}">
            <div class="impact-info">
                <span class="frame-number">Frame ${impact.frame_number}</span>
                <span class="timestamp">${impact.timestamp.toFixed(2)}s</span>
                <span class="hand-label ${impact.hand}">${impact.hand}</span>
            </div>
            <div class="impact-metrics">
                <span>V: ${impact.velocity.toFixed(1)}</span>
                <span>A: ${impact.acceleration.toFixed(1)}</span>
                <span>Power: ${impact.power_index.toFixed(1)}</span>
            </div>
            <div class="selection-indicator"></div>
        </div>
    `).join('');

    const calcBtn = document.getElementById('calculate-risk-btn');
    calcBtn.disabled = true;
    calcBtn.onclick = calculateRisk;
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
    const puncherWeight = parseFloat(document.getElementById('puncher-weight').value);
    
    if (isNaN(puncherWeight) || puncherWeight < 40 || puncherWeight > 200) {
        alert('Please enter a valid puncher weight between 40 and 200 kg');
        return;
    }

    try {
        const response = await fetch('/api/calculate-risk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentSession.session_id,
                selected_impact_ids: Array.from(selectedImpacts),
                puncher_weight_kg: puncherWeight
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Calculation failed');
        }

        const result = await response.json();
        savedRiskData = result;
        showStep3(result);

    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function showStep3(result) {
    document.getElementById('step-2').classList.add('hidden');
    document.getElementById('step-3').classList.remove('hidden');

    const riskHtml = `
        <div class="risk-overview">
            <div class="risk-gauge">
                <div class="risk-level ${result.overall_risk}">${result.overall_risk}</div>
                <div class="risk-percentage">${result.risk_percentage}%</div>
                <div class="summary-label">Estimated Brain Injury Risk</div>
            </div>
        </div>

        <div class="risk-factors">
            <h3>Risk Factors</h3>
            <div class="factors-grid">
                <div class="factor-item">
                    <span class="factor-label">Punches Analyzed</span>
                    <span class="factor-value">${result.impact_count}</span>
                </div>
                <div class="factor-item">
                    <span class="factor-label">Max Single Force</span>
                    <span class="factor-value">${result.max_single_impact_force.toFixed(1)} N</span>
                </div>
                <div class="factor-item">
                    <span class="factor-label">Total Force</span>
                    <span class="factor-value">${result.total_force_estimate.toFixed(1)} N</span>
                </div>
                <div class="factor-item">
                    <span class="factor-label">Puncher Weight</span>
                    <span class="factor-value">${result.puncher_weight_kg} kg</span>
                </div>
            </div>
        </div>

        <div class="impact-details">
            <h3>Impact Details</h3>
            <table class="impact-details-table">
                <thead>
                    <tr>
                        <th>Frame</th>
                        <th>Time</th>
                        <th>Hand</th>
                        <th>Velocity</th>
                        <th>Acceleration</th>
                        <th>Force (N)</th>
                        <th>G-Force</th>
                        <th>Risk</th>
                    </tr>
                </thead>
                <tbody>
                    ${result.impact_details.map(d => `
                        <tr>
                            <td>${d.frame}</td>
                            <td>${d.time.toFixed(2)}s</td>
                            <td>${d.hand}</td>
                            <td>${d.velocity.toFixed(1)}</td>
                            <td>${d.acceleration.toFixed(1)}</td>
                            <td>${d.estimated_force_newtons.toFixed(1)}</td>
                            <td>${d.g_force.toFixed(1)}</td>
                            <td class="risk-level ${d.risk_level}">${d.risk_level}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="risk-explanation">
            <h3>Recommendations</h3>
            <p>${result.recommendations}</p>
        </div>
    `;
    
    document.getElementById('risk-results').innerHTML = riskHtml;
    
    document.getElementById('start-assessment-btn').onclick = startScat5Assessment;
}

async function startScat5Assessment() {
    document.getElementById('step-3').classList.add('hidden');
    document.getElementById('step-4').classList.remove('hidden');

    try {
        const response = await fetch('/api/concussion-assessment');
        const data = await response.json();
        assessmentData = data;
        
        renderRedFlags(data.red_flags);
        renderSymptoms(data.symptoms);
        renderOrientation(data.orientation_questions);
        
        document.getElementById('submit-assessment-btn').onclick = submitScat5Assessment;
        
    } catch (error) {
        alert('Error loading assessment: ' + error.message);
    }
}

function renderRedFlags(flags) {
    const container = document.getElementById('red-flags-list');
    container.innerHTML = flags.map(flag => `
        <div class="red-flag-item">
            <label>
                <input type="checkbox" name="red-flag" value="${flag.id}">
                ${flag.name}
            </label>
        </div>
    `).join('');
}

function renderSymptoms(symptoms) {
    const container = document.getElementById('symptoms-list');
    container.innerHTML = symptoms.map(symptom => `
        <div class="symptom-item">
            <label>${symptom.name}</label>
            <div class="severity-slider">
                <input type="range" min="0" max="6" value="0" 
                       id="symptom-${symptom.id}" 
                       oninput="updateSliderValue('${symptom.id}', this.value)">
                <span class="severity-value" id="value-${symptom.id}">0</span>
            </div>
        </div>
    `).join('');
}

function updateSliderValue(id, value) {
    document.getElementById(`value-${id}`).textContent = value;
}

function renderOrientation(questions) {
    const container = document.getElementById('orientation-list');
    container.innerHTML = questions.map(q => {
        if (q.input_type === 'select') {
            return `
                <div class="orientation-item">
                    <label>${q.question}</label>
                    <select id="orientation-${q.id}">
                        <option value="">Select...</option>
                        ${q.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    </select>
                </div>
            `;
        } else {
            return `
                <div class="orientation-item">
                    <label>${q.question}</label>
                    <input type="number" id="orientation-${q.id}" min="${q.min}" max="${q.max}">
                </div>
            `;
        }
    }).join('');
}

async function submitScat5Assessment() {
    const redFlags = Array.from(document.querySelectorAll('input[name="red-flag"]:checked'))
        .map(cb => ({ id: cb.value, present: true }));
    
    const symptoms = assessmentData.symptoms.map(s => ({
        id: s.id,
        severity: parseInt(document.getElementById(`symptom-${s.id}`).value) || 0
    }));
    
    const orientation = assessmentData.orientation_questions.map(q => {
        const input = document.getElementById(`orientation-${q.id}`);
        return {
            id: q.id,
            answer: input ? input.value : ''
        };
    });

    try {
        const response = await fetch('/api/concussion-assessment/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ red_flags: redFlags, symptoms, orientation })
        });

        const result = await response.json();
        scat5Results = result;
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
            </div>

            ${symptomDetailsHtml}

            <p class="disclaimer">${result.disclaimer}</p>
        </div>
    `;
    
    document.getElementById('assessment-results').innerHTML = resultHtml;
    
    document.getElementById('start-memory-test-btn').onclick = startMemoryTest;
}

async function startMemoryTest() {
    document.getElementById('step-5').classList.add('hidden');
    document.getElementById('step-6').classList.remove('hidden');

    const baselineStatus = document.getElementById('baseline-status');
    const noBaselineSection = document.getElementById('no-baseline-section');
    const memoryTestArea = document.getElementById('memory-test-area');

    if (memoryBaseline) {
        const baselineDate = new Date(memoryBaseline.date).toLocaleDateString();
        baselineStatus.innerHTML = `
            <div class="baseline-found">
                <strong>Baseline Found</strong><br>
                Your baseline score: ${memoryBaseline.score}/5 words (recorded ${baselineDate})
            </div>
        `;
        noBaselineSection.classList.add('hidden');
        memoryTestArea.classList.remove('hidden');
        beginMemoryStudyPhase(false);
    } else {
        baselineStatus.innerHTML = '';
        noBaselineSection.classList.remove('hidden');
        memoryTestArea.classList.add('hidden');
        
        document.getElementById('create-baseline-btn').onclick = () => {
            noBaselineSection.classList.add('hidden');
            memoryTestArea.classList.remove('hidden');
            beginMemoryStudyPhase(true);
        };
        
        document.getElementById('skip-baseline-btn').onclick = showFinalResults;
    }
}

async function beginMemoryStudyPhase(isCreatingBaseline) {
    try {
        const response = await fetch('/api/memory-test/words');
        const data = await response.json();
        memoryTestWords = data.words;

        const studyPhase = document.getElementById('memory-study-phase');
        const recallPhase = document.getElementById('memory-recall-phase');
        const wordsDisplay = document.getElementById('memory-words-display');
        const countdown = document.getElementById('memory-countdown');

        studyPhase.classList.remove('hidden');
        recallPhase.classList.add('hidden');

        wordsDisplay.innerHTML = memoryTestWords.map(w => `<span class="memory-word">${w}</span>`).join('');

        let timeLeft = 10;
        countdown.textContent = `Time remaining: ${timeLeft} seconds`;
        
        const timer = setInterval(() => {
            timeLeft--;
            countdown.textContent = `Time remaining: ${timeLeft} seconds`;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                studyPhase.classList.add('hidden');
                recallPhase.classList.remove('hidden');
                document.getElementById('recalled-words').value = '';
                document.getElementById('recalled-words').focus();
                
                document.getElementById('submit-memory-btn').onclick = () => submitMemoryTest(isCreatingBaseline);
            }
        }, 1000);

    } catch (error) {
        alert('Error loading memory test: ' + error.message);
    }
}

async function submitMemoryTest(isCreatingBaseline) {
    const recalledText = document.getElementById('recalled-words').value;
    const recalledWords = recalledText.split('\n').map(w => w.trim()).filter(w => w.length > 0);

    try {
        const response = await fetch('/api/memory-test/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recalled_words: recalledWords,
                original_words: memoryTestWords,
                baseline_score: isCreatingBaseline ? null : (memoryBaseline ? memoryBaseline.score : null)
            })
        });

        const result = await response.json();
        
        if (isCreatingBaseline) {
            saveBaseline(result.current_score, memoryTestWords);
            result.memory_status = `Baseline created! Your baseline score is ${result.current_score}/5 words. This will be used for future comparisons.`;
            result.comparison = 'baseline_created';
        }
        
        showFinalResults(result);

    } catch (error) {
        alert('Error evaluating memory test: ' + error.message);
    }
}

function showFinalResults(memoryResult = null) {
    document.getElementById('step-6').classList.add('hidden');
    document.getElementById('step-7').classList.remove('hidden');

    let riskSummaryHtml = '';
    if (savedRiskData) {
        riskSummaryHtml = `
            <div class="result-section">
                <h3>Punch Impact Analysis</h3>
                <div class="risk-overview-mini">
                    <div class="risk-gauge">
                        <div class="risk-level ${savedRiskData.overall_risk}">${savedRiskData.overall_risk}</div>
                        <div class="risk-percentage">${savedRiskData.risk_percentage}%</div>
                        <div class="summary-label">Impact Risk</div>
                    </div>
                    <div class="impact-stats-mini">
                        <p>Clean Punches: <strong>${savedRiskData.impact_count}</strong></p>
                        <p>Max Force: <strong>${savedRiskData.max_single_impact_force.toFixed(1)} N</strong></p>
                        <p>Total Force: <strong>${savedRiskData.total_force_estimate.toFixed(1)} N</strong></p>
                    </div>
                </div>
            </div>
        `;
    }

    let scat5Html = '';
    if (scat5Results) {
        let redFlagWarning = '';
        if (scat5Results.red_flags_count > 0) {
            redFlagWarning = `
                <div class="warning" style="background: rgba(211, 47, 47, 0.3); border-color: #d32f2f;">
                    <strong>RED FLAGS DETECTED!</strong> - Seek immediate medical attention.
                </div>
            `;
        }
        scat5Html = `
            <div class="result-section">
                <h3>SCAT5 Concussion Screening</h3>
                ${redFlagWarning}
                <span class="urgency-badge ${scat5Results.urgency_level}">${scat5Results.urgency_level}</span>
                <div class="scores-grid">
                    <div class="score-item">
                        <div class="score-value">${scat5Results.symptom_total}/22</div>
                        <div class="score-label">Symptoms</div>
                    </div>
                    <div class="score-item">
                        <div class="score-value">${scat5Results.symptom_severity_score}/${scat5Results.max_symptom_severity}</div>
                        <div class="score-label">Severity</div>
                    </div>
                    <div class="score-item">
                        <div class="score-value">${scat5Results.orientation_score}/${scat5Results.orientation_max}</div>
                        <div class="score-label">Orientation</div>
                    </div>
                </div>
                <div class="risk-recommendation">
                    <strong>Recommendation:</strong> ${scat5Results.recommendation}
                </div>
            </div>
        `;
    }

    let memoryHtml = '';
    if (memoryResult) {
        let comparisonClass = '';
        if (memoryResult.comparison === 'at_or_above_baseline') {
            comparisonClass = 'good';
        } else if (memoryResult.comparison === 'slightly_below_baseline') {
            comparisonClass = 'caution';
        } else if (memoryResult.comparison === 'below_baseline') {
            comparisonClass = 'concern';
        }

        memoryHtml = `
            <div class="result-section">
                <h3>Memory Baseline Comparison</h3>
                <div class="memory-result ${comparisonClass}">
                    <div class="scores-grid">
                        <div class="score-item">
                            <div class="score-value">${memoryResult.current_score}/${memoryResult.max_score}</div>
                            <div class="score-label">Current Score</div>
                        </div>
                        ${memoryResult.baseline_score !== null ? `
                            <div class="score-item">
                                <div class="score-value">${memoryResult.baseline_score}/${memoryResult.max_score}</div>
                                <div class="score-label">Baseline Score</div>
                            </div>
                            <div class="score-item">
                                <div class="score-value ${memoryResult.score_difference >= 0 ? 'positive' : 'negative'}">
                                    ${memoryResult.score_difference >= 0 ? '+' : ''}${memoryResult.score_difference}
                                </div>
                                <div class="score-label">Difference</div>
                            </div>
                        ` : ''}
                    </div>
                    <p class="memory-status">${memoryResult.memory_status}</p>
                </div>
            </div>
        `;
    }

    const finalHtml = `
        <div class="final-results-container">
            ${riskSummaryHtml}
            ${scat5Html}
            ${memoryHtml}
            <div class="result-section disclaimer-section">
                <p class="disclaimer">This is a screening tool only, not a medical diagnosis. Always seek professional medical evaluation after any suspected head injury.</p>
            </div>
        </div>
    `;

    document.getElementById('final-results').innerHTML = finalHtml;
}
