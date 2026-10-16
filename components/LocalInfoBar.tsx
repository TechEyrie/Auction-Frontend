'use client';

import { useEffect, useState } from 'react';
import { css } from '../lib/css';
import { whatsappChatUrl } from '../lib/siteContact';

/** Doha — used for weather and prayer times on the public catalogue. */
const DOHA = { lat: 25.2854, lon: 51.531, city: 'Doha', country: 'QA' };

const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

/** Placeholder social destinations until the client supplies official profiles. */
const SOCIAL = [
  { id: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/' },
  { id: 'x', label: 'X', href: 'https://x.com/' },
  { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/' },
  { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/' },
  { id: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/' },
  { id: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/' },
  { id: 'whatsapp', label: 'WhatsApp', href: whatsappChatUrl() },
  { id: 'snapchat', label: 'Snapchat', href: 'https://www.snapchat.com/' },
] as const;

type WeatherState = { tempC: number; label: string; isDay: boolean } | null;
type PrayerState = { name: string; time: string } | null;

function weatherLabel(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code === 1) return 'Mainly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Doha';
}

function parseHm(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatHm(value: string): string {
  const [hRaw, mRaw] = value.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return value;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function nextPrayer(timings: Record<string, string>, now = new Date()): PrayerState {
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  for (const name of PRAYER_ORDER) {
    const raw = timings[name];
    if (!raw) continue;
    const time = raw.split(' ')[0] ?? raw;
    if (parseHm(time) > minutesNow) return { name, time: formatHm(time) };
  }
  const fajr = timings.Fajr?.split(' ')[0];
  if (!fajr) return null;
  return { name: 'Fajr', time: formatHm(fajr) };
}

function SocialIcon({ id }: { id: (typeof SOCIAL)[number]['id'] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    'aria-hidden': true as const,
  };
  switch (id) {
    case 'facebook':
      return (
        <svg {...common}>
          <path d="M14 8h3V5h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6L16 11h-3V9c0-.6.4-1 1-1z" />
        </svg>
      );
    case 'x':
      return (
        <svg {...common}>
          <path d="M4 4h4.4l4.1 5.7L17.3 4H20l-5.7 7.2L20 20h-4.4l-4.3-6L6.7 20H4l6-7.6L4 4z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...common}>
          <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 4.5A4.5 4.5 0 1 0 16.5 12 4.5 4.5 0 0 0 12 7.5zm5.2-.9a1.1 1.1 0 1 0 1.1 1.1 1.1 1.1 0 0 0-1.1-1.1zM12 9.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg {...common}>
          <path d="M6.5 9H3.7v11h2.8V9zM5.1 3.5A1.6 1.6 0 1 0 5.1 6.7 1.6 1.6 0 0 0 5.1 3.5zM20.3 9.1c-1.5 0-2.5.8-2.9 1.6V9H14.6v11h2.8v-5.8c0-1.5.3-3 2.2-3s2 1.6 2 3.1V20h2.8v-6.4c0-3.2-1.7-4.5-3.1-4.5z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...common}>
          <path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 5 12 5 12 5s-6 0-7.7.3a2.7 2.7 0 0 0-1.9 1.9A28 28 0 0 0 2 12a28 28 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9C6 19 12 19 12 19s6 0 7.7-.3a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.8zM10 15.2V8.8L15.5 12 10 15.2z" />
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
    case 'snapchat':
      return (
        <svg {...common}>
          <path d="M12 3c2.6 0 4.7 2 4.7 5.1 0 1.7.1 3.4.8 4.6.3.5.7.8 1.1 1 .4.2.6.5.4.8-.2.4-1 .6-1.6.8-.2.1-.3.2-.3.4 0 .5.6 1 1.1 1.3.4.2.5.5.3.7-.5.5-1.7.7-2.5.8-.3 0-.5.2-.6.5-.3.7-1.1 1.5-3.4 1.5s-3.1-.8-3.4-1.5c-.1-.3-.3-.5-.6-.5-.8-.1-2-.3-2.5-.8-.2-.2-.1-.5.3-.7.5-.3 1.1-.8 1.1-1.3 0-.2-.1-.3-.3-.4-.6-.2-1.4-.4-1.6-.8-.2-.3 0-.6.4-.8.4-.2.8-.5 1.1-1 .7-1.2.8-2.9.8-4.6C7.3 5 9.4 3 12 3z" />
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
  const [weather, setWeather] = useState<WeatherState>(null);
  const [prayer, setPrayer] = useState<PrayerState>(null);

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
          label: weatherLabel(current.weather_code ?? 0),
          isDay: current.is_day === 1,
        });
      } catch {
        /* keep empty — bar still shows social + prayer */
      }
    }

    async function loadPrayer() {
      try {
        const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(DOHA.city)}&country=${encodeURIComponent(DOHA.country)}&method=10`;
        const res = await fetch(url);
        if (!res.ok) return;
        const body = (await res.json()) as { data?: { timings?: Record<string, string> } };
        const timings = body.data?.timings;
        if (!timings) return;
        const next = nextPrayer(timings);
        if (!cancelled && next) setPrayer(next);
      } catch {
        /* optional enrichment */
      }
    }

    void loadWeather();
    void loadPrayer();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-label="Doha weather, social links and next prayer" className="local-info-bar" style={css('background: #FFFFFF; border-bottom: 1px solid #E6E4DF')}>
      <div className="local-info-bar__inner">
        <div className="local-info-bar__weather">
          <span style={css('color: #9A6B12; display: flex; flex-shrink: 0')} aria-hidden="true">
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
            <div style={css('font-size: 18px; font-weight: 800; color: #15191E; line-height: 1.1')}>
              {weather ? `${weather.tempC}°C` : '—°C'}
            </div>
            <div style={css('font-size: 12px; color: #5B636B; margin-top: 2px')}>{weather?.label ?? 'Doha weather'}</div>
          </div>
        </div>

        <div className="local-info-bar__socials">
          <span className="local-info-bar__socials-label" style={css('font-size: 14px; font-weight: 600; color: #2A3036')}>
            Follow us on
          </span>
          <nav aria-label="Social media" style={css('display: flex; flex-wrap: wrap; align-items: center; gap: 8px')}>
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
          <span style={css('color: #2A3036; display: flex; flex-shrink: 0')} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" />
            </svg>
          </span>
          <div>
            <div style={css('font-size: 14px; font-weight: 800; color: #15191E; line-height: 1.15')}>Next Prayer</div>
            <div style={css('font-size: 12px; color: #5B636B; margin-top: 2px')}>
              {prayer ? `${prayer.name} ${prayer.time}` : 'Loading…'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
