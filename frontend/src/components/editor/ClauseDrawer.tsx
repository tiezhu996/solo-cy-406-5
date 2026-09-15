import { Drawer, Input, Space } from '@arco-design/web-react';
import { useMemo, useState } from 'react';
import { CategoryFilter, ClauseCard } from '../common';
import { Clause } from '../../types/clause';
import { CLAUSE_CATEGORY_LABELS, ClauseCategory } from '../../types/enums';

interface ClauseDrawerProps {
  visible: boolean;
  clauses: Clause[];
  onClose: () => void;
  onInsert: (clause: Clause) => void;
}

export function ClauseDrawer({ visible, clauses, onClose, onInsert }: ClauseDrawerProps) {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');

  const options = Object.values(ClauseCategory).map((value) => ({
    value,
    label: CLAUSE_CATEGORY_LABELS[value],
    count: clauses.filter((clause) => clause.category === value).length
  }));

  const filtered = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return clauses.filter((clause) => {
      const categoryMatched = category === 'all' || clause.category === category;
      const keywordMatched =
        !normalizedKeyword ||
        clause.title.toLowerCase().includes(normalizedKeyword) ||
        clause.tags.some((tag) => tag.toLowerCase().includes(normalizedKeyword));
      return categoryMatched && keywordMatched;
    });
  }, [category, clauses, keyword]);

  return (
    <Drawer visible={visible} placement="bottom" height="72vh" title="条款库" onCancel={onClose} footer={null}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Input.Search allowClear placeholder="搜索条款标题或标签" value={keyword} onChange={setKeyword} />
        <CategoryFilter value={category} options={options} onChange={setCategory} />
        <div className="clause-grid">
          {filtered.map((clause) => (
            <ClauseCard key={clause.id} clause={clause} onInsert={onInsert} />
          ))}
        </div>
      </Space>
    </Drawer>
  );
}
