import { Card, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface Props<T> {
  title: string;
  columns: ColumnsType<T>;
  data: T[];
  loading?: boolean;
  rowKey?: string;
  pagination?: false | { pageSize: number };
}

export default function DataTable<T extends Record<string, unknown>>({
  title,
  columns,
  data,
  loading = false,
  rowKey = 'period',
  pagination = { pageSize: 10 },
}: Props<T>) {
  return (
    <Card title={title}>
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey={rowKey}
        pagination={pagination}
        size="small"
      />
    </Card>
  );
}
