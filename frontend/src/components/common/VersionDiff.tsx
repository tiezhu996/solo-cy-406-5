import { Card, Typography } from '@arco-design/web-react';
import { useMemo } from 'react';
import { Version } from '../../types/version';
import { buildSideBySideDiff, DiffToken } from '../../utils/diff';

interface VersionDiffProps {
  left?: Version;
  right?: Version;
}

function DiffColumn({ title, tokens }: { title: string; tokens: DiffToken[] }) {
  return (
    <Card className="diff-column" title={title}>
      <div className="diff-text">
        {tokens.map((token, index) => (
          <span key={`${token.value}-${index}`} className={token.added ? 'diff-added' : token.removed ? 'diff-removed' : undefined}>
            {token.value}
          </span>
        ))}
      </div>
    </Card>
  );
}

export function VersionDiff({ left, right }: VersionDiffProps) {
  const diff = useMemo(() => buildSideBySideDiff(left?.contentSnapshot ?? '', right?.contentSnapshot ?? ''), [left, right]);

  if (!left || !right) {
    return <div className="empty-state">请选择两个版本查看差异。</div>;
  }

  return (
    <div className="version-diff">
      <div className="diff-header">
        <Typography.Text type="secondary">左侧红色表示被删除内容，右侧绿色表示新增内容。</Typography.Text>
      </div>
      <div className="diff-grid">
        <DiffColumn title={`版本 ${left.versionNo} · ${left.remark}`} tokens={diff.left} />
        <DiffColumn title={`版本 ${right.versionNo} · ${right.remark}`} tokens={diff.right} />
      </div>
    </div>
  );
}
