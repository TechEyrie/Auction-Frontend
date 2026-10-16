'use client';

import { css } from '../../lib/css';
import { useSession } from '../../lib/session';

/** Overview is deliberately factual: it reports what the server says about the session. */
export default function AdminOverviewPage() {
  const { user, capabilities } = useSession();

  const rows: Array<[string, string]> = [
    ['Reference', user?.publicReference ?? '—'],
    ['Phone', user?.phone ?? '—'],
    ['Email', user?.email ?? 'Not set'],
    ['Status', user?.status ?? '—'],
    ['Access', capabilities.includes('admin.access') ? 'Admin — every permission' : '—'],
    ['Last sign-in', user?.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : '—'],
  ];

  return (
    <div style={css('display: flex; flex-direction: column; gap: 20px')}>
      <section style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 16px; padding: 24px')}>
        <h1 style={css("margin: 0 0 6px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 26px; font-weight: 700")}>Administration</h1>
        <p style={css('margin: 0 0 20px; color: #5B636B')}>
          Signed in as {user?.fullName ?? '—'}. These capabilities come from the server session, not from this page.
        </p>
        <dl style={css('margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px')}>
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt style={css('font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #5B636B')}>{label}</dt>
              <dd style={css('margin: 4px 0 0; font-size: 16px; word-break: break-word')}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 16px; padding: 24px')}>
        <h2 style={css("margin: 0 0 12px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 20px; font-weight: 700")}>Capabilities</h2>
        <ul style={css('list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px')}>
          {capabilities.map((capability) => (
            <li key={capability} style={css('padding: 6px 12px; border: 1px solid #E6E4DF; border-radius: 999px; background: #FBFAF7; font-size: 14px; font-weight: 600')}>{capability}</li>
          ))}
        </ul>
        <p style={css('margin: 16px 0 0; font-size: 14px; color: #5B636B')}>
          Inventory tools are in the sections beside this page: products (listings and their wizard),
          the category tree, category attribute schemas, locations, and media. Auction, finance, and
          content tools appear when your account has the matching capabilities. Every section
          re-checks permissions on the server, so a missing section is a permission answer, not a
          hidden button.
        </p>
      </section>
    </div>
  );
}
