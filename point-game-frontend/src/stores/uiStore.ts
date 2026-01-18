import {create} from 'zustand';

interface UIState {
  isLoginModalOpen: boolean;
  isSignupModalOpen: boolean;
  isSitDownModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  openSignupModal: () => void;
  closeSignupModal: () => void;
  openSitDownModal: () => void;
  closeSitDownModal: () => void;
}

export const useUIStore =
    create<UIState>((set) => ({
                      isLoginModalOpen: false,
                      isSignupModalOpen: false,
                      isSitDownModalOpen: false,
                      openLoginModal: () => set({isLoginModalOpen: true}),
                      closeLoginModal: () => set({isLoginModalOpen: false}),
                      openSignupModal: () => set({isSignupModalOpen: true}),
                      closeSignupModal: () => set({isSignupModalOpen: false}),
                      openSitDownModal: () => set({isSitDownModalOpen: true}),
                      closeSitDownModal: () => set({isSitDownModalOpen: false}),
                    }));