import { Patient, LabTest, Appointment, DoctorSettings, AppComplaint } from '../types';

// Local storage keys
const KEY_PATIENTS = 'lims_mylab_db_patients_v2';
const KEY_APPOINTMENTS = 'lims_mylab_db_appointments_v2';
const KEY_TESTS = 'lims_mylab_db_tests_v2';
const KEY_SETTINGS = 'lims_mylab_db_settings_v2';
const KEY_COMPLAINTS = 'lims_mylab_db_complaints_v2';

const DEFAULT_SETTINGS: DoctorSettings = {
  labNameAr: "معمل النيل للتحاليل الطبية والتشخيص",
  labNameEn: "Nile Clinical Laboratory & Diagnostics",
  clinicName: "معمل النيل للتحاليل الطبية والتشخيص",
  labPhone: "0102919381",
  doctorName: "د. صفاء عبد اللطيف الشافعي",
  doctorLicense: "رقم قيد نقابة الأطباء: 89745-EG",
  receptionUsername: "reception",
  receptionPassword: "reception_authorized_99",
  doctorEmail: "safaa@mylab.eg",
  doctorPasscode: "0e02ddd1",
  receptionPermissions: ['register_patient', 'billing', 'appointments', 'view_all_records'],
  allowBiometricBypass: false,
  enableTechnicianPlatform: true,
  enableAndroidSimulator: true,
  canUploadWithFiles: true,
  canUploadWithImages: true,
  canUploadWithTyping: true,
  customTestPricing: {
    CBC: 180,
    LIPID: 240,
    LIVER: 300,
    GLUCOSE: 120,
    THYROID: 450,
    KIDNEY: 200
  },
  enableGoogleDriveBackup: true,
  googleDriveToken: "",
  googleDriveBackupInterval: "immediate",
  enableElectronicPrinter: true,
  allowResultCopying: true,
  printerConnectionType: "network",
  printerIpAddress: "192.168.1.100",
  currency: "EGP",
  barcodeLocation: "bottom",
  thermalWidth: "80mm"
};

// Seed lists with realistic Egyptian names and Egyptian Pound prices (EGP)
const SEED_PATIENTS: Patient[] = [];

const SEED_APPOINTMENTS: Appointment[] = [];

const SEED_TESTS: LabTest[] = [];

/**
 * Robust Clinical Database Module
 * Provides genuine database persistence across restarts, browser closures, or reboots.
 */
