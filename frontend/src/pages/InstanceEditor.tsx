import { Button, Input, Message, Select, Space, Typography } from '@arco-design/web-react';
import { IconHistory, IconSave } from '@arco-design/web-react/icon';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { VariableForm } from '../components/common';
import { ContractPreview } from '../components/preview/ContractPreview';
import { useVariableReplace } from '../hooks/useVariableReplace';
import { useInstanceStore } from '../stores/instance';
import { useTemplateStore } from '../stores/template';
import { useVersionStore } from '../stores/version';
import { ContractStatus, CONTRACT_STATUS_LABELS } from '../types/enums';
import { VariableValues } from '../types/contract-instance';

const statusOptions = Object.values(ContractStatus).map((value) => ({
  label: CONTRACT_STATUS_LABELS[value],
  value
}));

export function InstanceEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [values, setValues] = useState<VariableValues>({});
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState(ContractStatus.Draft);
  const [remark, setRemark] = useState('');
  const { instances, loadInstances, updateInstance } = useInstanceStore();
  const { templates, loadTemplates } = useTemplateStore();
  const { loadVersions, saveVersion } = useVersionStore();

  useEffect(() => {
    void Promise.all([loadInstances(), loadTemplates(), loadVersions()]);
  }, [loadInstances, loadTemplates, loadVersions]);

  const instance = useMemo(() => instances.find((item) => item.id === id), [id, instances]);
  const template = useMemo(() => templates.find((item) => item.id === instance?.templateId), [instance?.templateId, templates]);
  const previewHtml = useVariableReplace(template, values);

  useEffect(() => {
    if (instance) {
      setValues(instance.variableValues);
      setTitle(instance.title);
      setStatus(instance.status);
    }
  }, [instance]);

  if (!instance || !template) {
    return <div className="empty-state">正在加载合同实例...</div>;
  }

  const buildNextInstance = () => ({
    ...instance,
    title: title || instance.title,
    variableValues: values,
    finalHtml: previewHtml,
    status
  });

  const saveInstance = async () => {
    await updateInstance(buildNextInstance());
    Message.success('合同实例已保存');
  };

  const saveSnapshot = async () => {
    const nextInstance = buildNextInstance();
    await updateInstance(nextInstance);
    const version = await saveVersion(nextInstance, remark);
    await updateInstance({
      ...nextInstance,
      versionIds: Array.from(new Set([...nextInstance.versionIds, version.id]))
    });
    setRemark('');
    Message.success(`已保存版本 ${version.versionNo}`);
  };

  return (
    <section className="page-section instance-page">
      <div className="page-heading">
        <div>
          <Typography.Title heading={3}>合同实例编辑</Typography.Title>
          <Typography.Text type="secondary">填写变量后实时生成最终合同 HTML。</Typography.Text>
        </div>
        <Space wrap>
          <Button icon={<IconHistory />} onClick={() => navigate(`/instances/${instance.id}/versions`)}>
            版本对比
          </Button>
          <Button icon={<IconSave />} onClick={() => void saveInstance()}>
            保存实例
          </Button>
          <Button type="primary" onClick={() => void saveSnapshot()}>
            保存版本
          </Button>
        </Space>
      </div>

      <div className="instance-meta-bar">
        <Input value={title} onChange={setTitle} placeholder="实例标题" />
        <Select value={status} options={statusOptions} onChange={setStatus} />
        <Input value={remark} onChange={setRemark} placeholder="版本备注，例如：客户首轮修改" />
      </div>

      <div className="instance-grid">
        <ContractPreview title={title || instance.title} html={previewHtml} />
        <div className="form-panel">
          <Typography.Title heading={5}>变量填写</Typography.Title>
          <VariableForm variables={template.variables} values={values} onChange={setValues} />
        </div>
      </div>
    </section>
  );
}
