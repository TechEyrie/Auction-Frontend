'use client';

import {
  evaluatePassword,
  type PasswordIssue,
  type PasswordStrength,
} from '../lib/passwordPolicy';
import { useUiLocale } from '../lib/UiLocaleProvider';
import type { MessageKey } from '../lib/uiMessages';
import './password-strength.css';

const ISSUE_KEY: Record<PasswordIssue, MessageKey> = {
  too_short: 'password.tooShort',
  too_long: 'password.tooLong',
  too_common: 'password.tooCommon',
  personal: 'password.personal',
  low_variety: 'password.lowVariety',
  repetitive: 'password.repetitive',
  sequential: 'password.sequential',
};

const LABEL_KEY: Record<PasswordStrength['label'], MessageKey> = {
  'too-weak': 'password.tooWeak',
  weak: 'password.weak',
  fair: 'password.fair',
  good: 'password.good',
  strong: 'password.strong',
};

export function passwordFieldMessage(result: PasswordStrength, t: (key: MessageKey) => string): string {
  const first = result.issues[0];
  if (first) return t(ISSUE_KEY[first]);
  if (!result.acceptable) return t('password.notStrongEnough');
  return '';
}

export default function PasswordStrength({
  password,
  email,
  fullName,
}: {
  password: string;
  email?: string;
  fullName?: string;
}) {
  const { t } = useUiLocale();
  const result = evaluatePassword(password, { email, fullName });
  const idle = password.length === 0;
  const filled = idle ? 0 : Math.max(result.score, 1);

  return (
    <div className="pw-strength" data-score={idle ? undefined : result.score}>
      <div className="pw-strength__bars" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className={index < filled ? 'pw-strength__bar is-on' : 'pw-strength__bar'} />
        ))}
      </div>
      <p className="pw-strength__label" role="status">
        {idle ? t('password.hint') : t(LABEL_KEY[result.label])}
      </p>
      <ul className="pw-strength__reqs">
        <li data-ok={password.length >= 10 ? 'true' : 'false'}>{t('password.reqLength')}</li>
        <li data-ok={result.classes >= 2 && password.length >= 10 ? 'true' : 'false'}>{t('password.reqVariety')}</li>
        <li
          data-ok={
            password.length > 0 &&
            !result.issues.includes('too_common') &&
            !result.issues.includes('sequential') &&
            !result.issues.includes('repetitive')
              ? 'true'
              : 'false'
          }
        >
          {t('password.reqUncommon')}
        </li>
        <li data-ok={password.length > 0 && !result.issues.includes('personal') ? 'true' : 'false'}>
          {t('password.reqNotPersonal')}
        </li>
      </ul>
    </div>
  );
}
