import { useEffect, useRef, useState } from 'react';
import { generateCoverLetter, getLatestResume } from '../utils/api';
import { getErrorMessage } from '../utils/errors';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'creative', label: 'Creative' },
  { value: 'bold', label: 'Bold' },
];

const TONE_PEER = {
  professional: 'peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary',
  creative: 'peer-checked:border-tertiary-container peer-checked:bg-tertiary-container/10 peer-checked:text-tertiary-container',
  bold: 'peer-checked:border-error peer-checked:bg-error/10 peer-checked:text-error',
};

const COUNTS = [1, 2, 3];

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadPdf(tone, content) {
  const w = window.open('', '_blank');
  if (!w) {
    return false;
  }
  const esc = String(content || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>Cover Letter - ${tone}</title>` +
      `<style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.6;color:#1a1a1a}` +
      `h1{font-size:20px}.print-btn{margin-bottom:24px;padding:10px 16px;font-size:14px;border:1px solid #ccc;background:#fff;border-radius:6px;cursor:pointer}` +
      `pre{white-space:pre-wrap;font-family:Georgia,serif;font-size:15px}</style></head><body>` +
      `<button class="print-btn" onclick="window.print()">Save / Print as PDF</button>` +
      `<h1>Cover Letter - ${tone}</h1><pre>${esc}</pre>` +
      `</body></html>`
  );
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
  return true;
}

