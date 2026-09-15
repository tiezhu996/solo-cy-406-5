import { openDB, IDBPDatabase } from 'idb';
import { Clause } from '../types/clause';
import { ContractInstance } from '../types/contract-instance';
import { Template } from '../types/template';
import { Version } from '../types/version';

export const DB_NAME = 'contract-template-editor';
export const DB_VERSION = 1;

export const STORE_NAMES = ['templates', 'clauses', 'instances', 'versions'] as const;
export type StoreName = (typeof STORE_NAMES)[number];

export interface StoreValueMap {
  templates: Template;
  clauses: Clause;
  instances: ContractInstance;
  versions: Version;
}

export type StoreValue<S extends StoreName> = StoreValueMap[S];

export interface ExportPayload {
  templates: Template[];
  clauses: Clause[];
  instances: ContractInstance[];
  versions: Version[];
  exportedAt: string;
}

let dbPromise: Promise<IDBPDatabase> | undefined;

export function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const storeName of STORE_NAMES) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        }
      }
    });
  }

  return dbPromise;
}

export async function getAllRecords<S extends StoreName>(storeName: S): Promise<StoreValue<S>[]> {
  const db = await getDb();
  return (await db.getAll(storeName)) as StoreValue<S>[];
}

export async function getRecord<S extends StoreName>(storeName: S, id: string): Promise<StoreValue<S> | undefined> {
  const db = await getDb();
  return (await db.get(storeName, id)) as StoreValue<S> | undefined;
}

export async function putRecord<S extends StoreName>(storeName: S, record: StoreValue<S>) {
  const db = await getDb();
  await db.put(storeName, record);
  return record;
}

export async function deleteRecord(storeName: StoreName, id: string) {
  const db = await getDb();
  await db.delete(storeName, id);
}

export async function clearStore(storeName: StoreName) {
  const db = await getDb();
  await db.clear(storeName);
}

/**
 * 变量重命名的原子落库：模板与草稿实例在同一条 IndexedDB 事务中写入，
 * 任一 put 失败都会中止整个事务，保证两处数据要么同时生效、要么都不生效。
 */
export async function persistVariableRename(template: Template, instances: ContractInstance[]) {
  const db = await getDb();
  const tx = db.transaction(['templates', 'instances'], 'readwrite');
  await tx.objectStore('templates').put(template);
  for (const instance of instances) {
    await tx.objectStore('instances').put(instance);
  }
  await tx.done;
}

export async function exportAllData(): Promise<ExportPayload> {
  const [templates, clauses, instances, versions] = await Promise.all([
    getAllRecords('templates'),
    getAllRecords('clauses'),
    getAllRecords('instances'),
    getAllRecords('versions')
  ]);

  return {
    templates,
    clauses,
    instances,
    versions,
    exportedAt: nowIso()
  };
}

export async function importAllData(payload: Partial<ExportPayload>) {
  const db = await getDb();
  const tx = db.transaction(STORE_NAMES, 'readwrite');

  for (const storeName of STORE_NAMES) {
    const store = tx.objectStore(storeName);
    await store.clear();
    const records = (payload[storeName] ?? []) as StoreValue<typeof storeName>[];
    for (const record of records) {
      await store.put(record);
    }
  }

  await tx.done;
}
