import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 설정 (기존 코드 유지)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const API_TIMEOUT_MS = 30000;

let isHandlingAuthFailure = false;

// Axios 인스턴스 생성
export const apiClient = axios.create({
    baseURL: apiUrl,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: API_TIMEOUT_MS,
});

apiClient.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status;
        const hasAuthHeader = Boolean(
            error.config?.headers?.Authorization || error.config?.headers?.authorization
        );

        if (error.code === 'ECONNABORTED') {
            console.warn('API timeout:', error.config?.url);
            throw error;
        }

        if (status === 401 && hasAuthHeader && !isHandlingAuthFailure) {
            isHandlingAuthFailure = true;
            console.warn("세션 만료! 강제 로그아웃 진행합니다.");

            try {
                await supabase.auth.signOut();
            } catch {
                // noop
            }

            localStorage.clear();

            if (globalThis.location.pathname !== '/') {
                globalThis.location.replace('/');
            }

            isHandlingAuthFailure = false;
        }

        throw error;
    }
);
