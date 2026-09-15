export enum TemplateCategory {
  Labor = 'labor',
  Lease = 'lease',
  Sale = 'sale',
  Service = 'service',
  Loan = 'loan',
  Nda = 'nda'
}

export enum ClauseCategory {
  Breach = 'breach',
  Dispute = 'dispute',
  Confidentiality = 'confidentiality',
  Ip = 'ip',
  Payment = 'payment',
  Termination = 'termination'
}

export enum ContractStatus {
  Draft = 'draft',
  Finalized = 'finalized',
  Signed = 'signed'
}

export enum VariableType {
  Text = 'text',
  LongText = 'longText',
  Number = 'number',
  Currency = 'currency',
  Date = 'date'
}

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  [TemplateCategory.Labor]: '劳动',
  [TemplateCategory.Lease]: '租赁',
  [TemplateCategory.Sale]: '买卖',
  [TemplateCategory.Service]: '服务',
  [TemplateCategory.Loan]: '借款',
  [TemplateCategory.Nda]: '保密'
};

export const CLAUSE_CATEGORY_LABELS: Record<ClauseCategory, string> = {
  [ClauseCategory.Breach]: '违约',
  [ClauseCategory.Dispute]: '争议解决',
  [ClauseCategory.Confidentiality]: '保密',
  [ClauseCategory.Ip]: '知识产权',
  [ClauseCategory.Payment]: '付款',
  [ClauseCategory.Termination]: '终止'
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  [ContractStatus.Draft]: '草稿',
  [ContractStatus.Finalized]: '定稿',
  [ContractStatus.Signed]: '已签署'
};

export const VARIABLE_TYPE_LABELS: Record<VariableType, string> = {
  [VariableType.Text]: '短文本',
  [VariableType.LongText]: '长文本',
  [VariableType.Number]: '数字',
  [VariableType.Currency]: '金额',
  [VariableType.Date]: '日期'
};
