import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getAchievements, getDashboardData } from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import AchievementCelebration from '../components/AchievementCelebration';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const TYPE_ICON = {
  application: 'work_outline',
  skill: 'psychology',
  goal: 'emoji_events',
  chat: 'forum',
  resume: 'description',
  interview: 'record_voice_over',
  roadmap: 'route',
  achievement: 'workspace_premium',
};

const TYPE_STYLE = {
  application: 'bg-secondary-container/20 text-secondary-container',
  skill: 'bg-primary-container/20 text-primary',
  goal: 'bg-warning/20 text-warning',
  chat: 'bg-tertiary-container/20 text-tertiary',
  resume: 'bg-success/20 text-success',
  interview: 'bg-secondary-container/20 text-secondary-container',
  roadmap: 'bg-primary-container/20 text-primary',
  achievement: 'bg-warning/20 text-warning',
};

const PIE_COLORS = {
  wishlist: '#c0c1ff',
  applied: '#89ceff',
  interview: '#10b981',
  offer: '#f59e0b',
  rejected: '#ef4444',
};

const GOAL_BAR_COLORS = ['bg-primary', 'bg-secondary', 'bg-tertiary-container', 'bg-warning', 'bg-success', 'bg-error'];

const relativeTime = (iso) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const monthShort = (d) => {
  const dt = new Date(d);
  return isNaN(dt) ? d : dt.toLocaleDateString(undefined, { month: 'short' });
};

