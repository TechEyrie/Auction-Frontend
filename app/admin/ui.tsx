'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { css } from '../../lib/css';

/**
 * Shared, brand-matched building blocks for the administration screens.
 *
 * Every screen shows the same five states — loading, error with retry, empty, ready, and
 * a submitted form's own progress — so those states live here instead of being re-invented
 * per page. Nothing in this module decides authorization: the server does.
 */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="adm-page-header">
      <div style={css('min-width: 0')}>
        <h1>{title}</h1>
        {subtitle && <p className="adm-page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="adm-page-header__actions">{actions}</div>}
    </header>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  labelledBy?: string;
}) {
  const autoId = useId();
  const titleId = labelledBy ?? `adm-modal-title-${autoId}`;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.activeElement;
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      if (prev instanceof HTMLElement) prev.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = size === 'sm' ? 'adm-modal-panel--sm' : size === 'lg' ? 'adm-modal-panel--lg' : 'adm-modal-panel--md';

  return (
    <div
      className="adm-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`adm-modal-panel ${sizeClass}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="adm-modal-head">
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="adm-modal-body">{children}</div>
        {footer && <div className="adm-modal-foot adm-modal-foot--spread">{footer}</div>}
      </div>
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 16px; padding: 20px')}>
      <div style={css('display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; justify-content: space-between; margin-bottom: 16px')}>
        <div style={css('min-width: 0')}>
          <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 20px; font-weight: 700")}>{title}</h2>
          {subtitle && <p style={css('margin: 6px 0 0; color: #5B636B; font-size: 15px')}>{subtitle}</p>}
        </div>
        {actions && <div style={css('display: flex; flex-wrap: wrap; gap: 8px')}>{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** The one place a screen says "loading", "failed" or "nothing here yet". */
export function StateBlock({
  loading,
  error,
  empty,
  emptyText = 'Nothing to show yet.',
  onRetry,
  children,
}: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  emptyText?: string;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <p role="status" className="adm-state" data-state="loading">
        Loading…
      </p>
    );
  }
  if (error) {
    return (
      <div role="alert" className="adm-state" data-state="error">
        <p style={css('margin: 0 0 10px; font-weight: 600')}>{error}</p>
        {onRetry && (
          <button type="button" className="btn-primary" onClick={onRetry} style={css('height: 42px; padding: 0 16px; border: 0; border-radius: 10px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer')}>
            Retry
          </button>
        )}
      </div>
    );
  }
  if (empty) {
    return (
      <p className="adm-state" data-state="empty">
        {emptyText}
      </p>
    );
  }
  return <>{children}</>;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
  return (
    <span className="adm-badge" data-tone={tone}>
      {children}
    </span>
  );
}

/** A form-level failure. Field-level messages are rendered by the field itself. */
export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="adm-note" data-tone="bad">
      {children}
    </p>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="adm-hint">{children}</p>
  );
}

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <span className="adm-field-error" role="alert">
      {children}
    </span>
  );
}

export function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label className="lbl" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

export function PrimaryButton({
  children,
  type = 'submit',
  onClick,
  disabled,
}: {
  children: ReactNode;
  type?: 'submit' | 'button';
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="btn-primary"
      style={css('height: 46px; padding: 0 18px; border: 0; border-radius: 11px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer')}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
  title,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  type?: 'submit' | 'button';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="btn-ghost"
      style={css('height: 42px; padding: 0 14px; border: 1px solid #DAD7D0; border-radius: 10px; background: #FFFFFF; color: #15191E; font: inherit; font-weight: 600; font-size: 14px; cursor: pointer')}
    >
      {children}
    </button>
  );
}

export function Toggle({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <label htmlFor={id} style={css('display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600')}>
      <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} style={css('width: 18px; height: 18px')} />
      {label}
    </label>
  );
}

/** Keyboard-operable table wrapper: the table scrolls, the page never does. */
export function TableWrap({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="adm-table-wrap" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
