import { useUIStore } from "../../stores/uiStore";
import React, { useState } from "react";
import { api } from "../../services/api";
import { useAuthStore } from "../../stores/authStore";
import { X } from "lucide-react";



export function LoginModal(){
    // state and logic
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const setUser = useAuthStore((state) => state.setUser);
    const closeLoginModal = useUIStore((state) => state.closeLoginModal);
    const openSignupModal = useUIStore((state) => state.openSignupModal);
    
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { userID } = await api.login(username, password);
            const user = await api.getMe(userID);
            setUser(user);
            closeLoginModal();
        } catch (err: any) {
            setError(err.message || 'Login failed');
        }
    };

    const switchToSignup = () => {
        closeLoginModal();
        openSignupModal();
    }

    const isOpen = useUIStore((state) => state.isLoginModalOpen);
    if (!isOpen) return null;

    return (
        <div>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-50"></div>
            
            {/* Modal container */}
            <div className="fixed inset-0 flex items-center justify-center z-50">
                {/* Modal content - ONE div with relative */}
                <div className="relative text-center bg-gray-900 rounded-xl p-8 max-w-md w-full mx-4">
                    {/* X button with absolute positioning */}
                    <button 
                        type="button"
                        onClick={closeLoginModal}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    <h2>Login</h2>
                    
                    {error && (
                        <div className="mt-2 text-red-400 text-sm">{error}</div>
                    )}
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white">
                </input>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white">
                </input>
                <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold py-2 rounded">
                        Lets Go
                </button>
                <div className="text-sm text-gray-400 italic text-center">Don't have an account? {''}
                    <button
                        type="button" 
                        onClick={switchToSignup}
                        className="text-amber-400 hover:text-amber-300 font-semibold"
                        >
                        Sign Up
                    </button>
                </div>
            </form>
            </div>
        </div>
        </div>
    );
}