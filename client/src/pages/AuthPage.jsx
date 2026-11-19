import { useState } from 'react';
import { useAuth } from '../auth.jsx';
import Logo from '../components/Logo.jsx';

export default function AuthPage() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(mode, mode === 'register' ? form : { email: form.email, password: form.password });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-brand"><Logo height={34} /></div>
      <form className="auth-card" onSubmit={submit}>
        <h1>{mode === 'login' ? 'Sign in' : 'Create your account'}</h1>
        <p className="muted">Stocks, international stocks, crypto and forex in one portfolio.</p>
        {mode === 'register' && (
          <label className="field"><span>Name</span><input value={form.name} onChange={set('name')} autoComplete="name" /></label>
        )}
        <label className="field"><span>Email</span><input type="email" required value={form.email} onChange={set('email')} autoComplete="email" autoFocus /></label>
        <label className="field">
          <span>Password</span>
          <input type="password" required minLength={8} value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>
        {mode === 'register' && <p className="hint">Use at least 8 characters.</p>}
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <p className="switch">
          {mode === 'login' ? 'New to TradeX?' : 'Already have an account?'}{' '}
          <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </form>
    </div>
  );
}
