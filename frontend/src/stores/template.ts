import { create } from 'zustand';
import { instanceDb, templateDb } from '../api/db';
import { Template, TemplateDraft } from '../types/template';
import { TemplateCategory } from '../types/enums';
import { makeId, nowIso, persistVariableRename, putRecord } from '../utils/db';
import { planVariableRename, RenameVariableOutcome } from '../utils/renameVariable';
import { seedTemplates } from '../utils/seed';
import { useInstanceStore } from './instance';

interface TemplateHistory {
  past: Template[];
  future: Template[];
}

interface TemplateState {
  templates: Template[];
  loading: boolean;
  history: TemplateHistory;
  loadTemplates: () => Promise<void>;
  createTemplate: (draft?: Partial<TemplateDraft>) => Promise<Template>;
  updateTemplate: (template: Template, trackHistory?: boolean) => Promise<void>;
  renameVariable: (templateId: string, variableId: string, newName: string) => Promise<RenameVariableOutcome>;
  deleteTemplate: (id: string) => Promise<void>;
  duplicateTemplate: (id: string) => Promise<Template | undefined>;
  undoTemplateChange: () => Promise<void>;
  redoTemplateChange: () => Promise<void>;
}

const defaultDraft: TemplateDraft = {
  title: '未命名合同模板',
  category: TemplateCategory.Service,
  tags: ['草稿'],
  variables: [],
  contentHtml: '<h2>合同标题</h2><p>在此编辑正文，可使用 {{变量名}} 作为占位符。</p>'
};

function sortTemplates(templates: Template[]) {
  return [...templates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function upsertTemplate(list: Template[], template: Template) {
  const exists = list.some((item) => item.id === template.id);
  return sortTemplates(exists ? list.map((item) => (item.id === template.id ? template : item)) : [template, ...list]);
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  loading: false,
  history: { past: [], future: [] },

  async loadTemplates() {
    set({ loading: true });
    try {
      let templates = await templateDb.list();
      if (!templates.length) {
        await Promise.all(seedTemplates.map((template) => putRecord('templates', template)));
        templates = seedTemplates;
      }
      set({ templates: sortTemplates(templates) });
    } finally {
      set({ loading: false });
    }
  },

  async createTemplate(draft) {
    const timestamp = nowIso();
    const template: Template = {
      ...defaultDraft,
      ...draft,
      id: makeId('tpl'),
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await templateDb.save(template);
    set((state) => ({ templates: upsertTemplate(state.templates, template) }));
    return template;
  },

  async updateTemplate(template, trackHistory = true) {
    const current = get().templates.find((item) => item.id === template.id);
    const next = { ...template, updatedAt: nowIso() };

    await templateDb.save(next);
    set((state) => ({
      templates: upsertTemplate(state.templates, next),
      history:
        trackHistory && current
          ? {
              past: [...state.history.past, current].slice(-50),
              future: []
            }
          : state.history
    }));
  },

  async renameVariable(templateId, variableId, newName) {
    const template = get().templates.find((item) => item.id === templateId);
    if (!template) {
      return { ok: false, message: '模板不存在或已被删除' };
    }

    // 从持久层读取全部实例，而非内存中的实例 store：模板编辑器被直接打开或刷新后，
    // 实例 store 可能尚未水合，从内存取数会漏迁已有草稿。
    const instances = await instanceDb.list();
    const plan = planVariableRename(template, instances, variableId, newName);
    if (!plan.ok) {
      return { ok: false, message: plan.message };
    }

    try {
      await persistVariableRename(plan.template, plan.instances);
    } catch (error) {
      console.error('变量重命名落库失败，本次操作未生效', error);
      return { ok: false, message: '写入本地数据库失败，本次重命名未生效' };
    }

    // 落库成功后才更新内存状态；不记入模板 undo 历史（undo 无法回滚实例迁移）。
    set((state) => ({ templates: upsertTemplate(state.templates, plan.template) }));
    useInstanceStore.getState().applyMigratedInstances(plan.instances);
    return { ok: true };
  },

  async deleteTemplate(id) {
    await templateDb.remove(id);
    set((state) => ({ templates: state.templates.filter((template) => template.id !== id) }));
  },

  async duplicateTemplate(id) {
    const source = get().templates.find((template) => template.id === id);
    if (!source) {
      return undefined;
    }

    return get().createTemplate({
      title: `${source.title} 副本`,
      category: source.category,
      contentHtml: source.contentHtml,
      variables: source.variables.map((variable) => ({ ...variable, id: makeId('var') })),
      tags: [...source.tags, '副本']
    });
  },

  async undoTemplateChange() {
    const { history, templates } = get();
    const previous = history.past[history.past.length - 1];
    if (!previous) {
      return;
    }

    const current = templates.find((template) => template.id === previous.id);
    await templateDb.save(previous);
    set({
      templates: upsertTemplate(templates, previous),
      history: {
        past: history.past.slice(0, -1),
        future: current ? [current, ...history.future].slice(0, 50) : history.future
      }
    });
  },

  async redoTemplateChange() {
    const { history, templates } = get();
    const next = history.future[0];
    if (!next) {
      return;
    }

    const current = templates.find((template) => template.id === next.id);
    await templateDb.save(next);
    set({
      templates: upsertTemplate(templates, next),
      history: {
        past: current ? [...history.past, current].slice(-50) : history.past,
        future: history.future.slice(1)
      }
    });
  }
}));
