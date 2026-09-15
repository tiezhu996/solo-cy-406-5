import { Clause } from '../types/clause';
import { ContractInstance } from '../types/contract-instance';
import { ClauseCategory, ContractStatus, TemplateCategory, VariableType } from '../types/enums';
import { Template } from '../types/template';
import { Version } from '../types/version';
import { makeId, nowIso } from './db';

const createdAt = nowIso();

export const seedTemplates: Template[] = [
  {
    id: makeId('tpl'),
    title: '劳动合同标准模板',
    category: TemplateCategory.Labor,
    tags: ['入职', '标准版', '试用期'],
    createdAt,
    updatedAt: createdAt,
    variables: [
      { id: makeId('var'), name: 'partyA', label: '甲方公司', type: VariableType.Text, defaultValue: '某某科技有限公司', required: true },
      { id: makeId('var'), name: 'partyB', label: '乙方姓名', type: VariableType.Text, defaultValue: '张三', required: true },
      { id: makeId('var'), name: 'salary', label: '月薪', type: VariableType.Currency, defaultValue: '15000', required: true },
      { id: makeId('var'), name: 'startDate', label: '入职日期', type: VariableType.Date, defaultValue: '2026-07-01', required: true }
    ],
    contentHtml:
      '<h2>劳动合同</h2><p>甲方：{{partyA}}</p><p>乙方：{{partyB}}</p><p>乙方自 {{startDate}} 起入职甲方，月工资为人民币 {{salary}} 元。</p><p>双方应遵守劳动法律法规及公司制度。</p>'
  },
  {
    id: makeId('tpl'),
    title: '保密协议模板',
    category: TemplateCategory.Nda,
    tags: ['NDA', '商业秘密', '合作前'],
    createdAt,
    updatedAt: createdAt,
    variables: [
      { id: makeId('var'), name: 'discloser', label: '披露方', type: VariableType.Text, defaultValue: '甲方', required: true },
      { id: makeId('var'), name: 'recipient', label: '接收方', type: VariableType.Text, defaultValue: '乙方', required: true },
      { id: makeId('var'), name: 'termYears', label: '保密期限（年）', type: VariableType.Number, defaultValue: '3', required: true }
    ],
    contentHtml:
      '<h2>保密协议</h2><p>{{discloser}} 向 {{recipient}} 披露的商业信息均属于保密信息。</p><p>接收方应在 {{termYears}} 年内承担保密义务，不得向第三方披露。</p>'
  }
];

export const seedClauses: Clause[] = [
  {
    id: makeId('clause'),
    title: '逾期付款违约金',
    category: ClauseCategory.Payment,
    tags: ['付款', '违约金'],
    usageCount: 0,
    createdAt,
    updatedAt: createdAt,
    contentHtml: '<h3>付款违约责任</h3><p>任何一方逾期付款的，应按逾期金额每日万分之五向守约方支付违约金。</p>'
  },
  {
    id: makeId('clause'),
    title: '仲裁争议解决',
    category: ClauseCategory.Dispute,
    tags: ['仲裁', '争议解决'],
    usageCount: 0,
    createdAt,
    updatedAt: createdAt,
    contentHtml: '<h3>争议解决</h3><p>因本合同产生的争议，双方应先行友好协商；协商不成的，提交签约地仲裁委员会仲裁。</p>'
  },
  {
    id: makeId('clause'),
    title: '知识产权归属',
    category: ClauseCategory.Ip,
    tags: ['成果', '知识产权'],
    usageCount: 0,
    createdAt,
    updatedAt: createdAt,
    contentHtml: '<h3>知识产权</h3><p>履约过程中形成的交付成果及相关知识产权，除双方另有约定外，归委托方所有。</p>'
  }
];

export const seedInstances: ContractInstance[] = [];
export const seedVersions: Version[] = [];

export const seedData = {
  templates: seedTemplates,
  clauses: seedClauses,
  instances: seedInstances,
  versions: seedVersions
};
