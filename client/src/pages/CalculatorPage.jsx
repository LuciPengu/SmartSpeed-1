import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useMediaPipe from '../hooks/useMediaPipe';
import { calculateForceMetrics } from '../utils/forceCalculator';
import { calculateBrainInjuryRisk } from '../utils/riskCalculator';
import { SCAT5_SYMPTOMS, RED_FLAGS, evaluateAssessment } from '../utils/concussionAssessment';
import ShareCard from '../components/ShareCard';
import SubscriptionModal from '../components/SubscriptionModal';

const skillOptions = [
  { value: 'Beginner', label: 'Beginner' },
  { value: 'Amateur', label: 'Amateur' },
  { value: 'Professional', label: 'Professional' },
  { value: 'Elite', label: 'Elite' },
];

function FighterCard({ num, color, fighter, setFighter }) {
  return (
    <div className="glass-card">
      <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: `rgba(${color}, 0.2)`, color: `rgb(${color})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700' }}>{num}</span>
        Fighter {num}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="input-group">
          <label>Skill Level</label>
          <select className="cyber-select" value={fighter.skill} onChange={e => setFighter(f => ({ ...f, skill: e.target.value }))}>
            {skillOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label>Weight (kg)</label>
          <input type="number" className="cyber-input" value={fighter.weight} onChange={e => setFighter(f => ({ ...f, weight: parseFloat(e.target.value) || 75 }))} min="40" max="200" />
        </div>
        <div className="input-group">
          <label>Throwing Intensity: {fighter.throwingIntensity}%</label>
          <input type="range" min="10" max="100" value={fighter.throwingIntensity} onChange={e => setFighter(f => ({ ...f, throwingIntensity: parseInt(e.target.value) }))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ value }) {
  return (
    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ width: `${value}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--primary-dark))', borderRadius: '4px', transition: 'width 0.3s ease' }} />
    </div>
  );
}

