import type { AxiosRequestConfig } from 'axios';

export type RetryableRequestConfig = AxiosRequestConfig & {
  __retryCount?: number;
};

export function isRetryableGetError(error: any): boolean {
  const config = error?.config as RetryableRequestConfig | undefined;
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
}
