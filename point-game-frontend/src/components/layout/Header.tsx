import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { ROUTES } from '../../utils/constants';

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { openLoginModal, openSignupModal } = useUIStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: ROUTES.HOME, label: 'Home' },
    { to: ROUTES.LOBBY, label: 'Lobby' },
    { to: ROUTES.ABOUT, label: 'About' },
    { to: ROUTES.HAND_HISTORY, label: 'Hand History' },
  ];

  return (
    <header className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800/50">
      <div className="max-w-7xl mx-auto px-8 lg:px-10">
        <div className="flex items-center justify-between h-24">

          {/* LEFT: Logo */}
          <Link to={ROUTES.HOME} className="flex items-center flex-shrink-0">
            <img
              src="/transparent_point_game.png"
              alt="Point Game"
              className="h-28 w-auto hover:opacity-90 transition-opacity"
            />
          </Link>

          {/* CENTER: Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="px-5 py-2.5 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* RIGHT: Auth */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {isAuthenticated && user ? (
              <>
                <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <span className="text-amber-400 font-semibold text-base">
                    ${user.balance.toLocaleString()}
                  </span>
                  <div className="w-px h-5 bg-gray-700"></div>
                  <span className="text-gray-300 text-base font-medium">
                    {user.username}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="hidden sm:block px-5 py-2.5 text-base font-medium text-gray-300 hover:text-white hover:bg-red-600/10 border border-red-600/20 hover:border-red-600/50 rounded-lg transition-all"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={openLoginModal}
                  className="hidden sm:block px-6 py-2.5 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800/80 rounded-lg transition-all"
                >
                  Login
                </button>
                <button
                  onClick={openSignupModal}
                  className="px-6 py-2.5 text-base font-medium bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-900 rounded-lg shadow-lg shadow-amber-500/20 transition-all"
                >
                  Sign Up
                </button>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-800/50">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2.5 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all"
                >
                  {item.label}
                </Link>
              ))}
              {isAuthenticated && user ? (
                <>
                  <div className="sm:hidden flex items-center justify-between px-4 py-2.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <span className="text-amber-400 font-semibold text-base">
                      ${user.balance.toLocaleString()}
                    </span>
                    <span className="text-gray-300 text-base font-medium">
                      {user.username}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="sm:hidden px-4 py-2.5 text-base font-medium text-gray-300 hover:text-white hover:bg-red-600/10 border border-red-600/20 hover:border-red-600/50 rounded-lg transition-all text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    openLoginModal();
                    setMobileMenuOpen(false);
                  }}
                  className="sm:hidden px-4 py-2.5 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800/80 rounded-lg transition-all text-left"
                >
                  Login
                </button>
              )}
            </nav>
          </div>
        )}

      </div>
    </header>
  );
}