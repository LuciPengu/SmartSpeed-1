let currentSession = null;
let selectedImpacts = new Set();
let assessmentData = null;
let savedRiskData = null;
let currentSection = 'punch-analysis';

document.addEventListener('DOMContentLoaded', () => {
    initializeUpload();
    initSectionTabs();
});

function initSectionTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchSection(tab.dataset.section);
        });
    });
}

function switchSection(sectionId) {
    currentSection = sectionId;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === sectionId);
    });
    
    document.querySelectorAll('.main-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    if (sectionId === 'scat5-assessment' && !assessmentData) {
        loadAssessmentQuestions();
    }
}

function restartAnalysis() {
    currentSession = null;
    selectedImpacts = new Set();
    savedRiskData = null;
    
    document.querySelectorAll('#punch-analysis-section .step').forEach(step => {
        step.classList.add('hidden');
    });
    document.getElementById('step-1').classList.remove('hidden');
    document.getElementById('step-1').classList.add('active');
    
    const uploadArea = document.getElementById('upload-area');
    const progressContainer = document.getElementById('upload-progress');
    uploadArea.classList.remove('hidden');
    progressContainer.classList.add('hidden');
}

function restartAssessment() {
    assessmentData = null;
    eyeTrackingResult = { completed: false, difficulty: 0, trackingScore: null, usedWebcam: false };
    
    document.getElementById('step-4').classList.remove('hidden');
    document.getElementById('step-5').classList.add('hidden');
    
    loadAssessmentQuestions();
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
    savedRiskData = riskData;
    document.getElementById('step-2').classList.add('hidden');
    document.getElementById('step-3').classList.remove('hidden');

    const riskHtml = `
        <div class="pre-assessment-message">
            <p><strong>${riskData.impact_count} punch impacts</strong> have been analyzed.</p>
            <p>Before viewing the full results, please complete a quick concussion screening assessment.</p>
        </div>
    `;

    document.getElementById('risk-results').innerHTML = riskHtml;
    document.getElementById('start-assessment-btn').addEventListener('click', loadConcussionAssessment);
}

async function loadConcussionAssessment() {
    try {
        const response = await fetch('/api/concussion-assessment');
        assessmentData = await response.json();
        switchSection('scat5-assessment');
        populateAssessmentForm();
    } catch (error) {
        alert('Error loading assessment: ' + error.message);
    }
}

async function loadAssessmentQuestions() {
    try {
        const response = await fetch('/api/concussion-assessment');
        assessmentData = await response.json();
        populateAssessmentForm();
    } catch (error) {
        console.error('Error loading assessment:', error);
    }
}

function populateAssessmentForm() {
    document.getElementById('step-4').classList.remove('hidden');
    document.getElementById('step-5').classList.add('hidden');

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

    document.getElementById('orientation-list').innerHTML = assessmentData.orientation_questions.map(q => {
        if (q.input_type === 'select') {
            return `
                <div class="question-item self-admin">
                    <label>${q.question}</label>
                    <select id="orientation-${q.id}" data-id="${q.id}">
                        <option value="">-- Select --</option>
                        ${q.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    </select>
                </div>
            `;
        } else {
            return `
                <div class="question-item self-admin">
                    <label>${q.question}</label>
                    <input type="number" id="orientation-${q.id}" data-id="${q.id}" 
                           min="${q.min || ''}" max="${q.max || ''}" placeholder="Enter number">
                </div>
            `;
        }
    }).join('');

    document.getElementById('memory-list').innerHTML = `
        <div class="memory-test">
            <div class="memory-words-display" id="memory-words-display">
                <p><strong>Memorize these 5 words:</strong></p>
                <div class="word-list">
                    ${assessmentData.memory_words.map(word => `<span class="memory-word">${word}</span>`).join('')}
                </div>
                <p class="memory-timer" id="memory-timer">Time remaining: <span id="timer-count">10</span> seconds</p>
                <button class="btn secondary" id="hide-words-btn" onclick="hideMemoryWords()">I've memorized them</button>
            </div>
            <div class="memory-recall hidden" id="memory-recall">
                <p><strong>Type the words you remember (one per line):</strong></p>
                <textarea id="recalled-words" rows="5" placeholder="Enter each word on a new line"></textarea>
            </div>
        </div>
    `;

    startMemoryTimer();
    initEyeTrackingTest();
    document.getElementById('submit-assessment-btn').addEventListener('click', submitAssessment);
}

let memoryTimerInterval = null;

