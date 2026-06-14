import React, { useState, useEffect } from 'react';
import { Patient, LabTest, Appointment, UserRole, DoctorSettings, AppComplaint } from './types';
import { ClinicalDatabase } from './db/storage';
import { 
  Building2, Laptop, Network, Clock, ShieldCheck, Smartphone, Cpu, Activity,
  UserPlus, User, ClipboardList, Database, Receipt, Coins, Settings,
  ArrowRightLeft, AlertCircle, Info, HeartPulse, CheckSquare, ScanBarcode, LogOut,
  Fingerprint, Sparkles, Send, ShieldAlert, CheckCircle2, Shield, Trash2, HelpCircle, Microscope, Printer, Edit3, FileText, Wifi, Calendar, Sliders,
  Cloud, CloudOff, RefreshCw, Download, Upload, Zap, Radio, Signal
} from 'lucide-react';

// Import child views
import PatientPortal from './components/PatientPortal';
import ReceptionPortal from './components/ReceptionPortal';
import TechnicianPortal from './components/TechnicianPortal';
import AdminPortal from './components/AdminPortal';
import { AppVersionInfo } from './components/VersionInfo';
import PublicVerification from './components/PublicVerification';
import PrintableReport from './components/PrintableReport';
import LoginPortal from './components/LoginPortal';
import { initAuth, logout } from './auth';

// Import new services and hooks
import { getPrinterService, PrinterConnectionType } from './services/printer-service';
import { useToast } from './components/ui/Toast';
import { DatabaseAdapter, StorageType } from './db/database-adapter';
import {
  syncDataToDrive,
  isOnline,
  getSyncStatus,
  getPendingSyncsCount,
  processPendingSyncs,
  clearUserInfo,
  onConnectionChange,
  setAutoSyncDataProvider,
  signInWithGoogle
} from './services/drive-sync-service';
import {
  initStorageAuth,
  googleSignInStorage,
  handleStorageRedirectResult,
  googleSignOutStorage,
  startAutoSync,
  triggerManualSync,
  listBackups,
  downloadBackup,
  type SyncState,
  type BackupEntry
} from './services/firebase-storage-service';

export default function App() {
  // Toast notification system
  const { ToastContainer, success, error, warning, info } = useToast();

  // Master database state (backed by robust persistent clinical database)
  const [patients, setPatients] = useState<Patient[]>(() => ClinicalDatabase.getPatients());
  const [appointments, setAppointments] = useState<Appointment[]>(() => ClinicalDatabase.getAppointments());
  const [tests, setTests] = useState<LabTest[]>(() => ClinicalDatabase.getTests());
  
  // Printer service integration
  const [printerStatus, setPrinterStatus] = useState({ connected: false, type: 'disconnected' as string });
  const printerService = getPrinterService();

  // Doctor settings and authentication session states
  const [settings, setSettings] = useState<DoctorSettings>(() => ClinicalDatabase.getSettings());
  const [complaints, setComplaints] = useState<AppComplaint[]>(() => ClinicalDatabase.getComplaints());
  const [loginSession, setLoginSession] = useState<{ role: 'admin' | 'receptionist' | 'patient', patientId?: string } | null>(null);

  // App-wide language and currency context
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const currency = settings.currency || 'EGP';

  // Interface view states
  const [currentRole, setCurrentRole] = useState<UserRole | 'public_verify' | 'none'>('none');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    const list = ClinicalDatabase.getPatients();
    return list[0]?.id || '';
  });
  
  // Biometric session verification status
  const [isBiometricVerified, setIsBiometricVerified] = useState<boolean>(true);

  // Navigation / Detail view status
  const [viewingTestReport, setViewingTestReport] = useState<LabTest | null>(null);
  const [directVerifyToken, setDirectVerifyToken] = useState<string>('');

  // --- POP-UP OVERLAY NAVIGATION STATES ---
  const [showProfilePopout, setShowProfilePopout] = useState<boolean>(false);
  const [showCalibrationPopout, setShowCalibrationPopout] = useState<boolean>(false);
  const [showDiscountsPopout, setShowDiscountsPopout] = useState<boolean>(false);
  const [showBiometricsPopout, setShowBiometricsPopout] = useState<boolean>(false);
  const [showPrinterControlPopout, setShowPrinterControlPopout] = useState<boolean>(false);
  const [selectedPrintTestId, setSelectedPrintTestId] = useState<string>('');

  // --- GOOGLE SIGN-IN CLOUD BACKUP ---
  const [googleUser, setGoogleUser] = useState<{ name: string; email: string; avatar: string } | null>(null);
  const [googleBackupProgress, setGoogleBackupProgress] = useState<number>(0);
  const [googleBackupStatus, setGoogleBackupStatus] = useState<string>('');
  const [storageBackups, setStorageBackups] = useState<BackupEntry[]>([]);
  const [syncState, setSyncState] = useState<SyncState>({ isSignedIn: false, user: null, lastSync: null, pendingChanges: false });

  // --- ONLINE/OFFLINE SYNC STATE ---
  const [isConnected, setIsConnected] = useState<boolean>(isOnline());
  const [pendingSyncs, setPendingSyncs] = useState<number>(0);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // --- SIDEBAR COUNTER WIDGET ---
  const [showSidebarWidget, setShowSidebarWidget] = useState<boolean>(true);
  const [showSidebarPanel, setShowSidebarPanel] = useState<boolean>(false);

  // --- MEDICAL SYSTEMS DISCOUNT RULE ---
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState<number>(0);

  // Initialize printer connection on mount
  // Handle Google Auth redirect result on app load (after signInWithRedirect returns)
  useEffect(() => {
    handleStorageRedirectResult().then(user => {
      if (user) {
        setGoogleUser({
          name: user.displayName || 'مستخدم Google',
          email: user.email || '',
          avatar: user.photoURL || ''
        });
        setLoginSession({ role: 'admin' });
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const initPrinter = async () => {
      const savedType = settings.printerConnectionType;
      if (savedType && savedType !== 'disconnected') {
        const connected = await printerService.connect({
          type: savedType as PrinterConnectionType,
          ipAddress: settings.printerIpAddress || '192.168.1.100'
        });
        if (connected) {
          setPrinterStatus(printerService.getStatus());
          info('تم الاتصال بالطابعة بنجاح');
        }
      }
    };
    initPrinter();

    // Initialize database adapter
    DatabaseAdapter.create(StorageType.LOCAL);

    return () => {
      printerService.disconnect();
    };
  }, []);

  // --- ONLINE/OFFLINE LISTENER ---
  useEffect(() => {
    // Set auto-sync data provider
    setAutoSyncDataProvider(() => ({
      patients: ClinicalDatabase.getPatients(),
      appointments: ClinicalDatabase.getAppointments(),
      tests: ClinicalDatabase.getTests(),
      timestamp: new Date().toISOString()
    }));

    // Listen for connection changes
    const unsubscribe = onConnectionChange((online) => {
      setIsConnected(online);
      if (online) {
        setSyncStatusMessage('تم استعادة الاتصال - جاري المزامنة التلقائية...');
        // Process pending syncs
        processPendingSyncs(() => ({
          patients: ClinicalDatabase.getPatients(),
          appointments: ClinicalDatabase.getAppointments(),
          tests: ClinicalDatabase.getTests(),
          timestamp: new Date().toISOString()
        })).then((count) => {
          if (count > 0) {
            setSyncStatusMessage(`تمت مزامنة ${count} نسخة احتياطية معلقة بنجاح!`);
            success(`تمت مزامنة ${count} نسخة احتياطية معلقة بنجاح!`);
          } else {
            setSyncStatusMessage('');
          }
          setPendingSyncs(getPendingSyncsCount());
        });
      } else {
        warning('⚠️ انقطع الاتصال بالإنترنت - سيتم حفظ البيانات محلياً والمزامنة لاحقاً');
        setSyncStatusMessage('وضع عدم الاتصال - العمل محلي');
      }
    });

    // Check pending syncs count
    setPendingSyncs(getPendingSyncsCount());

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser({
          name: user.displayName || 'Doctor',
          email: user.email || '',
          avatar: user.photoURL || ''
        });
      },
      () => {
        setGoogleUser(null);
      }
    );
    return () => unsubscribe();
  }, []);
  const [discountCoupons, setDiscountCoupons] = useState<{ code: string; percent: number; label: string }[]>([]);

  // --- LAB REPORT READER ASSISTANT (مساعد قراءة ورقة التحليل) ---
  const [aiInput, setAiInput] = useState<string>('');
  const [aiTyping, setAiTyping] = useState<boolean>(false);
  const [showTestTypeSelector, setShowTestTypeSelector] = useState(false);
  const [aiFeed, setAiFeed] = useState<{ id: string; sender: 'ai' | 'user'; text: string; time: string }[]>(() => {
    const saved = localStorage.getItem('lims_test_reader_feed');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return [
      {
        id: 'msg-init',
        sender: 'ai',
        text: 'مرحباً! أنا مساعدك لفهم نتائج التحاليل الطبية. يمكنني مساعدتك في:\n• شرح نتائج تحاليل CBC (صورة الدم الكاملة)\n• تفسير تحاليل LIPID (الدهون)\n• توضيح نتائج وظائف الكبد LIVER\n• شرح تحاليل السكر GLUCOSE\n• المقارنة بالقيم المرجعية الطبيعية\n\nاختر نوع التحليل أو اكتب سؤالك وسأساعدك في فهم نتائجك بشكل مبسط.',
        time: 'الآن'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('lims_test_reader_feed', JSON.stringify(aiFeed));
  }, [aiFeed]);

  // Test reading assistant knowledge base
  const testReadingGuide: Record<string, { title: string; explanation: string; normalRanges: string; tips: string }> = {
    CBC: {
      title: 'صورة الدم الكاملة (CBC)',
      explanation: 'هو فحص يقيس مكونات الدم الرئيسية: خلايا الدم الحمراء (تنقل الأكسجين)، خلايا الدم البيضاء (تقاوم العدوى)، والصفائح الدموية (تمنع النزيف).',
      normalRanges: '• الهيموجلوبين: 12-17.5 غ/دل\n• خلايا الدم الحمراء: 4.5-5.5 مليون/مم٣\n• خلايا الدم البيضاء: 4,000-11,000/مم٣\n• الصفائح الدموية: 150,000-450,000/مم٣\n• الهيماتوكريت: 36-48%',
      tips: 'نصائح: تجنب التدخين قبل الفحص بساعتين، وإذا كانت النتائج خارج المدى الطبيعي يجب مراجعة الطبيب.'
    },
    LIPID: {
      title: 'تحليل الدهون (Lipid Profile)',
      explanation: 'يقيس مستويات الدهون في الدم: الكوليسترول الكلي، الدهون الثلاثية، الكوليسترول الجيد (HDL)، والكوليسترول الضار (LDL).',
      normalRanges: '• الكوليسترول الكلي: أقل من 200 ملغ/دل\n• الدهون الثلاثية: أقل من 150 ملغ/دل\n• HDL (الجيد): أكثر من 40 ملغ/دل\n• LDL (الضار): أقل من 100 ملغ/دل',
      tips: 'نصائح: يجب الصيام 12 ساعة قبل الفحص، وتجنب الدهون قبل الفحص بيوم.'
    },
    LIVER: {
      title: 'وظائف الكبد (Liver Function)',
      explanation: 'يقيس إنزيمات الكبد التي تكشف عن صحة الكبد وقدرته على أداء وظائفه مثل إزالة السموم وإنتاج البروتينات.',
      normalRanges: '• ALT (SGPT): 7-56 وحدة/لتر\n• AST (SGOT): 10-40 وحدة/لتر\n• البيليروبين الكلي: 0.1-1.2 ملغ/دل\n• الألبومين: 3.5-5.0 غ/دل',
      tips: 'نصائح: تجنب الكحول قبل الفحص بأسبوع، وتجنب الأدوية التي قد تؤثر على الكبد.'
    },
    GLUCOSE: {
      title: 'تحليل السكر (Glucose)',
      explanation: 'يقيس مستوى السكر في الدم للكشف عن مرض السكري أو مراقبة مستويات السكر لدى المصابين.',
      normalRanges: '• السكر الصائم: 70-100 ملغ/دل\n• السكر العشوائي: أقل من 140 ملغ/دل\n• HbA1c: أقل من 5.7%',
      tips: 'نصائح: يجب الصيام 8-12 ساعة للسكر الصائم، وتجنب الحلويات قبل الفحص.'
    },
    THYROID: {
      title: 'وظائف الغدة الدرقية (Thyroid)',
      explanation: 'يقيس هرمونات الغدة الدرقية (T3, T4, TSH) التي تتحكم في التمثيل الغذائي ومستوى الطاقة في الجسم.',
      normalRanges: '• TSH: 0.4-4.0 ميلي وحدة/لتر\n• T3: 80-200 نانوغرام/دل\n• T4: 5.0-12.0 ميكروغرام/دل',
      tips: 'نصائح: يفضل إجراء الفحص في الصباح الباكر، وتجنب الأدوية المؤثرة على الدرقية.'
    },
    KIDNEY: {
      title: 'وظائف الكلى (Kidney Function)',
      explanation: 'يقيس مؤشرات أداء الكلى مثل اليوريا والكرياتينين والبوتاسيوم والصوديوم.',
      normalRanges: '• اليوريا: 7-20 ملغ/دل\n• الكرياتينين: 0.6-1.3 ملغ/دل\n• البوتاسيوم: 3.5-5.0 ميكرومول/لتر\n• الصوديوم: 135-145 ميكرومول/لتر',
      tips: 'نصائح: شرب الماء بكثرة قبل الفحص، وتجنب الأطعمة الغنية بالبروتين.'
    }
  };

  // Handle URL deep checks for scanned QR Codes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyToken = params.get('verify') || params.get('token');
    if (verifyToken) {
      setDirectVerifyToken(verifyToken);
      setViewingTestReport(null);
      setCurrentRole('public_verify');
    }
  }, []);

  // Update currentRole when loginSession changes
  useEffect(() => {
    if (loginSession) {
      if (loginSession.role === 'admin') {
        setCurrentRole('admin');
      } else if (loginSession.role === 'receptionist') {
        setCurrentRole('receptionist');
      } else if (loginSession.role === 'patient') {
        setCurrentRole('patient');
      }
    } else {
      setCurrentRole('none');
    }
  }, [loginSession]);

  // Handlers
  const handleRegisterPatient = (newPat: Patient) => {
    const updated = ClinicalDatabase.savePatient(newPat);
    setPatients(updated);
  };

  const handleConfirmAppointment = (aptId: string) => {
    const updatedApts = appointments.map(a => a.id === aptId ? { ...a, status: 'confirmed' as const } : a);
    const target = updatedApts.find(a => a.id === aptId);
    if (target) {
      ClinicalDatabase.saveAppointment(target);
    }
    setAppointments(updatedApts);
  };

  const handleCancelAppointment = (aptId: string) => {
    const updatedApts = appointments.map(a => a.id === aptId ? { ...a, status: 'cancelled' as const } : a);
    const target = updatedApts.find(a => a.id === aptId);
    if (target) {
      ClinicalDatabase.saveAppointment(target);
    }
    setAppointments(updatedApts);
  };

  const handleBookAppointment = (newApt: Omit<Appointment, 'id'>) => {
    const apt: Appointment = {
      id: `APT-00${appointments.length + 1}`,
      ...newApt
    };
    const updated = ClinicalDatabase.saveAppointment(apt);
    setAppointments(updated);
  };

  const handleSubmitComplaint = (newComp: Omit<AppComplaint, 'id' | 'date' | 'status'>) => {
    const fresh: AppComplaint = {
      ...newComp,
      id: `CQ-2026-0${ClinicalDatabase.getComplaints().length + 1}`,
      date: new Date().toISOString().split('T')[0],
      status: 'pending'
    };
    ClinicalDatabase.saveComplaint(fresh);
    setComplaints(ClinicalDatabase.getComplaints());
  };

  const handleReplyComplaint = (id: string, reply: string, status: 'resolved' | 'investigating') => {
    const list = complaints.map(c => c.id === id ? { ...c, adminReply: reply, status } : c);
    ClinicalDatabase.saveAllComplaints(list);
    setComplaints(list);
  };

  const handleLogTestRequest = (newTest: Omit<LabTest, 'id' | 'qrToken' | 'barcode' | 'sampleStatus'>) => {
    const randomBarcode = Math.floor(10000000 + Math.random() * 90000000).toString();
    const cleanId = `LAB-2026-00${tests.length + 1}`;
    
    const labTest: LabTest = {
      ...newTest,
      id: cleanId,
      barcode: randomBarcode,
      qrToken: `VERIFIED-${newTest.testType}-${randomBarcode}-2026`,
      sampleStatus: 'collected'
    };

    const updated = ClinicalDatabase.saveTest(labTest);
    setTests(updated);
  };

  const handleUploadResults = (testId: string, parameters: any[]) => {
    const updatedTests = tests.map(t => 
      t.id === testId 
        ? { ...t, parameters, sampleStatus: 'analyzed' as const }
        : t
    );
    const target = updatedTests.find(t => t.id === testId);
    if (target) {
      ClinicalDatabase.saveTest(target);
    }
    setTests(updatedTests);
  };

  const handleApproveTest = (testId: string, doctorName: string) => {
    const updatedTests = tests.map(t => 
      t.id === testId 
        ? { 
            ...t, 
            sampleStatus: 'approved' as const, 
            approvedBy: doctorName, 
            approvedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) 
          } 
        : t
    );
    const target = updatedTests.find(t => t.id === testId);
    if (target) {
      ClinicalDatabase.saveTest(target);
    }
    setTests(updatedTests);
  };

  const handleModifyReference = (type: 'CBC' | 'LIPID' | 'LIVER' | 'GLUCOSE', minNormal: number, maxNormal: number) => {
    const updatedTests = tests.map(t => {
      if (t.testType === type && t.sampleStatus !== 'approved') {
        const parameters = t.parameters.map(p => ({
          ...p,
          minNormal,
          maxNormal
        }));
        return { ...t, parameters };
      }
      return t;
    });
    ClinicalDatabase.saveAllTests(updatedTests);
    setTests(updatedTests);
  };

  const handleUpdateSettings = (newSettings: DoctorSettings) => {
    const updated = ClinicalDatabase.saveSettings(newSettings);
    setSettings(updated);
  };

  const handleVerifyReportSelf = (token: string) => {
    setDirectVerifyToken(token);
    setViewingTestReport(null);
    setCurrentRole('public_verify');
  };

  // --- LAB REPORT READER ASSISTANT ENGINE ---
  const handleAiCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userText = aiInput.trim();
    const newMsgIdUser = `user-${Date.now()}`;
    const userMessage = {
      id: newMsgIdUser,
      sender: 'user' as const,
      text: userText,
      time: new Date().toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })
    };

    setAiFeed(prev => [...prev, userMessage]);
    setAiInput('');
    setAiTyping(true);

    let responseText = '';
    const textLower = userText.toLowerCase();

    // Check if user is asking about a specific test type
    const testTypeMatch = Object.keys(testReadingGuide).find(type => 
      textLower.includes(type.toLowerCase()) || 
      textLower.includes(testReadingGuide[type].title.toLowerCase())
    );

    if (testTypeMatch) {
      const guide = testReadingGuide[testTypeMatch];
      responseText = `📋 **${guide.title}**\n\n${guide.explanation}\n\n📊 **القيم المرجعية الطبيعية:**\n${guide.normalRanges}\n\n💡 **${guide.tips}**\n\n⚠️ ملاحظة: هذه المعلومات للتوعية فقط. أي نتيجة خارج المعدل الطبيعي تستدعي مراجعة الطبيب المعالج.`;
    } else if (textLower.includes('تحليل') || textLower.includes('فحص') || textLower.includes('نتيجة') || textLower.includes('طبيعي') || textLower.includes('اعلى') || textLower.includes('اقل')) {
      responseText = `🔬 يمكنني مساعدتك في فهم نتائج التحاليل التالية:\n\n• **CBC** - صورة الدم الكاملة\n• **LIPID** - تحليل الدهون\n• **LIVER** - وظائف الكبد\n• **GLUCOSE** - تحليل السكر\n• **THYROID** - وظائف الغدة الدرقية\n• **KIDNEY** - وظائف الكلى\n\nاكتب اسم التحليل الذي تريد فهمه وسأشرح لك كل التفاصيل والقيم المرجعية.`;
    } else {
      responseText = `👋 أنا مساعدك لقراءة التحاليل الطبية!\n\nيمكنني مساعدتك في:\n• شرح نتائج تحاليل الدم المختلفة\n• توضيح القيم المرجعية الطبيعية\n• شرح ماذا تعني النتائج المرتفعة أو المنخفضة\n\nما نوع التحليل الذي تريد مساعدة في فهمه؟ (CBC, LIPID, LIVER, GLUCOSE, THYROID, KIDNEY)`;
    }

    setAiFeed(prev => [...prev, {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: responseText,
      time: new Date().toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })
    }]);
    setAiTyping(false);
  };

  const handleQuickTestSelect = (testType: string) => {
    const guide = testReadingGuide[testType];
    if (!guide) return;

    setAiFeed(prev => [...prev, {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: `أريد فهم تحليل ${guide.title}`,
      time: new Date().toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })
    }]);
    setAiTyping(true);

    setTimeout(() => {
      const responseText = `📋 **${guide.title}**\n\n${guide.explanation}\n\n📊 **القيم المرجعية الطبيعية:**\n${guide.normalRanges}\n\n💡 **${guide.tips}**\n\n⚠️ ملاحظة: هذه المعلومات للتوعية فقط. أي نتيجة خارج المعدل الطبيعي تستدعي مراجعة الطبيب المعالج.`;

      setAiFeed(prev => [...prev, {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: responseText,
        time: new Date().toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })
      }]);
      setAiTyping(false);
      setShowTestTypeSelector(false);
    }, 500);
  };
  // --- GOOGLE SIGN-IN CLOUD BACKUP ---
  const handleGoogleSignInOnHome = async () => {
    try {
      const user = await googleSignInStorage();
      if (user) {
        setGoogleUser({
          name: user.displayName || 'مستخدم Google',
          email: user.email || '',
          avatar: user.photoURL || ''
        });
        setLoginSession({ role: 'admin' });
        success('تم تسجيل الدخول بنجاح!');
      }
    } catch (err) {
      console.error(err);
      error('فشل تسجيل الدخول بـ Google. يرجى المحاولة مجددًا.');
    }
  };

  const handleGoogleSignInSimulate = async () => {
    setGoogleBackupStatus('جاري الاتصال بحساب Google...');
    try {
      const user = await googleSignInStorage();
      if (user) {
        setGoogleUser({
          name: user.displayName || 'مستخدم Google',
          email: user.email || '',
          avatar: user.photoURL || ''
        });
        setGoogleBackupStatus('✓ تم تسجيل الدخول بنجاح!');
        success('تم تسجيل الدخول بنجاح!');
        setTimeout(() => setGoogleBackupStatus(''), 3000);
      }
    } catch (err) {
      console.error(err);
      setGoogleBackupStatus('');
      error('فشل تسجيل الدخول. يرجى المحاولة مجددًا.');
    }
  };

  const handleRunGoogleBackup = async () => {
    if (!googleUser) return;
    setGoogleBackupProgress(10);
    setGoogleBackupStatus('معايرة جداول المرضى والفحوص الطبية وتجهيز بنية JSON...');

    const backupData = {
      patients,
      appointments,
      tests,
      timestamp: new Date().toISOString()
    };
    const fileContent = JSON.stringify(backupData, null, 2);

    try {
      const accessToken = localStorage.getItem('firebase_access_token');
      if (!accessToken) throw new Error("No access token");

      setGoogleBackupProgress(40);
      setGoogleBackupStatus('جاري الاتصال بـ Google Drive واستدعاء واجهة الرفع...');

      const metadata = {
        name: `MyLab_GDrive_Backup_${new Date().toISOString().split('T')[0]}.json`,
        mimeType: 'application/json'
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        closeDelimiter;

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });

      if (!res.ok) throw new Error("Google Drive upload failed");

      setGoogleBackupProgress(100);
      setGoogleBackupStatus('✓ تم رفع البيانات وجدول الفحوصات الطبية بنجاح إلى مجلد دافع السحاب "MyLab_GDrive_Backups"!');
      setTimeout(() => {
        setGoogleBackupProgress(0);
        setGoogleBackupStatus('');
      }, 4000);
    } catch (err) {
      console.error(err);
      setGoogleBackupProgress(0);
      setGoogleBackupStatus('❌ فشلت عملية النسخ الاحتياطي!');
    }
  };

  // === VIBRANT GOOGLE DRIVE SYNC HANDLERS ===
  const handleVibrantGoogleSignIn = async () => {
    setIsSyncing(true);
    setSyncStatusMessage('جاري الاتصال والتحقق من سيرفرات Google OAuth...');
    try {
      // Try Electron native first
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const result = await (window as any).electronAPI.googleSignIn();
        if (result?.success) {
          setGoogleUser({
            name: result.name || 'مستخدم Google',
            email: result.email || '',
            avatar: result.avatar || ''
          });
          setSyncStatusMessage('✓ تم تسجيل الدخول الآمن بحساب Google بنجاح!');
          success('تم تسجيل الدخول بنجاح!');
        } else {
          throw new Error(result?.error || 'فشل تسجيل الدخول');
        }
      } else {
        // Web/Android: Firebase popup
        const user = await googleSignInStorage();
        if (user) {
          setGoogleUser({
            name: user.displayName || 'مستخدم Google',
            email: user.email || '',
            avatar: user.photoURL || ''
          });
          setSyncStatusMessage('✓ تم تسجيل الدخول الآمن بنجاح!');
          success('تم تسجيل الدخول بنجاح!');
        }
      }
    } catch (err) {
      console.error(err);
      setSyncStatusMessage('❌ فشل تسجيل الدخول. يرجى المحاولة مجددًا.');
      error('فشل تسجيل الدخول');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMessage(''), 3000);
    }
  };

  const handleVibrantGoogleBackup = async () => {
    if (!googleUser) return;
    setIsSyncing(true);
    setGoogleBackupProgress(15);
    setSyncStatusMessage('جاري تحضير البيانات والمزامنة مع Firebase Storage...');

    const backupData = {
      patients,
      appointments,
      tests,
      settings,
      timestamp: new Date().toISOString()
    };

    try {
      setGoogleBackupProgress(40);
      const result = await syncDataToDrive(backupData);

      if (result.success) {
        setGoogleBackupProgress(100);
        setSyncStatusMessage(result.message);
        success('تم رفع النسخة الاحتياطية بنجاح!');
      } else {
        setSyncStatusMessage(result.message);
        if (!isOnline()) {
          warning('تم حفظ البيانات للمزامنة اللاحقة');
        } else {
          error('فشلت المزامنة');
        }
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatusMessage(`❌ خطأ: ${err.message || 'فشلت المزامنة'}`);
      error('فشلت عملية النسخ الاحتياطي');
    } finally {
      setGoogleBackupProgress(0);
      setIsSyncing(false);
      setPendingSyncs(getPendingSyncsCount());
      setTimeout(() => setSyncStatusMessage(''), 5000);
    }
  };

  const handleVibrantGoogleRestore = async () => {
    setIsSyncing(true);
    setSyncStatusMessage('جاري البحث عن النسخ الاحتياطية على Google Drive...');
    try {
      // Check if Electron API available
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const backups = await (window as any).electronAPI.listDriveBackups();
        if (backups && backups.length > 0) {
          const latestBackup = backups[0];
          setSyncStatusMessage(`جاري استعادة: ${latestBackup.name}...`);
          const data = await (window as any).electronAPI.downloadFromDrive(latestBackup.id);
          if (data) {
            // Restore data
            if (data.patients) {
              ClinicalDatabase.saveAllPatients(data.patients);
              setPatients(data.patients);
            }
            if (data.appointments) {
              ClinicalDatabase.saveAllAppointments(data.appointments);
              setAppointments(data.appointments);
            }
            if (data.tests) {
              ClinicalDatabase.saveAllTests(data.tests);
              setTests(data.tests);
            }
            setSyncStatusMessage('✓ تم استعادة البيانات بنجاح!');
            success('تم استعادة البيانات بنجاح!');
          }
        } else {
          setSyncStatusMessage('لا توجد نسخ احتياطية على Drive');
        }
      } else {
        setSyncStatusMessage('وظيفة الاستعادة متاحة في وضع سطح المكتب');
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatusMessage(`❌ خطأ: ${err.message || 'فشلت الاستعادة'}`);
      error('فشلت استعادة البيانات');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMessage(''), 5000);
    }
  };

  const handleDisconnectGoogle = () => {
    clearUserInfo();
    setGoogleUser(null);
    setSyncStatusMessage('✓ تم فصل الاتصال بحساب Google');
    info('تم تسجيل الخروج من Google Drive');
    setTimeout(() => setSyncStatusMessage(''), 3000);
  };

  // Bio custom footprint registry
  const handleSaveAppBiometric = () => {
    const roleForBio = loginSession?.role || 'admin';
    const desc = `APPROVED_APP_BIO_FINGERPRINT_${roleForBio.toUpperCase()}_2026`;
    ClinicalDatabase.registerBiometric(
      roleForBio === 'admin' ? 'safaa' : roleForBio === 'receptionist' ? 'reception' : (loginSession?.patientId || 'patient'),
      desc
    );
    alert('✓ تم بنجاح وسرية تامة حفظ بصمة إصبعك الإلكترونية المنفصلة داخل قاعدة بيانات المختبر المشفرة محلياً! يمكنك الآن تسجيل الدخول السريع بضغطة بصمة واحدة وبدون كلمة مرور في أي وقت.');
  };

  return (
    <>
      <ToastContainer />
      <div className="min-h-screen bg-slate-50/50 flex flex-col antialiased text-slate-800" dir="rtl" role="application">
        {/* Main Container Wrapper */}
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        
        {/* Printable View */}
        {viewingTestReport ? (
          <div className="animate-fadeIn">
            <PrintableReport
              test={viewingTestReport}
              patient={patients.find(p => p.id === viewingTestReport.patientId) || patients[0]}
              onBack={() => setViewingTestReport(null)}
              onVerifySelf={() => handleVerifyReportSelf(viewingTestReport.qrToken)}
              settings={settings}
            />
          </div>
        ) : currentRole === 'public_verify' ? (
          <div className="animate-fadeIn">
            <PublicVerification
              tests={tests}
              patients={patients}
              initialToken={directVerifyToken}
              onClose={() => {
                setCurrentRole('none');
                setDirectVerifyToken('');
              }}
            />
          </div>
        ) : !loginSession ? (
          <div className="animate-fadeIn">
            <LoginPortal
              settings={settings}
              patients={patients}
              onRegisterPatientBySelf={(pat) => { handleRegisterPatient(pat); }}
              onPatientLoginSelect={(id) => {
                setLoginSession({ role: 'patient', patientId: id });
              }}
              language={language}
              onLogin={(role, isBiometric) => {
                setLoginSession({ role });
              }}
              onPublicVerify={() => {
                setCurrentRole('public_verify');
              }}
              onGoogleLogin={handleGoogleSignInOnHome}
            />
          </div>
        ) : (
          <div className="relative">
            
            {/* TOP HEADER (بديل الشريط الجانبي لتنظيم أفضل) */}
            <div className="bg-white/90 backdrop-blur border-b border-slate-200.5 shadow-sm sticky top-0 z-40 mb-6 no-print">
              <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between py-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-md">
                    <Microscope className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-black text-slate-950">{settings.labNameAr || "معمل النيل للتحاليل الطبية والتشخيص"}</h2>
                    <button
                      onClick={() => {
                        const newName = prompt('تعديل اسم المختبر الظاهر في الأعلى:', settings.labNameAr || 'معمل النيل للتحاليل الطبية والتشخيص');
                        if (newName !== null && newName.trim() !== '') {
                          const updated = { ...settings, labNameAr: newName.trim(), clinicName: newName.trim() };
                          handleUpdateSettings(updated);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      title="تغيير اسم المعمل فورياً"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Connection Status */}
                  <div className={`hidden sm:flex items-center gap-1.5 ${isConnected ? 'text-emerald-600' : 'text-amber-600'}`} title={isConnected ? 'متصل بالإنترنت' : 'غير متصل'}>
                    <Radio className={`w-3.5 h-3.5 ${isConnected ? 'animate-pulse' : ''}`} />
                    <span className="text-[10px] font-bold">{isConnected ? 'متصل' : 'محلي'}</span>
                    {pendingSyncs > 0 && (
                      <span className="badge-vibrant badge-vibrant-warning text-[9px] px-1.5 py-0.5">
                        {pendingSyncs}
                      </span>
                    )}
                  </div>

                  {/* Printer Status Indicator */}
                  {printerStatus.connected && (
                    <div className="hidden sm:flex items-center gap-1.5 text-emerald-600" title={`Printer: ${printerStatus.type}`}>
                      <Wifi className="w-3.5 h-3.5 animate-pulse" />
                      <span className="text-[10px] font-bold">متصل</span>
                    </div>
                  )}

                  {/* Google Drive Connect Button */}
                  {!googleUser ? (
                    <button
                      onClick={() => setShowCalibrationPopout(true)}
                      className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer shadow-md hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>توصيل Drive</span>
                    </button>
                  ) : (
                    <div className="hidden sm:flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1">
                      <img src={googleUser.avatar} alt="" className="w-5 h-5 rounded-full border border-green-400" />
                      <Cloud className="w-3 h-3 text-green-600 animate-pulse" />
                    </div>
                  )}

                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] font-bold text-slate-400 block">الهوية الطبية النشطة</span>
                    <span className="text-xs font-black text-slate-800 truncate block max-w-[130px]">
                      {loginSession.role === 'admin' ? 'د. صفاء الشافعي (المدير)' : loginSession.role === 'receptionist' ? 'الاستقبال الرئيسي' : 'ملف المريض الإلكتروني'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                    <button
                      onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-[10px] transition-colors cursor-pointer"
                    >
                      {language === 'ar' ? 'EN' : 'AR'}
                    </button>
                    <button
                      onClick={() => { setLoginSession(null); }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs transition-colors cursor-pointer font-bold"
                      title="تسجيل الخروج"
                    >
                      خروج
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* FLOATING SIDE SHORTCUTS BAR (شريط اختصارات جانبي / سفلي) */}
            <div className="fixed sm:top-1/2 bottom-0 right-0 sm:right-4 left-0 sm:left-auto sm:-translate-y-1/2 bg-white/90 sm:bg-transparent backdrop-blur sm:backdrop-blur-none border-t sm:border-none border-slate-200 z-50 flex sm:flex-col justify-around sm:justify-start gap-3 p-3 sm:p-0 no-print">
              <button 
                onClick={() => setShowProfilePopout(true)} 
                className="w-10 h-10 sm:w-12 sm:h-12 sm:bg-white rounded-full sm:shadow-lg sm:border border-slate-200 hover:border-blue-500 flex items-center justify-center text-blue-600 hover:text-white hover:bg-blue-600 transition-all group relative cursor-pointer"
              >
                <User className="w-5 h-5" />
                <span className="hidden sm:block absolute right-full mr-3 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                  الملف الطبي
                </span>
              </button>
              
              <button 
                onClick={() => setShowCalibrationPopout(true)} 
                className="w-10 h-10 sm:w-12 sm:h-12 sm:bg-white rounded-full sm:shadow-lg sm:border border-slate-200 hover:border-indigo-500 flex items-center justify-center text-indigo-600 hover:text-white hover:bg-indigo-600 transition-all group relative cursor-pointer"
              >
                <Settings className="w-5 h-5" />
                <span className="hidden sm:block absolute right-full mr-3 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                  المعايرة والسحابة
                </span>
              </button>

              <button 
                onClick={() => setShowDiscountsPopout(true)} 
                className="w-10 h-10 sm:w-12 sm:h-12 sm:bg-white rounded-full sm:shadow-lg sm:border border-slate-200 hover:border-amber-500 flex items-center justify-center text-amber-600 hover:text-white hover:bg-amber-600 transition-all group relative cursor-pointer"
              >
                <Coins className="w-5 h-5" />
                <span className="hidden sm:block absolute right-full mr-3 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                  سجل الخصومات
                </span>
              </button>

              <button 
                onClick={() => setShowPrinterControlPopout(true)} 
                className="w-10 h-10 sm:w-12 sm:h-12 sm:bg-white rounded-full sm:shadow-lg sm:border border-slate-200 hover:border-teal-600 flex items-center justify-center text-teal-600 hover:text-white hover:bg-teal-600 transition-all group relative cursor-pointer"
              >
                <Printer className="w-5 h-5" />
                <span className="hidden sm:block absolute right-full mr-3 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                  إعدادات الطباعة والتحكم بالباركود المتقدمة 🖨️
                </span>
              </button>

            </div>

            {/* SIDEBAR COUNTER WIDGET - Quick Stats Bar */}
            {showSidebarWidget && (
              <div className="max-w-6xl mx-auto px-4 sm:pr-24 mb-4 animate-fadeIn">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowSidebarPanel(!showSidebarPanel)}
                    className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 transition-all text-xs font-bold"
                    title="عرض التفاصيل"
                  >
                    <ClipboardList className="w-4 h-4 text-teal-600" />
                    <span>إحصائيات سريعة</span>
                    <span className={`transition-transform ${showSidebarPanel ? 'rotate-180' : ''}`}>▼</span>
                  </button>

                  <div className="flex-1 flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 animate-status-pulse">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span className="text-[10px] font-bold text-blue-700">المواعيد: {appointments.filter(a => a.status === 'confirmed').length} مؤكد</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 animate-status-pulse" style={{ animationDelay: '0.5s' }}>
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span className="text-[10px] font-bold text-amber-700">العينات: {tests.filter(t => t.sampleStatus === 'collected').length} مجمعة</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 animate-status-pulse" style={{ animationDelay: '1s' }}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-[10px] font-bold text-emerald-700">المحللة: {tests.filter(t => t.sampleStatus === 'analyzed').length} جاهزة</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5 animate-status-pulse" style={{ animationDelay: '1.5s' }}>
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <span className="text-[10px] font-bold text-indigo-700">المعتمدة: {tests.filter(t => t.sampleStatus === 'approved').length} تقرير</span>
                    </div>
                  </div>
                </div>

                {/* Expandable Sidebar Panel */}
                {showSidebarPanel && (
                  <div className="mt-2 bg-white rounded-2xl border border-slate-200 shadow-lg p-4 animate-scaleIn">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Appointments Summary */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <h5 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          حالة المواعيد
                        </h5>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-500">مؤكدة:</span>
                            <span className="font-bold text-blue-700">{appointments.filter(a => a.status === 'confirmed').length}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-500">معلقة:</span>
                            <span className="font-bold text-amber-700">{appointments.filter(a => a.status === 'pending').length}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-500">ملغاة:</span>
                            <span className="font-bold text-rose-700">{appointments.filter(a => a.status === 'cancelled').length}</span>
                          </div>
                        </div>
                      </div>

                      {/* Sample Collection Status */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <h5 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                          <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
                          حالة سحب العينات
                        </h5>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-500">مجمعة:</span>
                            <span className="font-bold text-amber-700">{tests.filter(t => t.sampleStatus === 'collected').length}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-500">محللة:</span>
                            <span className="font-bold text-emerald-700">{tests.filter(t => t.sampleStatus === 'analyzed').length}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-500">معتمدة:</span>
                            <span className="font-bold text-indigo-700">{tests.filter(t => t.sampleStatus === 'approved').length}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <h5 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                          اختصارات سريعة
                        </h5>
                        <div className="space-y-2">
                          <button
                            onClick={() => setShowDiscountsPopout(true)}
                            className="w-full text-[10px] bg-white hover:bg-amber-50 border border-slate-200 rounded-lg px-2 py-1.5 transition-all text-right font-bold text-slate-600"
                          >
                            💰 أسعار التحاليل والخصومات
                          </button>
                          <button
                            onClick={() => setShowCalibrationPopout(true)}
                            className="w-full text-[10px] bg-white hover:bg-blue-50 border border-slate-200 rounded-lg px-2 py-1.5 transition-all text-right font-bold text-slate-600"
                          >
                            ☁️ المزامنة السحابية
                          </button>
                          <button
                            onClick={() => setShowPrinterControlPopout(true)}
                            className="w-full text-[10px] bg-white hover:bg-teal-50 border border-slate-200 rounded-lg px-2 py-1.5 transition-all text-right font-bold text-slate-600"
                          >
                            🖨️ إعدادات الطباعة
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MAIN WORKSPACE INTERFACES (DYNAMIC ROUTED PORTALS BASED ON ROLE) */}
            <div className="max-w-6xl mx-auto space-y-6 px-4 pb-24 sm:pb-6 sm:pr-24">
              
              {/* Conditional render role portal */}
              {currentRole === 'admin' && (
                <div className="animate-fadeIn">
                  <AdminPortal
                    settings={settings}
                    patients={patients}
                    tests={tests}
                    complaints={complaints}
                    onReplyComplaint={handleReplyComplaint}
                    onUpdateSettings={handleUpdateSettings}
                    onApproveTest={handleApproveTest}
                    onModifyReferenceCost={handleModifyReference}
                    currency={currency}
                    language={language}
                  />
                </div>
              )}

              {currentRole === 'receptionist' && (
                <div className="animate-fadeIn">
                  <ReceptionPortal
                    patients={patients}
                    appointments={appointments}
                    tests={tests}
                    onRegisterPatient={handleRegisterPatient}
                    onConfirmAppointment={handleConfirmAppointment}
                    onCancelAppointment={handleCancelAppointment}
                    onLogTestRequest={handleLogTestRequest}
                    currency={currency}
                    language={language}
                    globalDiscountPercent={globalDiscountPercent}
                  />
                </div>
              )}

              {currentRole === 'patient' && (
                <div className="animate-fadeIn">
                  <PatientPortal
                    currentPatient={patients.find(p => p.id === (loginSession.role === 'patient' ? loginSession.patientId : selectedPatientId)) || patients[0]}
                    appointments={appointments}
                    tests={tests}
                    complaints={complaints}
                    onSubmitComplaint={handleSubmitComplaint}
                    onBookAppointment={handleBookAppointment}
                    onSelectTest={(t) => setViewingTestReport(t)}
                    onLogout={() => setLoginSession(null)}
                    currency={currency}
                    language={language}
                  />
                </div>
              )}
              
              {/* LAB REPORT READER ASSISTANT (مساعد قراءة ورقة التحليل) */}
              <div className="test-assistant-simple rounded-3xl p-5 flex flex-col space-y-4 shadow-xl shadow-blue-900/30 no-print text-white">
                <div className="flex items-center justify-between border-b border-blue-400/50 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-blue-800 rounded-full shadow-sm animate-pulse">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">مساعد قراءة التحليل</h3>
                      <p className="text-[11px] font-medium text-blue-100">فهم نتائج التحاليل بسهولة ووضوح</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('هل أنت متأكد من حذف وإعادة تهيئة المحادثة؟')) {
                          localStorage.removeItem('lims_test_reader_feed');
                          setAiFeed([
                            {
                              id: 'msg-init',
                              sender: 'ai',
                              text: 'مرحباً! أنا مساعدك لفهم نتائج التحاليل الطبية. يمكنني مساعدتك في: \n• شرح نتائج تحاليل CBC (صورة الدم الكاملة)\n• تفسير تحاليل LIPID (الدهون)\n• توضيح نتائج وظائف الكبد LIVER\n• شرح تحاليل السكر GLUCOSE\n• المقارنة بالقيم المرجعية الطبيعية\n\nاختر نوع التحليل أو اكتب سؤالك وسأساعدك في فهم نتائجك بشكل مبسط.',
                              time: 'الآن'
                            }
                          ]);
                        }
                      }}
                      className="text-[10px] bg-blue-800 hover:bg-blue-900 border border-blue-500 text-blue-100 hover:text-white px-2 py-1 rounded-lg transition-all"
                    >
                      حذف المحادثة 🗑️
                    </button>
                    <span className="text-[10px] bg-emerald-400 text-emerald-950 px-3 py-1 rounded-full font-bold shadow-sm animate-pulse">متاح</span>
                  </div>
                </div>

                {/* Quick Test Type Selector */}
                <div className="flex flex-wrap gap-2">
                  {Object.entries(testReadingGuide).map(([type, guide]) => (
                    <button
                      key={type}
                      onClick={() => handleQuickTestSelect(type)}
                      className="text-[10px] bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full transition-all font-bold backdrop-blur-sm border border-white/20"
                      title={`اقرأ عن ${guide.title}`}
                    >
                      {guide.title}
                    </button>
                  ))}
                </div>

                {/* Messages Feed View */}
                <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1 flex flex-col scrollbar-thin scrollbar-thumb-blue-400">
                  {aiFeed.map((m, idx) => (
                    <div 
                      key={idx} 
                      className={`px-4 py-3 rounded-2xl max-w-[85%] text-xs leading-relaxed font-bold shadow-sm ${
                        m.sender === 'user' 
                          ? 'bg-blue-800 text-white self-end text-left rounded-bl-sm border border-blue-700/50' 
                          : 'bg-white text-blue-900 self-start text-right rounded-br-sm'
                      }`}
                    >
                      <p className="whitespace-pre-line">{m.text}</p>
                      <span className={`text-[9px] block mt-1.5 font-mono ${m.sender === 'user' ? 'text-blue-300 text-left' : 'text-slate-400 text-right'}`}>{m.time}</span>
                    </div>
                  ))}
                  {aiTyping && (
                    <div className="self-start text-[10px] text-blue-500 font-bold animate-pulse font-mono bg-white px-4 py-3 rounded-2xl rounded-br-sm shadow-sm inline-block">
                      جارٍ كتابة الرد ورصد التحليل...
                    </div>
                  )}
                </div>

                {/* Chat command input field */}
                <form onSubmit={handleAiCommandSubmit} className="flex gap-2 pt-2 relative">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="اسأل عن فهم نتائج تحليلك هنا (مثال: ما هو CBC؟)"
                    className="flex-1 bg-blue-700/50 border border-blue-500/50 hover:bg-blue-700/80 rounded-xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-white focus:bg-blue-700 transition-all placeholder-blue-300/80 shadow-inner"
                  />
                  <button
                    type="submit"
                    className="px-5 bg-white hover:bg-blue-50 text-blue-600 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-lg font-bold"
                    title="إرسال"
                  >
                    <Send className="w-5 h-5 rtl:-scale-x-100" />
                  </button>
                </form>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* ========================================== */}
      {/* --- FLOATING OVERLAY MODAL NAVIGATION --- */}
      {/* ========================================== */}

      {/* 1. PROFILE AND LICENCE POPUP OVERLAY - VIBRANT REDESIGN */}
      {showProfilePopout && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-fadeIn" dir="rtl">
          <div className="modal-light-vibrant w-full max-w-lg shadow-2xl animate-scaleIn overflow-hidden relative">
            {/* Animated gradient header line */}
            <div className="divider-vibrant" />

            <div className="relative z-10 p-6 space-y-5">
              {/* Header with vibrant styling */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base font-black text-gradient-vibrant">الملف الشخصي وترخيص المنشأة الطبية</h3>
                </div>
                <button
                  onClick={() => setShowProfilePopout(false)}
                  className="text-slate-400 hover:text-slate-800 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-1.5 font-bold transition-all hover:scale-105 border border-slate-200"
                >
                  إغلاق ×
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Lab Name Arabic */}
                <div className="card-vibrant">
                  <label className="block font-bold text-slate-700 mb-2 text-sm">اسم المعمل باللغة العربية (يظهر بالأعلى وفي التقارير):</label>
                  <input
                    type="text"
                    value={settings.labNameAr || "معمل النيل للتحاليل الطبية والتشخيص"}
                    onChange={(e) => handleUpdateSettings({ ...settings, labNameAr: e.target.value, clinicName: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none text-right input-vibrant transition-all focus:shadow-lg focus:shadow-blue-500/10"
                  />
                </div>

                {/* Lab Name English */}
                <div className="card-vibrant">
                  <label className="block font-bold text-slate-700 mb-2 text-sm">اسم المعمل باللغة الإنجليزية:</label>
                  <input
                    type="text"
                    value={settings.labNameEn || "Nile Clinical Laboratory & Diagnostics"}
                    onChange={(e) => handleUpdateSettings({ ...settings, labNameEn: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none text-left font-mono input-vibrant transition-all focus:shadow-lg focus:shadow-blue-500/10"
                  />
                </div>

                {/* Phone */}
                <div className="card-vibrant">
                  <label className="block font-bold text-slate-700 mb-2 text-sm">رقم هاتف المعمل:</label>
                  <input
                    type="text"
                    value={settings.labPhone || "0102919381"}
                    onChange={(e) => handleUpdateSettings({ ...settings, labPhone: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none text-left font-mono input-vibrant transition-all focus:shadow-lg focus:shadow-blue-500/10"
                  />
                </div>

                {/* Doctor Name */}
                <div className="card-vibrant">
                  <label className="block font-bold text-slate-700 mb-2 text-sm">المدير الطبي المسؤول الطبيب:</label>
                  <input
                    type="text"
                    value={settings.doctorName}
                    onChange={(e) => handleUpdateSettings({ ...settings, doctorName: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none text-right input-vibrant transition-all focus:shadow-lg focus:shadow-blue-500/10"
                  />
                </div>

                {/* License */}
                <div className="card-vibrant">
                  <label className="block font-bold text-slate-700 mb-2 text-sm">رقم الترخيص المهني (MOH License) - اختياري:</label>
                  <input
                    type="text"
                    placeholder="MD-74092-2026 (متروك اختياري بقرار الطبيب)"
                    value={settings.doctorLicense}
                    onChange={(e) => handleUpdateSettings({ ...settings, doctorLicense: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono outline-none text-left input-vibrant transition-all focus:shadow-lg focus:shadow-blue-500/10"
                  />
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">يُسمح بتركه خالياً ليظهر التوقيع بصفته الإكلينيكية المستقلة.</p>
                </div>

                {/* License Info Box */}
                <div className="relative overflow-hidden rounded-2xl border border-blue-200/60 p-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-purple-50/30" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-blue-900 text-sm">تفاصيل صلاحية الحساب والبروتوكول:</span>
                    </div>
                    <p className="text-[12px] text-slate-600 leading-relaxed">
                      الحساب يملك ترخيص مدى الحياة للتوليد والتصديق على صورة الدم الهيموجلوبين، lipid profile، والتحاليل التفاعلية بنسبة حماية مطلقة.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer with sync status */}
              <div className="pt-4 border-t border-slate-200/80 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-connected' : 'bg-red-500 animate-offline'}`} />
                  <span className="text-[11px] text-slate-500 font-bold">
                    {isConnected ? 'حفظ محلي - مزامنة سحابية نشطة' : 'حفظ محلي - لا يحتاج إنترنت'}
                  </span>
                  {pendingSyncs > 0 && (
                    <span className="badge-vibrant badge-vibrant-warning mr-2">
                      {pendingSyncs} معلق
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { setShowProfilePopout(false); }}
                  className="btn-vibrant-teal text-xs px-6 py-2.5"
                >
                  حفظ وإغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CALIBRATION AND GOOGLE CLOUD BACKUP GEAR (ترس معايرة ليمس) - VIBRANT REDESIGN */}
      {showCalibrationPopout && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-fadeIn" dir="rtl">
          <div className="modal-dark-vibrant w-full max-w-md shadow-2xl animate-scaleIn overflow-hidden relative">
            {/* Animated background particles */}
            <div className="particles-bg absolute inset-0 pointer-events-none" />

            <div className="relative z-10 p-6 space-y-5">
              {/* Header with vibrant gradient */}
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 animate-gradient shadow-lg shadow-blue-500/20">
                    <Settings className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '8s' }} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">ترس المعايرة ومزامنة السريعة</h3>
                    <span className="text-[10px] font-bold text-gradient-teal">Google Cloud</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowCalibrationPopout(false)}
                  className="text-slate-400 hover:text-white text-xs bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-1.5 font-bold transition-all hover:scale-105"
                >
                  إغلاق ×
                </button>
              </div>

              {/* Connection Status Bar */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isConnected ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                <span className={`status-dot ${isConnected ? 'status-dot-online' : 'status-dot-offline'}`} />
                <span className={`text-[11px] font-bold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {isConnected ? 'متصل بالإنترنت' : 'غير متصل - العمل محلي'}
                </span>
                {pendingSyncs > 0 && (
                  <span className="badge-vibrant badge-vibrant-warning mr-auto">
                    <CloudOff className="w-3 h-3" />
                    {pendingSyncs} مزامنة معلقة
                  </span>
                )}
              </div>

              {/* Google Sign-in Section */}
              <div className="card-vibrant-dark space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-700/50">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
                    <Cloud className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-blue-400">النسخ الاحتياطي السحابي عبر حساب Google</span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  بدلاً من استخدام رموز التشفير اليدوية المبهمة، يتيح لك النظام الآن تسجيل الدخول بحساب Google الآمن وعمل مزامنة فورية ومكالمة لملفات المرضى وقاعدة البيانات مباشرة على Google Drive مجاناً!
                </p>

                {!googleUser ? (
                  <div className="space-y-3">
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        سجل الدخول بحساب Google للمزامنة السحابية. لا حاجة لنسخ رموز Token يدوياً.
                      </p>
                    </div>

                    {/* VIBRANT Google Sign-in Button */}
                    <button
                      onClick={handleVibrantGoogleSignIn}
                      className="btn-google-connect w-full py-3.5 px-4 text-sm"
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <RefreshCw className="w-4 h-4 animate-spin-fast" />
                      ) : (
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                          <path fill="#FFFFFF" d="M12.2 10.2v3.7h6.8c-.3 1.8-2 5.1-6.8 5.1-4.1 0-7.5-3.4-7.5-7.5s3.4-7.5 7.5-7.5c2.4 0 4 .9 4.9 1.8l2.9-2.8C18.1 1.4 15.3 0 12.2 0 5.5 0 0 5.5 0 12.2S5.5 24.4 12.2 24.4c7 0 11.6-4.9 11.6-11.8 0-.8-.1-1.4-.2-2.4H12.2z"/>
                        </svg>
                      )}
                      <span>{isSyncing ? 'جاري الاتصال...' : 'تسجيل الدخول بـ Google OAuth'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    {/* User Info Card */}
                    <div className="flex items-center gap-3 bg-gradient-to-r from-slate-800 to-slate-900 p-3 rounded-xl border border-slate-700/50">
                      <img src={googleUser.avatar} alt="avatar" className="w-12 h-12 rounded-full border-2 border-teal-400 shadow-lg shadow-teal-500/20" />
                      <div className="text-right flex-1">
                        <span className="font-bold text-white block text-sm">{googleUser.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">{googleUser.email}</span>
                      </div>
                      <button
                        onClick={handleDisconnectGoogle}
                        className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                        title="فصل الاتصال"
                      >
                        <CloudOff className="w-4 h-4" />
                      </button>
                    </div>

                    {/* VIBRANT Sync Button */}
                    <button
                      onClick={handleVibrantGoogleBackup}
                      disabled={isSyncing || !isConnected}
                      className="btn-vibrant-teal w-full py-3.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSyncing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin-fast" />
                          <span>جاري المزامنة...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>بدء مزامنة السحابة ورفع لـ Google Drive</span>
                          <Cloud className="w-4 h-4 animate-bounce-subtle" />
                        </>
                      )}
                    </button>

                    {/* Download Button */}
                    <button
                      onClick={handleVibrantGoogleRestore}
                      disabled={isSyncing || !isConnected}
                      className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-blue-500 text-slate-300 hover:text-white font-extrabold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>استعادة نسخة احتياطية من Drive</span>
                    </button>
                  </div>
                )}

                {/* Sync Status Messages */}
                {syncStatusMessage && (
                  <div className={`p-3 rounded-xl border text-right ${syncStatusMessage.includes('✓') ? 'border-green-500/30 bg-green-500/5' : syncStatusMessage.includes('❌') ? 'border-red-500/30 bg-red-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
                    <p className={`text-[11px] font-bold leading-relaxed ${syncStatusMessage.includes('✓') ? 'text-green-400' : syncStatusMessage.includes('❌') ? 'text-red-400' : 'text-yellow-400'}`}>
                      {syncStatusMessage}
                    </p>
                  </div>
                )}

                {/* Progress Bar */}
                {googleBackupProgress > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-teal-400">{googleBackupProgress}%</span>
                      <span className="text-slate-400">جاري الرفع...</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="progress-vibrant h-full rounded-full transition-all duration-300"
                        style={{ width: `${googleBackupProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Google Backup Status */}
                {googleBackupStatus && (
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-right">
                    <p className="text-[11px] font-bold text-teal-400 leading-relaxed">{googleBackupStatus}</p>
                  </div>
                )}

                {/* Offline Warning */}
                {!isConnected && (
                  <div className="p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex items-start gap-2">
                    <Zap className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-yellow-400 leading-relaxed font-bold">
                      وضع عدم الاتصال: سيتم حفظ البيانات محلياً والمزامنة التلقائية عند استعادة الاتصال بالإنترنت.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-slate-700/50 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Signal className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-[10px] text-slate-500 font-mono">MyLab Drive Sync v2.0</span>
                </div>
                <button
                  onClick={() => setShowCalibrationPopout(false)}
                  className="btn-vibrant-teal text-xs px-5 py-2"
                >
                  رجوع
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. DISCOUNTS AND MEDIC COSTS POPUP OVERLAY */}
      {showDiscountsPopout && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-6 animate-scaleIn border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-900">لائحة خصومات التحاليل وتسعير الخدمات</h3>
              </div>
              <button 
                onClick={() => setShowDiscountsPopout(false)}
                className="text-slate-400 hover:text-slate-800 text-xs bg-slate-100 rounded-lg px-2.5 py-1 font-bold"
              >
                إغلاق ×
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Currency Selector */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200.5">
                <span className="font-bold text-slate-700">العملة المفضلة للتسعير:</span>
                <select 
                  value={settings.currency || 'EGP'}
                  onChange={(e) => handleUpdateSettings({ ...settings, currency: e.target.value as 'EGP'|'SAR' })}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1 font-bold outline-none cursor-pointer"
                >
                  <option value="EGP">جنيه مصري (EGP)</option>
                  <option value="SAR">ريال سعودي (SAR)</option>
                </select>
              </div>

              {/* Reference fees */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200.5">
                <span className="font-black text-slate-800 block mb-2">تخصيص الفحوص المرجعية وتعرفة الأسعار:</span>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="font-bold text-slate-500">صورة الدم كاملة (CBC)</span>
                    <div className="flex items-center gap-2">
                      <input type="number" className="w-20 text-center font-mono border border-slate-200 rounded px-2 py-1" value={settings.customTestPricing.CBC} onChange={(e) => handleUpdateSettings({...settings, customTestPricing: {...settings.customTestPricing, CBC: Number(e.target.value)}})} />
                      <span className="font-bold text-slate-400">{settings.currency || 'EGP'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="font-bold text-slate-500">فحص وظائف الكبد (LIVER)</span>
                    <div className="flex items-center gap-2">
                      <input type="number" className="w-20 text-center font-mono border border-slate-200 rounded px-2 py-1" value={settings.customTestPricing.LIVER} onChange={(e) => handleUpdateSettings({...settings, customTestPricing: {...settings.customTestPricing, LIVER: Number(e.target.value)}})} />
                      <span className="font-bold text-slate-400">{settings.currency || 'EGP'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="font-bold text-slate-500">سكر الدم (Glucose)</span>
                    <div className="flex items-center gap-2">
                      <input type="number" className="w-20 text-center font-mono border border-slate-200 rounded px-2 py-1" value={settings.customTestPricing.GLUCOSE} onChange={(e) => handleUpdateSettings({...settings, customTestPricing: {...settings.customTestPricing, GLUCOSE: Number(e.target.value)}})} />
                      <span className="font-bold text-slate-400">{settings.currency || 'EGP'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="font-bold text-slate-500">وظائف الغدة الدرقية (THYROID)</span>
                    <div className="flex items-center gap-2">
                      <input type="number" className="w-20 text-center font-mono border border-slate-200 rounded px-2 py-1" value={settings.customTestPricing.THYROID} onChange={(e) => handleUpdateSettings({...settings, customTestPricing: {...settings.customTestPricing, THYROID: Number(e.target.value)}})} />
                      <span className="font-bold text-slate-400">{settings.currency || 'EGP'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="font-bold text-slate-500">وظائف الكلى (KIDNEY)</span>
                    <div className="flex items-center gap-2">
                      <input type="number" className="w-20 text-center font-mono border border-slate-200 rounded px-2 py-1" value={settings.customTestPricing.KIDNEY} onChange={(e) => handleUpdateSettings({...settings, customTestPricing: {...settings.customTestPricing, KIDNEY: Number(e.target.value)}})} />
                      <span className="font-bold text-slate-400">{settings.currency || 'EGP'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="font-bold text-slate-500">دهنيات الدم (LIPID)</span>
                    <div className="flex items-center gap-2">
                      <input type="number" className="w-20 text-center font-mono border border-slate-200 rounded px-2 py-1" value={settings.customTestPricing.LIPID} onChange={(e) => handleUpdateSettings({...settings, customTestPricing: {...settings.customTestPricing, LIPID: Number(e.target.value)}})} />
                      <span className="font-bold text-slate-400">{settings.currency || 'EGP'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200/50">
                <span className="font-black text-amber-800 block mb-2">تخصيص الخصم العام:</span>
                <div className="flex items-center gap-3 mt-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={globalDiscountPercent}
                    onChange={(e) => setGlobalDiscountPercent(Number(e.target.value))}
                    className="flex-1 accent-amber-600"
                  />
                  <span className="text-amber-800 font-bold font-mono bg-amber-100 px-2 py-1 rounded w-12 text-center">
                    %{globalDiscountPercent}
                  </span>
                </div>
                {globalDiscountPercent > 0 && (
                  <p className="text-[10px] text-amber-700 mt-2 font-bold animate-pulse">
                    ⚠️ تم تفعيل تخفيض معملي بقيمة {globalDiscountPercent}% عند الدفع للفحص
                  </p>
                )}
              </div>
            </div>
            
            <div className="pt-4 flex justify-end px-6 border-t border-slate-100">
              <button 
                onClick={() => setShowDiscountsPopout(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl"
              >
                حفظ وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ADVANCED PRINTER AND BARCODE CONTROLLER OVERLAY */}
      {showPrinterControlPopout && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn no-print" dir="rtl">
          <div className="bg-white rounded-3xl p-5 sm:p-7 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-150 animate-scaleIn text-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-extrabold text-slate-900">منظومة الربط المركزي وإعدادات الطباعة والباركود</h3>
              </div>
              <button 
                onClick={() => setShowPrinterControlPopout(false)}
                className="text-slate-400 hover:text-slate-800 text-xs bg-slate-100 rounded-lg px-2.5 py-1 font-bold cursor-pointer"
              >
                إغلاق ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1 text-xs">
              <div className="bg-teal-50 text-teal-900 p-3 rounded-xl border border-teal-150 leading-relaxed font-bold">
                💡 تتيح لك هذه المنظومة ربط طابعات الباركود والطابعات الحرارية عبر الـ USB والمنافذ التسلسلية، أو شبكة الـ TCP/IP، وتعيين موقع ملصق التحقق رقمياً.
              </div>

              {/* SECTION: CONNECTIVITY PROFILE */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="font-extrabold text-slate-800 block mb-2">١. واجهة وطريقة توصيل الطابعة:</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'usb', title: 'كابل الـ USB المباشر', d: 'أجهزة المكتبي ووحدات السحب' },
                    { id: 'network', title: 'شبكة لاسلكية TCP/IP', d: 'عبر منفذ IP وسيرفر المعمل' },
                    { id: 'bluetooth', title: 'بلوتوث لاسلكي Serial', d: 'الأجهزة وهواتف المندوبين' },
                    { id: 'disconnected', title: 'طباعة المتصفح الافتراضية', d: 'معاينة نوافذ الـ Pop-up' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleUpdateSettings({ ...settings, printerConnectionType: p.id as any })}
                      className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${settings.printerConnectionType === p.id ? 'border-teal-600 bg-teal-50/40 text-teal-950 font-black' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'}`}
                    >
                      <span className="font-black text-[11px] block">{p.title}</span>
                      <span className="text-[9px] text-slate-400 font-normal mt-1">{p.d}</span>
                    </button>
                  ))}
                </div>

                {settings.printerConnectionType === 'network' && (
                  <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-600">عنوان جهاز الطابعة (IPv4 Address):</span>
                    <input 
                      type="text" 
                      className="w-40 text-center font-mono border border-slate-300 rounded-lg px-2.5 py-1 focus:border-teal-600 outline-none text-xs font-black text-slate-900" 
                      value={settings.printerIpAddress || "192.168.1.100"} 
                      onChange={(e) => handleUpdateSettings({...settings, printerIpAddress: e.target.value})} 
                    />
                  </div>
                )}
              </div>

              {/* SECTION: BARCODE PLACEMENT */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="font-extrabold text-slate-800 block mb-2">٢. موضع طباعة كود الباركود على التقرير الرسمي:</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'top', title: 'أعلى التقرير (Header)', desc: 'بجوار ترويسة واسم المختبر' },
                    { id: 'bottom', title: 'أسفل التقرير (Footer)', desc: 'في منطقة التمهيد والتصديق' },
                    { id: 'sidebar', title: 'شريط جانبي (Sidebar)', desc: 'بين المعاملات الطبية الجانبية' },
                    { id: 'hidden', title: 'إخفاء بالكامل (Hide)', desc: 'تعطيل طباعة الباركود على الورق' }
                  ].map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleUpdateSettings({ ...settings, barcodeLocation: b.id as any })}
                      className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${settings.barcodeLocation === b.id ? 'border-teal-600 bg-teal-50/40 text-teal-950 font-black' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'}`}
                    >
                      <span className="font-black text-[11px] block">{b.title}</span>
                      <span className="text-[9px] text-slate-400 font-normal mt-1">{b.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION: PAPER CONFIG & GAUGE */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4">
                <div>
                  <span className="font-extrabold text-slate-805 block mb-1">٣. عرض ورق الإيصال الحراري:</span>
                  <select
                    value={settings.thermalWidth || '80mm'}
                    onChange={(e) => handleUpdateSettings({ ...settings, thermalWidth: e.target.value as any })}
                    className="w-full bg-white border border-slate-350 rounded-xl px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm"
                  >
                    <option value="80mm">أجهزة 80 مم (Epson Standard)</option>
                    <option value="58mm">أجهزة 58 مم (Mobile/Portable)</option>
                  </select>
                </div>

                <div>
                  <span className="font-extrabold text-slate-805 block mb-1">٤. اختبار محاكاة الاتصال:</span>
                  <div className="p-2 gap-1.5 flex items-center bg-emerald-50 rounded-lg border border-emerald-150 text-emerald-800 text-[10px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span>متصل وبحالة ممتازة وجاهز لتوريد المخرجات (On Spooler)</span>
                  </div>
                </div>
              </div>

              {/* QUICK LAUNCH FOR LAB DATA */}
              <div className="p-4 bg-teal-600/5 rounded-xl border border-teal-600/10">
                <span className="font-extrabold text-teal-900 block mb-2">٥. اختبار طباعة تقارير الفحوص الفورية المعتمدة بالمختبر:</span>
                {tests.length === 0 ? (
                  <p className="text-slate-400 font-bold text-center py-2">لا يوجد أي فحوصات معتمدة لإصدارها حالياً.</p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1">اختر المريض المراد إصدار تقريره الطبي:</label>
                      <select
                        value={selectedPrintTestId || (tests[0]?.id || '')}
                        onChange={(e) => setSelectedPrintTestId(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-xl p-2.5 text-xs font-black text-slate-700 shadow-sm outline-none focus:border-teal-600"
                      >
                        {tests.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.patientName} | فحص {t.titleAr || t.testType} ({t.id})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const matchingTest = tests.find(t => t.id === (selectedPrintTestId || tests[0].id));
                          if (matchingTest) {
                            setViewingTestReport(matchingTest);
                            setShowPrinterControlPopout(false);
                            // Trigger the thermal receipt panel inside report printable view!
                            setTimeout(() => {
                              const printBtn = document.getElementById('print-test-ticket-action');
                              if (printBtn) printBtn.click();
                            }, 500);
                          }
                        }}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold py-2.5 rounded-xl text-center shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Printer className="w-4 h-4" />
                        <span>طباعة تيكيت حراري 🖨️</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const matchingTest = tests.find(t => t.id === (selectedPrintTestId || tests[0].id));
                          if (matchingTest) {
                            setViewingTestReport(matchingTest);
                            setShowPrinterControlPopout(false);
                            // Scroll to top and open formal print!
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-center shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <FileText className="w-4 h-4" />
                        <span>معاينة للطباعة كـ A4 📄</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button 
                onClick={() => setShowPrinterControlPopout(false)}
                className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer"
              >
                حفظ الإعدادات الفعليّة
              </button>
            </div>
          </div>
        </div>
      )}

        {/* FOOTER */}
        <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400 no-print mt-12 bg-slate-50/20">
          <p className="font-sans leading-relaxed">
            جميع الحقوق محفوظة © معمل {settings.labNameAr || "MY LAB"} لـ معلومات المختبرات وإدارة النظم السحابية الطبية {(new Date()).getFullYear()}.
          </p>
        </footer>
        <AppVersionInfo />
      </div>
    </>
  );
}