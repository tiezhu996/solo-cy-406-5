import { TemplateCategory, VariableType } from './enums';

export interface TemplateVariable {
  id: string;
  name: string;
  label: string;
  type: VariableType;
  defaultValue: string;
  required: boolean;
}

export interface Template {
  id: string;
  title: string;
  category: TemplateCategory;
  contentHtml: string;
  variables: TemplateVariable[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export type TemplateDraft = Omit<Template, 'id' | 'createdAt' | 'updatedAt'>;
