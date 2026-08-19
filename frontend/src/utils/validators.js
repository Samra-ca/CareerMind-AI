export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

export const isValidUrl = (url) => {
  if (!url || !url.trim()) return true;
  return /^https?:\/\/\S+$/i.test(url.trim());
};

export const isValidPassword = (pw) => typeof pw === 'string' && pw.length >= 8;

export const required = (value) => {
  if (typeof value === 'string') return value.trim().length > 0;
  return value != null && value !== '';
};
