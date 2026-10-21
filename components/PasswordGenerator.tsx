'use client';

import { useState } from 'react';
import {
  generatePassword,
  PASSWORD_GENERATE_DEFAULT,
  PASSWORD_GENERATE_LENGTHS,
  type PasswordContext,
} from '../lib/passwordPolicy';
import { useUiLocale } from '../lib/UiLocaleProvider';
import './password-strength.css';

export default function PasswordGenerator({
  onGenerate,
  email,
  fullName,
}: {
  onGenerate: (password: string) => void;
  email?: string;
  fullName?: string;
}) {
  const { t } = useUiLocale();
  const [length, setLength] = useState(PASSWORD_GENERATE_DEFAULT);
  const ctx: PasswordContext = { email, fullName };

  return (
    <div className="pw-gen">
      <label className="pw-gen__length">
        <span>{t('password.generateLength')}</span>
        <select
          value={length}
          onChange={(event) => setLength(Number(event.target.value))}
          aria-label={t('password.generateLength')}
        >
          {PASSWORD_GENERATE_LENGTHS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="pw-gen__btn"
        onClick={() => onGenerate(generatePassword(length, ctx))}
      >
        {t('password.generate')}
      </button>
    </div>
  );
}
