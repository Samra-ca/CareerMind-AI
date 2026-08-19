import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLatestRoadmap, generateRoadmap, updateRoadmapItem } from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import Dropdown from '../components/Dropdown';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const DURATIONS = [
  { value: '3mo', label: '3 months' },
  { value: '6mo', label: '6 months' },
  { value: '12mo', label: '12 months' },
];

const ROLE_OPTIONS = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Scientist',
  'DevOps Engineer',
  'Machine Learning Engineer',
  'Product Manager',
  'UI/UX Designer',
].map((r) => ({ value: r, label: r }));

const DOT_CLASS = {
  completed: 'bg-surface-card border border-border-subtle',
  inprogress: 'bg-primary text-on-primary shadow-[0_0_20px_rgba(192,193,255,0.4)]',
  upcoming: 'bg-surface-container border border-outline border-dashed',
};

const CARD_CLASS = {
  completed: 'bg-surface-card border border-border-subtle rounded-xl p-stack-md opacity-70 transition-opacity hover:opacity-100',
  inprogress: 'bg-surface-card border border-primary/50 rounded-xl p-stack-md shadow-[0_4px_30px_rgba(192,193,255,0.05)] relative overflow-hidden',
  upcoming: 'bg-surface-dim border border-border-subtle rounded-xl p-stack-md opacity-50',
};

const BADGE_CLASS = {
  completed: 'bg-surface-container text-success font-mono-sm text-mono-sm rounded',
  inprogress: 'bg-primary/20 text-primary font-mono-sm text-mono-sm border border-primary/30 rounded',
  upcoming: 'bg-surface-container text-on-surface-variant font-mono-sm text-mono-sm rounded',
};

const BADGE_LABEL = {
  completed: 'Completed',
  inprogress: 'In Progress',
  upcoming: 'Upcoming',
};

const linesOf = (item) => {
  const d = item.description;
  if (Array.isArray(d)) return d.map(String).filter(Boolean);
  if (typeof d === 'string') return d.split('\n').map((s) => s.trim()).filter(Boolean);
  return [];
};

const tasksOf = (item) => {
  if (Array.isArray(item.tasks)) {
    return item.tasks.map((t, i) =>
      t && typeof t === 'object'
        ? { key: i, text: String(t.text || t.title || ''), done: !!t.done }
        : { key: i, text: String(t), done: !!item.completed }
    );
  }
  return linesOf(item).map((text, i) => ({ key: i, text, done: !!item.completed }));
};

