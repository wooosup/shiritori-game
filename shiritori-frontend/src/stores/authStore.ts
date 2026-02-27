import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

export type AuthMessageType = 'success' | 'warning' | 'error';

interface AuthMessage {
    type: AuthMessageType;
    text: string;
}

interface AuthState {
    session: Session | null;
    isLoginModalOpen: boolean;
    authMessage: AuthMessage | null;
    setSession: (session: Session | null) => void;
    openLoginModal: () => void;
    closeLoginModal: () => void;
    setAuthMessage: (message: AuthMessage | null) => void;
    clearAuthMessage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    isLoginModalOpen: false,
    authMessage: null,
    setSession: (session) => set({ session }),
    openLoginModal: () => set({ isLoginModalOpen: true }),
    closeLoginModal: () => set({ isLoginModalOpen: false }),
    setAuthMessage: (message) => set({ authMessage: message }),
    clearAuthMessage: () => set({ authMessage: null }),
}));
