import { Button, Card, Popconfirm, Space, Tag, Typography } from '@arco-design/web-react';
import { IconCopy, IconDelete, IconEdit, IconFile } from '@arco-design/web-react/icon';
import { Template } from '../../types/template';
import { TEMPLATE_CATEGORY_LABELS } from '../../types/enums';

interface TemplateCardProps {
  template: Template;
  onEdit?: (template: Template) => void;
  onDuplicate?: (template: Template) => void;
  onDelete?: (template: Template) => void;
  onCreateInstance?: (template: Template) => void;
}

export function TemplateCard({ template, onEdit, onDuplicate, onDelete, onCreateInstance }: TemplateCardProps) {
  return (
    <Card className="template-card" hoverable>
      <div className="template-card__header">
        <div>
          <Typography.Title heading={6}>{template.title}</Typography.Title>
          <span className="muted">更新于 {new Date(template.updatedAt).toLocaleString()}</span>
        </div>
        <Tag color="arcoblue">{TEMPLATE_CATEGORY_LABELS[template.category]}</Tag>
      </div>

      <div className="template-card__meta">
        <span>{template.variables.length} 个变量</span>
        <span>{template.tags.length} 个标签</span>
      </div>

      <Space wrap size={[6, 6]} className="tag-row">
        {template.tags.map((tag) => (
          <Tag key={tag} size="small" color="gray">
            {tag}
          </Tag>
        ))}
      </Space>

      <div className="card-actions">
        {onCreateInstance && (
          <Button icon={<IconFile />} type="primary" onClick={() => onCreateInstance(template)}>
            创建实例
          </Button>
        )}
        {onEdit && (
          <Button icon={<IconEdit />} onClick={() => onEdit(template)}>
            编辑
          </Button>
        )}
        {onDuplicate && (
          <Button icon={<IconCopy />} onClick={() => onDuplicate(template)}>
            复制
          </Button>
        )}
        {onDelete && (
          <Popconfirm title="确认删除该模板？" onOk={() => onDelete(template)}>
            <Button icon={<IconDelete />} status="danger">
              删除
            </Button>
          </Popconfirm>
        )}
      </div>
    </Card>
  );
}
