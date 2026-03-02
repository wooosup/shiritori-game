import type { AxiosRequestConfig } from 'axios';

export type RetryableRequestConfig = AxiosRequestConfig & {
  __retryCount?: number;
};

interface RetryableError {
  config?: RetryableRequestConfig;
  response?: {
    status?: number;
  };
  code?: string;
}

function toRetryableError(error: unknown): RetryableError {
  if (!error || typeof error !== 'object') {
    return {};
  }
  return error as RetryableError;
}

export function isRetryableGetError(error: unknown): boolean {
  const retryableError = toRetryableError(error);
  const config = retryableError.config;
  if (!config || (config.method || '').toLowerCase() !== 'get') {
    return false;
  }

  const status = retryableError.response?.status;
  if (status === 401 || status === 403) {
    return false;
  }

  if (retryableError.code === 'ECONNABORTED') {
    return true;
  }

  if (!status) {
    return true;
  }

  return status >= 500 || status === 429;
}
