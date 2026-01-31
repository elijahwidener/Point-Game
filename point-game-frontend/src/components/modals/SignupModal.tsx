import { useUIStore } from "../../stores/uiStore";
import React, { useState } from "react";
import { api } from "../../services/api";
import { useAuthStore } from "../../stores/authStore";
import { X } from "lucide-react";

type SignupStep = 'form' | 'confirm';

export function SignupModal() {
  const [step, setStep] = useState<SignupStep>('form');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const signup = useAuthStore((state) => state.signup);
  const confirmSignup = useAuthStore((state) => state.confirmSignup);
  const login = useAuthStore((state) => state.login);
  const setUser = useAuthStore((state) => state.setUser);
  const closeSignupModal = useUIStore((state) => state.closeSignupModal);
  const openLoginModal = useUIStore((state) => state.openLoginModal);
  const isOpen = useUIStore((state) => state.isSignupModalOpen);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    
    try {
      // 1. Create user in Cognito
      await signup(username, email, password);
      
      // 2. Move to confirmation step
      setStep('confirm');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. Confirm signup with code
      await confirmSignup(username, confirmationCode);
      
      // 2. Auto-login after confirmation
      await login(username, password);
      
      // 3. Sync user to DynamoDB
      const user = await api.getMe();
      setUser(user);
      
      // 4. Reset and close
      resetForm();
      closeSignupModal();
    } catch (err: any) {
      setError(err.message || 'Confirmation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep('form');
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setConfirmationCode('');
    setError('');
  };

  const switchToLogin = () => {
    resetForm();
    closeSignupModal();
    openLoginModal();
  };

  const handleClose = () => {
    resetForm();
    closeSignupModal();
  };

  if (!isOpen) return null;

  return (
    <div>
      <div className="fixed inset-0 bg-black/50 z-50"></div>
      
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="relative text-center bg-gray-900 rounded-xl p-8 max-w-md w-full mx-4">
          <button 
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <h2>{step === 'form' ? 'Sign Up' : 'Confirm Email'}</h2>
          
          {error && (
            <div className="mt-2 text-red-400 text-sm">{error}</div>
          )}

          {step === 'form' ? (
            <form onSubmit={handleSignup} className="space-y-4 mt-4">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                disabled={isLoading}
                className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white disabled:opacity-50"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                disabled={isLoading}
                className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white disabled:opacity-50"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                disabled={isLoading}
                className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white disabled:opacity-50"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                disabled={isLoading}
                className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold py-2 rounded disabled:opacity-50"
              >
                {isLoading ? 'Creating account...' : "Let's Go!"}
              </button>
              <div className="text-sm text-gray-400 italic text-center">
                Already have an account?{' '}
                <button
                  type="button" 
                  onClick={switchToLogin}
                  className="text-amber-400 hover:text-amber-300 font-semibold"
                >
                  Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleConfirm} className="space-y-4 mt-4">
              <p className="text-gray-400 text-sm">
                We sent a confirmation code to <strong className="text-white">{email}</strong>
              </p>
              <input
                type="text"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                placeholder="Confirmation Code"
                disabled={isLoading}
                className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white disabled:opacity-50 text-center tracking-widest"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold py-2 rounded disabled:opacity-50"
              >
                {isLoading ? 'Confirming...' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setStep('form')}
                className="text-sm text-gray-400 hover:text-white"
              >
                ← Back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}