import { useEffect, useState } from 'react';
import {
  createApplication,
  deleteApplication,
  getApplications,
  updateApplication,
  updateApplicationStatus,
} from '../utils/api';
import { getErrorMessage } from '../utils/errors';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const COLUMNS = [
  { key: 'wishlist', label: 'Wishlist', dot: 'bg-outline' },
  { key: 'applied', label: 'Applied', dot: 'bg-secondary-container' },
  { key: 'interview', label: 'Interview', dot: 'bg-primary-container' },
  { key: 'offer', label: 'Offer', dot: 'bg-success' },
];

const PRIORITY_STYLE = {
  high: 'bg-error/10 text-error border-error/20',
  medium: 'bg-surface-container-highest text-warning border-warning/20',
  low: 'bg-surface-container-highest text-success border-success/20',
};

const priorityLabel = (p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : 'Medium');

const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date)) return d.slice(0, 10);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const emptyForm = () => ({
  company: '',
  role: '',
  url: '',
  salary: '',
  status: 'wishlist',
  priority: 'medium',
  applied_date: '',
  notes: '',
});

const ApplicationsPage = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(null);
  const [overColumn, setOverColumn] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('priority');

  const load = async () => {
    try {
      const { data } = await getApplications();
      setApps(data.items || []);
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const columnApps = (key) => {
    const q = search.trim().toLowerCase();
    const list = apps.filter((a) => {
      if (a.status !== key) return false;
      if (statusFilter && a.status !== statusFilter) return false;
      if (q && !(`${a.company} ${a.role}`.toLowerCase().includes(q))) return false;
      if (dateFrom && a.applied_date && a.applied_date.slice(0, 10) < dateFrom) return false;
      if (dateTo && a.applied_date && a.applied_date.slice(0, 10) > dateTo) return false;
      return true;
    });
    if (sortBy === 'priority') {
      const order = { high: 0, medium: 1, low: 2 };
      return [...list].sort((x, y) => (order[x.priority] ?? 1) - (order[y.priority] ?? 1));
    }
    if (sortBy === 'date_desc') {
      return [...list].sort((x, y) => (y.applied_date || '').localeCompare(x.applied_date || ''));
    }
    if (sortBy === 'date_asc') {
      return [...list].sort((x, y) => (x.applied_date || '').localeCompare(y.applied_date || ''));
    }
    return list;
  };

  const openAdd = () => {
    setForm(emptyForm());
    setError('');
    setModal({ mode: 'add' });
  };

  const openEdit = (app) => {
    setForm({
      company: app.company,
      role: app.role,
      url: app.url || '',
      salary: app.salary || '',
      status: app.status,
      priority: app.priority || 'medium',
      applied_date: app.applied_date ? app.applied_date.slice(0, 10) : '',
      notes: app.notes || '',
    });
    setError('');
    setModal({ mode: 'edit', id: app.id });
  };

  const change = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const save = async () => {
    if (!form.company.trim() || !form.role.trim()) {
      setError('Company and role are required.');
      return;
    }
    if (form.url && form.url.trim() && !/^https?:\/\/\S+$/i.test(form.url.trim())) {
      setError('Job URL must start with http:// or https://');
      return;
    }
    try {
      const payload = { ...form, applied_date: form.applied_date || null };
      if (modal.mode === 'add') {
        const { data } = await createApplication(payload);
        setApps([data, ...apps]);
      } else {
        const { data } = await updateApplication(modal.id, payload);
        setApps(apps.map((a) => (a.id === data.id ? data : a)));
      }
      setModal(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Save failed.'));
    }
  };

  const handleDrop = async (appId, status) => {
    const prev = apps;
    setApps(apps.map((a) => (a.id === appId ? { ...a, status } : a)));
    try {
      await updateApplicationStatus(appId, status);
    } catch (err) {
      setApps(prev);
      setError(getErrorMessage(err, 'Failed to update status.'));
    }
    setDragging(null);
    setOverColumn(null);
  };

  const handleDelete = async () => {
    if (!modal || modal.mode !== 'edit') return;
    if (!window.confirm('Delete this application?')) return;
    try {
      await deleteApplication(modal.id);
      setApps(apps.filter((a) => a.id !== modal.id));
      setModal(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Delete failed.'));
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <header className="h-16 px-margin-mobile md:px-margin-desktop flex items-center justify-between bg-glass-bg backdrop-blur-xl border-b border-border-subtle sticky top-0 z-30 shrink-0">
        <h2 className="font-headline-lg text-headline-lg text-primary">Job Pipeline</h2>
        <div className="flex items-center gap-stack-md">
          <div className="relative hidden sm:block">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applications..."
              className="pl-10 pr-4 py-1.5 bg-surface-card border border-border-subtle rounded-full text-on-surface font-body-sm text-body-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors w-64 placeholder:text-outline"
            />
          </div>
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors text-on-surface font-label-md text-label-md ${
              filterOpen ? 'bg-surface-variant border-primary/40' : 'bg-surface-card border-border-subtle hover:bg-surface-variant'
            }`}
          >
            <Icon name="filter_list" className="text-sm" />
            Filter
          </button>
        </div>
      </header>

      {filterOpen && (
        <div className="px-margin-mobile md:px-margin-desktop pt-4 shrink-0">
          <div className="bg-surface-card border border-border-subtle rounded-xl p-stack-md flex flex-wrap items-end gap-stack-md">
            <div className="flex-1 min-w-[180px] space-y-1">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="filter-status">Status</label>
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-surface-container border border-border-subtle text-on-surface font-body-sm text-body-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="">All statuses</option>
                {COLUMNS.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="filter-from">From</label>
              <input
                id="filter-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-surface-container border border-border-subtle text-on-surface font-body-sm text-body-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="filter-to">To</label>
              <input
                id="filter-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-surface-container border border-border-subtle text-on-surface font-body-sm text-body-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="filter-sort">Sort</label>
              <select
                id="filter-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-surface-container border border-border-subtle text-on-surface font-body-sm text-body-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="priority">Priority</option>
                <option value="date_desc">Date (newest)</option>
                <option value="date_asc">Date (oldest)</option>
              </select>
            </div>
            {(statusFilter || dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="px-4 py-2 rounded-lg bg-surface-variant text-on-surface font-label-md text-label-md hover:bg-surface-bright transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-gutter">
        <div className="flex gap-gutter h-full min-w-max pb-4">
          {COLUMNS.map((col) => {
            const items = columnApps(col.key);
            return (
              <div
                key={col.key}
                className={`w-80 flex flex-col bg-surface-container-low rounded-xl border transition-colors ${
                  overColumn === col.key ? 'border-primary/60 ring-1 ring-primary/30' : 'border-border-subtle'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverColumn(col.key);
                }}
                onDragLeave={() => setOverColumn((c) => (c === col.key ? null : c))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragging) handleDrop(dragging, col.key);
                }}
              >
                <div className="p-stack-md border-b border-border-subtle flex items-center justify-between bg-surface-container rounded-t-xl">
                  <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dot}`}></span>
                    {col.label}
                    <span className="bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded-md font-mono-sm text-mono-sm ml-2">{items.length}</span>
                  </h3>
                  <button type="button" className="text-on-surface-variant hover:text-on-surface">
                    <Icon name="more_horiz" />
                  </button>
                </div>
                <div className="flex-1 p-stack-sm overflow-y-auto custom-scrollbar space-y-stack-sm">
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center opacity-50 border-2 border-dashed border-border-subtle rounded-lg m-2 py-8">
                      <Icon name="inbox" className="text-4xl mb-2 text-outline" />
                      <p className="font-body-sm text-body-sm text-outline">Drop cards here</p>
                    </div>
                  ) : (
                    items.map((app) => (
                      <div
                        key={app.id}
                        className={`kanban-card bg-surface-card border border-border-subtle rounded-lg p-stack-md relative group ${
                          dragging === app.id ? 'opacity-40' : ''
                        }`}
                        draggable
                        onDragStart={() => setDragging(app.id)}
                        onDragEnd={() => {
                          setDragging(null);
                          setOverColumn(null);
                        }}
                        onClick={() => openEdit(app)}
                        title={app.notes || 'Click to view / edit'}
                      >
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <Icon name="drag_indicator" className="text-on-surface-variant text-sm" />
                        </div>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`px-2 py-0.5 rounded font-label-md text-label-md border ${PRIORITY_STYLE[app.priority] || PRIORITY_STYLE.medium}`}>
                            {priorityLabel(app.priority)}
                          </span>
                          <span className="text-outline font-mono-sm text-mono-sm">
                            {app.applied_date ? `Applied ${formatDate(app.applied_date)}` : `Added ${formatDate(app.created_at)}`}
                          </span>
                        </div>
                        <h4 className="font-body-lg text-body-lg font-semibold text-on-surface">{app.company}</h4>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">{app.role}</p>
                        <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-border-subtle">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded bg-surface-variant flex items-center justify-center flex-shrink-0">
                              {app.url ? (
                                <a
                                  href={app.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center justify-center w-full h-full"
                                >
                                  <Icon name="link" className="text-[14px] text-primary" />
                                </a>
                              ) : (
                                <Icon name="link" className="text-[14px] text-outline" />
                              )}
                            </div>
                            <span className="font-label-md text-label-md text-outline truncate">Salary: {app.salary || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (app.url) window.open(app.url, '_blank', 'noopener,noreferrer');
                              }}
                              className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                              title="Open job link"
                            >
                              <Icon name="open_in_new" className="text-sm" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
          <div
            className="w-12 flex-shrink-0 flex items-center justify-center border border-dashed border-border-subtle rounded-xl hover:bg-surface-container transition-colors cursor-pointer group"
            onClick={openAdd}
            title="Add column"
          >
            <Icon name="add" className="text-outline group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-20">
          <div className="animate-pulse text-on-surface-variant font-label-md">Loading applications...</div>
        </div>
      )}

      {error && !modal && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-error/10 border border-error/30 text-error rounded-xl px-4 py-2 font-body-sm">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={openAdd}
        className="fixed bottom-margin-desktop right-margin-desktop w-14 h-14 bg-inverse-primary text-white rounded-full flex items-center justify-center shadow-[0px_10px_30px_rgba(73,75,214,0.4)] hover:scale-105 hover:bg-primary-container transition-transform z-50"
        title="Add application"
      >
        <Icon name="add" className="text-2xl" />
      </button>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-margin-mobile" onClick={() => setModal(null)}>
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-surface-card border border-border-subtle rounded-2xl p-stack-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-stack-md">
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                <Icon name={modal.mode === 'add' ? 'add_card' : 'edit'} className="text-primary" />
                {modal.mode === 'add' ? 'Add Application' : 'Edit Application'}
              </h3>
              <button type="button" onClick={() => setModal(null)} className="text-on-surface-variant hover:text-on-surface">
                <Icon name="close" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="app-company">Company *</label>
                <input
                  id="app-company"
                  value={form.company}
                  onChange={change('company')}
                  placeholder="Company name"
                  className="w-full bg-surface-container border border-border-subtle text-on-surface font-body-sm text-body-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="app-role">Role *</label>
                <input
                  id="app-role"
                  value={form.role}
                  onChange={change('role')}
                  placeholder="Job title"
                  className="w-full bg-surface-container border border-border-subtle text-on-surface font-body-sm text-body-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="app-url">URL</label>
                <input
                  id="app-url"
                  value={form.url}
                  onChange={change('url')}
                  placeholder="https://..."
                  className="w-full bg-surface-container border border-border-subtle text-on-surface font-body-sm text-body-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="app-salary">Salary</label>
                <input
                  id="app-salary"
                  value={form.salary || ''}
                  onChange={change('salary')}
                  placeholder="e.g. $120k - $150k"
                  className="w-full bg-surface-container border border-border-subtle text-on-surface font-body-sm text-body-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="app-date">Applied date</label>
                <input
                  id="app-date"
                  type="date"
                  value={form.applied_date}
                  onChange={change('applied_date')}
                  className="w-full bg-surface-container border border-border-subtle text-on-surface font-body-sm text-body-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="app-status">Status</label>
                <select
                  id="app-status"
                  value={form.status}
                  onChange={change('status')}
                  className="w-full bg-surface-container border border-border-subtle text-on-surface font-body-sm text-body-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                >
                  {COLUMNS.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="app-priority">Priority</label>
                <select
                  id="app-priority"
                  value={form.priority}
                  onChange={change('priority')}
                  className="w-full bg-surface-container border border-border-subtle text-on-surface font-body-sm text-body-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="app-notes">Notes</label>
                <textarea
                  id="app-notes"
                  value={form.notes}
                  onChange={change('notes')}
                  rows={4}
                  placeholder="Notes, next steps, links..."
                  className="w-full bg-surface-container border border-border-subtle text-on-surface font-body-sm text-body-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="mt-stack-md bg-error/10 border border-error/30 text-error rounded-xl p-3 font-body-sm">{error}</div>
            )}

            <div className="mt-stack-lg pt-stack-md border-t border-border-subtle flex items-center justify-between">
              {modal.mode === 'edit' ? (
                <button
                  type="button"
                  onClick={handleDelete}
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
                  onClick={save}
                  className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-fixed transition-colors flex items-center gap-2"
                >
                  <Icon name="save" className="text-sm" /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationsPage;