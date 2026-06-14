import { useState, useCallback, useEffect, useRef } from 'react';
import { DatabaseAdapter, IDatabaseAdapter, StorageType, DatabaseConfig, SyncResult, BackupResult } from '../db/database-adapter';

/**
 * useDatabase Hook
 * 
 * Manages database operations with loading and error states.
 * Usage:
 *   const { db, loading, error, sync, backup, connect } = useDatabase('local');
 *   const patients = await db.patients.findAll();
 */
export function useDatabase(type?: StorageType, config?: Partial<DatabaseConfig>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const dbRef = useRef<IDatabaseAdapter | null>(null);

  const getDb = useCallback((): IDatabaseAdapter => {
    if (!dbRef.current) {
      if (config) {
        DatabaseAdapter.configure({ type: type || StorageType.LOCAL, ...config });
      }
      dbRef.current = DatabaseAdapter.create(type);
    }
    return dbRef.current;
  }, [type, config]);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const db = getDb();
      await db.connect();
      setConnected(true);
    } catch (err) {
      setError(String(err));
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [getDb]);

  const sync = useCallback(async (remoteDb: IDatabaseAdapter): Promise<SyncResult> => {
    setLoading(true);
    setError(null);
    try {
      const db = getDb();
      const result = await db.sync(remoteDb);
      return result;
    } catch (err) {
      setError(String(err));
      return {
        success: false,
        syncedAt: new Date().toISOString(),
        patients: 0,
        appointments: 0,
        tests: 0,
        errors: [String(err)]
      };
    } finally {
      setLoading(false);
    }
  }, [getDb]);

  const backup = useCallback(async (): Promise<BackupResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const db = getDb();
      const result = await db.backup();
      return result;
    } catch (err) {
      setError(String(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, [getDb]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
  }, [connect]);

  return {
    db: getDb(),
    loading,
    error,
    connected,
    connect,
    sync,
    backup,
    getDb
  };
}

export default useDatabase;
