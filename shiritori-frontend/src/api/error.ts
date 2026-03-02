import type { AxiosError } from 'axios';

interface ApiErrorPayload {
  message?: string;
}

function toAxiosError(error: unknown): AxiosError<ApiErrorPayload> | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const candidate = error as Partial<AxiosError<ApiErrorPayload>>;
  if (candidate.isAxiosError) {
    return candidate as AxiosError<ApiErrorPayload>;
  }

  return null;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const axiosError = toAxiosError(error);
  if (axiosError?.response?.data?.message) {
    return axiosError.response.data.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  return fallback;
}

export function getApiErrorStatus(error: unknown): number | undefined {
  const axiosError = toAxiosError(error);
  return axiosError?.response?.status;
}
