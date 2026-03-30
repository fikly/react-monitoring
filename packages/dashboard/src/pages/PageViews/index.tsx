import { useState } from 'react';
import { Col, Row, Typography, Segmented, Table, Card, Tag, Tooltip } from 'antd';
import TrendChart from '@/components/TrendChart';
import DateRangeFilter from '@/components/DateRangeFilter';
import { usePageViews, useRawEvents } from '@/hooks/useAnalytics';
import { getDefaultDateRange, formatNumber, formatDateTime, formatMs } from '@/utils/format';
import { useApp } from '@/contexts/AppContext';
import type { QueryFilters, MetricRow } from '@/types';
import type { RawEventRecord } from '@/api/client';
import type { ColumnsType } from 'antd/es/table';

const pageColumns: ColumnsType<MetricRow> = [
  { title: 'Page Path', dataIndex: 'period', key: 'period', ellipsis: true },
  {
    title: 'Views',
    dataIndex: 'count',
    key: 'count',
    defaultSortOrder: 'descend',
    sorter: (a, b) => a.count - b.count,
    render: (v: number) => formatNumber(v),
  },
  {
    title: 'Avg Duration',
    dataIndex: 'avg_value',
    key: 'avg_value',
    render: (v: number | undefined) => v ? formatMs(v) : '-',
  },
  {
    title: 'Sessions',
    dataIndex: 'unique_sessions',
    key: 'unique_sessions',
    sorter: (a, b) => a.unique_sessions - b.unique_sessions,
    render: (v: number) => formatNumber(v),
  },
  {
    title: 'Users',
    dataIndex: 'unique_users',
    key: 'unique_users',
    render: (v: number) => formatNumber(v),
  },
];

const rawPageViewColumns: ColumnsType<RawEventRecord> = [
  {
    title: 'Type',
    dataIndex: 'event_type',
    key: 'event_type',
    width: 100,
    render: (v: string) => <Tag color={v === 'page_view' ? 'blue' : 'cyan'}>{v}</Tag>,
  },
  {
    title: 'Path',
    dataIndex: 'path',
    key: 'path',
    ellipsis: true,
  },
  {
    title: 'Title',
    key: 'title',
    ellipsis: true,
    render: (_: unknown, record: RawEventRecord) => String(record.properties?.title || '-'),
  },
  {
    title: 'Duration',
    key: 'duration',
    width: 100,
    render: (_: unknown, record: RawEventRecord) => {
      const dur = record.properties?.duration_ms as number | undefined;
      return dur ? formatMs(dur) : '-';
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
    title: 'Viewport',
    dataIndex: 'viewport_size',
    key: 'viewport_size',
    width: 100,
  },
  {
    title: 'Time',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 140,
    render: (v: string) => formatDateTime(v),
  },
];

export default function PageViews() {
  const { selectedAppId } = useApp();
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [groupBy, setGroupBy] = useState<'day' | 'hour'>('day');

  const baseFilters: QueryFilters = {
    app_id: selectedAppId!,
    from: dateRange.from,
    to: dateRange.to,
  };

  const trendData = usePageViews({ ...baseFilters, group_by: groupBy });
  const byPath = usePageViews({ ...baseFilters, group_by: 'path', limit: 50 });
  const rawPageViews = useRawEvents({ ...baseFilters, event_type: 'page_view', limit: 50 });

  const totalViews = trendData.data?.data.reduce((sum, r) => sum + r.count, 0) ?? 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>Page Views</Typography.Title>
          <Typography.Text type="secondary">{formatNumber(totalViews)} views in period</Typography.Text>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Segmented
            options={[{ label: 'Daily', value: 'day' }, { label: 'Hourly', value: 'hour' }]}
            value={groupBy}
            onChange={(v) => setGroupBy(v as 'day' | 'hour')}
          />
          <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={(from, to) => setDateRange({ from, to })} />
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <TrendChart title="Page Views Trend" data={trendData.data?.data ?? []} loading={trendData.isLoading} height={350} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="Pages by Views">
            <Table columns={pageColumns} dataSource={byPath.data?.data ?? []} loading={byPath.isLoading} rowKey="period" size="small" pagination={{ pageSize: 15 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title={`Recent Page View Events (${rawPageViews.data?.total ?? 0} total)`}>
            <Table
              columns={rawPageViewColumns}
              dataSource={(rawPageViews.data?.data ?? []) as RawEventRecord[]}
              loading={rawPageViews.isLoading}
              rowKey="id"
              size="small"
              scroll={{ x: 800 }}
              pagination={{ pageSize: 15, showSizeChanger: true }}
              expandable={{
                expandedRowRender: (record: RawEventRecord) => (
                  <div style={{ padding: 12 }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Typography.Text strong>Properties</Typography.Text>
                        <pre style={{ fontSize: 11, background: '#fafafa', padding: 8, borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {JSON.stringify(record.properties, null, 2)}
                        </pre>
                      </Col>
                      <Col span={8}>
                        <Typography.Text strong>Metadata</Typography.Text>
                        <pre style={{ fontSize: 11, background: '#fafafa', padding: 8, borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {JSON.stringify(record.metadata, null, 2)}
                        </pre>
                      </Col>
                      <Col span={8}>
                        <Typography.Text type="secondary">URL:</Typography.Text> <span style={{ wordBreak: 'break-all' }}>{record.url}</span><br />
                        <Typography.Text type="secondary">Referrer:</Typography.Text> {String(record.properties?.referrer || '-')}<br />
                        <Typography.Text type="secondary">User Agent:</Typography.Text> <span style={{ fontSize: 11 }}>{record.user_agent?.substring(0, 150)}</span><br />
                        <Typography.Text type="secondary">Screen:</Typography.Text> {record.screen_resolution}<br />
                        <Typography.Text type="secondary">Session:</Typography.Text> <Typography.Text copyable>{record.session_id}</Typography.Text>
                      </Col>
                    </Row>
                  </div>
                ),
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
