import { useState } from 'react';
import { useToast } from '../context/ToastContext';

export default function SubscriptionModal({ onClose }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function startSubscription() {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ return_url: window.location.origin }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
      else showToast('Failed to start checkout', 'error');
    } catch {
      showToast('Failed to start checkout', 'error');
    } finally {
      setLoading(false);
    }
  }

  const features = [
    'AI-powered punch detection with MediaPipe',
    'Speed & force estimation per impact',
    'Concussion risk assessment (SCAT5)',
    'Shareable social media punch card',
    'AI-generated fight summary',
    'Unlimited video analyses',
  ];

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>

        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🥊</div>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>Unlock Full Video Analysis</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
          Get complete access to AI-powered strike analysis
        </p>

        <div style={{ textAlign: 'left', marginBottom: '24px' }}>
          {features.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--primary)', fontWeight: '700', flexShrink: 0 }}>✓</span>
              {f}
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '2.2rem', fontWeight: '700', color: 'var(--primary)' }}>$9.99</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/month</span>
        </div>

        <button className="btn-primary" onClick={startSubscription} disabled={loading} style={{ width: '100%', padding: '14px', fontSize: '1rem' }}>
          {loading ? 'Loading...' : 'Start Free Trial'}
        </button>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '12px' }}>
          Start with a 7-day free trial. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
