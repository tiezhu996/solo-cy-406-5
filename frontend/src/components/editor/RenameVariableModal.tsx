import { Input, Message, Modal, Typography } from '@arco-design/web-react';
import { useEffect, useState } from 'react';
import { useTemplateStore } from '../../stores/template';
import { TemplateVariable } from '../../types/template';

interface RenameVariableModalProps {
  templateId: string;
  variable: TemplateVariable | null;
  onClose: () => void;
  /** 重命名事务已落库并更新 store 后回调，供编辑器同步本地草稿。 */
  onRenamed: () => void;
}

/**
 * 模板变量唯一的重命名入口：提交后正文占位符、变量定义与草稿合同
 * 在同一事务中迁移；校验或写入任一失败，整次操作不生效。
 */
export function RenameVariableModal({ templateId, variable, onClose, onRenamed }: RenameVariableModalProps) {
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const renameVariable = useTemplateStore((state) => state.renameVariable);

  useEffect(() => {
    if (variable) {
      setNewName(variable.name);
    }
  }, [variable]);

  const handleOk = async () => {
    if (!variable) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await renameVariable(templateId, variable.id, newName);
      if (!result.ok) {
        Message.error(result.message);
        return;
      }

      Message.success(`变量「${variable.name}」已重命名为「${newName.trim()}」`);
      onRenamed();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="重命名变量"
      visible={variable !== null}
      onOk={() => void handleOk()}
      onCancel={onClose}
      confirmLoading={submitting}
      okText="确认重命名"
      cancelText="取消"
      unmountOnExit
    >
      {variable && (
        <div className="rename-variable-form">
          <Typography.Paragraph>
            当前变量名：<Typography.Text code>{`{{${variable.name}}}`}</Typography.Text>
          </Typography.Paragraph>
          <Input
            value={newName}
            placeholder="输入新变量名"
            onChange={setNewName}
            onPressEnter={() => void handleOk()}
            autoFocus
          />
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            确认后，模板正文中的全部占位符、变量定义与草稿合同的变量键值将同步使用新名；
            已定稿或已签署的合同保持原样。若新名与现有变量冲突或写入失败，本次操作不会生效。
          </Typography.Paragraph>
        </div>
      )}
    </Modal>
  );
}
