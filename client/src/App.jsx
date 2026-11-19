import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Shell from './components/Shell.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Portfolio from './pages/Portfolio.jsx';
import Markets from './pages/Markets.jsx';
import LandingPage from './pages/LandingPage.jsx';

export default function App() {
  const { user, booting } = useAuth();
  if (booting) return <div className="boot" aria-busy="true">Loading…</div>;

  return (
    <Routes>
      <Route path="/landing" element={<LandingPage />} />
      {user ? (
        <Route element={<Shell />}>
          <Route index element={<Portfolio />} />
          <Route path="markets" element={<Markets />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      ) : (
        <>
          <Route index element={<LandingPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}
