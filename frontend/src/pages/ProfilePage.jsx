import { useEffect, useRef, useState } from 'react';
import { getProfile, saveProfile, uploadAvatar, assetURL } from '../utils/api';
import { getErrorMessage } from '../utils/errors';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const STEPS = ['Basic Info', 'Links', 'Experience'];

const emptyEducation = () => ({
  institution: '',
  degree: '',
  field_of_study: '',
  start_date: '',
  end_date: '',
  description: '',
});

const emptyExperience = () => ({
  company: '',
  role: '',
  description: '',
  start_date: '',
  end_date: '',
  is_current: false,
});

const inputClass =
  'bg-surface border border-border-subtle rounded-lg px-4 py-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner placeholder:text-on-surface-variant/50';

const labelInput = 'font-label-md text-label-md text-on-surface-variant';

const ProfilePage = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    headline: '',
    bio: '',
    location: '',
    github_url: '',
    linkedin_url: '',
    education: [emptyEducation()],
    experience: [emptyExperience()],
  });
  const [avatar, setAvatar] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    getProfile()
      .then(({ data }) => {
        setForm({
          headline: data.headline || '',
          bio: data.bio || '',
          location: data.location || '',
          github_url: data.github_url || '',
          linkedin_url: data.linkedin_url || '',
          education:
            data.education?.length > 0
              ? data.education.map((e) => ({ ...emptyEducation(), ...e }))
              : [emptyEducation()],
          experience:
            data.experience?.length > 0
              ? data.experience.map((x) => ({ ...emptyExperience(), ...x }))
              : [emptyExperience()],
        });
        setAvatar(data.avatar_url || '');
      })
      .catch((err) => setError(getErrorMessage(err, 'Failed to load profile')))
      .finally(() => setLoading(false));
  }, []);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const onEducationChange = (idx, key, value) => {
    const list = [...form.education];
    list[idx] = { ...list[idx], [key]: value };
    set('education', list);
  };

  const onExperienceChange = (idx, key, value) => {
    const list = [...form.experience];
    list[idx] = { ...list[idx], [key]: value };
    set('experience', list);
  };

  const handleAvatar = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatar(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    setSaved('');
    for (const field of ['github_url', 'linkedin_url']) {
      const url = (form[field] || '').trim();
      if (url && !/^https?:\/\/\S+$/i.test(url)) {
        setError(`${field.replace('_', ' ')} must start with http:// or https://`);
        setSaving(false);
        return;
      }
    }
    if ((form.bio || '').length > 3000) {
      setError('Bio must be under 3000 characters.');
      setSaving(false);
      return;
    }
    try {
      if (avatarFile) {
        await uploadAvatar(avatarFile);
      }
      const payload = {
        ...form,
        education: form.education.filter((x) => x.institution.trim()),
        experience: form.experience.filter((x) => x.company.trim()),
      };
      const { data } = await saveProfile(payload);
      setAvatar(data.avatar_url || avatar);
      setSaved('Profile saved successfully!');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save profile'));
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setSaved('');
      handleSubmit();
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center p-margin-mobile md:p-margin-desktop relative overflow-hidden">
        <div className="flex flex-col items-center gap-stack-md text-on-surface-variant animate-fade-in">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="font-body-sm text-body-sm">Loading your profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex items-center justify-center p-margin-mobile md:p-margin-desktop relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="w-full max-w-3xl bg-surface-card rounded-xl border border-border-subtle shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl relative overflow-hidden my-stack-md">
        <div className="p-gutter border-b border-border-subtle bg-glass-bg backdrop-blur-md relative z-10">
          <div className="flex flex-col gap-stack-sm mb-stack-lg">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Build Your Profile</h1>
            <p className="font-body-sm text-sm text-on-surface-variant">
              Let's craft your professional AI-optimized narrative.
            </p>
          </div>

          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-surface-bright -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-col items-center relative z-10 gap-stack-sm bg-surface-card px-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center bg-surface-card border-2 transition-all ${
                    i === step ? 'step-active' : i < step ? 'step-completed' : 'border-surface-bright text-surface-bright step-inactive'
                  }`}
                >
                  {i < step ? (
                    <Icon name="check" className="text-[14px]" />
                  ) : (
                    <span className="font-label-md text-label-md">{i + 1}</span>
                  )}
                </div>
                <span
                  className={`font-label-md text-label-md ${
                    i === step ? 'text-primary' : i < step ? 'text-success' : 'text-surface-bright'
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-gutter relative">
          {error && (
            <div className="mb-stack-md flex items-center gap-stack-sm px-4 py-3 rounded-lg border border-error/30 bg-error/10 text-error font-body-sm text-sm animate-fade-in">
              <Icon name="error" className="text-lg" />
              {error}
            </div>
          )}
          {saved && (
            <div className="mb-stack-md flex items-center gap-stack-sm px-4 py-3 rounded-lg border border-success/30 bg-success/10 text-success font-body-sm text-sm animate-fade-in">
              <Icon name="check_circle" className="text-lg" />
              {saved}
            </div>
          )}

          {step === 0 && (
            <div className="flex flex-col gap-gutter animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                <div className="flex flex-col gap-stack-sm">
                  <label className={labelInput}>Professional Headline</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. Senior Product Designer"
                    type="text"
                    value={form.headline}
                    onChange={(e) => set('headline', e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-stack-sm">
                  <label className={labelInput}>Location</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. San Francisco, CA"
                    type="text"
                    value={form.location}
                    onChange={(e) => set('location', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-stack-sm">
                <label className={`${labelInput} flex justify-between`}>
                  <span>Bio</span>
                  <span className="text-xs opacity-50">Generate with AI <Icon name="auto_awesome" className="text-[14px] align-middle ml-1" /></span>
                </label>
                <textarea
                  className={`${inputClass} resize-none`}
                  placeholder="Briefly describe your career journey and aspirations..."
                  rows="4"
                  value={form.bio}
                  onChange={(e) => set('bio', e.target.value)}
                />
              </div>

              <div className="flex items-center gap-stack-md bg-surface p-4 rounded-lg border border-border-subtle">
                <div className="w-16 h-16 rounded-full bg-surface-container-high border border-border-subtle flex items-center justify-center overflow-hidden shrink-0">
                {avatar ? (
                  <img
                    src={avatar.startsWith('http') || avatar.startsWith('blob:') || avatar.startsWith('data:') ? avatar : assetURL(avatar)}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Icon name="person" className="text-on-surface-variant text-3xl" />
                )}
              </div>
                <div className="flex-grow flex flex-col gap-1">
                  <span className="font-label-md text-label-md text-on-surface">Profile Picture</span>
                  <span className="font-body-sm text-xs text-on-surface-variant">
                    Upload a professional headshot. JPG, PNG up to 5MB.
                  </span>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-surface-container hover:bg-surface-bright border border-border-subtle rounded-lg font-label-md text-label-md text-on-surface transition-colors"
                >
                  Upload
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-gutter animate-fade-in">
              <div className="flex flex-col gap-stack-sm">
                <label className={labelInput}>GitHub URL</label>
                <input
                  className={inputClass}
                  placeholder="https://github.com/username"
                  type="text"
                  value={form.github_url}
                  onChange={(e) => set('github_url', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-stack-sm">
                <label className={labelInput}>LinkedIn URL</label>
                <input
                  className={inputClass}
                  placeholder="https://linkedin.com/in/username"
                  type="text"
                  value={form.linkedin_url}
                  onChange={(e) => set('linkedin_url', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-gutter animate-fade-in">
              <div className="flex flex-col gap-gutter">
                <div className="flex items-center justify-between">
                  <h2 className="font-headline-md text-headline-md text-on-surface">Experience</h2>
                  <button
                    type="button"
                    onClick={() => set('experience', [...form.experience, emptyExperience()])}
                    className="px-4 py-2 bg-surface-container hover:bg-surface-bright border border-border-subtle rounded-lg font-label-md text-label-md text-on-surface transition-colors flex items-center gap-stack-sm"
                  >
                    <Icon name="add" className="text-base" /> Add
                  </button>
                </div>
                {form.experience.map((x, i) => (
                  <div key={i} className="flex flex-col gap-stack-md bg-surface p-4 rounded-lg border border-border-subtle">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-label-md text-on-surface-variant">Experience {i + 1}</span>
                      {form.experience.length > 1 && (
                        <button
                          type="button"
                          onClick={() => set('experience', form.experience.filter((_, idx) => idx !== i))}
                          className="text-on-surface-variant hover:text-error transition-colors"
                        >
                          <Icon name="delete" className="text-xl" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                      <div className="flex flex-col gap-stack-sm">
                        <label className={labelInput}>Company</label>
                        <input
                          className={inputClass}
                          placeholder="Company name"
                          type="text"
                          value={x.company}
                          onChange={(e) => onExperienceChange(i, 'company', e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-stack-sm">
                        <label className={labelInput}>Role</label>
                        <input
                          className={inputClass}
                          placeholder="e.g. Frontend Developer"
                          type="text"
                          value={x.role}
                          onChange={(e) => onExperienceChange(i, 'role', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-stack-sm">
                      <label className={labelInput}>Description</label>
                      <textarea
                        className={`${inputClass} resize-none`}
                        rows="3"
                        value={x.description}
                        onChange={(e) => onExperienceChange(i, 'description', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                      <div className="flex flex-col gap-stack-sm">
                        <label className={labelInput}>Start Date</label>
                        <input
                          className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                          type="date"
                          value={x.start_date}
                          onChange={(e) => onExperienceChange(i, 'start_date', e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-stack-sm">
                        <label className={labelInput}>End Date</label>
                        <input
                          className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                          type="date"
                          value={x.end_date}
                          disabled={x.is_current}
                          onChange={(e) => onExperienceChange(i, 'end_date', e.target.value)}
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-stack-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={x.is_current}
                        onChange={(e) => onExperienceChange(i, 'is_current', e.target.checked)}
                      />
                      <span className="font-body-sm text-sm text-on-surface-variant">I currently work here</span>
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-gutter">
                <div className="flex items-center justify-between">
                  <h2 className="font-headline-md text-headline-md text-on-surface">Education</h2>
                  <button
                    type="button"
                    onClick={() => set('education', [...form.education, emptyEducation()])}
                    className="px-4 py-2 bg-surface-container hover:bg-surface-bright border border-border-subtle rounded-lg font-label-md text-label-md text-on-surface transition-colors flex items-center gap-stack-sm"
                  >
                    <Icon name="add" className="text-base" /> Add
                  </button>
                </div>
                {form.education.map((ed, i) => (
                  <div key={i} className="flex flex-col gap-stack-md bg-surface p-4 rounded-lg border border-border-subtle">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-label-md text-on-surface-variant">Education {i + 1}</span>
                      {form.education.length > 1 && (
                        <button
                          type="button"
                          onClick={() => set('education', form.education.filter((_, idx) => idx !== i))}
                          className="text-on-surface-variant hover:text-error transition-colors"
                        >
                          <Icon name="delete" className="text-xl" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                      <div className="flex flex-col gap-stack-sm">
                        <label className={labelInput}>Institution</label>
                        <input
                          className={inputClass}
                          placeholder="University / School"
                          type="text"
                          value={ed.institution}
                          onChange={(e) => onEducationChange(i, 'institution', e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-stack-sm">
                        <label className={labelInput}>Degree</label>
                        <input
                          className={inputClass}
                          placeholder="e.g. BSCS"
                          type="text"
                          value={ed.degree}
                          onChange={(e) => onEducationChange(i, 'degree', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-stack-sm">
                      <label className={labelInput}>Field of Study</label>
                      <input
                        className={inputClass}
                        placeholder="e.g. Computer Science"
                        type="text"
                        value={ed.field_of_study}
                        onChange={(e) => onEducationChange(i, 'field_of_study', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                      <div className="flex flex-col gap-stack-sm">
                        <label className={labelInput}>Start Date</label>
                        <input
                          className={inputClass}
                          type="date"
                          value={ed.start_date}
                          onChange={(e) => onEducationChange(i, 'start_date', e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-stack-sm">
                        <label className={labelInput}>End Date</label>
                        <input
                          className={inputClass}
                          type="date"
                          value={ed.end_date}
                          onChange={(e) => onEducationChange(i, 'end_date', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-stack-sm">
                      <label className={labelInput}>Description</label>
                      <textarea
                        className={`${inputClass} resize-none`}
                        rows="2"
                        value={ed.description}
                        onChange={(e) => onEducationChange(i, 'description', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-stack-lg pt-gutter border-t border-border-subtle flex justify-between items-center">
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className={`px-6 py-3 font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors ${step === 0 ? 'invisible' : ''}`}
            >
              Back
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleNext}
              className="px-6 py-3 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-colors shadow-[0_0_15px_rgba(192,193,255,0.2)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-stack-sm"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {step === STEPS.length - 1 ? 'Save Profile' : 'Continue'}
                  <Icon name="arrow_forward" className="text-base" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;