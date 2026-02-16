import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const skillOptions = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'amateur', label: 'Amateur' },
  { value: 'professional', label: 'Professional' },
  { value: 'elite', label: 'Elite' },
];

export default function SparringPage() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    duration: '',
    rounds: '',
    intensity: 5,
    partner_weight: '',
    partner_skill: 'amateur',
    headshots_received: '',
    notes: '',
  });

  useEffect(() => {
    if (currentUser) fetchSessions();
  }, [currentUser]);

  async function fetchSessions() {
    setLoading(true);
    try {
      const res = await fetch('/api/sparring/sessions', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || data || []);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!currentUser) {
      showToast('Please sign in to log a session', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/sparring/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date: form.date,
          duration: parseInt(form.duration) || 0,
          rounds: parseInt(form.rounds) || 0,
          intensity: form.intensity,
          partner_weight: parseFloat(form.partner_weight) || 0,
          partner_skill: form.partner_skill,
          headshots_received: parseInt(form.headshots_received) || 0,
          notes: form.notes,
        }),
      });
      if (res.ok) {
        showToast('Session logged successfully', 'success');
        setForm({ date: new Date().toISOString().split('T')[0], duration: '', rounds: '', intensity: 5, partner_weight: '', partner_skill: 'amateur', headshots_received: '', notes: '' });
        fetchSessions();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.detail || 'Failed to log session', 'error');
      }
    } catch (err) {
      showToast('Failed to log session', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteSession(id) {
    try {
      const res = await fetch(`/api/sparring/sessions/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        showToast('Session deleted', 'success');
        setSessions(prev => prev.filter(s => s.id !== id));
      } else {
        showToast('Failed to delete session', 'error');
      }
    } catch (err) {
      showToast('Failed to delete session', 'error');
    }
  }

  if (!currentUser) {
    return (
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px' }}>Sparring Tracker</h1>
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>Sign in Required</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Please sign in to track your sparring sessions and monitor cumulative head impact exposure.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px' }}>Sparring Tracker</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Log your sessions and monitor cumulative head impact exposure over time.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        <div className="glass-card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Log Session
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="input-group">
              <label>Date</label>
              <input type="date" className="cyber-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="input-group">
                <label>Duration (min)</label>
                <input type="number" className="cyber-input" placeholder="e.g. 60" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} min="1" required />
              </div>
              <div className="input-group">
                <label>Rounds</label>
                <input type="number" className="cyber-input" placeholder="e.g. 6" value={form.rounds} onChange={e => setForm(f => ({ ...f, rounds: e.target.value }))} min="1" required />
              </div>
            </div>
            <div className="input-group">
              <label>Intensity: {form.intensity}/10</label>
              <input type="range" min="1" max="10" value={form.intensity} onChange={e => setForm(f => ({ ...f, intensity: parseInt(e.target.value) }))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span>Light</span><span>Moderate</span><span>War</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="input-group">
                <label>Partner Weight (kg)</label>
                <input type="number" className="cyber-input" placeholder="e.g. 80" value={form.partner_weight} onChange={e => setForm(f => ({ ...f, partner_weight: e.target.value }))} min="40" max="200" />
              </div>
              <div className="input-group">
                <label>Partner Skill</label>
                <select className="cyber-select" value={form.partner_skill} onChange={e => setForm(f => ({ ...f, partner_skill: e.target.value }))}>
                  {skillOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="input-group">
              <label>Headshots Received (estimate)</label>
              <input type="number" className="cyber-input" placeholder="e.g. 15" value={form.headshots_received} onChange={e => setForm(f => ({ ...f, headshots_received: e.target.value }))} min="0" />
            </div>
            <div className="input-group">
              <label>Notes</label>
              <textarea className="cyber-input" placeholder="How did you feel? Any symptoms?" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} style={{ resize: 'vertical' }} />
            </div>
            <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>
              {submitting ? 'Logging...' : 'Log Session'}
            </button>
          </form>
        </div>

        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Session History
          </h2>

          {loading ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-muted)' }}>Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-muted)' }}>No sessions logged yet. Start tracking your sparring!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sessions.map(session => (
                <div className="glass-card" key={session.id} style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '600' }}>{session.date}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {session.duration}min • {session.rounds} rounds
                      </div>
                    </div>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteSession(session.id)} title="Delete session">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: session.notes ? '12px' : 0 }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Intensity</div>
                      <div style={{ fontWeight: '600', color: session.intensity >= 8 ? 'var(--danger)' : session.intensity >= 5 ? 'var(--warning)' : 'var(--primary)' }}>{session.intensity}/10</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Partner</div>
                      <div style={{ fontSize: '0.85rem' }}>{session.partner_weight}kg • {session.partner_skill}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Headshots</div>
                      <div style={{ fontWeight: '600', color: session.headshots_received >= 20 ? 'var(--danger)' : 'var(--text-primary)' }}>{session.headshots_received}</div>
                    </div>
                  </div>
                  {session.notes && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', borderTop: '1px solid var(--border-glow)', paddingTop: '10px' }}>
                      {session.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