function startMemoryTimer() {
    let seconds = 10;
    memoryTimerInterval = setInterval(() => {
        seconds--;
        const timerEl = document.getElementById('timer-count');
        if (timerEl) timerEl.textContent = seconds;
        if (seconds <= 0) {
            hideMemoryWords();
        }
    }, 1000);
}

function hideMemoryWords() {
    if (memoryTimerInterval) {
        clearInterval(memoryTimerInterval);
        memoryTimerInterval = null;
    }
    document.getElementById('memory-words-display').classList.add('hidden');
    document.getElementById('memory-recall').classList.remove('hidden');
}

let eyeTrackingResult = { completed: false, difficulty: 0, trackingScore: null, usedWebcam: false };
let faceDetector = null;
let videoStream = null;
let eyeTrackingAnimationId = null;
let calibrationData = [];
let trackingErrors = [];

function initEyeTrackingTest() {
    const container = document.getElementById('eye-tracking-container');
    container.innerHTML = `
        <div class="eye-tracking-test">
            <div class="eye-test-consent" id="eye-test-consent">
                <p>This test uses your webcam to track your eye movements as you follow a moving target.</p>
                <p class="privacy-note"><strong>Privacy:</strong> All processing happens locally in your browser. No video is recorded or uploaded.</p>
                <div class="consent-buttons">
                    <button class="btn primary" onclick="requestCameraAccess()">Enable Camera & Start Test</button>
                    <button class="btn secondary" onclick="useManualFallback()">Use Manual Test Instead</button>
                </div>
            </div>
            <div class="eye-test-loading hidden" id="eye-test-loading">
                <p>Loading eye tracking model...</p>
                <div class="loading-spinner"></div>
            </div>
            <div class="eye-test-calibration hidden" id="eye-test-calibration">
                <p>Look at each dot as it appears and click when ready</p>
                <div class="calibration-container">
                    <video id="calibration-video" autoplay playsinline></video>
                    <canvas id="calibration-canvas" width="640" height="480"></canvas>
                    <div id="calibration-dot" class="calibration-dot"></div>
                </div>
                <p id="calibration-status">Calibration point 1 of 5</p>
            </div>
            <div class="eye-test-tracking hidden" id="eye-test-tracking">
                <p>Follow the red dot with your eyes - keep your head still</p>
                <div class="tracking-container">
                    <video id="tracking-video" autoplay playsinline></video>
                    <canvas id="tracking-canvas" width="640" height="480"></canvas>
                </div>
                <p id="tracking-status">Tracking...</p>
            </div>
            <div class="eye-test-result hidden" id="eye-test-result">
                <div id="tracking-score-display"></div>
                <p id="manual-difficulty-prompt" class="hidden"><strong>Rate your difficulty following the dot:</strong></p>
                <div class="difficulty-scale" id="difficulty-scale">
                    <button class="difficulty-btn" data-difficulty="0" onclick="setEyeTrackingDifficulty(0)">Easy (No difficulty)</button>
                    <button class="difficulty-btn" data-difficulty="1" onclick="setEyeTrackingDifficulty(1)">Mild difficulty</button>
                    <button class="difficulty-btn" data-difficulty="2" onclick="setEyeTrackingDifficulty(2)">Moderate difficulty</button>
                    <button class="difficulty-btn" data-difficulty="3" onclick="setEyeTrackingDifficulty(3)">Severe difficulty / Could not follow</button>
                </div>
            </div>
            <div class="eye-test-manual hidden" id="eye-test-manual">
                <div class="eye-test-instructions">
                    <p>Follow the red dot with your eyes only (keep your head still).</p>
                    <button class="btn primary" onclick="startManualEyeTest()">Start Test</button>
                </div>
            </div>
            <div class="eye-test-canvas-container hidden" id="eye-test-canvas-container">
                <canvas id="eye-tracking-canvas" width="400" height="300"></canvas>
                <p id="eye-test-progress">Following target...</p>
            </div>
        </div>
    `;
}

async function requestCameraAccess() {
    document.getElementById('eye-test-consent').classList.add('hidden');
    document.getElementById('eye-test-loading').classList.remove('hidden');
    
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, facingMode: 'user' } 
        });
        
        await loadFaceDetector();
        startCalibration();
    } catch (error) {
        console.error('Camera access denied:', error);
        alert('Camera access was denied. Falling back to manual test.');
        useManualFallback();
    }
}

async function loadFaceDetector() {
    try {
        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        faceDetector = await faceLandmarksDetection.createDetector(model, {
            runtime: 'tfjs',
            refineLandmarks: true,
            maxFaces: 1
        });
    } catch (error) {
        console.error('Failed to load face detector:', error);
        throw error;
    }
}

