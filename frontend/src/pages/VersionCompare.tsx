import { Button, Space, Typography } from '@arco-design/web-react';
import { IconLeft } from '@arco-design/web-react/icon';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { VersionDiff, VersionSelector } from '../components/common';
import { useInstanceStore } from '../stores/instance';
import { useVersionStore } from '../stores/version';

export function VersionCompare() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [leftId, setLeftId] = useState<string | undefined>();
  const [rightId, setRightId] = useState<string | undefined>();
  const { instances, loadInstances } = useInstanceStore();
  const { versions, loadVersions } = useVersionStore();

  useEffect(() => {
    void Promise.all([loadInstances(), loadVersions()]);
  }, [loadInstances, loadVersions]);

  const instance = useMemo(() => instances.find((item) => item.id === id), [id, instances]);
  const relatedVersions = useMemo(
    () =>
      versions
        .filter((version) => version.contractInstanceId === id)
        .sort((a, b) => a.versionNo - b.versionNo),
    [id, versions]
  );

  useEffect(() => {
    if (relatedVersions.length && !leftId && !rightId) {
      setLeftId(relatedVersions[Math.max(0, relatedVersions.length - 2)]?.id);
      setRightId(relatedVersions[relatedVersions.length - 1]?.id);
    }
  }, [leftId, relatedVersions, rightId]);

  const left = relatedVersions.find((version) => version.id === leftId);
  const right = relatedVersions.find((version) => version.id === rightId);

  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <Typography.Title heading={3}>版本对比</Typography.Title>
          <Typography.Text type="secondary">{instance?.title ?? '合同实例'} 的版本历史。</Typography.Text>
        </div>
        <Space>
          {instance && (
            <Button icon={<IconLeft />} onClick={() => navigate(`/instances/${instance.id}`)}>
              返回实例
            </Button>
          )}
        </Space>
      </div>

      <VersionSelector versions={relatedVersions} leftId={leftId} rightId={rightId} onLeftChange={setLeftId} onRightChange={setRightId} />
      <VersionDiff left={left} right={right} />

      {!relatedVersions.length && <div className="empty-state">当前实例还没有版本，请先在实例编辑页保存版本。</div>}
    </section>
  );
}
