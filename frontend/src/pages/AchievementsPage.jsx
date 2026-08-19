import { useEffect, useState } from 'react';
import { getAchievements } from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import AchievementCelebration from '../components/AchievementCelebration';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const TYPE_ICON = {
  resume: 'description',
  interview: 'record_voice_over',
  skill: 'psychology',
  goal: 'emoji_events',
  application: 'work_outline',
  chat: 'forum',
  roadmap: 'route',
};

const relativeTime = (iso) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
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

const streakProgress = (streak) => {
  const TIER = 7;
  const nextTier = Math.max(TIER, Math.ceil((streak + 1) / TIER) * TIER);
  const pct = Math.max(0, Math.min(100, ((streak % TIER) / TIER) * 100));
  return { pct, daysToNext: nextTier - streak };
};

const AchievementsPage = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [celebrate, setCelebrate] = useState([]);

  useEffect(() => {
    getAchievements()
      .then(({ data }) => {
        setData(data);
        if (data.newly_awarded?.length) setCelebrate(data.newly_awarded);
      })
      .catch((err) => setError(getErrorMessage(err, 'Failed to load achievements.')));
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
        <div className="animate-pulse text-on-surface-variant font-label-md">Loading achievements...</div>
      </div>
    );
  }

  const streak = data.streak || 0;
  const badges = data.achievements || [];
  const earnedCount = badges.filter((a) => a.earned || a.unlocked || a.awarded).length;
  const activity = data.activities || data.activity || [];

  const { pct: streakPct, daysToNext } = streakProgress(streak);

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-7xl mx-auto space-y-gutter">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-stack-md">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface mb-unit">Achievements</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Track your career milestones and daily momentum.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        <div className="col-span-1 md:col-span-4 lg:col-span-3 pro-card rounded-xl p-stack-lg flex flex-col items-center justify-center text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-error/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <Icon name="local_fire_department" className="text-5xl text-error mb-stack-sm relative z-10 drop-shadow-md" />
          <div className="font-headline-lg text-headline-lg text-on-surface relative z-10">{streak} Days</div>
          <div className="font-label-md text-label-md text-on-surface-variant mt-unit relative z-10 uppercase tracking-widest">Active Streak</div>
          <div className="w-full bg-surface-container-highest h-1 rounded-full mt-stack-md relative z-10 overflow-hidden">
            <div
              className="bg-error h-full rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] transition-[width] duration-500"
              style={{ width: `${streakPct}%` }}
            ></div>
          </div>
          <div className="font-mono-sm text-mono-sm text-on-surface-variant mt-2 relative z-10">
            {daysToNext > 0 ? `${daysToNext} days to next tier` : 'Next tier unlocked'}
          </div>
        </div>

        <div className="col-span-1 md:col-span-8 lg:col-span-9 pro-card rounded-xl p-stack-lg">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-stack-md flex items-center gap-2">
            <Icon name="workspace_premium" className="text-primary" />
            Badge Collection
          </h3>
          {badges.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10">
              <Icon name="workspace_premium" className="text-5xl text-outline mb-4" />
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                No badges yet. Complete career milestones to earn your first badge.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-stack-md">
              {badges.map((a) => {
                const unlocked = !!(a.earned || a.unlocked || a.awarded);
                if (unlocked) {
                  return (
                    <div
                      key={a.key}
                      className="flex flex-col items-center p-stack-sm rounded-lg bg-surface-container-low border border-primary/30 hover:border-primary transition-colors cursor-pointer group"
                    >
                      <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <span className="text-3xl">{a.badge || '🏆'}</span>
                      </div>
                      <span className="font-label-md text-label-md text-on-surface text-center">{a.title}</span>
                      <span className="font-mono-sm text-mono-sm text-success mt-1">Unlocked</span>
                    </div>
                  );
                }
                return (
                  <div
                    key={a.key}
                    className="flex flex-col items-center p-stack-sm rounded-lg bg-surface-container-lowest border border-border-subtle opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-not-allowed"
                  >
                    <div className="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center mb-2 relative">
                      {a.progress > 0 && a.progress < 100 ? (
                        <Icon name="pending" className="text-3xl text-on-surface-variant" />
                      ) : (
                        <Icon name="stars" className="text-3xl text-on-surface-variant" />
                      )}
                      <span className="material-symbols-outlined text-sm text-on-surface absolute -bottom-1 -right-1 bg-surface-card rounded-full p-0.5 border border-border-subtle">lock</span>
                    </div>
                    <span className="font-label-md text-label-md text-on-surface-variant text-center">{a.title}</span>
                    {a.progress > 0 && a.progress < 100 ? (
                      <span className="font-mono-sm text-mono-sm text-on-surface-variant mt-1">{a.progress}%</span>
                    ) : (
                      <span className="font-mono-sm text-mono-sm text-on-surface-variant mt-1">Locked</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="pro-card rounded-xl p-stack-lg">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-stack-md flex items-center gap-2">
          <Icon name="history" className="text-primary" />
          Activity History
        </h3>
        {activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-10">
            <Icon name="history" className="text-5xl text-outline mb-4" />
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Your recent achievements and milestones will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activity.map((item, i) => (
              <div
                key={item.id || i}
                className="flex items-start gap-4 p-4 rounded-lg bg-surface-container-low border border-border-subtle hover:bg-surface-container transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon name={TYPE_ICON[item.type] || 'task_alt'} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-label-md text-label-md text-on-surface mb-1">{item.title || item.text || 'New Milestone'}</h4>
                  {item.description && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{item.description}</p>
                  )}
                </div>
                <span className="font-mono-sm text-mono-sm text-on-surface-variant whitespace-nowrap">
                  {relativeTime(item.at || item.time || item.date)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {celebrate.length > 0 && (
        <AchievementCelebration achievements={celebrate} onClose={() => setCelebrate([])} />
      )}
    </div>
  );
};

export default AchievementsPage;