import { useState, useEffect } from 'react';
import { getErrorMessage } from '../utils/errors';

const GlobalToast = () => {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const onApiError = (e) => {
      setToast({ message: e.detail || 'Something went wrong.', key: Date.now() });
    };
    window.addEventListener('careermind:api-error', onApiError);
    return () => window.removeEventListener('careermind:api-error', onApiError);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return (
    <div key={toast.key} className="toast" role="alert">
      <span>{toast.message}</span>
      <button className="toast-close" onClick={() => setToast(null)} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
};

export default GlobalToast;
export { getErrorMessage };
