import React, { useState } from 'react';
import { Patient, LabTest, Appointment } from '../types';
import { PARAMETER_TEMPLATES } from '../data';
import { 
  Users, Search, PlusCircle, Calendar, Receipt, 
  CheckCircle2, AlertCircle, Phone, CreditCard, 
  Printer, Trash2, Check, X, ShieldAlert, Barcode,
  Bell, AlertTriangle
} from 'lucide-react';

interface ReceptionPortalProps {
  patients: Patient[];
  tests: LabTest[];
  appointments: Appointment[];
  language?: 'ar' | 'en';
  currency?: 'SAR' | 'EGP';
  globalDiscountPercent?: number;
  onRegisterPatient: (patient: Patient) => void;
  onConfirmAppointment: (id: string) => void;
  onCancelAppointment: (id: string) => void;
  onLogTestRequest: (test: Omit<LabTest, 'id' | 'qrToken' | 'barcode' | 'sampleStatus'>) => void;
}

export default function ReceptionPortal({
  patients,
  tests,
  appointments,
  language = 'ar',
  currency = 'EGP',
  globalDiscountPercent = 0,
  onRegisterPatient,
  onConfirmAppointment,
  onCancelAppointment,
  onLogTestRequest
}: ReceptionPortalProps) {
  const [activeTab, setActiveTab] = useState<'patients' | 'appointments' | 'billing'>('patients');
  
  const formatPrice = (sarPrice: number) => {
    const symbol = currency === 'EGP' ? (language === 'ar' ? 'ج.م' : 'EGP') : (language === 'ar' ? 'ر.س' : 'SAR');
    return `${sarPrice} ${symbol}`;
  };
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Patient Registration State
  const [regId, setRegId] = useState('');
  const [regName, setRegName] = useState('');
  const [regNameEn, setRegNameEn] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regGender, setRegGender] = useState<'male' | 'female' | 'ذكر' | 'أنثى'>('ذكر');
  const [regBirth, setRegBirth] = useState('');
  const [regBlood, setRegBlood] = useState('O+');
  const [regSuccess, setRegSuccess] = useState('');

  // Log Lab Test State
  const [selectedPatId, setSelectedPatId] = useState<string | null>(null);
  const [testTypeSelect, setTestTypeSelect] = useState<'CBC' | 'LIPID' | 'LIVER' | 'GLUCOSE' | 'THYROID' | 'KIDNEY' | 'OTHER'>('CBC');
  const [customTestTitleAr, setCustomTestTitleAr] = useState('');
  const [customTestTitleEn, setCustomTestTitleEn] = useState('');
  const [testCost, setTestCost] = useState(180);
  const [paidAmount, setPaidAmount] = useState(180);
  const [logSuccess, setLogSuccess] = useState(false);

  // Barcode printed simulation popup State
  const [simulatedTubeBarcode, setSimulatedTubeBarcode] = useState<string | null>(null);
  const [simulatedPatientName, setSimulatedPatientName] = useState('');

  // Alert simulation state
  const [smsAlertPatient, setSmsAlertPatient] = useState<string | null>(null);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (patients.some(p => p.id === regId)) {
      setAlertMessage('⚠️ عذراً! رقم الهوية هذا مسجل مسبقاً في قاعدة معلومات المختبر.');
      return;
    }
    const newPat: Patient = {
      id: regId,
      name: regName,
      nameEn: regNameEn,
      phone: regPhone,
      gender: regGender,
      birthDate: regBirth,
      bloodType: regBlood
    };
    onRegisterPatient(newPat);
    setRegSuccess(`تم تسجيل الملف الطبي للمريض "${regName}" بنجاح!`);
    
    // Auto fill for test request logging
    setSelectedPatId(regId);

    // Reset Form
    setRegId('');
    setRegName('');
    setRegNameEn('');
    setRegPhone('');
    setRegBirth('');
    
    setTimeout(() => setRegSuccess(''), 4000);
  };

  // Alert/Notification system for appointments
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning'>('success');

  const showAlert = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setAlertMessage(message);
    setAlertType(type);
    setTimeout(() => setAlertMessage(null), 4000);
  };

  const handleCancelAppointmentWithAlert = (aptId: string, patientName: string) => {
    onCancelAppointment(aptId);
    showAlert(`تم إلغاء موعد المريض ${patientName} بنجاح`, 'warning');
  };

  const handleLogTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatId) return;

    const pat = patients.find(p => p.id === selectedPatId);
    if (!pat) return;

    let titleAr = 'صورة الدم الكاملة';
    let titleEn = 'Complete Blood Count (CBC)';
    if (testTypeSelect === 'LIPID') {
      titleAr = 'فحص الدهون الشامل';
      titleEn = 'Lipid Profile Panel';
    } else if (testTypeSelect === 'LIVER') {
      titleAr = 'فحص وظائف الكبد';
      titleEn = 'Liver Function Test (LFT)';
    } else if (testTypeSelect === 'GLUCOSE') {
      titleAr = 'تحليل السكر الشامل';
      titleEn = 'Comprehensive Glucose Profile';
    } else if (testTypeSelect === 'THYROID') {
      titleAr = 'تحليل وظائف الغدة الدرقية';
      titleEn = 'Thyroid Function Test';
    } else if (testTypeSelect === 'KIDNEY') {
      titleAr = 'تحليل وظائف الكلى';
      titleEn = 'Kidney Function Test (KFT)';
    } else if (testTypeSelect === 'OTHER') {
      titleAr = customTestTitleAr || 'تحليل مخبري مخصص';
      titleEn = customTestTitleEn || 'Custom Diagnostic Test';
    }

    // Default empty parameter list based on templates
    let defaultParams: { name: string; nameAr: string; unit: string; minNormal: number; maxNormal: number }[] = [];
    if (testTypeSelect === 'OTHER') {
      defaultParams = [{
        name: 'General Diagnostic Level',
        nameAr: 'مؤشر نتيجة التحليل الإجمالي',
        unit: 'Ratio / Unit',
        minNormal: 0,
        maxNormal: 100
      }];
    } else {
      defaultParams = PARAMETER_TEMPLATES[testTypeSelect].map(p => ({
        name: p.name,
        nameAr: p.nameAr,
        unit: p.unit,
        minNormal: p.minNormal,
        maxNormal: p.maxNormal
      }));
    }

    onLogTestRequest({
      patientId: pat.id,
      patientName: pat.name,
      patientNameEn: pat.nameEn,
      testType: testTypeSelect,
      titleAr,
      titleEn,
      requestDate: new Date().toISOString().split('T')[0],
      cost: Number(testCost),
      paidAmount: Number(paidAmount),
      parameters: defaultParams
    });

    // Simulate barcode printing for receptionist
    const randomBarcode = Math.floor(10000000 + Math.random() * 90000000).toString();
    setSimulatedTubeBarcode(randomBarcode);
    setSimulatedPatientName(pat.name);

    setLogSuccess(true);
    setTimeout(() => {
      setLogSuccess(false);
      setSelectedPatId(null);
    }, 5000);
  };

  const triggerSmsSimulate = (patientName: string) => {
    setSmsAlertPatient(patientName);
    setTimeout(() => setSmsAlertPatient(null), 3000);
  };

  // Filter lists based on search
  const filteredPatients = patients.filter(p => 
    p.name.includes(searchQuery) || 
    p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.includes(searchQuery) ||
    p.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Alert Banner / Toast Notification Simulated (SMS Reminder Trigger) */}
      {smsAlertPatient && (
        <div className="bg-slate-900 border-r-4 border-emerald-500 text-white p-4 rounded-xl flex items-center justify-between gap-4 shadow-xl z-50 fixed bottom-6 left-6 animate-bounce">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
            <p className="text-xs font-bold">
              [خادم إشعارات WhatsApp]: تم إرسال رسالة تذكيرية والتعليمات الطبية بنجاح للمريض: {smsAlertPatient}
            </p>
          </div>
        </div>
      )}

      {/* Appointment Alert System */}
      {alertMessage && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-xl animate-fadeIn flex items-center gap-3 ${
          alertType === 'success' ? 'bg-emerald-500 text-white' : 
          alertType === 'warning' ? 'bg-amber-500 text-white' : 
          'bg-rose-500 text-white'
        }`}>
          {alertType === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
           alertType === 'warning' ? <AlertTriangle className="w-5 h-5" /> : 
           <X className="w-5 h-5" />}
          <p className="text-sm font-bold">{alertMessage}</p>
          <button onClick={() => setAlertMessage(null)} className="mr-2 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Reception header stats design */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="text-right">
            <span className="text-xs font-bold text-slate-400 block mb-1">المرضى المسجلين اليوم</span>
            <span className="text-2xl font-black text-slate-800 tracking-tight">{patients.length} مرضى</span>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="text-right">
            <span className="text-xs font-bold text-slate-400 block mb-1">المواعيد في الانتظار</span>
            <span className="text-2xl font-black text-indigo-600 tracking-tight">
              {appointments.filter(a => a.status === 'pending').length} مواعيد
            </span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="text-right">
            <span className="text-xs font-bold text-slate-400 block mb-1">صلاحية موظف الاستقبال</span>
            <span className="text-xs font-bold bg-amber-50 text-amber-800 px-3 py-1 rounded-full border border-amber-200 inline-block mt-1">
              إدخال، حجز، وفواتير السحب
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto flex-nowrap md:flex-wrap whitespace-nowrap md:whitespace-normal scrollbar-none">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`pb-3 px-4 font-bold text-sm relative transition-all cursor-pointer shrink-0 ${
            activeTab === 'appointments' ? 'text-teal-600' : 'text-slate-500 hover:text-slate-800'
          }`}
          id="tab-recep-appointments"
        >
          <span>إدارة المواعيد والتقويم</span>
          {activeTab === 'appointments' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`pb-3 px-4 font-bold text-sm relative transition-all cursor-pointer shrink-0 ${
            activeTab === 'billing' ? 'text-teal-600' : 'text-slate-500 hover:text-slate-800'
          }`}
          id="tab-recep-billing"
        >
          <span>تسجيل الفحص وتسليم الفاتورة</span>
          {activeTab === 'billing' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full" />}
        </button>
      </div>

      {/* TAB CONTENT: PATIENTS LIST & REGISTRATION */}
      {activeTab === 'patients' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Patients Search / List Panel */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm text-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">قاعدة بيانات عملاء المختبر</h3>
              <div className="relative w-48 sm:w-64">
                <input
                  type="text"
                  placeholder="ابحث برقم الهوية، الاسم أو الجوال"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 pr-9 text-xs focus:border-teal-500 outline-none transition-all"
                  id="recep-patient-search"
                />
                <Search className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {filteredPatients.map((p, idx) => (
                <div key={idx} className="p-3 border border-slate-100 rounded-xl hover:bg-slate-50/50 flex items-center justify-between gap-4 transition-colors">
                  <div>
                    <span className="font-bold text-slate-800">{p.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{p.nameEn} • هوية {p.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {p.phone}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedPatId(p.id);
                        setActiveTab('billing');
                      }}
                      className="bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                      id={`btn-regtest-for-${p.id}`}
                    >
                      تسجيل فحص له
                    </button>
                  </div>
                </div>
              ))}
              {filteredPatients.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  لا توجد نتائج بحث مطابقة. جرب تسجيل المريض كملف جديد باليسار.
                </div>
              )}
            </div>
          </div>

          {/* New Patient Registration Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-sm">
            <h3 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-teal-600" />
              <span>تسجيل ملف طبي جديد (EMR)</span>
            </h3>

            {regSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-3 rounded-xl mb-4 font-bold text-xs animate-fadeIn">
                {regSuccess}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4" id="recep-patient-register-form">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">رقم الهوية الوطنية / الإقامة:</label>
                <input
                  type="text"
                  value={regId}
                  onChange={(e) => setRegId(e.target.value)}
                  placeholder="مثال: 2980512"
                  className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-teal-500 outline-none transition-all font-mono"
                  required
                  id="reg-id"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">الاسم الكامل (عربي):</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="مثال: محمد أحمد العتيبي"
                  className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-teal-500 outline-none transition-all"
                  required
                  id="reg-name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Full Name (English):</label>
                <input
                  type="text"
                  value={regNameEn}
                  onChange={(e) => setRegNameEn(e.target.value)}
                  placeholder="Example: Mohammed Ahmed Al-Otaibi"
                  className="w-full text-left bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-teal-500 outline-none transition-all font-mono"
                  required
                  id="reg-name-en"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">الجنس:</label>
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value as any)}
                    className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs focus:border-teal-500 outline-none transition-all"
                    id="reg-gender"
                  >
                    <option value="ذك">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">فصيلة الدم:</label>
                  <select
                    value={regBlood}
                    onChange={(e) => setRegBlood(e.target.value)}
                    className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs focus:border-teal-500 outline-none transition-all font-mono"
                    id="reg-blood"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">تاريخ الميلاد:</label>
                  <input
                    type="date"
                    value={regBirth}
                    onChange={(e) => setRegBirth(e.target.value)}
                    className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs focus:border-teal-500 outline-none transition-all font-mono"
                    required
                    id="reg-birth"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">رقم الجوال:</label>
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="مثال: 0599000111"
                    className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs focus:border-teal-500 outline-none transition-all font-mono"
                    required
                    id="reg-phone"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold p-3 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                id="btn-recep-register-submit"
              >
                تأكيد وبناء السجل الطبي الرقمي
              </button>
            </form>
          </div>

        </div>
      )}

      {/* TAB CONTENT: APPOINTMENTS SCHEDULER */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm text-sm">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-base">جدولة المواعيد وحالة سحب العينات</h3>
            <span className="text-xs text-slate-400 font-medium">التحكم في المواعيد المعلقة والمنزلية</span>
          </div>

          <div className="space-y-4">
            {appointments.map((apt, idx) => {
              return (
                <div key={idx} className="p-4 border border-slate-100 rounded-xl hover:border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl ${apt.type === 'home' ? 'bg-indigo-50 text-indigo-700' : 'bg-teal-50 text-teal-700'}`}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-850 text-base">{apt.patientName}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          apt.type === 'home' ? 'bg-indigo-100 text-indigo-800' : 'bg-teal-100 text-teal-800'
                        }`}>
                          {apt.type === 'home' ? 'سحب منزلي 🏠' : 'حضور للمعمل 🏥'}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-500 font-semibold mt-1">الاختبار: {apt.testType}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 font-mono mt-1.5">
                        <span>قناة الاتصال: {apt.patientPhone}</span>
                        <span>•</span>
                        <span>الوقت: {apt.date} الساعة {apt.time}</span>
                      </div>

                      {apt.notes && (
                        <p className="text-[11px] text-slate-400 mt-2 bg-slate-55 pb-1 pr-1.5 border-r-2 border-slate-200">
                          ملاحظة المريض: {apt.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-150">
                    {apt.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => {
                            onConfirmAppointment(apt.id);
                            triggerSmsSimulate(apt.patientName);
                          }}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                          id={`btn-confirm-${apt.id}`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>تأكيد الموعد وإرسال SMS</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من إلغاء موعد المريض ${apt.patientName}؟`)) {
                              handleCancelAppointmentWithAlert(apt.id, apt.patientName);
                            }
                          }}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold p-2 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                          id={`btn-cancel-${apt.id}`}
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>إلغاء</span>
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-emerald-55 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-150 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>الموعد مؤكد ومخطط</span>
                        </span>
                        
                        <button
                          onClick={() => triggerSmsSimulate(apt.patientName)}
                          className="text-[10px] border border-slate-200 bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-md transition-all font-semibold cursor-pointer text-slate-700"
                          title="إعادة إرسال تعليمات الصيام وتأكيد حضور الممرض عبر الواتساب"
                          id={`btn-remind-${apt.id}`}
                        >
                          إعادة إرسال تنبيه
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: BILLING & LOG TEST REQUEST */}
      {activeTab === 'billing' && (
        <div className="bg-white rounded-2xl p-5 sm:p-8 border border-slate-100 shadow-sm text-sm">
          <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
            <Receipt className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-800">فاتورة وتسجيل عينات سحب للتحليل</h3>
          </div>

          {/* Tube Barcode simulation popup */}
          {simulatedTubeBarcode && (
            <div className="bg-slate-900 border border-slate-800 text-white p-5 rounded-2xl mb-6 relative animate-fadeIn">
              <button 
                onClick={() => setSimulatedTubeBarcode(null)}
                className="absolute top-3 left-3 text-xs bg-slate-800 hover:bg-slate-700 p-1 rounded-md text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              
              <div className="flex items-start gap-3">
                <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl">
                  <Barcode className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-450">[جهاز طابعة الباركود] تم إصدار لاصق عينة بنجاح</h4>
                  <p className="text-xs text-slate-300 mt-0.5">يرجى طباعته ولصق الباركود على أنبوب عينة المريض: <strong className="text-white">{simulatedPatientName}</strong></p>
                  
                  {/* Generated simulated barcode design */}
                  <div className="bg-white text-slate-900 p-3 rounded-xl mt-4 max-w-[280px] flex flex-col items-center justify-center border border-slate-200">
                    <span className="font-mono tracking-[0.25em] text-lg font-black block select-none">
                      ||| | | |||| | ||| | {simulatedTubeBarcode}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-500 mt-1">
                      MY LABS - {simulatedTubeBarcode}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {logSuccess ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-6 rounded-2xl text-center max-w-md mx-auto animate-fadeIn">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="font-bold text-lg">تم تسجيل اختبار المريض وإصدار الفاتورة</h4>
              <p className="text-xs text-slate-500 mt-1">
                تم تمرير طلب عينات الفحص لغرفة فحص الأطباء والمحللين. يمكنك الآن تسليم لاصق الباركود المطبوع للفني لسحب عينة الدم.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogTest} className="space-y-6 max-w-xl" id="recep-log-test-form">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">اختر المريض المستهدف للفحص:</label>
                <select
                  value={selectedPatId || ''}
                  onChange={(e) => {
                    setSelectedPatId(e.target.value);
                    setTestCost(
                      e.target.value ? 200 : 200
                    );
                  }}
                  className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-teal-500 outline-none transition-all cursor-pointer"
                  required
                  id="log-patient-select"
                >
                  <option value="">-- اختر مريضاً مسجلاً من القائمة --</option>
                  {patients.map((p, i) => (
                    <option key={i} value={p.id}>{p.name} (هوية: {p.id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">تصنيف الفحص والمعدات المطلوبة:</label>
                  <select
                    value={testTypeSelect}
                    onChange={(e) => {
                      const type = e.target.value as any;
                      setTestTypeSelect(type);
                      // Auto calculate cost
                      let cost = 200;
                      if (type === 'CBC') cost = 180;
                      if (type === 'LIPID') cost = 240;
                      if (type === 'LIVER') cost = 300;
                      if (type === 'GLUCOSE') cost = 120;
                      if (type === 'THYROID') cost = 450;
                      if (type === 'KIDNEY') cost = 200;
                      if (type === 'OTHER') cost = 150;
                      setTestCost(cost);
                      setPaidAmount(cost);
                    }}
                    className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-teal-500 outline-none transition-all cursor-pointer font-bold"
                    id="log-testtype-select"
                  >
                    <option value="CBC">صورة دم كاملة (CBC) - {formatPrice(180)}</option>
                    <option value="LIPID">فحص الدهون الشامل (LIPID) - {formatPrice(240)}</option>
                    <option value="LIVER">فحص وظائف الكبد (LIVER) - {formatPrice(300)}</option>
                    <option value="GLUCOSE">تحليل السكر الشامل (GLUCOSE) - {formatPrice(120)}</option>
                    <option value="THYROID">وظائف الغدة الدرقية (THYROID) - {formatPrice(450)}</option>
                    <option value="KIDNEY">وظائف الكلى (KIDNEY) - {formatPrice(200)}</option>
                    <option value="OTHER">✍️ إضافة تحليل مخبري مخصص / فحص آخر</option>
                  </select>

                  {testTypeSelect === 'OTHER' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 bg-teal-50/50 border border-teal-100 rounded-xl animate-fadeIn">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">اسم الفحص بالعربي *</label>
                        <input
                          type="text"
                          placeholder="مثال: تحليل نسيجي عينة غدة"
                          value={customTestTitleAr}
                          onChange={(e) => setCustomTestTitleAr(e.target.value)}
                          className="w-full text-right bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-teal-500 outline-none font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">اسم الفحص بالإنجليزي (أو الرمز) *</label>
                        <input
                          type="text"
                          placeholder="Example: TSH Thyroid Panel"
                          value={customTestTitleEn}
                          onChange={(e) => setCustomTestTitleEn(e.target.value)}
                          className="w-full text-left bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-teal-500 outline-none font-mono"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-600">تكلفة التحليل المعتمدة ({currency === 'EGP' ? (language === 'ar' ? 'ج.م' : 'EGP') : (language === 'ar' ? 'ر.س' : 'SAR')}):</label>
                    {globalDiscountPercent > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newCost = Math.round(testCost * (1 - globalDiscountPercent / 100));
                          setTestCost(newCost);
                          if (paidAmount > newCost) setPaidAmount(newCost);
                        }}
                        className="text-[10px] bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold transition-colors cursor-pointer"
                      >
                        تطبيق خصم عام ({globalDiscountPercent}%)
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    value={testCost}
                    onChange={(e) => setTestCost(Number(e.target.value))}
                    className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-teal-500 outline-none transition-all font-mono"
                    required
                    id="log-cost-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">المبلغ المدفوع حالياً ({currency === 'EGP' ? (language === 'ar' ? 'ج.م' : 'EGP') : (language === 'ar' ? 'ر.س' : 'SAR')}):</label>
                <div className="relative">
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-teal-500 outline-none transition-all font-mono"
                    max={testCost}
                    required
                    id="log-paid-input"
                  />
                  <CreditCard className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
                  <span>المستحق لاحقاً: {formatPrice(testCost - paidAmount)}</span>
                  <span>{testCost === paidAmount ? 'مدفوع بالكامل ✔' : 'دفع جزئي / آجل'}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold p-3.5 rounded-xl text-sm shadow-md duration-150 cursor-pointer"
                  id="btn-logtest-submit"
                >
                  إصدار الفاتورة وطباعة باركود أنبوبة العينة
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
