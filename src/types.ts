export interface Patient {
  id: string; // National ID or MRN
  name: string;
  nameEn: string;
  phone: string;
  gender: 'male' | 'female' | 'ذكر' | 'أنثى';
  birthDate: string;
  bloodType?: string;
}

export interface TestParameter {
  name: string;              // e.g. "Hemoglobin"
  nameAr: string;            // e.g. "الهيموجلوبين"
  value?: number;
  unit: string;
  minNormal: number;
  maxNormal: number;
  isAbnormal?: boolean;
}

export interface LabTest {
  id: string;                // e.g. "LAB-2026-001"
  patientId: string;
  patientName: string;
  patientNameEn: string;
  testType: string;
  titleAr: string;
  titleEn: string;
  requestDate: string;
  sampleStatus: 'pending_collection' | 'collected' | 'analyzed' | 'approved';
  parameters: TestParameter[];
  cost: number;
  paidAmount: number;
  discountPercent?: number;
  approvedBy?: string;
  approvedAt?: string;
  barcode: string;           // E.g. "120839420"
  qrToken: string;           // unique verification token
}

export interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  type: 'lab' | 'home'; // Lab visit or Home sample extraction
  testType: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export type UserRole = 'patient' | 'receptionist' | 'technician' | 'admin';

export interface DoctorSettings {
  labNameAr: string;
  labNameEn: string;
  clinicName?: string;
  labPhone?: string;
  doctorName: string;
  doctorLicense: string;
  receptionUsername: string;
  receptionPassword: string;
  doctorEmail?: string;
  doctorPasscode?: string;
  receptionPermissions: string[]; // e.g. 'register_patient', 'billing', 'appointments', 'view_all_records'
  allowBiometricBypass: boolean;
  enableTechnicianPlatform: boolean;
  enableAndroidSimulator: boolean;
  canUploadWithFiles: boolean;
  canUploadWithImages: boolean;
  canUploadWithTyping: boolean;
  customTestPricing: {
    CBC: number;
    LIPID: number;
    LIVER: number;
    GLUCOSE: number;
    THYROID: number;
    KIDNEY: number;
  };
  // New features
  enableGoogleDriveBackup: boolean;
  googleDriveToken: string;
  googleDriveBackupInterval: 'daily' | 'hourly' | 'immediate';
  enableElectronicPrinter: boolean;
  allowResultCopying: boolean;
  printerConnectionType: 'usb' | 'network' | 'bluetooth' | 'disconnected';
  printerIpAddress: string;
  currency?: 'SAR' | 'EGP';
  barcodeLocation?: 'top' | 'bottom' | 'sidebar' | 'hidden';
  thermalWidth?: '80mm' | '58mm';
}

export interface UserSession {
  username: string;
  role: UserRole;
  patientId?: string; // If patient role
}

export interface InventoryItem { id: string; name: string; quantity: number; unit: string; }

export interface AppComplaint {
  id: string;
  name: string;
  phone: string;
  category: 'technical' | 'administrative' | 'delay' | 'billing' | 'other';
  details: string;
  testId?: string;
  date: string;
  status: 'pending' | 'resolved' | 'investigating';
  adminReply?: string;
}
