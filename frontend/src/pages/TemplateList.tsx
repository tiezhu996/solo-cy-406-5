import { Button, Input, Message, Space, Typography } from '@arco-design/web-react';
import { IconExport, IconImport, IconPlus } from '@arco-design/web-react/icon';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoryFilter, TemplateCard } from '../components/common';
import { useClauseStore } from '../stores/clause';
import { useInstanceStore } from '../stores/instance';
import { useTemplateStore } from '../stores/template';
import { TemplateCategory, TEMPLATE_CATEGORY_LABELS } from '../types/enums';
import { ExportPayload, exportAllData, importAllData } from '../utils/db';
import { downloadJson, readJsonFile } from '../utils/export';

export function TemplateList() {
  const navigate = useNavigate();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const { templates, loadTemplates, createTemplate, duplicateTemplate, deleteTemplate } = useTemplateStore();
  const { createFromTemplate, loadInstances } = useInstanceStore();
  const { loadClauses } = useClauseStore();

  useEffect(() => {
    void Promise.all([loadTemplates(), loadInstances(), loadClauses()]);
  }, [loadClauses, loadInstances, loadTemplates]);

  const categoryOptions = Object.values(TemplateCategory).map((value) => ({
    value,
    label: TEMPLATE_CATEGORY_LABELS[value],
    count: templates.filter((template) => template.category === value).length
  }));

  const filteredTemplates = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return templates.filter((template) => {
      const categoryMatched = category === 'all' || template.category === category;
      const keywordMatched =
        !normalizedKeyword ||
        template.title.toLowerCase().includes(normalizedKeyword) ||
        template.tags.some((tag) => tag.toLowerCase().includes(normalizedKeyword));
      return categoryMatched && keywordMatched;
    });
  }, [category, keyword, templates]);

  const createNewTemplate = async () => {
    const template = await createTemplate();
    navigate(`/templates/${template.id}/edit`);
  };

  const createInstance = async (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    const instance = await createFromTemplate(template);
    navigate(`/instances/${instance.id}`);
  };

  const handleExport = async () => {
    downloadJson(await exportAllData());
    Message.success('已导出本地数据');
  };

  const handleImport = async (file?: File) => {
    if (!file) {
      return;
    }

    try {
      const payload = await readJsonFile<ExportPayload>(file);
      await importAllData(payload);
      await Promise.all([loadTemplates(), loadInstances(), loadClauses()]);
      Message.success('导入完成');
    } catch {
      Message.error('导入失败，请确认 JSON 格式');
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    }
  };

  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <Typography.Title heading={3}>模板库</Typography.Title>
          <Typography.Text type="secondary">管理合同模板，按分类、标签和关键词快速定位。</Typography.Text>
        </div>
        <Space wrap>
          <Button icon={<IconImport />} onClick={() => importInputRef.current?.click()}>
            导入
          </Button>
          <Button icon={<IconExport />} onClick={handleExport}>
            导出
          </Button>
          <Button type="primary" icon={<IconPlus />} onClick={createNewTemplate}>
            新建模板
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="visually-hidden"
            onChange={(event) => void handleImport(event.target.files?.[0])}
          />
        </Space>
      </div>

      <div className="toolbar-row">
        <Input.Search allowClear placeholder="搜索模板标题或标签" value={keyword} onChange={setKeyword} />
        <CategoryFilter value={category} options={categoryOptions} onChange={setCategory} />
      </div>

      <div className="template-grid">
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onEdit={() => navigate(`/templates/${template.id}/edit`)}
            onDuplicate={() => void duplicateTemplate(template.id)}
            onDelete={() => void deleteTemplate(template.id)}
            onCreateInstance={() => void createInstance(template.id)}
          />
        ))}
      </div>

      {!filteredTemplates.length && <div className="empty-state">没有匹配的模板。</div>}
    </section>
  );
}
