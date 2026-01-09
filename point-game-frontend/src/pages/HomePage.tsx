import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { ROUTES } from '../utils/constants';

export function HomePage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { openLoginModal } = useUIStore();

  const handlePlayNow = () => {
    if (isAuthenticated) {
      navigate(ROUTES.LOBBY);
    } else {
      openLoginModal();
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="container mx-auto px-4 py-32">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-7xl font-bold mb-8 text-white tracking-tight">
            Play Point Game Online
          </h1>
          
          <p className="text-2xl text-gray-400 mb-16 font-light max-w-2xl mx-auto leading-relaxed">
            A unique poker variant where hand strength is measured by point totals
          </p>

          <button
            onClick={handlePlayNow}
            className="px-12 py-4 bg-amber-500 hover:bg-amber-600 text-gray-900 text-lg font-semibold rounded-lg transition-colors shadow-lg shadow-amber-500/25"
          >
            Play Now
          </button>

          {/* Screenshot placeholder */}
          <div className="mt-32 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-10 shadow-2xl">
            <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center border border-gray-800">
              <span className="text-gray-600 text-2xl font-light">Table Preview</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}