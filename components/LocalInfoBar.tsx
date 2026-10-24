'use client';

import { useEffect, useRef, useState } from 'react';
import { css } from '../lib/css';
import {
  aladhanTimingsByCityUrl,
  aladhanTomorrowDateParam,
  nextPrayer,
  qatarDateKey,
} from '../lib/prayerTimes';
import { useUiLocale } from '../lib/UiLocaleProvider';
import type { MessageKey } from '../lib/uiMessages';

/** Doha — used for weather and prayer times on the public catalogue. */
const DOHA = { lat: 25.2854, lon: 51.531, city: 'Doha', country: 'QA' };

const ALADHAN_METHOD = 10;

/** Homepage social strip — official profiles only. */
const SOCIAL = [
  { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/vsvs8v/' },
  { id: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/@vsvs8s' },
  { id: 'whatsapp', label: 'WhatsApp', href: 'https://wa.me/97472222028' },
] as const;

type WeatherState = { tempC: number; labelKey: MessageKey; isDay: boolean } | null;
type PrayerState = { name: string; time: string } | null;

function weatherLabelKey(code: number): MessageKey {
  if (code === 0) return 'weather.clear';
  if (code === 1) return 'weather.mainlyClear';
  if (code === 2) return 'weather.partlyCloudy';
  if (code === 3) return 'weather.overcast';
  if (code === 45 || code === 48) return 'weather.fog';
  if (code >= 51 && code <= 67) return 'weather.rain';
  if (code >= 71 && code <= 77) return 'weather.snow';
  if (code >= 80 && code <= 82) return 'weather.showers';
  if (code >= 95) return 'weather.thunderstorm';
  return 'weather.doha';
}

const PRAYER_KEYS: Record<string, MessageKey> = {
  Fajr: 'prayer.Fajr',
  Sunrise: 'prayer.Sunrise',
  Dhuhr: 'prayer.Dhuhr',
  Asr: 'prayer.Asr',
  Maghrib: 'prayer.Maghrib',
  Isha: 'prayer.Isha',
};

function SocialIcon({ id }: { id: (typeof SOCIAL)[number]['id'] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    'aria-hidden': true as const,
  };
  switch (id) {
    case 'instagram':
      return (
        <svg {...common}>
          <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 4.5A4.5 4.5 0 1 0 16.5 12 4.5 4.5 0 0 0 12 7.5zm5.2-.9a1.1 1.1 0 1 0 1.1 1.1 1.1 1.1 0 0 0-1.1-1.1zM12 9.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg {...common}>
          <path d="M16.5 3c.4 2.4 1.8 4.1 4 4.5v2.6c-1.4.1-2.7-.3-4-1.1v5.4a5.9 5.9 0 1 1-5.9-5.9c.3 0 .6 0 .9.1v2.8a3.1 3.1 0 1 0 2.2 3V3h2.8z" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg {...common}>
          <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3zm0 1.7a7.3 7.3 0 0 1 6.2 11 7.3 7.3 0 0 1-8.4 1.7l-.5-.3-2.8.7.7-2.7-.3-.5A7.3 7.3 0 0 1 12 4.7zm4.1 9.5c-.2-.1-1.2-.6-1.4-.7s-.3-.1-.5.1-.5.7-.7.8-.3.2-.5.1a6 6 0 0 1-1.8-1.1 6.6 6.6 0 0 1-1.2-1.5c-.1-.2 0-.3.1-.4l.4-.4.1-.3c0-.1 0-.3-.1-.4s-.5-1.2-.7-1.6-.4-.4-.5-.4h-.4c-.1 0-.4.1-.5.3a1.8 1.8 0 0 0-.6 1.3 3.1 3.1 0 0 0 .7 1.7 7.1 7.1 0 0 0 2.7 2.5 9 9 0 0 0 1 .4 2.4 2.4 0 0 0 1.1.1 1.9 1.9 0 0 0 1.2-.8 1.5 1.5 0 0 0 .1-.8c0-.1-.2-.2-.4-.3z" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Doha weather, social strip, and next prayer — sits above the category browse block.
 */
export default function LocalInfoBar() {
  const { t } = useUiLocale();
  const [weather, setWeather] = useState<WeatherState>(null);
  const [prayer, setPrayer] = useState<PrayerState>(null);
  const [prayerFailed, setPrayerFailed] = useState(false);
  const prayerCacheRef = useRef<{
    dateKey: string;
    today: Record<string, string>;
    tomorrow: Record<string, string>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${DOHA.lat}&longitude=${DOHA.lon}&current=temperature_2m,weather_code,is_day&timezone=Asia%2FQatar`;
        const res = await fetch(url);
        if (!res.ok) return;
        const body = (await res.json()) as {
          current?: { temperature_2m?: number; weather_code?: number; is_day?: number };
        };
        const current = body.current;
        if (!current || typeof current.temperature_2m !== 'number') return;
        if (cancelled) return;
        setWeather({
          tempC: Math.round(current.temperature_2m),
          labelKey: weatherLabelKey(current.weather_code ?? 0),
          isDay: current.is_day === 1,
        });
      } catch {
        /* keep empty — bar still shows social + prayer */
      }
    }

    function recomputePrayer() {
      const cache = prayerCacheRef.current;
      if (!cache) return;
      const next = nextPrayer(cache.today, { tomorrowTimings: cache.tomorrow });
      if (!cancelled && next) setPrayer(next);
    }

    async function loadPrayerTimings() {
      const now = new Date();
      const dateKey = qatarDateKey(now);
      if (prayerCacheRef.current?.dateKey === dateKey) {
        recomputePrayer();
        return;
      }

      try {
        const tomorrowParam = aladhanTomorrowDateParam(now);
        const todayUrl = aladhanTimingsByCityUrl(DOHA.city, DOHA.country, ALADHAN_METHOD);
        const tomorrowUrl = aladhanTimingsByCityUrl(
          DOHA.city,
          DOHA.country,
          ALADHAN_METHOD,
          tomorrowParam,
        );
        const [todayRes, tomorrowRes] = await Promise.all([fetch(todayUrl), fetch(tomorrowUrl)]);
        if (!todayRes.ok || !tomorrowRes.ok) throw new Error('Aladhan HTTP error');

        const todayBody = (await todayRes.json()) as { data?: { timings?: Record<string, string> } };
        const tomorrowBody = (await tomorrowRes.json()) as { data?: { timings?: Record<string, string> } };
        const today = todayBody.data?.timings;
        const tomorrow = tomorrowBody.data?.timings;
        if (!today || !tomorrow) throw new Error('Aladhan missing timings');

        prayerCacheRef.current = { dateKey, today, tomorrow };
        if (cancelled) return;
        setPrayerFailed(false);
        recomputePrayer();
      } catch {
        if (!cancelled) setPrayerFailed(true);
      }
    }

    void loadWeather();
    void loadPrayerTimings();
    const tick = window.setInterval(() => {
      void loadPrayerTimings();
    }, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        recomputePrayer();
        void loadPrayerTimings();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <section aria-label={t('info.ariaLabel')} className="local-info-bar" style={css('background: var(--mkt-surface); border-bottom: 1px solid var(--mkt-border)')}>
      <div className="local-info-bar__inner">
        <div className="local-info-bar__weather">
          <span style={css('color: var(--mkt-gold); display: flex; flex-shrink: 0')} aria-hidden="true">
            {weather?.isDay === false ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.5 3.1A8.5 8.5 0 1 0 20.9 14 7 7 0 0 1 14.5 3.1z" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            )}
          </span>
          <div>
            <div style={css('font-size: 18px; font-weight: 800; color: var(--mkt-text); line-height: 1.1')}>
              {weather ? `${weather.tempC}°C` : '—°C'}
            </div>
            <div style={css('font-size: 12px; color: var(--mkt-muted); margin-top: 2px')}>{weather ? t(weather.labelKey) : t('info.dohaWeather')}</div>
          </div>
        </div>

        <div className="local-info-bar__socials">
          <span className="local-info-bar__socials-label" style={css('font-size: 14px; font-weight: 600; color: var(--mkt-text-2)')}>
            {t('info.followUs')}
          </span>
          <nav aria-label={t('info.social')} style={css('display: flex; flex-wrap: wrap; align-items: center; gap: 8px')}>
            {SOCIAL.map((entry) => (
              <a
                key={entry.id}
                href={entry.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={entry.label}
                className="local-info-bar__social"
                style={css('width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; color: #C45A12; border-radius: 8px')}
              >
                <SocialIcon id={entry.id} />
              </a>
            ))}
          </nav>
        </div>

        <div className="local-info-bar__prayer">
          <span style={css('color: var(--mkt-text-2); display: flex; flex-shrink: 0')} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" />
            </svg>
          </span>
          <div>
            <div style={css('font-size: 14px; font-weight: 800; color: var(--mkt-text); line-height: 1.15')}>{t('info.nextPrayer')}</div>
            <div style={css('font-size: 12px; color: var(--mkt-muted); margin-top: 2px')}>
              {prayer
                ? `${PRAYER_KEYS[prayer.name] ? t(PRAYER_KEYS[prayer.name]) : prayer.name} ${prayer.time}`
                : prayerFailed
                  ? t('info.unavailable')
                  : t('info.loading')}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
