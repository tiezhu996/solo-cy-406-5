import { ClauseCategory } from './enums';

export interface Clause {
  id: string;
  title: string;
  category: ClauseCategory;
  contentHtml: string;
  tags: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ClauseDraft = Omit<Clause, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>;
