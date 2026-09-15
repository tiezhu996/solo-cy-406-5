import { ContractStatus } from './enums';

export type VariableValues = Record<string, string>;

export interface ContractInstance {
  id: string;
  templateId: string;
  title: string;
  variableValues: VariableValues;
  finalHtml: string;
  status: ContractStatus;
  versionIds: string[];
  createdAt: string;
  updatedAt: string;
}
