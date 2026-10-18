import { AppStoredState, clearStoredState, DEFAULT_SETTINGS, getDefaultProgress, loadStoredState } from './storage';
import { DEFAULT_SYMBOLS } from '../../data/defaultSymbols';

const DB_NAME = 'MorseLingoDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';
const STATE_KEY = 'root_state';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Loads application state from IndexedDB.
 * If IndexedDB is empty, automatically checks and migrates from LocalStorage.
 */
export async function loadStateFromIndexedDB(): Promise<AppStoredState> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(STATE_KEY);

      request.onsuccess = () => {
        const result = request.result as AppStoredState | undefined;
        if (result && Array.isArray(result.symbols) && result.userProgress) {
          // Merge default symbols in case new defaults were added
          const mergedSymbols = [...result.symbols];
          DEFAULT_SYMBOLS.forEach((def) => {
            if (!mergedSymbols.some((s) => s.id === def.id)) {
              mergedSymbols.push(def);
            }
          });

          resolve({
            version: 2,
            symbols: mergedSymbols,
            userProgress: {
              ...getDefaultProgress(),
              ...result.userProgress,
              exerciseTypeStats: {
                ...getDefaultProgress().exerciseTypeStats,
                ...(result.userProgress.exerciseTypeStats || {}),
              },
            },
            userSettings: {
              ...DEFAULT_SETTINGS,
              ...(result.userSettings || {}),
            },
          });
        } else {
          // Fallback to localStorage and migrate into IndexedDB
          const localState = loadStoredState();
          saveStateToIndexedDB(localState).catch(() => {});
          resolve(localState);
        }
      };

      request.onerror = () => {
        resolve(loadStoredState());
      };
    });
  } catch (err) {
    console.warn('IndexedDB load failed, falling back to LocalStorage:', err);
    return loadStoredState();
  }
}

/**
 * Saves application state to IndexedDB with high durability.
 */
export async function saveStateToIndexedDB(state: AppStoredState): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(state, STATE_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, falling back to LocalStorage only:', err);
  }
}

/**
 * Clears all stored data from IndexedDB and LocalStorage.
 */
export async function clearAllDatabase(): Promise<AppStoredState> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to clear IndexedDB:', err);
  }
  return clearStoredState();
}