const LineChartCard = ({ data }) => {
  const points = (data || []).filter((p) => p && typeof p.value === 'number');
  const n = points.length;
  const path =
    n > 1
      ? points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i / (n - 1)) * 100},${100 - p.value}`).join(' ')
      : '';
  return (
    <div className="md:col-span-8 surface-card rounded-xl p-stack-md flex flex-col h-[400px]">
      <div className="flex justify-between items-center mb-stack-md">
        <h3 className="font-headline-md text-headline-md text-on-surface">Skill Proficiency</h3>
        <span className="bg-surface-container-high border border-border-subtle rounded-md text-label-md text-on-surface py-1 px-2">
          Last 6 Months
        </span>
      </div>
      {n > 1 ? (
        <div className="flex-1 relative w-full h-full border-b border-l border-border-subtle">
          <div className="absolute bottom-0 left-0 w-full flex justify-between px-2 text-label-md text-on-surface-variant translate-y-5">
            {points.map((p, i) => (
              <span key={i}>{monthShort(p.date)}</span>
            ))}
          </div>
          <div className="absolute top-0 left-0 h-full flex flex-col justify-between py-2 text-label-md text-on-surface-variant -translate-x-8 text-right w-6">
            <span>100</span>
            <span>75</span>
            <span>50</span>
            <span>25</span>
            <span>0</span>
          </div>
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <line stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" x1="0" x2="100" y1="25" y2="25" />
            <line stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" x1="0" x2="100" y1="50" y2="50" />
            <line stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" x1="0" x2="100" y1="75" y2="75" />
            <path className="opacity-80" d={path} fill="none" stroke="#c0c1ff" strokeWidth="2" />
            {points.map((p, i) => (
              <circle
                key={i}
                cx={(i / (n - 1)) * 100}
                cy={100 - p.value}
                r="1.2"
                fill="#c0c1ff"
              />
            ))}
          </svg>
          <div className="absolute top-4 right-4 flex gap-4 text-label-md">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-primary inline-block"></span>Avg Score
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Icon name="show_chart" className="text-5xl text-outline mb-4" />
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Add skills and check in weekly to see your proficiency trend.
          </p>
          <p className="font-label-md text-label-md text-primary mt-2">No data yet</p>
        </div>
      )}
    </div>
  );
};

const PipelineCard = ({ breakdown }) => {
  const total = (breakdown || []).reduce((s, b) => s + (b.value || 0), 0);
  let cum = 0;
  return (
    <div className="md:col-span-4 surface-card rounded-xl p-stack-md flex flex-col h-[400px]">
      <h3 className="font-headline-md text-headline-md text-on-surface mb-stack-md">Application Pipeline</h3>
      {total > 0 ? (
        <>
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <svg className="donut" height="200" viewBox="0 0 42 42" width="200">
              <circle
                cx="21"
                cy="21"
                fill="transparent"
                r="15.91549430918954"
                stroke="#1f2a3c"
                strokeWidth="6"
              />
              {breakdown.map((b, i) => {
                const offset = 25 - cum;
                cum += b.value;
                return (
                  <circle
                    key={b.key}
                    cx="21"
                    cy="21"
                    fill="transparent"
                    r="15.91549430918954"
                    stroke={PIE_COLORS[b.key] || '#908fa0'}
                    strokeDasharray={`${b.value} ${100 - b.value}`}
                    strokeDashoffset={offset}
                    strokeWidth="6"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-display-lg font-bold text-on-surface">{total}</span>
              <span className="font-label-md text-label-md text-on-surface-variant">Total</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 text-label-md">
            {breakdown.map((b) => (
              <div key={b.key} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded" style={{ background: PIE_COLORS[b.key] || '#908fa0' }}></span>
                {b.name} ({b.value})
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Icon name="view_kanban" className="text-5xl text-outline mb-4" />
          <p className="font-body-sm text-body-sm text-on-surface-variant">No applications tracked yet.</p>
        </div>
      )}
    </div>
  );
};

const MilestoneCard = ({ goals, onAdd }) => {
  return (
    <div className="md:col-span-4 glass-panel rounded-xl p-stack-md flex flex-col">
      <h3 className="font-headline-md text-headline-md text-on-surface mb-stack-md">Milestone Progress</h3>
      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <Icon name="emoji_events" className="text-5xl text-outline mb-4" />
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-3">No goals yet. Set one to start tracking.</p>
          <button onClick={onAdd} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary-fixed transition-colors">
            Add Goal
          </button>
        </div>
      ) : (
        <div className="flex flex-col justify-around flex-1 gap-4">
          {goals.map((g, i) => (
            <div key={g.id} className="space-y-1">
              <div className="flex justify-between font-label-md text-label-md text-on-surface">
                <span className="truncate pr-2">{g.title}</span>
                <span>{g.progress}%</span>
              </div>
              <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                <div
                  className={`h-full ${GOAL_BAR_COLORS[i % GOAL_BAR_COLORS.length]} rounded-full shadow-[0_0_8px_rgba(192,193,255,0.8)]`}
                  style={{ width: `${g.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ActivityCard = ({ activities }) => {
  return (
    <div className="md:col-span-4 surface-card rounded-xl p-stack-md flex flex-col h-[300px] overflow-hidden">
      <h3 className="font-headline-md text-headline-md text-on-surface mb-stack-md">Recent Activity</h3>
      {activities.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Icon name="history" className="text-4xl text-outline mb-3" />
          <p className="font-body-sm text-body-sm text-on-surface-variant">No recent activity yet.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
          {activities.map((a, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${TYPE_STYLE[a.type] || 'bg-surface-bright text-on-surface-variant'}`}>
                  <Icon name={TYPE_ICON[a.type] || 'circle'} className="text-sm" />
                </div>
                {i < activities.length - 1 && <div className="w-px flex-1 bg-border-subtle my-1"></div>}
              </div>
              <div className="pb-4 min-w-0">
                <p className="font-body-sm text-body-sm text-on-surface">{a.text}</p>
                <p className="font-label-md text-label-md text-on-surface-variant">{relativeTime(a.at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [streak, setStreak] = useState(0);
  const [celebrate, setCelebrate] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardData()
      .then(({ data }) => setData(data))
      .catch((err) => setError(getErrorMessage(err, 'Failed to load dashboard')));
    getAchievements()
      .then(({ data }) => {
        setStreak(data.streak);
        if (data.newly_awarded?.length) setCelebrate(data.newly_awarded);
      })
      .catch(() => {});
  }, []);

  if (error) {
    return (
      <div className="p-margin-mobile md:p-margin-desktop max-w-7xl mx-auto">
        <div className="bg-error/10 border border-error/30 text-error rounded-xl p-4 font-body-sm">{error}</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-on-surface-variant font-label-md">Loading analytics...</div>
      </div>
    );
  }

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';
  const primaryGoal = data.goal_progress?.[0] || null;
  const goalPct = primaryGoal ? Math.max(5, Math.min(100, primaryGoal.progress)) : 68;

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-7xl mx-auto space-y-gutter">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-stack-md">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface mb-unit">
            Welcome back, {firstName}.
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Here is an overview of your career progression today.
          </p>
        </div>
        <div className="glass-panel p-stack-md rounded-xl flex items-center gap-stack-md">
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase">Current Goal</span>
            <button
              onClick={() => navigate('/goals')}
              className="font-headline-md text-headline-md text-primary font-bold text-left hover:underline"
            >
              {primaryGoal ? primaryGoal.title : 'Set a Goal'}
            </button>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-surface-container flex items-center justify-center relative">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-surface-container"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="text-primary"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeDasharray={`${goalPct}, 100`}
                strokeWidth="3"
              />
            </svg>
            <span className="font-label-md text-label-md text-on-surface">{goalPct}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        <LineChartCard data={data.skill_timeline} />
        <PipelineCard breakdown={data.app_breakdown} />
        <MilestoneCard goals={data.goal_progress || []} onAdd={() => navigate('/goals')} />
        <ActivityCard activities={data.activities || []} />
        <div className="md:col-span-4 flex flex-col gap-gutter">
          <div className="glass-panel rounded-xl p-stack-md flex items-center justify-between">
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant uppercase">Current Streak</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display-lg font-bold text-on-surface">{streak}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Days</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400">
              <Icon name="local_fire_department" className="text-3xl" />
            </div>
          </div>
          <div className="surface-card rounded-xl p-stack-md border-l-4 border-l-secondary-container flex-1">
            <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-2">AI Career Strategist</p>
            <h4 className="font-headline-md text-headline-md text-on-surface">Ready to take the next step?</h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 mb-4">
              Ask about skill gaps, interview prep, or salary negotiation.
            </p>
            <button
              onClick={() => navigate('/chat')}
              className="w-full bg-primary text-on-primary rounded-lg py-2 font-label-md hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="forum" className="text-sm" /> Start Chatting
            </button>
          </div>
        </div>
      </div>

      {celebrate.length > 0 && (
        <AchievementCelebration achievements={celebrate} onClose={() => setCelebrate([])} />
      )}
    </div>
  );
};

export default DashboardPage;