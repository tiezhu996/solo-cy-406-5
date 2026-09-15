import { useCallback, useState } from 'react';

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useHistory<T>(initialState: T) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: []
  });

  const push = useCallback((next: T) => {
    setHistory((current) => {
      if (Object.is(current.present, next)) {
        return current;
      }

      return {
        past: [...current.past, current.present],
        present: next,
        future: []
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      if (!current.past.length) {
        return current;
      }

      const previous = current.past[current.past.length - 1];
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      if (!current.future.length) {
        return current;
      }

      const next = current.future[0];
      return {
        past: [...current.past, current.present],
        present: next,
        future: current.future.slice(1)
      };
    });
  }, []);

  const reset = useCallback((next: T) => {
    setHistory({
      past: [],
      present: next,
      future: []
    });
  }, []);

  return {
    value: history.present,
    push,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    history
  };
}
