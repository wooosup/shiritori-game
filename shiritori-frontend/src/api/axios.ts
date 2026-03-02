import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { appEnv } from '../config/env';
import { isRetryableGetError, type RetryableRequestConfig } from './retryPolicy';

export const supabase = createClient(appEnv.supabaseUrl, appEnv.supabaseAnonKey);

const API_TIMEOUT_MS = 30000;
const GET_RETRY_LIMIT = 2;
const RETRY_BASE_DELAY_MS = 700;

let isHandlingAuthFailure = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const apiClient = axios.create({
  baseURL: appEnv.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_TIMEOUT_MS,
});

apiClient.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

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
        console.warn(`API retry ${config.__retryCount}/${GET_RETRY_LIMIT}:`, error.config?.url);
        await sleep(delayMs);
        return apiClient.request(config);
      }
    }

    const status = error.response?.status;
    const hasAuthHeader = Boolean(
      error.config?.headers?.Authorization || error.config?.headers?.authorization,
    );

    if (error.code === 'ECONNABORTED') {
      console.warn('API timeout:', error.config?.url);
      throw error;
    }

    if (status === 401 && hasAuthHeader && !isHandlingAuthFailure) {
      isHandlingAuthFailure = true;
      console.warn('세션 만료! 강제 로그아웃 진행합니다.');

      try {
        await supabase.auth.signOut();
      } catch {
        // noop
      }

      localStorage.clear();

      const homeHref = `${globalThis.location.origin}/#/`;
      if (globalThis.location.href !== homeHref) {
        globalThis.location.replace(homeHref);
      }

      isHandlingAuthFailure = false;
    }

    throw error;
  },
);
