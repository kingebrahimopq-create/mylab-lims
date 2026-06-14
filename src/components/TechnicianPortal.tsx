import React, { useState } from 'react';
import { LabTest, TestParameter, DoctorSettings } from '../types';
import { 
  Dna, HelpCircle, CheckCircle, Save, 
  Beaker, FileInput, Fingerprint, ShieldAlert,
  ChevronLeft, AlertCircle, FileText, Image, PenTool, Sparkles, UploadCloud, RefreshCw
} from 'lucide-react';

interface TechnicianPortalProps {
  tests: LabTest[];
  onUploadResults: (id: string, parameters: TestParameter[]) => void;
  settings: DoctorSettings;
}

export default function TechnicianPortal({ tests, onUploadResults, settings }: TechnicianPortalProps) {
  // Filter only collected tests waiting for results input
  const pendingTests = tests.filter(t => t.sampleStatus === 'collected' || t.sampleStatus === 'pending_collection');
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);

  // Parameter inputs state
  const [paramValues, setParamValues] = useState<{ [key: string]: string }>({});
  const [successMsg, setSuccessMsg] = useState('');
  
  // Modality Selection: 'typing' | 'image' | 'file'
  const [activeModality, setActiveModality] = useState<'typing' | 'image' | 'file'>('typing');
  
  // Image & File upload simulator states
  const [targetImageFile, setTargetImageFile] = useState<File | null>(null);
  const [targetDocFile, setTargetDocFile] = useState<File | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [docUploadedName, setDocUploadedName] = useState('');

  const handleSelectTest = (test: LabTest) => {
    setSelectedTest(test);
    // Initialize temporary inputs
    const initialValues: { [key: string]: string } = {};
    test.parameters.forEach(p => {
      initialValues[p.name] = p.value !== undefined ? p.value.toString() : '';
    });
    setParamValues(initialValues);
    setSuccessMsg('');
    setTargetImageFile(null);
    setTargetDocFile(null);
    setScanProgress(0);
    setIsScanning(false);
    setDocUploadedName('');

    // Default to first enabled method
    if (settings.canUploadWithTyping) {
      setActiveModality('typing');
    } else if (settings.canUploadWithImages) {
      setActiveModality('image');
    } else if (settings.canUploadWithFiles) {
      setActiveModality('file');
    }
  };

  const handleInputChange = (paramName: string, val: string) => {
    setParamValues(prev => ({
      ...prev,
      [paramName]: val
    }));
  };

  const isValueAbnormal = (valNum: number, min: number, max: number) => {
    return valNum < min || valNum > max;
  };

  const handleSimulateScanOCR = () => {
    setIsScanning(true);
    setScanProgress(10);
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          // Populate keys with correct / slightly deviation values to simulate optical reading
          if (selectedTest) {
            const mapped: { [key: string]: string } = {};
            selectedTest.parameters.forEach(p => {
              // Generate realistic value within or close to range
              const randomFactor = Math.random() > 0.8;
              let finalVal = p.minNormal + Math.random() * (p.maxNormal - p.minNormal);
              if (randomFactor) {
                finalVal = p.maxNormal + 2;
              }
              mapped[p.name] = finalVal.toFixed(1);
            });
            setParamValues(mapped);
          }
          return 100;
        }
        return prev + 30;
      });
    }, 450);
  };

  const handleSimulateDocUpload = () => {
    setIsScanning(true);
    setScanProgress(15);
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          if (selectedTest) {
            const mapped: { [key: string]: string } = {};
            selectedTest.parameters.forEach(p => {
              const val = (p.minNormal + (p.maxNormal - p.minNormal) * 0.45).toFixed(1);
              mapped[p.name] = val;
            });
            setParamValues(mapped);
          }
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  const handleSubmitResults = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;

    // Validate that all parameters have values
    const updatedParameters: TestParameter[] = selectedTest.parameters.map(p => {
      const typedVal = paramValues[p.name];
      const valNum = typedVal !== '' ? Number(typedVal) : undefined;
      return {
        ...p,
        value: valNum,
        isAbnormal: valNum !== undefined ? isValueAbnormal(valNum, p.minNormal, p.maxNormal) : false
      };
    });

    onUploadResults(selectedTest.id, updatedParameters);
    
    setSuccessMsg('تم تفريغ البيانات وإرسال نتائج التحاليل السحابة بنجاح!');
    setTimeout(() => {
      setSelectedTest(null);
      setSuccessMsg('');
    }, 2500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Pending blood tubes sidebar queue */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-sm">
        <h3 className="font-extrabold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Beaker className="w-5 h-5 text-emerald-700" />
          <span>أنابيب العينات الطبية المجدولة ({pendingTests.length})</span>
        </h3>

        <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 text-right">
          {pendingTests.length > 0 ? (
            pendingTests.map((t, idx) => (
              <div 
                key={idx}
                onClick={() => handleSelectTest(t)}
                className={`p-3 border rounded-xl hover:border-emerald-600 cursor-pointer transition-all ${
                  selectedTest?.id === t.id 
                    ? 'bg-emerald-50/55 border-emerald-600 ring-1 ring-emerald-600/20' 
                    : 'border-slate-100 bg-white'
                }`}
                id={`tech-queue-item-${t.id}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-850">{t.patientName}</span>
                  <span className="font-mono text-[9px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                    {t.barcode}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs mt-2 text-slate-500">
                  <span className="font-bold text-emerald-800 text-[11.5px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {t.titleAr}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{t.id}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-400 font-medium">
              لا توجد عينات مخبرية بانتظار الإدخال حالياً.
            </div>
          )}
        </div>
      </div>

      {/* Main analyzer entry sheet */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm">
        {selectedTest ? (
          <div>
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  واجهة إدخال فني المختبر المركزي LIS
                </span>
                <h3 className="text-base font-extrabold text-slate-850 mt-1">تسجيل وقيد النتائج: {selectedTest.patientName}</h3>
                <p className="font-mono text-xs text-slate-400 mt-0.5">رمز الأنبوب: {selectedTest.barcode} • الفحص: {selectedTest.titleAr}</p>
              </div>

              <div className="text-left font-mono text-xs text-slate-400">
                <span>تاريخ: {selectedTest.requestDate}</span>
              </div>
            </div>

            {successMsg ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-6 rounded-2xl text-center">
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <h4 className="font-bold text-lg">{successMsg}</h4>
                <p className="text-xs text-slate-400 mt-1">يُنقل الملف حالياً للمدير الطبي للاعتماد.</p>
              </div>
            ) : (
              <div>
                {/* Modality Tabs Selector based on Dr settings */}
                <div className="flex bg-slate-100 p-1 rounded-xl mb-6 max-w-md">
                  {settings.canUploadWithTyping && (
                    <button
                      type="button"
                      onClick={() => setActiveModality('typing')}
                      className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeModality === 'typing' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>قيد يدوي</span>
                    </button>
                  )}
                  {settings.canUploadWithImages && (
                    <button
                      type="button"
                      onClick={() => setActiveModality('image')}
                      className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeModality === 'image' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Image className="w-3.5 h-3.5" />
                      <span>قراءة الصورة</span>
                    </button>
                  )}
                  {settings.canUploadWithFiles && (
                    <button
                      type="button"
                      onClick={() => setActiveModality('file')}
                      className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeModality === 'file' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>ملفات PDF</span>
                    </button>
                  )}
                </div>

                {/* MODALITY 1: IMAGE PROCESSING SIMULATION */}
                {activeModality === 'image' && settings.canUploadWithImages && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6 text-center space-y-4 animate-fadeIn">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                      <Image className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-820 text-xs">سحب البيانات ضوئياً عبر صورة التقرير الطبي المستخرج</h4>
                      <p className="text-[11px] text-slate-400 mt-1">ارفع صورة العقد السريري المستخرج للاستخلاص التلقائي عبر خوارزميات OCR المدمجة</p>
                    </div>

                    <div className="flex justify-center gap-4">
                      <label className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 transition-all">
                        <UploadCloud className="w-4 h-4" />
                        <span>{targetImageFile ? `تغيير الصورة: ${targetImageFile.name}` : 'اختر صورة الفحص الطبية'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setTargetImageFile(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      {targetImageFile && (
                        <button
                          type="button"
                          onClick={handleSimulateScanOCR}
                          disabled={isScanning}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all select-none cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-emerald-250 animate-pulse" />
                          <span>بدء المسح والاستخلاص الضوئي بالذكاء</span>
                        </button>
                      )}
                    </div>

                    {isScanning && (
                      <div className="max-w-xs mx-auto space-y-2">
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold font-mono">
                          <span>تحليل طيفي بؤري...</span>
                          <span>{scanProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* MODALITY 2: FILE PDF ATTACHMENT SIMULATION */}
                {activeModality === 'file' && settings.canUploadWithFiles && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6 text-center space-y-4 animate-fadeIn">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-820 text-xs">قراءة مستند التقرير PDF الصادر من الأجهزة السريرية</h4>
                      <p className="text-[11px] text-slate-400 mt-1">الملفات المدعومة: PDF, XLS, CSV الطبية</p>
                    </div>

                    <div className="flex justify-center gap-4">
                      <label className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 transition-all">
                        <UploadCloud className="w-4 h-4" />
                        <span>{targetDocFile ? `تغيير الملف: ${targetDocFile.name}` : 'تحميل مستند النتائج PDF'}</span>
                        <input
                          type="file"
                          accept=".pdf,.xls,.xlsx,.csv"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setTargetDocFile(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      {targetDocFile && (
                        <button
                          type="button"
                          onClick={handleSimulateDocUpload}
                          disabled={isScanning}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all select-none cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>تحليل وهيكلة جدول البيانات</span>
                        </button>
                      )}
                    </div>

                    {isScanning && (
                      <div className="max-w-xs mx-auto space-y-2">
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold font-mono">
                          <span>تحليل مستندات الأجهزة...</span>
                          <span>{scanProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* THE SHARED VALUES TABLE AND ENTRY SYSTEM */}
                <form onSubmit={handleSubmitResults} className="space-y-6" id="tech-analyzer-entry-form">
                  <div className="space-y-4">
                    {selectedTest.parameters.map((param, index) => {
                      const typedVal = paramValues[param.name] || '';
                      const isNum = typedVal !== '';
                      const valNum = Number(typedVal);
                      const abnormal = isNum && !isNaN(valNum) && isValueAbnormal(valNum, param.minNormal, param.maxNormal);

                      return (
                        <div 
                          key={index} 
                          className={`p-4 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                            abnormal ? 'bg-rose-50/45 border-rose-200 shadow-sm' : 'bg-white border-slate-150 hover:border-slate-200'
                          }`}
                        >
                          <div>
                            <span className="font-extrabold text-slate-800 block text-sm">{param.nameAr}</span>
                            <span className="text-xs text-slate-400 font-mono block mt-0.5">{param.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono block mt-1">
                              المدى المعتمد المرجعي: {param.minNormal} - {param.maxNormal} {param.unit}
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="relative w-36">
                              <input
                                type="number"
                                step="any"
                                value={typedVal}
                                onChange={(e) => handleInputChange(param.name, e.target.value)}
                                placeholder="أدخل القيمة"
                                className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-emerald-600 outline-none transition-all font-mono font-bold"
                                required
                                id={`input-${selectedTest.id}-${param.name}`}
                              />
                              <span className="absolute left-2.5 top-2.5 text-[9px] font-mono font-bold text-slate-400">
                                {param.unit}
                              </span>
                            </div>

                            <div className="w-24 text-left">
                              {abnormal ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-rose-700 bg-rose-100 px-2 py-1 rounded-full border border-rose-200">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>خارج المعدل</span>
                                </span>
                              ) : isNum ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                  <span>ضمن الطبيعي</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">انتظار الموثق</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedTest(null)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-5 py-3 rounded-xl text-xs transition-all cursor-pointer"
                    >
                      إلغاء التعديل
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-750 hover:bg-emerald-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                      id="btn-tech-submit-to-doc"
                    >
                      <Save className="w-4 h-4" />
                      <span>حفظ وتمرير لاعتماد الطبيب المدير</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full mb-4 border border-emerald-100">
              <FileInput className="w-10 h-10 animate-pulse text-emerald-600" />
            </div>
            <h3 className="font-extrabold text-slate-800 mb-1 text-base animate-pulse">بانتظار تحديد عينة من القائمة الجانبية</h3>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              قم باختيار عينة أحد المرضى المسجلة حالياً لبدء إدخال وتمرير قيم التحاليل الطبية.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