const esc = (s) =>
  String(s == null ? '' : s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

const RoadmapPage = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [duration, setDuration] = useState('3mo');
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    getLatestRoadmap()
      .then(({ data }) => {
        setRoadmap(data);
        setError('');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!savedFlash) return undefined;
    const t = setTimeout(() => setSavedFlash(false), 2200);
    return () => clearTimeout(t);
  }, [savedFlash]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!role.trim()) {
      setError('Please enter a target role.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await generateRoadmap(role.trim(), duration);
      setRoadmap(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Generation failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (item, taskIndex) => {
    setError('');
    const tasks = tasksOf(item);
    tasks[taskIndex] = { ...tasks[taskIndex], done: !tasks[taskIndex].done };
    const completed = tasks.length > 0 && tasks.every((t) => t.done);
    setRoadmap((r) => ({
      ...r,
      items: r.items.map((it) =>
        it.id === item.id ? { ...it, tasks: tasks.map((t) => ({ text: t.text, done: t.done })), completed } : it
      ),
    }));
    try {
      await updateRoadmapItem(item.id, {
        tasks: tasks.map((t) => ({ text: t.text, done: t.done })),
        completed,
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save task.'));
      setRoadmap((r) => ({
        ...r,
        items: r.items.map((it) => (it.id === item.id ? item : it)),
      }));
    }
  };

  const handleSave = async () => {
    setError('');
    if (!roadmap) return;
    try {
      const { data } = await getLatestRoadmap();
      setRoadmap(data);
      setSavedFlash(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save roadmap.'));
    }
  };

  const exportPdf = () => {
    if (!roadmap) return;
    const rows = items
      .map((item) => {
        const ts = tasksOf(item).filter((t) => t.text);
        const checks = ts
          .map((t) => `<li class="${t.done ? 'done' : ''}">${esc(t.text)}</li>`)
          .join('');
        return `<div class="week"><h3>${esc(`Week ${item.week}: ${item.title}`)}</h3>${
          checks ? `<ul>${checks}</ul>` : ''
        }</div>`;
      })
      .join('');
    const date = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(
      target ? `${target} Track` : 'Learning Roadmap'
    )}</title><style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #1a1a2e; margin: 40px; }
      h1 { margin: 0 0 4px; font-size: 26px; }
      .sub { color: #6b7089; margin-bottom: 20px; font-size: 14px; }
      .meta { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 28px; padding: 14px 16px; background: #f1f2ff; border-radius: 10px; font-size: 13px; color: #3a3a6b; }
      .week { margin-bottom: 22px; page-break-inside: avoid; }
      .week h3 { margin: 0 0 8px; font-size: 17px; color: #2b2b45; border-left: 4px solid #c0c1ff; padding-left: 10px; }
      .week ul { list-style: none; margin: 0; padding: 0; }
      .week li { position: relative; padding: 5px 0 5px 30px; font-size: 14px; color: #3c3c55; }
      .week li.done { color: #8a8aa0; text-decoration: line-through; }
      .week li.done::before { content: '\\2713'; position: absolute; left: 0; color: #2bb673; font-weight: 700; }
      .week li:not(.done)::before { content: '\\2610'; position: absolute; left: 0; font-size: 16px; }
      .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e3e3f0; font-size: 12px; color: #9a9ab0; }
      @media print { body { margin: 0; } }
    </style></head><body>
      <h1>${esc(target ? `${target} Track` : 'Learning Roadmap')}</h1>
      <div class="sub">CareerMind.AI &bull; Generated ${date}</div>
      <div class="meta">
        <span>Total: ${total} milestones</span>
        <span>Completed: ${completedCount}</span>
        <span>Progress: ${progress}%</span>
      </div>
      ${rows}
      <div class="footer">Generated by CareerMind.AI</div>
    </body></html>`;
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) {
      setError('Please allow pop-ups to export the roadmap as PDF.');
      return;
    }
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      setTimeout(() => printWin.close(), 500);
    }, 350);
  };

  const items = roadmap ? [...roadmap.items].sort((a, b) => a.week - b.week) : [];
  const completedCount = items.filter((i) => i.completed).length;
  const currentIndex = items.findIndex((i) => !i.completed);
  const currentWeek = currentIndex === -1 ? items.length : currentIndex + 1;
  const total = items.length;
  const progress = total ? Math.round((completedCount / total) * 100) : 0;
  const target = roadmap ? roadmap.target_role || role : role;

  const statusOf = (item) => {
    const idx = items.findIndex((x) => x.id === item.id);
    if (item.completed) return 'completed';
    if (idx === currentIndex) return 'inprogress';
    return 'upcoming';
  };

  const currentTitle = currentIndex >= 0 ? items[currentIndex].title : 'Your Track';
  const searchTopic = `${currentTitle} ${target ? `for ${target}` : ''}`.trim();
  const weekLabel = currentIndex >= 0 ? `Week ${currentWeek}` : 'this week';

  const discussWeek = () => {
    navigate('/chat', {
      state: {
        prompt: `Help me master "${currentTitle}" (${weekLabel}). Explain the key concepts, recommend the best learning resources, and give me a focused study plan with practice exercises.`,
      },
    });
  };

  return (
    <div className="flex-1 p-margin-mobile md:p-margin-desktop max-w-7xl mx-auto space-y-gutter pb-24">
      <style>{`
        .roadmap-line::before {
          content: '';
          position: absolute;
          left: 23px;
          top: 24px;
          bottom: -24px;
          width: 2px;
          background-color: #c0c1ff;
          z-index: 0;
        }
        .roadmap-item:last-child .roadmap-line::before {
          display: none;
        }
        .roadmap-line-dashed::before {
          background-image: linear-gradient(to bottom, #c0c1ff 50%, transparent 50%);
          background-size: 2px 10px;
          background-color: transparent;
        }
      `}</style>

      <header className="mb-stack-lg flex flex-col md:flex-row justify-between items-start md:items-end gap-stack-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-unit">Learning Roadmap</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            {target ? `${target} Track` : 'Your Track'} • Estimated {total || 12} Weeks
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-4 bg-surface-card border border-border-subtle px-4 py-2 rounded-full">
            <div className="w-48 h-2 bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(192,193,255,0.5)]"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="font-mono-sm text-mono-sm text-primary">
              Week {currentWeek} of {total}
            </span>
          </div>
          {roadmap && (
            <>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-2 bg-primary text-on-primary font-label-md text-label-md px-4 py-2 rounded-lg hover:bg-primary-fixed transition-colors shadow-[0_0_10px_rgba(192,193,255,0.25)]"
              >
                <Icon name={savedFlash ? 'check' : 'save'} className="text-[16px]" />
                {savedFlash ? 'Saved' : 'Save'}
              </button>
              <button
                type="button"
                onClick={exportPdf}
                className="flex items-center gap-2 border border-primary text-primary font-label-md text-label-md px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors"
              >
                <Icon name="picture_as_pdf" className="text-[16px]" />
                Export PDF
              </button>
            </>
          )}
        </div>
      </header>

      <form id="roadmap-form" onSubmit={handleGenerate} className="glass-panel rounded-xl p-stack-md flex flex-col md:flex-row items-end gap-stack-md relative z-20" noValidate>
        <div className="flex-1 relative w-full">
          <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Target Role</label>
          <div className="relative">
            <Icon name="route" className="absolute left-4 top-7 text-outline z-10" />
            <Dropdown
              value={role}
              onChange={setRole}
              options={ROLE_OPTIONS}
              placeholder="e.g. Full Stack Developer"
              allowCustom
              className="pl-0"
            />
          </div>
        </div>
        <div className="w-full md:w-44">
          <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Duration</label>
          <Dropdown
            value={duration}
            onChange={setDuration}
            options={DURATIONS}
            placeholder="Select duration"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-on-primary font-label-md text-label-md px-8 py-3 rounded-lg hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(192,193,255,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Icon name="auto_awesome" className="text-sm" />
          {loading ? 'Generating...' : 'Generate Roadmap'}
        </button>
      </form>

      {error && (
        <div className="bg-error/10 border border-error/30 text-error rounded-xl p-4 font-body-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-8 space-y-stack-lg">
          {loading ? (
            <div className="bg-surface-card border border-border-subtle rounded-xl p-16 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin mb-4"></div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">AI is building your roadmap...</p>
            </div>
          ) : !roadmap ? (
            <div className="bg-surface-card border border-border-subtle rounded-xl p-16 flex flex-col items-center justify-center text-center">
              <Icon name="route" className="text-5xl text-outline mb-4" />
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">No roadmap yet</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 max-w-md">
                Enter a target role to generate a personalized roadmap with weekly milestones and guided checklists.
              </p>
              <button
                onClick={() => document.getElementById('roadmap-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className="flex items-center gap-2 bg-primary hover:bg-primary-fixed text-on-primary px-5 py-2.5 rounded-lg font-label-md font-bold transition-colors"
              >
                <Icon name="add" className="text-lg" /> Generate your roadmap
              </button>
            </div>
          ) : (
            items.map((item) => {
              const status = statusOf(item);
              const tasks = tasksOf(item)
                .map((t, idx) => ({ ...t, idx }))
                .filter((t) => t.text);
              return (
                <div key={item.id} className="roadmap-item relative pl-16">
                  <div className={`roadmap-line ${status === 'upcoming' ? 'roadmap-line-dashed' : ''} absolute top-0 left-0 w-12 h-full`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center relative z-10 ${DOT_CLASS[status]}`}>
                      {status === 'completed' && <Icon name="check_circle" className="text-success" />}
                      {status === 'inprogress' && <Icon name="play_arrow" />}
                      {status === 'upcoming' && <Icon name="lock" className="text-outline" />}
                    </div>
                  </div>
                  <div className={CARD_CLASS[status]}>
                    {status === 'inprogress' && (
                      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
                    )}
                    <div className="flex justify-between items-start mb-2 relative z-10">
                      <h3 className="font-headline-md text-headline-md text-on-surface">Week {item.week}: {item.title}</h3>
                      <span className={`px-2 py-1 ${BADGE_CLASS[status]}`}>{BADGE_LABEL[status]}</span>
                    </div>
                    {tasks.length > 0 && (
                      <div className="space-y-2 relative z-10">
                        {tasks.map((t) => {
                          if (status === 'completed') {
                            return (
                              <div key={t.key} className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded bg-success flex items-center justify-center shrink-0">
                                  <Icon name="check" className="text-[14px] text-surface-card" />
                                </div>
                                <span className="font-body-sm text-body-sm text-on-surface-variant line-through">{t.text}</span>
                              </div>
                            );
                          }
                          if (status === 'inprogress') {
                            return (
                              <label key={t.key} className="flex items-center gap-3 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={t.done}
                                  onChange={() => toggleTask(item, t.idx)}
                                  className="w-5 h-5 rounded border-outline bg-surface-dim checked:bg-primary checked:border-primary focus:ring-primary transition-all shrink-0 accent-primary"
                                />
                                <span className={`font-body-sm text-body-sm transition-colors ${
                                  t.done ? 'text-on-surface-variant line-through' : 'text-on-surface group-hover:text-primary'
                                }`}>
                                  {t.text}
                                </span>
                              </label>
                            );
                          }
                          return (
                            <div key={t.key} className="flex items-center gap-3">
                              <div className="w-5 h-5 border border-outline rounded shrink-0"></div>
                              <span className="font-body-sm text-body-sm text-on-surface-variant">{t.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="lg:col-span-4">
          <div className="bg-glass-bg backdrop-blur-xl border border-border-subtle rounded-xl p-stack-md sticky top-stack-md shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-3 mb-stack-md pb-4 border-b border-border-subtle">
              <div className="w-10 h-10 rounded bg-primary-container flex items-center justify-center">
                <Icon name="smart_toy" className="text-on-primary-container" />
              </div>
              <div>
                <h4 className="font-headline-md text-headline-md text-on-surface leading-tight">AI Guide</h4>
                <p className="font-label-md text-label-md text-primary">Context: Week {currentWeek}</p>
              </div>
            </div>
            <div className="space-y-4">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {roadmap
                  ? `Based on your goal to master ${currentTitle}, I've curated these resources for this week.`
                  : 'Generate a roadmap and I will curate resources tailored to your current week.'}
              </p>
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(`free online course ${searchTopic}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface-card border border-border-subtle rounded-lg p-3 hover:border-primary/50 hover:bg-surface-container transition-colors cursor-pointer group block"
              >
                <div className="flex gap-3">
                  <Icon name="menu_book" className="text-secondary mt-1" />
                  <div>
                    <h5 className="font-label-md text-label-md text-on-surface group-hover:text-secondary transition-colors">
                      {currentTitle} Concepts
                    </h5>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 text-xs">Article • 15 min read</p>
                  </div>
                </div>
              </a>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`video tutorial ${searchTopic}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface-card border border-border-subtle rounded-lg p-3 hover:border-primary/50 hover:bg-surface-container transition-colors cursor-pointer group block"
              >
                <div className="flex gap-3">
                  <Icon name="play_circle" className="text-tertiary mt-1" />
                  <div>
                    <h5 className="font-label-md text-label-md text-on-surface group-hover:text-tertiary transition-colors">
                      Practical Walkthrough
                    </h5>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 text-xs">Video • 45 min</p>
                  </div>
                </div>
              </a>
              <button
                type="button"
                onClick={discussWeek}
                className="w-full mt-4 py-2 border border-primary text-primary font-label-md text-label-md rounded-lg hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
              >
                <Icon name="chat" className="text-[18px]" />
                Discuss Week {currentWeek} Concepts
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoadmapPage;