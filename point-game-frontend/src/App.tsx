import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { RulesPage } from './pages/RulesPage';
import { AboutPage } from './pages/AboutPage';
import { DonatePage } from './pages/DonatePage';
import { LobbyPage } from './pages/LobbyPage';
import { TablePage } from './pages/TablePage';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { useAuthStore } from './stores/authStore';
import { ROUTES } from './utils/constants';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.HOME} replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="rules" element={<RulesPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="donate" element={<DonatePage />} />
          <Route path="hand-history" element={<ComingSoonPage />} />
          
          <Route
            path="lobby"
            element={
              <ProtectedRoute>
                <LobbyPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="table/:tableID"
            element={
              <ProtectedRoute>
                <TablePage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;