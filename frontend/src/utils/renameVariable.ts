import { replaceVariables } from '../hooks/useVariableReplace';
import { ContractInstance, VariableValues } from '../types/contract-instance';
import { ContractStatus } from '../types/enums';
import { Template } from '../types/template';
import { nowIso } from './db';
import { buildPlaceholderPattern } from './placeholder';

export type RenameVariableErrorCode =
  | 'VARIABLE_NOT_FOUND'
  | 'NAME_EMPTY'
  | 'NAME_INVALID'
  | 'NAME_UNCHANGED'
  | 'NAME_CONFLICT'
  | 'PLACEHOLDER_MISSING';

export interface RenameVariableFailure {
  ok: false;
  code: RenameVariableErrorCode;
  message: string;
}

export interface RenameVariablePlan {
  ok: true;
  template: Template;
  /** 需要跟随迁移的草稿实例；定稿/已签署实例不在其中，保持原样。 */
  instances: ContractInstance[];
}

export type RenameVariableResult = RenameVariablePlan | RenameVariableFailure;

/** store action 的返回结果：失败时携带可直接展示的中文原因。 */
export type RenameVariableOutcome = { ok: true } | { ok: false; message: string };

const INVALID_NAME_PATTERN = /[{}]/;

function fail(code: RenameVariableErrorCode, message: string): RenameVariableFailure {
  return { ok: false, code, message };
}

/**
 * 纯函数：为「模板变量重命名」生成一份完整变更计划。
 * 任一校验失败都返回失败结果，调用方不得写入任何数据。
 */
export function planVariableRename(
  template: Template,
  instances: ContractInstance[],
  variableId: string,
  rawNewName: string
): RenameVariableResult {
  const variable = template.variables.find((item) => item.id === variableId);
  if (!variable) {
    return fail('VARIABLE_NOT_FOUND', '变量不存在或已被删除');
  }

  const oldName = variable.name;
  const newName = rawNewName.trim();

  if (!newName) {
    return fail('NAME_EMPTY', '新变量名不能为空');
  }
  if (INVALID_NAME_PATTERN.test(newName)) {
    return fail('NAME_INVALID', '变量名不能包含花括号 { }');
  }
  if (newName === oldName) {
    return fail('NAME_UNCHANGED', '新变量名与当前名称相同');
  }
  if (template.variables.some((item) => item.id !== variableId && item.name === newName)) {
    return fail('NAME_CONFLICT', `变量名「${newName}」与现有变量冲突`);
  }
  if (!buildPlaceholderPattern(oldName).test(template.contentHtml)) {
    return fail('PLACEHOLDER_MISSING', `正文中不存在 {{${oldName}}} 占位符，无法重命名`);
  }

  const timestamp = nowIso();
  const renamedTemplate: Template = {
    ...template,
    // 替换函数形式保证新名中的 $ 等特殊字符按字面量写入
    contentHtml: template.contentHtml.replace(buildPlaceholderPattern(oldName), () => `{{${newName}}}`),
    variables: template.variables.map((item) => (item.id === variableId ? { ...item, name: newName } : item)),
    updatedAt: timestamp
  };

  const migratedInstances = instances
    .filter((instance) => instance.templateId === template.id && instance.status === ContractStatus.Draft)
    .map((instance) => {
      const variableValues: VariableValues = { ...instance.variableValues };
      if (Object.prototype.hasOwnProperty.call(variableValues, oldName)) {
        variableValues[newName] = variableValues[oldName];
        delete variableValues[oldName];
      }

      return {
        ...instance,
        variableValues,
        finalHtml: replaceVariables(renamedTemplate, variableValues),
        updatedAt: timestamp
      };
    });

  return { ok: true, template: renamedTemplate, instances: migratedInstances };
}
