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
import { useUiLocale } from '../../lib/UiLocaleProvider';
import { methodLabel } from '../../lib/uiMessages';
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
  const { t, lang } = useUiLocale();
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
      { name: t('admin.overview.chartPublished'), value: data.publishedTotal, fill: STATUS_COLORS.published },
      { name: t('admin.overview.chartDraft'), value: data.draftTotal, fill: STATUS_COLORS.draft },
      { name: t('admin.overview.chartArchived'), value: data.archivedTotal, fill: STATUS_COLORS.archived },
    ];

    const audienceName = (audience: string | null | undefined) => {
      if (!audience) return t('admin.overview.chartUnset');
      if (audience === 'men') return t('common.men');
      if (audience === 'women') return t('common.women');
      if (audience === 'unisex') return t('common.unisex');
      if (audience === 'all') return t('common.all');
      return audience;
    };

    const methods = countBy(data.published.map((row) => methodLabel(lang, row.listingMethod)));
    const audiences = countBy(data.published.map((row) => audienceName(row.audience)));
    const auctionStatus = countBy(data.auctions.map((row) => row.status));
    const enquiryStatus = countBy(data.enquiries.map((row) => row.status || 'open'));
    const trend = publishedTrend(data.published);

    const awaiting = data.finance?.awaitingPaymentCount ?? data.finance?.unpaidWins ?? 0;
    const paidOrders = Math.max(0, (data.finance?.orderCount ?? 0) - awaiting);
    const financeBars = data.finance
      ? [
          { name: t('admin.overview.chartPaid'), value: paidOrders, fill: STATUS_COLORS.paid },
          { name: t('admin.overview.chartAwaiting'), value: awaiting, fill: STATUS_COLORS.awaiting },
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
  }, [dash.data, lang, t]);

  const pieColors = [CHART.gold, CHART.terracotta, CHART.amber, CHART.dark, CHART.green, CHART.mist];

  return (
    <div style={css('display: flex; flex-direction: column; gap: 18px')}>
      <PageHeader
        title={t('admin.overview.title')}
        subtitle={t('admin.overview.subtitle', { name: user?.fullName ?? '—' })}
        actions={
          <GhostButton type="button" onClick={() => dash.reload()} disabled={dash.loading}>
            {dash.loading ? t('admin.overview.refreshing') : t('admin.overview.refresh')}
          </GhostButton>
        }
      />

      <StateBlock loading={!dash.data && !dash.error} error={dash.error} empty={false} onRetry={dash.reload}>
        {charts && dash.data ? (
          <>
            <div style={css('display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px')}>
              <StatCard label={t('admin.overview.statPublished')} value={String(dash.data.publishedTotal)} hint={t('admin.overview.statPublishedHint')} />
              <StatCard label={t('admin.overview.statDrafts')} value={String(dash.data.draftTotal)} hint={t('admin.overview.statDraftsHint')} />
              <StatCard label={t('admin.overview.statLiveAuctions')} value={String(charts.liveAuctions)} hint={t('admin.overview.statLotsTotal', { count: dash.data.auctionsTotal })} />
              {dash.data.finance ? (
                <StatCard
                  label={t('admin.overview.statCollected')}
                  value={fmtMinor(dash.data.finance.collectedRevenueMinor)}
                  hint={t('admin.overview.statOrders', { count: dash.data.finance.orderCount })}
                />
              ) : (
                <StatCard label={t('admin.overview.statInventory')} value={String(charts.inventoryTotal)} hint={t('admin.overview.statInventoryHint')} />
              )}
            </div>

            <div style={css('display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px')}>
              <Panel title={t('admin.overview.chartListingsByStatus')}>
                <div style={css('width: 100%; height: 280px')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.statusBars} barSize={36} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#F0EEE9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#5B636B', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: '#5B636B', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(154,107,18,0.06)' }} />
                      <Bar dataKey="value" name={t('admin.overview.chartListings')} radius={[8, 8, 0, 0]}>
                        {charts.statusBars.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title={t('admin.overview.chartPublishedMethods')}>
                <div style={css('width: 100%; height: 280px')}>
                  {charts.methods.length === 0 ? (
                    <p className="adm-hint">{t('admin.overview.noPublishedListings')}</p>
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

              <Panel title={t('admin.overview.chartAudienceMix')}>
                <div style={css('width: 100%; height: 280px')}>
                  {charts.audiences.length === 0 ? (
                    <p className="adm-hint">{t('admin.overview.noAudienceData')}</p>
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
                <Panel title={t('admin.overview.chartAuctionsByStatus')}>
                  <div style={css('width: 100%; height: 280px')}>
                    {charts.auctionStatus.length === 0 ? (
                      <p className="adm-hint">{t('admin.overview.noAuctionLots')}</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={charts.auctionStatus} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                          <CartesianGrid stroke="#F0EEE9" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fill: '#5B636B', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" width={88} tick={{ fill: '#5B636B', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(154,107,18,0.06)' }} />
                          <Bar dataKey="value" name={t('admin.overview.chartLots')} radius={[0, 8, 8, 0]} barSize={18}>
                            {charts.auctionStatus.map((entry) => (
                              <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? CHART.gold} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <p className="adm-hint" style={css('margin-top: 4px')}>
                    {t('admin.overview.bidVolume', { count: charts.bidVolume })}
                  </p>
                </Panel>
              ) : null}

              {canFinance && charts.financeBars.length > 0 ? (
                <Panel title={t('admin.overview.chartOrdersPaid')}>
                  <div style={css('width: 100%; height: 280px')}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={charts.financeBars} barSize={42} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="#F0EEE9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#5B636B', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: '#5B636B', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(154,107,18,0.06)' }} />
                        <Bar dataKey="value" name={t('admin.overview.chartOrders')} radius={[8, 8, 0, 0]}>
                          {charts.financeBars.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              ) : null}

              <Panel title={t('admin.overview.chartPublishedWeek')}>
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
                      <Area type="monotone" dataKey="listings" name={t('admin.overview.chartPublished')} stroke={CHART.gold} strokeWidth={2.5} fill="url(#admPublishFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              {canContent ? (
                <Panel title={t('admin.overview.chartEnquiries')}>
                  <div style={css('width: 100%; height: 280px')}>
                    {charts.enquiryStatus.length === 0 ? (
                      <p className="adm-hint">{t('admin.overview.noEnquiries')}</p>
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
