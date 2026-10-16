'use client';

import { useEffect, useId, useRef, useState } from 'react';

type Option = { key: string; name: string };

type Props = {
  value: string;
  options: Option[];
  onChange: (key: string) => void;
  label?: string;
  allLabel?: string;
  className?: string;
};

/**
 * Custom category picker — replaces the native <select> for a branded menu.
 */
export default function CategoryMenu({
  value,
  options,
  onChange,
  label = 'Category',
  allLabel = 'All categories',
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.key === value) ?? null;
  const display = selected?.name ?? allLabel;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`cat-menu ${open ? 'is-open' : ''} ${className}`.trim()}>
      <span className="sr">{label}</span>
      <button
        type="button"
        className="cat-menu__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="cat-menu__value">{display}</span>
        <svg className="cat-menu__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <ul id={listId} className="cat-menu__list" role="listbox" aria-label={label}>
          <li role="option" aria-selected={value === ''}>
            <button type="button" className={value === '' ? 'is-active' : undefined} onClick={() => choose('')}>
              {allLabel}
            </button>
          </li>
          {options.map((option) => (
            <li key={option.key} role="option" aria-selected={value === option.key}>
              <button
                type="button"
                className={value === option.key ? 'is-active' : undefined}
                onClick={() => choose(option.key)}
              >
                {option.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
