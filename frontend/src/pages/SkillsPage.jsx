import { useEffect, useState } from 'react';
import { getSkills, createSkill, updateSkill, deleteSkill } from '../utils/api';
import { getErrorMessage } from '../utils/errors';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const CATEGORIES = ['Technical', 'Soft', 'Design', 'Management'];

const CATEGORY_META = {
  Technical: { icon: 'terminal', accent: 'secondary', label: 'Technical Proficiency' },
  Soft: { icon: 'groups', accent: 'tertiary', label: 'Soft Skills & Leadership' },
  Design: { icon: 'palette', accent: 'warning', label: 'Design Skills' },
  Management: { icon: 'handyman', accent: 'success', label: 'Management' },
};

const CHIP_CLASS = {
  Technical: 'bg-secondary-container/20 border-secondary-container/30 text-secondary-container',
  Soft: 'bg-tertiary-container/20 border-tertiary-container/30 text-tertiary',
  Design: 'bg-warning/20 border-warning/30 text-warning',
  Management: 'bg-success/20 border-success/30 text-success',
};

const DOT_CLASS = {
  Technical: 'bg-secondary',
  Soft: 'bg-tertiary-container',
  Design: 'bg-warning',
  Management: 'bg-success',
};

const proficiency = (rating) => (rating >= 8 ? 'Expert' : rating >= 5 ? 'Advanced' : rating >= 3 ? 'Intermediate' : 'Beginner');

const yearsText = (y) => {
  if (y == null) return '';
  const n = Number(y);
  if (n === 0) return 'Less than a year';
  return `${n} ${n === 1 ? 'year' : 'years'}`;
};

const emptyForm = () => ({ name: '', category: 'Technical', rating: 5, years_of_experience: '' });

const SkillCard = ({ skill, onEdit, onDelete }) => {
  const accent = CHIP_CLASS[skill.category] || CHIP_CLASS.Technical;
  const dotColor = DOT_CLASS[skill.category] || 'bg-primary';
  const dots = Math.max(1, Math.min(5, Math.round(skill.rating / 2)));
  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl p-5 hover:border-primary/50 transition-colors group relative overflow-hidden flex flex-col justify-between min-h-[160px]">
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
        <button
          title="Edit"
          onClick={onEdit}
          className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Icon name="edit" className="text-lg" />
        </button>
        <button
          title="Delete"
          onClick={onDelete}
          className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
        >
          <Icon name="delete" className="text-lg" />
        </button>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className={`px-2 py-0.5 rounded border font-mono-sm text-mono-sm uppercase tracking-wider ${accent}`}>
            {skill.category || 'Technical'}
          </span>
          <span className="px-2 py-0.5 rounded bg-surface-variant border border-border-subtle text-on-surface-variant font-mono-sm text-mono-sm">
            {proficiency(skill.rating)}
          </span>
        </div>
        <h4 className="font-headline-md text-headline-md text-on-surface">{skill.name}</h4>
      </div>
      <div className="mt-4">
        <div className="flex justify-between items-end mb-2">
          <span className="font-body-sm text-body-sm text-on-surface-variant">{yearsText(skill.years_of_experience)}</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`w-6 h-1.5 rounded-full ${i < dots ? dotColor : 'bg-surface-variant'}`}
              ></span>
            ))}
          </div>
        </div>
        <p className="font-body-sm text-body-sm text-outline-variant line-clamp-2">
          {skill.rating}/10 proficiency
        </p>
      </div>
    </div>
  );
};

