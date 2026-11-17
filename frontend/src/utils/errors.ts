import axios from 'axios';

interface FastApiValidationItem {
  loc?: (string | number)[];
  msg?: string;
}

/** Extracts a human-readable message from Axios / FastAPI / generic errors. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      if (error.code === 'ECONNABORTED') return 'The server took too long to respond.';
      return 'Unable to reach the server. Check your connection.';
    }
    const data = error.response.data as { detail?: unknown; message?: unknown } | undefined;
    const detail = data?.detail ?? data?.message;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail) && detail.length) {
      return (detail as FastApiValidationItem[])
        .map((d) => {
          const field = d.loc?.filter((l) => l !== 'body').join('.');
          return field ? `${field}: ${d.msg}` : d.msg;
        })
        .filter(Boolean)
        .join('\n');
    }
    switch (error.response.status) {
      case 400:
        return 'The request was invalid.';
      case 401:
        return 'Your session has expired. Please sign in again.';
      case 403:
        return 'You do not have permission to do that.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This action conflicts with the current state. Refresh and try again.';
      case 422:
        return 'Some fields are invalid.';
      default:
        if (error.response.status >= 500) return 'The server encountered an error. Please try again later.';
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function isStatus(error: unknown, status: number): boolean {
  return axios.isAxiosError(error) && error.response?.status === status;
}
