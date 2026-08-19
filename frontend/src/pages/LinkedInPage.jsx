import { useEffect, useRef, useState } from 'react';
import {
  analyzeLinkedin,
  analyzeLinkedinFile,
  deleteLinkedinAnalysis,
  getLinkedinAnalyses,
} from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import Dropdown from '../components/Dropdown';
import ConfirmDialog from '../components/ConfirmDialog';

const ROLE_OPTIONS = [
  'Senior Product Manager',
  'Product Manager',
  'UX Designer',
  'UI/UX Designer',
  'Data Scientist',
  'Machine Learning Engineer',
  'Software Engineer',
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'DevOps Engineer',
].map((r) => ({ value: r, label: r }));

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const scoreLabel = (score) => {
  if (score >= 70) return 'Good';
  if (score >= 40) return 'Needs Work';
  return 'Needs Attention';
};

const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

const esc = (s) =>
  String(s == null ? '' : s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

const LinkedInPage = () => {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [history, setHistory] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileRef = useRef(null);

  const loadHistory = async () => {
    try {
      const { data } = await getLinkedinAnalyses();
      setHistory(data.items || []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async () => {
    if (confirmDelete == null) return;
    try {
      await deleteLinkedinAnalysis(confirmDelete);
      setHistory((h) => h.filter((x) => x.id !== confirmDelete));
      if (result?.id === confirmDelete) setResult(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Delete failed.'));
    } finally {
      setConfirmDelete(null);
    }
  };

  const exportPdf = () => {
    if (!result) return;
    const item = (arr, emptyHint) =>
      Array.isArray(arr) && arr.length > 0
        ? `${arr.map((s) => `<li>${esc(s)}</li>`).join('')}`
        : `<li class="muted">${esc(emptyHint)}</li>`;
    const date = new Date().toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>LinkedIn Profile Audit</title><style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #1a1a2e; margin: 40px; }
      h1 { margin: 0 0 4px; font-size: 26px; }
      .sub { color: #6b7089; margin-bottom: 20px; font-size: 14px; }
      .score { display: flex; align-items: center; gap: 14px; margin-bottom: 26px; padding: 16px 18px; background: #f1f2ff; border-radius: 10px; }
      .score .num { font-size: 34px; font-weight: 800; color: #3a3a6b; }
      .badge { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; }
      .badge.good { background: #d8f5e6; color: #1c7a4a; }
      .badge.warn { background: #fdeeca; color: #a06a00; }
      .badge.bad { background: #fde2e2; color: #b3261e; }
      .section { margin-bottom: 24px; }
      .section h2 { font-size: 16px; color: #2b2b45; border-left: 4px solid #c0c1ff; padding-left: 10px; margin: 0 0 8px; }
      .section ul { list-style: none; margin: 0; padding: 0; }
      .section li { padding: 4px 0; font-size: 14px; color: #3c3c55; }
      .section li::before { content: '\\2022'; color: #c0c1ff; font-weight: 700; display: inline-block; width: 18px; }
      .section li.muted { color: #9a9ab0; }
      .section p { font-size: 14px; color: #3c3c55; line-height: 1.5; }
      .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e3e3f0; font-size: 12px; color: #9a9ab0; }
      @media print { body { margin: 0; } }
    </style></head><body>
      <h1>LinkedIn Profile Audit</h1>
      <div class="sub">CareerMind.AI &bull; Generated ${esc(date)}</div>
      <div class="score">
        <div class="num">${esc(score)}</div>
        <div><div>Completeness Score</div><div class="badge ${score >= 70 ? 'good' : score >= 40 ? 'warn' : 'bad'}">${esc(scoreLabel(score))}</div></div>
      </div>
      ${result?.summary ? `<div class="section"><h2>Summary</h2><p>${esc(result.summary)}</p></div>` : ''}
      <div class="section"><h2>Present Sections</h2><ul>${item(result?.present_sections, 'None detected')}</ul></div>
      <div class="section"><h2>Missing Sections</h2><ul>${item(result?.missing_sections, 'None missing')}</ul></div>
      <div class="section"><h2>Headline Suggestions</h2><ul>${item(result?.headline_suggestions, 'No suggestions')}</ul></div>
      <div class="section"><h2>Keyword Improvements</h2><ul>${item(result?.keyword_improvements, 'No keyword improvements')}</ul></div>
      <div class="section"><h2>Strengths</h2><ul>${item(result?.strengths, 'No strengths listed')}</ul></div>
      <div class="footer">Generated by CareerMind.AI</div>
    </body></html>`;
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) {
      setError('Please allow pop-ups to export the audit as PDF.');
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

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const okExt = /\.(pdf|doc|docx|txt)$/i.test(f.name);
    const okType = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(f.type);
    if (!okExt && !okType) {
      setError('Only PDF, Word or TXT files are allowed.');
      setFileName('');
      return;
    }
    setError('');
    setFileName(f.name);
  };

  const handleFileAnalyze = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) {
      setError('Please choose a PDF, Word or TXT file first.');
      return;
    }
    setFileLoading(true);
    setError('');
    try {
      const { data } = await analyzeLinkedinFile(f);
      setResult(data);
      await loadHistory();
    } catch (err) {
      setError(getErrorMessage(err, 'Analysis failed.'));
    } finally {
      setFileLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (text.trim().length < 10) {
      setError('Please paste your LinkedIn profile text first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await analyzeLinkedin(text);
      setResult(data);
      await loadHistory();
    } catch (err) {
      setError(getErrorMessage(err, 'Analysis failed.'));
    } finally {
      setLoading(false);
    }
  };

  const score = typeof result?.completeness_score === 'number' ? result.completeness_score : 0;
  const missingSections = result?.missing_sections || [];
  const missingKeywords = result?.missing_keywords || result?.keyword_improvements || missingSections;
  const headlineSuggestions = result?.headline_suggestions || [];
  const keywords = result?.keyword_improvements || [];
  const improvementsSuggestions = result?.improvements || result?.strengths || [];

  const impactMetrics = result?.impact_metrics != null
    ? result.impact_metrics
    : clamp(100 - missingSections.length * 20, 0, 100);

  const metricBars = result?.breakdown?.length
    ? result.breakdown.map((b) => ({
        label: b.label,
        value: b.value,
        color: b.color || 'bg-warning',
      }))
    : [
        { label: 'Keyword Match', value: score, color: 'bg-warning' },
        { label: 'Impact Metrics', value: impactMetrics, color: 'bg-success' },
      ];

  const insightCards = [];
  headlineSuggestions.forEach((s, i) => {
    insightCards.push({
      key: `headline-${i}`,
      icon: 'edit_note',
      iconStyle: 'bg-error/10 text-error',
      title: 'Rewrite LinkedIn Headline',
      body: s,
      cta: 'Apply to text',
      ctaIcon: 'arrow_forward',
    });
  });
  keywords.forEach((k, i) => {
    insightCards.push({
      key: `keyword-${i}`,
      icon: 'trending_up',
      iconStyle: 'bg-tertiary-container/10 text-tertiary-container',
      title: 'Add High-Impact Keyword',
      body: `Incorporate "${k}" across your About and Experience sections.`,
      cta: 'View in Resume',
      ctaIcon: 'open_in_new',
    });
  });
  improvementsSuggestions.slice(0, 4).forEach((s, i) => {
    insightCards.push({
      key: `imp-${i}`,
      icon: 'auto_awesome',
      iconStyle: 'bg-primary-container/10 text-primary-container',
      title: 'AI Strategic Improvement',
      body: s,
      cta: 'Apply to text',
      ctaIcon: 'arrow_forward',
    });
  });

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-[1400px] mx-auto space-y-gutter">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-stack-md">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface mb-unit">Audit Suite</h2>
          <p className="font-body-lg text-body-lg text-outline max-w-2xl">
            Upload your LinkedIn profile file or paste your profile text to get a real-time AI audit.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-stack-md bg-surface-card p-2 rounded-xl border border-border-subtle">
            <span className="font-label-md text-label-md text-on-surface-variant px-2">Target Role:</span>
            <Dropdown
              value={targetRole}
              onChange={setTargetRole}
              options={ROLE_OPTIONS}
              placeholder="Select target role"
              allowCustom
              className="w-48"
            />
          </div>
          {result && (
            <button
              type="button"
              onClick={exportPdf}
              className="flex items-center gap-2 border border-primary text-primary font-label-md text-label-md px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors bg-surface-card"
            >
              <Icon name="picture_as_pdf" className="text-[16px]" />
              Export PDF
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="bg-error/10 border border-error/30 text-error rounded-xl p-stack-md font-body-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        <div className="md:col-span-8 flex flex-col gap-gutter">
          <section className="bg-surface-card border border-border-subtle rounded-xl p-stack-md flex flex-col h-56 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                <Icon name="upload_file" className="text-primary" />
                LinkedIn Document
              </h3>
              {fileName && (
                <span className="font-label-md text-label-md text-success bg-success/10 px-2 py-1 rounded-full border border-success/20 flex items-center gap-1">
                  <Icon name="check_circle" className="text-[14px]" />
                  Ready to analyze
                </span>
              )}
            </div>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex-1 border-2 border-dashed border-primary/30 rounded-lg bg-surface-dim/50 flex flex-col items-center justify-center relative z-10 transition-colors group-hover:border-primary/60 cursor-pointer"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
              />
              {fileName ? (
                <div className="flex items-center gap-stack-md bg-surface-card px-4 py-3 rounded-lg border border-border-subtle shadow-sm">
                  <div className="w-10 h-10 bg-error/10 rounded flex items-center justify-center text-error">
                    <Icon name="picture_as_pdf" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-body-md text-body-md text-on-surface font-medium">{fileName}</span>
                    <span className="font-label-md text-label-md text-outline">Click to replace file</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFileName('');
                      if (fileRef.current) fileRef.current.value = '';
                    }}
                    className="ml-4 text-outline hover:text-error transition-colors p-1"
                  >
                    <Icon name="delete" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
                    <Icon name="upload_file" className="text-2xl" />
                  </div>
                  <p className="font-label-md text-label-md text-primary/70">Click to choose a PDF, Word or TXT file</p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleFileAnalyze}
              disabled={fileLoading}
              className="mt-stack-md bg-primary text-on-primary rounded-lg px-5 py-2 font-label-md text-label-md self-end hover:bg-primary-fixed transition-colors flex items-center gap-2 disabled:opacity-50 z-10"
            >
              <Icon name="auto_awesome" className="text-sm" />
              {fileLoading ? 'Analyzing...' : 'Upload & Analyze'}
            </button>
          </section>

          <section className="bg-surface-card border border-border-subtle rounded-xl p-stack-md flex flex-col relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                <Icon name="account_circle" className="text-[#0077b5]" />
                LinkedIn Profile Extract
              </h3>
              <span className="font-label-md text-label-md text-outline flex items-center gap-1">
                <Icon name="sync" className="text-[16px]" /> Paste profile text
              </span>
            </div>
            <textarea
              className="w-full h-52 bg-surface-dim border border-border-subtle rounded-xl p-4 font-mono-sm text-mono-sm text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none custom-scrollbar"
              placeholder="Paste your About section and recent experience here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex items-center justify-between mt-stack-md pt-stack-md border-t border-border-subtle">
              <span className="font-mono-sm text-mono-sm text-outline">{text.length} chars</span>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading}
                className="bg-primary hover:bg-primary-fixed text-on-primary font-label-md text-label-md px-6 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(192,193,255,0.2)] hover:shadow-[0_0_20px_rgba(192,193,255,0.4)] disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Analyze Profile'}
                <Icon name="send" className="text-sm" />
              </button>
            </div>
          </section>
        </div>

        <div className="md:col-span-4 flex flex-col gap-gutter">
          <section className="glass-panel rounded-xl p-stack-md relative overflow-hidden flex flex-col items-center justify-center py-8">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 rounded-full blur-[40px] pointer-events-none"></div>
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <h3 className="font-body-md text-body-md text-on-surface-variant uppercase tracking-wider font-semibold">Match Score</h3>
              {result && (
                <span className={`font-label-md text-label-md ${score >= 70 ? 'text-success' : score >= 40 ? 'text-warning' : 'text-error'}`}>{scoreLabel(score)}</span>
              )}
            </div>
            <div className="relative w-40 h-40 mt-2">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-surface-container-highest"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  className={`${score >= 70 ? 'text-primary' : score >= 40 ? 'text-warning' : 'text-error'} transition-all duration-1000`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                  strokeDasharray={`${score}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display-lg text-display-lg text-on-surface leading-none">{result ? score : '—'}</span>
                {result && <span className="font-label-md text-label-md text-outline mt-1">/100</span>}
              </div>
            </div>
            <div className="w-full mt-6 space-y-3">
              {metricBars.map((b) => (
                <div key={b.label} className="flex items-center justify-between">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">{b.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className={`h-full ${b.color}`} style={{ width: `${clamp(b.value)}%` }}></div>
                    </div>
                    <span className="font-mono-sm text-mono-sm text-on-surface w-8 text-right">{clamp(b.value)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-surface-card border border-border-subtle rounded-xl p-stack-md flex-1">
            <h3 className="font-body-sm text-body-sm text-outline uppercase tracking-wider font-semibold mb-4 flex items-center justify-between">
              Critical Missing Keywords
              <Icon name="warning" className="text-[16px] text-warning" />
            </h3>
            {missingKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {missingKeywords.map((k, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-surface-container border border-border-subtle rounded-md font-mono-sm text-mono-sm text-on-surface-variant hover:border-warning/50 hover:text-warning cursor-default transition-colors"
                  >
                    {k}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Icon name="verified_user" className="text-4xl text-success mb-2" />
                <p className="font-body-sm text-body-sm text-on-surface-variant">No critical keywords detected.</p>
              </div>
            )}
          </section>
        </div>

        <div className="md:col-span-12">
          <section className="bg-surface-card border border-border-subtle rounded-xl p-stack-md">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
              <Icon name="auto_awesome" className="text-tertiary-container" />
              AI Strategic Improvements
            </h3>
            {insightCards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
                {insightCards.map((c) => (
                  <div key={c.key} className="bg-surface-container border border-border-subtle rounded-lg p-4 hover:border-primary/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${c.iconStyle}`}>
                        <Icon name={c.icon} className="text-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-body-md text-body-md font-semibold text-on-surface mb-1">{c.title}</h4>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">{c.body}</p>
                        <button type="button" className="text-label-md font-label-md text-primary hover:text-primary-fixed flex items-center gap-1">
                          {c.cta}
                          <Icon name={c.ctaIcon} className="text-[14px]" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Icon name="auto_awesome" className="text-5xl text-outline mb-3" />
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Paste your profile text or upload a file to see AI improvement suggestions.
                </p>
                <p className="font-label-md text-label-md text-primary mt-2">No analysis yet</p>
              </div>
            )}
          </section>
        </div>

        {result?.extracted_text && (
          <div className="md:col-span-12">
            <details className="bg-surface-card border border-border-subtle rounded-xl p-stack-md">
              <summary className="font-headline-md text-headline-md text-on-surface cursor-pointer flex items-center gap-2">
                <Icon name="description" className="text-secondary" />
                Extracted Text
              </summary>
              <pre className="mt-4 bg-surface-container border border-border-subtle rounded-lg p-4 font-mono-sm text-mono-sm text-on-surface-variant overflow-x-auto whitespace-pre-wrap">
                {result.extracted_text}
              </pre>
            </details>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <section className="bg-surface-card border border-border-subtle rounded-xl p-stack-md">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
            <Icon name="history" className="text-primary" /> Audit History
            <span className="bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded-md font-mono-sm text-mono-sm ml-1">{history.length}</span>
          </h3>
          <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex-shrink-0 bg-surface-container-low border border-border-subtle rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => {
                    setResult(h);
                    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left w-full px-4 py-3"
                >
                  <span className="block font-body-sm text-body-sm text-on-surface">{h.source_name || 'LinkedIn profile'}</span>
                  <span className="font-label-md text-label-md text-on-surface-variant">
                    {h.created_at?.slice(0, 10)} · {h.completeness_score || 0}/100
                  </span>
                </button>
                <div className="px-2 pb-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(h.id)}
                    className="text-label-md text-label-md text-outline hover:text-error transition-colors flex items-center gap-1 px-2 py-1 rounded"
                  >
                    <Icon name="delete" className="text-[14px]" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={confirmDelete != null}
        title="Delete audit record?"
        message="This will permanently delete this LinkedIn audit. This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default LinkedInPage;