'use client';

import type { Audience } from '../lib/listings';
import { useUiLocale } from '../lib/UiLocaleProvider';
import type { MessageKey } from '../lib/uiMessages';

type Props = {
  value: '' | Audience;
  onChange: (audience: '' | Audience) => void;
  /** Larger pills for browse hero areas. */
  variant?: 'hero' | 'inline';
};

const OPTIONS: Array<{ value: '' | Audience; label: MessageKey }> = [
  { value: '', label: 'common.all' },
  { value: 'men', label: 'common.men' },
  { value: 'women', label: 'common.women' },
  { value: 'unisex', label: 'common.unisex' },
];

export default function AudiencePicker({ value, onChange, variant = 'hero' }: Props) {
  const hero = variant === 'hero';
  const { t } = useUiLocale();
  return (
    <div
      role="group"
      aria-label={t('common.shopFor')}
      className={hero ? 'audience-picker' : 'audience-picker audience-picker--inline'}
    >
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value || 'all'}
            type="button"
            aria-pressed={selected}
            className={selected ? 'audience-picker__btn is-selected' : 'audience-picker__btn'}
            onClick={() => onChange(option.value)}
          >
            {t(option.label)}
          </button>
        );
      })}
    </div>
  );
}