export const ClinicalDatabase = {
  /**
   * Biometric Custom Registered Fingerprints
   */
  getRegisteredBiometrics(): Record<string, string> {
    try {
      const stored = localStorage.getItem('lims_mylab_db_biometrics_v2');
      if (stored) {
        return JSON.parse(stored);
      }
      const defaultBiometrics = {};
      localStorage.setItem('lims_mylab_db_biometrics_v2', JSON.stringify(defaultBiometrics));
      return defaultBiometrics;
    } catch {
      return {};
    }
  },

  registerBiometric(userId: string, patternDescription: string): void {
    try {
      const existing = this.getRegisteredBiometrics();
      existing[userId] = patternDescription;
      localStorage.setItem('lims_mylab_db_biometrics_v2', JSON.stringify(existing));
    } catch (e) {
      console.error('Failed to register biometric pattern:', e);
    }
  },

  clearBiometrics(): void {
    localStorage.removeItem('lims_mylab_db_biometrics_v2');
  },

  /**
   * Doctor Settings Operations
   */
  getSettings(): DoctorSettings {
    try {
      const stored = localStorage.getItem(KEY_SETTINGS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to read settings:', e);
    }
    this.saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  },

  saveSettings(newSettings: DoctorSettings): DoctorSettings {
    try {
      localStorage.setItem(KEY_SETTINGS, JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
    return newSettings;
  },
  /**
   * Patients Table Operations
   */
  getPatients(): Patient[] {
    try {
      const stored = localStorage.getItem(KEY_PATIENTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to read patients from storage:', e);
    }
    this.saveAllPatients(SEED_PATIENTS);
    return SEED_PATIENTS;
  },

  savePatient(newPatient: Patient): Patient[] {
    const list = this.getPatients();
    // Check if patient already exists (UPSERT)
    const index = list.findIndex(p => p.id === newPatient.id);
    if (index >= 0) {
      list[index] = newPatient;
    } else {
      list.unshift(newPatient);
    }
    this.saveAllPatients(list);
    return list;
  },

  saveAllPatients(patients: Patient[]): void {
    try {
      localStorage.setItem(KEY_PATIENTS, JSON.stringify(patients));
    } catch (e) {
      console.error('Failed to save patients to local DB:', e);
    }
  },

  /**
   * Appointments Table Operations
   */
  getAppointments(): Appointment[] {
    try {
      const stored = localStorage.getItem(KEY_APPOINTMENTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to read appointments from storage:', e);
    }
    this.saveAllAppointments(SEED_APPOINTMENTS);
    return SEED_APPOINTMENTS;
  },

  saveAppointment(newApt: Appointment): Appointment[] {
    const list = this.getAppointments();
    const index = list.findIndex(a => a.id === newApt.id);
    if (index >= 0) {
      list[index] = newApt;
    } else {
      list.unshift(newApt);
    }
    this.saveAllAppointments(list);
    return list;
  },

  saveAllAppointments(apts: Appointment[]): void {
    try {
      localStorage.setItem(KEY_APPOINTMENTS, JSON.stringify(apts));
    } catch (e) {
      console.error('Failed to save appointments to local DB:', e);
    }
  },

  /**
   * Laboratory Tests (and QR Tokens) Table Operations
   */
  getTests(): LabTest[] {
    try {
      const stored = localStorage.getItem(KEY_TESTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to read tests from storage:', e);
    }
    this.saveAllTests(SEED_TESTS);
    return SEED_TESTS;
  },

  saveTest(newTest: LabTest): LabTest[] {
    const list = this.getTests();
    const index = list.findIndex(t => t.id === newTest.id);
    if (index >= 0) {
      list[index] = newTest;
    } else {
      list.unshift(newTest);
    }
    this.saveAllTests(list);
    return list;
  },

  saveAllTests(tests: LabTest[]): void {
    try {
      localStorage.setItem(KEY_TESTS, JSON.stringify(tests));
    } catch (e) {
      console.error('Failed to save tests to local DB:', e);
    }
  },

  getComplaints(): AppComplaint[] {
    try {
      const stored = localStorage.getItem(KEY_COMPLAINTS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to get complaints:', e);
    }
    const seed: AppComplaint[] = [
      {
        id: "CQ-2026-001",
        name: "محمد عبد السلام",
        phone: "01092819382",
        category: "delay",
        details: "تأخر ظهور نتيجة فحص السكر التراكمي لعدة ساعات عن الموعد المتوقع.",
        testId: "LAB-2026-004",
        date: "2026-06-08",
        status: "resolved",
        adminReply: "تم حل الشكوى وتسليم التقرير مع تقديم خصم ٢٥٪ للفحص القادم كاعتذار من معمل النيل."
      },
      {
        id: "CQ-2026-002",
        name: "سارة محمود علي",
        phone: "01283921822",
        category: "technical",
        details: "لم أتمكن من تسجيل الدخول التلقائي عبر بصمة الإصبع في هاتفي الأندرويد لأول مرة.",
        date: "2026-06-09",
        status: "pending"
      }
    ];
    this.saveAllComplaints(seed);
    return seed;
  },

  saveComplaint(c: AppComplaint): AppComplaint[] {
    const list = this.getComplaints();
    const idx = list.findIndex(item => item.id === c.id);
    if (idx >= 0) {
      list[idx] = c;
    } else {
      list.unshift(c);
    }
    this.saveAllComplaints(list);
    return list;
  },

  saveAllComplaints(list: AppComplaint[]): void {
    try {
      localStorage.setItem(KEY_COMPLAINTS, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save complaints:', e);
    }
  }
};
