import { useEffect, useState } from 'react';
import Dropdown from '../components/Dropdown';
import { getSalaryInsights } from '../utils/api';
import { getErrorMessage } from '../utils/errors';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const num = (n) => {
  const v = Number(n);
  return isNaN(v) ? null : v;
};

const money = (n, currency) => {
  const v = num(n);
  if (v === null) return '\u2014';
  return `${currency || ''} ${v.toLocaleString()}`;
};

const shortMoney = (n, currency) => {
  const v = num(n);
  if (v == null) return '\u2014';
  const symbol = currency === 'PKR' ? 'Rs' : '$';
  if (v >= 1000) return `${symbol}${(v / 1000).toFixed(v >= 100000 ? 0 : 1)}k`;
  return `${symbol}${v.toLocaleString()}`;
};

const LEVEL_LABEL = {
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
};

const demandColor = (pct) => {
  const v = num(pct) || 0;
  if (v >= 85) return 'bg-warning';
  if (v >= 70) return 'bg-success';
  return 'bg-primary';
};

const ROLE_OPTIONS = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Scientist',
  'Data Analyst',
  'Machine Learning Engineer',
  'DevOps Engineer',
  'Cloud Engineer',
  'Android Developer',
  'iOS Developer',
  'Product Manager',
  'UX Designer',
  'UI Designer',
  'QA Engineer',
  'Cybersecurity Analyst',
  'Network Engineer',
  'Project Manager',
  'Business Analyst',
  'HR Manager',
  'Marketing Manager',
  'Digital Marketing Specialist',
  'Content Writer',
  'Accountant',
  'Financial Analyst',
  'Sales Executive',
  'Customer Support',
  'Graphic Designer',
  'Technical Writer',
  'Scrum Master',
  'System Administrator',
  'Database Administrator',
].map((r) => ({ value: r, label: r }));

const LOCATION_OPTIONS = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Hyderabad',
  'Gujranwala',
  'Sialkot',
  'Dubai',
  'Abu Dhabi',
  'Riyadh',
  'Jeddah',
  'Doha',
  'Kuwait City',
  'London',
  'Berlin',
  'Austin',
  'New York',
  'San Francisco',
  'Toronto',
  'Sydney',
  'Singapore',
].map((l) => ({ value: l, label: l }));

const jobLink = (site, company, role, location) => {
  const q = encodeURIComponent(`${company} ${role}`);
  const loc = encodeURIComponent(location);
  const kw = encodeURIComponent(role);
  switch (site) {
    case 'linkedin':
      return `https://www.linkedin.com/jobs/search/?keywords=${kw}&location=${loc}&f_C=${encodeURIComponent(company)}`;
    case 'indeed':
      return `https://www.indeed.com/jobs?q=${q}&l=${loc}`;
    case 'glassdoor':
      return `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${q}`;
    case 'google':
      return `https://www.google.com/search?q=${encodeURIComponent(`${company} ${role} jobs ${location}`)}&ibp=htl;jobs`;
    case 'company':
      return `https://www.google.com/search?q=${encodeURIComponent(`${company} careers`)}`;
    default:
      return '#';
  }
};

const companyLinks = (company, role, location) => [
  {
    label: 'LinkedIn',
    icon: 'work',
    href: jobLink('linkedin', company, role, location),
  },
  {
    label: 'Indeed',
    icon: 'search',
    href: jobLink('indeed', company, role, location),
  },
  {
    label: 'Glassdoor',
    icon: 'assistant_navigation',
    href: jobLink('glassdoor', company, role, location),
  },
];

