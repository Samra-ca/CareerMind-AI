import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeSkillGap, getSkills, addRoadmapItem } from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import Dropdown from '../components/Dropdown';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const ROLE_OPTIONS = [
  'Software Engineer',
  'Machine Learning Engineer',
  'Data Scientist',
  'Frontend Developer',
  'Backend Developer',
  'DevOps Engineer',
  'Product Manager',
  'UI/UX Designer',
].map((r) => ({ value: r, label: r }));

const clamp = (n, min = 0, max = 100) => {
  const v = Number(n);
  if (Number.isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
};

const readinessLabel = (n) => {
  if (n >= 80) return 'Excellent alignment. You are a strong candidate for this target role.';
  if (n >= 60) return 'You are technically sound, but lack some specific modern requirements.';
  if (n >= 40) return 'Several key skills are missing. Prioritize closing the critical gaps below.';
  return 'Significant gaps remain. Start with the highest-impact moves in your action plan.';
};

const circumference = 2 * Math.PI * 40;

const SkillGapPage = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [currentSkills, setCurrentSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [activeReco, setActiveReco] = useState(null);

  useEffect(() => {
    getSkills()
      .then(({ data }) => setCurrentSkills(data.items.map((s) => s.name)))
      .catch(() => {});
  }, []);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!role.trim()) {
      setError('Please enter a target role.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await analyzeSkillGap(role.trim());
      setResult(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Analysis failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const readiness = clamp(result ? result.overall_readiness : 0);
  const offset = circumference - (readiness / 100) * circumference;
  const matched = result && Array.isArray(result.matched_skills) ? result.matched_skills : [];
  const gaps = result && Array.isArray(result.missing_skills) ? result.missing_skills : [];
  const recos = result && Array.isArray(result.recommendations) ? result.recommendations : [];
  const target = result ? result.role || role : role;

  const openReco = (i) =>
    setActiveReco({ index: i, kind: i % 2 === 0 ? 'Course' : 'Project' });

  const recetype = (i) => (i % 2 === 0 ? 'Course' : 'Project');

  const handleAddToRoadmap = async () => {
    const rec = recos[activeReco.index];
    if (!rec) return;
    setError('');
    const firstSentence = String(rec).split(/[.\n]/)[0].trim().slice(0, 255);
    try {
      await addRoadmapItem({
        title: firstSentence && firstSentence.length > 2 ? firstSentence : 'Roadmap milestone',
        description: String(rec),
        tasks: [{ text: String(rec), done: false }],
      });
      setActiveReco(null);
      navigate('/roadmap');
    } catch (err) {
      setActiveReco(null);
      setError(getErrorMessage(err, 'No roadmap found. Generate a roadmap first.'));
      navigate('/roadmap');
    }
  };

  return (
    <div className="flex-1 p-margin-mobile md:p-margin-desktop max-w-7xl mx-auto space-y-gutter pb-24">
      <section className="glass-panel rounded-xl p-stack-lg relative z-20">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary-container rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-stack-sm relative z-10">Define Your Target</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mb-stack-lg relative z-10 max-w-2xl">
          Enter the exact role you're aiming for. Our AI will analyze your current profile against thousands of successful candidates in that position.
        </p>
        <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-stack-md relative z-10" noValidate>
          <div className="flex-1 relative">
            <Dropdown
              value={role}
              onChange={setRole}
              options={ROLE_OPTIONS}
              placeholder="e.g. Senior Product Manager"
              allowCustom
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-on-primary font-label-md text-label-md px-8 py-3 rounded-lg hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(192,193,255,0.3)] hover:shadow-[0_0_25px_rgba(192,193,255,0.5)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Icon name="auto_awesome" className="text-sm" />
            {loading ? 'Analyzing...' : 'Analyze Gap'}
          </button>
        </form>
      </section>

      {error && (
        <div className="bg-error/10 border border-error/30 text-error rounded-xl p-4 font-body-sm">{error}</div>
      )}

      {loading ? (
        <div className="bg-surface-card border border-border-subtle rounded-xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin mb-4"></div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">AI is analyzing your skill gap against the target role...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="lg:col-span-4 bg-surface-card border border-border-subtle rounded-xl p-stack-lg flex flex-col items-center justify-center relative overflow-hidden">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-stack-md w-full text-left">Readiness Score</h3>
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" fill="none" r="40" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="8"></circle>
                <circle
                  className="gauge-circle"
                  cx="50"
                  cy="50"
                  fill="none"
                  r="40"
                  stroke="#c0c1ff"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  strokeWidth="8"
                  style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                ></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display-lg text-display-lg text-primary">
                  {result ? readiness : '--'}
                  {result && <span className="text-2xl">%</span>}
                </span>
                <span className="font-label-md text-label-md text-on-surface-variant mt-1">Match Rate</span>
              </div>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-center mt-stack-md">
              {result ? readinessLabel(readiness) : 'Run an analysis to see your overall match against the target role.'}
            </p>
          </div>

          <div className="lg:col-span-8 bg-surface-card border border-border-subtle rounded-xl p-stack-lg">
            <div className="flex justify-between items-center mb-stack-lg">
              <h3 className="font-headline-md text-headline-md text-on-surface">Skill Profile</h3>
              <span className="bg-surface-container-highest text-on-surface-variant font-mono-sm text-mono-sm px-3 py-1 rounded-full border border-border-subtle">
                vs. {target || 'Target Role'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              <div>
                <div className="flex items-center gap-2 mb-stack-sm pb-2 border-b border-border-subtle">
                  <Icon name="check_circle" className="text-success" />
                  <h4 className="font-body-lg text-body-lg text-on-surface">Matched Skills</h4>
                </div>
                {!result ? (
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-stack-md">
                    No analysis yet. Run a gap analysis to see which of your skills already align.
                  </p>
                ) : gaps.length === 0 && matched.length > 0 ? (
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-stack-md">No missing skills. Great job!</p>
                ) : matched.length === 0 ? (
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-stack-md">No matched skills found yet.</p>
                ) : (
                  <ul className="space-y-unit mt-stack-md">
                    {matched.map((s, i) => (
                      <li key={i} className="flex items-center justify-between p-2 rounded hover:bg-surface-container-high transition-colors">
                        <span className="font-body-sm text-body-sm text-on-surface">{s}</span>
                        <div className="w-16 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                          <div className="h-full bg-success w-full"></div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-stack-sm pb-2 border-b border-border-subtle">
                  <Icon name="error" className="text-warning" />
                  <h4 className="font-body-lg text-body-lg text-on-surface">Critical Gaps</h4>
                </div>
                {!result ? (
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-stack-md">
                    No analysis yet. Critical gaps will appear here once you analyze a target role.
                  </p>
                ) : gaps.length === 0 ? (
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-stack-md">Nothing critical to close right now.</p>
                ) : (
                  <ul className="space-y-unit mt-stack-md">
                    {gaps.map((s, i) => (
                      <li key={i} className="flex items-center justify-between p-2 rounded bg-error/10 border border-error/20">
                        <span className="font-body-sm text-body-sm text-on-surface">{s}</span>
                        <Icon name="priority_high" className="text-error text-sm" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-12 glass-panel rounded-xl p-stack-lg border-l-4 border-l-primary">
            <div className="flex items-center gap-stack-sm mb-stack-md">
              <Icon name="psychology" className="text-primary" />
              <h3 className="font-headline-md text-headline-md text-on-surface">AI Action Plan</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              {!result || recos.length === 0 ? (
                <div className="md:col-span-3 bg-surface-container-low border border-border-subtle rounded-lg p-stack-md flex flex-col items-center justify-center text-center py-10">
                  <Icon name="auto_awesome" className="text-4xl text-primary mb-3" />
                  <h4 className="font-body-lg text-body-lg text-on-surface mb-1">Your action plan is ready when you are</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Analyze a target role and AI will recommend curated steps to close your gaps.
                  </p>
                </div>
              ) : (
                recos.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => openReco(i)}
                    className="text-left bg-surface-container-low border border-border-subtle rounded-lg p-stack-md hover:border-primary/50 hover:bg-surface-container transition-colors cursor-pointer group animate-fade-in"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-primary-container/20 text-primary font-mono-sm text-mono-sm px-2 py-1 rounded">
                        {recetype(i)}
                      </span>
                      <Icon name="arrow_forward" className="text-on-surface-variant group-hover:text-primary transition-colors" />
                    </div>
                    <h4 className="font-body-lg text-body-lg text-on-surface mb-1">Recommendation {i + 1}</h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3">{r}</p>
                    <div className="mt-4 flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
                      <Icon name="schedule" className="text-[16px]" /> {i % 2 === 0 ? 'Focus Area' : 'High Impact'}
                    </div>
                  </button>
                ))
              )}
              <div className="bg-gradient-to-br from-surface-container-highest to-surface flex flex-col items-center justify-center p-stack-md rounded-lg border border-primary/30 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(192,193,255,0.1)_0%,transparent_70%)]"></div>
                <h4 className="font-body-lg text-body-lg text-on-surface mb-2 relative z-10">Ready to bridge the gap?</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 relative z-10">
                  Generate a step-by-step Kanban roadmap to track your progress.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/roadmap')}
                  className="bg-primary text-on-primary font-label-md text-label-md px-6 py-2 rounded-lg hover:bg-primary-fixed transition-colors w-full relative z-10 shadow-[0_0_10px_rgba(192,193,255,0.2)]"
                >
                  Start Roadmap
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeReco && recos[activeReco.index] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-gutter bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setActiveReco(null)}>
          <div
            className="bg-surface-card border border-border-subtle rounded-2xl w-full max-w-lg shadow-2xl p-stack-lg animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-container/20 border border-primary/30 flex items-center justify-center shrink-0">
                  <Icon name={activeReco.kind === 'Course' ? 'school' : 'build_circle'} className="text-primary text-xl" />
                </div>
                <div>
                  <span className="bg-primary-container/20 text-primary font-mono-sm text-mono-sm px-2 py-0.5 rounded">
                    {activeReco.kind}
                  </span>
                  <h3 className="font-label-lg text-label-lg text-on-surface mt-1">
                    Recommendation {activeReco.index + 1}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setActiveReco(null)}
                title="Close"
                className="p-1.5 text-outline hover:text-on-surface rounded-md hover:bg-surface-variant transition-colors"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>

            <div className="bg-surface-container-low border border-border-subtle rounded-xl p-4 mb-6">
              <h4 className="font-label-md text-label-md text-on-surface uppercase tracking-wider mb-2 flex items-center gap-2">
                <Icon name="lightbulb" className="text-warning" /> What to do
              </h4>
              <p className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-wrap">
                {recos[activeReco.index]}
              </p>
            </div>

            <div className="bg-surface-container-low border border-border-subtle rounded-xl p-4 mb-6">
              <h4 className="font-label-md text-label-md text-on-surface uppercase tracking-wider mb-3 flex items-center gap-2">
                <Icon name="flag" className="text-secondary" /> How to get there
              </h4>
              <ul className="space-y-2.5">
                {[
                  'Dedicate 10–15 focused hours per week to this area.',
                  'Apply it immediately with a small hands-on project.',
                  'Track progress weekly in your roadmap to stay consistent.',
                ].map((tip, ti) => (
                  <li key={ti} className="flex items-start gap-2.5 font-body-sm text-body-sm text-on-surface-variant">
                    <Icon name={activeReco.kind === 'Course' ? 'check_circle' : 'flag'} className={`text-sm shrink-0 ${activeReco.kind === 'Course' ? 'text-success' : 'text-secondary'}`} />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {activeReco.kind === 'Course' ? (
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(
                  `free online course ${recos[activeReco.index].split(/[.\n]/)[0]}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-primary text-on-primary font-label-md text-label-md px-4 py-2.5 rounded-lg hover:bg-primary-fixed transition-colors shadow-[0_0_15px_rgba(192,193,255,0.3)]"
              >
                <Icon name="search" className="text-base" /> Find a Course
              </a>
            ) : (
              <button
                type="button"
                onClick={handleAddToRoadmap}
                className="flex items-center justify-center gap-2 w-full bg-primary text-on-primary font-label-md text-label-md px-4 py-2.5 rounded-lg hover:bg-primary-fixed transition-colors shadow-[0_0_15px_rgba(192,193,255,0.3)]"
              >
                <Icon name="map" className="text-base" /> Add to Roadmap
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillGapPage;