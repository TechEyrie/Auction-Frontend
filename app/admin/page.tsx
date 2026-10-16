'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiFetch } from '../../lib/api';
import { css } from '../../lib/css';
import { fmtMinor } from '../../lib/format';
import { useSession } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';
import { GhostButton, PageHeader, Panel, StateBlock } from './ui';

type ListingRow = {
  listingReference: string;
  status: string;
  listingMethod: string;
  audience?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
};

type ListingsPage = { listings: ListingRow[]; total: number };
type AuctionsPage = { auctions: Array<{ status: string; bidCount?: number; currentAmountMinor?: number | null }>; total: number };
type FinanceSummary = {
  collectedRevenueMinor: number;
  awaitingPaymentCount?: number;
  unpaidWins?: number;
  orderCount: number;
};
type EnquiriesPage = { enquiries: Array<{ status: string }> };

const CHART = {
  gold: '#9A6B12',
  dark: '#15191E',
  amber: '#D4A84B',
  terracotta: '#C45A12',
  green: '#2F6B3A',
  slate: '#5B636B',
  mist: '#AEB5B0',
  cream: '#F6EEDC',
};

const METHOD_LABEL: Record<string, string> = {
  auction: 'Auction',
  fixed_price: 'Fixed price',
  enquiry: 'Enquiry',
};

const AUDIENCE_LABEL: Record<string, string> = {
  men: 'Men',
  women: 'Women',
  unisex: 'Unisex',
  all: 'All',
};

const STATUS_COLORS: Record<string, string> = {
  published: CHART.gold,
  draft: CHART.mist,
  archived: CHART.slate,
  live: CHART.terracotta,
  scheduled: CHART.amber,
  closed: CHART.dark,
  cancelled: CHART.mist,
  paid: CHART.green,
  awaiting: CHART.terracotta,
};

