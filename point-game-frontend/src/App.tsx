import { BrowserRouter, Routes, Route} from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { LobbyPage } from './pages/LobbyPage';
import { TablePage } from './pages/TablePage';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { useAuthStore } from './stores/authStore';
import { LoginModal } from './components/modals/LoginModal';
import { SignupModal } from './components/modals/SignupModal';
import { useUIStore } from "./stores/uiStore";




function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openLoginModal = useUIStore((state) => state.openLoginModal);

    if (!isAuthenticated) {
      openLoginModal();
    }
  
  if (!isAuthenticated) {
    return null;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <LoginModal/>
      <SignupModal/>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="hand-history" element={<ComingSoonPage />} />
          
          <Route
            path="lobby"
            element={
              <ProtectedRoute>
                <LobbyPage />
              </ProtectedRoute>
            }
          />
        </Route>
        {/* Table page without header */}
        <Route
            path="table/:tableID"
            element={
              <ProtectedRoute>
                <TablePage />
              </ProtectedRoute>
            }
          />
      </Routes>
    </BrowserRouter>
  );
}

export default App;