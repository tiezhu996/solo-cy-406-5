import { DatePicker, Form, Input, InputNumber, Space, Typography } from '@arco-design/web-react';
import { TemplateVariable } from '../../types/template';
import { VariableType } from '../../types/enums';
import { VariableValues } from '../../types/contract-instance';

interface VariableFormProps {
  variables: TemplateVariable[];
  values: VariableValues;
  onChange: (values: VariableValues) => void;
}

export function VariableForm({ variables, values, onChange }: VariableFormProps) {
  const updateValue = (name: string, value: string) => {
    onChange({ ...values, [name]: value });
  };

  if (!variables.length) {
    return <div className="empty-state">当前模板没有变量，占位符会按正文原样保留。</div>;
  }

  return (
    <Form layout="vertical" className="variable-form">
      {variables.map((variable) => (
        <Form.Item
          key={variable.id}
          label={
            <Space size={6}>
              <Typography.Text>{variable.label || variable.name}</Typography.Text>
              <Typography.Text type="secondary">{`{{${variable.name}}}`}</Typography.Text>
            </Space>
          }
          required={variable.required}
        >
          {variable.type === VariableType.LongText ? (
            <Input.TextArea
              value={values[variable.name] ?? variable.defaultValue}
              autoSize={{ minRows: 3, maxRows: 6 }}
              onChange={(value) => updateValue(variable.name, value)}
            />
          ) : variable.type === VariableType.Number || variable.type === VariableType.Currency ? (
            <InputNumber
              value={Number(values[variable.name] ?? variable.defaultValue)}
              min={0}
              prefix={variable.type === VariableType.Currency ? '￥' : undefined}
              onChange={(value) => updateValue(variable.name, String(value ?? ''))}
            />
          ) : variable.type === VariableType.Date ? (
            <DatePicker value={values[variable.name] ?? variable.defaultValue} onChange={(value) => updateValue(variable.name, value)} />
          ) : (
            <Input value={values[variable.name] ?? variable.defaultValue} onChange={(value) => updateValue(variable.name, value)} />
          )}
        </Form.Item>
      ))}
    </Form>
  );
}