function startCalibration() {
    document.getElementById('eye-test-loading').classList.add('hidden');
    document.getElementById('eye-test-calibration').classList.remove('hidden');
    
    const video = document.getElementById('calibration-video');
    video.srcObject = videoStream;
    
    calibrationData = [];
    const calibrationPoints = [
        { x: 50, y: 50 },
        { x: 590, y: 50 },
        { x: 320, y: 240 },
        { x: 50, y: 430 },
        { x: 590, y: 430 }
    ];
    
    let currentCalibPoint = 0;
    const dot = document.getElementById('calibration-dot');
    const status = document.getElementById('calibration-status');
    
    function showNextPoint() {
        if (currentCalibPoint >= calibrationPoints.length) {
            startTracking();
            return;
        }
        
        const point = calibrationPoints[currentCalibPoint];
        dot.style.left = point.x + 'px';
        dot.style.top = point.y + 'px';
        status.textContent = `Calibration point ${currentCalibPoint + 1} of ${calibrationPoints.length} - Look at the dot and click`;
        
        dot.onclick = async () => {
            const faces = await faceDetector.estimateFaces(video);
            if (faces.length > 0) {
                const iris = getIrisPosition(faces[0]);
                calibrationData.push({ screen: point, iris: iris });
            }
            currentCalibPoint++;
            showNextPoint();
        };
    }
    
    showNextPoint();
}

