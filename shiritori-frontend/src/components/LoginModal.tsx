import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../api/axios';
import { useAuthStore } from '../stores/authStore';
import { getOAuthRedirectUrl } from '../config/authRedirect';

export default function LoginModal() {
    const { isLoginModalOpen, closeLoginModal } = useAuthStore();

    if (!isLoginModalOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="relative w-full max-w-md p-8 bg-white rounded-lg shadow-xl">
                {/* 닫기 버튼 */}
                <button
                    onClick={closeLoginModal}
                    className="absolute top-4 right-4 text-gray-500 hover:text-black"
                >
                    ✕
                </button>

                <h2 className="mb-4 text-2xl font-bold text-center text-indigo-600">
                    로그인하고 게임 시작! 🚀
                </h2>

                <Auth
                    supabaseClient={supabase}
                    appearance={{ theme: ThemeSupa }}
                    providers={['google']}
                    onlyThirdPartyProviders={true}
                    view="sign_in"
                    showLinks={false}
                    redirectTo={getOAuthRedirectUrl()}
                />
            </div>
        </div>
    );
}