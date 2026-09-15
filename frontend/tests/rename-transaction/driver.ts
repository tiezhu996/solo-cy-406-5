import { useTemplateStore } from '../../src/stores/template';
import { useInstanceStore } from '../../src/stores/instance';
import { DB_NAME, getAllRecords, getDb, putRecord } from '../../src/utils/db';
import { planVariableRename } from '../../src/utils/renameVariable';
import type { ContractInstance } from '../../src/types/contract-instance';
import type { Template } from '../../src/types/template';

/**
 * 浏览器侧测试驱动：把 src 下的真实模块原样暴露给 Node 编排层。
 * 不复制、不替换任何业务逻辑；所有读写都经过应用自己的连接与真实 IndexedDB。
 */
export interface PutLogEntry {
  seq: number;
  store: string;
  key: string | undefined;
  phase: 'request' | 'success' | 'error';
  error?: string;
}

const api = {
  DB_NAME,

  /** 用指定模板重置内存态，模拟「页面刚加载完模板、实例 store 尚未水合」。 */
  resetStores(template: Template) {
    useTemplateStore.setState({ templates: [template] });
    useInstanceStore.setState({ instances: [] });
  },

  async seedTemplate(template: Template) {
    await putRecord('templates', template);
  },

  async seedInstances(instances: ContractInstance[]) {
    for (const instance of instances) {
      await putRecord('instances', instance);
    }
  },

  /** 线上同款的重命名编排入口（stores/template.ts）。 */
  rename(templateId: string, variableId: string, newName: string) {
    return useTemplateStore.getState().renameVariable(templateId, variableId, newName);
  },

  /** 纯函数直调：预算期望结果用于断言，不产生任何写入。 */
  plan(template: Template, instances: ContractInstance[], variableId: string, newName: string) {
    return planVariableRename(template, instances, variableId, newName);
  },

  async readBack() {
    const [templates, instances] = await Promise.all([getAllRecords('templates'), getAllRecords('instances')]);
    return { templates, instances };
  },

  /**
   * 在真实 IDBObjectStore.prototype.put 上加日志探针：addEventListener 只观察、
   * 不 preventDefault、不覆盖任何既有处理器，事务的成功/中止语义完全由浏览器原生执行。
   */
  installPutTap() {
    const log: PutLogEntry[] = [];
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: unknown[]) {
      const request = original.apply(this, args as [unknown, IDBValidKey]);
      const entry: PutLogEntry = {
        seq: log.length + 1,
        store: this.name,
        key: (args[0] as { id?: string } | undefined)?.id,
        phase: 'request'
      };
      log.push(entry);
      request.addEventListener('success', () => {
        entry.phase = 'success';
      });
      request.addEventListener('error', () => {
        entry.phase = 'error';
        entry.error = request.error?.name ?? 'UnknownError';
      });
      return request;
    } as typeof IDBObjectStore.prototype.put;
    (window as unknown as { __putLog: PutLogEntry[] }).__putLog = log;
  },

  getPutLog(): PutLogEntry[] {
    return (window as unknown as { __putLog?: PutLogEntry[] }).__putLog ?? [];
  },

  /** 关闭本页面缓存的应用连接（配合 deleteDatabase 清理）。 */
  async closeDb() {
    (await getDb()).close();
  }
};

export type RenameTestApi = typeof api;

(window as unknown as { __renameTest: RenameTestApi }).__renameTest = api;