function countBy(items: string[]): Array<{ name: string; value: number }> {
  const map = new Map<string, number>();
  for (const key of items) map.set(key, (map.get(key) ?? 0) + 1);
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function publishedTrend(listings: ListingRow[]): Array<{ day: string; listings: number }> {
  const buckets = new Map<string, number>();
  for (let i = 6; i >= 0; i -= 1) buckets.set(daysAgoIso(i), 0);
  for (const listing of listings) {
    const stamp = listing.publishedAt ?? listing.createdAt;
    if (!stamp) continue;
    const day = new Date(stamp).toISOString().slice(0, 10);
    if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([day, listingsCount]) => ({
    day: day.slice(5),
    listings: listingsCount,
  }));
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 10px; padding: 10px 12px; box-shadow: 0 10px 24px rgba(21,25,30,.12)')}>
      {label ? <div style={css('font-size: 12px; font-weight: 700; color: #5B636B; margin-bottom: 6px')}>{label}</div> : null}
      {payload.map((entry) => (
        <div key={entry.name} style={css('display: flex; gap: 8px; align-items: center; font-size: 13px; font-weight: 600; color: #15191E')}>
          <span style={css(`width: 8px; height: 8px; border-radius: 50%; background: ${entry.color ?? CHART.gold}`)} />
          {entry.name}: {entry.value}
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 16px; padding: 18px 20px')}>
      <div style={css('font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #5B636B')}>{label}</div>
      <div style={css("margin-top: 8px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 28px; font-weight: 800; color: #15191E; letter-spacing: -0.02em")}>
        {value}
      </div>
      {hint ? <div className="adm-hint" style={css('margin-top: 6px')}>{hint}</div> : null}
    </div>
  );
}

type DashboardBundle = {
  publishedTotal: number;
  draftTotal: number;
  archivedTotal: number;
  published: ListingRow[];
  auctions: AuctionsPage['auctions'];
  auctionsTotal: number;
  finance: FinanceSummary | null;
  enquiries: EnquiriesPage['enquiries'];
};

/** Overview with live inventory / auction / finance charts from admin APIs. */
export default function AdminOverviewPage() {
  const { user, capabilities } = useSession();
  const canFinance = capabilities.includes('finance.view');
  const canAuctions = capabilities.includes('auctions.manage');
  const canContent = capabilities.includes('content.manage');

  const dash = useAsync<DashboardBundle>(async () => {
    const [publishedPage, draftPage, archivedPage, publishedSample, auctionsPage, finance, enquiries] = await Promise.all([
      apiFetch<ListingsPage>('/api/admin/listings?status=published&limit=1'),
      apiFetch<ListingsPage>('/api/admin/listings?status=draft&limit=1'),
      apiFetch<ListingsPage>('/api/admin/listings?status=archived&limit=1'),
      apiFetch<ListingsPage>('/api/admin/listings?status=published&limit=100'),
      canAuctions ? apiFetch<AuctionsPage>('/api/admin/auctions?limit=100') : Promise.resolve({ auctions: [], total: 0 }),
      canFinance ? apiFetch<FinanceSummary>('/api/admin/finance/summary') : Promise.resolve(null),
      canContent ? apiFetch<EnquiriesPage>('/api/admin/enquiries') : Promise.resolve({ enquiries: [] }),
    ]);
    return {
      publishedTotal: publishedPage.total,
      draftTotal: draftPage.total,
      archivedTotal: archivedPage.total,
      published: publishedSample.listings ?? [],
      auctions: auctionsPage.auctions ?? [],
      auctionsTotal: auctionsPage.total,
      finance,
      enquiries: enquiries.enquiries ?? [],
    };
  }, [canFinance, canAuctions, canContent]);

  const charts = useMemo(() => {
    const data = dash.data;
    if (!data) return null;

    const statusBars = [
      { name: 'Published', value: data.publishedTotal, fill: STATUS_COLORS.published },
      { name: 'Draft', value: data.draftTotal, fill: STATUS_COLORS.draft },
      { name: 'Archived', value: data.archivedTotal, fill: STATUS_COLORS.archived },
    ];

    const methods = countBy(data.published.map((row) => METHOD_LABEL[row.listingMethod] ?? row.listingMethod));
    const audiences = countBy(
      data.published.map((row) => AUDIENCE_LABEL[row.audience ?? ''] ?? (row.audience ? String(row.audience) : 'Unset')),
    );
    const auctionStatus = countBy(data.auctions.map((row) => row.status));
    const enquiryStatus = countBy(data.enquiries.map((row) => row.status || 'open'));
    const trend = publishedTrend(data.published);

    const awaiting = data.finance?.awaitingPaymentCount ?? data.finance?.unpaidWins ?? 0;
    const paidOrders = Math.max(0, (data.finance?.orderCount ?? 0) - awaiting);
    const financeBars = data.finance
      ? [
          { name: 'Paid', value: paidOrders, fill: STATUS_COLORS.paid },
          { name: 'Awaiting', value: awaiting, fill: STATUS_COLORS.awaiting },
        ]
      : [];

    const liveAuctions = data.auctions.filter((row) => row.status === 'live').length;
    const bidVolume = data.auctions.reduce((sum, row) => sum + (row.bidCount ?? 0), 0);

    return {
      statusBars,
      methods,
      audiences,
      auctionStatus,
      enquiryStatus,
      trend,
      financeBars,
      liveAuctions,
      bidVolume,
      inventoryTotal: data.publishedTotal + data.draftTotal + data.archivedTotal,
    };
  }, [dash.data]);

  const pieColors = [CHART.gold, CHART.terracotta, CHART.amber, CHART.dark, CHART.green, CHART.mist];

  return (
    <div style={css('display: flex; flex-direction: column; gap: 18px')}>
      <PageHeader
        title="Administration"
        subtitle={`Signed in as ${user?.fullName ?? '—'}. Live catalogue metrics from the server.`}
        actions={
          <GhostButton type="button" onClick={() => dash.reload()} disabled={dash.loading}>
            {dash.loading ? 'Refreshing…' : 'Refresh charts'}
          </GhostButton>
        }
      />

      <StateBlock loading={!dash.data && !dash.error} error={dash.error} empty={false} onRetry={dash.reload}>
        {charts && dash.data ? (
          <>
            <div style={css('display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px')}>
              <StatCard label="Published" value={String(dash.data.publishedTotal)} hint="Live on the public site" />
              <StatCard label="Drafts" value={String(dash.data.draftTotal)} hint="Not yet published" />
              <StatCard label="Live auctions" value={String(charts.liveAuctions)} hint={`${dash.data.auctionsTotal} lots total`} />
              {dash.data.finance ? (
                <StatCard
                  label="Collected"
                  value={fmtMinor(dash.data.finance.collectedRevenueMinor)}
                  hint={`${dash.data.finance.orderCount} orders`}
                />
              ) : (
                <StatCard label="Inventory" value={String(charts.inventoryTotal)} hint="All listing statuses" />
              )}
            </div>

            <div style={css('display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px')}>
              <Panel title="Listings by status">
                <div style={css('width: 100%; height: 280px')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.statusBars} barSize={36} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#F0EEE9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#5B636B', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: '#5B636B', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(154,107,18,0.06)' }} />
                      <Bar dataKey="value" name="Listings" radius={[8, 8, 0, 0]}>
                        {charts.statusBars.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Published methods">
                <div style={css('width: 100%; height: 280px')}>
                  {charts.methods.length === 0 ? (
                    <p className="adm-hint">No published listings yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={charts.methods} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                          {charts.methods.map((entry, index) => (
                            <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend verticalAlign="bottom" height={28} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Panel>

              <Panel title="Audience mix">
                <div style={css('width: 100%; height: 280px')}>
                  {charts.audiences.length === 0 ? (
                    <p className="adm-hint">No audience data on published listings.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={charts.audiences} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88} paddingAngle={2}>
                          {charts.audiences.map((entry, index) => (
                            <Cell key={entry.name} fill={pieColors[(index + 2) % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend verticalAlign="bottom" height={28} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Panel>

              {canAuctions ? (
                <Panel title="Auctions by status">
                  <div style={css('width: 100%; height: 280px')}>
                    {charts.auctionStatus.length === 0 ? (
                      <p className="adm-hint">No auction lots yet.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={charts.auctionStatus} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                          <CartesianGrid stroke="#F0EEE9" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fill: '#5B636B', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" width={88} tick={{ fill: '#5B636B', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(154,107,18,0.06)' }} />
                          <Bar dataKey="value" name="Lots" radius={[0, 8, 8, 0]} barSize={18}>
                            {charts.auctionStatus.map((entry) => (
                              <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? CHART.gold} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <p className="adm-hint" style={css('margin-top: 4px')}>
                    {charts.bidVolume} accepted bids across loaded lots
                  </p>
                </Panel>
              ) : null}

              {canFinance && charts.financeBars.length > 0 ? (
                <Panel title="Orders — paid vs awaiting">
                  <div style={css('width: 100%; height: 280px')}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={charts.financeBars} barSize={42} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="#F0EEE9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#5B636B', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: '#5B636B', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(154,107,18,0.06)' }} />
                        <Bar dataKey="value" name="Orders" radius={[8, 8, 0, 0]}>
                          {charts.financeBars.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              ) : null}

              <Panel title="Published this week">
                <div style={css('width: 100%; height: 280px')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={charts.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="admPublishFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART.gold} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={CHART.gold} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#F0EEE9" vertical={false} />
                      <XAxis dataKey="day" tick={{ fill: '#5B636B', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: '#5B636B', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="listings" name="Published" stroke={CHART.gold} strokeWidth={2.5} fill="url(#admPublishFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              {canContent ? (
                <Panel title="Enquiries">
                  <div style={css('width: 100%; height: 280px')}>
                    {charts.enquiryStatus.length === 0 ? (
                      <p className="adm-hint">No enquiries yet.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={charts.enquiryStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={86} paddingAngle={3}>
                            {charts.enquiryStatus.map((entry, index) => (
                              <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                          <Legend verticalAlign="bottom" height={28} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Panel>
              ) : null}
            </div>
          </>
        ) : null}
      </StateBlock>
    </div>
  );
}
