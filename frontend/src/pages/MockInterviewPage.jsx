import { useEffect, useState } from 'react';
import {
  deleteInterview,
  generateInterview,
  getInterview,
  getInterviewBetterAnswers,
  getInterviewHistory,
  submitInterviewAnswers,
} from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import Dropdown from '../components/Dropdown';
import ConfirmDialog from '../components/ConfirmDialog';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

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
  'Senior Product Manager',
  'UX Designer',
].map((r) => ({ value: r, label: r }));

const DIFFICULTY_OPTIONS = [
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
];

const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

const esc = (s) =>
  String(s == null ? '' : s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

const CHARACTER_LIMIT = 2000;

const MockInterviewPage = () => {
  const [role, setRole] = useState('');
  const [type, setType] = useState('Mixed');
  const [difficulty, setDifficulty] = useState('Medium');
  const [count, setCount] = useState(6);
  const [interview, setInterview] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [betterAnswers, setBetterAnswers] = useState([]);
  const [loadingBetter, setLoadingBetter] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState('');

  const loadHistory = async () => {
    try {
      const { data } = await getInterviewHistory();
      setHistory(data.items);
    } catch {
      setHistory([]);
    }
  };

  const openHistory = async (id) => {
    setLoadingDetail(true);
    setError('');
    setBetterAnswers([]);
    try {
      const { data } = await getInterview(id);
      setSelectedHistory(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load interview.'));
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeHistory = () => {
    setSelectedHistory(null);
    setBetterAnswers([]);
  };

  const loadBetterAnswers = async () => {
    if (!selectedHistory) return;
    setLoadingBetter(true);
    setError('');
    try {
      const { data } = await getInterviewBetterAnswers(selectedHistory.id);
      setBetterAnswers(data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to generate better answers.'));
    } finally {
      setLoadingBetter(false);
    }
  };

  const handleDeleteHistory = async () => {
    if (confirmDelete == null) return;
    try {
      await deleteInterview(confirmDelete);
      setHistory((h) => h.filter((x) => x.id !== confirmDelete));
      if (selectedHistory?.id === confirmDelete) {
        setSelectedHistory(null);
        setBetterAnswers([]);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Delete failed.'));
    } finally {
      setConfirmDelete(null);
    }
  };

  const exportHistoryPdf = () => {
    const h = selectedHistory;
    if (!h) return;
    const date = new Date().toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const rows = (h.questions || [])
      .map((q, i) => {
        const a = (h.answers || []).find((x) => String(x.question) === String(q));
        const better = betterAnswers.find((b) => String(b.question) === String(q));
        return `<div class="qa">
          <h2><span class="qnum">Q${i + 1}</span> ${esc(q)}${a?.score != null ? ` <span class="score">${Math.round(a.score)}/100</span>` : ''}</h2>
          ${a?.answer ? `<div class="block"><h3>Your answer</h3><p>${esc(a.answer)}</p></div>` : ''}
          ${a?.feedback ? `<div class="block"><h3>Feedback</h3><p>${esc(a.feedback)}</p></div>` : ''}
          ${better ? `<div class="block better"><h3>Better answer example</h3><p>${esc(better.better_answer)}</p></div>` : ''}
        </div>`;
      })
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(h.role)} Mock Interview</title><style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #1a1a2e; margin: 40px; }
      h1 { margin: 0 0 4px; font-size: 26px; }
      .sub { color: #6b7089; margin-bottom: 20px; font-size: 14px; }
      .meta { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 28px; padding: 14px 16px; background: #f1f2ff; border-radius: 10px; font-size: 13px; color: #3a3a6b; }
      .qa { margin-bottom: 26px; page-break-inside: avoid; }
      .qa h2 { font-size: 17px; color: #2b2b45; margin: 0 0 12px; border-left: 4px solid #c0c1ff; padding-left: 10px; }
      .qnum { display: inline-block; background: #e8e8ff; color: #3a3a6b; border-radius: 999px; padding: 1px 10px; font-size: 13px; margin-right: 6px; }
      .score { float: right; font-size: 13px; font-weight: 700; background: #f1f2ff; color: #3a3a6b; border-radius: 999px; padding: 2px 10px; }
      .block { margin-bottom: 12px; }
      .block h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #9a9ab0; margin: 0 0 4px; }
      .block p { margin: 0; font-size: 14px; color: #3c3c55; line-height: 1.55; white-space: pre-wrap; }
      .block.better { background: #f4f6ff; border: 1px solid #c9d2ff; border-radius: 10px; padding: 12px 14px; }
      .block.better h3 { color: #3a4bb8; }
      .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e3e3f0; font-size: 12px; color: #9a9ab0; }
      @media print { body { margin: 0; } }
    </style></head><body>
      <h1>${esc(h.role)} Mock Interview</h1>
      <div class="sub">CareerMind.AI &bull; Taken ${esc(h.created_at ? String(h.created_at).slice(0, 10) : date)} &bull; Generated ${esc(date)}</div>
      <div class="meta">
        <span>Difficulty: ${esc(h.difficulty || 'Medium')}</span>
        <span>Type: ${esc(h.interview_type || 'Mixed')}</span>
        ${h.score != null ? `<span>Overall Score: ${Math.round(h.score)}/100</span>` : ''}
      </div>
      ${h.feedback ? `<div class="block"><h3>Overall feedback</h3><p>${esc(h.feedback)}</p></div>` : ''}
      ${rows}
      <div class="footer">Generated by CareerMind.AI</div>
    </body></html>`;
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) {
      setError('Please allow pop-ups to export the interview as PDF.');
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

  useEffect(() => {
    loadHistory();
  }, []);

  const handleGenerate = async () => {
    if (!role.trim()) {
      setError('Enter a job role first.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    setAnswers({});
    setAnswer('');
    setCurrentIndex(0);
    setPaused(false);
    try {
      const { data } = await generateInterview(role.trim(), type, count, difficulty);
      setInterview(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to generate questions.'));
    } finally {
      setLoading(false);
    }
  };

  const questions = interview?.questions || [];
  const currentQuestion = questions[currentIndex];

  const saveCurrentAnswer = () => {
    if (currentQuestion && answer.trim()) {
      setAnswers((prev) => ({ ...prev, [currentQuestion]: answer }));
    }
  };

  const goTo = (i) => {
    saveCurrentAnswer();
    const idx = clamp(i, 0, questions.length - 1);
    setCurrentIndex(idx);
    setAnswer(answers[questions[idx]] || '');
  };

  const handleNext = () => {
    saveCurrentAnswer();
    if (currentIndex < questions.length - 1) goTo(currentIndex + 1);
  };

  const handleEditQuestion = (i) => {
    saveCurrentAnswer();
    setCurrentIndex(i);
    setAnswer(answers[questions[i]] || '');
  };

  const handleSubmit = async () => {
    if (!interview) return;
    const mergedAnswers = currentQuestion ? { ...answers, [currentQuestion]: answer } : answers;
    const qa = questions
      .map((q) => ({ question: q, answer: (mergedAnswers[q] || '').trim() }))
      .filter((x) => x.answer);
    if (qa.length < questions.length) {
      setError('Answer all questions before submitting.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { data } = await submitInterviewAnswers(interview.id, qa);
      setResult(data);
      await loadHistory();
    } catch (err) {
      setError(getErrorMessage(err, 'Submission failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = Object.values(answers).filter((a) => (a || '').trim()).length;
  const answeredWithCurrent = currentQuestion && (answer || '').trim() && !(answers[currentQuestion] || '').trim()
    ? answeredCount + 1
    : answeredCount;
  const allAnswered = questions.length > 0 && answeredWithCurrent >= questions.length;
  const isLastQuestion = currentIndex >= questions.length - 1;
  const overallScore = typeof result?.overall_score === 'number' ? result.overall_score : 0;

  const metricBars = [
    {
      label: 'Technical Knowledge',
      value: typeof result?.technical_score === 'number' ? result.technical_score : 0,
      color: 'bg-secondary',
      text: 'text-secondary',
      icon: 'memory',
    },
    {
      label: 'Communication Structure',
      value: typeof result?.communication_score === 'number' ? result.communication_score : 0,
      color: 'bg-tertiary-container',
      text: 'text-tertiary-container',
      icon: 'record_voice_over',
    },
    {
      label: 'Confidence & Tone',
      value: typeof result?.confidence_score === 'number' ? result.confidence_score : 0,
      color: 'bg-success',
      text: 'text-success',
      icon: 'self_improvement',
    },
  ];
  const liveTags = result?.tags?.length
    ? result.tags
    : result?.overall_feedback
      ? [result.overall_feedback]
      : [];

  const answerList = result?.answers || [];

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-7xl mx-auto">
      {selectedHistory && (
        <div className="max-w-5xl mx-auto space-y-gutter">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1 flex items-center gap-2">
                <Icon name="history" className="text-secondary" />
                {selectedHistory.role} Mock
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2">
                <Icon name="schedule" className="text-sm text-primary" />
                {selectedHistory.created_at?.slice(0, 10)} · {selectedHistory.difficulty || 'Medium'} difficulty · {selectedHistory.interview_type || 'Mixed'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {selectedHistory.score != null && (
                <div className="bg-surface-card border border-border-subtle rounded-xl px-4 py-2 flex items-center gap-2">
                  <span className="font-display-lg text-display-lg text-primary leading-none">{Math.round(selectedHistory.score)}</span>
                  <span className="font-label-md text-label-md text-on-surface-variant">/100</span>
                </div>
              )}
              <button
                type="button"
                onClick={exportHistoryPdf}
                className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 font-label-md text-label-md transition-colors flex items-center gap-2"
              >
                <Icon name="picture_as_pdf" className="text-sm" /> Export PDF
              </button>
              <button
                type="button"
                onClick={closeHistory}
                className="px-4 py-2 bg-error/10 text-error border border-error/20 rounded-lg hover:bg-error/20 font-label-md text-label-md transition-colors flex items-center gap-2"
              >
                <Icon name="close" className="text-sm" /> Back
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-error/10 border border-error/30 text-error rounded-xl p-stack-md font-body-sm">{error}</div>
          )}

          {loadingDetail ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Icon name="hourglass_top" className="text-4xl text-outline animate-spin mb-3" />
              <p className="font-body-sm text-body-sm text-on-surface-variant">Loading interview...</p>
            </div>
          ) : (
            <>
              {selectedHistory.feedback && (
                <section className="bg-surface-card border border-border-subtle rounded-xl p-stack-md">
                  <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Icon name="auto_awesome" className="text-primary" /> Overall Feedback
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface">{selectedHistory.feedback}</p>
                </section>
              )}

              <section className="bg-surface-card border border-border-subtle rounded-xl p-stack-md">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                    <Icon name="question_answer" className="text-primary" /> Questions & Answers
                  </h3>
                  <button
                    type="button"
                    onClick={loadBetterAnswers}
                    disabled={loadingBetter}
                    className="bg-primary text-on-primary font-label-md text-label-md px-4 py-2 rounded-lg hover:bg-primary-fixed transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Icon name="auto_awesome" className="text-sm" />
                    {loadingBetter ? 'Generating...' : betterAnswers.length ? 'Regenerate Better Answers' : 'Show Better Answers'}
                  </button>
                </div>

                <div className="space-y-4">
                  {(selectedHistory.questions || []).map((q, i) => {
                    const a = (selectedHistory.answers || []).find((x) => String(x.question) === String(q));
                    const better = betterAnswers.find((b) => String(b.question) === String(q));
                    return (
                      <div key={i} className="bg-surface-container-low border border-border-subtle rounded-lg p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-body-md text-body-md text-on-surface font-medium flex items-start gap-2 flex-1">
                            <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-label-md flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                            {q}
                          </p>
                          {a?.score != null && (
                            <span
                              className={`px-2.5 py-1 rounded-md font-mono-sm text-mono-sm border flex-shrink-0 ${
                                a.score >= 70 ? 'bg-success/10 text-success border-success/20' : a.score >= 40 ? 'bg-warning/10 text-warning border-warning/20' : 'bg-error/10 text-error border-error/20'
                              }`}
                            >
                              {Math.round(a.score)}/100
                            </span>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="bg-surface-dim border border-border-subtle rounded-lg p-3">
                            <p className="font-label-md text-label-md text-on-surface-variant mb-1 flex items-center gap-1">
                              <Icon name="person" className="text-sm" /> Your Answer
                            </p>
                            <p className="font-body-sm text-body-sm text-on-surface whitespace-pre-wrap">{a?.answer || 'Not answered'}</p>
                          </div>
                          <div className="bg-surface-dim border border-border-subtle rounded-lg p-3">
                            <p className="font-label-md text-label-md text-on-surface-variant mb-1 flex items-center gap-1">
                              <Icon name="school" className="text-sm" /> Feedback
                            </p>
                            <p className="font-body-sm text-body-sm text-on-surface whitespace-pre-wrap">{a?.feedback || 'No feedback'}</p>
                          </div>
                        </div>

                        {better && (
                          <div className="mt-3 bg-primary/5 border border-primary/30 rounded-lg p-3">
                            <p className="font-label-md text-label-md text-primary mb-1 flex items-center gap-1">
                              <Icon name="auto_awesome" className="text-sm" /> Better Answer Example
                            </p>
                            <p className="font-body-sm text-body-sm text-on-surface whitespace-pre-wrap">{better.better_answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {!loadingBetter && betterAnswers.length === 0 && !error && (
                    <p className="text-center font-body-sm text-body-sm text-on-surface-variant pt-2">
                      Click &quot;Show Better Answers&quot; to view an example of a strong answer for each question.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {!selectedHistory && !interview && (
        <div className="max-w-4xl mx-auto space-y-gutter">
          <div className="pt-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-container/20 text-primary-container flex items-center justify-center mx-auto mb-4">
              <Icon name="record_voice_over" className="text-3xl" />
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1">Mock Interview</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Pick a role, answer role-specific questions, and get scored AI feedback.
            </p>
          </div>

          <section className="glass-panel rounded-xl p-stack-lg">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-stack-md flex items-center gap-2">
              <Icon name="tune" className="text-primary" />
              Configure Your Interview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-stack-md">
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="interview-role">Job Role</label>
                <Dropdown
                  value={role}
                  onChange={setRole}
                  options={ROLE_OPTIONS}
                  placeholder="e.g. Frontend Developer"
                  allowCustom
                />
              </div>
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="interview-type">Question Type</label>
                <select
                  id="interview-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-surface-container border border-border-subtle text-on-surface font-body-sm text-body-sm rounded-lg px-3 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                >
                  <option value="Technical">Technical</option>
                  <option value="Behavioral">Behavioral</option>
                  <option value="Mixed">Mixed</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="interview-difficulty">Difficulty</label>
                <select
                  id="interview-difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-surface-container border border-border-subtle text-on-surface font-body-sm text-body-sm rounded-lg px-3 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                >
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="interview-count">Question Count</label>
                <select
                  id="interview-count"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full bg-surface-container border border-border-subtle text-on-surface font-body-sm text-body-sm rounded-lg px-3 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                >
                  <option value={5}>5 questions</option>
                  <option value={6}>6 questions</option>
                  <option value={8}>8 questions</option>
                  <option value={10}>10 questions</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="mt-stack-md w-full bg-primary text-on-primary rounded-lg py-2.5 font-label-md text-label-md hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Icon name="auto_awesome" className="text-sm" />
              {loading ? 'Generating...' : 'Generate Questions'}
            </button>
            {error && (
              <div className="mt-stack-md bg-error/10 border border-error/30 text-error rounded-xl p-3 font-body-sm">{error}</div>
            )}
          </section>

          <section className="bg-surface-card border border-border-subtle rounded-xl p-stack-lg">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
              <Icon name="history" className="text-secondary" />
              Interview History
            </h3>
            {history.length > 0 ? (
              <div className="space-y-2">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="w-full text-left flex items-center justify-between bg-surface-container border border-border-subtle rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => openHistory(h.id)}
                      className="flex-1 min-w-0 flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-body-md text-body-md text-on-surface font-medium">
                          {h.role} · {h.difficulty}
                          {h.interview_type ? ` · ${h.interview_type}` : ''}
                        </p>
                        <p className="font-label-md text-label-md text-on-surface-variant mt-0.5">
                          {h.created_at?.slice(0, 10)} · {h.questions?.length || 0} questions
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-mono-sm text-mono-sm text-primary">
                          {h.score != null ? `${Math.round(h.score)}/100` : 'not submitted'}
                        </span>
                        <Icon name="chevron_right" className="text-on-surface-variant text-[18px]" />
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(h.id)}
                      title="Delete interview"
                      className="px-3 py-1 text-outline hover:text-error transition-colors flex items-center"
                    >
                      <Icon name="delete" className="text-sm" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Icon name="history" className="text-4xl text-outline mb-2" />
                <p className="font-body-sm text-body-sm text-on-surface-variant">No interviews taken yet.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {!selectedHistory && interview && !result && (
        <div className="grid grid-cols-12 gap-gutter">
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-gutter">
            <div className="flex flex-wrap justify-between items-end gap-stack-md">
              <div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface mb-1">{interview.role || role} Mock</h1>
                <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2">
                  <Icon name="schedule" className="text-sm text-primary" />
                  Session: {interview.interview_type || type} · {interview.difficulty || difficulty} · Question {currentIndex + 1} of {questions.length}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-colors flex items-center gap-2 border ${
                    paused
                      ? 'bg-surface-bright text-primary border-primary/40'
                      : 'bg-surface-container border-border-subtle text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Icon name={paused ? 'play_arrow' : 'pause'} className="text-sm" />
                  {paused ? 'Resume' : 'Pause'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInterview(null);
                    setResult(null);
                    setAnswers({});
                    setAnswer('');
                  }}
                  className="px-4 py-2 bg-error/10 text-error border border-error/20 rounded-lg hover:bg-error/20 font-label-md text-label-md transition-colors flex items-center gap-2"
                >
                  <Icon name="stop_circle" className="text-sm" />
                  End Session
                </button>
              </div>
            </div>

            {currentQuestion ? (
              <>
                <div className="bg-surface-card border border-border-subtle rounded-xl p-stack-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-secondary-container/20 text-secondary-container font-mono-sm text-mono-sm border border-secondary-container/30">{interview.interview_type || type}</span>
                      <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary font-mono-sm text-mono-sm border border-primary/30">
                        {interview.difficulty || difficulty} difficulty
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-surface-bright text-on-surface-variant font-mono-sm text-mono-sm border border-border-subtle">Q{currentIndex + 1} of {questions.length}</span>
                    </div>
                    <button type="button" className="text-on-surface-variant hover:text-primary transition-colors">
                      <Icon name="volume_up" />
                    </button>
                  </div>
                  <h2 className="font-headline-md text-headline-md text-on-surface mb-4 leading-relaxed">{currentQuestion}</h2>
                  <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border-subtle">
                    <p className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1">
                      <Icon name="lightbulb" className="text-sm text-warning" />
                      AI Hint:
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant italic">
                      Answer as clearly as possible. Consider structure before depth.
                    </p>
                  </div>
                </div>

                <div className="bg-surface-card border border-border-subtle rounded-xl p-stack-lg flex-1 flex flex-col relative group focus-within:border-primary/50 transition-colors">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-label-md text-label-md text-on-surface flex items-center gap-2">
                      <Icon name="keyboard" className="text-primary" />
                      Your Response
                    </h3>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setVoiceMode((v) => !v)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-label-md text-label-md border transition-colors ${
                          voiceMode
                            ? 'bg-primary/20 text-primary border-primary/40'
                            : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-bright border-border-subtle'
                        }`}
                      >
                        <Icon name="mic" className="text-sm" />
                        {voiceMode ? 'Listening...' : 'Voice Input'}
                      </button>
                      <span className="font-mono-sm text-mono-sm text-outline">{answer.length} / {CHARACTER_LIMIT} chars</span>
                    </div>
                  </div>
                  <textarea
                    value={answer}
                    disabled={paused}
                    onChange={(e) => setAnswer(e.target.value.slice(0, CHARACTER_LIMIT))}
                    placeholder="Type your answer here... Structure your response clearly. (e.g., Use the STAR method for behavioral questions or define components for system design)"
                    className="flex-1 w-full min-h-[200px] bg-surface-dim border border-border-subtle rounded-lg p-4 font-body-md text-body-md text-on-surface resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all custom-scrollbar disabled:opacity-50"
                  />
                  <div className="flex justify-between items-center mt-stack-md pt-stack-md border-t border-border-subtle">
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={paused || isLastQuestion}
                      className="text-on-surface-variant hover:text-on-surface font-label-md text-label-md flex items-center gap-2 transition-colors disabled:opacity-40"
                    >
                      Next Question
                      <Icon name="arrow_forward" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting || paused || !allAnswered}
                      className="bg-primary hover:bg-primary-fixed text-on-primary font-label-md text-label-md px-6 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(192,193,255,0.2)] hover:shadow-[0_0_20px_rgba(192,193,255,0.4)] disabled:opacity-50"
                      title={allAnswered ? 'Submit now' : `Answer all ${questions.length} questions to submit`}
                    >
                      {submitting ? 'Evaluating...' : 'Submit & Get Feedback'}
                      {!submitting && <Icon name="send" className="text-sm" />}
                    </button>
                  </div>
                </div>

                <div className="bg-surface-card border border-border-subtle rounded-xl p-stack-md">
                  <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-3">Session Progress</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {questions.map((q, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleEditQuestion(i)}
                        className={[
                          'h-2.5 rounded-full transition-colors',
                          i === currentIndex && 'bg-primary',
                          i !== currentIndex && (answers[q] ? 'bg-success' : 'bg-surface-container-high'),
                          i !== currentIndex && (answers[q] ? '' : 'hover:bg-surface-bright'),
                        ].join(' ')}
                        title={answers[q] ? `Q${i + 1} answered` : `Q${i + 1}`}
                      />
                    ))}
                  </div>
                  <p className="font-mono-sm text-mono-sm text-on-surface-variant mt-3">{answeredCount}/{questions.length} answered</p>
                </div>
              </>
            ) : null}
          </div>

          <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
            <div className="bg-surface-card border border-border-subtle rounded-xl p-stack-lg relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
              <h3 className="font-label-md text-label-md text-on-surface-variant mb-6 flex items-center gap-2 uppercase tracking-wider">
                <Icon name="donut_large" className="text-sm" />
                Current Performance
              </h3>
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-surface-container-highest"
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
                      strokeDasharray={`${overallScore}, 100`}
                      strokeLinecap="round"
                      strokeWidth="3"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="font-headline-lg text-headline-lg text-primary font-bold">{result ? overallScore : '—'}</span>
                    <span className="font-label-md text-label-md text-on-surface-variant opacity-70">/100</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <p className="font-body-sm text-body-sm text-on-surface leading-tight">
                    {answer.length > 50 ? 'Good pacing so far. Keep building on this answer.' : 'Type your answer to see live feedback.'}
                  </p>
                  {result && answeredCount > 0 && (
                    <div className="flex items-center gap-1 text-success font-label-md text-label-md mt-2">
                      <Icon name="trending_up" className="text-sm" />
                      Scored {overallScore}/100
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-surface-card border border-border-subtle rounded-xl p-stack-lg flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-label-md text-label-md text-on-surface-variant flex items-center gap-2 uppercase tracking-wider">
                  <Icon name="bar_chart" className="text-sm" />
                  Metrics Breakdown
                </h3>
              </div>
              <div className="space-y-6 flex-1">
                {metricBars.map((m) => (
                  <div key={m.label}>
                    <div className="flex justify-between font-label-md text-label-md mb-2">
                      <span className="text-on-surface flex items-center gap-2">
                        <Icon name={m.icon} className={`text-sm ${m.text}`} />
                        {m.label}
                      </span>
                      <span className={`${m.text} font-mono-sm`}>{clamp(m.value)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className={`h-full ${m.color}`} style={{ width: `${clamp(m.value)}%` }}></div>
                    </div>
                  </div>
                ))}
                <div className="pt-6 border-t border-border-subtle mt-auto">
                  <h4 className="font-label-md text-label-md text-outline mb-3">Live Analysis Tags</h4>
                  {liveTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {liveTags.map((t, i) => (
                        <span key={i} className="px-2 py-1 bg-surface-container-highest border border-border-subtle rounded text-on-surface-variant font-mono-sm text-[11px]">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="px-2 py-1 bg-surface-container-highest border border-border-subtle rounded text-on-surface-variant font-mono-sm text-[11px]">
                      Awaiting response
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedHistory && result && (
        <div className="max-w-6xl mx-auto space-y-gutter">
          <div className="bg-surface-card border border-border-subtle rounded-xl p-stack-lg flex items-center gap-stack-md">
            <div className="w-16 h-16 rounded-full bg-primary-container/20 text-primary-container flex items-center justify-center">
              <Icon name="verified" className="text-3xl" />
            </div>
            <div className="flex-1">
              <h2 className="font-headline-md text-headline-md text-on-surface">{overallScore}/100 Overall Score</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                {result?.overall_feedback || 'Review per-answer feedback below and try again to improve.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setInterview(null);
                setResult(null);
                setAnswers({});
                setAnswer('');
              }}
              className="flex-shrink-0 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-fixed transition-colors flex items-center gap-2"
            >
              <Icon name="refresh" className="text-sm" /> Take Another
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            {answerList.map((a, i) => {
              const sc = typeof a.score === 'number' ? a.score : 0;
              return (
                <div key={i} className="bg-surface-card border border-border-subtle rounded-xl p-stack-md">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono-sm text-mono-sm text-on-surface-variant">Q{i + 1}</span>
                    <span
                      className={`px-2.5 py-1 rounded-md font-mono-sm text-mono-sm border ${
                        sc >= 70 ? 'bg-success/10 text-success border-success/20' : sc >= 40 ? 'bg-warning/10 text-warning border-warning/20' : 'bg-error/10 text-error border-error/20'
                      }`}
                    >
                      {sc}/100
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface mb-2 flex items-start gap-2">
                    <Icon name="chat_bubble_outline" className="text-secondary text-sm mt-1" />
                    {a.question}
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{a.feedback || ''}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete != null}
        title="Delete interview?"
        message="This will permanently delete this interview and its results. This action cannot be undone."
        onConfirm={handleDeleteHistory}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default MockInterviewPage;