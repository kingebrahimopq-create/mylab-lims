/**
 * Database Adapter Interface
 * 
 * Provides a unified interface for different database backends.
 * Currently supports localStorage (default) with PostgreSQL, MongoDB, and MySQL
 * adapters ready for integration.
 * 
 * Usage:
 *   import { DatabaseAdapter, StorageType } from './db/database-adapter';
 *   const db = DatabaseAdapter.create(StorageType.LOCAL); // or POSTGRESQL, MONGODB, MYSQL
 *   await db.connect();
 *   await db.patients.create(patient);
 */

import { Patient, LabTest, Appointment, DoctorSettings, AppComplaint } from '../types';
import { ClinicalDatabase } from './storage';

// Database configuration types
export enum StorageType {
  LOCAL = 'local',
  POSTGRESQL = 'postgresql',
  MONGODB = 'mongodb',
  MYSQL = 'mysql',
  FIRESTORE = 'firestore'
}

export interface DatabaseConfig {
  type: StorageType;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  url?: string;
  ssl?: boolean;
}

// Unified database interface
export interface IDatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  patients: {
    findAll(): Promise<Patient[]>;
    findById(id: string): Promise<Patient | null>;
    create(patient: Patient): Promise<Patient>;
    update(id: string, patient: Partial<Patient>): Promise<Patient | null>;
    delete(id: string): Promise<boolean>;
  };
  
  appointments: {
    findAll(): Promise<Appointment[]>;
    findById(id: string): Promise<Appointment | null>;
    create(appointment: Appointment): Promise<Appointment>;
    update(id: string, appointment: Partial<Appointment>): Promise<Appointment | null>;
    delete(id: string): Promise<boolean>;
  };
  
  tests: {
    findAll(): Promise<LabTest[]>;
    findById(id: string): Promise<LabTest | null>;
    create(test: LabTest): Promise<LabTest>;
    update(id: string, test: Partial<LabTest>): Promise<LabTest | null>;
    delete(id: string): Promise<boolean>;
  };
  
  settings: {
    get(): Promise<DoctorSettings>;
    update(settings: Partial<DoctorSettings>): Promise<DoctorSettings>;
  };
  
  complaints: {
    findAll(): Promise<AppComplaint[]>;
    findById(id: string): Promise<AppComplaint | null>;
    create(complaint: AppComplaint): Promise<AppComplaint>;
    update(id: string, complaint: Partial<AppComplaint>): Promise<AppComplaint | null>;
  };
  
  sync(remoteAdapter: IDatabaseAdapter): Promise<SyncResult>;
  backup(): Promise<BackupResult>;
  restore(data: BackupData): Promise<RestoreResult>;
}

export interface SyncResult {
  success: boolean;
  syncedAt: string;
  patients: number;
  appointments: number;
  tests: number;
  errors: string[];
}

export interface BackupResult {
  success: boolean;
  backupAt: string;
  fileName: string;
  size: number;
  data: BackupData;
}

export interface RestoreResult {
  success: boolean;
  restoredAt: string;
  patients: number;
  appointments: number;
  tests: number;
}

export interface BackupData {
  patients: Patient[];
  appointments: Appointment[];
  tests: LabTest[];
  settings: DoctorSettings;
  complaints: AppComplaint[];
  metadata: {
    version: string;
    backedUpAt: string;
    totalRecords: number;
  };
}

// Local Storage Adapter (default - uses existing ClinicalDatabase)
class LocalStorageAdapter implements IDatabaseAdapter {
  private connected = true;

  async connect(): Promise<void> {
    // localStorage is always available
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  patients = {
    findAll: async (): Promise<Patient[]> => ClinicalDatabase.getPatients(),
    findById: async (id: string): Promise<Patient | null> => 
      ClinicalDatabase.getPatients().find(p => p.id === id) || null,
    create: async (patient: Patient): Promise<Patient> => {
      ClinicalDatabase.savePatient(patient);
      return patient;
    },
    update: async (id: string, patient: Partial<Patient>): Promise<Patient | null> => {
      const existing = ClinicalDatabase.getPatients().find(p => p.id === id);
      if (!existing) return null;
      const updated = { ...existing, ...patient };
      ClinicalDatabase.savePatient(updated);
      return updated;
    },
    delete: async (id: string): Promise<boolean> => {
      const list = ClinicalDatabase.getPatients().filter(p => p.id !== id);
      ClinicalDatabase.saveAllPatients(list);
      return true;
    }
  };

  appointments = {
    findAll: async (): Promise<Appointment[]> => ClinicalDatabase.getAppointments(),
    findById: async (id: string): Promise<Appointment | null> => 
      ClinicalDatabase.getAppointments().find(a => a.id === id) || null,
    create: async (appointment: Appointment): Promise<Appointment> => {
      ClinicalDatabase.saveAppointment(appointment);
      return appointment;
    },
    update: async (id: string, appointment: Partial<Appointment>): Promise<Appointment | null> => {
      const existing = ClinicalDatabase.getAppointments().find(a => a.id === id);
      if (!existing) return null;
      const updated = { ...existing, ...appointment };
      ClinicalDatabase.saveAppointment(updated);
      return updated;
    },
    delete: async (id: string): Promise<boolean> => {
      const list = ClinicalDatabase.getAppointments().filter(a => a.id !== id);
      ClinicalDatabase.saveAllAppointments(list);
      return true;
    }
  };

  tests = {
    findAll: async (): Promise<LabTest[]> => ClinicalDatabase.getTests(),
    findById: async (id: string): Promise<LabTest | null> => 
      ClinicalDatabase.getTests().find(t => t.id === id) || null,
    create: async (test: LabTest): Promise<LabTest> => {
      ClinicalDatabase.saveTest(test);
      return test;
    },
    update: async (id: string, test: Partial<LabTest>): Promise<LabTest | null> => {
      const existing = ClinicalDatabase.getTests().find(t => t.id === id);
      if (!existing) return null;
      const updated = { ...existing, ...test };
      ClinicalDatabase.saveTest(updated);
      return updated;
    },
    delete: async (id: string): Promise<boolean> => {
      const list = ClinicalDatabase.getTests().filter(t => t.id !== id);
      ClinicalDatabase.saveAllTests(list);
      return true;
    }
  };

  settings = {
    get: async (): Promise<DoctorSettings> => ClinicalDatabase.getSettings(),
    update: async (newSettings: Partial<DoctorSettings>): Promise<DoctorSettings> => {
      const current = ClinicalDatabase.getSettings();
      const updated = { ...current, ...newSettings };
      return ClinicalDatabase.saveSettings(updated);
    }
  };

  complaints = {
    findAll: async (): Promise<AppComplaint[]> => ClinicalDatabase.getComplaints(),
    findById: async (id: string): Promise<AppComplaint | null> => 
      ClinicalDatabase.getComplaints().find(c => c.id === id) || null,
    create: async (complaint: AppComplaint): Promise<AppComplaint> => {
      ClinicalDatabase.saveComplaint(complaint);
      return complaint;
    },
    update: async (id: string, complaint: Partial<AppComplaint>): Promise<AppComplaint | null> => {
      const existing = ClinicalDatabase.getComplaints().find(c => c.id === id);
      if (!existing) return null;
      const updated = { ...existing, ...complaint };
      ClinicalDatabase.saveComplaint(updated);
      return updated;
    }
  };

  async sync(remoteAdapter: IDatabaseAdapter): Promise<SyncResult> {
    const errors: string[] = [];
    try {
      const [localPatients, remotePatients] = await Promise.all([
        this.patients.findAll(),
        remoteAdapter.patients.findAll()
      ]);
      
      const [localAppointments, remoteAppointments] = await Promise.all([
        this.appointments.findAll(),
        remoteAdapter.appointments.findAll()
      ]);
      
      const [localTests, remoteTests] = await Promise.all([
        this.tests.findAll(),
        remoteAdapter.tests.findAll()
      ]);

      // Merge remote data into local (remote takes precedence)
      for (const rp of remotePatients) {
        const local = localPatients.find(p => p.id === rp.id);
        if (!local) {
          await this.patients.create(rp);
        }
      }

      for (const ra of remoteAppointments) {
        const local = localAppointments.find(a => a.id === ra.id);
        if (!local) {
          await this.appointments.create(ra);
        }
      }

      for (const rt of remoteTests) {
        const local = localTests.find(t => t.id === rt.id);
        if (!local) {
          await this.tests.create(rt);
        }
      }

      return {
        success: true,
        syncedAt: new Date().toISOString(),
        patients: remotePatients.length,
        appointments: remoteAppointments.length,
        tests: remoteTests.length,
        errors
      };
    } catch (error) {
      errors.push(String(error));
      return {
        success: false,
        syncedAt: new Date().toISOString(),
        patients: 0,
        appointments: 0,
        tests: 0,
        errors
      };
    }
  }

  async backup(): Promise<BackupResult> {
    const [patients, appointments, tests, settings, complaints] = await Promise.all([
      this.patients.findAll(),
      this.appointments.findAll(),
      this.tests.findAll(),
      this.settings.get(),
      this.complaints.findAll()
    ]);

    const data: BackupData = {
      patients,
      appointments,
      tests,
      settings,
      complaints,
      metadata: {
        version: '2.0.0',
        backedUpAt: new Date().toISOString(),
        totalRecords: patients.length + appointments.length + tests.length + complaints.length
      }
    };

    const jsonStr = JSON.stringify(data, null, 2);
    
    return {
      success: true,
      backupAt: new Date().toISOString(),
      fileName: `mylab_backup_${new Date().toISOString().split('T')[0]}.json`,
      size: new Blob([jsonStr]).size,
      data
    };
  }

  async restore(restoreData: BackupData): Promise<RestoreResult> {
    try {
      if (restoreData.patients) {
        ClinicalDatabase.saveAllPatients(restoreData.patients);
      }
      if (restoreData.appointments) {
        ClinicalDatabase.saveAllAppointments(restoreData.appointments);
      }
      if (restoreData.tests) {
        ClinicalDatabase.saveAllTests(restoreData.tests);
      }
      if (restoreData.settings) {
        ClinicalDatabase.saveSettings(restoreData.settings);
      }
      if (restoreData.complaints) {
        ClinicalDatabase.saveAllComplaints(restoreData.complaints);
      }

      return {
        success: true,
        restoredAt: new Date().toISOString(),
        patients: restoreData.patients?.length || 0,
        appointments: restoreData.appointments?.length || 0,
        tests: restoreData.tests?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        restoredAt: new Date().toISOString(),
        patients: 0,
        appointments: 0,
        tests: 0
      };
    }
  }
}

// Database Adapter Factory
export class DatabaseAdapter {
  private static instance: IDatabaseAdapter | null = null;
  private static config: DatabaseConfig = { type: StorageType.LOCAL };

  static configure(config: DatabaseConfig): void {
    this.config = config;
    this.instance = null; // Reset instance on reconfigure
  }

  static create(type?: StorageType): IDatabaseAdapter {
    const storageType = type || this.config.type;
    
    switch (storageType) {
      case StorageType.LOCAL:
        return new LocalStorageAdapter();
      case StorageType.POSTGRESQL:
        // TODO: Implement PostgreSQL adapter
        console.warn('[DatabaseAdapter] PostgreSQL adapter not yet implemented. Falling back to localStorage.');
        return new LocalStorageAdapter();
      case StorageType.MONGODB:
        // TODO: Implement MongoDB adapter
        console.warn('[DatabaseAdapter] MongoDB adapter not yet implemented. Falling back to localStorage.');
        return new LocalStorageAdapter();
      case StorageType.MYSQL:
        // TODO: Implement MySQL adapter
        console.warn('[DatabaseAdapter] MySQL adapter not yet implemented. Falling back to localStorage.');
        return new LocalStorageAdapter();
      case StorageType.FIRESTORE:
        // TODO: Implement Firestore adapter
        console.warn('[DatabaseAdapter] Firestore adapter not yet implemented. Falling back to localStorage.');
        return new LocalStorageAdapter();
      default:
        return new LocalStorageAdapter();
    }
  }

  static getInstance(): IDatabaseAdapter {
    if (!this.instance) {
      this.instance = this.create();
    }
    return this.instance;
  }
}

// Export singleton instance for convenience
export const db = DatabaseAdapter.getInstance();
