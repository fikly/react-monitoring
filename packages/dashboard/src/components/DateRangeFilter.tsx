import { DatePicker, Space } from 'antd';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface Props {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

const presets: { label: string; value: [Dayjs, Dayjs] }[] = [
  { label: 'Today', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
  { label: 'Yesterday', value: [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
  { label: 'Last 7 Days', value: [dayjs().subtract(7, 'day').startOf('day'), dayjs().endOf('day')] },
  { label: 'Last 30 Days', value: [dayjs().subtract(30, 'day').startOf('day'), dayjs().endOf('day')] },
  { label: 'Last 90 Days', value: [dayjs().subtract(90, 'day').startOf('day'), dayjs().endOf('day')] },
];

export default function DateRangeFilter({ from, to, onChange }: Props) {
  return (
    <Space>
      <RangePicker
        value={[dayjs(from), dayjs(to)]}
        presets={presets}
        onChange={(dates) => {
          if (dates?.[0] && dates?.[1]) {
            onChange(
              dates[0].startOf('day').toISOString(),
              dates[1].endOf('day').toISOString(),
            );
          }
        }}
        allowClear={false}
      />
    </Space>
  );
}
