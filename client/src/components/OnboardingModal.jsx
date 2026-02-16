import { useState, useEffect } from 'react';

const TOTAL_STEPS = 5;

export default function OnboardingModal({ onStartSubscription, onPurchaseCourse, onClose }) {
  const [step, setStep] = useState(1);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('hitsmart_welcome_seen');
    if (!seen) {
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const close = () => {
    setVisible(false);
    localStorage.setItem('hitsmart_welcome_seen', 'true');
    if (onClose) onClose();
  };

  const next = () => { if (step < TOTAL_STEPS) setStep(step + 1); };
  const back = () => { if (step > 1) setStep(step - 1); };

  if (!visible) return null;

  return (
    <div className="onboarding-modal" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="onboarding-content">
        {/* Step 1: Welcome */}
        <div className={`onboarding-step${step === 1 ? ' active' : ''}`}>
          <div className="onboarding-hero-icon">🥊</div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: 12 }}>Welcome to Hitsmart</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            The world's first AI-powered combat sport analysis platform. Track impacts, assess risk, and protect your brain health.
          </p>
        </div>

        {/* Step 2: Free Tools */}
        <div className={`onboarding-step${step === 2 ? ' active' : ''}`}>
          <h3 style={{ marginBottom: 8 }}>Free Tools</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Start with our free features — no account needed.</p>
          <div className="onboarding-cards">
            <div className="onboarding-card">
              <span style={{ fontSize: '2rem' }}>📊</span>
              <h4>Sparring Tracker</h4>
              <p>Log and monitor your sparring sessions over time.</p>
              <span className="onboarding-badge free">Free</span>
            </div>
            <div className="onboarding-card">
              <span style={{ fontSize: '2rem' }}>📰</span>
              <h4>Free Articles</h4>
              <p>Expert articles on brain health and combat sports safety.</p>
              <span className="onboarding-badge free">Free</span>
            </div>
          </div>
        </div>

        {/* Step 3: Concussion Guide */}
        <div className={`onboarding-step${step === 3 ? ' active' : ''}`}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>📖</span>
          <h3 style={{ marginBottom: 8 }}>Concussion Recovery Guide</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            A comprehensive guide to understanding and recovering from concussions, written specifically for combat sport athletes.
          </p>
          <span className="onboarding-badge purchase">One-Time Purchase</span>
        </div>

        {/* Step 4: Strike Calculator */}
        <div className={`onboarding-step${step === 4 ? ' active' : ''}`}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>🧠</span>
          <h3 style={{ marginBottom: 8 }}>AI Strike Calculator</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Upload sparring videos and get AI-powered impact analysis, force estimation, and brain injury risk assessment.
          </p>
          <span className="onboarding-badge subscription">Subscription</span>
        </div>

        {/* Step 5: Pricing */}
        <div className={`onboarding-step${step === 5 ? ' active' : ''}`}>
          <h3 style={{ marginBottom: 8 }}>Choose Your Plan</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Start protecting your brain health today.</p>
          <div className="pricing-cards">
            <div className="pricing-card">
              <h4>Hitsmart Pro</h4>
              <div className="price">$9.99</div>
              <div className="price-period">/month</div>
              <ul>
                <li>AI Video Analysis</li>
                <li>Force Estimation</li>
                <li>Risk Assessment</li>
                <li>AI Chat Support</li>
                <li>Session History</li>
              </ul>
              <button className="btn-primary" style={{ width: '100%' }} onClick={() => onStartSubscription && onStartSubscription()}>
                Start 7-Day Free Trial
              </button>
            </div>
            <div className="pricing-card">
              <h4>Concussion Guide</h4>
              <div className="price">$29.99</div>
              <div className="price-period">one-time</div>
              <ul>
                <li>Full Recovery Guide</li>
                <li>Expert Protocols</li>
                <li>Nutrition Plans</li>
                <li>Sleep Optimization</li>
                <li>Lifetime Access</li>
              </ul>
              <button className="btn-primary" style={{ width: '100%' }} onClick={() => onPurchaseCourse && onPurchaseCourse()}>
                Purchase Guide
              </button>
            </div>
          </div>
          <button className="skip-link" onClick={close}>Skip for now</button>
        </div>

        {/* Navigation */}
        <div className="onboarding-dots">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`onboarding-dot${step === i + 1 ? ' active' : ''}`}
              onClick={() => setStep(i + 1)}
            />
          ))}
        </div>

        <div className="onboarding-nav">
          <button
            className="btn btn-sm"
            onClick={back}
            style={{ visibility: step === 1 ? 'hidden' : 'visible' }}
          >
            Back
          </button>
          {step < TOTAL_STEPS && (
            <button className="btn-primary btn-sm" onClick={next}>
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function restartOnboarding() {
  localStorage.removeItem('hitsmart_welcome_seen');
  window.dispatchEvent(new Event('restart-onboarding'));
}