function getIrisPosition(face) {
    const leftIris = face.keypoints.filter(k => k.name && k.name.includes('leftIris'));
    const rightIris = face.keypoints.filter(k => k.name && k.name.includes('rightIris'));
    
    let x = 0, y = 0, count = 0;
    
    [...leftIris, ...rightIris].forEach(point => {
        x += point.x;
        y += point.y;
        count++;
    });
    
    if (count === 0) {
        const leftEye = face.keypoints.find(k => k.name === 'leftEye');
        const rightEye = face.keypoints.find(k => k.name === 'rightEye');
        if (leftEye && rightEye) {
            return { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
        }
        return { x: 320, y: 240 };
    }
    
    return { x: x / count, y: y / count };
}

function startTracking() {
    document.getElementById('eye-test-calibration').classList.add('hidden');
    document.getElementById('eye-test-tracking').classList.remove('hidden');
    
    const video = document.getElementById('tracking-video');
    video.srcObject = videoStream;
    
    const canvas = document.getElementById('tracking-canvas');
    const ctx = canvas.getContext('2d');
    
    trackingErrors = [];
    
    const trackingPoints = [
        { x: 100, y: 240 },
        { x: 100, y: 80 },
        { x: 320, y: 80 },
        { x: 320, y: 240 },
        { x: 320, y: 400 },
        { x: 540, y: 400 },
        { x: 540, y: 240 },
        { x: 540, y: 80 }
    ];
    
    let currentSegment = 0;
    let progress = 0;
    const speed = 0.015;
    let lastTrackTime = 0;
    
    async function trackFrame(timestamp) {
        if (timestamp - lastTrackTime < 50) {
            eyeTrackingAnimationId = requestAnimationFrame(trackFrame);
            return;
        }
        lastTrackTime = timestamp;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const start = trackingPoints[currentSegment];
        const end = trackingPoints[(currentSegment + 1) % trackingPoints.length];
        const targetX = start.x + (end.x - start.x) * progress;
        const targetY = start.y + (end.y - start.y) * progress;
        
        ctx.beginPath();
        ctx.arc(targetX, targetY, 20, 0, Math.PI * 2);
        ctx.fillStyle = '#e94560';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(targetX, targetY, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        
        try {
            const faces = await faceDetector.estimateFaces(video);
            if (faces.length > 0) {
                const iris = getIrisPosition(faces[0]);
                const estimatedGaze = estimateGazePosition(iris);
                
                const error = Math.sqrt(
                    Math.pow(estimatedGaze.x - targetX, 2) + 
                    Math.pow(estimatedGaze.y - targetY, 2)
                );
                trackingErrors.push(error);
                
                ctx.beginPath();
                ctx.arc(estimatedGaze.x, estimatedGaze.y, 8, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(79, 195, 247, 0.7)';
                ctx.fill();
            }
        } catch (e) {
            console.error('Tracking error:', e);
        }
        
        progress += speed;
        
        if (progress >= 1) {
            progress = 0;
            currentSegment++;
            
            if (currentSegment >= trackingPoints.length - 1) {
                cancelAnimationFrame(eyeTrackingAnimationId);
                finishTracking();
                return;
            }
        }
        
        document.getElementById('tracking-status').textContent = 
            `Tracking... ${Math.round((currentSegment / (trackingPoints.length - 1)) * 100)}%`;
        
        eyeTrackingAnimationId = requestAnimationFrame(trackFrame);
    }
    
    eyeTrackingAnimationId = requestAnimationFrame(trackFrame);
}

function estimateGazePosition(iris) {
    if (calibrationData.length < 3) {
        return { x: 320, y: 240 };
    }
    
    let sumX = 0, sumY = 0;
    let sumIrisX = 0, sumIrisY = 0;
    
    calibrationData.forEach(c => {
        sumX += c.screen.x;
        sumY += c.screen.y;
        sumIrisX += c.iris.x;
        sumIrisY += c.iris.y;
    });
    
    const avgScreenX = sumX / calibrationData.length;
    const avgScreenY = sumY / calibrationData.length;
    const avgIrisX = sumIrisX / calibrationData.length;
    const avgIrisY = sumIrisY / calibrationData.length;
    
    const scaleX = 640 / 100;
    const scaleY = 480 / 100;
    
    const gazeX = avgScreenX + (iris.x - avgIrisX) * scaleX;
    const gazeY = avgScreenY + (iris.y - avgIrisY) * scaleY;
    
    return { 
        x: Math.max(0, Math.min(640, gazeX)), 
        y: Math.max(0, Math.min(480, gazeY)) 
    };
}

function finishTracking() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    document.getElementById('eye-test-tracking').classList.add('hidden');
    document.getElementById('eye-test-result').classList.remove('hidden');
    document.getElementById('difficulty-scale').classList.add('hidden');
    
    const avgError = trackingErrors.length > 0 
        ? trackingErrors.reduce((a, b) => a + b, 0) / trackingErrors.length 
        : 999;
    
    let difficulty = 0;
    let qualityLabel = '';
    
    if (avgError < 80) {
        difficulty = 0;
        qualityLabel = 'Excellent tracking';
    } else if (avgError < 150) {
        difficulty = 1;
        qualityLabel = 'Good tracking with minor deviations';
    } else if (avgError < 250) {
        difficulty = 2;
        qualityLabel = 'Moderate tracking difficulty detected';
    } else {
        difficulty = 3;
        qualityLabel = 'Significant tracking difficulty detected';
    }
    
    eyeTrackingResult = { 
        completed: true, 
        difficulty: difficulty, 
        trackingScore: Math.round(100 - Math.min(avgError / 3, 100)),
        usedWebcam: true
    };
    
    const scoreDisplay = document.getElementById('tracking-score-display');
    scoreDisplay.innerHTML = `
        <div class="tracking-result-card">
            <h4>Eye Tracking Complete</h4>
            <div class="tracking-score">${eyeTrackingResult.trackingScore}%</div>
            <p class="tracking-quality ${difficulty > 1 ? 'warning' : ''}">${qualityLabel}</p>
            <p class="tracking-note">This automated score will be included in your assessment.</p>
        </div>
    `;
}

function useManualFallback() {
    document.getElementById('eye-test-consent').classList.add('hidden');
    document.getElementById('eye-test-loading').classList.add('hidden');
    document.getElementById('eye-test-manual').classList.remove('hidden');
}

function startManualEyeTest() {
    document.getElementById('eye-test-manual').classList.add('hidden');
    document.getElementById('eye-test-canvas-container').classList.remove('hidden');
    
    const canvas = document.getElementById('eye-tracking-canvas');
    const ctx = canvas.getContext('2d');
    
    const points = [
        { x: 50, y: 150 }, { x: 50, y: 50 }, { x: 200, y: 50 },
        { x: 200, y: 150 }, { x: 200, y: 250 }, { x: 350, y: 250 },
        { x: 350, y: 150 }, { x: 350, y: 50 }
    ];
    
    let currentPoint = 0;
    let progress = 0;
    const speed = 0.02;
    
    function animate() {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < points.length - 1; i++) {
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[i + 1].x, points[i + 1].y);
        }
        ctx.stroke();
        
        const start = points[currentPoint];
        const end = points[(currentPoint + 1) % points.length];
        const x = start.x + (end.x - start.x) * progress;
        const y = start.y + (end.y - start.y) * progress;
        
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#e94560';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        
        progress += speed;
        
        if (progress >= 1) {
            progress = 0;
            currentPoint++;
            if (currentPoint >= points.length - 1) {
                cancelAnimationFrame(eyeTrackingAnimationId);
                endManualTest();
                return;
            }
        }
        eyeTrackingAnimationId = requestAnimationFrame(animate);
    }
    animate();
}

