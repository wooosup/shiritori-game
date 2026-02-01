import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
    session: Session | null;
    isLoginModalOpen: boolean;
    setSession: (session: Session | null) => void;
    openLoginModal: () => void;
    closeLoginModal: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    isLoginModalOpen: false,
    setSession: (session) => set({ session }),
    openLoginModal: () => set({ isLoginModalOpen: true }),
    closeLoginModal: () => set({ isLoginModalOpen: false }),
}));