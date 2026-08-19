import { useState } from 'react';
import { getJobRecommendations } from '../utils/api';
import { getErrorMessage } from '../utils/errors';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const MATCH_STYLE = {
  high: 'text-success border-success/30 bg-success/10',
  mid: 'text-warning border-warning/30 bg-warning/10',
  low: 'text-on-surface-variant border-border-subtle bg-surface-container-highest',
};

const MATCH_DOT = {
  high: 'bg-success',
  mid: 'bg-warning',
  low: 'bg-outline',
};

const MATCH_BAR = {
  high: 'from-success to-primary',
  mid: 'from-warning to-primary',
  low: 'from-outline to-primary',
};

const scoreBand = (score) => (score >= 80 ? 'high' : score >= 50 ? 'mid' : 'low');

const FILTERS = [
  { value: 0, label: 'All matches' },
  { value: 50, label: '50%+' },
  { value: 60, label: '60%+' },
  { value: 70, label: '70%+' },
  { value: 80, label: '80%+' },
];

const JobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState(0);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getJobRecommendations();
      setJobs(data.jobs || []);
      setGenerated(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to get recommendations.'));
    } finally {
      setLoading(false);
    }
  };

  const filtered = jobs.filter((j) => j.match_score >= filter);
  const highCount = filtered.filter((j) => j.match_score >= 80).length;
  const midCount = filtered.filter((j) => j.match_score >= 50 && j.match_score < 80).length;

  return (
    <div className="flex-1 p-margin-mobile md:p-margin-desktop max-w-7xl mx-auto space-y-gutter pb-24">
      <section className="glass-panel rounded-xl p-stack-lg relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-72 h-72 bg-primary-container rounded-full blur-[110px] opacity-20 pointer-events-none"></div>
        <div className="absolute -left-16 -bottom-24 w-64 h-64 bg-secondary-container rounded-full blur-[110px] opacity-10 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-stack-lg">
          <div className="flex-1">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-stack-sm flex items-center gap-2">
              <Icon name="work" className="text-primary" /> Job Recommendations
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Our AI matches your skills, experience and career goals against real roles,
              surfacing the opportunities where you best fit and the gaps to close.
            </p>
          </div>
          {!loading && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="bg-primary text-on-primary font-label-md text-label-md px-6 py-3 rounded-lg hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(192,193,255,0.3)] whitespace-nowrap self-start disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Icon name={jobs.length > 0 ? 'refresh' : 'auto_awesome'} className="text-sm" />
              {jobs.length > 0 ? 'Refresh Recommendations' : 'Get Recommendations'}
            </button>
          )}
        </div>
      </section>

      {error && (
        <div className="bg-error/10 border border-error/30 text-error rounded-xl p-4 font-body-sm">{error}</div>
      )}

      {loading ? (
        <div className="bg-surface-card border border-border-subtle rounded-xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin mb-4"></div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">AI is matching you with the best roles...</p>
        </div>
      ) : !generated ? (
        <div className="bg-surface-card border border-border-subtle rounded-xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-container/20 flex items-center justify-center mb-4">
            <Icon name="search" className="text-4xl text-primary" />
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-1">Discover your best-fit roles</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mb-5">
            Generate AI-matched job recommendations based on your skills, experience and career goals.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            className="bg-inverse-primary text-white font-label-md text-label-md px-8 py-3 rounded-lg hover:bg-primary-container transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(73,75,214,0.4)]"
          >
            <Icon name="auto_awesome" className="text-sm" /> Generate Recommendations
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-card border border-border-subtle rounded-xl p-16 flex flex-col items-center justify-center text-center">
          <Icon name="filter_list_off" className="text-5xl text-outline mb-3" />
          <h3 className="font-headline-md text-headline-md text-on-surface mb-1">No matches at this threshold</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
            Try lowering the minimum match filter to see more roles.
          </p>
          <button
            type="button"
            onClick={() => setFilter(0)}
            className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-fixed transition-colors"
          >
            Show All Matches
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-stack-md">
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={`px-4 py-2 rounded-full font-label-md text-label-md border transition-colors ${
                    filter === f.value
                      ? 'bg-primary text-on-primary border-primary shadow-[0_0_10px_rgba(192,193,255,0.3)]'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface border-border-subtle'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <span className="text-on-surface-variant font-mono-sm text-mono-sm ml-2">
                {filtered.length} {filtered.length === 1 ? 'role' : 'roles'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm">
                <span className="w-2.5 h-2.5 rounded-sm bg-success"></span> Strong
                <b className="text-success ml-1">{highCount}</b>
              </span>
              <span className="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm">
                <span className="w-2.5 h-2.5 rounded-sm bg-warning"></span> Possible
                <b className="text-warning ml-1">{midCount}</b>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-gutter">
            {filtered.map((job, i) => {
              const band = scoreBand(job.match_score);
              const score = Math.round(Number(job.match_score) || 0);
              return (
                <div key={i} className="bg-surface-card border border-border-subtle rounded-xl overflow-hidden flex flex-col group hover:border-primary/40 transition-colors">
                  <div className="p-stack-lg flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-surface-container-highest border border-border-subtle flex items-center justify-center flex-shrink-0">
                          <Icon name={job.company ? 'business' : 'work'} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-body-lg text-body-lg font-semibold text-on-surface line-clamp-1">{job.title}</h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">{job.company}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full font-mono-sm text-mono-sm border flex-shrink-0 ${MATCH_STYLE[band]}`}>
                        {score}%
                      </span>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5 text-label-md text-label-md text-on-surface-variant">
                          <span className={`w-2 h-2 rounded-full ${MATCH_DOT[band]}`}></span> Match score
                        </span>
                        <span className="text-mono-sm text-mono-sm text-on-surface-variant">vs. your profile</span>
                      </div>
                      <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${MATCH_BAR[band]}`}
                          style={{ width: `${score}%` }}
                        ></div>
                      </div>
                    </div>

                    {job.description && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 line-clamp-3">{job.description}</p>
                    )}

                    <div className="mt-auto">
                      <div className="flex items-center gap-2 mb-3 pt-3 border-t border-border-subtle text-label-md text-label-md text-on-surface-variant">
                        <Icon name="schedule" className="text-lg" />
                        <span>Apply in: <strong className="text-primary">{job.timeline_to_apply}</strong></span>
                      </div>

                      {job.missing_skills && job.missing_skills.length > 0 && (
                        <div className="bg-surface-container-low border border-border-subtle rounded-lg p-stack-md">
                          <p className="text-label-md text-label-md text-warning flex items-center gap-1.5 mb-2">
                            <Icon name="bolt" className="text-[16px]" /> Skills to strengthen
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {job.missing_skills.map((s, j) => (
                              <span
                                key={j}
                                className={`px-2 py-1 rounded-md font-body-sm text-body-sm bg-surface-container border border-border-subtle text-outline ${
                                  j < 3 ? 'text-warning border-warning/20 bg-warning/10' : ''
                                }`}
                              >
                                {j < 3 ? <Icon name="add" className="text-[14px] align-text-bottom inline mr-1" /> : null}
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="bg-gradient-to-br from-surface-container-highest to-surface flex flex-col items-center justify-center p-stack-lg rounded-xl border border-primary/30 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(192,193,255,0.1)_0%,transparent_70%)]"></div>
              <div className="w-12 h-12 mb-3 bg-primary-container/20 rounded-xl flex items-center justify-center relative z-10">
                <Icon name="auto_awesome" className="text-2xl text-primary" />
              </div>
              <h4 className="font-body-lg text-body-lg text-on-surface mb-2 relative z-10">Want even better matches?</h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 relative z-10">
                Strengthen your profile so your match scores climb higher.
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                className="bg-primary text-on-primary font-label-md text-label-md px-6 py-2.5 rounded-lg hover:bg-primary-fixed transition-colors w-full relative z-10 shadow-[0_0_10px_rgba(192,193,255,0.2)] flex items-center justify-center gap-2"
              >
                <Icon name="refresh" className="text-sm" /> Refresh Matches
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default JobsPage;