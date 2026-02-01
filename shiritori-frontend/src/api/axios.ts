import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 설정 (기존 코드 유지)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

// Axios 인스턴스 생성
export const apiClient = axios.create({
    baseURL: 'http://localhost:8080/api',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 5000,
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
        if (error.code === 'ECONNABORTED' || error.response?.status === 401) {
            console.warn("세션 만료 또는 타임아웃! 강제 로그아웃 진행합니다.");
            await supabase.auth.signOut();
            localStorage.clear();
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);