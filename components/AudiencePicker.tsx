'use client';

import { css } from '../lib/css';
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
      style={css(
        hero
          ? 'display: flex; flex-wrap: wrap; gap: 10px; padding: 6px; border-radius: 16px; background: #FBFAF7; border: 1px solid #E6E4DF'
          : 'display: flex; flex-wrap: wrap; gap: 8px',
      )}
    >
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value || 'all'}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            style={css(
              hero
                ? `flex: 1 1 0; min-width: 0; min-height: 48px; padding: 0 12px; border-radius: 12px; border: 2px solid ${selected ? '#9A6B12' : 'transparent'}; background: ${selected ? '#15191E' : '#FFFFFF'}; color: ${selected ? '#FBFAF7' : '#15191E'}; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: ${selected ? '0 10px 28px -18px rgba(21,25,30,.55)' : 'none'}`
                : `height: 40px; padding: 0 16px; border-radius: 999px; border: 1px solid ${selected ? '#9A6B12' : '#E6E4DF'}; background: ${selected ? '#F6EEDC' : '#FFFFFF'}; color: ${selected ? '#7D5610' : '#2A3036'}; font: inherit; font-size: 14px; font-weight: ${selected ? 700 : 600}; cursor: pointer`,
            )}
          >
            {t(option.label)}
          </button>
        );
      })}
    </div>
  );
}
