import { useEffect, useState } from 'react';
import {
  getGoals,
  createGoal,
  updateGoal,
  completeGoal,
  deleteGoal,
} from '../utils/api';
import { getErrorMessage } from '../utils/errors';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const TIMELINES = [
  { value: '1mo', label: '1 Month' },
  { value: '3mo', label: '3 Months' },
  { value: '6mo', label: '6 Months' },
  { value: '1yr', label: '1 Year' },
  { value: '1yr+', label: '1 Year+' },
];

const PRIORITIES = ['High', 'Medium', 'Low'];

const PRIORITY_STYLE = {
  High: 'bg-error/10 text-error border-error/20',
  Medium: 'bg-surface-container-highest text-warning border-warning/20',
  Low: 'bg-surface-container-highest text-success border-success/20',
};

const PRIORITY_DOT = {
  High: 'bg-error',
  Medium: 'bg-warning',
  Low: 'bg-success',
};

const ACCENT = {
  High: 'from-error/40 to-transparent',
  Medium: 'from-warning/30 to-transparent',
  Low: 'from-success/30 to-transparent',
};

const timelineLabel = (t) =>
  (TIMELINES.find((x) => x.value === t) || { label: t }).label;

const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date)) return String(d).slice(0, 10);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const clamp = (n) => {
  const v = Number(n);
  if (Number.isNaN(v)) return 0;
  return Math.min(100, Math.max(0, v));
};

const emptyForm = () => ({
  title: '',
  description: '',
  target_role: '',
  industry: '',
  timeline: '6mo',
  priority: 'Medium',
  progress: 0,
  status: 'active',
});

