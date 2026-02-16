import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { useToast } from '../context/ToastContext';
import { calculateForceMetrics } from '../utils/forceCalculator';

export default function ShareCard({ impacts, riskData, fighterSettings, onClose }) {
  const cardRef = useRef(null);
  const { showToast } = useToast();
  const [capturing, setCapturing] = useState(false);

  const fighter1 = fighterSettings?.fighter1 || { skill: 'Professional', weight: 75, throwingIntensity: 100 };

  const enriched = (impacts || []).map((imp) => {
    const fKey = imp.fighter === 2 ? 'fighter2' : 'fighter1';
    const settings = fighterSettings?.[fKey] || fighter1;
    const metrics = calculateForceMetrics(imp, settings);
    return { ...imp, metrics };
  });

  const hardest = enriched.reduce((best, e) => (!best || e.metrics.avgForce > best.metrics.avgForce ? e : best), null);
  const top3 = [...enriched].sort((a, b) => b.metrics.avgForce - a.metrics.avgForce).slice(0, 3);

  const avgSpeedMin = enriched.length ? Math.round(enriched.reduce((s, e) => s + e.metrics.speedMin, 0) / enriched.length) : 0;
  const avgSpeedMax = enriched.length ? Math.round(enriched.reduce((s, e) => s + e.metrics.speedMax, 0) / enriched.length) : 0;

  const riskColor = {
    critical: '#ef4444',
    high: '#f59e0b',
    moderate: '#f59e0b',
    'low-moderate': '#10b981',
    low: '#10b981',
  }[riskData?.overall_risk] || '#10b981';

  async function captureCard() {
    if (!cardRef.current) return null;
    setCapturing(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      return canvas;
    } finally {
      setCapturing(false);
    }
  }

  async function handleDownload() {
    const canvas = await captureCard();
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'hitsmart-results.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Image downloaded!', 'success');
  }

  async function handleShare() {
    const canvas = await captureCard();
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      if (navigator.share) {
        try {
          await navigator.share({
            files: [new File([blob], 'hitsmart-results.png', { type: 'image/png' })],
            title: 'Hitsmart Strike Analysis',
          });
        } catch {
          showToast('Share cancelled', 'info');
        }
      } else {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          showToast('Image copied to clipboard!', 'success');
        } catch {
          showToast('Could not copy image', 'error');
        }
      }
    }, 'image/png');
  }

  function handleCopyLink() {
    const text = `🥊 Hitsmart Strike Analysis\n${enriched.length} punches detected\nHardest punch: ${hardest ? hardest.metrics.avgForce + 'N' : 'N/A'}\nRisk: ${riskData?.overall_risk || 'N/A'}\nAnalyzed with Hitsmart`;
    navigator.clipboard.writeText(text).then(() => showToast('Summary copied!', 'success')).catch(() => showToast('Copy failed', 'error'));
  }

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="modal" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div ref={cardRef} style={{ background: '#0a0a0a', borderRadius: '20px', padding: '32px 28px', border: '1px solid rgba(16,185,129,0.25)', fontFamily: "'Montserrat', sans-serif", color: '#f0fdf4' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: '700', letterSpacing: '1px' }}>
                <span style={{ color: '#10b981' }}>HIT</span>SMART
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', letterSpacing: '2px', textTransform: 'uppercase' }}>Strike Analysis</div>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{today}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Punches</div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>{enriched.length}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Risk Level</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: riskColor, textTransform: 'uppercase' }}>{riskData?.overall_risk || 'N/A'}</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{riskData?.risk_percentage || 0}%</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Hardest Punch</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>{hardest ? hardest.metrics.avgForce : 0}N</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{hardest ? hardest.metrics.gForce : 0}g</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Avg Speed</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>{avgSpeedMin}-{avgSpeedMax}</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>mph</div>
            </div>
          </div>

          {top3.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Top Impacts</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {top3.map((imp, i) => (
                  <div key={i} style={{ flex: 1, borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {imp.frameImage && <img src={imp.frameImage} alt="" style={{ width: '100%', height: '70px', objectFit: 'cover' }} />}
                    <div style={{ padding: '6px', textAlign: 'center', background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{imp.hand}</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>{imp.metrics.avgForce}N</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Analyzed with <span style={{ color: '#10b981', fontWeight: '600' }}>Hitsmart</span></div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={handleDownload} disabled={capturing} style={{ fontSize: '0.85rem' }}>
            {capturing ? 'Capturing...' : '📥 Download'}
          </button>
          <button className="btn" onClick={handleShare} disabled={capturing} style={{ fontSize: '0.85rem' }}>
            📤 Share
          </button>
          <button className="btn" onClick={handleCopyLink} style={{ fontSize: '0.85rem' }}>
            📋 Copy Text
          </button>
          <button className="btn" onClick={onClose} style={{ fontSize: '0.85rem' }}>
            ✕ Close
          </button>
        </div>
      </div>
    </div>
  );
}
