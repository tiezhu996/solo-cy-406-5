import { Badge, Button, Space } from '@arco-design/web-react';

export interface CategoryOption {
  value: string;
  label: string;
  count?: number;
}

interface CategoryFilterProps {
  value: string;
  options: CategoryOption[];
  onChange: (value: string) => void;
  allLabel?: string;
}

export function CategoryFilter({ value, options, onChange, allLabel = '全部' }: CategoryFilterProps) {
  const items: CategoryOption[] = [{ value: 'all', label: allLabel }, ...options];

  return (
    <Space wrap className="category-filter">
      {items.map((item) => (
        <Button
          key={item.value}
          size="small"
          type={value === item.value ? 'primary' : 'secondary'}
          onClick={() => onChange(item.value)}
        >
          <Space size={6}>
            <span>{item.label}</span>
            {typeof item.count === 'number' && <Badge count={item.count} maxCount={99} />}
          </Space>
        </Button>
      ))}
    </Space>
  );
}
