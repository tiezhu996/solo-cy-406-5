import { Button, Card, Popconfirm, Space, Tag, Typography } from '@arco-design/web-react';
import { IconCopy, IconDelete, IconEdit, IconPlus } from '@arco-design/web-react/icon';
import { Clause } from '../../types/clause';
import { CLAUSE_CATEGORY_LABELS } from '../../types/enums';
import { htmlToPlainText } from '../../utils/diff';

interface ClauseCardProps {
  clause: Clause;
  onEdit?: (clause: Clause) => void;
  onDuplicate?: (clause: Clause) => void;
  onDelete?: (clause: Clause) => void;
  onInsert?: (clause: Clause) => void;
}

export function ClauseCard({ clause, onEdit, onDuplicate, onDelete, onInsert }: ClauseCardProps) {
  return (
    <Card className="clause-card" hoverable>
      <div className="template-card__header">
        <Typography.Title heading={6}>{clause.title}</Typography.Title>
        <Tag color="orangered">{CLAUSE_CATEGORY_LABELS[clause.category]}</Tag>
      </div>
      <Typography.Paragraph className="clause-excerpt" ellipsis={{ rows: 2 }}>
        {htmlToPlainText(clause.contentHtml)}
      </Typography.Paragraph>
      <Space wrap size={[6, 6]} className="tag-row">
        {clause.tags.map((tag) => (
          <Tag key={tag} size="small">
            {tag}
          </Tag>
        ))}
        <Tag size="small" color="green">
          使用 {clause.usageCount}
        </Tag>
      </Space>
      <div className="card-actions">
        {onInsert && (
          <Button icon={<IconPlus />} type="primary" onClick={() => onInsert(clause)}>
            插入
          </Button>
        )}
        {onEdit && (
          <Button icon={<IconEdit />} onClick={() => onEdit(clause)}>
            编辑
          </Button>
        )}
        {onDuplicate && (
          <Button icon={<IconCopy />} onClick={() => onDuplicate(clause)}>
            复制
          </Button>
        )}
        {onDelete && (
          <Popconfirm title="确认删除该条款？" onOk={() => onDelete(clause)}>
            <Button icon={<IconDelete />} status="danger">
              删除
            </Button>
          </Popconfirm>
        )}
      </div>
    </Card>
  );
}
