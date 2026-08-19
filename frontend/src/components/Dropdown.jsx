import { useEffect, useRef, useState } from 'react';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const Dropdown = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  label,
  searchable = false,
  allowCustom = false,
  customLabel = 'Use this custom value',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [draft, setDraft] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const draftRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setCustomMode(false);
      setQuery('');
    }
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      setQuery('');
      setTimeout(() => searchRef.current?.focus(), 10);
    }
  }, [open, searchable]);

  const filtered = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const exactMatch = filtered.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());
  const showCustom = searchable && query.trim() && !exactMatch;

  const openCustom = () => {
    const isCustomValue =
      value && !options.some((o) => o.value === value) && !options.some((o) => o.label === value);
    setCustomMode(true);
    setDraft(isCustomValue ? String(value) : '');
    setTimeout(() => draftRef.current?.focus(), 10);
  };

  const confirmCustom = () => {
    const v = draft.trim();
    if (!v) return;
    onChange(v);
    setOpen(false);
  };

  const pickMatching = (o) => {
    onChange(o.value);
    setOpen(false);
  };

  const matchingHints = customMode && draft.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(draft.trim().toLowerCase()))
    : [];

  const isSelected = value && !options.some((o) => o.value === value) && !options.some((o) => o.label === value);

  return (
    <div ref={rootRef} className={`relative ${className || ''}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 bg-surface-container-highest border rounded-lg px-4 py-3 text-left font-body-md text-body-md transition-all ${
          open
            ? 'border-primary ring-1 ring-primary'
            : 'border-border-subtle hover:border-primary/50'
        } ${value ? 'text-on-surface' : 'text-outline-variant'}`}
      >
        <span className="truncate">
          {value ? (searchable ? value : value) : placeholder}
        </span>
        <Icon
          name="expand_more"
          className={`text-on-surface-variant transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full bg-surface-container-high border border-border-subtle rounded-xl shadow-2xl animate-scale-in overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-border-subtle">
              <div className="relative">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[16px]" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-surface-card border border-border-subtle rounded-lg pl-9 pr-3 py-2 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary placeholder:text-outline-variant"
                />
              </div>
            </div>
          )}

          {customMode ? (
            <div className="p-2">
              <div className="relative">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[16px]" />
                <input
                  ref={draftRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmCustom();
                  }}
                  placeholder="Type your own option..."
                  className="w-full bg-surface-card border border-border-subtle rounded-lg pl-9 pr-3 py-2 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary placeholder:text-outline-variant"
                />
              </div>

              {matchingHints.length > 0 && (
                <div className="mt-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                  {matchingHints.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => pickMatching(o)}
                      className="w-full text-left px-3 py-2 rounded-lg font-body-sm text-body-sm text-on-surface hover:bg-surface-container-high transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{o.label}</span>
                      <Icon name="check" className="text-primary text-[16px] shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={confirmCustom}
                  disabled={!draft.trim()}
                  className="flex-1 bg-primary text-on-primary font-label-md text-label-md px-3 py-2 rounded-lg hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="add" className="text-[16px]" />
                  Use &quot;{draft.trim()}&quot;
                </button>
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className="px-3 py-2 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high border border-border-subtle transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <div ref={listRef} className="max-h-64 overflow-y-auto custom-scrollbar p-1.5">
              {filtered.length === 0 && !showCustom ? (
                <p className="px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">
                  No matches.
                </p>
              ) : (
                <>
                  {filtered.map((opt) => {
                    const active = opt.value === value || opt.label === value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg font-body-sm text-body-sm flex items-center justify-between gap-2 transition-colors ${
                          active
                            ? 'bg-primary/15 text-primary font-semibold'
                            : 'text-on-surface hover:bg-surface-container-high'
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {active && <Icon name="check" className="text-primary text-[16px] shrink-0" />}
                      </button>
                    );
                  })}
                  {showCustom && (
                    <button
                      type="button"
                      onClick={() => {
                        onChange(query.trim());
                        setOpen(false);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-lg font-body-sm text-body-sm flex items-center gap-2 text-secondary hover:bg-surface-container-high transition-colors border-t border-border-subtle mt-1"
                    >
                      <Icon name="add" className="text-[16px] shrink-0" />
                      <span className="truncate">{customLabel}: {query.trim()}</span>
                    </button>
                  )}
                  {allowCustom && (
                    <button
                      type="button"
                      onClick={openCustom}
                      className="w-full text-left px-3 py-2.5 rounded-lg font-body-sm text-body-sm flex items-center gap-2 text-secondary hover:bg-surface-container-high transition-colors border-t border-border-subtle mt-1"
                    >
                      <Icon name="add" className="text-[16px] shrink-0" />
                      <span className="truncate">Others — type your own…</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dropdown;