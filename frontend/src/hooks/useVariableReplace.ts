import { useMemo } from 'react';
import { Template } from '../types/template';
import { VariableValues } from '../types/contract-instance';
import { buildPlaceholderPattern } from '../utils/placeholder';

export function replaceVariables(template: Template | undefined, values: VariableValues) {
  if (!template) {
    return '';
  }

  return template.variables.reduce((html, variable) => {
    const actualValue = values[variable.name] || variable.defaultValue || `{{${variable.name}}}`;
    return html.replace(buildPlaceholderPattern(variable.name), actualValue);
  }, template.contentHtml);
}

export function useVariableReplace(template: Template | undefined, values: VariableValues) {
  return useMemo(() => replaceVariables(template, values), [template, values]);
}
