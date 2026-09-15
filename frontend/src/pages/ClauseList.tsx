import { Button, Input, Message, Space, Typography } from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import { useEffect, useMemo, useState } from 'react';
import { CategoryFilter, ClauseCard } from '../components/common';
import { ClauseEditor } from '../components/editor/ClauseEditor';
import { useClauseStore } from '../stores/clause';
import { Clause, ClauseDraft } from '../types/clause';
import { CLAUSE_CATEGORY_LABELS, ClauseCategory } from '../types/enums';

export function ClauseList() {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingClause, setEditingClause] = useState<Clause | undefined>();
  const { clauses, loadClauses, createClause, updateClause, deleteClause, duplicateClause } = useClauseStore();

  useEffect(() => {
    void loadClauses();
  }, [loadClauses]);

  const categoryOptions = Object.values(ClauseCategory).map((value) => ({
    value,
    label: CLAUSE_CATEGORY_LABELS[value],
    count: clauses.filter((clause) => clause.category === value).length
  }));

  const filteredClauses = useMemo(() => {
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

  const openNewClause = () => {
    setEditingClause(undefined);
    setEditorVisible(true);
  };

  const submitClause = async (draft: ClauseDraft, clause?: Clause) => {
    if (clause) {
      await updateClause({ ...clause, ...draft });
      Message.success('条款已更新');
    } else {
      await createClause(draft);
      Message.success('条款已新增');
    }
  };

  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <Typography.Title heading={3}>条款库管理</Typography.Title>
          <Typography.Text type="secondary">维护可复用条款，供模板编辑器插入。</Typography.Text>
        </div>
        <Space>
          <Button type="primary" icon={<IconPlus />} onClick={openNewClause}>
            新增条款
          </Button>
        </Space>
      </div>

      <div className="toolbar-row">
        <Input.Search allowClear placeholder="搜索条款标题或标签" value={keyword} onChange={setKeyword} />
        <CategoryFilter value={category} options={categoryOptions} onChange={setCategory} />
      </div>

      <div className="clause-grid">
        {filteredClauses.map((clause) => (
          <ClauseCard
            key={clause.id}
            clause={clause}
            onEdit={() => {
              setEditingClause(clause);
              setEditorVisible(true);
            }}
            onDuplicate={() => void duplicateClause(clause.id)}
            onDelete={() => void deleteClause(clause.id)}
          />
        ))}
      </div>

      {!filteredClauses.length && <div className="empty-state">没有匹配的条款。</div>}

      <ClauseEditor visible={editorVisible} clause={editingClause} onClose={() => setEditorVisible(false)} onSubmit={submitClause} />
    </section>
  );
}