function endManualTest() {
    document.getElementById('eye-test-canvas-container').classList.add('hidden');
    document.getElementById('eye-test-result').classList.remove('hidden');
    document.getElementById('tracking-score-display').innerHTML = '<p>Test complete. Please rate your difficulty below:</p>';
    document.getElementById('difficulty-scale').classList.remove('hidden');
    document.getElementById('manual-difficulty-prompt').classList.remove('hidden');
}

function setEyeTrackingDifficulty(difficulty) {
    eyeTrackingResult = { completed: true, difficulty: difficulty, usedWebcam: false };
    
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.difficulty) === difficulty) {
            btn.classList.add('active');
        }
    });
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
    if (!eyeTrackingResult.completed) {
        if (!confirm('You have not completed the eye tracking test or selected a difficulty rating. Do you want to submit without it? Your assessment may be less accurate.')) {
            return;
        }
    }
    
    const redFlags = Array.from(document.querySelectorAll('#red-flags-list input[type="checkbox"]')).map(cb => ({
        id: cb.dataset.id,
        present: cb.checked
    }));

    const symptoms = Array.from(document.querySelectorAll('#symptoms-list input[type="range"]')).map(slider => ({
        id: slider.dataset.id,
        severity: parseInt(slider.value)
    }));

    const orientation = assessmentData.orientation_questions.map(q => {
        const input = document.getElementById(`orientation-${q.id}`);
        return {
            id: q.id,
            answer: input ? input.value : ''
        };
    });

    const recalledWordsText = document.getElementById('recalled-words').value;
    const recalledWords = recalledWordsText.split('\n').map(w => w.trim()).filter(w => w.length > 0);
    const originalWords = assessmentData.memory_words;

    try {
        const response = await fetch('/api/concussion-assessment/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                red_flags: redFlags, 
                symptoms, 
                orientation, 
                recalled_words: recalledWords,
                original_words: originalWords,
                eye_tracking: eyeTrackingResult
            })
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

    let riskSummaryHtml = '';
    if (savedRiskData) {
        riskSummaryHtml = `
            <div class="combined-risk-summary">
                <h3>Punch Impact Analysis Summary</h3>
                <div class="risk-overview-mini">
                    <div class="risk-gauge">
                        <div class="risk-level ${savedRiskData.overall_risk}">${savedRiskData.overall_risk}</div>
                        <div class="risk-percentage">${savedRiskData.risk_percentage}%</div>
                        <div class="summary-label">Impact Risk</div>
                    </div>
                    <div class="impact-stats-mini">
                        <p>Clean Punches Detected: <strong>${savedRiskData.impact_count}</strong></p>
                        <p>Max Force: <strong>${savedRiskData.max_single_impact_force.toFixed(1)} N</strong></p>
                        <p>Total Force: <strong>${savedRiskData.total_force_estimate.toFixed(1)} N</strong></p>
                        <p>Puncher Weight: <strong>${savedRiskData.puncher_weight_kg} kg</strong></p>
                    </div>
                </div>
                <h4>Impact Details</h4>
                <table class="impact-details-table compact">
                    <thead>
                        <tr>
                            <th>Frame</th>
                            <th>Time</th>
                            <th>Hand</th>
                            <th>Force (N)</th>
                            <th>G-Force</th>
                            <th>Risk</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${savedRiskData.impact_details.map(d => `
                            <tr>
                                <td>${d.frame}</td>
                                <td>${d.time.toFixed(2)}s</td>
                                <td>${d.hand}</td>
                                <td>${d.estimated_force_newtons.toFixed(1)}</td>
                                <td>${d.g_force.toFixed(1)}</td>
                                <td class="risk-level ${d.risk_level}">${d.risk_level}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    const resultHtml = `
        <div class="assessment-result-card">
            <h3>Concussion Screening Assessment</h3>
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
                    <div class="score-value">${result.eye_tracking_result || 'N/A'}</div>
                    <div class="score-label">Eye Tracking</div>
                </div>
                <div class="score-item">
                    <div class="score-value">${result.memory_score}/${result.memory_max}</div>
                    <div class="score-label">Memory Score</div>
                </div>
            </div>

            ${symptomDetailsHtml}

            <p class="disclaimer">${result.disclaimer}</p>
        </div>
        
        ${riskSummaryHtml}
    `;

    document.getElementById('assessment-results').innerHTML = resultHtml;
    document.getElementById('restart-btn').addEventListener('click', () => location.reload());
}
