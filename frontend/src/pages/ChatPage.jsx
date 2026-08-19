import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getChatSessions,
  createChatSession,
  getChatMessages,
  sendChatMessage,
  deleteChatSession,
  setMessageFeedback,
} from '../utils/api';
import { getErrorMessage } from '../utils/errors';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const timeOf = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const AttachmentChip = ({ message }) => (
  <div className="mt-1 mb-2 inline-flex items-center gap-2 bg-surface-variant/60 border border-border-subtle rounded-lg px-2.5 py-1.5 max-w-full">
    <Icon name="description" className="text-primary text-[16px] shrink-0" />
    <span className="text-[11px] font-label-md text-on-surface-variant truncate">
      {message.attachment_name}
    </span>
  </div>
);

const UserBubble = ({ message }) => (
  <div className="flex gap-4 self-end max-w-2xl w-full flex-row-reverse">
    <div className="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center shrink-0 overflow-hidden border border-border-subtle">
      <Icon name="person" className="text-on-surface-variant text-sm" />
    </div>
    <div className="bg-surface-card border border-border-subtle rounded-2xl rounded-tr-sm p-4 shadow-sm relative">
      {message.attachment_name && <AttachmentChip message={message} />}
      <p className="font-body-md text-body-md text-on-surface whitespace-pre-wrap">
        {message.content}
      </p>
      {message.created_at && (
        <span className="text-[10px] text-outline absolute bottom-1 right-3">
          {timeOf(message.created_at)}
        </span>
      )}
    </div>
  </div>
);

const AIBubble = ({ message, copiedId, onCopy, onToggleHelpful }) => {
  const copied = copiedId === message.id;
  return (
    <div className="flex gap-4 self-start max-w-2xl w-full">
      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-tertiary flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(192,193,255,0.3)]">
        <Icon name="psychology" className="text-white text-sm" />
      </div>
      <div className="glass-panel rounded-2xl rounded-tl-sm p-4 shadow-md">
        <p className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border-subtle">
          <button
            onClick={() => onToggleHelpful(message)}
            className={`text-[11px] font-label-md transition-colors flex items-center gap-1 ${
              message.helpful
                ? 'text-primary font-bold'
                : 'text-outline-variant hover:text-primary'
            }`}
            title={message.helpful ? 'Marked helpful — click to undo' : 'Mark as helpful'}
          >
            <Icon name={message.helpful ? 'thumb_up' : 'thumb_up_off_alt'} className="text-[14px]" />
            {message.helpful ? 'Helpful' : 'Helpful'}
          </button>
          <button
            onClick={() => onCopy(message)}
            className={`text-[11px] font-label-md transition-colors flex items-center gap-1 ${
              copied ? 'text-success' : 'text-outline-variant hover:text-primary'
            }`}
          >
            <Icon name={copied ? 'check' : 'content_copy'} className="text-[14px]" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        {message.created_at && (
          <span className="text-[10px] text-outline block mt-1">{timeOf(message.created_at)}</span>
        )}
      </div>
    </div>
  );
};

async function extractPdfText(file) {
  const pdfjsLib = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  let out = '';
  const maxPages = Math.min(doc.numPages, 10);
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const text = await page.getTextContent();
    out += text.items.map((t) => ('str' in t ? t.str : '')).join(' ') + '\n';
  }
  return out.trim();
}

const ChatPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [removeId, setRemoveId] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [listening, setListening] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const fileRef = useRef(null);
  const voiceSupported = useRef(
    typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const recognitionRef = useRef(null);
  const threadRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    getChatSessions()
      .then(({ data }) => setSessions(data.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeId) {
      setLoading(true);
      getChatMessages(activeId)
        .then(({ data }) => setMessages(data.items || []))
        .catch((err) => setError(getErrorMessage(err, 'Failed to load messages')))
        .finally(() => setLoading(false));
    } else {
      setMessages([]);
    }
  }, [activeId]);

  useEffect(() => {
    threadRef.current?.scrollTo(0, threadRef.current.scrollHeight);
  }, [messages, typing, attachment]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const handleNewChat = async () => {
    setError('');
    setAttachment(null);
    try {
      const { data } = await createChatSession();
      setSessions((prev) => [data, ...prev]);
      setActiveId(data.id);
      setMessages([]);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create chat'));
    }
  };

  const promptHandledRef = useRef(false);

  useEffect(() => {
    const prompt = location.state?.prompt;
    if (!prompt || promptHandledRef.current) return;
    promptHandledRef.current = true;
    navigate(location.pathname, { replace: true, state: null });

    const startDiscussion = async () => {
      setError('');
      setTyping(true);
      try {
        const sessRes = await createChatSession();
        const session = sessRes.data;
        setSessions((prev) => [session, ...prev]);
        setActiveId(session.id);
        const msgRes = await sendChatMessage(session.id, String(prompt));
        const chatRes = await getChatMessages(session.id);
        setMessages(chatRes.data.items || [msgRes.data.user_message, msgRes.data.assistant_message]);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to start discussion.'));
        setActiveId(null);
      } finally {
        setTyping(false);
      }
    };
    startDiscussion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    setRemoveId(id);
  };

  const confirmDelete = async () => {
    if (!removeId) return;
    setRemoving(true);
    setError('');
    try {
      await deleteChatSession(removeId);
      setSessions((prev) => prev.filter((s) => s.id !== removeId));
      if (activeId === removeId) {
        setActiveId(null);
        setMessages([]);
      }
      setRemoveId(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete chat'));
      setRemoveId(null);
    } finally {
      setRemoving(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const content = input.trim();
    if ((!content && !attachment) || !activeId || typing) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setAttachment(null);
    setTyping(true);
    setError('');
    try {
      const { data } = await sendChatMessage(activeId, content, attachment || {});
      setMessages((prev) => [...prev, data.user_message, data.assistant_message]);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send message'));
      if (content) setInput(content);
    } finally {
      setTyping(false);
    }
  };

  const handleCopy = async (message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      setTimeout(() => setCopiedId((c) => (c === message.id ? null : c)), 1800);
    } catch (err) {
      setError('Could not copy to clipboard');
    }
  };

  const handleToggleHelpful = async (message) => {
    const next = !message.helpful;
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, helpful: next } : m)));
    try {
      await setMessageFeedback(message.id, next);
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, helpful: !next } : m))
      );
      setError(getErrorMessage(err, 'Failed to save feedback'));
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      let text = '';
      if (file.type === 'application/pdf' || /.pdf$/i.test(file.name)) {
        text = await extractPdfText(file);
      } else if (file.size > 2 * 1024 * 1024) {
        throw new Error('File too large (max 2 MB for text files).');
      } else {
        text = await file.text();
      }
      if (!text.trim()) throw new Error('Could not read any text from this file.');
      setAttachment({ name: file.name, text: text.slice(0, 15000) });
    } catch (err) {
      setError(`Could not attach file: ${err && err.message ? err.message : String(err)}`);
    }
  };

  const toggleListening = () => {
    if (!voiceSupported.current || !activeId) return;
    setError('');

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    let interim = '';
    rec.onresult = (ev) => {
      interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) {
          setInput((prev) =>
            ((prev || '').trim() ? (prev || '').trim() + ' ' : '') + ev.results[i][0].transcript
          );
          interim = '';
        } else {
          interim += ev.results[i][0].transcript;
        }
      }
      if (interim) {
        setInput((prev) =>
          ((prev || '').replace(/\s*$/, ' ')) + interim
        );
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  return (
    <div className="flex h-full min-h-screen md:min-h-0 flex-col md:flex-row overflow-hidden bg-background">
      {/* History sidebar (desktop) */}
      <aside className="hidden lg:flex w-72 border-r border-border-subtle bg-surface-card flex-col shrink-0">
        <div className="p-stack-md border-b border-border-subtle flex justify-between items-center">
          <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
            Chat History
          </h2>
          <button onClick={handleNewChat} title="New Chat" className="text-primary hover:bg-surface-variant p-1 rounded transition-colors">
            <Icon name="edit_square" className="text-lg" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-stack-sm flex flex-col gap-unit">
          {sessions.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant px-3 py-2">No chats yet.</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={`group w-full rounded-lg transition-colors flex items-center gap-1 pr-1 ${
                  s.id === activeId
                    ? 'bg-surface-variant border border-border-subtle'
                    : 'hover:bg-surface-variant/50'
                }`}
              >
                <button
                  onClick={() => setActiveId(s.id)}
                  className={`flex-1 min-w-0 text-left px-3 py-2 font-body-sm text-body-sm truncate transition-colors flex items-center gap-2 ${
                    s.id === activeId ? 'text-on-surface' : 'text-on-surface-variant'
                  }`}
                >
                  <Icon
                    name={s.id === activeId ? 'chat_bubble' : 'chat_bubble_outline'}
                    className={`${s.id === activeId ? 'text-primary' : 'text-outline'} text-sm`}
                  />
                  <span className="truncate">{s.session_title || 'Untitled chat'}</span>
                </button>
                <button
                  onClick={(e) => handleDelete(s.id, e)}
                  title="Delete chat"
                  className="p-1.5 text-outline hover:text-error rounded transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Icon name="delete" className="text-sm" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Chat window */}
      <section className="flex-1 flex flex-col bg-background relative min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border-subtle bg-surface-card/50 backdrop-blur-md flex items-center justify-between px-gutter shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-tertiary flex items-center justify-center">
                <Icon name="psychology" className="text-white text-lg" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border border-background"></span>
            </div>
            <div className="min-w-0">
              <h2 className="font-body-md text-body-md font-semibold text-on-surface leading-tight truncate">
                CareerMind Strategist
              </h2>
              <p className="font-label-md text-[10px] text-success">{typing ? 'Typing...' : 'Online & Ready'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeId && (
              <button onClick={(e) => handleDelete(activeId, e)} title="Delete this chat" className="p-2 text-on-surface-variant hover:text-error hover:bg-surface-variant rounded-md transition-colors">
                <Icon name="delete" className="text-lg" />
              </button>
            )}
            <button onClick={handleNewChat} title="New Chat" className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-md transition-colors lg:hidden">
              <Icon name="edit_square" className="text-lg" />
            </button>
          </div>
        </header>

        {/* Mobile session switcher */}
        {sessions.length > 0 && (
          <div className="lg:hidden flex gap-2 overflow-x-auto custom-scrollbar px-gutter py-2 border-b border-border-subtle shrink-0">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`shrink-0 flex items-center rounded-full border font-label-md max-w-[200px] ${
                  s.id === activeId
                    ? 'bg-primary-container text-on-primary-container border-primary-container font-bold'
                    : 'bg-surface-card border-border-subtle text-on-surface-variant'
                }`}
              >
                <button
                  onClick={() => setActiveId(s.id)}
                  className="flex-1 min-w-0 truncate px-3 py-1.5 text-left text-[11px]"
                >
                  {s.session_title || 'Untitled chat'}
                </button>
                <button
                  onClick={(e) => handleDelete(s.id, e)}
                  title="Delete chat"
                  className="p-1 pr-2 text-outline hover:text-error transition-colors"
                >
                  <Icon name="delete" className="text-[14px]" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        <div ref={threadRef} className="flex-1 overflow-y-auto custom-scrollbar p-gutter flex flex-col gap-6">
          {!activeId ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-card border border-border-subtle flex items-center justify-center mb-4">
                <Icon name="forum" className="text-primary text-3xl" />
              </div>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-2">CareerMind AI Chat</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                Ask me anything about your career — skill gaps, interview prep, salary negotiation, and more. You can attach a resume or document and the AI will read it.
              </p>
              <button
                onClick={handleNewChat}
                className="mt-6 bg-primary text-on-primary rounded-lg py-2.5 px-6 font-label-md hover:bg-primary-fixed transition-colors shadow-[0_0_15px_rgba(192,193,255,0.3)]"
              >
                Start a chat
              </button>
            </div>
          ) : loading ? (
            <p className="text-center font-label-md text-on-surface-variant">Loading conversation...</p>
          ) : messages.length === 0 ? (
            <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
              Say hello to start the conversation.
            </p>
          ) : (
            messages.map((m) =>
              m.role === 'user' ? (
                <UserBubble key={m.id} message={m} />
              ) : (
                <AIBubble
                  key={m.id}
                  message={m}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                  onToggleHelpful={handleToggleHelpful}
                />
              )
            )
          )}
          {typing && (
            <div className="flex gap-4 self-start max-w-2xl w-full">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-tertiary flex items-center justify-center shrink-0">
                <Icon name="psychology" className="text-white text-sm" />
              </div>
              <div className="glass-panel rounded-2xl rounded-tl-sm p-4 flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-on-surface-variant animate-pulse"></span>
                <span className="w-2 h-2 rounded-full bg-on-surface-variant animate-pulse"></span>
                <span className="w-2 h-2 rounded-full bg-on-surface-variant animate-pulse"></span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-gutter mb-2 bg-error/10 border border-error/30 text-error font-body-sm text-body-sm rounded-lg px-4 py-2">
            {error}
          </div>
        )}

        {/* Composer */}
        <div className="p-gutter pt-0 w-full max-w-4xl mx-auto relative z-20">
          <div className="bg-surface-container-high border border-border-subtle focus-within:border-primary rounded-xl p-2 transition-all duration-300">
            {attachment && (
              <div className="flex items-center gap-2 px-2 pb-2">
                <span className="inline-flex items-center gap-1.5 bg-primary-container/20 border border-primary/30 text-on-primary-container rounded-lg px-2.5 py-1 font-label-md text-[11px] max-w-[240px]">
                  <Icon name="description" className="text-sm shrink-0" />
                  <span className="truncate">{attachment.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  title="Remove attachment"
                  className="text-outline hover:text-error transition-colors"
                >
                  <Icon name="cancel" className="text-[16px]" />
                </button>
                <span className="text-[10px] font-label-md text-outline-variant ml-auto">
                  Will be shared with the AI
                </span>
              </div>
            )}
            <form onSubmit={handleSend} className="flex items-end gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.csv,.json,.log,.pdf,text/plain,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                title="Attach Resume or Document"
                onClick={() => fileRef.current?.click()}
                className={`p-2 rounded-lg hover:bg-surface transition-colors shrink-0 ${
                  attachment ? 'text-primary' : 'text-outline hover:text-primary'
                }`}
              >
                <Icon name="attach_file" className="text-lg" />
              </button>
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  resize();
                }}
                onInput={resize}
                disabled={!activeId}
                placeholder="Type your answer, or ask for guidance..."
                className="w-full bg-transparent border-none text-on-surface font-body-md text-body-md placeholder-outline-variant focus:ring-0 resize-none max-h-32 min-h-[44px] py-2.5 custom-scrollbar outline-none"
              />
              <div className="flex items-center gap-1 shrink-0 pb-1 pr-1">
                <button
                  type="button"
                  title={listening ? 'Stop voice input' : 'Voice input'}
                  onClick={toggleListening}
                  disabled={!activeId || !voiceSupported.current}
                  className={`p-2 rounded-lg transition-colors ${
                    listening
                      ? 'text-white bg-error animate-pulse'
                      : 'text-outline hover:text-primary hover:bg-surface'
                  }`}
                >
                  <Icon name={listening ? 'mic' : 'mic_none'} className="text-lg" />
                </button>
                <button
                  type="submit"
                  disabled={!activeId || typing || (!input.trim() && !attachment)}
                  className="p-2 bg-inverse-primary text-white rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm disabled:opacity-50"
                  title="Send Message"
                >
                  <Icon name="send" className="text-lg" />
                </button>
              </div>
            </form>
          </div>
          <p className="font-label-md text-[10px] text-outline-variant text-center mt-2">
            Voice input works in Chrome or Edge. CareerMind AI can make mistakes. Consider verifying important information.
          </p>
        </div>
      </section>

      {removeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-gutter bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-card border border-border-subtle rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-error/15 border border-error/30 flex items-center justify-center shrink-0">
                <Icon name="delete_forever" className="text-error text-xl" />
              </div>
              <h3 className="font-label-lg text-label-lg text-on-surface">Delete this chat?</h3>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">
              This conversation and all its messages will be permanently removed. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRemoveId(null)}
                disabled={removing}
                className="px-4 py-2 rounded-lg font-label-md text-on-surface-variant hover:bg-surface-variant border border-border-subtle transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={removing}
                className="px-4 py-2 rounded-lg font-label-md bg-error text-white hover:bg-error/80 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Icon name="delete" className="text-base" />
                {removing ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;