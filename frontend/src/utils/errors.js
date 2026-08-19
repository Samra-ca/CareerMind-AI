export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;

  if (err.response?.data) {
    const detail = err.response.data.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((d) => {
          const field = Array.isArray(d.loc) ? d.loc.slice(1).join('.') : null;
          const msg = d.msg || 'Invalid value.';
          return field ? `${field}: ${msg}` : msg;
        })
        .join('\n');
    }
    if (typeof detail === 'object' && detail) {
      return Object.entries(detail)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('\n');
    }
  }

  if (err.message === 'Network Error') return 'Network error — could not reach the server. Check your connection.';
  if (err.code === 'ECONNABORTED') return 'The request timed out. Please try again.';

  return fallback;
}

export function isValidationError(err) {
  return err?.response?.status === 422;
}
