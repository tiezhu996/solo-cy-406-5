import { Button, Drawer, Form, Input, Select, Space } from '@arco-design/web-react';
import { useEffect, useMemo, useState } from 'react';
import { RichEditor } from '../common';
import { Clause, ClauseDraft } from '../../types/clause';
import { CLAUSE_CATEGORY_LABELS, ClauseCategory } from '../../types/enums';

interface ClauseEditorProps {
  visible: boolean;
  clause?: Clause;
  onClose: () => void;
  onSubmit: (draft: ClauseDraft, clause?: Clause) => Promise<void>;
}

const categoryOptions = Object.values(ClauseCategory).map((value) => ({
  label: CLAUSE_CATEGORY_LABELS[value],
  value
}));

const emptyDraft: ClauseDraft = {
  title: '',
  category: ClauseCategory.Breach,
  tags: [],
  contentHtml: '<p>请输入条款内容。</p>'
};

export function ClauseEditor({ visible, clause, onClose, onSubmit }: ClauseEditorProps) {
  const [draft, setDraft] = useState<ClauseDraft>(emptyDraft);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(
        clause
          ? {
              title: clause.title,
              category: clause.category,
              tags: clause.tags,
              contentHtml: clause.contentHtml
            }
          : emptyDraft
      );
    }
  }, [clause, visible]);

  const tagText = useMemo(() => draft.tags.join('，'), [draft.tags]);

  const submit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(
        {
          ...draft,
          title: draft.title || '未命名条款'
        },
        clause
      );
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      visible={visible}
      width={620}
      title={clause ? '编辑条款' : '新增条款'}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={submitting} onClick={submit}>
            保存
          </Button>
        </Space>
      }
    >
      <Form layout="vertical">
        <Form.Item label="标题" required>
          <Input value={draft.title} onChange={(title) => setDraft((current) => ({ ...current, title }))} />
        </Form.Item>
        <Form.Item label="分类">
          <Select
            value={draft.category}
            options={categoryOptions}
            onChange={(category) => setDraft((current) => ({ ...current, category }))}
          />
        </Form.Item>
        <Form.Item label="标签">
          <Input
            value={tagText}
            placeholder="多个标签用中文逗号或英文逗号分隔"
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                tags: value
                  .split(/[,，]/)
                  .map((tag) => tag.trim())
                  .filter(Boolean)
              }))
            }
          />
        </Form.Item>
        <Form.Item label="内容">
          <RichEditor value={draft.contentHtml} minHeight={300} onChange={(contentHtml) => setDraft((current) => ({ ...current, contentHtml }))} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
