import { VariableValues } from './contract-instance';

export interface Version {
  id: string;
  contractInstanceId: string;
  versionNo: number;
  contentSnapshot: string;
  variableSnapshot: VariableValues;
  createdAt: string;
  remark: string;
}
