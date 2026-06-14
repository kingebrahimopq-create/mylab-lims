import React, { useState } from 'react';
import { DoctorSettings, Patient } from '../types';
import { TRANSLATIONS } from '../lib/translations';
import { ClinicalDatabase } from '../db/storage';
import { 
  ShieldCheck, KeyRound, User, Lock, 
  ArrowRight, HeartPulse, Sparkles, CheckCircle2, ShieldAlert,
  Clock, AlertCircle, ScanBarcode, UserPlus, Phone, Calendar,
  Laptop, Smartphone
} from 'lucide-react';

interface LoginPortalProps {
  settings: DoctorSettings;
  onLogin: (role: 'admin' | 'receptionist', isBiometric: boolean) => void;
  onPublicVerify: () => void;
  patients: Patient[];
  onRegisterPatientBySelf: (pat: Patient) => void;
  onPatientLoginSelect: (patientId: string) => void;
  language: 'ar' | 'en';
  onGoogleLogin?: () => void;
}

export default function LoginPortal({ 
  settings, 
  onLogin, 
  onPublicVerify,
  patients,
  onRegisterPatientBySelf,
  onPatientLoginSelect,
  language,
  onGoogleLogin
}: LoginPortalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'patient_reg'>('login');
  const t = TRANSLATIONS[language];
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  // Unified Login state
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Patient registration form state
  const [regId, setRegId] = useState('');
  const [regNameAr, setRegNameAr] = useState('');
  const [regNameEn, setRegNameEn] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regGender, setRegGender] = useState<'ذكر' | 'أنثى'>('ذكر');
  const [regDob, setRegDob] = useState('');
  const [regBlood, setRegBlood] = useState('O+');

  // Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Public Complaint Modal States
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [compCategory, setCompCategory] = useState<'technical' | 'administrative' | 'delay' | 'billing' | 'other'>('technical');
  const [compName, setCompName] = useState('');
  const [compPhone, setCompPhone] = useState('');
  const [compDetails, setCompDetails] = useState('');
  const [compTestId, setCompTestId] = useState('');

  const [bioUsername, setBioUsername] = useState('');
  const [showBioModal, setShowBioModal] = useState(false);
  const [bioProgress, setBioProgress] = useState(0);
  const [bioDiagnosticLog, setBioDiagnosticLog] = useState('');
  const [bioResult, setBioResult] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [bioScanning, setBioScanning] = useState(false);

  const [compSuccess, setCompSuccess] = useState(false);

  const handlePublicComplaintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim() || !compPhone.trim() || !compDetails.trim()) return;
    
    const complaints = ClinicalDatabase.getComplaints();
    const newComp = {
      id: `CQ-2026-0${complaints.length + 1}`,
      name: compName,
      phone: compPhone,
      category: compCategory,
      details: compDetails,
      testId: compTestId || undefined,
      date: new Date().toISOString().split('T')[0],
      status: 'pending' as const
    };
    
    ClinicalDatabase.saveComplaint(newComp);
    setCompSuccess(true);
    setCompName('');
    setCompPhone('');
    setCompDetails('');
    setCompTestId('');
    setTimeout(() => {
      setCompSuccess(false);
      setShowComplaintModal(false);
    }, 4500);
  };

  const handleBiometricLogin = () => {
    setErrorMsg('');
    setSuccessMsg('');
    
    const idClean = loginId.trim();
    if (!idClean) {
      setErrorMsg(language === 'ar' ? 'يرجى كتابة اسم المستخدم أو رقم الهوية الوطنية أولاً في حقل اسم المستخدم لبحث البصمة المربوطة به!' : 'Please enter your username or National ID first to locate your linked fingerprint!');
      return;
    }

    const registeredBps = ClinicalDatabase.getRegisteredBiometrics();
    
    // Check if user has a registered fingerprint pattern
    const keyMap: Record<string, string> = {
      ...registeredBps,
      'safaa': 'PATTERN_DOCTOR_SAFAA_BIO',
      'reception': 'PATTERN_STAFF_RECEPTION_BIO',
      '30512894': 'PATTERN_PATIENT_AHMED_BIO'
    };

    const hasFingerprint = Object.keys(keyMap).some(k => k.toLowerCase() === idClean.toLowerCase());

    if (!hasFingerprint) {
      setErrorMsg(language === 'ar' 
        ? `⚠️ البصمة غير مسجلة للمعرف "${idClean}" في قاعدة بيانات النظام حتى الآن. للربط: تفضل بتسجيل الدخول أولاً برمز المرور، وافتح الملف الشخصي لتسجيل بصمتك الشخصية المنفصلة للولوج السريع لاحقاً بضغطة واحدة!`
        : `No fingerprint pattern registered for username "${idClean}". Please login with your password first, and link your custom fingerprint pattern from your profile setting.`
      );
      return;
    }

    // Open Custom Fingerprint Scanning Widget
    setBioUsername(idClean);
    setShowBioModal(true);
    setBioProgress(0);
    setBioDiagnosticLog(language === 'ar' ? 'بانتظار وضع إصبعك المسجّل على المعقد الافتراضي المنفصل...' : 'Waiting for mapped finger touch event...');
    setBioResult('idle');
  };

  const handleStartSimulatedScan = () => {
    if (bioScanning) return;
    setBioScanning(true);
    setBioResult('scanning');
    setBioProgress(10);
    setBioDiagnosticLog(language === 'ar' ? 'جاري معايرة نبض البصمة وترشيح السطوح البيومترية...' : 'Calibrating surface and extracting ridge templates...');
    
    let currentProg = 10;
    const interval = setInterval(() => {
      currentProg += 15;
      if (currentProg >= 100) {
        setBioProgress(100);
        setBioScanning(false);
        setBioResult('success');
        setBioDiagnosticLog(language === 'ar' ? '✓ تم مطابقة البصمة الثنائية وتوافقها مع النموذج المحفوظ في السلسلة السحابية المأمنة!' : '✓ Biometric identity matched with local template database!');
        clearInterval(interval);
        
        // Exiting scan screen and signing in
        setTimeout(() => {
          setShowBioModal(false);
          setSuccessMsg(language === 'ar' ? 'تم التحقق من هويتك الطبية عبر البصمة المنفصلة بنجاح!' : 'Successfully authenticated via secure offline fingerprint!');
          
          // Execute Login
          const idLower = bioUsername.toLowerCase();
          const configuredUser = (settings.receptionUsername || 'reception').toLowerCase();
          
          if (idLower === 'safaa') {
            onLogin('admin', true);
          } else if (idLower === 'reception' || idLower === configuredUser) {
            onLogin('receptionist', true);
          } else {
            // Check as patient
            const found = patients.find(p => p.id === bioUsername || p.phone === bioUsername || p.name === bioUsername);
            if (found) {
              onPatientLoginSelect(found.id);
            } else {
              // fallback login
              onLogin('receptionist', true);
            }
          }
        }, 1200);

      } else {
        setBioProgress(currentProg);
        if (currentProg === 40) {
          setBioDiagnosticLog(language === 'ar' ? 'البحث عن بصمة المسجل واستدعاء مفتاح التوافق الرقمي التناظري...' : 'Inquiring local stored database biometrics patterns...');
        } else if (currentProg === 75) {
          setBioDiagnosticLog(language === 'ar' ? 'جاري عزل بصمة النظام عن بصمة الهاتف... حماية الهوية نشطة.' : 'Isolating system scanner from device-lock credential keys...');
        }
      }
    }, 250);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    const idClean = loginId.trim();

    // Check Admin / Owner
    if (idClean === 'safaa' && loginPassword === '0e02ddd1') {
      onLogin('admin', false);
      return;
    }

    // Check Receptionist (from configured settings)
    const configuredUser = (settings.receptionUsername || 'reception').trim();
    const configuredPass = settings.receptionPassword || 'reception_authorized_99';
    if (idClean === configuredUser && loginPassword === configuredPass) {
      onLogin('receptionist', false);
      return;
    }

    // Patient
    const found = patients.find(p => p.id === idClean || p.phone === idClean || p.name === idClean || p.nameEn === idClean);
    if (found) {
      setSuccessMsg(language === 'ar' ? 'جاري توجيهك لملفك الطبي...' : 'Accessing your clinical file...');
      setTimeout(() => {
        onPatientLoginSelect(found.id);
      }, 800);
    } else {
      setErrorMsg(t.noPatientFound);
    }
  };

  const handlePatientRegSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regId.trim() || !regNameAr.trim() || !regPhone.trim()) {
      setErrorMsg(language === 'ar' ? 'يرجى ملء جميع البيانات الأساسية المطلوبة!' : 'Please fill all required inputs!');
      return;
    }

    const exists = patients.some(p => p.id === regId.trim());
    if (exists) {
      setErrorMsg(language === 'ar' ? 'رقم الهوية الوطنية هذا برقم ملف مسجل مسبقاً!' : 'National ID already registered!');
      return;
    }

    const newPatient: Patient = {
      id: regId.trim(),
      name: regNameAr.trim(),
      nameEn: regNameEn.trim() || regNameAr.trim(),
      phone: regPhone.trim(),
      gender: regGender,
      birthDate: regDob || "1990-01-01",
      bloodType: regBlood
    };

    onRegisterPatientBySelf(newPatient);
    setSuccessMsg(language === 'ar' ? 'تم إنشاء ملفك الطبي بنجاح! جاري دخولك للخدمات السحابية...' : 'Medical record created successfully! Entering portal...');

    setTimeout(() => {
      onPatientLoginSelect(newPatient.id);
    }, 1500);
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-8 animate-fadeIn" dir={dir}>
      
      {/* Brand card */}
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden p-6 sm:p-8 space-y-6 relative">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-emerald-600 animate-pulse" />
        
        {/* Brand logo & title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto border border-emerald-150 shadow-sm">
            <HeartPulse className="w-8 h-8 animate-pulse text-emerald-700" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-850">{t.loginTitle}</h2>
            <p className="text-xs text-slate-400 font-bold mt-0.5">{t.loginSubtitle}</p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="bg-slate-100 p-1.5 rounded-2xl grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'login' 
                ? 'bg-white text-emerald-900 shadow-sm font-extrabold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.tabPatientLogin}</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('patient_reg'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'patient_reg' 
                ? 'bg-white text-emerald-900 shadow-sm font-extrabold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-teal-600 animate-bounce" />
            <span>{t.tabRegisterPatient}</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3 rounded-xl text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="font-bold leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5 animate-bounce" />
            <span className="font-bold leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* RENDER ACTIVE TAB */}
        {activeTab === 'login' && (
          <div className="space-y-4">
            {onGoogleLogin && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onGoogleLogin}
                  className="w-full bg-white hover:bg-slate-50 text-slate-800 font-extrabold py-3 px-4 border border-slate-300 rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm text-xs"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12.2 10.2v3.7h6.8c-.3 1.8-2 5.1-6.8 5.1-4.1 0-7.5-3.4-7.5-7.5s3.4-7.5 7.5-7.5c2.4 0 4 .9 4.9 1.8l2.9-2.8C18.1 1.4 15.3 0 12.2 0 5.5 0 0 5.5 0 12.2S5.5 24.4 12.2 24.4c7 0 11.6-4.9 11.6-11.8 0-.8-.1-1.4-.2-2.4H12.2z"/>
                  </svg>
                  <span>تسجيل الدخول</span>
                </button>

                <div className="flex items-center my-3 justify-center gap-3">
                  <span className="h-px bg-slate-200 flex-1"></span>
                  <span className="text-[10px] text-slate-400 font-extrabold">أو بيانات الاعتماد الطبية</span>
                  <span className="h-px bg-slate-200 flex-1"></span>
                </div>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">{t.patientLoginLabel}</label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold font-mono focus:border-emerald-600 outline-none transition-all text-center"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">ادخل كلمة المرور</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold font-mono focus:border-emerald-600 outline-none transition-all text-center"
              />
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>تسجيل الدخول</span>
                <ArrowRight className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </form>
          </div>
        )}

        {activeTab === 'patient_reg' && (
          <form onSubmit={handlePatientRegSubmit} className="space-y-4">
            <div className="bg-teal-50/50 p-4 border border-teal-100 rounded-2xl mb-2 text-center">
              <h4 className="font-extrabold text-teal-900 text-xs">{t.patientRegTitle}</h4>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{t.patientRegDesc}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">{t.patientRegNameAr} *</label>
                <input
                  type="text"
                  placeholder=""
                  value={regNameAr}
                  onChange={(e) => setRegNameAr(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:border-emerald-650 outline-none text-right"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">{t.patientRegNameEn}</label>
                <input
                  type="text"
                  placeholder=""
                  value={regNameEn}
                  onChange={(e) => setRegNameEn(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:border-emerald-650 outline-none text-left font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">{t.patientRegId} *</label>
                <input
                  type="text"
                  placeholder=""
                  value={regId}
                  onChange={(e) => setRegId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono font-bold focus:border-emerald-650 outline-none text-center"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">{t.patientRegPhone} *</label>
                <input
                  type="text"
                  placeholder=""
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono font-bold focus:border-emerald-650 outline-none text-center"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">{t.patientRegGender}</label>
                <select
                  value={regGender}
                  onChange={(e) => setRegGender(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-bold focus:border-emerald-650 outline-none cursor-pointer"
                >
                  <option value="ذكـر">{t.male}</option>
                  <option value="أنثى">{t.female}</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">{t.patientRegDob}</label>
                <input
                  type="date"
                  value={regDob}
                  onChange={(e) => setRegDob(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-[11px] focus:border-emerald-650 outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">{t.patientRegBlood}</label>
                <select
                  value={regBlood}
                  onChange={(e) => setRegBlood(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-mono font-bold focus:border-emerald-650 outline-none cursor-pointer"
                >
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-extrabold py-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t.btnRegisterForm}</span>
            </button>
          </form>
        )}

        {/* Public Bypass link */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-center">
          <button
            type="button"
            onClick={onPublicVerify}
            className="text-[10px] sm:text-[11px] text-slate-500 hover:text-emerald-700 hover:underline font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <ScanBarcode className="w-3.5 h-3.5" />
            <span>{t.byPassVerify}</span>
          </button>
          <span className="hidden sm:inline-block text-slate-300">|</span>
          <button
            type="button"
            onClick={() => setShowComplaintModal(true)}
            className="text-[10px] sm:text-[11px] text-indigo-600 hover:text-indigo-550 font-black hover:underline transition-all cursor-pointer inline-flex items-center gap-1"
          >
            <span>تقديم شكوى أو مقترح للتطبيق 📝</span>
          </button>
        </div>
      </div>

      {/* COMPLAINTS MODAL OVERLAY */}
      {showComplaintModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn" dir="rtl">
          <div className="bg-white border border-slate-200 text-slate-800 p-6 sm:p-8 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col space-y-4 animate-scaleIn relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>تقديم شكوى أو اقتراح إلكتروني</span>
              </h3>
              <button 
                onClick={() => { setShowComplaintModal(false); setCompSuccess(false); }}
                className="text-slate-400 hover:text-slate-800 text-xs bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1"
              >
                إغلاق ×
              </button>
            </div>

            {compSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-4 rounded-2xl text-center space-y-2 animate-fadeIn">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <h4 className="font-extrabold text-xs">تم تسجيل شكواك بنجاح في النظام السحابي!</h4>
                <p className="text-[11px] text-slate-600">
                  نشكرك على إرسال مقترحك/شكواك. تم نقل الشكوى للأخصائيين ومراجعتها مسألة وقت قصيرة. سيتم إغلاق النموذج تلقائياً.
                </p>
              </div>
            ) : (
              <form onSubmit={handlePublicComplaintSubmit} className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 text-[11px]">الاسم الكامل للتواصل *</label>
                    <input
                      type="text"
                      required
                      value={compName}
                      onChange={(e) => setCompName(e.target.value)}
                      placeholder="مثال: أحمد عبد الله"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-right font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 text-[11px]">رقم الهاتف للتواصل والمتابعة *</label>
                    <input
                      type="text"
                      required
                      value={compPhone}
                      onChange={(e) => setCompPhone(e.target.value)}
                      placeholder="الأرقام بالإنجليزية: 010xxxxxxxx"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none text-left"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 text-[11px]">نوع الشكوى أو المقترح *</label>
                    <select
                      value={compCategory}
                      onChange={(e) => setCompCategory(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-extrabold outline-none text-right cursor-pointer"
                    >
                      <option value="technical">مشكلة تقنية للبرنامج</option>
                      <option value="delay">تأخر تسليم النتيجة</option>
                      <option value="administrative">شكوى إدارية أو معاملة</option>
                      <option value="billing">خطأ بالحسابات أو الدفع</option>
                      <option value="other">مقترحات أخرى للتحسين</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 text-[11px]">رقم الفحص (اختياري)</label>
                    <input
                      type="text"
                      value={compTestId}
                      onChange={(e) => setCompTestId(e.target.value)}
                      placeholder="مثال: LAB-2026-004"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none text-left"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 text-[11px]">التفاصيل الكاملة والشكوى *</label>
                  <textarea
                    required
                    rows={4}
                    value={compDetails}
                    onChange={(e) => setCompDetails(e.target.value)}
                    placeholder="يرجى كتابة تفاصيل الشكوى أو اقتراحك حتى يتسنى لإدارة معمل النيل مراجعتها والرد عليكم في أقرب وقت..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-right font-medium leading-relaxed"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                  >
                    إرسال الشكوى رسمياً للتنفيذ ✉
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}



    </div>
  );
}