const SalaryPage = () => {
  const [role, setRole] = useState('Software Engineer');
  const [location, setLocation] = useState('Lahore');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (r = role, l = location) => {
    if (!r.trim() || !l.trim()) {
      setError('Select both a role and a location.');
      return;
    }
    setLoading(true);
    setError('');
    setRole(r.trim());
    setLocation(l.trim());
    try {
      const { data } = await getSalaryInsights(r.trim(), l.trim());
      setData(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch salary insights.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const junior = data?.junior ?? data?.levels?.junior ?? {};
  const mid = data?.mid ?? data?.levels?.mid ?? {};
  const senior = data?.senior ?? data?.levels?.senior ?? {};
  const juniorMin = num(junior.min ?? data?.junior_min) ?? 0;
  const juniorMax = num(junior.max ?? data?.junior_max) ?? juniorMin;
  const midMin = num(mid.min ?? data?.mid_min) ?? juniorMin;
  const midMax = num(mid.max ?? data?.mid_max) ?? senior?.max ?? midMin + 1;
  const seniorMin = num(senior.min ?? data?.senior_min) ?? midMax;
  const seniorMax = num(senior.max ?? data?.senior_max) ?? seniorMin;
  const rangeMin = Math.min(juniorMin, midMin, seniorMin);
  const rangeMax = Math.max(juniorMax, midMax, seniorMax);
  const median =
    num(data?.median ?? data?.market_median ?? mid?.median ?? mid?.avg) ??
    Math.round((rangeMin + rangeMax) / 2);
  const currency = data?.currency || 'USD';
  const yoy = data?.yoy_change ?? data?.yoy_change_pct ?? data?.salary_surge ?? null;
  const demandPct = num(data?.demand_percent) ?? 0;
  const demandTxt = data?.market_demand || 'Medium';
  const demandDesc = data?.demand_description || '';
  const trend = data?.trend_note || '';
  const skillsDemand = data?.skills_demand ?? data?.demand ?? data?.skills ?? [];
  const companies = data?.top_companies ?? data?.companies ?? data?.hiring_activity ?? [];
  const notes = data?.notes ?? data?.analysis ?? data?.strategist_notes ?? [];

const pct = (v) => {
  const n = num(v);
  if (n == null || !rangeMax || rangeMax <= rangeMin) return 50;
  return Math.max(0, Math.min(100, ((n - rangeMin) / (rangeMax - rangeMin)) * 100));
};
const medPct = pct(median);
const juniorPct = pct((juniorMin + juniorMax) / 2);
const seniorPct = pct((seniorMin + seniorMax) / 2);
const leftPos = Math.min(juniorPct, seniorPct) - 4;
const rightPos = 100 - Math.max(juniorPct, seniorPct) - 4;

return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-[1600px] w-full mx-auto flex flex-col gap-stack-lg">
      <section className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-stack-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Salary Insights &amp; Market Trends</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Real-time compensation data and market demand metrics to optimize your negotiation strategy.
          </p>
        </div>
        <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-2 bg-surface-card border border-border-subtle rounded-xl p-2 shadow-lg">
          <div className="flex-1 min-w-[200px]">
            <Dropdown
              value={role}
              onChange={setRole}
              options={ROLE_OPTIONS}
              placeholder="Select role..."
              searchable
              allowCustom
              customLabel="Use this role"
            />
          </div>
          <div className="w-px bg-border-subtle hidden sm:block mx-1"></div>
          <div className="flex-1 min-w-[150px]">
            <Dropdown
              value={location}
              onChange={setLocation}
              options={LOCATION_OPTIONS}
              placeholder="Select location..."
              searchable
              allowCustom
              customLabel="Use this location"
            />
          </div>
          <button
            type="button"
            onClick={() => handleSearch(role, location)}
            disabled={loading}
            className="bg-primary text-on-primary font-label-md text-label-md px-6 py-2 rounded-lg hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            Analyze
            <Icon name="trending_up" className="text-sm" />
          </button>
        </div>
      </section>

      {error && (
        <div className="bg-error/10 border border-error/30 text-error rounded-xl p-4 font-body-sm">{error}</div>
      )}

      {loading && (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="animate-pulse text-on-surface-variant font-label-md">Researching market...</div>
        </div>
      )}

      {data && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="col-span-1 lg:col-span-8 flex flex-col gap-gutter">
            <div className="bg-surface-card border border-border-subtle rounded-xl p-6 relative overflow-hidden flex flex-col">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface">Base Salary Range</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded bg-surface-container-high border border-border-subtle font-mono-sm text-mono-sm text-on-surface-variant">{currency}</span>
                    <span className="font-body-sm text-body-sm text-success flex items-center">
                      <Icon name="arrow_upward" className="text-xs mr-1" />
                      {yoy != null ? `${yoy > 0 ? '+' : ''}${yoy}% YoY` : 'YoY trend'}
                    </span>
                  </div>
                  <p className="font-mono-sm text-mono-sm text-on-surface-variant mt-2">
                    {role} &middot; {location}
                  </p>
                </div>
                <button type="button" className="p-2 rounded-lg hover:bg-surface-variant transition-colors border border-transparent hover:border-border-subtle text-on-surface-variant">
                  <Icon name="more_horiz" className="text-[20px]" />
                </button>
              </div>

              <div className="flex-1 flex flex-col justify-center relative z-10 py-4">
                <div className="flex flex-col items-center justify-center mb-10">
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest mb-1">Market Median</span>
                  <div className="font-display-lg text-display-lg text-primary font-bold tracking-tight">{money(median, currency)}</div>
                  <div className="font-label-md text-label-md text-on-surface-variant mt-1">
                    Range: {shortMoney(rangeMin, currency)} — {shortMoney(rangeMax, currency)}
                  </div>
                </div>

                <div className="relative w-full h-24 mt-4">
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-surface-container-highest -translate-y-1/2 rounded-full"></div>
                  <div
                    className={`absolute top-1/2 h-2 bg-gradient-to-r from-secondary-container via-primary to-tertiary-container -translate-y-1/2 rounded-full shadow-[0_0_10px_rgba(192,193,255,0.3)]`}
                    style={{ left: `${leftPos}%`, width: `${Math.max(0, 100 - leftPos - rightPos)}%` }}
                  ></div>
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center" style={{ left: `${medPct}%` }}>
                    <div className="w-1 h-6 bg-white rounded-full shadow-md z-10"></div>
                  </div>
                  <div className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${juniorPct}%` }}>
                    <span className="block font-label-md text-label-md text-on-surface-variant mb-1">Junior</span>
                    <span className="block font-mono-sm text-mono-sm text-on-surface">{shortMoney((juniorMin + juniorMax) / 2, currency)}</span>
                  </div>
                  <div className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${seniorPct}%` }}>
                    <span className="block font-label-md text-label-md text-on-surface-variant mb-1">Senior</span>
                    <span className="block font-mono-sm text-mono-sm text-on-surface">{shortMoney((seniorMin + seniorMax) / 2, currency)}</span>
                  </div>
                  <div className="absolute bottom-0 -translate-x-1/2 text-center mt-2" style={{ left: `${medPct}%` }}>
                    <span className="block font-mono-sm text-mono-sm text-primary-fixed bg-primary-container/20 px-2 py-1 rounded border border-primary/30">Target</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-border-subtle relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary-container/20 border border-secondary-container/30 flex items-center justify-center">
                    <Icon name="monetization_on" className="text-secondary text-sm" />
                  </div>
                  <div>
                    <div className="font-label-md text-label-md text-on-surface-variant">Market Demand</div>
                    <div className="font-body-lg text-body-lg text-on-surface font-semibold">{demandTxt} {demandPct ? `· ${demandPct}%` : ''}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-tertiary-container/20 border border-tertiary-container/30 flex items-center justify-center">
                    <Icon name="show_chart" className="text-tertiary text-sm" />
                  </div>
                  <div>
                    <div className="font-label-md text-label-md text-on-surface-variant">Trend</div>
                    <div className="font-body-lg text-body-lg text-on-surface font-semibold">{trend || (yoy != null ? `${yoy > 0 ? '+' : ''}${yoy}% YoY` : 'Stable')}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface-card border border-border-subtle rounded-xl p-6">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-6 flex items-center gap-2">
                <Icon name="local_fire_department" className="text-warning" />
                Skill Demand Heatmap
              </h3>
              {skillsDemand.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8">
                  <Icon name="psychology" className="text-5xl text-outline mb-4" />
                  <p className="font-body-sm text-body-sm text-on-surface-variant">No skill demand data available for this role.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {skillsDemand.map((s, i) => {
                    const name = typeof s === 'string' ? s : s.name;
                    const pct = num(s.demand ?? s.level ?? s.pct ?? s.value) || 50;
                    const label = typeof s === 'string' ? '' : s.label || s.level_label || (pct >= 85 ? 'Very High' : pct >= 70 ? 'High' : 'Moderate');
                    return (
                      <div key={name || i} className="bg-surface-container p-4 rounded-lg border border-border-subtle flex flex-col items-center text-center gap-2 hover:border-primary/50 transition-colors">
                        <div className="w-full bg-surface-dim h-1.5 rounded-full overflow-hidden mb-1">
                          <div className={`${demandColor(pct)} h-full`} style={{ width: `${Math.max(4, pct)}%` }}></div>
                        </div>
                        <span className="font-label-md text-label-md text-on-surface">{name}</span>
                        {label && <span className="font-mono-sm text-mono-sm text-on-surface-variant text-xs">{label}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-1 lg:col-span-4 flex flex-col gap-gutter">
            <div className="glass-panel rounded-xl p-6 flex flex-col relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50 pointer-events-none"></div>
              <div className="flex items-center gap-2 mb-4 relative z-10">
                <Icon name="auto_awesome" className="text-primary" />
                <h3 className="font-headline-md text-headline-md text-on-surface">AI Strategist Notes</h3>
              </div>
              <div className="space-y-4 relative z-10 font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                {notes.length === 0 ? (
                  <p className="p-3 bg-surface-dim/50 rounded border border-border-subtle/50">
                    <strong className="text-on-surface font-semibold block mb-1">Market Snapshot:</strong>
                    Use the salary range above to anchor your negotiation for the {role} role in {location}.
                  </p>
                ) : (
                  notes.map((n, i) => {
                    const text = typeof n === 'string' ? n : n.text || n.note;
                    const title = typeof n === 'string' ? null : n.title || n.label;
                    return (
                      <p key={i} className="p-3 bg-surface-dim/50 rounded border border-border-subtle/50">
                        {title && <strong className="text-on-surface font-semibold block mb-1">{title}:</strong>}
                        {text}
                      </p>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-surface-card border border-border-subtle rounded-xl p-6 flex-1">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-4">Top Hiring Activity</h3>
              <p className="font-label-md text-label-md text-on-surface-variant mb-4 uppercase tracking-widest text-xs">Active Employers &middot; {location}</p>
              {companies.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8">
                  <Icon name="groups" className="text-5xl text-outline mb-4" />
                  <p className="font-body-sm text-body-sm text-on-surface-variant">No hiring activity found for this market.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {companies.map((c, i) => {
                    const name = typeof c === 'string' ? c : c.name || c.company;
                    const roles = typeof c === 'string' ? null : c.roles ?? c.open_roles ?? c.count;
                    const initial = name ? String(name).charAt(0).toUpperCase() : '?';
                    const links = companyLinks(name, role, location);
                    return (
                      <div key={name || i} className="p-3 rounded-lg bg-surface-container/50 border border-border-subtle">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded bg-surface-dim flex items-center justify-center text-on-surface font-mono-sm border border-border-subtle shrink-0">{initial}</div>
                            <div className="min-w-0">
                              <div className="font-label-md text-label-md text-on-surface truncate">{name}</div>
                              {roles != null && <div className="font-mono-sm text-mono-sm text-on-surface-variant text-xs">{roles} open roles</div>}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={links[0].href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-w-[70px] px-2.5 py-1.5 rounded-lg bg-surface-dim border border-border-subtle text-primary font-label-md text-label-md hover:bg-primary/10 hover:border-primary/40 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Icon name={links[0].icon} className="text-[14px]" /> {links[0].label}
                          </a>
                          <a
                            href={links[1].href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-w-[70px] px-2.5 py-1.5 rounded-lg bg-surface-dim border border-border-subtle text-on-surface font-label-md text-label-md hover:bg-surface-variant hover:border-border-subtle transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Icon name={links[1].icon} className="text-[14px]" /> {links[1].label}
                          </a>
                          <a
                            href={links[2].href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-w-[70px] px-2.5 py-1.5 rounded-lg bg-surface-dim border border-border-subtle text-on-surface font-label-md text-label-md hover:bg-surface-variant hover:border-border-subtle transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Icon name={links[2].icon} className="text-[14px]" /> {links[2].label}
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(`${role} jobs ${location}`)}&ibp=htl;jobs`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 bg-surface-container-highest border border-border-subtle rounded-lg text-on-surface font-label-md text-label-md hover:bg-surface-bright transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="search" className="text-[16px]" /> Search {role} Jobs in {location}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryPage;
