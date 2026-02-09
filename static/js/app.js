let currentSession = null;
let selectedImpacts = new Set();
let assessmentData = null;
let assessmentResult = null;
let riskData = null;
let currentUser = null;
let authCheckPromise = null;
let aiSummaryText = '';
let conversationHistory = [];
let subscriptionStatus = null;
let hasActiveSubscription = false;
let hasCoursePurchased = false;
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
    updateCoursePaywall();
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

function getVideoMetadata(file) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        
        const timeout = setTimeout(() => {
            URL.revokeObjectURL(video.src);
            resolve(null);
        }, 3000);
        
        video.onloadedmetadata = function() {
            clearTimeout(timeout);
            const metadata = {
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                fps: 30
            };
            URL.revokeObjectURL(video.src);
            resolve(metadata);
        };
        
        video.onerror = function() {
            clearTimeout(timeout);
            URL.revokeObjectURL(video.src);
            resolve(null);
        };
        
        video.src = URL.createObjectURL(file);
    });
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
    
    if (!hasActiveSubscription) {
        showSubscriptionModal();
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
    const videoInfoDisplay = document.getElementById('video-info-display');

    uploadArea.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    
    let videoInfoText = '';
    const videoMetadata = await getVideoMetadata(file);
    if (videoMetadata) {
        const TARGET_FPS = 30;
        const MAX_FRAMES = 300;
        const estimatedFrames = Math.round(videoMetadata.duration * videoMetadata.fps);
        const willBeCropped = estimatedFrames > MAX_FRAMES;
        
        videoInfoText = `${videoMetadata.width}x${videoMetadata.height} | ${videoMetadata.duration.toFixed(1)}s | ${estimatedFrames} frames`;
        
        let infoHtml = `
            <div class="info-row">
                <div class="info-item">
                    <span class="info-label">Resolution:</span>
                    <span class="info-value">${videoMetadata.width}x${videoMetadata.height}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Duration:</span>
                    <span class="info-value">${videoMetadata.duration.toFixed(1)}s</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Frames:</span>
                    <span class="info-value">${estimatedFrames}</span>
                </div>
            </div>`;
        
        if (willBeCropped) {
            infoHtml += `<div class="crop-warning">Video exceeds ${MAX_FRAMES} frames - will be trimmed to first ${(MAX_FRAMES / TARGET_FPS).toFixed(0)} seconds</div>`;
        }
        
        videoInfoDisplay.innerHTML = infoHtml;
        videoInfoDisplay.classList.remove('hidden');
    } else {
        videoInfoDisplay.classList.add('hidden');
    }

    progressFill.style.width = '30%';
    progressText.innerHTML = videoInfoText ? `Uploading video...<br><small style="color: var(--text-muted);">${videoInfoText}</small>` : 'Uploading video...';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fighter_settings', JSON.stringify(fighterSettings));

    try {
        progressFill.style.width = '50%';
        progressText.innerHTML = videoInfoText ? `Analyzing video for punch impacts...<br><small style="color: var(--text-muted);">${videoInfoText}</small>` : 'Analyzing video for punch impacts...';

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
        videoInfoDisplay.classList.add('hidden');
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

    document.getElementById('submit-assessment-btn').addEventListener('click', submitAssessment);
}

function updateSymptomValue(id) {
    const slider = document.getElementById(`symptom-${id}`);
    const valueDisplay = document.getElementById(`symptom-value-${id}`);
    valueDisplay.textContent = slider.value;
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

    try {
        const response = await fetch('/api/concussion-assessment/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                red_flags: redFlags, 
                symptoms, 
                strike_data: riskData
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Assessment error:', errorText);
            showToast('Error submitting assessment. Please try again.', 'error');
            return;
        }

        assessmentResult = await response.json();
        showStep4();
    } catch (error) {
        console.error('Assessment error:', error);
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
            </div>

            ${symptomDetailsHtml}

            <p class="disclaimer">${assessmentResult.disclaimer}</p>
        </div>
    `;

    document.getElementById('assessment-results-section').innerHTML = resultHtml;
    
    setTimeout(() => {
        const symptomsEl = document.getElementById('stat-symptoms');
        
        if (symptomsEl) animateNumber(symptomsEl, assessmentResult.symptom_total || 0, 800);
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
        gForceValues.push({ id: impact.id, gForce: gForce, fighter: impact.fighter, impact: impact, speedRange: speedRange, powerRange: powerRange });
        
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
        const impact = item.impact;
        const speedRange = item.speedRange;
        const powerRange = item.powerRange;
        
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
    if (urlParams.get('checkout') === 'success') {
        const stripeSessionId = urlParams.get('session_id');
        if (stripeSessionId) {
            verifyCheckoutSession(stripeSessionId);
        } else {
            showToast('Subscription activated! You can now analyze videos.', 'success');
            checkAuthStatus();
        }
        window.history.replaceState({}, document.title, '/');
    }
    if (urlParams.get('checkout') === 'cancelled') {
        showToast('Checkout cancelled', 'info');
        window.history.replaceState({}, document.title, '/');
    }
    if (urlParams.get('course_checkout') === 'success') {
        const courseSessionId = urlParams.get('session_id');
        if (courseSessionId) {
            verifyCourseSession(courseSessionId);
        } else {
            showToast('Guide unlocked! Enjoy your learning journey.', 'success');
            checkCourseAccess();
        }
        window.history.replaceState({}, document.title, '/');
    }
    if (urlParams.get('course_checkout') === 'cancelled') {
        showToast('Guide purchase cancelled', 'info');
        window.history.replaceState({}, document.title, '/');
    }
    
    const subscriptionModal = document.getElementById('subscription-modal');
    if (subscriptionModal) {
        subscriptionModal.addEventListener('click', (e) => {
            if (e.target === subscriptionModal) {
                closeSubscriptionModal();
            }
        });
    }
    
    const welcomeModal = document.getElementById('welcome-modal');
    if (welcomeModal) {
        welcomeModal.addEventListener('click', (e) => {
            if (e.target === welcomeModal) {
                closeWelcomeModal();
            }
        });
    }
    
    showWelcomeModalIfFirstVisit();
}

function showWelcomeModalIfFirstVisit() {
    const hasSeenWelcome = localStorage.getItem('hitsmart_welcome_seen');
    if (!hasSeenWelcome) {
        setTimeout(() => {
            const welcomeModal = document.getElementById('welcome-modal');
            if (welcomeModal) {
                welcomeModal.classList.remove('hidden');
            }
        }, 500);
    }
}

function closeWelcomeModal() {
    const welcomeModal = document.getElementById('welcome-modal');
    if (welcomeModal) {
        welcomeModal.classList.add('hidden');
    }
    localStorage.setItem('hitsmart_welcome_seen', 'true');
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
                await checkSubscriptionStatus();
                await checkCourseAccess();
                updateUserUI();
                updateCoursePaywall();
            } else {
                currentUser = null;
                hasActiveSubscription = false;
                hasCoursePurchased = false;
                subscriptionStatus = null;
                updateUserUI();
                updateCoursePaywall();
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
            credentials: 'include',
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
        
        await checkSubscriptionStatus();
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
    await fetch('/api/auth/logout', { credentials: 'include' });
    currentUser = null;
    hasActiveSubscription = false;
    subscriptionStatus = null;
    updateUserUI();
}

function updateUserUI() {
    const loginBtn = document.getElementById('login-btn');
    const loggedInSection = document.getElementById('user-logged-in');
    const saveBtn = document.getElementById('save-session-btn');
    const subscriptionBanner = document.getElementById('subscription-banner');
    const manageSubBtn = document.getElementById('manage-sub-btn');
    
    if (currentUser) {
        loginBtn.classList.add('hidden');
        loggedInSection.classList.remove('hidden');
        document.getElementById('user-avatar').src = currentUser.avatar;
        document.getElementById('user-name').textContent = currentUser.name;
        if (saveBtn) saveBtn.style.display = 'inline-flex';
        
        if (subscriptionBanner) {
            if (hasActiveSubscription) {
                subscriptionBanner.classList.add('hidden');
            } else {
                subscriptionBanner.classList.remove('hidden');
            }
        }
        
        if (manageSubBtn) {
            if (hasActiveSubscription) {
                manageSubBtn.classList.remove('hidden');
            } else {
                manageSubBtn.classList.add('hidden');
            }
        }
    } else {
        loginBtn.classList.remove('hidden');
        loggedInSection.classList.add('hidden');
        if (saveBtn) saveBtn.style.display = 'none';
        if (subscriptionBanner) subscriptionBanner.classList.add('hidden');
        if (manageSubBtn) manageSubBtn.classList.add('hidden');
    }
}

async function checkSubscriptionStatus() {
    try {
        const response = await fetch('/api/stripe/subscription', { credentials: 'include' });
        const data = await response.json();
        subscriptionStatus = data.subscription;
        hasActiveSubscription = data.has_access;
        return data;
    } catch (error) {
        console.error('Subscription check failed:', error);
        hasActiveSubscription = false;
        return null;
    }
}

async function startSubscription() {
    if (!currentUser) {
        showAuthModal();
        return;
    }
    
    try {
        const response = await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ return_url: window.location.origin })
        });
        
        const data = await response.json();
        
        if (data.url) {
            window.location.href = data.url;
        } else {
            showToast('Failed to start checkout', 'error');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showToast('Failed to start checkout', 'error');
    }
}

async function manageSubscription() {
    try {
        const response = await fetch('/api/stripe/portal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ return_url: window.location.origin })
        });
        
        const data = await response.json();
        
        if (data.url) {
            window.location.href = data.url;
        } else {
            showToast('Failed to open subscription management', 'error');
        }
    } catch (error) {
        console.error('Portal error:', error);
        showToast('Failed to open subscription management', 'error');
    }
}

function showSubscriptionModal() {
    document.getElementById('subscription-modal').classList.remove('hidden');
}

function closeSubscriptionModal() {
    document.getElementById('subscription-modal').classList.add('hidden');
}

async function verifyCheckoutSession(stripeSessionId) {
    try {
        const response = await fetch('/api/stripe/verify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ session_id: stripeSessionId })
        });
        
        const data = await response.json();
        
        if (data.success && data.has_access) {
            hasActiveSubscription = true;
            showToast('Subscription activated! You can now analyze videos.', 'success');
            await checkAuthStatus();
        } else {
            showToast('Subscription verification pending. Please refresh the page.', 'info');
        }
    } catch (error) {
        console.error('Verify session error:', error);
        showToast('Subscription activated! Please refresh if needed.', 'success');
        await checkAuthStatus();
    }
}

async function checkCourseAccess() {
    try {
        const response = await fetch('/api/course/access', { credentials: 'include' });
        const data = await response.json();
        hasCoursePurchased = data.has_access;
        updateCoursePaywall();
        return data;
    } catch (error) {
        console.error('Course access check failed:', error);
        hasCoursePurchased = false;
        updateCoursePaywall();
        return null;
    }
}

function updateCoursePaywall() {
    const paywall = document.getElementById('course-paywall');
    const contentWrapper = document.getElementById('course-content-wrapper');
    
    if (hasCoursePurchased) {
        paywall?.classList.add('hidden');
        contentWrapper?.classList.remove('locked');
    } else {
        paywall?.classList.remove('hidden');
        contentWrapper?.classList.add('locked');
    }
}

async function purchaseCourse() {
    if (!currentUser) {
        showAuthModal();
        showToast('Please sign in to purchase the guide', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/stripe/course-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ return_url: window.location.origin })
        });
        
        const data = await response.json();
        
        if (data.url) {
            window.location.href = data.url;
        } else {
            showToast('Failed to start checkout', 'error');
        }
    } catch (error) {
        console.error('Course checkout error:', error);
        showToast('Failed to start checkout', 'error');
    }
}

async function verifyCourseSession(stripeSessionId) {
    try {
        const response = await fetch('/api/stripe/verify-course-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ session_id: stripeSessionId })
        });
        
        const data = await response.json();
        
        if (data.success && data.course_purchased) {
            hasCoursePurchased = true;
            updateCoursePaywall();
            showToast('Guide unlocked! Enjoy your learning journey + 1 month FREE Strike Calculator access!', 'success');
            await checkAuthStatus();
            await checkSubscriptionStatus();
        } else {
            showToast('Purchase verification pending. Please refresh the page.', 'info');
        }
    } catch (error) {
        console.error('Verify course session error:', error);
        showToast('Guide purchased! Please refresh if content is still locked.', 'success');
        await checkAuthStatus();
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

// ===== Tab Navigation =====
function initTabNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const hamburger = document.getElementById('hamburger-btn');
    
    navItems.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            navItems.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            if (targetTab === 'sparring') {
                loadSparringSessions();
            }

            if (window.innerWidth < 768) {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            }
        });
    });

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }
}

// ===== Free Article Navigation =====
function initFreeArticleNavigation() {
    const articleButtons = document.querySelectorAll('.free-article-btn');
    const articleContents = document.querySelectorAll('.free-article-content');

    articleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetArticle = btn.dataset.article;

            articleButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            articleContents.forEach(content => {
                content.classList.remove('active');
            });

            const targetContent = document.getElementById(`article-${targetArticle}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

// ===== Lesson Navigation =====
function initLessonNavigation() {
    const lessonButtons = document.querySelectorAll('.lesson-nav-btn');
    const lessonContents = document.querySelectorAll('.lesson-content');
    
    lessonButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetLesson = btn.dataset.lesson;
            
            // Update button states
            lessonButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update content visibility
            lessonContents.forEach(content => {
                content.classList.remove('active');
            });
            
            const targetContent = document.getElementById(`lesson-${targetLesson}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

// ===== Deep Dive Toggle =====
function toggleDeepDive(btn) {
    // Find the deep dive content - it's the next sibling of the toggle container
    const toggleContainer = btn.closest('.deep-dive-toggle');
    const content = toggleContainer.nextElementSibling;
    
    if (content && content.classList.contains('deep-dive')) {
        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            btn.classList.add('active');
            // Scroll to the deep dive content smoothly
            setTimeout(() => {
                content.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } else {
            content.classList.add('hidden');
            btn.classList.remove('active');
        }
    }
}

// ===== Sparring Tracker =====
let sparringSessions = [];

function getIntensityColor(intensity) {
    if (intensity <= 3) return '#34d399';
    if (intensity <= 6) return '#fbbf24';
    return '#ef4444';
}

function updateSparringAuthState() {
    const form = document.getElementById('sparring-form');
    const authMsg = document.getElementById('sparring-auth-message');
    if (!form || !authMsg) return;
    if (currentUser) {
        form.classList.remove('hidden');
        authMsg.classList.add('hidden');
    } else {
        form.classList.add('hidden');
        authMsg.classList.remove('hidden');
    }
}

async function loadSparringSessions() {
    updateSparringAuthState();
    if (!currentUser) {
        sparringSessions = [];
        renderSparringChart([]);
        renderSparringHistory([]);
        return;
    }
    try {
        const res = await fetch('/api/sparring/sessions', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load sessions');
        const data = await res.json();
        sparringSessions = data.sessions || data || [];
        renderSparringChart(sparringSessions);
        renderSparringHistory(sparringSessions);
    } catch (err) {
        console.error('Error loading sparring sessions:', err);
        sparringSessions = [];
        renderSparringChart([]);
        renderSparringHistory([]);
    }
}

async function logSparringSession() {
    if (!currentUser) {
        showToast('Please sign in to log sessions', 'warning');
        return;
    }

    const btn = document.querySelector('.sparring-submit-btn');
    btn.disabled = true;

    const payload = {
        date: document.getElementById('sparring-date').value,
        duration: parseInt(document.getElementById('sparring-duration').value) || 0,
        rounds: parseInt(document.getElementById('sparring-rounds').value) || 0,
        intensity: parseInt(document.getElementById('sparring-intensity').value) || 5,
        partner_weight: parseFloat(document.getElementById('sparring-partner-weight').value) || 75,
        partner_skill: document.getElementById('sparring-partner-skill').value,
        headshots_received: parseInt(document.getElementById('sparring-headshots').value) || 0,
        bodyshots_received: parseInt(document.getElementById('sparring-bodyshots').value) || 0,
        notes: document.getElementById('sparring-notes').value.trim()
    };

    if (!payload.date) {
        showToast('Please select a date', 'error');
        btn.disabled = false;
        return;
    }

    try {
        const res = await fetch('/api/sparring/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to log session');
        }
        showToast('Session logged successfully!', 'success');
        document.getElementById('sparring-notes').value = '';
        document.getElementById('sparring-headshots').value = '0';
        document.getElementById('sparring-bodyshots').value = '0';
        await loadSparringSessions();
    } catch (err) {
        showToast(err.message || 'Error logging session', 'error');
    } finally {
        btn.disabled = false;
    }
}

async function deleteSparringSession(id) {
    if (!confirm('Delete this sparring session?')) return;
    try {
        const res = await fetch(`/api/sparring/sessions/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to delete session');
        showToast('Session deleted', 'success');
        await loadSparringSessions();
    } catch (err) {
        showToast(err.message || 'Error deleting session', 'error');
    }
}

function renderSparringChart(sessions) {
    const canvas = document.getElementById('sparring-chart');
    const emptyMsg = document.getElementById('sparring-chart-empty');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const sorted = [...(sessions || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sorted.length === 0) {
        canvas.classList.add('hidden');
        if (emptyMsg) emptyMsg.classList.remove('hidden');
        return;
    }

    canvas.classList.remove('hidden');
    if (emptyMsg) emptyMsg.classList.add('hidden');

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = 280;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const padLeft = 45, padRight = 20, padTop = 20, padBottom = 50;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.font = '10px Montserrat, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 10; i += 2) {
        const y = padTop + chartH - (i / 10) * chartH;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + chartW, y);
        ctx.stroke();
        ctx.fillText(i.toString(), padLeft - 8, y + 4);
    }

    const maxHeadshots = Math.max(1, ...sorted.map(s => s.headshots_received || 0));
    const barWidth = Math.max(8, Math.min(30, chartW / sorted.length - 4));

    sorted.forEach((s, i) => {
        const x = padLeft + (i / Math.max(1, sorted.length - 1)) * chartW;
        const headshots = s.headshots_received || 0;
        const barH = (headshots / maxHeadshots) * chartH * 0.6;
        const bx = sorted.length === 1 ? padLeft + chartW / 2 : x;

        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fillRect(bx - barWidth / 2, padTop + chartH - barH, barWidth, barH);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx - barWidth / 2, padTop + chartH - barH, barWidth, barH);
    });

    if (sorted.length > 1) {
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        sorted.forEach((s, i) => {
            const x = padLeft + (i / (sorted.length - 1)) * chartW;
            const y = padTop + chartH - ((s.intensity || 0) / 10) * chartH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
        ctx.stroke();
    }

    sorted.forEach((s, i) => {
        const x = sorted.length === 1 ? padLeft + chartW / 2 : padLeft + (i / Math.max(1, sorted.length - 1)) * chartW;
        const y = padTop + chartH - ((s.intensity || 0) / 10) * chartH;
        const color = getIntensityColor(s.intensity || 0);

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '9px Montserrat, sans-serif';
    const maxLabels = Math.min(sorted.length, Math.floor(chartW / 60));
    const step = Math.max(1, Math.ceil(sorted.length / maxLabels));
    sorted.forEach((s, i) => {
        if (i % step !== 0 && i !== sorted.length - 1) return;
        const x = sorted.length === 1 ? padLeft + chartW / 2 : padLeft + (i / Math.max(1, sorted.length - 1)) * chartW;
        const dateStr = new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        ctx.save();
        ctx.translate(x, padTop + chartH + 12);
        ctx.rotate(-0.4);
        ctx.fillText(dateStr, 0, 0);
        ctx.restore();
    });

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px Montserrat, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillRect(padLeft + 10, padTop + 4, 8, 8);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.fillRect(padLeft + 10, padTop + 18, 8, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('Intensity', padLeft + 22, padTop + 12);
    ctx.fillText('Headshots', padLeft + 22, padTop + 26);
    ctx.fillStyle = 'rgba(52, 211, 153, 0.6)';
    ctx.fillRect(padLeft + 10, padTop + 4, 8, 8);
}

function renderSparringHistory(sessions) {
    const container = document.getElementById('sparring-history');
    const emptyMsg = document.getElementById('sparring-history-empty');
    if (!container) return;

    const sorted = [...(sessions || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sorted.length === 0) {
        container.innerHTML = '';
        if (emptyMsg) {
            container.appendChild(emptyMsg);
            emptyMsg.classList.remove('hidden');
        } else {
            container.innerHTML = '<div class="sparring-chart-empty"><p>No sessions recorded yet.</p></div>';
        }
        return;
    }

    const emptyEl = container.querySelector('#sparring-history-empty');
    container.innerHTML = '';

    sorted.forEach(s => {
        const color = getIntensityColor(s.intensity || 0);
        const dateStr = new Date(s.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        const card = document.createElement('div');
        card.className = 'sparring-session-card';
        card.innerHTML = `
            <div class="sparring-session-card-header">
                <span class="sparring-session-date">${dateStr}</span>
                <span class="sparring-session-intensity" style="background: ${color}22; color: ${color}; border: 1px solid ${color}44;">
                    Intensity ${s.intensity || 0}/10
                </span>
            </div>
            <div class="sparring-session-details">
                <div class="sparring-detail-item">
                    <span class="sparring-detail-label">Duration</span>
                    <span class="sparring-detail-value">${s.duration || 0} min</span>
                </div>
                <div class="sparring-detail-item">
                    <span class="sparring-detail-label">Rounds</span>
                    <span class="sparring-detail-value">${s.rounds || 0}</span>
                </div>
                <div class="sparring-detail-item">
                    <span class="sparring-detail-label">Partner</span>
                    <span class="sparring-detail-value">${s.partner_weight || '—'}kg · ${s.partner_skill || '—'}</span>
                </div>
                <div class="sparring-detail-item">
                    <span class="sparring-detail-label">Headshots</span>
                    <span class="sparring-detail-value" style="color: ${(s.headshots_received || 0) > 10 ? '#ef4444' : 'inherit'}">${s.headshots_received || 0}</span>
                </div>
                <div class="sparring-detail-item">
                    <span class="sparring-detail-label">Bodyshots</span>
                    <span class="sparring-detail-value">${s.bodyshots_received || 0}</span>
                </div>
            </div>
            ${s.notes ? `<div class="sparring-session-notes">"${s.notes}"</div>` : ''}
            <button class="sparring-delete-btn" onclick="deleteSparringSession(${s.id})" title="Delete session">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        `;
        container.appendChild(card);
    });
}

function initSparringTab() {
    const dateInput = document.getElementById('sparring-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    const slider = document.getElementById('sparring-intensity');
    const label = document.getElementById('sparring-intensity-value');
    if (slider && label) {
        slider.addEventListener('input', () => {
            label.textContent = slider.value;
            label.style.color = getIntensityColor(parseInt(slider.value));
        });
        label.style.color = getIntensityColor(parseInt(slider.value));
    }

    window.addEventListener('resize', () => {
        if (sparringSessions.length > 0 && document.getElementById('sparring-tab').classList.contains('active')) {
            renderSparringChart(sparringSessions);
        }
    });
}

function initGuideSearch() {
    const input = document.getElementById('guide-search-input');
    const resultsContainer = document.getElementById('guide-search-results');
    const clearBtn = document.getElementById('guide-search-clear');
    if (!input || !resultsContainer) return;

    let debounceTimer = null;

    const lessonNames = {};
    document.querySelectorAll('.lesson-nav-btn').forEach(btn => {
        lessonNames[btn.getAttribute('data-lesson')] = btn.textContent.trim();
    });

    function getTextNodes(el) {
        let text = '';
        el.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
                text += getTextNodes(node);
            }
        });
        return text;
    }

    function performSearch(query) {
        query = query.trim();
        if (!query) {
            resultsContainer.classList.add('hidden');
            resultsContainer.classList.remove('visible');
            clearBtn.classList.add('hidden');
            return;
        }

        clearBtn.classList.remove('hidden');
        const results = [];
        const lowerQuery = query.toLowerCase();
        const lessons = document.querySelectorAll('.lesson-content');

        lessons.forEach(lesson => {
            const lessonId = lesson.id.replace('lesson-', '');
            const lessonName = lessonNames[lessonId] || 'Lesson ' + lessonId;
            const fullText = getTextNodes(lesson);
            const lowerText = fullText.toLowerCase();
            let searchPos = 0;

            while (results.length < 10) {
                const idx = lowerText.indexOf(lowerQuery, searchPos);
                if (idx === -1) break;

                const snippetStart = Math.max(0, idx - 60);
                const snippetEnd = Math.min(fullText.length, idx + query.length + 80);
                let snippet = fullText.substring(snippetStart, snippetEnd).trim();

                if (snippetStart > 0) snippet = '...' + snippet;
                if (snippetEnd < fullText.length) snippet = snippet + '...';

                const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const highlighted = snippet.replace(new RegExp(escapedQuery, 'gi'), match => `<mark>${match}</mark>`);

                results.push({
                    lessonId,
                    lessonName,
                    snippet: highlighted,
                    matchIndex: idx
                });

                searchPos = idx + query.length;
            }
        });

        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="guide-search-no-results">No results found</div>';
        } else {
            resultsContainer.innerHTML = results.map(r => `
                <div class="guide-search-result-item" data-lesson="${r.lessonId}">
                    <div class="guide-search-result-lesson">${r.lessonName}</div>
                    <div class="guide-search-result-snippet">${r.snippet}</div>
                </div>
            `).join('');
        }

        resultsContainer.classList.remove('hidden');
        requestAnimationFrame(() => resultsContainer.classList.add('visible'));
    }

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => performSearch(input.value), 300);
    });

    clearBtn.addEventListener('click', () => {
        input.value = '';
        resultsContainer.classList.add('hidden');
        resultsContainer.classList.remove('visible');
        clearBtn.classList.add('hidden');
    });

    resultsContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.guide-search-result-item');
        if (!item) return;
        const lessonId = item.getAttribute('data-lesson');
        const btn = document.querySelector(`.lesson-nav-btn[data-lesson="${lessonId}"]`);
        if (btn) btn.click();
        resultsContainer.classList.add('hidden');
        resultsContainer.classList.remove('visible');
        input.value = '';
        clearBtn.classList.add('hidden');
        const lessonEl = document.getElementById('lesson-' + lessonId);
        if (lessonEl) {
            setTimeout(() => lessonEl.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.guide-search-container')) {
            resultsContainer.classList.add('hidden');
            resultsContainer.classList.remove('visible');
        }
    });
}

// Initialize tab and lesson navigation on page load
document.addEventListener('DOMContentLoaded', () => {
    initTabNavigation();
    initFreeArticleNavigation();
    initLessonNavigation();
    initSparringTab();
    initGuideSearch();
});
