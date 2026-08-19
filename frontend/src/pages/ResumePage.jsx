import { useState, useRef, useEffect } from 'react';
import {
  analyzeResume,
  analyzeLinkedin,
  deleteResumeAnalysis,
  getResumeAnalyses,
  uploadResume,
} from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import Dropdown from '../components/Dropdown';
import ConfirmDialog from '../components/ConfirmDialog';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const clamp = (n, min = 0, max = 100) => {
  const v = Number(n);
  if (Number.isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
};

const scoreLabel = (s) => {
  if (s == null) return 'Not analyzed';
  if (s >= 80) return 'Excellent';
  if (s >= 60) return 'Good';
  if (s >= 40) return 'Fair';
  return 'Needs Work';
};

const scoreAccent = (s) => {
  if (s == null) return 'text-on-surface-variant';
  if (s >= 80) return 'text-success';
  if (s >= 60) return 'text-primary';
  return 'text-warning';
};

const scoreBar = (s) => {
  if (s == null) return 'bg-surface-container-highest';
  if (s >= 80) return 'bg-gradient-to-r from-success to-primary';
  if (s >= 60) return 'bg-gradient-to-r from-primary to-secondary';
  return 'bg-gradient-to-r from-warning to-error';
};

const SECTION_MARKERS = [
  'summary',
  'objective',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'achievements',
  'publications',
  'volunteer',
  'interests',
  'languages',
  'references',
];

const detectSections = (text) => {
  if (!text) return [];
  const lower = String(text).toLowerCase();
  return SECTION_MARKERS.filter((m) => new RegExp(`\\b${m.replace(/s(?=$)/, '(s)?')}\\b`).test(lower));
};

const ROLE_OPTIONS = [
  'Software Engineer',
  'Machine Learning Engineer',
  'Data Scientist',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Product Manager',
  'UI/UX Designer',
].map((r) => ({ value: r, label: r }));

const ResumePage = () => {
  const [mode, setMode] = useState('upload');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [linkedinText, setLinkedinText] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [targetRole, setTargetRole] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileRef = useRef(null);

  const loadHistory = async () => {
    try {
      const { data } = await getResumeAnalyses();
      setHistory(data.items || []);
    } catch {
      setHistory([]);
    }
  };

  const handleDeleteHistory = async () => {
    if (confirmDelete == null) return;
    try {
      await deleteResumeAnalysis(confirmDelete);
      setHistory((h) => h.filter((x) => x.id !== confirmDelete));
      setPreview((p) => (p && p.id === confirmDelete ? null : p));
    } catch (err) {
      setError(getErrorMessage(err, 'Delete failed.'));
    } finally {
      setConfirmDelete(null);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are allowed.');
      setFile(null);
      return;
    }
    setError('');
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await uploadResume(file);
      setPreview(data);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await loadHistory();
    } catch (err) {
      setError(getErrorMessage(err, 'Upload failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!preview || !targetRole.trim()) return;
    setAnalyzing(true);
    setError('');
    try {
      const { data } = await analyzeResume(preview.id, targetRole.trim());
      setPreview(data);
      await loadHistory();
    } catch (err) {
      setError(getErrorMessage(err, 'Analysis failed.'));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLinkedin = async () => {
    if (!linkedinText.trim()) return;
    setLinkedinLoading(true);
    setError('');
    try {
      const { data } = await analyzeLinkedin(linkedinText);
      setPreview({
        id: null,
        filename: data.extracted_text ? 'Pasted profile' : 'Pasted profile',
        resume_content: linkedinText,
        analysis_summary: data.summary || '',
        score: data.completeness_score,
        missing_keywords: data.keyword_improvements || [],
        improvements: [
          ...(data.missing_sections || []).map((s) => `Add missing section: ${s}`),
          ...(data.headline_suggestions || []),
          ...(data.keyword_improvements || []),
        ],
        strengths: data.strengths || [],
        sections: data.present_sections || [],
      });
      await loadHistory();
    } catch (err) {
      setError(getErrorMessage(err, 'LinkedIn analysis failed.'));
    } finally {
      setLinkedinLoading(false);
    }
  };

  const score = preview && preview.score != null ? clamp(preview.score) : null;
  const keywordMatch = score != null ? score : 0;
  const impact = score != null ? clamp(score + 15) : 0;
  const keywords = preview && Array.isArray(preview.missing_keywords) ? preview.missing_keywords : [];
  const improvements =
    preview && Array.isArray(preview.improvements) && preview.improvements.length > 0
      ? preview.improvements
      : [];
  const summary = preview ? preview.analysis_summary : '';
  const charCount = preview?.resume_content?.length || 0;
  const sectionsFound = preview
    ? Array.isArray(preview.sections) && preview.sections.length > 0
      ? preview.sections.length
      : detectSections(preview.resume_content || '').length
    : 0;
  const filename = preview?.filename || '';

  const stats = [
    { label: 'Documents Parsed', value: history.length, icon: 'description', tint: 'text-primary bg-primary-container/20' },
    { label: 'Keywords Found', value: keywords.length === 0 ? '—' : keywords.length, icon: 'key', tint: 'text-warning bg-warning/10' },
    { label: 'Sections Detected', value: sectionsFound || '—', icon: 'dashboard_customize', tint: 'text-secondary bg-secondary-container/20' },
    { label: 'Est. Read Time', value: charCount ? `${Math.max(1, Math.round(charCount / 400))}m` : '—', icon: 'schedule', tint: 'text-tertiary bg-tertiary-container/20' },
  ];

  const tabCls = (m) =>
    m === mode
      ? 'bg-primary text-on-primary'
      : 'text-on-surface-variant hover:text-on-surface';

  return (
    <div className="flex-1 p-margin-mobile md:p-margin-desktop max-w-[1400px] mx-auto space-y-gutter pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-stack-md relative z-30">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface mb-unit flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-error/10 border border-error/20 flex items-center justify-center text-error">
              <Icon name="description" />
            </span>
            Resume Audit Suite
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            Upload your PDF resume or paste profile text and get an ATS-style audit against your target role.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-surface-card p-2 rounded-xl border border-border-subtle">
          <span className="font-label-md text-label-md text-on-surface-variant px-2 flex items-center gap-1 shrink-0">
            <Icon name="track_changes" className="text-[16px] text-primary" /> Target Role:
          </span>
          <div className="w-64">
            <Dropdown
              value={targetRole}
              onChange={setTargetRole}
              options={ROLE_OPTIONS}
              placeholder="e.g. Machine Learning Engineer"
              allowCustom
            />
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-error/10 border border-error/30 text-error rounded-xl p-stack-md font-body-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-7 flex flex-col gap-gutter">
          <section className="bg-surface-card border border-border-subtle rounded-xl p-stack-md flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-error/5 to-transparent pointer-events-none"></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 relative z-10">
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                <Icon name={mode === 'upload' ? 'upload_file' : 'content_paste'} className="text-error" />
                Source Document
              </h3>
              <div className="inline-flex bg-surface-container rounded-lg p-1 border border-border-subtle">
                <button
                  type="button"
                  onClick={() => setMode('upload')}
                  className={`px-4 py-1.5 rounded-md font-label-md text-label-md transition-colors flex items-center gap-1.5 ${tabCls('upload')}`}
                >
                  <Icon name="picture_as_pdf" className="text-[15px]" /> PDF Resume
                </button>
                <button
                  type="button"
                  onClick={() => setMode('paste')}
                  className={`px-4 py-1.5 rounded-md font-label-md text-label-md transition-colors flex items-center gap-1.5 ${tabCls('paste')}`}
                >
                  <Icon name="content_paste" className="text-[15px]" /> Profile Text
                </button>
              </div>
            </div>

            {mode === 'upload' ? (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 min-h-[130px] border-2 border-dashed border-error/30 rounded-lg bg-surface-dim/50 flex flex-col items-center justify-center relative z-10 transition-colors hover:border-error/60 cursor-pointer group"
                >
                  <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileChange} />
                  {file ? (
                    <div className="flex items-center gap-4 bg-surface-card px-4 py-3 rounded-lg border border-border-subtle shadow-sm">
                      <div className="w-10 h-10 bg-error/10 rounded flex items-center justify-center text-error">
                        <Icon name="picture_as_pdf" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="font-body-sm text-body-sm text-on-surface font-medium">{file.name}</span>
                        <span className="font-label-md text-label-md text-on-surface-variant">
                          {(file.size / (1024 * 1024)).toFixed(1)} MB • Ready to parse
                        </span>
                      </div>
                      <span className="ml-4 text-on-surface-variant hover:text-error transition-colors p-1">
                        <Icon name="delete" />
                      </span>
                    </div>
                  ) : preview && !file ? (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <Icon name="task_alt" className="text-3xl text-success" />
                      <span className="font-body-sm text-body-sm text-on-surface">{filename || preview.filename}</span>
                      <span className="font-label-md text-label-md text-primary/70">Click or drag to replace file</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <div className="w-14 h-14 rounded-full bg-error/10 border border-error/20 flex items-center justify-center text-error mb-1 group-hover:scale-110 transition-transform">
                        <Icon name="upload_file" className="text-2xl" />
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface">Drop your resume PDF here</span>
                      <span className="font-label-md text-label-md text-error/60">Click or drag to upload</span>
                    </div>
                  )}
                </button>

                <div className="mt-stack-md flex items-center justify-between gap-stack-md relative z-10">
                  <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
                    <Icon name="info" className="text-[15px] text-outline" />
                    PDFs are parsed locally and never stored publicly
                  </div>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={loading || !file}
                    className="bg-primary text-on-primary font-label-md text-label-md px-8 py-3 rounded-lg hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(192,193,255,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Icon name="upload_file" className="text-sm" />
                    {loading ? 'Parsing PDF...' : 'Upload & Extract'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <textarea
                  value={linkedinText}
                  onChange={(e) => setLinkedinText(e.target.value)}
                  placeholder="Paste your resume or LinkedIn About section and recent experience here..."
                  className="w-full h-56 bg-surface-dim border border-border-subtle rounded-xl p-4 font-mono-sm text-mono-sm text-on-surface placeholder:text-outline-variant focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none custom-scrollbar"
                />
                <div className="mt-stack-md flex items-center justify-between gap-stack-md">
                  <span className="font-mono-sm text-mono-sm text-outline">{linkedinText.length} chars</span>
                  <button
                    type="button"
                    onClick={handleLinkedin}
                    disabled={linkedinLoading || linkedinText.trim().length < 10}
                    className="bg-primary text-on-primary font-label-md text-label-md px-8 py-3 rounded-lg hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(192,193,255,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Icon name="auto_awesome" className="text-sm" />
                    {linkedinLoading ? 'Analyzing...' : 'Analyze Profile'}
                  </button>
                </div>
              </>
            )}
          </section>

          {preview && mode === 'upload' && (
            <section className="bg-surface-card border border-border-subtle rounded-xl p-stack-md">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
                <Icon name="gavel" className="text-primary" /> ATS Readiness Checklist
              </h3>
              <div className="flex items-center gap-stack-md">
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Keyword density against target role</span>
                    <span className={`font-mono-sm text-mono-sm ${scoreAccent(score)}`}>{score != null ? `${score}%` : '—'}</span>
                  </div>
                  <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${scoreBar(score)} transition-all duration-1000`} style={{ width: `${score != null ? score : 0}%` }}></div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing || !targetRole.trim()}
                  className="bg-inverse-primary text-white font-label-md text-label-md px-6 py-3 rounded-lg hover:bg-primary-container transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50 shadow-[0_0_15px_rgba(73,75,214,0.3)]"
                >
                  <Icon name="auto_awesome" className="text-sm" />
                  {analyzing ? 'Analyzing...' : 'Analyze vs. Role'}
                </button>
              </div>
            </section>
          )}

          <section className="bg-surface-card border border-border-subtle rounded-xl p-stack-md">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
              <Icon name="auto_awesome" className="text-tertiary-container" />
              AI Strategic Improvements
            </h3>
            {!preview ? (
              <div className="bg-surface-container-low border border-border-subtle rounded-lg p-8 flex flex-col items-center justify-center text-center">
                <Icon name="tips_and_updates" className="text-4xl text-primary mb-3" />
                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
                  Upload a resume or paste profile text to unlock tailored improvement recommendations.
                </p>
              </div>
            ) : improvements.length === 0 && !summary ? (
              <div className="bg-surface-container-low border border-border-subtle rounded-lg p-8 flex flex-col items-center justify-center text-center">
                <Icon name="check_circle" className="text-4xl text-success mb-3" />
                <p className="font-body-sm text-body-sm text-on-surface-variant">No improvement suggestions right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
                {improvements.length === 0 && summary ? (
                  <div className="md:col-span-2 bg-surface-container-low border border-border-subtle rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center flex-shrink-0 mt-1">
                        <Icon name="auto_awesome" className="text-primary text-[18px]" />
                      </div>
                      <div>
                        <h4 className="font-body-md text-body-md font-semibold text-on-surface mb-1">Summary</h4>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">{summary}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  improvements.map((imp, i) => (
                    <div key={i} className="bg-surface-container-low border border-border-subtle rounded-lg p-4 hover:border-primary/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                            i % 2 === 0 ? 'bg-error/10 text-error' : 'bg-tertiary-container/10 text-tertiary-container'
                          }`}
                        >
                          <Icon name={i % 2 === 0 ? 'edit_note' : 'trending_up'} className="text-[18px]" />
                        </div>
                        <div className="w-full">
                          <h4 className="font-body-md text-body-md font-semibold text-on-surface mb-1">
                            Improvement {i + 1}
                          </h4>
                          <div className="bg-surface-card border border-border-subtle p-2 pl-3 rounded text-primary font-mono-sm text-mono-sm">
                            <span className="text-outline text-[11px] block mb-1">Suggested:</span>
                            {imp}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-gutter">
          <section className="glass-panel rounded-xl p-stack-md relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-primary/15 rounded-full blur-[50px] pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                  Match Score
                </h3>
                {score != null && (
                  <span className={`font-label-md text-label-md ${scoreAccent(score)} bg-surface-container-high px-2 py-0.5 rounded-full`}>
                    {scoreLabel(score)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="font-display-lg text-display-lg text-on-surface leading-none">
                  {score != null ? score : '—'}
                  {score != null && <span className="text-lg text-on-surface-variant"> /100</span>}
                </span>
                <div className="flex-1 h-3 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${scoreBar(score)} transition-all duration-1000`}
                    style={{ width: `${score != null ? score : 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-3 mt-5">
                <div className="flex items-center justify-between">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Keyword Match</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-warning rounded-full" style={{ width: `${keywordMatch}%` }}></div>
                    </div>
                    <span className="font-mono-sm text-mono-sm text-on-surface w-8 text-right">{keywordMatch}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Impact Metrics</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-success rounded-full" style={{ width: `${impact}%` }}></div>
                    </div>
                    <span className="font-mono-sm text-mono-sm text-on-surface w-8 text-right">{impact}%</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-surface-card border border-border-subtle rounded-xl p-stack-md">
            <h3 className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-wider font-semibold mb-4 flex items-center justify-between">
              Critical Missing Keywords
              <Icon name="warning" className="text-[16px] text-warning" />
            </h3>
            {keywords.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {preview ? 'No critical keywords missing. Nice work!' : 'No keywords yet. Upload and analyze your resume.'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {keywords.map((k, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-surface-container border border-border-subtle rounded-md font-mono-sm text-mono-sm text-on-surface-variant hover:border-warning/50 hover:text-warning cursor-default transition-colors"
                  >
                    {k}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="grid grid-cols-2 gap-gutter">
            {stats.map((s) => (
              <div key={s.label} className="bg-surface-card border border-border-subtle rounded-xl p-stack-md flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.tint}`}>
                  <Icon name={s.icon} className="text-[18px]" />
                </div>
                <div className="min-w-0">
                  <p className="font-headline-md text-headline-md text-on-surface leading-none">{s.value}</p>
                  <p className="font-label-md text-label-md text-on-surface-variant truncate">{s.label}</p>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>

      {history.length > 0 && (
        <section className="bg-surface-card border border-border-subtle rounded-xl p-stack-md">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
            <Icon name="history" className="text-primary" /> Upload History
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
                    setMode('upload');
                    setPreview(h);
                    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left w-full px-4 py-3"
                >
                  <span className="block font-body-sm text-body-sm text-on-surface">{h.filename}</span>
                  <span className="font-label-md text-label-md text-on-surface-variant">
                    {h.created_at?.slice(0, 10)} · {(h.resume_content?.length || 0).toLocaleString()} chars
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
        title="Delete resume record?"
        message="This will permanently delete this resume and its analysis. This action cannot be undone."
        onConfirm={handleDeleteHistory}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default ResumePage;