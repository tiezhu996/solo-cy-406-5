import { Button, Card, Input, Select, Space, Switch, Typography } from '@arco-design/web-react';
import { IconDelete, IconPlus } from '@arco-design/web-react/icon';
import { TemplateVariable } from '../../types/template';
import { VARIABLE_TYPE_LABELS, VariableType } from '../../types/enums';
import { makeId } from '../../utils/db';

interface VariablePanelProps {
  variables: TemplateVariable[];
  onChange: (variables: TemplateVariable[]) => void;
  onInsertPlaceholder: (name: string) => void;
}

const variableTypeOptions = Object.values(VariableType).map((type) => ({
  label: VARIABLE_TYPE_LABELS[type],
  value: type
}));

export function VariablePanel({ variables, onChange, onInsertPlaceholder }: VariablePanelProps) {
  const addVariable = () => {
    const index = variables.length + 1;
    onChange([
      ...variables,
      {
        id: makeId('var'),
        name: `variable${index}`,
        label: `变量 ${index}`,
        type: VariableType.Text,
        defaultValue: '',
        required: false
      }
    ]);
  };

  const updateVariable = (id: string, patch: Partial<TemplateVariable>) => {
    onChange(variables.map((variable) => (variable.id === id ? { ...variable, ...patch } : variable)));
  };

  const deleteVariable = (id: string) => {
    onChange(variables.filter((variable) => variable.id !== id));
  };

  return (
    <aside className="variable-panel">
      <div className="panel-title">
        <div>
          <Typography.Title heading={6}>变量管理</Typography.Title>
          <Typography.Text type="secondary">变量以 {'{{name}}'} 形式写入正文。</Typography.Text>
        </div>
        <Button icon={<IconPlus />} type="primary" onClick={addVariable}>
          新增
        </Button>
      </div>

      <div className="variable-list">
        {variables.map((variable) => (
          <Card key={variable.id} className="variable-item">
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Input value={variable.label} placeholder="显示名称" onChange={(label) => updateVariable(variable.id, { label })} />
              <Input value={variable.name} placeholder="变量名" onChange={(name) => updateVariable(variable.id, { name })} />
              <Select
                value={variable.type}
                options={variableTypeOptions}
                onChange={(type) => updateVariable(variable.id, { type })}
              />
              <Input
                value={variable.defaultValue}
                placeholder="默认值"
                onChange={(defaultValue) => updateVariable(variable.id, { defaultValue })}
              />
              <div className="variable-actions">
                <Switch
                  size="small"
                  checked={variable.required}
                  checkedText="必填"
                  uncheckedText="选填"
                  onChange={(required) => updateVariable(variable.id, { required })}
                />
                <Button size="small" onClick={() => onInsertPlaceholder(variable.name)}>
                  插入 {'{{ } }'}
                </Button>
                <Button size="small" status="danger" icon={<IconDelete />} onClick={() => deleteVariable(variable.id)} />
              </div>
            </Space>
          </Card>
        ))}
        {!variables.length && <div className="empty-state">暂无变量，新增后可插入到合同正文。</div>}
      </div>
    </aside>
  );
}