const GoalsPage = () => {
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    getGoals()
      .then(({ data }) => setGoals(data.items || []))
      .catch((err) => setError(getErrorMessage(err, 'Failed to load goals')))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const change = (key) => (e) => {
    const value = e.target.type === 'range' ? Number(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const openAdd = () => {
    setForm(emptyForm());
    setError('');
    setModal({ mode: 'add' });
  };

  const openEdit = (g) => {
    setForm({
      title: g.title,
      description: g.description || '',
      target_role: g.target_role || '',
      industry: g.industry || '',
      timeline: g.timeline || '6mo',
      priority: g.priority || 'Medium',
      progress: clamp(g.progress) || 0,
      status: g.status || 'active',
    });
    setError('');
    setModal({ mode: 'edit', id: g.id });
  };

  const handleSave = async () => {
    setError('');
    if (!form.title.trim()) {
      setError('Goal title is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, title: form.title.trim() };
      if (modal.mode === 'edit') {
        await updateGoal(modal.id, payload);
      } else {
        await createGoal(payload);
      }
      setModal(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save goal'));
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id) => {
    setError('');
    try {
      await completeGoal(id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to complete goal'));
    }
  };

  const handleDelete = async (id) => {
    setError('');
    try {
      await deleteGoal(modal.id);
      setModal(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete goal'));
    }
  };

  const active = goals.filter((g) => g.status !== 'completed');
  const complete = goals.filter((g) => g.status === 'completed');
  const avgProgress = active.length
    ? Math.round(active.reduce((s, g) => s + clamp(g.progress), 0) / active.length)
    : 0;
  const priorityCount = (p) => active.filter((g) => g.priority === p).length;

  const inputCls =
    'w-full bg-surface-container border border-border-subtle text-on-surface font-body-sm text-body-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all';

  return (
    <div className="flex-1 p-margin-mobile md:p-margin-desktop max-w-7xl mx-auto space-y-gutter pb-24">
      <section className="glass-panel rounded-xl p-stack-lg relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-72 h-72 bg-primary-container rounded-full blur-[110px] opacity-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-stack-lg">
          <div className="flex-1">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-stack-sm flex items-center gap-2">
              <Icon name="flag" className="text-primary" /> Career Goals
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Define the milestones that guide your career. Break a big ambition into
              trackable goals with a clear role, timeline and priority.
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="bg-primary text-on-primary font-label-md text-label-md px-6 py-3 rounded-lg hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(192,193,255,0.3)] whitespace-nowrap self-start"
          >
            <Icon name="add" className="text-sm" /> New Goal
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div className="bg-surface-card border border-border-subtle rounded-xl p-stack-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center">
              <Icon name="flag" className="text-primary" />
            </div>
            <div>
              <p className="font-mono-sm text-mono-sm text-on-surface-variant">Total Goals</p>
              <p className="font-headline-md text-headline-md text-on-surface">{goals.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-card border border-border-subtle rounded-xl p-stack-md">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-secondary-container/20 flex items-center justify-center">
              <Icon name="pending_actions" className="text-secondary" />
            </div>
            <div>
              <p className="font-mono-sm text-mono-sm text-on-surface-variant">In Progress</p>
              <p className="font-headline-md text-headline-md text-on-surface">{active.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-card border border-border-subtle rounded-xl p-stack-md">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <Icon name="task_alt" className="text-success" />
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Completed</p>
              <p className="font-headline-md text-headline-md text-on-surface">{complete.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-card border border-border-subtle rounded-xl p-stack-md">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-tertiary-container/20 flex items-center justify-center">
              <Icon name="trending_up" className="text-tertiary" />
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Avg Progress</p>
              <p className="font-headline-md text-headline-md text-on-surface">{avgProgress}%</p>
            </div>
          </div>
        </div>
      </div>

      {error && !modal && (
        <div className="bg-error/10 border border-error/30 text-error rounded-xl p-4 font-body-sm">{error}</div>
      )}

      {loading ? (
        <div className="bg-surface-card border border-border-subtle rounded-xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin mb-4"></div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Loading your goals...</p>
        </div>
      ) : active.length === 0 && complete.length === 0 ? (
        <div className="bg-surface-card border border-border-subtle rounded-xl p-16 flex flex-col items-center justify-center text-center">
          <Icon name="flag" className="text-5xl text-outline mb-3" />
          <h3 className="font-headline-md text-headline-md text-on-surface mb-1">No goals yet</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mb-4">
            Create your first career goal and start turning ambition into an actionable plan.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="bg-primary text-on-primary font-label-md text-label-md px-6 py-2.5 rounded-lg hover:bg-primary-fixed transition-colors flex items-center gap-2"
          >
            <Icon name="add" className="text-sm" /> Create a Goal
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-stack-md">
            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
              <Icon name="speed" className="text-primary" /> Active Goals
              <span className="bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded-md font-mono-sm text-mono-sm ml-1">{active.length}</span>
            </h3>
            <div className="hidden sm:flex items-center gap-3">
              {PRIORITIES.map((p) => (
                <span key={p} className="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm">
                  <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[p]}`}></span>
                  {p} <span className="text-outline">({priorityCount(p)})</span>
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
            {active.map((g) => {
              const p = clamp(g.progress);
              return (
                <div key={g.id} className="bg-surface-card border border-border-subtle rounded-xl overflow-hidden group hover:border-primary/40 transition-colors flex flex-col">
                  <div className={`h-1 bg-gradient-to-r ${ACCENT[g.priority] || ACCENT.Medium} bg-surface-container-highest relative`}></div>
                  <div className="p-stack-lg flex-1 flex flex-col">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded font-label-md text-label-md border ${PRIORITY_STYLE[g.priority] || PRIORITY_STYLE.Medium}`}>
                        {g.priority || 'Medium'} Priority
                      </span>
                      <button
                        type="button"
                        onClick={() => openEdit(g)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-primary"
                      >
                        <Icon name="more_horiz" />
                      </button>
                    </div>

                    <h4 className="font-body-lg text-body-lg font-semibold text-on-surface mb-1">{g.title}</h4>

                    {(g.target_role || g.industry) && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {g.target_role && (
                          <span className="flex items-center gap-1 bg-surface-container-low border border-border-subtle text-on-surface-variant text-label-md text-label-md px-2 py-0.5 rounded-md">
                            <Icon name="badge" className="text-[14px]" /> {g.target_role}
                          </span>
                        )}
                        {g.industry && (
                          <span className="flex items-center gap-1 bg-surface-container-low border border-border-subtle text-on-surface-variant text-label-md text-label-md px-2 py-0.5 rounded-md">
                            <Icon name="domain" className="text-[14px]" /> {g.industry}
                          </span>
                        )}
                      </div>
                    )}

                    {g.description && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 line-clamp-2">{g.description}</p>
                    )}

                    <div className="mt-auto">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-label-md text-label-md text-on-surface-variant">
                          <Icon name="schedule" className="text-[14px] align-text-bottom inline mr-1" />
                          {timelineLabel(g.timeline)}
                        </span>
                        <span className="font-mono-sm text-mono-sm text-primary">{p}%</span>
                      </div>
                      <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-inverse-primary to-primary"
                          style={{ width: `${p}%` }}
                        ></div>
                      </div>
                      <div className="mt-stack-md flex items-center gap-2 pt-stack-sm border-t border-border-subtle">
                        <button
                          type="button"
                          onClick={() => handleComplete(g.id)}
                          className="flex-1 px-3 py-2 rounded-lg bg-success/10 text-success border border-success/20 hover:bg-success/20 font-label-md text-label-md transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Icon name="check" className="text-sm" /> Complete
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(g)}
                          className="flex-1 px-3 py-2 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface border border-border-subtle font-label-md text-label-md transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={openAdd}
              className="border-2 border-dashed border-border-subtle rounded-xl hover:border-primary/50 hover:bg-surface-card/50 transition-colors flex flex-col items-center justify-center py-12 text-center group"
            >
              <div className="w-12 h-12 mb-3 rounded-full bg-surface-container flex items-center justify-center group-hover:bg-primary-container/20 transition-colors">
                <Icon name="add" className="text-2xl text-on-surface-variant group-hover:text-primary" />
              </div>
              <span className="font-label-md text-label-md text-on-surface-variant group-hover:text-on-surface">Add another goal</span>
            </button>
          </div>

          {complete.length > 0 && (
            <>
              <h3 className="font-headline-md text-headline-md text-on-surface mt-gutter mb-stack-md flex items-center gap-2">
                <Icon name="verified" className="text-success" /> Completed Goals
                <span className="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-md font-mono-sm text-mono-sm ml-1">{complete.length}</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                {complete.map((g) => (
                  <div key={g.id} className="bg-surface-card border border-border-subtle rounded-xl p-stack-lg flex items-start gap-3 opacity-80">
                    <div className="w-8 h-8 rounded-full bg-success/15 text-success flex items-center justify-center flex-shrink-0">
                      <Icon name="check" className="text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-body-md text-body-md font-semibold text-success line-clamp-1">{g.title}</h4>
                        <span className="text-mono-sm text-mono-sm text-outline whitespace-nowrap">
                          {formatDate(g.updated_at || g.completed_at)}
                        </span>
                      </div>
                      {g.target_role && (
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 line-clamp-1">
                          {g.target_role}
                          {g.industry ? ` · ${g.industry}` : ''}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setModal({ mode: 'delete', id: g.id });
                        setForm(emptyForm());
                      }}
                      className="text-on-surface-variant hover:text-error transition-colors"
                      title="Delete"
                    >
                      <Icon name="delete" className="text-sm" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-margin-mobile" onClick={() => setModal(null)}>
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-surface-card border border-border-subtle rounded-2xl p-stack-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-stack-md">
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                <Icon name={modal.mode === 'add' ? 'flag' : 'edit'} className="text-primary" />
                {modal.mode === 'edit' ? 'Edit Goal' : modal.mode === 'delete' ? 'Delete Goal' : 'New Goal'}
              </h3>
              <button type="button" onClick={() => setModal(null)} className="text-on-surface-variant hover:text-on-surface">
                <Icon name="close" />
              </button>
            </div>

            {modal.mode === 'delete' ? (
              <>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-stack-lg">
                  Are you sure you want to permanently delete this goal? This cannot be undone.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="px-4 py-2.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface font-label-md text-label-md border border-border-subtle transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-6 py-2.5 bg-error/10 text-error border border-error/20 rounded-lg hover:bg-error/20 font-label-md text-label-md transition-colors flex items-center gap-2"
                  >
                    <Icon name="delete" className="text-sm" /> Delete Goal
                  </button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
                <div className="space-y-1 md:col-span-2">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="goal-title">Goal Title *</label>
                  <input
                    id="goal-title"
                    value={form.title}
                    onChange={change('title')}
                    placeholder="e.g. Become Senior Software Engineer"
                    className={inputCls}
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="goal-desc">Description</label>
                  <textarea
                    id="goal-desc"
                    value={form.description}
                    onChange={change('description')}
                    rows={3}
                    placeholder="Why is this goal important, and what does success look like?"
                    className={`${inputCls} resize-none`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="goal-role">Target Role</label>
                  <input
                    id="goal-role"
                    value={form.target_role}
                    onChange={change('target_role')}
                    placeholder="e.g. Engineering Manager"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="goal-industry">Industry</label>
                  <input
                    id="goal-industry"
                    value={form.industry}
                    onChange={change('industry')}
                    placeholder="e.g. Fintech"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="goal-timeline">Timeline</label>
                  <select id="goal-timeline" value={form.timeline} onChange={change('timeline')} className={inputCls}>
                    {TIMELINES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="goal-priority">Priority</label>
                  <select id="goal-priority" value={form.priority} onChange={change('priority')} className={inputCls}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="goal-progress">Progress</label>
                    <span className="font-mono-sm text-mono-sm text-primary">{form.progress}%</span>
                  </div>
                  <input
                    id="goal-progress"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={form.progress}
                    onChange={change('progress')}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-mono-sm text-mono-sm text-outline">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-stack-md bg-error/10 border border-error/30 text-error rounded-xl p-3 font-body-sm">{error}</div>
            )}

            {modal.mode !== 'delete' && (
              <div className="mt-stack-lg pt-stack-md border-t border-border-subtle flex items-center justify-between">
                {modal.mode === 'edit' ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="px-4 py-2.5 bg-error/10 text-error border border-error/20 rounded-lg hover:bg-error/20 font-label-md text-label-md transition-colors flex items-center gap-2"
                  >
                    <Icon name="delete" className="text-sm" /> Delete
                  </button>
                ) : (
                  <span></span>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="px-4 py-2.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface font-label-md text-label-md border border-border-subtle transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-fixed transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Icon name="save" className="text-sm" /> {saving ? 'Saving...' : modal.mode === 'edit' ? 'Update Goal' : 'Create Goal'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsPage;