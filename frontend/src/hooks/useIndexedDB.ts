import { useCallback, useEffect, useState } from 'react';
import { persistenceApi } from '../api/db';
import { StoreName, StoreValue } from '../utils/db';

export function useIndexedDB<S extends StoreName>(storeName: S) {
  const [items, setItems] = useState<StoreValue<S>[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await persistenceApi.list(storeName));
    } finally {
      setLoading(false);
    }
  }, [storeName]);

  const save = useCallback(
    async (record: StoreValue<S>) => {
      await persistenceApi.save(storeName, record);
      await refresh();
    },
    [refresh, storeName]
  );

  const remove = useCallback(
    async (id: string) => {
      await persistenceApi.remove(storeName, id);
      await refresh();
    },
    [refresh, storeName]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    items,
    loading,
    refresh,
    save,
    remove
  };
}