const SkillsPage = () => {
  const [skills, setSkills] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = () =>
    getSkills()
      .then(({ data }) => setSkills(data.items || []))
      .catch((err) => setError(getErrorMessage(err, 'Failed to load skills')))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (skill) => {
    setEditingId(skill.id);
    setForm({
      name: skill.name,
      category: skill.category || 'Technical',
      rating: skill.rating,
      years_of_experience: skill.years_of_experience ?? '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Skill name is required.');
      return;
    }
    if (form.years_of_experience !== '' && (Number(form.years_of_experience) < 0 || Number(form.years_of_experience) > 60)) {
      setError('Years of experience must be between 0 and 60.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      category: form.category,
      rating: Number(form.rating),
      years_of_experience: form.years_of_experience === '' ? null : Number(form.years_of_experience),
    };
    try {
      if (editingId) await updateSkill(editingId, payload);
      else await createSkill(payload);
      setForm(emptyForm());
      setEditingId(null);
      setShowModal(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save skill'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this skill?')) return;
    setError('');
    try {
      await deleteSkill(id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete skill'));
    }
  };

  const filtered = skills.filter(
    (s) => !search || s.name.toLowerCase().includes(search.toLowerCase())
  );
  const grouped = CATEGORIES.map((c) => ({ category: c, items: filtered.filter((s) => (s.category || 'Technical') === c) }))
    .filter((g) => g.items.length > 0);

  const inputCls =
    'w-full bg-surface-card border border-border-subtle rounded-lg px-4 py-2.5 font-body-sm text-body-sm text-on-surface placeholder-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all';

  return (
    <div className="flex-1 p-margin-mobile md:p-margin-desktop max-w-[1400px] mx-auto w-full flex flex-col gap-gutter">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-stack-md">
        <div>
          <h2 className="font-headline-lg md:text-headline-lg text-on-surface">Skill Inventory</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-2 max-w-2xl">
            Manage and track your technical proficiencies, soft skills, and core competencies to optimize AI-driven job matching.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm pointer-events-none" />
            <input
              className="w-full md:w-64 bg-surface-card border border-border-subtle rounded-lg py-2.5 pl-10 pr-4 font-body-sm text-body-sm text-on-surface placeholder-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="Search skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-primary hover:bg-primary-fixed-dim text-on-primary px-4 py-2.5 rounded-lg font-label-md font-bold transition-colors active:scale-95 shadow-lg shadow-primary/20 shrink-0"
          >
            <Icon name="add" className="text-lg" /> Add Skill
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/30 text-error font-body-sm text-body-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {loading ? (
        <div className="py-20 flex items-center justify-center text-on-surface-variant font-label-md animate-pulse">Loading skills...</div>
      ) : grouped.length === 0 ? (
        <div className="bg-surface-card border border-border-subtle rounded-xl p-16 flex flex-col items-center text-center">
          <Icon name="psychology" className="text-5xl text-outline mb-4" />
          <h3 className="font-headline-md text-on-surface mb-2">No skills yet</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 max-w-md">
            Add your first skill to begin tracking your proficiency and unlock AI-driven recommendations.
          </p>
          <button onClick={openAdd} className="flex items-center gap-2 bg-primary hover:bg-primary-fixed-dim text-on-primary px-5 py-2.5 rounded-lg font-label-md font-bold transition-colors">
            <Icon name="add" className="text-lg" /> Add your first skill
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
          {grouped.map((g) => (
            <div key={g.category} className="md:col-span-2 xl:col-span-3">
              <div className="flex items-center justify-between mt-stack-sm mb-unit">
                <h3 className={`font-headline-md text-headline-md flex items-center gap-2 ${'text-' + (CATEGORY_META[g.category]?.accent || 'secondary')}`}>
                  <Icon name={CATEGORY_META[g.category]?.icon || 'code'} />
                  {CATEGORY_META[g.category]?.label || g.category}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-border-subtle to-transparent ml-4"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
                {g.items.map((s) => (
                  <SkillCard key={s.id} skill={s} onEdit={() => openEdit(s)} onDelete={() => handleDelete(s.id)} />
                ))}
              </div>
            </div>
          ))}
          <div
            onClick={openAdd}
            className="bg-surface/50 border-2 border-dashed border-border-subtle rounded-xl p-5 hover:border-primary hover:bg-surface-card transition-all cursor-pointer flex flex-col items-center justify-center min-h-[160px] group opacity-70 hover:opacity-100"
          >
            <div className="w-12 h-12 rounded-full bg-surface-variant group-hover:bg-primary/20 flex items-center justify-center mb-3 transition-colors">
              <Icon name="add" className="text-outline group-hover:text-primary transition-colors" />
            </div>
            <span className="font-label-md text-label-md text-on-surface-variant group-hover:text-primary transition-colors">Add New Skill</span>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div
            className="glass-panel w-full max-w-lg rounded-xl shadow-2xl p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                {editingId ? 'Edit Skill' : 'Add Skill'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-on-surface-variant hover:text-on-surface p-1 rounded">
                <Icon name="close" className="text-lg" />
              </button>
            </div>
            {error && (
              <div className="mb-3 bg-error/10 border border-error/30 text-error font-body-sm text-body-sm rounded-lg px-3 py-2">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-stack-md">
              <div className="space-y-stack-sm">
                <label className="block font-label-md text-label-md text-on-surface-variant">Skill Name *</label>
                <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. React" />
              </div>
              <div className="space-y-stack-sm">
                <label className="block font-label-md text-label-md text-on-surface-variant">Category</label>
                <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-surface-card">{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-stack-sm">
                <label className="block font-label-md text-label-md text-on-surface-variant">
                  Proficiency: {form.rating}/10 ({proficiency(Number(form.rating))})
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  className="w-full accent-primary"
                  value={form.rating}
                  onChange={(e) => set('rating', e.target.value)}
                />
              </div>
              <div className="space-y-stack-sm">
                <label className="block font-label-md text-label-md text-on-surface-variant">Years of Experience</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className={inputCls}
                  value={form.years_of_experience}
                  onChange={(e) => set('years_of_experience', e.target.value)}
                  placeholder="e.g. 3"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-border-subtle rounded-lg text-on-surface-variant font-label-md hover:text-on-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:bg-primary-fixed transition-colors"
                >
                  {editingId ? 'Update Skill' : 'Add Skill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsPage;