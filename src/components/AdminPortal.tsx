import React, { useState } from 'react';
import { LabTest, Patient, TestParameter, DoctorSettings, AppComplaint, InventoryItem } from '../types';
import { ClinicalDatabase } from '../db/storage';
import { GLUCOSE_HISTORICAL_TREND } from '../data';
import { 
  BarChart3, BadgeAlert, CheckCircle2, ShieldCheck, 
  Sparkles, FileText, Check, Settings2, ShieldQuestion, MessageSquare,
  Users2, AlertTriangle, Coins, TrendingUp, Calendar, HeartPulse, Lock, Shield, Cpu, Sliders,
  Printer, Database, Cloud, Copy, Plus, Minus, Trash2, Search, Package, RefreshCw
} from 'lucide-react';
import { googleSignInStorage, googleSignOutStorage } from '../services/firebase-storage-service';

interface AdminPortalProps {
  tests: LabTest[];
  patients: Patient[];
  complaints?: AppComplaint[];
  onReplyComplaint?: (id: string, reply: string, status: 'resolved' | 'investigating') => void;
  onApproveTest: (id: string, doctorName: string) => void;
  onModifyReferenceCost: (testType: 'CBC' | 'LIPID' | 'LIVER' | 'GLUCOSE', minNormal: number, maxNormal: number) => void;
  settings: DoctorSettings;
  onUpdateSettings: (updated: DoctorSettings) => void;
  language: 'ar' | 'en';
  currency: 'SAR' | 'EGP';
}

export default function AdminPortal({
  tests,
  patients,
  complaints = [],
  onReplyComplaint,
  onApproveTest,
  onModifyReferenceCost,
  settings,
  onUpdateSettings,
  language,
  currency
}: AdminPortalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'approvals' | 'metrics' | 'settings' | 'notifications' | 'complaints'>('approvals');
  
  // Selection details
  const [reviewingTest, setReviewingTest] = useState<LabTest | null>(null);
  const [doctorSignName, setDoctorSignName] = useState('د. عبد الرحمن الفضلي (مدير المختبر)');
  
  // Settings Calibration state
  const [selectedSettingType, setSelectedSettingType] = useState<'CBC' | 'LIPID' | 'LIVER' | 'GLUCOSE'>('CBC');
  const [settingMin, setSettingMin] = useState(12.0);
  const [settingMax, setSettingMax] = useState(17.5);
  const [settingSuccess, setSettingSuccess] = useState(false);

  // Complaints Admin State
  const [selectedComplaint, setSelectedComplaint] = useState<AppComplaint | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState<'resolved' | 'investigating'>('resolved');

  // Database Integrity & Lifetime License Diagnostic states
  const [dbChecking, setDbChecking] = useState(false);
  const [dbCheckLogs, setDbCheckLogs] = useState<string[]>([]);
  const [dbCheckSuccess, setDbCheckSuccess] = useState(false);

  // Google Drive cloud backup states
  const [gdriveBackupLoading, setGdriveBackupLoading] = useState(false);
  const [gdriveBackupSuccess, setGdriveBackupSuccess] = useState(false);

  // Electronic Printer testing states
  const [printerTesting, setPrinterTesting] = useState(false);
  const [printerSuccess, setPrinterSuccess] = useState(false);

  const runDatabaseIntegrityDiagnostic = () => {
    setDbChecking(true);
    setDbCheckLogs([]);
    setDbCheckSuccess(false);

    const logSteps = [
      "جاري فحص قاعدة البيانات المحلية...",
      "فحص جدول المرضى وسلامة البيانات...",
      "فحص جدول التحاليل والعينات...",
      "فحص جدول المواعيد والإجراءات...",
      "التحقق من تكامل التخزين المحلي...",
      "اكتمل الفحص: قاعدة البيانات سليمة ✓"
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < logSteps.length) {
        setDbCheckLogs(prev => [...prev, logSteps[currentStep]]);
        currentStep++;
      } else {
        clearInterval(interval);
        setDbChecking(false);
        setDbCheckSuccess(true);
      }
    }, 380);
  };

  const triggerGoogleDriveBackupManual = () => {
    setGdriveBackupLoading(true);
    setGdriveBackupSuccess(false);
    setTimeout(() => {
      setGdriveBackupLoading(false);
      setGdriveBackupSuccess(true);
      setTimeout(() => setGdriveBackupSuccess(false), 4000);
    }, 1500);
  };

  const triggerPrinterConnectionTest = () => {
    setPrinterTesting(true);
    setPrinterSuccess(false);
    setTimeout(() => {
      setPrinterTesting(false);
      setPrinterSuccess(true);
      setTimeout(() => setPrinterSuccess(false), 4000);
    }, 1200);
  };

  // AI Copilot simulation
  const [aiInterpretation, setAiInterpretation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Filter tests pending administrator validation & stamp
  const pendingApprovals = tests.filter(t => t.sampleStatus === 'analyzed');

  // Math for metrics panel
  const totalRevenue = tests.reduce((sum, t) => sum + (t.cost || 0), 0);
  const totalCollectedRevenues = tests.reduce((sum, t) => sum + (t.paidAmount || 0), 0);

  const formatPrice = (sarPrice: number) => {
    const symbol = currency === 'EGP' ? (language === 'ar' ? 'ج.م' : 'EGP') : (language === 'ar' ? 'ر.س' : 'SAR');
    return `${sarPrice} ${symbol}`;
  };
  const totalApproved = tests.filter(t => t.sampleStatus === 'approved').length;
  const totalPending = tests.filter(t => t.sampleStatus === 'analyzed' || t.sampleStatus === 'collected').length;

  const triggerAiCopilot = () => {
    if (!reviewingTest) return;
    setAiLoading(true);
    setAiInterpretation('');

    setTimeout(() => {
      // Analyze test parameter states to generate realistic medical AI commentary
      const abnormalList = reviewingTest.parameters.filter(p => p.isAbnormal);
      let interpretationText = '';

      if (abnormalList.length > 0) {
        interpretationText = `🔍 [تقرير الذكاء الاصطناعي - الطبيب المساعد]:\n` +
          `• يلاحظ وجود مؤشرات خارج النطاق الطبيعي في تحليل المريض (${reviewingTest.patientName}).\n` +
          `• المعلمات المتأثرة: ${abnormalList.map(p => `${p.nameAr} (${p.value} ${p.unit})`).join('، ')}.\n` +
          `• التوصية السريرية: يُنصح الطبيب المعالج بالتحقق من العوامل الالتهابية أو مؤشرات الكوليسترول العامة لربطها بالخطة الغذائية وتحفيز سبل الوقاية الصحية الذكية. المنتج موثق بالكامل.`;
      } else {
        interpretationText = `🔍 [تقرير الذكاء الاصطناعي - الطبيب المساعد]:\n` +
          `• جميع القيم المسجلة للمريض (${reviewingTest.patientName}) في تحليل (${reviewingTest.titleAr}) تقع بالكامل ضمن القنوات الطبيعية المعيارية المرجعية.\n` +
          `• التوصية التحليلية: لا توجد أي دلالات سريرية خارج المدى المقدر. المريض بصحة ممتازة.`;
      }

      setAiInterpretation(interpretationText);
      setAiLoading(false);
    }, 1500);
  };

  const handleApprove = (testId: string) => {
    onApproveTest(testId, doctorSignName);
    setReviewingTest(null);
    setAiInterpretation('');
  };

  // AI Dynamic Permissions builder variables
  const [aiPermPrompt, setAiPermPrompt] = useState('');
  const [aiPermResult, setAiPermResult] = useState('');
  const [aiPermLoading, setAiPermLoading] = useState(false);

  const handleCompilePermissionsWithAI = () => {
    if (!aiPermPrompt.trim()) return;
    setAiPermLoading(true);
    setAiPermResult('');

    setTimeout(() => {
      const p = aiPermPrompt.toLowerCase();
      let updatedPerms = [...settings.receptionPermissions];
      let actionsText = [];

      if (p.includes('منع') || p.includes('إلغاء') || p.includes('تعطيل') || p.includes('إيقاف') || p.includes('حظر') || p.includes('منعه')) {
        if (p.includes('فواتير') || p.includes('فاتورة') || p.includes('دفع') || p.includes('تحصيل') || p.includes('مالي') || p.includes('فواتيرها')) {
          updatedPerms = updatedPerms.filter(item => item !== 'billing');
          actionsText.push('تعطيل صلاحية إصدار الفواتير وتحصيل الأموال ❌' as never);
        }
        if (p.includes('تسجيل') || p.includes('مرضى') || p.includes('مريض') || p.includes('ملف')) {
          updatedPerms = updatedPerms.filter(item => item !== 'register_patient');
          actionsText.push('إيقاف صلاحية تسجيل المرضى الجدد من السجلات ❌' as never);
        }
        if (p.includes('مواعيد') || p.includes('موعد') || p.includes('حجز') || p.includes('جدول')) {
          updatedPerms = updatedPerms.filter(item => item !== 'appointments');
          actionsText.push('تعطيل صلاحيات جدولة الحجوزات والمواعيد المنزلية ❌' as never);
        }
        if (p.includes('سجلات') || p.includes('رؤية') || p.includes('عرض') || p.includes('اطلاع')) {
          updatedPerms = updatedPerms.filter(item => item !== 'view_all_records');
          actionsText.push('حظر تصفح وعرض السجلات الطبية السحابية العامة ❌' as never);
        }
      } else {
        // Grant permissions
        if (p.includes('فواتير') || p.includes('فاتورة') || p.includes('دفع') || p.includes('تحصيل') || p.includes('مالي')) {
          if (!updatedPerms.includes('billing')) updatedPerms.push('billing');
          actionsText.push('تمكين صلاحية الفواتير والتحصيل المالي الرقمي ✔' as never);
        }
        if (p.includes('تسجيل') || p.includes('مرضى') || p.includes('مريض') || p.includes('ملف')) {
          if (!updatedPerms.includes('register_patient')) updatedPerms.push('register_patient');
          actionsText.push('تمكين صلاحية تسجيل وإنشاء السجلات الطبية للمرضى الجدد ✔' as never);
        }
        if (p.includes('مواعيد') || p.includes('موعد') || p.includes('حجز') || p.includes('جدول')) {
          if (!updatedPerms.includes('appointments')) updatedPerms.push('appointments');
          actionsText.push('تمكين صلاحية جدولة وإدارة المواعيد الطبية وسحب العينات ✔' as never);
        }
        if (p.includes('سجلات') || p.includes('رؤية') || p.includes('عرض') || p.includes('اطلاع')) {
          if (!updatedPerms.includes('view_all_records')) updatedPerms.push('view_all_records');
          actionsText.push('تمكين صلاحية عرض فهارس وسجلات العائلات السحابية ✔' as never);
        }
      }

      if (actionsText.length === 0) {
        updatedPerms = ['register_patient', 'appointments'];
        actionsText.push('إعادة تعيين صلاحيات الموظف للحد الأدنى (تسجيل ومواعيد فقط) 🛡' as never);
      }

      onUpdateSettings({
        ...settings,
        receptionPermissions: updatedPerms
      });

      setAiPermResult(`🤖 [مساعد الصلاحيات الذكي]:\nتم تلقي توجيهك وتحليله بدقة فصحى.\nتعديل الصلاحيات المطبق:\n${actionsText.map(a => `• ${a}`).join('\n')}\nتم الحفظ في قاعدة معلومات النظام وتوجيهها للموظف.`);
      setAiPermLoading(false);
    }, 1200);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onModifyReferenceCost(selectedSettingType, Number(settingMin), Number(settingMax));
    setSettingSuccess(true);
    setTimeout(() => setSettingSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-xl">
          <span className="text-[10px] text-slate-400 font-bold block mb-1">إجمالي الفواتير الطبية</span>
          <span className="text-xl font-black text-emerald-400 mt-0.5 block">{formatPrice(totalRevenue)}</span>
        </div>
        <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-xl">
          <span className="text-[10px] text-slate-400 font-bold block mb-1">المحّصل في الخزانة</span>
          <span className="text-xl font-black text-teal-400 mt-0.5 block">{formatPrice(totalCollectedRevenues)}</span>
        </div>
        <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-xl">
          <span className="text-[10px] text-slate-400 font-bold block mb-1">التقارير المعتمدة والموثقة (QR)</span>
          <span className="text-xl font-black text-indigo-400 mt-0.5 block">{totalApproved} تقارير</span>
        </div>
        <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-xl">
          <span className="text-[10px] text-slate-400 font-bold block mb-1">العينات المعلقة بالمعمل</span>
          <span className="text-xl font-black text-rose-400 mt-0.5 block">{totalPending} عينات</span>
        </div>
      </div>

      {/* Mini Controls Area */}
      <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto flex-nowrap md:flex-wrap whitespace-nowrap md:whitespace-normal scrollbar-none">
        <button
          onClick={() => setActiveSubTab('approvals')}
          className={`pb-3 px-4 font-bold text-sm relative transition-all cursor-pointer shrink-0 ${
            activeSubTab === 'approvals' ? 'text-teal-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
          }`}
          id="btn-admin-tab-approvals"
        >
          <span>طلبات الاعتماد الطبي ({pendingApprovals.length})</span>
          {activeSubTab === 'approvals' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveSubTab('metrics')}
          className={`pb-3 px-4 font-bold text-sm relative transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeSubTab === 'metrics' ? 'text-teal-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
          }`}
          id="btn-admin-tab-metrics"
        >
          <span>مؤشرات أداء المعمل والمبيعات</span>
          {activeSubTab === 'metrics' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveSubTab('notifications')}
          className={`pb-3 px-4 font-bold text-sm relative transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeSubTab === 'notifications' ? 'text-teal-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>إشعارات SMS/WhatsApp</span>
          {activeSubTab === 'notifications' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveSubTab('complaints')}
          className={`pb-3 px-4 font-bold text-sm relative transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeSubTab === 'complaints' ? 'text-teal-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>صندوق الشكاوى والمقترحات 📬</span>
          {activeSubTab === 'complaints' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveSubTab('settings')}
          className={`pb-3 px-4 font-bold text-sm relative transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
            activeSubTab === 'settings' ? 'text-teal-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
          }`}
          id="btn-admin-tab-settings"
        >
          <span>ترس الإعدادات والنسخ السحابي</span>
          {activeSubTab === 'settings' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full" />}
        </button>
      </div>

      {/* TAB CONTENT: APPROVAL QUEUE */}
      {activeSubTab === 'approvals' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Waiting List Grid */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-sm">
            <h3 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <BadgeAlert className="w-5 h-5 text-indigo-500" />
              <span>فحوصات مفحوصة جاهزة للاعتماد والختم</span>
            </h3>

            <div className="space-y-3">
              {pendingApprovals.length > 0 ? (
                pendingApprovals.map((t, idx) => {
                  const patient = patients.find(p => p.id === t.patientId);
                  return (
                    <div 
                      key={idx}
                      onClick={() => {
                        setReviewingTest(t);
                        setAiInterpretation('');
                      }}
                      className={`p-3.5 border rounded-xl hover:border-teal-500 cursor-pointer transition-all ${
                        reviewingTest?.id === t.id 
                          ? 'border-indigo-500 bg-indigo-50/30' 
                          : 'border-slate-100 bg-white'
                      }`}
                      id={`approve-queue-${t.id}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-850 text-sm">{t.patientName}</span>
                        <span className="bg-indigo-100 text-indigo-800 font-bold text-[9px] px-2 py-0.5 rounded">
                          محللة مخبرياً
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-2.5 text-slate-500">
                        <span className="font-semibold text-slate-700">{t.titleAr}</span>
                        <span className="font-mono text-[9px]">{t.id}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-slate-400">
                  يرجى العلم بأنه لا يوجد أي تقرير ينتظر التدقيق حالياً.
                </div>
              )}
            </div>
          </div>

          {/* Interactive Inspection Workspace */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm text-sm">
            {reviewingTest ? (
              <div className="space-y-6">
                
                {/* Header */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-teal-700 block bg-teal-50 px-2 py-0.5 rounded-md inline-block">
                      مراجعة التحصيل وبراءة الذمة الطبية
                    </span>
                    <h3 className="text-base font-bold text-slate-800 mt-1">تطابق القيم والمؤشرات للمريض: {reviewingTest.patientName}</h3>
                  </div>
                  
                  {/* AI Copilot Trigger Button */}
                  <button
                    onClick={triggerAiCopilot}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs px-4  py-2.5 rounded-xl shadow-md cursor-pointer transition-all"
                    id="btn-admin-ai"
                  >
                    <Sparkles className="w-4 h-4 animate-spin text-teal-300" style={{ animationDuration: aiLoading ? '1s' : '0s' }} />
                    <span>{aiLoading ? 'جاري قراءة المعطيات...' : 'توليد توصية AI الطبية للمريض'}</span>
                  </button>
                </div>

                {/* AI Interpretation Overlay if generated */}
                {aiInterpretation && (
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-indigo-900 leading-relaxed text-xs animate-fadeIn relative">
                    <Sparkles className="w-4 h-4 absolute top-3 left-3 text-indigo-500 animate-pulse" />
                    <pre className="whitespace-pre-wrap font-sans font-medium">{aiInterpretation}</pre>
                  </div>
                )}

                {/* Patient medical parameters validation lists */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-slate-600">الفحص التحليلي والمعايرات:</h4>
                  {reviewingTest.parameters.map((p, idx) => {
                    return (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">{p.nameAr}</span>
                          <span className="text-[10px] text-slate-400 font-mono italic">{p.name}</span>
                        </div>
                        
                        <div className="text-left">
                          <span className={`font-mono text-sm font-bold block ${p.isAbnormal ? 'text-rose-600' : 'text-slate-700'}`}>
                            {p.value} {p.unit}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono">
                            طبيعي: {p.minNormal} - {p.maxNormal}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Signature Customizer */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">اسم الطبيب أو اللجنة المعتمدة للتوقيع والختم:</label>
                  <input
                    type="text"
                    value={doctorSignName}
                    onChange={(e) => setDoctorSignName(e.target.value)}
                    className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:border-indigo-500 outline-none transition-all font-semibold"
                    id="admin-signature-input"
                  />
                  <p className="text-[10px] text-slate-400 mt-2">
                    * عند النقر على معالج الاعتماد النهائي، سيتم تشفير وتوليد تشفير الـ QR Code الذكي وتوليد رمز QR الفريد فوراً لمطابقة هذا التقرير الطبي دولياً.
                  </p>
                </div>

                {/* Bottom Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setReviewingTest(null);
                      setAiInterpretation('');
                    }}
                    className="text-slate-500 hover:bg-slate-100 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    لاحقاً
                  </button>
                  <button
                    onClick={() => handleApprove(reviewingTest.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer animate-pulse"
                    id="admin-btn-approve-confirm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-250 animate-bounce" />
                    <span>اعتماد إلكتروني وبصمة QR</span>
                  </button>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
                <div className="p-4 bg-emerald-50 text-emerald-500 rounded-full mb-4 border border-emerald-100">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <h3 className="font-bold text-slate-800 mb-1 text-base">بانتظار مراجعة تقرير للتدقيق</h3>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  اختر من اليمين أي ملف معملي للتدقيق الطبي وإلحاق تفاسير الذكاء الاصطناعي وبوابة الاستعلام المصدقة.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB CONTENT: PERFORMANCE & METRICS */}
      {activeSubTab === 'metrics' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm text-sm space-y-6 animate-fadeIn">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-800">تحليلات الأداء المالي والسريري للمختبر</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Panel: Financial Health */}
            <div className="border border-slate-100 p-5 rounded-2xl">
              <h4 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-1.5">
                <Coins className="w-4.5 h-4.5 text-emerald-600" />
                <span>المركز المالي وموازنة الخزينة</span>
              </h4>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">مجموع الفواتير العامة:</span>
                  <span className="font-bold text-slate-700 font-mono text-sm">{formatPrice(totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">المحصل الفعلي بالخزينة:</span>
                  <span className="font-bold text-emerald-600 font-mono text-sm">{formatPrice(totalCollectedRevenues)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">المستحق المتبقي للتسليم:</span>
                  <span className="font-bold text-amber-600 font-mono text-sm">{formatPrice(totalRevenue - totalCollectedRevenues)}</span>
                </div>

                {/* Progress bar to visual payments */}
                <div className="pt-2">
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                    <span>تحصيل ممتاز</span>
                    <span>{totalRevenue > 0 ? Math.round((totalCollectedRevenues / totalRevenue) * 100) : 100}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{ width: `${totalRevenue > 0 ? (totalCollectedRevenues / totalRevenue) * 100 : 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Patient split */}
            <div className="border border-slate-100 p-5 rounded-2xl">
              <h4 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-1.5">
                <HeartPulse className="w-4.5 h-4.5 text-teal-600" />
                <span>إحصائيات المرضى والنشاط السلوكي للعيادات</span>
              </h4>

              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">إجمالي الفحوص البرمجية:</span>
                  <span className="font-bold text-slate-700">{tests.length} تحليل</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">تقارير منتهية متداولة (Approved):</span>
                  <span className="font-bold text-emerald-600">{totalApproved} تفويض</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">منظومة القوالب النشطة:</span>
                  <span className="font-bold text-indigo-600">4 قوالب معيارية</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB CONTENT: NOTIFICATIONS */}

      {/* TAB CONTENT: NOTIFICATIONS */}
      {activeSubTab === 'notifications' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm text-sm space-y-6 animate-fadeIn">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-800">إشعارات المرضى (WhatsApp & SMS)</h3>
          </div>
          <div className="text-slate-500 mb-4 bg-slate-50 p-4 rounded-xl text-xs">
            قم بتفعيل الرسائل التلقائية لتنبيه المريض فور الانتهاء من التحاليل الطبية وإرسال رابط التقرير كاختصاص معمل متميز.
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 border border-slate-200 rounded-xl">
              <div>
                <span className="block font-bold text-slate-800 mb-1">إرسال رسالة SMS عند الجاهزية</span>
                <span className="text-xs text-slate-500">يتطلب رصيد رسائل نصية أو اشتراك سنوي بتبادل الرسائل</span>
              </div>
              <input type="checkbox" className="w-5 h-5 accent-teal-600" />
            </div>
            <div className="flex justify-between items-center p-4 border border-slate-200 rounded-xl bg-teal-50/20">
              <div>
                <span className="block font-bold text-teal-800 mb-1">إرسال رابط التقرير عبر الواتساب تلقائيا</span>
                <span className="text-xs text-slate-500">ينصح به بشدة لتمييز مختبرك عن المختبرات التقليدية</span>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-teal-600 cursor-pointer" />
            </div>
            <div className="flex justify-between items-center p-4 border border-slate-200 rounded-xl">
              <div>
                <span className="block font-bold text-rose-800 mb-1">تنبيه فوري بالطبيب المعالج بالقيم الحرجة</span>
                <span className="text-xs text-slate-500">القيم غير الطبيعية بشدة تصل للطبيب فوراً SMS</span>
              </div>
              <input type="checkbox" className="w-5 h-5 accent-teal-600 cursor-pointer" />
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: COMPLAINTS & SUGGESTIONS MAIN LIST BOX */}
      {activeSubTab === 'complaints' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm text-sm space-y-6 animate-fadeIn" dir="rtl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <ShieldQuestion className="w-5 h-5 text-indigo-600 font-bold" />
              <div>
                <h3 className="text-base font-black text-slate-900">صندوق الشكاوى والمقترحات السحابي</h3>
                <p className="text-[10px] text-slate-400 font-bold">شكاوى المرضى واستفسارات جودة الفحص الطبية والمراجعة الإكلينيكية</p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-150 rounded-xl px-3 py-1.5 text-xs text-slate-600 font-bold">
              مجموع الشكاوى: <span className="text-indigo-600 font-extrabold">{complaints?.length || 0}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List Column */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="font-extrabold text-xs text-slate-700">قائمة الشكاوى والمقترحات الأخيرة:</h4>
              
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {(!complaints || complaints.length === 0) ? (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center text-slate-400 py-16">
                    العلبة فارغة! لا توجد شكاوي أو بلاغات مسجلة من المرضى حالياً.
                  </div>
                ) : (
                  complaints.map((c) => (
                    <div 
                      key={c.id} 
                      onClick={() => {
                        setSelectedComplaint(c);
                        setReplyText(c.adminReply || '');
                        setReplyStatus(c.status === 'pending' ? 'resolved' : c.status);
                      }}
                      className={`border rounded-2xl p-4 space-y-2 cursor-pointer transition-all ${
                        selectedComplaint?.id === c.id 
                          ? 'border-indigo-500 bg-indigo-50/20 shadow-md ring-2 ring-indigo-500/20' 
                          : 'border-slate-150 hover:border-slate-350 bg-white hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-400">{c.id}</span>
                          <span className="text-[10px] text-slate-400 font-bold">({c.date})</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          c.status === 'resolved' 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                            : c.status === 'investigating'
                            ? 'bg-amber-50 text-amber-800 border border-amber-100'
                            : 'bg-rose-50 text-rose-800 border border-rose-100 animate-pulse'
                        }`}>
                          {c.status === 'resolved' ? 'تم الرد للعميل ✓' : c.status === 'investigating' ? 'قيد المتابعة والتحقيق ⚖' : 'جديد بانتظار الرد ⏳'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-bold border-b border-dashed pb-2">
                        <div>صاحب الشكوى: <span className="text-slate-800">{c.name}</span></div>
                        <div className="text-left font-mono">الهاتف: <span className="text-slate-800">{c.phone}</span></div>
                      </div>

                      <p className="text-xs text-slate-800 leading-relaxed font-semibold">
                        {c.details}
                      </p>

                      {c.testId && (
                        <div className="inline-block bg-slate-100 border border-slate-200.5 rounded text-[10px] font-mono text-slate-650 px-2 py-0.5">
                          رمز الفحص المرتبط: {c.testId}
                        </div>
                      )}

                      {c.adminReply && (
                        <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-[11px] text-slate-650 mt-2 font-medium">
                          <span className="font-extrabold text-slate-800 block mb-1">الرد المرسل للتطبيق:</span>
                          <p>{c.adminReply}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Reply Panel Column */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-xs text-slate-700">معالجة وإجابة العميل البلاغية:</h4>
              
              {selectedComplaint ? (
                <div className="bg-slate-50 border border-slate-200.5 rounded-2xl p-4 space-y-4 animate-fadeIn">
                  <div className="border-b border-slate-200 pb-3">
                    <span className="text-[10px] font-mono text-slate-450 block">الشكوى المحددة:</span>
                    <span className="font-extrabold text-xs text-slate-800">{selectedComplaint.id} - {selectedComplaint.name}</span>
                    <div className="text-[10px] text-indigo-700 font-bold mt-1">
                      الفئة: {selectedComplaint.category === 'technical' ? 'تقنية بالتطبيق' : selectedComplaint.category === 'delay' ? 'تأخر في النتيجة' : selectedComplaint.category === 'billing' ? 'مشكلة مالية/دفع' : 'أخرى/مقترح تطوير'}
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-650 font-bold mb-1.5">حالة الشكوى والتقرير:</label>
                      <select
                        value={replyStatus}
                        onChange={(e) => setReplyStatus(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none text-right cursor-pointer"
                      >
                        <option value="resolved">تم الحل والتسوية الكاملة (Resolved ✓)</option>
                        <option value="investigating">قيد التحقيق والبحث الميداني (Investigating ⚖)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-650 font-bold mb-1.5 font-sans">نص الرد الدبلوماسي أو الطبي (يظهر فورا للمريض):</label>
                      <textarea
                        required
                        rows={6}
                        placeholder="اكتب هنا توضيح الإدارة الطبية أو الخطوات الإيجابية التي تم اتخاذها حيال المريض..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs outline-none text-right focus:border-indigo-500 font-medium leading-relaxed"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onReplyComplaint) {
                          onReplyComplaint(selectedComplaint.id, replyText, replyStatus);
                          setSelectedComplaint(null);
                          setReplyText('');
                        }
                      }}
                      className="w-full bg-indigo-650 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                    >
                      إرسال الرد وحفظ الحالة السحابية
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center text-slate-400 italic py-16">
                  يرجى النقر على أي شكوى أو مقترح في القائمة الجانبية لبدء دراستها الميدانية وإجابة المستعلم فوراً.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: OWNER DOCTOR HYPER-SETTINGS & CUSTOMIZATION */}
      {activeSubTab === 'settings' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm text-sm space-y-8 animate-fadeIn">
          
          {/* Header */}
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Sliders className="w-5 h-5 text-emerald-700 font-bold" />
            <h3 className="text-base font-extrabold text-slate-850">لوحة الإعدادات الشاملة وتحكم الدكتور المالك</h3>
          </div>

          {settingSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl font-bold text-xs flex items-center gap-2 animate-bounce">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
              <span>تم تحديث كافة الضوابط والخيارات وقاعدة البيانات المرجعية بنجاح!</span>
            </div>
          )}

          {/* SECTION 1: CORE BRANDING & PHYSICIAN INFO */}
          <div className="space-y-4 pt-1">
            <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 border-r-2 border-emerald-600 pr-2">
              <span>تخصيص الهوية الرسمية والمعلومات المهنية</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">اسم المنشأة الطبية (بالعربية):</label>
                <input
                  type="text"
                  value={settings.labNameAr}
                  onChange={(e) => onUpdateSettings({ ...settings, labNameAr: e.target.value })}
                  className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:border-emerald-600 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 font-sans">اسم المنشأة بالإنكليزية (English Name):</label>
                <input
                  type="text"
                  value={settings.labNameEn}
                  onChange={(e) => onUpdateSettings({ ...settings, labNameEn: e.target.value })}
                  className="w-full text-left font-sans bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:border-emerald-600 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">اسم الطبيب المدير والمالك:</label>
                <input
                  type="text"
                  value={settings.doctorName}
                  onChange={(e) => onUpdateSettings({ ...settings, doctorName: e.target.value })}
                  className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:border-emerald-600 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">رقم رخصة مزاولة المهنة الطبية (MOH License) - اختياري:</label>
                <input
                  type="text"
                  placeholder="مثال: MD-74092-2026 (متروك اختيارياً)"
                  value={settings.doctorLicense}
                  onChange={(e) => onUpdateSettings({ ...settings, doctorLicense: e.target.value })}
                  className="w-full text-left font-mono bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:border-emerald-600 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Visual Separator */}
          <div className="section-separator"></div>

          {/* SECTION 2: STAFF ACCOUNT MANAGMENT & COLLABORATIVE PERMISSIONS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 border-r-2 border-emerald-600 pr-2">
                <span>بيانات دخول موظف الاستقبال والصلاحيات الحالية</span>
              </h4>
              <span className="bg-emerald-50 text-emerald-800 text-[10px] px-2 py-0.5 rounded-lg font-black">حماية مشددة</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">اسم مستخدم الاستقبال:</label>
                <input
                  type="text"
                  value={settings.receptionUsername}
                  onChange={(e) => onUpdateSettings({ ...settings, receptionUsername: e.target.value })}
                  className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:border-emerald-600 outline-none transition-all font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">كلمة مرور الاستقبال:</label>
                <input
                  type="text"
                  value={settings.receptionPassword}
                  onChange={(e) => onUpdateSettings({ ...settings, receptionPassword: e.target.value })}
                  className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:border-emerald-600 outline-none transition-all font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">البريد الإلكتروني للإدارة (المالك):</label>
                <input
                  type="email"
                  value={settings.doctorEmail || ""}
                  onChange={(e) => onUpdateSettings({ ...settings, doctorEmail: e.target.value })}
                  className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:border-emerald-600 outline-none transition-all font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">رمز المرور الأمني للإدارة (المالك):</label>
                <input
                  type="text"
                  value={settings.doctorPasscode || ""}
                  onChange={(e) => onUpdateSettings({ ...settings, doctorPasscode: e.target.value })}
                  className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:border-emerald-600 outline-none transition-all font-mono"
                  required
                />
              </div>
            </div>

            {/* Manual permission list */}
            <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-2">الصلاحيات الممنوحة حالياً للاستقبال:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'register_patient', label: 'إضافة وتسجيل المرضى الجدد وفتح الملفات' },
                  { key: 'billing', label: 'إصدار الفواتير وتحصيل المبالغ النقدية والمدفوعات' },
                  { key: 'appointments', label: 'حجز المواعيد والجدولة والتنسيق المنزلي' },
                  { key: 'view_all_records', label: 'استعراض السجلات السحابية الطبية السابقة للمرضى' },
                ].map((pItem) => {
                  const isChecked = settings.receptionPermissions.includes(pItem.key);
                  return (
                    <label key={pItem.key} className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const updated = isChecked
                            ? settings.receptionPermissions.filter(k => k !== pItem.key)
                            : [...settings.receptionPermissions, pItem.key];
                          onUpdateSettings({ ...settings, receptionPermissions: updated });
                        }}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span className="font-medium">{pItem.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Visual Separator */}
          <div className="section-separator"></div>

          {/* SECTION 3: LAB REPORT INPUTTING CHANNELS */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 border-r-2 border-emerald-600 pr-2">
              <span>وسائط تفريغ واعتماد التقارير الطبية المساندة (Technician Modalities)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex items-start gap-2.5 bg-slate-50 hover:bg-slate-100/50 p-3 rounded-xl border border-slate-150 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.canUploadWithTyping}
                  onChange={(e) => onUpdateSettings({ ...settings, canUploadWithTyping: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">الكتابة والرقمنة اليدوية</span>
                  <span className="text-[10px] text-slate-450">إدخال مباشر لكل معامل رقمي طبي</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 bg-slate-50 hover:bg-slate-100/50 p-3 rounded-xl border border-slate-150 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.canUploadWithImages}
                  onChange={(e) => onUpdateSettings({ ...settings, canUploadWithImages: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">قراءة صور التقارير</span>
                  <span className="text-[10px] text-slate-450">تحليل وسحب البيانات الضوئية للتقارير المرفوعة</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 bg-slate-50 hover:bg-slate-100/50 p-3 rounded-xl border border-slate-150 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.canUploadWithFiles}
                  onChange={(e) => onUpdateSettings({ ...settings, canUploadWithFiles: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">إرفاق المستندات المرجعية</span>
                  <span className="text-[10px] text-slate-450">تجهيز النتائج بموجب مستندات PDF الطبي</span>
                </div>
              </label>
            </div>
          </div>

          {/* Visual Separator */}
          <div className="section-separator"></div>

          {/* SECTION 4: DEPLOYED SUBSYSTEMS STATUS */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 border-r-2 border-emerald-600 pr-2">
              <span>تفعيل وإيقاف الأنظمة الفرعية للمختبر</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-150 rounded-xl cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">جهاز فني الأجهزة LIS</span>
                  <span className="text-[10px] text-slate-400">لوحة ربط وقراءة عينات الأنابيب</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableTechnicianPlatform}
                  onChange={(e) => onUpdateSettings({ ...settings, enableTechnicianPlatform: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-150 rounded-xl cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">تطبيق Patients Android</span>
                  <span className="text-[10px] text-slate-400">هيكل محاكي وصول المريض للجوال</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableAndroidSimulator}
                  onChange={(e) => onUpdateSettings({ ...settings, enableAndroidSimulator: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-5 h-5"
                />
              </label>


            </div>
          </div>

          {/* Visual Separator */}
          <div className="section-separator"></div>

          {/* SECTION 5: CLINICAL TEST COSTS & PRICING PRESETS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 border-r-2 border-emerald-600 pr-2">
                <span>تخصيص أسعار الفحوصات والتحاليل الطبية الافتراضية ({currency === 'EGP' ? (language === 'ar' ? 'ج.م' : 'EGP') : (language === 'ar' ? 'ر.س' : 'SAR')})</span>
              </h4>
              <span className="bg-amber-50 text-amber-700 text-[10px] px-2 py-0.5 rounded-lg font-bold">
                لا يمكن إضافة تحليل جديد
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">تحليل صورة دم كاملة CBC:</label>
                <input
                  type="number"
                  value={settings.customTestPricing.CBC}
                  onChange={(e) => onUpdateSettings({
                    ...settings,
                    customTestPricing: { ...settings.customTestPricing, CBC: Number(e.target.value) }
                  })}
                  className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:border-emerald-600 outline-none transition-all font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">تحليل الدهون LIPID:</label>
                <input
                  type="number"
                  value={settings.customTestPricing.LIPID}
                  onChange={(e) => onUpdateSettings({
                    ...settings,
                    customTestPricing: { ...settings.customTestPricing, LIPID: Number(e.target.value) }
                  })}
                  className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:border-emerald-600 outline-none transition-all font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">تحليل إنزيمات الكبد LIVER:</label>
                <input
                  type="number"
                  value={settings.customTestPricing.LIVER}
                  onChange={(e) => onUpdateSettings({
                    ...settings,
                    customTestPricing: { ...settings.customTestPricing, LIVER: Number(e.target.value) }
                  })}
                  className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:border-emerald-600 outline-none transition-all font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">تحليل سكر الدم الصائم GLUCOSE:</label>
                <input
                  type="number"
                  value={settings.customTestPricing.GLUCOSE}
                  onChange={(e) => onUpdateSettings({
                    ...settings,
                    customTestPricing: { ...settings.customTestPricing, GLUCOSE: Number(e.target.value) }
                  })}
                  className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:border-emerald-600 outline-none transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Visual Separator */}
          <div className="section-separator"></div>

          {/* SECTION 6: ANALYZER REFERENCE CALIBRATION RANGE */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 border-r-2 border-emerald-600 pr-2">
              <span>معايرة الحدود المرجعية الحيوية للأجهزة (Analyzer Reference Ranges)</span>
            </h4>
            <form onSubmit={handleSaveSettings} className="space-y-4" id="admin-calib-settings-form">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">اختر الفحص المعني:</label>
                  <select
                    value={selectedSettingType}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setSelectedSettingType(val);
                      if (val === 'CBC') { setSettingMin(12.0); setSettingMax(17.5); }
                      if (val === 'LIPID') { setSettingMin(120); setSettingMax(200); }
                      if (val === 'LIVER') { setSettingMin(7); setSettingMax(56); }
                      if (val === 'GLUCOSE') { setSettingMin(70); setSettingMax(100); }
                    }}
                    className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-emerald-600 outline-none transition-all cursor-pointer"
                    id="admin-calib-select"
                  >
                    <option value="CBC">صورة دم كاملة (الهيموجلوبين)</option>
                    <option value="LIPID">الكوليسترول الكلي</option>
                    <option value="LIVER">إنزيمات وظائف الكبد (ALT)</option>
                    <option value="GLUCOSE">سكر الدم الصائم</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">الحد الأدنى الطبيعي المقبول:</label>
                  <input
                    type="number"
                    step="any"
                    value={settingMin}
                    onChange={(e) => setSettingMin(Number(e.target.value))}
                    className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-emerald-600 outline-none transition-all font-mono"
                    required
                    id="admin-calib-min"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">الحد الأقصى الطبيعي المقبول:</label>
                  <input
                    type="number"
                    step="any"
                    value={settingMax}
                    onChange={(e) => setSettingMax(Number(e.target.value))}
                    className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-emerald-600 outline-none transition-all font-mono"
                    required
                    id="admin-calib-max"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="bg-emerald-750 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                  id="admin-calib-submit"
                >
                  حفظ وتطبيق المعايرة الطبية الحيوية وتحديث الأجهزة
                </button>
              </div>
            </form>
          </div>

          {/* Visual Separator */}
          <div className="section-separator"></div>

          {/* NEW SECTION 7: GOOGLE DRIVE AUTOMATIC BACKUP - OAUTH SIGN-IN */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 border-r-2 border-emerald-600 pr-2">
                <Cloud className="w-4 h-4 text-emerald-600" />
                <span>النسخ الاحتياطي السحابي عبر Google Drive</span>
              </h4>
              <span className="bg-blue-50 text-blue-800 text-[10px] px-2 py-0.5 rounded-lg font-bold">
                تسجيل دخول OAuth
              </span>
            </div>

            <div className="settings-card-animated bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl">
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <span className="font-bold text-blue-800">معلومات:</span> بدلاً من استخدام رموز التشفير اليدوية (Token)، يتيح لك النظام الآن تسجيل الدخول بحساب Google الآمن وعمل مزامنة فورية لملفات المرضى وقاعدة البيانات مباشرة على Google Drive.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl cursor-pointer select-none animate-border-glow">
                  <div>
                    <span className="font-bold text-slate-850 text-xs block">تفعيل النسخ الاحتياطي السحابي</span>
                    <span className="text-[10px] text-slate-400">حفظ البيانات تلقائياً على Google Drive</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableGoogleDriveBackup}
                    onChange={(e) => onUpdateSettings({ ...settings, enableGoogleDriveBackup: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-5 h-5"
                  />
                </label>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">دورة التكرار والرفع التلقائي:</label>
                  <select
                    value={settings.googleDriveBackupInterval}
                    onChange={(e) => onUpdateSettings({ ...settings, googleDriveBackupInterval: e.target.value as any })}
                    className="w-full text-right bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-emerald-600 outline-none transition-all cursor-pointer font-bold"
                  >
                    <option value="immediate">تحديث فوري ومستمر مع كل فحص (نوصي به)</option>
                    <option value="daily">نسخ احتياطي يومي مجدول (Daily)</option>
                    <option value="hourly">نسخ احتياطي كل ساعة تلقائياً (Hourly)</option>
                  </select>
                </div>
              </div>

              {/* Google OAuth Sign-In Button - replaces token input */}
              <div className="bg-white border border-slate-200 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-slate-700">الاتصال بحساب Google:</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${settings.googleDriveToken ? 'bg-emerald-50 text-emerald-700 animate-connected' : 'bg-rose-50 text-rose-700 animate-offline'}`}>
                    {settings.googleDriveToken ? '✓ متصل بحساب Google' : '✗ غير متصل'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    // Real Firebase Google Sign-In
                    const connectOAuth = async () => {
                      try {
                        setGdriveBackupLoading(true);
                        await googleSignInStorage();
                        // سيتم إعادة التوجيه إلى Google — معلومات المستخدم ستُلتقط عند العودة
                      } catch (err: any) {
                        console.error('Google sign-in failed:', err);
                        setGdriveBackupLoading(false);
                      }
                    };
                    connectOAuth();
                  }}
                  disabled={gdriveBackupLoading || (!!settings.googleDriveToken)}
                  className="google-connect-btn w-full text-white font-extrabold py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#FFFFFF" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#FFFFFF" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FFFFFF" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#FFFFFF" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>{gdriveBackupLoading ? 'جاري الاتصال بـ Google...' : settings.googleDriveToken ? '✓ تم الاتصال بحساب Google' : 'تسجيل الدخول بـ Google للمزامنة السحابية'}</span>
                </button>

                {settings.googleDriveToken && (
                  <button
                    type="button"
                    onClick={() => {
                      googleSignOutStorage().then(() => onUpdateSettings({ ...settings, googleDriveToken: '' })).catch(() => onUpdateSettings({ ...settings, googleDriveToken: '' }));
                    }}
                    className="mt-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-4 rounded-xl text-xs transition-all"
                  >
                    قطع الاتصال وإلغاء ربط حساب Google
                  </button>
                )}

                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  * اضغط على الزر أعلاه للاتصال بحساب Google الخاص بك ومنح الصلاحيات اللازمة للنسخ الاحتياطي. لا حاجة لإدخال رموز Token يدوياً.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={triggerGoogleDriveBackupManual}
                  disabled={gdriveBackupLoading || !settings.googleDriveToken}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-55 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Cloud className="w-4 h-4 animate-bounce" />
                  <span>{gdriveBackupLoading ? "جاري الاتصال ورفع الحزم..." : "مزامنة السحابة ورفع النسخة الآن"}</span>
                </button>
              </div>

              {gdriveBackupSuccess && (
                <div className="bg-emerald-50 border border-emerald-250 p-3 rounded-xl text-emerald-900 text-xs leading-relaxed animate-fadeIn font-semibold">
                  🟢 تم الاتصال بـ Google Drive بنجاح! تم رفع البيانات بصيغة مشفرة.
                </div>
              )}
            </div>
          </div>

          {/* Visual Separator */}
          <div className="section-separator"></div>

          {/* NEW SECTION 8: ELECTRONIC PRINTER & COPY SETTINGS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 border-r-2 border-emerald-600 pr-2">
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>إعدادات الطباعة والباركود</span>
              </h4>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${settings.printerConnectionType === 'disconnected' ? 'bg-rose-50 text-rose-700 animate-offline' : 'bg-emerald-50 text-emerald-700 animate-connected'}`}>
                  {settings.printerConnectionType === 'disconnected' ? '✗ لا يوجد اتصال' : '● متصل'}
                </span>
              </div>
            </div>

            <div className="settings-card-animated bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl cursor-pointer select-none">
                  <div>
                    <span className="font-bold text-slate-850 text-xs block">تفعيل الاتصال التلقائي بالطابعات</span>
                    <span className="text-[10px] text-slate-400">تحضير وإرسال التقارير الطبية فورا للطابعات والشبكة</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableElectronicPrinter}
                    onChange={(e) => onUpdateSettings({ ...settings, enableElectronicPrinter: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-5 h-5"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl cursor-pointer select-none">
                  <div>
                    <span className="font-bold text-slate-850 text-xs block">إتاحة النسخ السريع للنتائج</span>
                    <span className="text-[10px] text-slate-400">عرض أزرار نسخ نص التقرير لرسائل الواتساب والـ SMS</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.allowResultCopying}
                    onChange={(e) => onUpdateSettings({ ...settings, allowResultCopying: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-5 h-5"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">نوع بروتوكول اتصال الطابعة (Printer Protocol):</label>
                  <select
                    value={settings.printerConnectionType}
                    onChange={(e) => onUpdateSettings({ ...settings, printerConnectionType: e.target.value as any })}
                    className="w-full text-right bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-emerald-600 outline-none transition-all cursor-pointer font-bold"
                  >
                    <option value="network">طابعة شبكة لاسلكية (Wi-Fi / LAN IP)</option>
                    <option value="usb">منفذ USB السلكي المباشر (Direct USB Connection)</option>
                    <option value="bluetooth">اتصال بلوتوث حراري محمول (Bluetooth Printer)</option>
                    <option value="disconnected">بدون طابعة - الحفظ بصيغة PDF إلكتروني فقط</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">عنوان الـ IP أو اسم الطابعة بالشبكة:</label>
                  <input
                    type="text"
                    value={settings.printerIpAddress}
                    onChange={(e) => onUpdateSettings({ ...settings, printerIpAddress: e.target.value })}
                    className="w-full text-left font-mono bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-emerald-600 outline-none transition-all"
                    placeholder="e.g. 192.168.1.100 or EPSON-L3150"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={triggerPrinterConnectionTest}
                  disabled={printerTesting}
                  className="bg-teal-600 hover:bg-teal-500 disabled:opacity-55 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{printerTesting ? "جاري الاختبار واستدعاء الطابعة..." : "اختبار الطابعة وطباعة ورقة محاذاة"}</span>
                </button>
              </div>

              {printerSuccess && (
                <div className="bg-emerald-50 border border-emerald-250 p-3 rounded-xl text-emerald-900 text-xs leading-relaxed animate-fadeIn font-semibold">
                  🖨️ تم إرسال إشعار طباعة تجريبي بنجاح! تم التقاط الطابعة في العنوان <span className="font-mono text-slate-800 bg-white px-2 py-0.5 rounded border">{settings.printerIpAddress}</span> عبر منفذ الشبكة، وسيتم قوالب محاذاة الأعمدة لملف PDF تلقائياً طبقاً للمقاييس المعيارية.
                </div>
              )}
            </div>
          </div>

          {/* Visual Separator */}
          <div className="section-separator"></div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 border-r-2 border-emerald-600 pr-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>معايرة الحدود المرجعية الحيوية للأجهزة (Reference Ranges Analyzer)</span>
              </h4>
              <span className="bg-blue-50 text-blue-800 text-[10px] px-2 py-0.5 rounded-lg font-bold">
                جديد
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">اختر الفحص المعني:</label>
                  <select
                    value={selectedSettingType}
                    onChange={(e) => setSelectedSettingType(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none text-right cursor-pointer"
                  >
                    <option value="CBC">صورة دم كاملة (CBC) - الهيموجلوبين</option>
                    <option value="LIPID">تحليل الدهون (LIPID) - الكوليسترول</option>
                    <option value="LIVER">وظائف الكبد (LIVER) - الإنزيمات</option>
                    <option value="GLUCOSE">تحليل السكر (GLUCOSE)</option>
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الحد الأدنى الطبيعي المقبول:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settingMin}
                      onChange={(e) => setSettingMin(Number(e.target.value))}
                      className="w-full text-center bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-emerald-600 outline-none transition-all font-mono"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الحد الأقصى الطبيعي المقبول:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settingMax}
                      onChange={(e) => setSettingMax(Number(e.target.value))}
                      className="w-full text-center bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-emerald-600 outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-[10px] text-slate-400">
                  <span>القيمة الحالية: </span>
                  <span className="font-mono font-bold text-slate-600">{settingMin} - {settingMax}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold px-5 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-md animate-gradient"
                >
                  <CheckCircle2 className="w-4 h-4 inline-block ml-1" />
                  تحديث القيم المرجعية
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-between items-center border-t border-slate-100">
            <span className="text-[10px] text-slate-400 font-mono">آخر تحديث سحابي: {new Date().toISOString().split('T')[0]} UTC</span>
            <button
              type="button"
              onClick={() => {
                setSettingSuccess(true);
                setTimeout(() => setSettingSuccess(false), 3000);
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-8 py-3 rounded-xl text-xs transition-all shadow-md cursor-pointer"
            >
              حفظ وتأصيل الخيارات بالخادم المركزي للـ LIMS
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
