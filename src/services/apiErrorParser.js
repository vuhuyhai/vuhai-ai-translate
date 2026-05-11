import { API_ERROR_CODES, API_ERROR_MESSAGES } from '../constants/apiErrors';

export class ApiError extends Error {
  constructor(code, rawError = null) {
    const info = API_ERROR_MESSAGES[code] || API_ERROR_MESSAGES[API_ERROR_CODES.UNKNOWN];
    super(info.title);
    this.name = 'ApiError';
    this.code = code;
    this.info = info;
    // Sanitize raw error — never include API keys
    this.rawError = sanitizeRawError(rawError);
    this.timestamp = Date.now();
  }
}

function sanitizeRawError(raw) {
  if (!raw) return null;
  try {
    const str = JSON.stringify(raw);
    // Remove any API key patterns
    const cleaned = str.replace(/AIza[A-Za-z0-9_-]{30,}/g, 'AIza***REDACTED***')
      .replace(/sk-ant-[A-Za-z0-9_-]+/g, 'sk-ant-***REDACTED***');
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export function parseGeminiError(status, errorBody, fetchError = null) {
  if (fetchError) {
    if (!navigator.onLine) return new ApiError(API_ERROR_CODES.NETWORK_OFFLINE, fetchError);
    if (fetchError.name === 'AbortError') return new ApiError(API_ERROR_CODES.NETWORK_TIMEOUT, fetchError);
    return new ApiError(API_ERROR_CODES.NETWORK_OFFLINE, { message: fetchError.message });
  }

  const message = (errorBody?.error?.message || '').toLowerCase();
  if (status === 400) {
    if (message.includes('api key not valid') || message.includes('api_key_invalid')) {
      return new ApiError(API_ERROR_CODES.INVALID_KEY, errorBody);
    }
    if (message.includes('token') || message.includes('context') || message.includes('too long') || message.includes('exceeds')) {
      return new ApiError(API_ERROR_CODES.CONTEXT_TOO_LONG, errorBody);
    }
    if (message.includes('safety')) {
      return new ApiError(API_ERROR_CODES.CONTENT_BLOCKED, errorBody);
    }
    return new ApiError(API_ERROR_CODES.UNKNOWN, errorBody);
  }

  if (status === 403) {
    if (message.includes('not enabled') || message.includes('has not been used')) {
      return new ApiError(API_ERROR_CODES.API_NOT_ENABLED, errorBody);
    }
    return new ApiError(API_ERROR_CODES.KEY_REVOKED, errorBody);
  }

  if (status === 429) {
    if (message.includes('quota') || message.includes('resource_exhausted')) {
      return new ApiError(API_ERROR_CODES.RATE_LIMIT_RPD, errorBody);
    }
    if (message.includes('token')) {
      return new ApiError(API_ERROR_CODES.RATE_LIMIT_TPM, errorBody);
    }
    return new ApiError(API_ERROR_CODES.RATE_LIMIT_RPM, errorBody);
  }

  if (status === 500) return new ApiError(API_ERROR_CODES.SERVER_ERROR, errorBody);
  if (status === 503) return new ApiError(API_ERROR_CODES.SERVICE_UNAVAILABLE, errorBody);

  // Check finishReason from successful response
  const candidate = errorBody?.candidates?.[0];
  if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'RECITATION') {
    return new ApiError(API_ERROR_CODES.CONTENT_BLOCKED, errorBody);
  }
  if (!candidate?.content?.parts?.[0]?.text) {
    return new ApiError(API_ERROR_CODES.EMPTY_RESPONSE, errorBody);
  }

  return new ApiError(API_ERROR_CODES.UNKNOWN, errorBody);
}

export function parseClaudeError(status, errorBody, fetchError = null) {
  if (fetchError) {
    if (!navigator.onLine) return new ApiError(API_ERROR_CODES.NETWORK_OFFLINE, fetchError);
    if (fetchError.name === 'AbortError') return new ApiError(API_ERROR_CODES.NETWORK_TIMEOUT, fetchError);
    return new ApiError(API_ERROR_CODES.NETWORK_OFFLINE, { message: fetchError.message });
  }

  if (status === 401) return new ApiError(API_ERROR_CODES.INVALID_KEY, errorBody);
  if (status === 403) return new ApiError(API_ERROR_CODES.KEY_REVOKED, errorBody);
  if (status === 429) return new ApiError(API_ERROR_CODES.RATE_LIMIT_RPM, errorBody);
  if (status === 500) return new ApiError(API_ERROR_CODES.SERVER_ERROR, errorBody);
  if (status === 503) return new ApiError(API_ERROR_CODES.SERVICE_UNAVAILABLE, errorBody);
  if (status === 529) return new ApiError(API_ERROR_CODES.SERVER_OVERLOADED, errorBody);

  return new ApiError(API_ERROR_CODES.UNKNOWN, errorBody);
}
