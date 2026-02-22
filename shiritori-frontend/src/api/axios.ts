import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 설정 (기존 코드 유지)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const API_TIMEOUT_MS = 30000;
const GET_RETRY_LIMIT = 2;
const RETRY_BASE_DELAY_MS = 700;

let isHandlingAuthFailure = false;

type RetryableRequestConfig = {
    method?: string;
    url?: string;
    __retryCount?: number;
    headers?: Record<string, string>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableGetError = (error: any) => {
    const config = error.config as RetryableRequestConfig | undefined;
    if (!config || (config.method || '').toLowerCase() !== 'get') {
        return false;
    }

    const status = error.response?.status;
    if (status === 401 || status === 403) {
        return false;
    }

    if (error.code === 'ECONNABORTED') {
        return true;
    }

    if (!status) {
        return true;
    }

    return status >= 500 || status === 429;
};

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
        const config = error.config as RetryableRequestConfig | undefined;
        if (config && isRetryableGetError(error)) {
            const retryCount = config.__retryCount ?? 0;

            if (retryCount < GET_RETRY_LIMIT) {
                config.__retryCount = retryCount + 1;
                const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);
                console.warn(`API retry ${config.__retryCount}/${GET_RETRY_LIMIT}:`, config.url);
                await sleep(delayMs);
                return apiClient.request(config);
            }
        }

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
