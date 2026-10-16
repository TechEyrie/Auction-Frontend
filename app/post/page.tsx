'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { css, PAGE_ROOT } from '../../lib/css';
import { fmt } from '../../lib/format';
import './post.css';

const CATS = [
  { id: 'vehicles', name: 'Vehicles', d: 'M3 13l2-6h14l2 6v4H3z M5 17v2 M19 17v2 M3 13h18' },
  { id: 'property', name: 'Real estate', d: 'M3 11l9-7 9 7v9H3z M9 20v-6h6v6' },
  { id: 'electronics', name: 'Electronics', d: 'M7 3h10v18H7z M11 18h2' },
  { id: 'services', name: 'Services', d: 'M14 6a4 4 0 0 0 5 5l-9 9-3-3 9-9a4 4 0 0 1-2-2z' },
  { id: 'jobs', name: 'Jobs', d: 'M3 8h18v12H3z M8 8V5h8v3 M3 13h18' },
  { id: 'family', name: 'Family & fashion', d: 'M8 3l-5 3 2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z' },
  { id: 'sport', name: 'Sport & fitness', d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M3 12h18' },
  { id: 'travel', name: 'Travel & camping', d: 'M4 8h16v12H4z M9 8V5h6v3' },
  { id: 'numbers', name: 'Special numbers', d: 'M5 9h14 M5 15h14 M10 4L8 20 M16 4l-2 16' },
  { id: 'animals', name: 'Animals & birds', d: 'M5 19C5 9 11 5 20 4c-1 9-5 15-15 15z M5 19l8-8' },
  { id: 'antiques', name: 'Antiques', d: 'M9 3h6 M10 3v3C7 7 5 10 5 14c0 4 3 7 7 7s7-3 7-7c0-4-2-7-5-8V3' },
  { id: 'other', name: 'Everything else', d: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z' },
];

const STEPS = ['Category', 'Details', 'Price', 'Review'];
const DURS = [1, 3, 5, 7];

const TIPS: Record<number, { t: string; l: string[] }> = {
  1: { t: 'Picking a category', l: ['Buyers browse by category, so the right one gets you more views.', 'Not sure? Choose the closest — you can change it later.', 'Plates, numbers and antiques do especially well at auction.'] },
  2: { t: 'Photos that sell', l: ['Shoot in daylight against a plain background.', 'Show every side, plus any marks or damage.', 'Mention the brand, model and age in the title.'] },
  3: { t: 'Fixed price or auction?', l: ['Fixed price suits everyday items with a known value.', 'Auctions suit rare items where buyers may compete.', 'A low starting bid attracts more bidders; use a reserve to stay protected.'] },
  4: { t: 'Before you publish', l: ['Double-check your price and contact details.', 'Keep chats inside the app until you meet.', 'You can edit or remove your ad any time.'] },
};

function num(s: string) {
  const n = parseInt(String(s || '').replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? null : n;
}

const BLANK = {
  step: 1,
  cat: null as string | null,
  title: '',
  desc: '',
  cond: 'Used',
  loc: '',
  photos: 0,
  method: 'fixed',
  price: '',
  offers: true,
  startBid: '',
  inc: '100',
  days: 3,
  reserve: '',
  agree: false,
  done: false,
};

export default function PostAdPage() {
  const [s, setS] = useState(BLANK);
  const set = (patch: Partial<typeof BLANK>) => setS((v) => ({ ...v, ...patch }));
  const setField = (k: keyof typeof BLANK) => (e: { target: { value: string } }) =>
    setS((v) => ({ ...v, [k]: e.target.value }));

  const cat = CATS.filter((c) => c.id === s.cat)[0];
  const isAuction = s.method === 'auction';
  const amount = isAuction ? num(s.startBid) : num(s.price);
  const ok = { 1: !!s.cat, 2: s.title.trim().length >= 3 && !!s.loc, 3: !!amount, 4: s.agree }[s.step] as boolean;

  const steps = STEPS.map((label, i) => {
    const n = i + 1;
    const done = n < s.step;
    const cur = n === s.step;
    return {
      label,
      current: cur ? ('step' as const) : ('false' as const),
      mark: done ? '✓' : String(n),
      bar: n <= s.step ? '#9A6B12' : '#E6E4DF',
      fg: n <= s.step ? '#15191E' : '#5B636B',
      dotBg: n <= s.step ? '#9A6B12' : '#F3F1EC',
      dotFg: n <= s.step ? '#FFFFFF' : '#5B636B',
    };
  });

  const pickStyle = (on: boolean) => ({ border: on ? '#9A6B12' : '#E6E4DF', bg: on ? '#FCF8EF' : '#FFFFFF' });
  const chip = (on: boolean) => ({ border: on ? '#15191E' : '#DAD7D0', bg: on ? '#15191E' : '#FFFFFF', fg: on ? '#FFFFFF' : '#2A3036' });
  const tip = TIPS[s.step];
  const priceText = amount ? fmt(amount) : '—';

  const working = !s.done;
  const done = s.done;
  const s1 = s.step === 1;
  const s2 = s.step === 2;
  const s3 = s.step === 3;
  const s4 = s.step === 4;
  const cats = CATS.map((c) => ({
    name: c.name,
    d: c.d,
    selected: s.cat === c.id,
    pick: () => set({ cat: c.id }),
    ...pickStyle(s.cat === c.id),
  }));
  const photoText = s.photos
    ? s.photos + (s.photos === 1 ? ' photo added — add more' : ' photos added — add more')
    : 'Click to add photos';
  const onPhotos = (e: { target: { files: { length: number } | null } }) => {
    const f = e.target.files;
    set({ photos: Math.min(10, (s.photos || 0) + (f ? f.length : 0)) });
  };
  const title = s.title;
  const onTitle = setField('title');
  const titleCount = s.title.length;
  const desc = s.desc;
  const onDesc = setField('desc');
  const loc = s.loc;
  const onLoc = setField('loc');
  const price = s.price;
  const onPrice = setField('price');
  const startBid = s.startBid;
  const onStart = setField('startBid');
  const inc = s.inc;
  const onInc = setField('inc');
  const reserve = s.reserve;
  const onReserve = setField('reserve');
  const conds = ['New', 'Like new', 'Used'].map((k) => ({
    label: k,
    selected: s.cond === k,
    pick: () => set({ cond: k }),
    ...chip(s.cond === k),
  }));
  const methods = [
    { id: 'fixed', title: 'Fixed price', body: 'Set your price. Buyers message you to buy.' },
    { id: 'auction', title: 'Auction', body: 'Buyers bid against each other. Highest bid wins.' },
  ].map((m) => {
    const on = s.method === m.id;
    return {
      ...m,
      selected: on,
      border: on ? '#9A6B12' : '#E6E4DF',
      bg: on ? '#FCF8EF' : '#FFFFFF',
      ring: on ? '#9A6B12' : '#B9B4AA',
      dot: on ? '#9A6B12' : 'transparent',
      pick: () => set({ method: m.id }),
    };
  });
  const isFixed = !isAuction;
  const offers = s.offers;
  const toggleOffers = () => setS((v) => ({ ...v, offers: !v.offers }));
  const durations = DURS.map((d) => ({
    label: d + (d === 1 ? ' day' : ' days'),
    selected: s.days === d,
    pick: () => set({ days: d }),
    ...chip(s.days === d),
  }));
  const catIcon = cat ? cat.d : CATS[11].d;
  const priceLabel = isAuction ? 'Starting bid' : 'Price';
  const durationText = s.days + 'd 0h';
  const titleShown = s.title.trim() || 'Your ad title';
  const locShown = s.loc || 'Your area';
  const summary = [
    { k: 'Category', v: cat ? cat.name : '—' },
    { k: 'Condition', v: s.cond },
    { k: 'Location', v: s.loc || '—' },
    { k: 'Photos', v: String(s.photos) },
    { k: 'Selling as', v: isAuction ? 'Auction · ' + s.days + ' days' : 'Fixed price' + (s.offers ? ' · offers OK' : '') },
    { k: isAuction ? 'Starting bid' : 'Price', v: priceText },
  ].concat(isAuction ? [
    { k: 'Bid increment', v: fmt(Number(s.inc)) },
    { k: 'Reserve', v: num(s.reserve) ? fmt(num(s.reserve)!) : 'None' },
  ] : []);
  const agree = s.agree;
  const toggleAgree = () => setS((v) => ({ ...v, agree: !v.agree }));
  const atFirst = s.step === 1;
  const blocked = !ok;
  // Nothing on this page publishes: the button reviews the details instead of promising a listing.
  const nextText = s.step === 4 ? 'Review what we would need' : 'Continue';
  const back = () => setS((v) => (v.step > 1 ? { ...v, step: v.step - 1 } : v));
  const forward = () => {
    if (!ok) return;
    setS((v) => (v.step < 4 ? { ...v, step: v.step + 1 } : { ...v, done: true }));
  };
  const tipTitle = tip.t;
  const tips = tip.l.map((x) => ({ text: x }));
  /*
   * Honest ending. Self-service listing is not an approved feature: inventory is created and
   * published by our staff. This page therefore never claims "your ad is live", never invents a
   * public URL for a record that does not exist, and states that the details were not submitted.
   */
  const doneTitle = 'Not submitted — nothing was published';
  const doneBody =
    'Self-service posting is not enabled: every listing is written, reviewed and published by our inventory team, and no contact details are published. The details you entered were not sent to the server and were not stored. Send them to our team instead and we will prepare the listing for you.';
  const reset = () => setS({ ...BLANK });
  return (
    <div style={css(PAGE_ROOT)}>
      <title>Post an ad — Araq &amp; Kahraman Auctions</title>
      <SiteHeader active="sell" showPostAd={false} />

      {/* @generated */}
      <div style={css("max-width: 1120px; margin: 0 auto; padding: 36px 24px 80px")}>
        {working && (
          <Fragment>
          <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(2rem, 3.6vw, 2.75rem); letter-spacing: -0.03em; font-weight: 700; line-height: 1.1")}>Post an ad</h1>            <p style={css("margin: 8px 0 28px; color: #5B636B; font-size: 17px")}>
              Four steps to prepare what our team needs. Nothing is published from this page — our inventory team
              writes and publishes every listing.
            </p>
          <ol aria-label="Progress" style={css("list-style: none; margin: 0 0 28px; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px")}>
            {steps.map((s, i) => (
              <Fragment key={i}>
              <li aria-current={s.current} style={css("display: flex; flex-direction: column; gap: 10px")}>
                <span style={css(`height: 4px; border-radius: 4px; background: ${s.bar}`)}></span>
                <span style={css(`display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: ${s.fg}`)}>
                  <span style={css(`flex: 0 0 26px; height: 26px; border-radius: 50%; background: ${s.dotBg}; color: ${s.dotFg}; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700`)}>{s.mark}</span>
                  {s.label}
                </span>
              </li>
              </Fragment>
            ))}
          </ol>
          <div style={css("display: flex; flex-wrap: wrap; gap: 28px; align-items: flex-start")}>
            <div style={css("flex: 999 1 560px; min-width: 0; background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 22px; padding: clamp(20px, 3vw, 36px)")}>
              {s1 && (
                <Fragment>
                <h2 style={css("margin: 0 0 6px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 24px; font-weight: 700")}>What are you selling?</h2>
                <p style={css("margin: 0 0 22px; color: #5B636B")}>Choose the category that fits best.</p>
                <div style={css("display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px")}>
                  {cats.map((c, i) => (
                    <Fragment key={i}>
                    <button type="button" onClick={c.pick} aria-pressed={c.selected} style={css(`min-height: 104px; padding: 16px; border-radius: 14px; font: inherit; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 10px; border: 1.5px solid ${c.border}; background: ${c.bg}`)}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9A6B12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d={c.d}></path>
                      </svg>
                      <span style={css("font-weight: 600; font-size: 15px; color: #15191E")}>{c.name}</span>
                    </button>
                    </Fragment>
                  ))}
                </div>
                </Fragment>
              )}
              {s2 && (
                <Fragment>
                <h2 style={css("margin: 0 0 6px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 24px; font-weight: 700")}>Describe your item</h2>
                <p style={css("margin: 0 0 22px; color: #5B636B")}>Clear photos and an honest description sell faster.</p>
                <div style={css("display: flex; flex-direction: column; gap: 22px")}>
                  <div>
                    <span className="lbl">Photos</span>
                    <label htmlFor="photos" style={css("display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 150px; border: 2px dashed #E3C78C; border-radius: 16px; background: #FCF8EF; cursor: pointer; text-align: center; padding: 20px")}>
                      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#9A6B12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 8h4l2-3h6l2 3h4v11H3z M12 10a3 3 0 1 0 0 6a3 3 0 1 0 0-6z"></path>
                      </svg>
                      <span style={css("font-weight: 600")}>{photoText}</span>
                      <span style={css("font-size: 13px; color: #5B636B")}>Up to 10 photos · JPG or PNG · first photo is the cover</span>
                    </label>
                    <input id="photos" type="file" accept="image/*" multiple={true} onChange={onPhotos} className="sr" />
                  </div>
                  <div>
                    <label htmlFor="title" className="lbl">Title</label>
                    <input id="title" className="field" maxLength={70} placeholder="e.g. iPhone 16 Pro, 256GB, like new" value={title} onChange={onTitle} />
                    <div className="hint">{titleCount}{" / 70 · Brand, model and the key detail buyers search for."}</div>
                  </div>
                  <div>
                    <label htmlFor="desc" className="lbl">Description</label>
                    <textarea id="desc" rows={5} placeholder="Condition, age, what's included, reason for selling…" value={desc} onChange={onDesc} style={css("width: 100%; border: 1px solid #DAD7D0; border-radius: 12px; padding: 12px 14px; font: inherit; font-size: 16px; color: #15191E; resize: vertical")}></textarea>
                  </div>
                  <div style={css("display: flex; flex-wrap: wrap; gap: 22px")}>
                    <div style={css("flex: 1 1 240px")}>
                      <span className="lbl">Condition</span>
                      <div style={css("display: flex; gap: 8px; flex-wrap: wrap")}>
                        {conds.map((k, i) => (
                          <Fragment key={i}>
                          <button type="button" onClick={k.pick} aria-pressed={k.selected} style={css(`height: 44px; padding: 0 16px; border-radius: 999px; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer; border: 1px solid ${k.border}; background: ${k.bg}; color: ${k.fg}`)}>{k.label}</button>
                          </Fragment>
                        ))}
                      </div>
                    </div>
                    <div style={css("flex: 1 1 240px")}>
                      <label htmlFor="loc" className="lbl">Location</label>
                      <select id="loc" className="field" value={loc} onChange={onLoc} style={css("cursor: pointer")}>
                        <option value="">Choose an area</option>
                        <option>Doha</option>
                        <option>Al Rayyan</option>
                        <option>Al Wakrah</option>
                        <option>Lusail</option>
                        <option>The Pearl</option>
                        <option>West Bay</option>
                        <option>Al Sadd</option>
                        <option>Al Khor</option>
                      </select>
                    </div>
                  </div>
                </div>
                </Fragment>
              )}
              {s3 && (
                <Fragment>
                <h2 style={css("margin: 0 0 6px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 24px; font-weight: 700")}>How do you want to sell?</h2>
                <p style={css("margin: 0 0 22px; color: #5B636B")}>You can switch any time before publishing.</p>
                <div style={css("display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 26px")}>
                  {methods.map((m, i) => (
                    <Fragment key={i}>
                    <button type="button" onClick={m.pick} aria-pressed={m.selected} style={css(`padding: 20px; border-radius: 16px; font: inherit; cursor: pointer; text-align: left; display: flex; gap: 14px; align-items: flex-start; border: 2px solid ${m.border}; background: ${m.bg}`)}>
                      <span style={css(`flex: 0 0 22px; height: 22px; margin-top: 2px; border-radius: 50%; border: 2px solid ${m.ring}; display: flex; align-items: center; justify-content: center`)}>
                        <span style={css(`width: 10px; height: 10px; border-radius: 50%; background: ${m.dot}`)}></span>
                      </span>
                      <span>
                        <span style={css("display: block; font-weight: 700; font-size: 17px; color: #15191E")}>{m.title}</span>
                        <span style={css("display: block; font-size: 14px; color: #5B636B; margin-top: 2px")}>{m.body}</span>
                      </span>
                    </button>
                    </Fragment>
                  ))}
                </div>
                {isFixed && (
                  <Fragment>
                  <div style={css("display: flex; flex-direction: column; gap: 18px; max-width: 420px")}>
                    <div>
                      <label htmlFor="price" className="lbl">Price (QAR)</label>
                      <input id="price" className="field" inputMode="numeric" placeholder="e.g. 3,400" value={price} onChange={onPrice} />
                    </div>
                    <label style={css("display: flex; align-items: center; gap: 10px; cursor: pointer; min-height: 44px")}>
                      <input type="checkbox" checked={offers} onChange={toggleOffers} style={css("width: 20px; height: 20px; accent-color: #9A6B12")} />
                      <span>I'm open to offers</span>
                    </label>
                  </div>
                  </Fragment>
                )}
                {isAuction && (
                  <Fragment>
                  <div style={css("display: flex; flex-direction: column; gap: 20px")}>
                    <div style={css("display: flex; flex-wrap: wrap; gap: 18px")}>
                      <div style={css("flex: 1 1 220px")}>
                        <label htmlFor="start" className="lbl">Starting bid (QAR)</label>
                        <input id="start" className="field" inputMode="numeric" placeholder="e.g. 500" value={startBid} onChange={onStart} />
                      </div>
                      <div style={css("flex: 1 1 220px")}>
                        <label htmlFor="inc" className="lbl">Bid increment</label>
                        <select id="inc" className="field" value={inc} onChange={onInc} style={css("cursor: pointer")}>
                          <option value="50">50 QAR</option>
                          <option value="100">100 QAR</option>
                          <option value="500">500 QAR</option>
                          <option value="1000">1,000 QAR</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <span className="lbl">Auction length</span>
                      <div style={css("display: flex; gap: 8px; flex-wrap: wrap")}>
                        {durations.map((d, i) => (
                          <Fragment key={i}>
                          <button type="button" onClick={d.pick} aria-pressed={d.selected} style={css(`height: 44px; min-width: 80px; padding: 0 16px; border-radius: 10px; font: inherit; font-weight: 600; cursor: pointer; border: 1px solid ${d.border}; background: ${d.bg}; color: ${d.fg}`)}>{d.label}</button>
                          </Fragment>
                        ))}
                      </div>
                    </div>
                    <div style={css("max-width: 420px")}>
                      <label htmlFor="reserve" className="lbl">
                        {"Reserve price "}
                        <span style={css("font-weight: 400; color: #5B636B")}>(optional)</span>
                      </label>
                      <input id="reserve" className="field" inputMode="numeric" placeholder="Lowest price you'll accept" value={reserve} onChange={onReserve} />
                      <div className="hint">Hidden from bidders. If bidding doesn't reach it, you don't have to sell.</div>
                    </div>
                  </div>
                  </Fragment>
                )}
                </Fragment>
              )}
              {s4 && (
                <Fragment>
                <h2 style={css("margin: 0 0 6px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 24px; font-weight: 700")}>Review and publish</h2>
                <p style={css("margin: 0 0 22px; color: #5B636B")}>This is how buyers will see your ad.</p>
                <div style={css("display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start")}>
                  <article style={css("flex: 0 1 280px; background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 18px; overflow: hidden; box-shadow: 0 14px 32px -20px rgba(21,25,30,.35)")}>
                    <div style={css("position: relative; height: 170px; background: #EFE8DA; display: flex; align-items: center; justify-content: center")}>
                      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#15191E" strokeOpacity=".42" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d={catIcon}></path>
                      </svg>
                      {isAuction && (
                        <Fragment>
                        <span style={css("position: absolute; top: 12px; left: 12px; padding: 5px 10px; border-radius: 999px; background: #FFFFFF; font-size: 13px; font-weight: 700; color: #C2410C")}>{durationText}{" left"}</span>
                        </Fragment>
                      )}
                    </div>
                    <div style={css("padding: 16px")}>
                      <div style={css("font-size: 12px; color: #5B636B")}>{priceLabel}</div>
                      <div style={css("font-family: 'Schibsted Grotesk', sans-serif; font-size: 20px; font-weight: 700")}>{priceText}</div>
                      <h3 style={css("margin: 4px 0 0; font-size: 15px; font-weight: 500")}>{titleShown}</h3>
                      <p style={css("margin: 4px 0 0; font-size: 13px; color: #5B636B")}>{locShown}{" · Just now"}</p>
                    </div>
                  </article>
                  <dl style={css("flex: 1 1 260px; margin: 0")}>
                    {summary.map((r, i) => (
                      <Fragment key={i}>
                      <div style={css("display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid #EEECE7")}>
                        <dt style={css("color: #5B636B")}>{r.k}</dt>
                        <dd style={css("margin: 0; font-weight: 600; text-align: right")}>{r.v}</dd>
                      </div>
                      </Fragment>
                    ))}
                    <label style={css("display: flex; align-items: flex-start; gap: 10px; cursor: pointer; margin-top: 18px")}>
                      <input type="checkbox" checked={agree} onChange={toggleAgree} style={css("width: 20px; height: 20px; margin-top: 2px; accent-color: #9A6B12")} />
                      <span style={css("font-size: 15px")}>
                        {"I confirm this ad follows the "}
                        <Link href="/legal" style={css("font-weight: 600")}>terms of use</Link>
                        .
                      </span>
                    </label>
                  </dl>
                </div>
                </Fragment>
              )}
              <div style={css("display: flex; justify-content: space-between; gap: 12px; margin-top: 32px; padding-top: 22px; border-top: 1px solid #EEECE7")}>
                <button type="button" onClick={back} disabled={atFirst} className="btn-ghost" style={css("height: 50px; padding: 0 22px; border: 1px solid #DAD7D0; border-radius: 12px; background: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer; color: #15191E")}>Back</button>
                <button type="button" onClick={forward} disabled={blocked} className="btn-primary" style={css("height: 50px; padding: 0 28px; border: 0; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 700; font-size: 16px; cursor: pointer")}>{nextText}</button>
              </div>
            </div>
            <aside aria-label="Tips" style={css("flex: 1 1 280px; min-width: 0; background: #F6EEDC; border-radius: 22px; padding: 24px")}>
              <h2 style={css("margin: 0 0 10px; font-size: 17px; font-weight: 700; display: flex; gap: 8px; align-items: center")}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7D5610" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 18h6 M10 21h4 M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"></path>
                </svg>
                {tipTitle}
              </h2>
              <ul style={css("margin: 0; padding-left: 20px; color: #3D3420; display: flex; flex-direction: column; gap: 8px; font-size: 15px")}>
                {tips.map((t, i) => (
                  <Fragment key={i}>
                  <li>{t.text}</li>
                  </Fragment>
                ))}
              </ul>
            </aside>
          </div>
          </Fragment>
        )}
        {done && (
          <Fragment>
          <div style={css("max-width: 620px; margin: 40px auto; background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 24px; padding: 48px 32px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px")}>
            <span style={css("width: 72px; height: 72px; border-radius: 50%; background: #F6EEDC; display: flex; align-items: center; justify-content: center")}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9A6B12" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5 9-10"></path>
              </svg>
            </span>
            <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 30px; letter-spacing: -0.02em; font-weight: 700")}>{doneTitle}</h1>
            <p role="status" style={css('margin: 0; color: #5B636B; max-width: 52ch')}>{doneBody}</p>
            <div style={css('display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 10px')}>
              <Link href="/contact" className="btn-primary" style={css('height: 50px; padding: 0 22px; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font-weight: 700; display: flex; align-items: center')}>
                Contact the team
              </Link>
              <Link href="/browse" className="btn-ghost" style={css('height: 50px; padding: 0 22px; border: 1px solid #DAD7D0; border-radius: 12px; background: #FFFFFF; font-weight: 600; color: #15191E; display: flex; align-items: center')}>
                Browse published listings
              </Link>
              <button type="button" onClick={reset} className="btn-ghost" style={css('height: 50px; padding: 0 22px; border: 1px solid #DAD7D0; border-radius: 12px; background: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer; color: #15191E')}>
                Start over
              </button>
            </div>
          </div>
          </Fragment>
        )}
      </div>
{/* @end-generated */}

      <SiteFooter />
    </div>
  );
}
