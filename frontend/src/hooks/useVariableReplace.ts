import { useMemo } from 'react';
import { Template } from '../types/template';
import { VariableValues } from '../types/contract-instance';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function replaceVariables(template: Template | undefined, values: VariableValues) {
  if (!template) {
    return '';
  }

  return template.variables.reduce((html, variable) => {
    const actualValue = values[variable.name] || variable.defaultValue || `{{${variable.name}}}`;
    const pattern = new RegExp(`{{\\s*${escapeRegExp(variable.name)}\\s*}}`, 'g');
    return html.replace(pattern, actualValue);
  }, template.contentHtml);
}

export function useVariableReplace(template: Template | undefined, values: VariableValues) {
  return useMemo(() => replaceVariables(template, values), [template, values]);
}
