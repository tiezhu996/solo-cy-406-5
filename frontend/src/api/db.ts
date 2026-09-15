import {
  deleteRecord,
  exportAllData,
  getAllRecords,
  getRecord,
  importAllData,
  putRecord,
  StoreName,
  StoreValue
} from '../utils/db';

export const persistenceApi = {
  list: getAllRecords,
  get: getRecord,
  save: putRecord,
  remove: deleteRecord,
  exportAll: exportAllData,
  importAll: importAllData
};

export function createStoreApi<S extends StoreName>(storeName: S) {
  return {
    list: () => getAllRecords(storeName),
    get: (id: string) => getRecord(storeName, id),
    save: (record: StoreValue<S>) => putRecord(storeName, record),
    remove: (id: string) => deleteRecord(storeName, id)
  };
}

export const templateDb = createStoreApi('templates');
export const clauseDb = createStoreApi('clauses');
export const instanceDb = createStoreApi('instances');
export const versionDb = createStoreApi('versions');
