import { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerUser } from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { isValidEmail } from '../utils/validators';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const strengthOf = (pw) => {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score);
};

const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthBarColor = ['', 'bg-warning', 'bg-warning', 'bg-secondary', 'bg-success'];
const strengthTextColor = ['', 'text-warning', 'text-warning', 'text-secondary', 'text-success'];

const validate = (form) => {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  if (!form.email.trim()) errors.email = 'Email is required';
  else if (!isValidEmail(form.email)) errors.email = 'Please enter a valid email address';
  if (!form.password) errors.password = 'Password is required';
  else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters';
  return errors;
};

const RegisterForm = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const score = strengthOf(form.password);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    setServerError('');

    const validationErrors = validate(form);
    if (!agreed) validationErrors.terms = 'You must agree to the Terms and Privacy Policy';
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      const { data } = await registerUser({
        name: form.name,
        email: form.email,
        password: form.password,
      });
      setSuccess(data.message || 'Registration successful!');
      setForm({ name: '', email: '', password: '' });
    } catch (err) {
      setServerError(getErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full pl-10 pr-4 py-3 bg-surface-container border border-border-subtle rounded text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-colors outline-none';

  return (
    <div className="flex flex-col">
      <div className="mb-stack-lg">
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-stack-sm">Initialize Profile</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Secure your account to begin the data-driven career mapping process.
        </p>
      </div>

      {success && (
        <div className="mb-stack-md bg-success/10 border border-success/30 text-success font-body-sm text-body-sm rounded px-4 py-3">
          {success}
        </div>
      )}
      {serverError && (
        <div className="mb-stack-md bg-error/10 border border-error/30 text-error font-body-sm text-body-sm rounded px-4 py-3">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-stack-md">
        <div className="space-y-stack-sm">
          <label className="block font-label-md text-label-md text-on-surface-variant uppercase tracking-wider" htmlFor="fullName">
            Legal Name
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-on-surface-variant pointer-events-none">
              <Icon name="person" className="text-[20px]" />
            </span>
            <input
              className={`${inputCls} pl-10 pr-4 py-3`}
              id="fullName"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Jane Doe"
              type="text"
            />
          </div>
          {errors.name && <span className="font-label-md text-label-md text-error block">{errors.name}</span>}
        </div>

        <div className="space-y-stack-sm">
          <label className="block font-label-md text-label-md text-on-surface-variant uppercase tracking-wider" htmlFor="email">
            Professional Email
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-on-surface-variant pointer-events-none">
              <Icon name="mail" className="text-[20px]" />
            </span>
            <input
              className={`${inputCls} pl-10 pr-4 py-3`}
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="jane.doe@company.com"
              type="email"
            />
          </div>
          {errors.email && <span className="font-label-md text-label-md text-error block">{errors.email}</span>}
        </div>

        <div className="space-y-stack-sm">
          <label className="block font-label-md text-label-md text-on-surface-variant uppercase tracking-wider" htmlFor="password">
            Security Key
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-on-surface-variant pointer-events-none">
              <Icon name="lock" className="text-[20px]" />
            </span>
            <input
              className={`${inputCls} pl-10 pr-10 py-3`}
              id="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              type={showPassword ? 'text' : 'password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-on-surface-variant hover:text-primary transition-colors"
            >
              <Icon name={showPassword ? 'visibility' : 'visibility_off'} className="text-[20px]" />
            </button>
          </div>
          {form.password && (
            <div className="pt-2">
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${i <= score ? strengthBarColor[score] : 'bg-surface-variant'}`}
                  />
                ))}
              </div>
              <p className={`font-label-md text-label-md mt-1 text-right ${strengthTextColor[score] || 'text-warning'}`}>
                {strengthLabel[score] || 'Enter a password'}
              </p>
            </div>
          )}
          {errors.password && <span className="font-label-md text-label-md text-error block">{errors.password}</span>}
        </div>

        <div className="flex items-start pt-2">
          <div className="flex items-center h-5">
            <input
              className="w-4 h-4 rounded border-border-subtle bg-surface-container-low text-primary focus:ring-primary focus:ring-offset-surface cursor-pointer"
              id="terms"
              name="terms"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
          </div>
          <div className="ml-3 font-body-sm text-body-sm text-on-surface-variant">
            <label className="cursor-pointer" htmlFor="terms">
              I agree to the <a className="text-primary hover:text-primary-container underline underline-offset-2 transition-colors" href="#">Terms of Service</a> and <a className="text-primary hover:text-primary-container underline underline-offset-2 transition-colors" href="#">Privacy Policy</a>.
            </label>
          </div>
        </div>
        {errors.terms && <span className="font-label-md text-label-md text-error block">{errors.terms}</span>}

        <div className="pt-stack-md">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md py-3.5 rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Continue to Assessment'}
            {!loading && <Icon name="arrow_forward" className="text-[20px]" />}
          </button>
        </div>
      </form>

      <div className="mt-stack-lg text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:text-primary-container transition-colors ml-1">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;