export default function CoverLetterPage() {
  const [jobPosting, setJobPosting] = useState('');
  const [count, setCount] = useState(1);
  const [tone, setTone] = useState('professional');
  const [versions, setVersions] = useState([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const editorRef = useRef(null);
  const [latestResume, setLatestResume] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(true);
  const variationRef = useRef(0);

  const htmlToText = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    return div.textContent || '';
  };

  useEffect(() => {
    let mounted = true;
    getLatestResume()
      .then(({ data }) => {
        if (mounted) setLatestResume(data);
      })
      .catch(() => {
        if (mounted) setLatestResume(null);
      })
      .finally(() => {
        if (mounted) setResumeLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (editorRef.current && active >= 0 && versions[active]) {
      const el = editorRef.current;
      if (el.innerHTML !== versions[active].content) {
        el.innerHTML = versions[active].content;
      }
    }
  }, [active, versions]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard?.readText();
      if (text) {
        setJobPosting(text);
        setError('');
      } else {
        setError('Clipboard is empty. Paste manually instead.');
      }
    } catch (err) {
      setError('Could not read the clipboard. Paste manually instead.');
    }
  };

  const handleGenerate = async (t = tone, isRegenerate = false) => {
    const jd = jobPosting.trim();
    if (jd.length < 30) {
      setError('Please paste a job description with at least 30 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const variation = isRegenerate ? variationRef.current : 0;
      const { data } = await generateCoverLetter(jd, count, t, variation);
      const list = data.versions || [];
      if (list.length === 0) {
        setError('AI returned no cover letter versions. Please try again.');
        setVersions([]);
        setActive(-1);
        return;
      }
      if (isRegenerate) {
        variationRef.current += 1;
      } else {
        variationRef.current = 0;
      }
      setVersions(list);
      const desired = String(t).toLowerCase();
      const match = list.findIndex((v) => {
        const toneLabel = String(v.tone || '').toLowerCase();
        return toneLabel.includes(desired) || desired.includes(toneLabel);
      });
      setActive(match >= 0 ? match : 0);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to generate cover letter.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (active < 0) return;
    const source = editorRef.current ? editorRef.current.innerHTML : activeContent;
    const text = htmlToText(source);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      setError('Could not copy to clipboard. Select the text manually.');
    }
  };

  const updateVersion = (content) => {
    setVersions((prev) => prev.map((v, idx) => (idx === active ? { ...v, content } : v)));
  };

  const activeContent = active >= 0 && versions[active] ? versions[active].content : '';
  const activeTone = active >= 0 && versions[active] ? versions[active].tone : tone;

  const getEditorHtml = () => (editorRef.current ? editorRef.current.innerHTML : activeContent);

  const applyCommand = (cmd, value) => {
    if (active < 0) return;
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    try {
      if (cmd === 'formatBlock' && value) {
        document.execCommand(cmd, false, value);
      } else {
        document.execCommand(cmd, false, null);
      }
    } catch (err) {
      setError('Formatting is not supported in this browser.');
    }
    updateVersion(el.innerHTML);
  };

  const sanitize = (s) =>
    s.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'cover-letter';

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="px-gutter py-6 border-b border-border-subtle flex-shrink-0">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Cover Letter Studio</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          Generate highly tailored cover letters based on specific job descriptions.
        </p>
      </header>

      {error && (
        <div className="mx-gutter mt-4 bg-error/10 border border-error/30 text-error rounded-xl p-4 font-body-sm">{error}</div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        <section className="w-full lg:w-1/3 flex flex-col lg:border-r border-b lg:border-b-0 border-border-subtle bg-surface-container-low overflow-y-auto custom-scrollbar p-gutter">
          <div className="space-y-stack-lg">
            <div>
              <label htmlFor="cover-job-description" className="block font-label-md text-label-md text-on-surface mb-stack-sm flex items-center gap-2">
                <Icon name="description" className="text-[18px] text-primary" />
                Job Description
              </label>
              <div className="relative">
                <textarea
                  id="cover-job-description"
                  rows="12"
                  placeholder="Paste the full job description here..."
                  value={jobPosting}
                  onChange={(e) => setJobPosting(e.target.value)}
                  className="w-full bg-surface-card border border-outline-variant rounded-xl p-4 font-body-sm text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all resize-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] pr-20"
                ></textarea>
                <button
                  type="button"
                  onClick={handlePaste}
                  className="absolute bottom-4 right-4 bg-surface-variant hover:bg-surface-bright text-on-surface-variant hover:text-on-surface p-2 rounded-lg transition-colors border border-border-subtle flex items-center gap-2"
                >
                  <Icon name="content_paste" className="text-[16px]" />
                  <span className="font-label-md text-label-md">Paste</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-stack-sm flex items-center gap-2">
                <Icon name="person_book" className="text-[18px] text-primary" />
                Source Resume
              </label>
              {resumeLoading ? (
                <div className="bg-surface-card border border-outline-variant rounded-xl p-3 flex items-center gap-3">
                  <div className="p-2 bg-surface-variant rounded-lg animate-pulse">
                    <Icon name="picture_as_pdf" className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Loading resume...</p>
                  </div>
                </div>
              ) : latestResume ? (
                <div className="bg-surface-card border border-primary/40 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-surface-variant rounded-lg shrink-0">
                      <Icon name="picture_as_pdf" className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-body-sm text-body-sm text-on-surface font-medium truncate">{latestResume.filename || 'Latest Resume on File'}</p>
                      <p className="font-label-md text-label-md text-on-surface-variant font-normal flex items-center gap-2">
                        <span>{latestResume.score != null ? `ATS Score: ${Math.round(latestResume.score)}%` : 'Linked to profile'}</span>
                        <span className="text-outline">·</span>
                        <span>{new Date(latestResume.created_at).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>
                  <a
                    href={`/resume`}
                    className="shrink-0 px-3 py-2 rounded-lg font-label-md text-label-md border border-border-subtle text-primary hover:bg-primary/10 transition-colors flex items-center gap-2"
                  >
                    <Icon name="open_in_new" className="text-[16px]" /> View
                  </a>
                </div>
              ) : (
                <a
                  href="/resume"
                  className="block bg-surface-card border border-outline-variant rounded-xl p-3 flex items-center justify-between hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-surface-variant rounded-lg">
                      <Icon name="upload_file" className="text-primary" />
                    </div>
                    <div>
                      <p className="font-body-sm text-body-sm text-on-surface font-medium">No Resume Uploaded Yet</p>
                      <p className="font-label-md text-label-md text-on-surface-variant font-normal">Upload to link your profile</p>
                    </div>
                  </div>
                  <Icon name="arrow_forward" className="text-on-surface-variant" />
                </a>
              )}
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-stack-sm flex items-center gap-2">
                <Icon name="mood" className="text-[18px] text-primary" />
                Desired Tone
              </label>
              <div className="grid grid-cols-3 gap-3">
                {TONES.map((t) => (
                  <label key={t.value} className="cursor-pointer relative">
                    <input
                      type="radio"
                      name="tone"
                      value={t.value}
                      checked={tone === t.value}
                      onChange={() => setTone(t.value)}
                      className="peer sr-only"
                    />
                    <div className={`bg-surface-card border border-outline-variant rounded-lg p-3 text-center hover:bg-surface-variant transition-all ${TONE_PEER[t.value]}`}>
                      <span className="font-label-md text-label-md block">{t.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-stack-sm flex items-center gap-2">
                <Icon name="content_copy" className="text-[18px] text-primary" />
                Versions
              </label>
              <div className="grid grid-cols-3 gap-3">
                {COUNTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCount(c)}
                    className={`p-3 rounded-lg font-label-md text-label-md border transition-all ${
                      count === c
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-surface-card border-outline-variant text-on-surface-variant hover:bg-surface-variant'
                    }`}
                  >
                    {c} {c === 1 ? 'Version' : 'Versions'}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => handleGenerate(tone)}
                disabled={loading}
                className="w-full bg-inverse-primary text-on-primary py-4 rounded-xl font-headline-md text-body-md font-bold hover:brightness-110 active:scale-[0.98] transition-all flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(73,75,214,0.3)] border border-primary/20 relative overflow-hidden group disabled:opacity-70"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                <Icon name="auto_awesome" />
                {loading ? 'Generating...' : 'Generate Cover Letter'}
              </button>
            </div>
          </div>
        </section>

        <section className="w-full lg:w-2/3 flex flex-col bg-surface p-gutter relative h-full min-h-0">
          {versions.length > 0 && (
            <div className="flex items-center gap-2 mb-stack-md shrink-0 overflow-x-auto custom-scrollbar">
              {versions.map((v, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`px-4 py-2 rounded-lg font-label-md text-label-md border transition-colors shrink-0 ${
                    active === i
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-surface-card border-border-subtle text-on-surface-variant hover:bg-surface-variant'
                  }`}
                >
                  {v.tone || `Version ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center mb-stack-md bg-surface-card border border-border-subtle rounded-xl p-2 shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => applyCommand('bold')}
                className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-lg transition-colors"
                title="Bold (Ctrl+B)"
              >
                <Icon name="format_bold" className="text-[20px]" />
              </button>
              <button
                type="button"
                onClick={() => applyCommand('italic')}
                className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-lg transition-colors"
                title="Italic (Ctrl+I)"
              >
                <Icon name="format_italic" className="text-[20px]" />
              </button>
              <div className="w-px h-6 bg-border-subtle mx-2 hidden sm:block"></div>
              <button
                type="button"
                onClick={() => applyCommand('justifyLeft')}
                className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-lg transition-colors"
                title="Align left"
              >
                <Icon name="format_align_left" className="text-[20px]" />
              </button>
              <button
                type="button"
                onClick={() => applyCommand('justifyCenter')}
                className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-lg transition-colors"
                title="Align center"
              >
                <Icon name="format_align_center" className="text-[20px]" />
              </button>
              <button
                type="button"
                onClick={() => applyCommand('justifyRight')}
                className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-lg transition-colors"
                title="Align right"
              >
                <Icon name="format_align_right" className="text-[20px]" />
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2 border border-border-subtle text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-lg font-label-md text-label-md transition-colors flex items-center gap-2 disabled:opacity-50"
                disabled={active < 0}
              >
                <Icon name={copied ? 'check' : 'content_copy'} className="text-[18px]" /> {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (active >= 0) {
                    const ok = downloadPdf(activeTone, htmlToText(getEditorHtml()));
                    if (!ok) setError('Please allow pop-ups to export the cover letter as PDF.');
                  }
                }}
                className="px-4 py-2 border border-border-subtle text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-lg font-label-md text-label-md transition-colors flex items-center gap-2 disabled:opacity-50"
                disabled={active < 0}
              >
                <Icon name="download" className="text-[18px]" /> PDF
              </button>
              <button
                type="button"
                onClick={() => active >= 0 && downloadText(`cover-letter-${sanitize(activeTone)}.txt`, htmlToText(getEditorHtml()))}
                className="px-4 py-2 border border-border-subtle text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-lg font-label-md text-label-md transition-colors flex items-center gap-2 disabled:opacity-50"
                disabled={active < 0}
              >
                <Icon name="download" className="text-[18px]" /> .txt
              </button>
              <button
                type="button"
                onClick={() => handleGenerate(activeTone, true)}
                disabled={loading}
                className="px-4 py-2 bg-surface-variant text-primary border border-primary/30 hover:bg-primary/10 rounded-lg font-label-md text-label-md transition-colors flex items-center gap-2 ml-2 disabled:opacity-60"
              >
                <Icon name="cycle" className={`text-[18px] ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
          </div>

          <div className="flex-1 bg-surface-card border border-border-subtle rounded-xl shadow-lg relative overflow-hidden flex flex-col min-h-0">
            <div className="h-12 bg-glass-bg backdrop-blur-md border-b border-border-subtle flex items-center px-6 shrink-0 relative z-10">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-outline-variant"></div>
                <div className="w-3 h-3 rounded-full bg-outline-variant"></div>
                <div className="w-3 h-3 rounded-full bg-outline-variant"></div>
              </div>
              <div className="mx-auto font-mono-sm text-mono-sm text-on-surface-variant">cover_letter_final_v2.txt</div>
            </div>
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative z-0">
              {active < 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 pointer-events-none">
                  <Icon name="edit_document" className="text-[64px] text-surface-variant mb-4" />
                  <h3 className="font-headline-md text-headline-md text-on-surface-variant mb-2">Ready to Write</h3>
                  <p className="font-body-sm text-body-sm text-outline max-w-sm">
                    Provide a job description and select your tone on the left to generate a personalized cover letter.
                  </p>
                </div>
              ) : (
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck="false"
                  className="w-full h-full min-h-[420px] bg-transparent border-none focus:outline-none resize-none font-body-lg text-body-lg leading-relaxed text-on-surface editor-placeholder"
                  data-placeholder="Your personalized cover letter will appear here. You can edit it directly and use the toolbar to format it."
                  onInput={(e) => updateVersion(e.currentTarget.innerHTML)}
                ></div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}