import { create } from 'zustand';
import { instanceDb } from '../api/db';
import { ContractInstance, VariableValues } from '../types/contract-instance';
import { ContractStatus } from '../types/enums';
import { Template } from '../types/template';
import { makeId, nowIso, putRecord } from '../utils/db';
import { seedInstances } from '../utils/seed';
import { replaceVariables } from '../hooks/useVariableReplace';

interface InstanceState {
  instances: ContractInstance[];
  loading: boolean;
  loadInstances: () => Promise<void>;
  createFromTemplate: (template: Template) => Promise<ContractInstance>;
  updateInstance: (instance: ContractInstance) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  setInstanceStatus: (id: string, status: ContractStatus) => Promise<void>;
}

function sortInstances(instances: ContractInstance[]) {
  return [...instances].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function upsertInstance(list: ContractInstance[], instance: ContractInstance) {
  const exists = list.some((item) => item.id === instance.id);
  return sortInstances(exists ? list.map((item) => (item.id === instance.id ? instance : item)) : [instance, ...list]);
}

function valuesFromTemplate(template: Template): VariableValues {
  return template.variables.reduce<VariableValues>((acc, variable) => {
    acc[variable.name] = variable.defaultValue;
    return acc;
  }, {});
}

export const useInstanceStore = create<InstanceState>((set, get) => ({
  instances: [],
  loading: false,

  async loadInstances() {
    set({ loading: true });
    try {
      let instances = await instanceDb.list();
      if (!instances.length && seedInstances.length) {
        await Promise.all(seedInstances.map((instance) => putRecord('instances', instance)));
        instances = seedInstances;
      }
      set({ instances: sortInstances(instances) });
    } finally {
      set({ loading: false });
    }
  },

  async createFromTemplate(template) {
    const timestamp = nowIso();
    const variableValues = valuesFromTemplate(template);
    const instance: ContractInstance = {
      id: makeId('inst'),
      templateId: template.id,
      title: `${template.title} - 合同实例`,
      variableValues,
      finalHtml: replaceVariables(template, variableValues),
      status: ContractStatus.Draft,
      versionIds: [],
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await instanceDb.save(instance);
    set((state) => ({ instances: upsertInstance(state.instances, instance) }));
    return instance;
  },

  async updateInstance(instance) {
    const next = { ...instance, updatedAt: nowIso() };
    await instanceDb.save(next);
    set((state) => ({ instances: upsertInstance(state.instances, next) }));
  },

  async deleteInstance(id) {
    await instanceDb.remove(id);
    set((state) => ({ instances: state.instances.filter((instance) => instance.id !== id) }));
  },

  async setInstanceStatus(id, status) {
    const instance = get().instances.find((item) => item.id === id);
    if (!instance) {
      return;
    }

    await get().updateInstance({ ...instance, status });
  }
}));
