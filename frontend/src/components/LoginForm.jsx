import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getErrorMessage } from '../utils/errors';
import { isValidEmail } from '../utils/validators';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = {};
    if (!form.email.trim()) {
      validationErrors.email = 'Email is required';
    } else if (!isValidEmail(form.email)) {
      validationErrors.email = 'Please enter a valid email address';
    }
    if (!form.password) {
      validationErrors.password = 'Password is required';
    }
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setServerError(getErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-stack-lg text-center lg:text-left">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Welcome back</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Sign in to your career command center.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-stack-md">
        {serverError && (
          <div className="bg-error/10 border border-error/30 text-error font-body-sm text-body-sm rounded-lg px-4 py-3">
            {serverError}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="email">
            Email Address
          </label>
          <div className="relative">
            <Icon name="mail" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm" />
            <input
              className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-border-subtle rounded-lg text-on-surface font-body-sm text-body-sm focus:outline-none focus:border-primary input-glow transition-all"
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="name@company.com"
            />
          </div>
          {errors.email && (
            <span className="font-label-md text-label-md text-error mt-1">{errors.email}</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="password">
              Password
            </label>
            <Link
              to="/register"
              className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <Icon name="lock" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm" />
            <input
              className="w-full pl-10 pr-10 py-3 bg-surface-container-low border border-border-subtle rounded-lg text-on-surface font-body-sm text-body-sm focus:outline-none focus:border-primary input-glow transition-all"
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
            >
              <Icon name={showPassword ? 'visibility' : 'visibility_off'} className="text-sm" />
            </button>
          </div>
          {errors.password && (
            <span className="font-label-md text-label-md text-error mt-1">{errors.password}</span>
          )}
        </div>

        <div className="flex items-center mt-2">
          <input
            className="h-4 w-4 rounded border-border-subtle bg-surface-container text-primary focus:ring-primary focus:ring-offset-surface"
            id="remember-me"
            name="remember-me"
            type="checkbox"
          />
          <label className="ml-2 block font-body-sm text-body-sm text-on-surface-variant" htmlFor="remember-me">
            Remember me for 30 days
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 bg-primary text-on-primary font-label-md text-label-md py-3 rounded-lg hover:bg-primary-container transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface flex justify-center items-center gap-2 disabled:opacity-60"
        >
          {loading ? 'Signing in...' : <>Sign In <Icon name="login" className="text-sm" /></>}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-medium hover:text-primary-container transition-colors">
            Request Access
          </Link>
        </p>
      </div>
    </>
  );
};

export default LoginForm;