import { useState } from 'react';
import { Col, Row, Typography, Table, Card, Tag, Tooltip } from 'antd';
import {
  EyeOutlined,
  BugOutlined,
  UserOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import StatCard from '@/components/StatCard';
import TrendChart from '@/components/TrendChart';
import DateRangeFilter from '@/components/DateRangeFilter';
import { usePageViews, useErrors, usePerformance, useSessions, useRawEvents } from '@/hooks/useAnalytics';
import { getDefaultDateRange, formatNumber, formatMs, formatDateTime } from '@/utils/format';
import type { QueryFilters, MetricRow } from '@/types';
import type { RawEventRecord } from '@/api/client';

const topPagesColumns: ColumnsType<MetricRow> = [
  { title: 'Page', dataIndex: 'period', key: 'period', ellipsis: true },
  {
    title: 'Views',
    dataIndex: 'count',
    key: 'count',
    sorter: (a, b) => a.count - b.count,
    defaultSortOrder: 'descend',
    render: (v: number) => formatNumber(v),
  },
  {
    title: 'Sessions',
    dataIndex: 'unique_sessions',
    key: 'unique_sessions',
    render: (v: number) => formatNumber(v),
  },
  {
    title: 'Users',
    dataIndex: 'unique_users',
    key: 'unique_users',
    render: (v: number) => formatNumber(v),
  },
];

const EVENT_TYPE_COLORS: Record<string, string> = {
  page_view: 'blue',
  page_exit: 'cyan',
  click: 'green',
  error: 'red',
  api_call: 'purple',
  performance: 'orange',
  custom: 'default',
};

const recentEventsColumns: ColumnsType<RawEventRecord> = [
  {
    title: 'Type',
    dataIndex: 'event_type',
    key: 'event_type',
    width: 110,
    render: (v: string) => <Tag color={EVENT_TYPE_COLORS[v] || 'default'}>{v}</Tag>,
  },
  {
    title: 'Path',
    dataIndex: 'path',
    key: 'path',
    ellipsis: true,
  },
  {
    title: 'Properties',
    dataIndex: 'properties',
    key: 'properties',
    ellipsis: true,
    render: (props: Record<string, unknown>) => {
      const entries = Object.entries(props).filter(([k]) => !k.startsWith('__'));
      if (entries.length === 0) return '-';
      return (
        <Tooltip title={<pre style={{ fontSize: 11, margin: 0 }}>{JSON.stringify(props, null, 2)}</pre>}>
          <span style={{ fontSize: 12 }}>
            {entries.slice(0, 3).map(([k, v]) => `${k}: ${String(v).substring(0, 30)}`).join(', ')}
            {entries.length > 3 && ` +${entries.length - 3} more`}
          </span>
        </Tooltip>
      );
    },
  },
  {
    title: 'User',
    dataIndex: 'user_id',
    key: 'user_id',
    width: 120,
    render: (v: string) => v || <Typography.Text type="secondary">anonymous</Typography.Text>,
  },
  {
    title: 'Session',
    dataIndex: 'session_id',
    key: 'session_id',
    width: 100,
    ellipsis: true,
    render: (v: string) => <Typography.Text copyable={{ text: v }}>{v.substring(0, 8)}...</Typography.Text>,
  },
  {
    title: 'Time',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 140,
    render: (v: string) => formatDateTime(v),
  },
];

export default function Overview() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange);

  const baseFilters: QueryFilters = {
    app_id: 'ttsecuritas-aop',
    from: dateRange.from,
    to: dateRange.to,
    group_by: 'day',
  };

  const pageViewsTrend = usePageViews(baseFilters);
  const errorsTrend = useErrors(baseFilters);
  const perfData = usePerformance(baseFilters);
  const sessionsTrend = useSessions(baseFilters);
  const topPages = usePageViews({ ...baseFilters, group_by: 'path', limit: 10 });
  const recentEvents = useRawEvents({ ...baseFilters, limit: 20 });

  const totalViews = pageViewsTrend.data?.data.reduce((sum, r) => sum + r.count, 0) ?? 0;
  const totalErrors = errorsTrend.data?.data.reduce((sum, r) => sum + r.count, 0) ?? 0;
  const totalSessions = sessionsTrend.data?.data.reduce((sum, r) => sum + r.unique_sessions, 0) ?? 0;

  const avgLcp = perfData.data?.data.length
    ? perfData.data.data.reduce((sum, r) => sum + (r.avg_value ?? 0), 0) / perfData.data.data.length
    : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Overview</Typography.Title>
        <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={(from, to) => setDateRange({ from, to })} />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Total Page Views" value={formatNumber(totalViews)} prefix={<EyeOutlined />} loading={pageViewsTrend.isLoading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Total Errors" value={formatNumber(totalErrors)} prefix={<BugOutlined />} loading={errorsTrend.isLoading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Unique Sessions" value={formatNumber(totalSessions)} prefix={<UserOutlined />} loading={sessionsTrend.isLoading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Avg LCP" value={avgLcp > 0 ? formatMs(avgLcp) : '-'} prefix={<ThunderboltOutlined />} loading={perfData.isLoading} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <TrendChart title="Page Views" data={pageViewsTrend.data?.data ?? []} loading={pageViewsTrend.isLoading} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <TrendChart title="Errors" data={errorsTrend.data?.data ?? []} color="#ff4d4f" loading={errorsTrend.isLoading} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="Top Pages">
            <Table
              columns={topPagesColumns}
              dataSource={topPages.data?.data ?? []}
              loading={topPages.isLoading}
              rowKey="period"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title={`Recent Events (${recentEvents.data?.total ?? 0} total)`}>
            <Table
              columns={recentEventsColumns}
              dataSource={(recentEvents.data?.data ?? []) as RawEventRecord[]}
              loading={recentEvents.isLoading}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 800 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
