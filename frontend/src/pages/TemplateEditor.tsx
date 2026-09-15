import { Button, Input, Message, Select, Space, Typography } from '@arco-design/web-react';
import { IconBook, IconSave } from '@arco-design/web-react/icon';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RichEditor } from '../components/common';
import { ClauseDrawer } from '../components/editor/ClauseDrawer';
import { RenameVariableModal } from '../components/editor/RenameVariableModal';
import { VariablePanel } from '../components/editor/VariablePanel';
import { useHistory } from '../hooks/useHistory';
import { useClauseStore } from '../stores/clause';
import { useTemplateStore } from '../stores/template';
import { TemplateCategory, TEMPLATE_CATEGORY_LABELS } from '../types/enums';
import { Template, TemplateVariable } from '../types/template';

const categoryOptions = Object.values(TemplateCategory).map((value) => ({
  label: TEMPLATE_CATEGORY_LABELS[value],
  value
}));

export function TemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Template | undefined>();
  const [clauseDrawerVisible, setClauseDrawerVisible] = useState(false);
  const [renamingVariable, setRenamingVariable] = useState<TemplateVariable | null>(null);
  const contentHistory = useHistory('');
  const { templates, loadTemplates, createTemplate, updateTemplate } = useTemplateStore();
  const { clauses, loadClauses, incrementUsage } = useClauseStore();

  useEffect(() => {
    void Promise.all([loadTemplates(), loadClauses()]);
  }, [loadClauses, loadTemplates]);

  useEffect(() => {
    if (!id) {
      return;
    }

    if (id === 'new') {
      void createTemplate().then((template) => navigate(`/templates/${template.id}/edit`, { replace: true }));
      return;
    }

    const found = templates.find((template) => template.id === id);
    if (found) {
      setDraft(found);
      contentHistory.reset(found.contentHtml);
    }
  }, [contentHistory, createTemplate, id, navigate, templates]);

  useEffect(() => {
    setDraft((current) => (current && current.contentHtml !== contentHistory.value ? { ...current, contentHtml: contentHistory.value } : current));
  }, [contentHistory.value]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isModifier = event.metaKey || event.ctrlKey;
      if (!isModifier) {
        return;
      }

      if (event.key.toLowerCase() === 'z' && event.shiftKey) {
        event.preventDefault();
        contentHistory.redo();
      } else if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        contentHistory.undo();
      } else if (event.key.toLowerCase() === 'y') {
        event.preventDefault();
        contentHistory.redo();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [contentHistory]);

  const tagText = useMemo(() => draft?.tags.join('，') ?? '', [draft?.tags]);

  if (!draft) {
    return <div className="empty-state">正在加载模板...</div>;
  }

  const updateDraft = (patch: Partial<Template>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const updateContent = (contentHtml: string) => {
    updateDraft({ contentHtml });
    contentHistory.push(contentHtml);
  };

  const insertHtml = (html: string) => {
    const nextContent = `${draft.contentHtml}${html}`;
    updateContent(nextContent);
  };

  const saveTemplate = async () => {
    await updateTemplate(draft);
    Message.success('模板已保存');
  };

  // 重命名针对已落库的模板原子执行；正文或变量有未保存修改时先要求保存，
  // 避免同步回来的持久化结果覆盖本地未保存编辑。
  const openRenameModal = (variable: TemplateVariable) => {
    const persisted = templates.find((item) => item.id === draft.id);
    const hasUnsavedChanges =
      !persisted ||
      persisted.contentHtml !== draft.contentHtml ||
      JSON.stringify(persisted.variables) !== JSON.stringify(draft.variables);

    if (hasUnsavedChanges) {
      Message.warning('模板有未保存的修改，请先保存再重命名变量');
      return;
    }

    setRenamingVariable(variable);
  };

  const syncDraftAfterRename = () => {
    const persisted = useTemplateStore.getState().templates.find((item) => item.id === draft.id);
    if (!persisted) {
      return;
    }

    updateDraft({ contentHtml: persisted.contentHtml, variables: persisted.variables });
    // 重置正文历史，防止撤销把旧占位符带回正文
    contentHistory.reset(persisted.contentHtml);
  };

  return (
    <section className="page-section editor-page">
      <div className="page-heading">
        <div>
          <Typography.Title heading={3}>模板编辑器</Typography.Title>
          <Typography.Text type="secondary">正文、变量和可复用条款在同一工作台中维护。</Typography.Text>
        </div>
        <Space wrap>
          <Button icon={<IconBook />} onClick={() => setClauseDrawerVisible(true)}>
            条款库
          </Button>
          <Button type="primary" icon={<IconSave />} onClick={() => void saveTemplate()}>
            保存
          </Button>
        </Space>
      </div>

      <div className="template-meta-bar">
        <Input value={draft.title} onChange={(title) => updateDraft({ title })} placeholder="模板标题" />
        <Select value={draft.category} options={categoryOptions} onChange={(category) => updateDraft({ category })} />
        <Input
          value={tagText}
          placeholder="标签，用逗号分隔"
          onChange={(value) =>
            updateDraft({
              tags: value
                .split(/[,，]/)
                .map((tag) => tag.trim())
                .filter(Boolean)
            })
          }
        />
      </div>

      <div className="editor-grid">
        <RichEditor
          value={draft.contentHtml}
          onChange={updateContent}
          placeholder="编辑合同模板正文..."
          minHeight={560}
          onUndo={contentHistory.undo}
          onRedo={contentHistory.redo}
          canUndo={contentHistory.canUndo}
          canRedo={contentHistory.canRedo}
        />
        <VariablePanel
          variables={draft.variables}
          onChange={(variables) => updateDraft({ variables })}
          onInsertPlaceholder={(name) => insertHtml(`<span> {{${name}}} </span>`)}
          onRenameVariable={openRenameModal}
        />
      </div>

      <RenameVariableModal
        templateId={draft.id}
        variable={renamingVariable}
        onClose={() => setRenamingVariable(null)}
        onRenamed={syncDraftAfterRename}
      />

      <ClauseDrawer
        visible={clauseDrawerVisible}
        clauses={clauses}
        onClose={() => setClauseDrawerVisible(false)}
        onInsert={(clause) => {
          insertHtml(clause.contentHtml);
          void incrementUsage(clause.id);
          Message.success('条款已插入正文末尾');
        }}
      />
    </section>
  );
}
