import { useUIStore } from "../../stores/uiStore";
import React, { useState } from "react";
import { api } from "../../services/api";
import { useAuthStore } from "../../stores/authStore";
import { X } from "lucide-react";



export function SignupModal(){
    // state and logic
    const isOpen = useUIStore((state) => state.isSignupModalOpen);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirm] = useState('');
    const [error, setError] = useState('');
    const setUser = useAuthStore((state) => state.setUser);
    const closeSignupModal = useUIStore((state) => state.closeSignupModal);
    const openLoginModal = useUIStore((state) => state.openLoginModal);
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (password !== confirmPassword) {
                setError("Passwords do not match");
                return;
            }  
            await api.signup(username, password);
            const { userID } = await api.login(username, password);
            const user = await api.getMe(userID);
            setUser(user);
            closeSignupModal();
        } catch (err: any) {
            setError(err.message || 'Signup failed');
        }
    };

    const switchToLogin = () => {
        closeSignupModal();
        openLoginModal();
    }


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
                        onClick={closeSignupModal}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    <h2>Sign Up</h2>
                    
                    {error && (
                        <div className="mt-2 text-red-400 text-sm">{error}</div>
                    )}
            <form onSubmit={handleSignup    } className="space-y-4 mt-4">
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
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm Password"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white">
                </input>
                <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold py-2 rounded">
                        Lets Go!
                </button>
                <div className="text-sm text-gray-400 italic text-center">Already have an account?? {''}
                    <button
                        type="button" 
                        onClick={switchToLogin}
                        className="text-amber-400 hover:text-amber-300 font-semibold"
                        >
                        Login
                    </button>
                </div>
            </form>
            </div>
        </div>
        </div>
    );
}