function ImpactCard({ impact, metrics, selected, onToggle, showCheckbox }) {
  const riskColors = { high: '#ef4444', moderate: '#f59e0b', 'low-moderate': '#10b981', low: '#10b981' };
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', border: selected ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s', cursor: showCheckbox ? 'pointer' : 'default' }} onClick={showCheckbox ? onToggle : undefined}>
      {impact.frameImage && (
        <img src={impact.frameImage} alt={`Impact ${impact.id}`} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
      )}
      <div style={{ padding: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {showCheckbox && (
              <input type="checkbox" checked={selected} onChange={onToggle} onClick={e => e.stopPropagation()} style={{ accentColor: 'var(--primary)' }} />
            )}
            <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', background: impact.hand === 'LEFT' ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)', color: impact.hand === 'LEFT' ? '#3b82f6' : '#ef4444' }}>{impact.hand}</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>F{impact.fighter} @ {impact.time?.toFixed(1)}s</span>
        </div>
        {metrics && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.75rem' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Speed:</span> <span style={{ fontWeight: '600' }}>{metrics.speedMin}-{metrics.speedMax} mph</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Force:</span> <span style={{ fontWeight: '600' }}>{metrics.forceMin}-{metrics.forceMax}N</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Avg:</span> <span style={{ fontWeight: '600' }}>{metrics.avgForce}N</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>G-Force:</span> <span style={{ fontWeight: '600', color: metrics.gForce > 60 ? '#ef4444' : metrics.gForce > 30 ? '#f59e0b' : '#10b981' }}>{metrics.gForce}g</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

function SCAT5Screener({ strikeData, onComplete, onSkip }) {
  const [step, setStep] = useState(0);
  const [redFlagResponses, setRedFlagResponses] = useState(RED_FLAGS.map(f => ({ id: f.id, present: false })));
  const [symptomResponses, setSymptomResponses] = useState(SCAT5_SYMPTOMS.map(s => ({ id: s.id, severity: 0 })));
  const [result, setResult] = useState(null);

  function toggleRedFlag(id) {
    setRedFlagResponses(prev => prev.map(f => f.id === id ? { ...f, present: !f.present } : f));
  }

  function setSymptomSeverity(id, severity) {
    setSymptomResponses(prev => prev.map(s => s.id === id ? { ...s, severity } : s));
  }

  function handleSubmit() {
    const assessment = evaluateAssessment({ red_flags: redFlagResponses, symptoms: symptomResponses }, strikeData);
    setResult(assessment);
    if (onComplete) onComplete(assessment);
  }

  const urgencyColors = { emergency: '#ef4444', high: '#ef4444', moderate: '#f59e0b', low: '#10b981', none: '#10b981' };

  if (result) {
    return (
      <div className="glass-card" style={{ borderColor: urgencyColors[result.urgency_level] + '40' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Screening Results</h3>
          <button className="btn btn-sm" onClick={onSkip}>Close</button>
        </div>
        <div style={{ padding: '16px', borderRadius: '12px', background: urgencyColors[result.urgency_level] + '15', border: `1px solid ${urgencyColors[result.urgency_level]}40`, marginBottom: '16px' }}>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: urgencyColors[result.urgency_level], fontWeight: '700', marginBottom: '4px' }}>
            {result.urgency_level} Urgency
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>{result.recommendation}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: result.red_flags_count > 0 ? '#ef4444' : '#10b981' }}>{result.red_flags_count}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Red Flags</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{result.symptom_total}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Symptoms</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{result.symptom_severity_score}/{result.max_symptom_severity}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Severity</div>
          </div>
        </div>
        {result.symptom_details.length > 0 && (
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Top Symptoms:</div>
            {result.symptom_details.slice(0, 5).map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.85rem' }}>
                <span>{s.name}</span>
                <span style={{ color: s.severity >= 4 ? '#ef4444' : s.severity >= 2 ? '#f59e0b' : '#10b981', fontWeight: '600' }}>{s.severity}/6</span>
              </div>
            ))}
          </div>
        )}
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '16px', fontStyle: 'italic' }}>{result.disclaimer}</p>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Concussion Screening (SCAT5)</h3>
        <button className="btn btn-sm" onClick={onSkip}>Skip</button>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>This screening is optional and does not replace professional medical evaluation.</p>

      {step === 0 && (
        <div>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', color: '#ef4444' }}>Red Flags</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Check if any of these warning signs are present:</p>
          {RED_FLAGS.map(flag => (
            <label key={flag.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="checkbox" checked={redFlagResponses.find(r => r.id === flag.id)?.present || false} onChange={() => toggleRedFlag(flag.id)} style={{ accentColor: '#ef4444' }} />
              {flag.name}
            </label>
          ))}
          <button className="btn-primary" onClick={() => setStep(1)} style={{ marginTop: '16px', width: '100%' }}>Next: Symptoms</button>
        </div>
      )}

      {step === 1 && (
        <div>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '12px' }}>Symptom Severity</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Rate each symptom from 0 (none) to 6 (severe):</p>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {SCAT5_SYMPTOMS.map(symptom => {
              const val = symptomResponses.find(s => s.id === symptom.id)?.severity || 0;
              return (
                <div key={symptom.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.85rem', flex: 1 }}>{symptom.name}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[0, 1, 2, 3, 4, 5, 6].map(n => (
                      <button key={n} onClick={() => setSymptomSeverity(symptom.id, n)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: val === n ? (n === 0 ? 'var(--primary)' : n <= 2 ? '#f59e0b' : '#ef4444') : 'rgba(255,255,255,0.08)', color: val === n ? '#fff' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>{n}</button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button className="btn" onClick={() => setStep(0)} style={{ flex: 1 }}>Back</button>
            <button className="btn-primary" onClick={handleSubmit} style={{ flex: 1 }}>Submit Assessment</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalculatorPage() {
  const { currentUser, hasActiveSubscription } = useAuth();
  const { showToast } = useToast();
  const { analyzeVideo, isLoading, progress, error: mpError } = useMediaPipe();

  const [phase, setPhase] = useState(1);
  const [fighter1, setFighter1] = useState({ skill: 'Professional', weight: 75, throwingIntensity: 100 });
  const [fighter2, setFighter2] = useState({ skill: 'Professional', weight: 75, throwingIntensity: 100 });

  const [showSubModal, setShowSubModal] = useState(false);
  const [impacts, setImpacts] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const [riskData, setRiskData] = useState(null);
  const [showScat5, setShowScat5] = useState(false);
  const [scat5Result, setScat5Result] = useState(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [webcamStream, setWebcamStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const webcamVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  const fighterSettings = { fighter1, fighter2 };

  function goToPhase2() {
    if (!currentUser) {
      showToast('Please log in to use the calculator', 'warning');
      return;
    }
    if (!hasActiveSubscription) {
      setShowSubModal(true);
      return;
    }
    setPhase(2);
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    await runAnalysis(file);
  }

  async function startWebcam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false });
      setWebcamStream(stream);
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        webcamVideoRef.current.play();
      }
    } catch {
      showToast('Could not access webcam', 'error');
    }
  }

  function stopWebcam() {
    if (webcamStream) {
      webcamStream.getTracks().forEach(t => t.stop());
      setWebcamStream(null);
    }
  }

  function startRecording() {
    if (!webcamStream) return;
    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(webcamStream, { mimeType: 'video/webm' });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const file = new File([blob], 'webcam-recording.webm', { type: 'video/webm' });
      stopWebcam();
      await runAnalysis(file);
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  async function runAnalysis(file) {
    setAnalyzing(true);
    setImpacts([]);
    setSelectedIds(new Set());
    setAnalysisProgress(0);

    try {
      const result = await analyzeVideo(
        file,
        (pct) => setAnalysisProgress(pct),
        (impact) => {
          setImpacts(prev => [...prev, impact]);
          setSelectedIds(prev => new Set([...prev, impact.id]));
        }
      );
      setAnalysisResult(result);
      setAnalyzing(false);

      if (result.impacts.length === 0) {
        showToast('No impacts detected in the video', 'info');
      } else {
        showToast(`${result.impacts.length} impacts detected!`, 'success');
      }
    } catch (err) {
      setAnalyzing(false);
      showToast(err.message || 'Analysis failed', 'error');
    }
  }

  function toggleImpactSelection(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function proceedToResults() {
    const selected = impacts.filter(i => selectedIds.has(i.id));
    if (selected.length === 0) {
      showToast('Select at least one impact', 'warning');
      return;
    }

    const enrichedForRisk = selected.map(imp => {
      const fKey = imp.fighter === 2 ? 'fighter2' : 'fighter1';
      const settings = fighterSettings[fKey];
      const metrics = calculateForceMetrics(imp, settings);
      return {
        ...imp,
        speed_range: { min: metrics.speedMin, max: metrics.speedMax },
        power_range: { min: metrics.forceMin, max: metrics.forceMax },
        motion_intensity: imp.motionIntensity,
      };
    });

    const risk = calculateBrainInjuryRisk(enrichedForRisk, fighterSettings);
    setRiskData(risk);
    setPhase(3);
  }

  async function getAiSummary() {
    if (!hasActiveSubscription) {
      showToast('AI Summary requires a subscription', 'warning');
      return;
    }
    setAiLoading(true);
    setAiSummary('');

    try {
      const selected = impacts.filter(i => selectedIds.has(i.id));
      const response = await fetch('/api/ai-summary/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          impacts: selected.map(i => ({ id: i.id, fighter: i.fighter, hand: i.hand, time: i.time, velocity: i.velocity, motionIntensity: i.motionIntensity })),
          risk_data: riskData,
          fighter_settings: fighterSettings,
        }),
      });

      if (!response.ok) {
        showToast('Failed to get AI summary', 'error');
        setAiLoading(false);
        return;
      }

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
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                setAiSummary(prev => prev + parsed.content);
              }
            } catch {
              setAiSummary(prev => prev + data);
            }
          }
        }
      }
    } catch {
      showToast('AI summary failed', 'error');
    } finally {
      setAiLoading(false);
    }
  }

  const selectedImpacts = impacts.filter(i => selectedIds.has(i.id));
  const riskColorMap = { critical: '#ef4444', high: '#ef4444', moderate: '#f59e0b', 'low-moderate': '#10b981', low: '#10b981' };

  useEffect(() => {
    return () => {
      if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
    };
  }, [webcamStream]);

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px' }}>Strike Calculator</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Upload sparring footage to detect and analyze punch impacts using AI-powered pose estimation.
        </p>
        <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ height: '4px', flex: 1, borderRadius: '2px', background: phase >= n ? 'var(--primary)' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
          ))}
        </div>
      </div>

      {phase === 1 && (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <FighterCard num={1} color="59, 130, 246" fighter={fighter1} setFighter={setFighter1} />
            <FighterCard num={2} color="239, 68, 68" fighter={fighter2} setFighter={setFighter2} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={goToPhase2} style={{ padding: '12px 40px' }}>
              Next: Upload Video →
            </button>
          </div>
        </div>
      )}

      {phase === 2 && (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
          {!analyzing && !analysisResult && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px', marginBottom: '24px' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Upload Sparring Video</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
                Select a video file or use your webcam to record a sparring session for analysis.
              </p>

              <input ref={fileInputRef} type="file" accept=".mp4,.avi,.mov,.mkv,.webm" onChange={handleFileSelect} style={{ display: 'none' }} />

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => fileInputRef.current?.click()} style={{ padding: '12px 32px' }}>
                  📁 Choose File
                </button>
                {!webcamStream ? (
                  <button className="btn" onClick={startWebcam} style={{ padding: '12px 32px' }}>
                    📷 Use Webcam
                  </button>
                ) : null}
              </div>

              {webcamStream && (
                <div style={{ marginTop: '24px' }}>
                  <video ref={webcamVideoRef} muted playsInline style={{ width: '100%', maxWidth: '480px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '12px' }}>
                    {!recording ? (
                      <button className="btn-primary" onClick={startRecording} style={{ background: '#ef4444', boxShadow: '0 4px 15px rgba(239,68,68,0.3)' }}>
                        ⏺ Start Recording
                      </button>
                    ) : (
                      <button className="btn-primary" onClick={stopRecording} style={{ background: '#ef4444' }}>
                        ⏹ Stop Recording
                      </button>
                    )}
                    <button className="btn" onClick={stopWebcam}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {(analyzing || isLoading) && (
            <div className="glass-card" style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px' }}>Analyzing Video...</h3>
              <ProgressBar value={analysisProgress || progress} />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                {analysisProgress < 10 ? 'Loading AI model...' : `Processing frames: ${analysisProgress}%`}
              </p>
              {mpError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '8px' }}>{mpError}</p>}
            </div>
          )}

          {impacts.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Detected Impacts ({impacts.length})</h3>
                {!analyzing && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-sm" onClick={() => setSelectedIds(new Set(impacts.map(i => i.id)))}>Select All</button>
                    <button className="btn btn-sm" onClick={() => setSelectedIds(new Set())}>Deselect All</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {impacts.map(imp => {
                  const fKey = imp.fighter === 2 ? 'fighter2' : 'fighter1';
                  const settings = fighterSettings[fKey];
                  const metrics = calculateForceMetrics(imp, settings);
                  return (
                    <ImpactCard key={imp.id} impact={imp} metrics={metrics} selected={selectedIds.has(imp.id)} onToggle={() => toggleImpactSelection(imp.id)} showCheckbox={!analyzing} />
                  );
                })}
              </div>
            </div>
          )}

          {!analyzing && analysisResult && (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
              <button className="btn" onClick={() => { setPhase(1); setAnalysisResult(null); setImpacts([]); }}>← Back</button>
              <button className="btn-primary" onClick={proceedToResults} style={{ padding: '12px 40px' }}>
                View Results →
              </button>
            </div>
          )}
        </div>
      )}

      {phase === 3 && (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
          {riskData && (
            <div className="glass-card" style={{ marginBottom: '24px', borderColor: (riskColorMap[riskData.overall_risk] || '#10b981') + '40' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px' }}>Risk Assessment</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{riskData.impact_count} impacts analyzed</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: riskColorMap[riskData.overall_risk] || '#10b981' }}>
                    {riskData.risk_percentage}%
                  </div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: riskColorMap[riskData.overall_risk] || '#10b981', fontWeight: '700' }}>
                    {riskData.overall_risk} risk
                  </div>
                </div>
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', marginBottom: '12px' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>{riskData.recommendation}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '0.8rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{Math.round(riskData.total_force_estimate)}N</div>
                  <div style={{ color: 'var(--text-muted)' }}>Total Force</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{Math.round(riskData.max_single_impact_force)}N</div>
                  <div style={{ color: 'var(--text-muted)' }}>Max Impact</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{riskData.impact_count}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Impacts</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px' }}>Impact Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {selectedImpacts.map(imp => {
                const fKey = imp.fighter === 2 ? 'fighter2' : 'fighter1';
                const settings = fighterSettings[fKey];
                const metrics = calculateForceMetrics(imp, settings);
                return <ImpactCard key={imp.id} impact={imp} metrics={metrics} selected={false} showCheckbox={false} />;
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {!showScat5 && (
              <button className="btn" onClick={() => setShowScat5(true)} style={{ borderColor: 'rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                🧠 Take Concussion Screening
              </button>
            )}
            <button className="btn-primary" onClick={() => setShowShareCard(true)}>
              📤 Share Your Results
            </button>
            {hasActiveSubscription && (
              <button className="btn" onClick={getAiSummary} disabled={aiLoading} style={{ borderColor: 'rgba(59,130,246,0.3)', color: '#3b82f6' }}>
                {aiLoading ? '⏳ Generating...' : '✨ Get AI Summary'}
              </button>
            )}
            <button className="btn" onClick={() => { setPhase(1); setAnalysisResult(null); setImpacts([]); setRiskData(null); setScat5Result(null); setAiSummary(''); setShowScat5(false); }}>
              🔄 New Analysis
            </button>
          </div>

          {showScat5 && (
            <div style={{ marginBottom: '24px' }}>
              <SCAT5Screener
                strikeData={riskData}
                onComplete={(result) => setScat5Result(result)}
                onSkip={() => setShowScat5(false)}
              />
            </div>
          )}

          {aiSummary && (
            <div className="glass-card" style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3b82f6' }}>✨</span> AI Summary
              </h3>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{aiSummary}</div>
            </div>
          )}

          {riskData && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{riskData.disclaimer}</p>
          )}
        </div>
      )}

      {showSubModal && <SubscriptionModal onClose={() => setShowSubModal(false)} />}
      {showShareCard && (
        <ShareCard impacts={selectedImpacts} riskData={riskData} fighterSettings={fighterSettings} onClose={() => setShowShareCard(false)} />
      )}
    </div>
  );
}
