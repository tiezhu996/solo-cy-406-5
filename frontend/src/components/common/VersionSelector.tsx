import { Select, Space } from '@arco-design/web-react';
import { Version } from '../../types/version';

interface VersionSelectorProps {
  versions: Version[];
  leftId?: string;
  rightId?: string;
  onLeftChange: (id: string) => void;
  onRightChange: (id: string) => void;
}

export function VersionSelector({ versions, leftId, rightId, onLeftChange, onRightChange }: VersionSelectorProps) {
  const options = versions.map((version) => ({
    value: version.id,
    label: `版本 ${version.versionNo} · ${version.remark} · ${new Date(version.createdAt).toLocaleString()}`
  }));

  return (
    <Space wrap className="version-selector">
      <Select
        style={{ width: 320 }}
        placeholder="选择左侧版本"
        value={leftId}
        options={options}
        onChange={onLeftChange}
        disabled={!versions.length}
      />
      <Select
        style={{ width: 320 }}
        placeholder="选择右侧版本"
        value={rightId}
        options={options}
        onChange={onRightChange}
        disabled={!versions.length}
      />
    </Space>
  );
}
