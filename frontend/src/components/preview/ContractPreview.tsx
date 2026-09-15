import { Card, Typography } from '@arco-design/web-react';

interface ContractPreviewProps {
  title: string;
  html: string;
}

export function ContractPreview({ title, html }: ContractPreviewProps) {
  return (
    <Card className="preview-card">
      <div className="preview-heading">
        <Typography.Title heading={5}>{title}</Typography.Title>
        <Typography.Text type="secondary">变量已替换为当前填写值</Typography.Text>
      </div>
      <article className="contract-preview" dangerouslySetInnerHTML={{ __html: html || '<p>暂无预览内容</p>' }} />
    </Card>
  );
}
