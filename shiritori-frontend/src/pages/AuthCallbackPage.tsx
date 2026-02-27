import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { consumeAuthRedirect } from '../config/authRedirect';

export default function AuthCallbackPage() {
    const navigate = useNavigate();

    useEffect(() => {
        const run = async () => {
            await consumeAuthRedirect(window.location.href);
            navigate('/', { replace: true });
        };

        run();
    }, [navigate]);

    return (
        <div className="flex h-screen items-center justify-center text-gray-600">
            로그인 처리 중입니다...
        </div>
    );
}
