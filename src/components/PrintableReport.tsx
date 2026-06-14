import React, { useState, useEffect } from 'react';
import { LabTest, Patient, DoctorSettings } from '../types';
import { ShieldCheck, Calendar, User, FileText, Phone, Award, Printer, ArrowLeft, Copy, MessageSquare } from 'lucide-react';

interface PrintableReportProps {
  test: LabTest;
  patient: Patient;
  onBack: () => void;
  onVerifySelf: () => void; // Route directly to QR verification view
  settings?: DoctorSettings;
}

export default function PrintableReport({ test, patient, onBack, onVerifySelf, settings }: PrintableReportProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketPrinted, setTicketPrinted] = useState(false);
  const [showThermalPreview, setShowThermalPreview] = useState(false);

  useEffect(() => {
    // Generate a real scannable verification link encoding this very app's URL
    const verifyUrl = `${window.location.origin}${window.location.pathname}?verify=${test.qrToken}`;
    const getQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=0f766e&data=${encodeURIComponent(verifyUrl)}`;
    setQrCodeDataUrl(getQrUrl);
  }, [test.qrToken]);

  const copyReportToText = () => {
    const paramsText = test.parameters.map(p => 
      `• ${p.nameAr} (${p.name}): ${p.value} ${p.unit} [النطاق: ${p.minNormal} - ${p.maxNormal}] - ${p.isAbnormal ? '⚠️ غير طبيعي' : 'طبيعي'}`
    ).join('\n');
    
    const textToCopy = `
=== تقرير مخبري معتمد وموثق ===
المعمل: ${settings?.labNameAr || "مختبرات تكنو-كلينيك الطبية"}
الرقم المرجعي للفحص: ${test.id}
تاريخ الفحص: ${test.requestDate}
اسم المريض: ${patient.name} (${patient.nameEn})
رقم الهوية: ${patient.id}
الرقم التعريفي للأنابيب: ${test.barcode}

التحاليل والنتائج:
${paramsText}

المصادقة الرقمية والـ QR للتحقق التلقائي:
${window.location.origin}${window.location.pathname}?verify=${test.qrToken}
==================================
`;
    navigator.clipboard.writeText(textToCopy.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const simulateThermalPrinterAction = () => {
    setTicketLoading(true);
    setTicketPrinted(false);
    setShowThermalPreview(true);

    try {
      // Create hidden iframe for the thermal receipt
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!iframeDoc) throw new Error("Could not access iframe window");

      // Generate HTML parameters rows
      const paramsHtml = test.parameters.map(p => `
        <tr style="border-bottom: 1px dashed #ccc;">
          <th style="text-align: right; padding: 4px 0; font-size: 11px;">${p.nameAr || p.name}</th>
          <td style="text-align: center; padding: 4px 0; font-size: 11px; font-weight: bold; ${p.isAbnormal ? 'color: red;' : ''}">${p.value} ${p.unit}</td>
          <td style="text-align: left; padding: 4px 0; font-size: 9px; color: #555;">${p.minNormal}-${p.maxNormal}</td>
        </tr>
      `).join('');

      const qrVerifyUrl = `${window.location.origin}${window.location.pathname}?verify=${test.qrToken}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=000000&data=${encodeURIComponent(qrVerifyUrl)}`;

      // Dynamic print layout targeting real 80mm ESC/POS hardware paper rolls
      const receiptContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>Thermal Ticket - LIMS</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', 'Inter', sans-serif;
              width: 76mm;
              margin: 0 auto;
              padding: 5mm 2mm;
              font-size: 11px;
              line-height: 1.4;
              color: #000;
              background: #fff;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .header-title { font-size: 15px; margin: 2px 0; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            th, td { font-size: 10px; }
            .qr-container { display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 10px 0; }
            .qr-image { width: 110px; height: 110px; }
            .footer-note { font-size: 9px; margin-top: 10px; color: #333; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <div class="font-bold header-title">${settings?.labNameAr || "مختبرات تكنو-كلينيك الطبية"}</div>
            <div style="font-size: 10px;">${settings?.labNameEn || "Techno-Clinic Labs"}</div>
            <div style="font-size: 9px; margin-top: 2px;">الهاتف: ${settings?.labPhone || "0102919381"}</div>
          </div>

          <div class="divider"></div>

          <div>
            <div><b>المريض:</b> ${patient.name}</div>
            <div><b>كود الملف:</b> ${patient.id}</div>
            <div><b>التاريخ:</b> ${test.requestDate || new Date().toISOString().split('T')[0]}</div>
            <div><b>رقم الفحص:</b> ${test.id}</div>
            <div><b>الفحص:</b> ${test.titleAr || test.testType}</div>
          </div>

          <div class="divider"></div>

          <table style="width: 100%;">
            <thead>
              <tr style="border-bottom: 1.5px solid #000;">
                <th style="text-align: right; font-size: 10px;">التحليل</th>
                <th style="text-align: center; font-size: 10px;">النتيجة</th>
                <th style="text-align: left; font-size: 10px;">الطبيعي</th>
              </tr>
            </thead>
            <tbody>
              ${paramsHtml}
            </tbody>
          </table>

          <div class="divider"></div>

          <div class="text-center">
            <b>الطبيب المسؤول:</b><br/>
            ${test.approvedBy || settings?.doctorName || "د. عبد الرحمن الفضلي"}<br/>
            <span style="font-size: 9px;">(فحص معتمد وموقع رقمياً)</span>
          </div>

          <div class="divider"></div>

          <div class="qr-container text-center">
            <div style="font-size: 9px; margin-bottom: 4px; font-weight: bold;">امسح للتحقق والوصول للتقرير المباشر رقمياً:</div>
            <img class="qr-image" src="${qrCodeUrl}" alt="QR verification code" />
            <div style="font-size: 8px; font-family: monospace; margin-top: 4px;">Ref: ${test.qrToken}</div>
          </div>

          <div class="divider"></div>

          <div class="text-center footer-note font-bold">
            نشكركم على اختياركم لنا.<br/>
            تمنياتنا لكم بالشفاء العاجل.
          </div>

          <script>
            window.onload = function() {
              window.focus();
              try {
                window.print();
              } catch(e) {}
              setTimeout(function() {
                window.parent.postMessage('print_done', '*');
              }, 500);
            }
          </script>
        </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(receiptContent);
      iframeDoc.close();

      // Listen for print completed event to clean up frame
      const handleMessage = (event: MessageEvent) => {
        if (event.data === 'print_done') {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
          setTicketLoading(false);
          setTicketPrinted(true);
          setTimeout(() => setTicketPrinted(false), 3000);
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);

    } catch (err) {
      console.error("[Micro Thermal Printer Engine] Failure:", err);
      setTicketLoading(false);
    }
  };

  const getGenderAr = (g: string) => {
    if (g === 'male' || g === 'ذكر') return 'ذكر';
    if (g === 'female' || g === 'أنثى') return 'أنثى';
    return g;
  };

  // Calculate age assuming 1988 birthdate for احمد عبد الله
  const getAge = (birthDate: string) => {
    const yearBorn = new Date(birthDate).getFullYear();
    const currentYear = new Date().getFullYear();
    return currentYear - yearBorn;
  };

  const isValueAbnormal = (val: number | undefined, min: number, max: number) => {
    if (val === undefined) return false;
    return val < min || val > max;
  };

  const printReport = () => {
    if (window.self !== window.top) {
      alert('للطباعة، يرجى فتح التطبيق في نافذة/علامة تبويب جديدة باستخدام زر "Open App" أعلى يمين الشاشة.');
    } else {
      window.print();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8 max-w-4xl mx-auto border border-slate-100 relative overflow-hidden transition-all animate-docLoad">
      {/* Decorative medical header stripe */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-500" />
      
      {/* Action Bar (Hidden during printing) */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100 no-print">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-teal-600 font-medium transition-colors"
          id="btn-report-back"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>رجوع</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Quick Verify Simulator Alert */}
          <button
            onClick={onVerifySelf}
            className="flex items-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            title="انقر لتجربة فحص رمز QR والتحقق عبر الويب"
            id="btn-report-try-verify"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>التحقق من التقرير السحابي</span>
          </button>

          <button
            onClick={printReport}
            className="flex items-center gap-2 bg-teal-600 text-white hover:bg-teal-700 px-5 py-2 rounded-xl text-sm font-semibold shadow-md shadow-teal-100 transition-all cursor-pointer"
            id="btn-report-print"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير (PDF)</span>
          </button>
        </div>
      </div>

      {/* NEW: Quick Copy & Thermal Printer Connectivity Actions (No-Print) */}
      {((settings?.allowResultCopying !== false) || (settings?.enableElectronicPrinter)) && (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap gap-4 items-center justify-between text-xs no-print animate-fadeIn">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="w-2 h-2 bg-emerald-550 rounded-full animate-pulse" />
            <span>قنوات الاتصال الملحقة:</span>
            {settings?.enableElectronicPrinter ? (
              <span className="bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-md font-mono text-[10px]">
                طابعة معتمدة نشطة ({settings?.printerConnectionType === 'network' ? `IP: ${settings?.printerIpAddress}` : settings?.printerConnectionType})
              </span>
            ) : (
              <span className="text-slate-400 font-bold">لم يفعل الطبيب طابعة سلكية (يحفظ كـ PDF)</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
            {/* WhatsApp/SMS Ready Clipboard Copier */}
            {settings?.allowResultCopying !== false && (
              <button
                onClick={copyReportToText}
                className="bg-white border border-slate-300 text-slate-700 hover:text-teal-700 hover:border-teal-500 font-extrabold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer text-xs"
                title="نسخ نص التقرير للصحيفة لإرساله عبر الواتساب أو الرسائل القصيرة"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? "✔ تم نسخ النص!" : "نسخ نتائج الفحص"}</span>
              </button>
            )}

            {/* Real WhatsApp Direct Sender */}
            {patient.phone && (
              <a
                href={`https://api.whatsapp.com/send?phone=${patient.phone.startsWith('0') ? '2' + patient.phone : patient.phone}&text=${encodeURIComponent(
                  `مرحباً ${patient.name}، نود إخباركم أن تقريركم الطبي المعتمد جاهز الآن من معمل ${settings?.labNameAr || "تكنو-كلينيك الطبية"}.\nالرقم المرجعي: ${test.id}\nفئة الفحص: ${test.titleAr || test.testType}\nبصمة التحقق التلقائي والباركود متوفرة رقمياً عبر الرابط المباشر:\n${window.location.origin}${window.location.pathname}?verify=${test.qrToken}\n\nدمتم بصحة وعافية.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer text-xs"
                title="إرسال مباشرة عبر تطبيق الواتساب الفعلي"
                onClick={() => {
                  fetch("/api/notifications/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      type: "whatsapp",
                      phone: patient.phone,
                      patientName: patient.name,
                      testId: test.id,
                      message: `تنبيه التقرير الطبي المعتمد جاهز للمريض.`
                    })
                  }).catch(err => console.error(err));
                }}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>إرسال واتساب مباشر 🟢</span>
              </a>
            )}

            {/* Real SMS Native Dispatcher */}
            {patient.phone && (
              <a
                href={`sms:${patient.phone}?body=${encodeURIComponent(
                  `مرحباً ${patient.name}، تقريرك المخبري جاهز الآن من ${settings?.labNameAr || "تكنو-كلينيك"}. تفضل بمراجعته: ${window.location.origin}${window.location.pathname}?verify=${test.qrToken}`
                )}`}
                className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer text-xs"
                title="إرسال رسالة نصية قصيرة SMS عبر الشريحة الهاتفية"
                onClick={() => {
                  fetch("/api/notifications/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      type: "sms",
                      phone: patient.phone,
                      patientName: patient.name,
                      testId: test.id,
                      message: `تنبيه SMS التقرير الطبي جاهز.`
                    })
                  }).catch(err => console.error(err));
                }}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>إرسال SMS هاتفياً 📱</span>
              </a>
            )}

            {/* Quick Micro Thermal Printer Dispatcher */}
            {settings?.enableElectronicPrinter && (
              <button
                onClick={simulateThermalPrinterAction}
                disabled={ticketLoading}
                className="bg-teal-750 hover:bg-teal-700 text-white font-extrabold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 cursor-pointer text-xs shrink-0"
                title="إصدار وصرف تيكيت حراري سريع للمريض"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{ticketLoading ? "جاري الإرسال..." : ticketPrinted ? "🖨️ تم!" : "طباعة تيكيت سريع"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Official Health Report Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 items-center justify-between gap-6 mb-8 text-slate-800">
        <div className="text-right md:text-right">
          <h1 className="text-3xl font-extrabold text-teal-800 tracking-tight">{settings?.labNameEn || "MY LAB"}</h1>
          <p className="text-sm font-semibold text-slate-500">{settings?.labNameAr || "مختبرات تكنو-كلينيك الطبية"}</p>
          <p className="text-xs text-slate-400">إدارة ذكية ومصادقة سحابية متوفرة 24/7</p>
        </div>

        <div className="flex flex-col items-center justify-center border-y md:border-y-0 md:border-x border-slate-100 py-3 md:py-0">
          <div className="p-3 bg-teal-50 rounded-full mb-1">
            <Award className="w-8 h-8 text-teal-600" />
          </div>
          <span className="text-xs font-bold bg-teal-100 text-teal-800 px-2.5 py-1 rounded-full text-center">
            تقرير طبي معتمد وموثق
          </span>
        </div>

        <div className="text-left text-xs text-slate-500 font-mono flex flex-col justify-end items-end">
          <div className="text-right">
            <span className="font-bold block text-sm text-slate-700">{settings?.labNameEn || "Nile Clinical Lab"}</span>
            <span>الرقم المرجعي: {test.id}</span>
            {(!settings?.barcodeLocation || settings?.barcodeLocation === 'top') && (
              <>
                <span className="block text-slate-400 mt-1">الرقم التعريفي للأنابيب: </span>
                <span className="font-bold text-slate-700 tracking-wider font-mono">||||| {test.barcode} |||||</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Patient Information Grid */}
      <div className="bg-slate-50 rounded-xl p-5 mb-8 border border-slate-100 text-sm">
        <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200">
          بيانات المريض والمعمل | PATIENT & LAB INFO
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6">
          <div>
            <span className="block text-xs text-slate-400 mb-0.5">اسم المريض</span>
            <span className="font-bold text-slate-800 block text-base">{patient.name}</span>
            <span className="text-xs text-slate-500 font-mono block">{patient.nameEn}</span>
          </div>

          <div>
            <span className="block text-xs text-slate-400 mb-0.5">رقم الهوية الوطنية / الملف</span>
            <span className="font-mono font-semibold text-slate-700 block mt-1">{patient.id}</span>
          </div>

          <div>
            <span className="block text-xs text-slate-400 mb-0.5">العمر / الجنس</span>
            <span className="font-semibold text-slate-700 block mt-1">
              {getAge(patient.birthDate)} سنة / {getGenderAr(patient.gender)}
            </span>
          </div>

          <div>
            <span className="block text-xs text-slate-400 mb-0.5">رقم الهاتف</span>
            <span className="font-mono font-medium text-slate-700 block mt-1">{patient.phone}</span>
          </div>

          <div>
            <span className="block text-xs text-slate-400 mb-0.5">تاريخ طلب الاختبار</span>
            <span className="font-semibold text-slate-700 block text-xs mt-1">{test.requestDate}</span>
          </div>

          <div>
            <span className="block text-xs text-slate-400 mb-0.5">حالة العينة والموثوقية</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 mt-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              مفحوصة ومعتمدة
            </span>
          </div>

          <div>
            <span className="block text-xs text-slate-400 mb-0.5">الجهة الطبية المحيلة</span>
            <span className="font-semibold text-slate-700 block mt-1">طبيب جراحة عامة / خارجي</span>
          </div>

          <div>
            <span className="block text-xs text-slate-400 mb-0.5">صنف التحليل</span>
            <span className="bg-teal-50 text-teal-800 text-xs font-bold border border-teal-100 px-2.5 py-0.5 rounded-md inline-block mt-1">
              {test.titleAr}
            </span>
          </div>
        </div>
      </div>

      {settings?.barcodeLocation === 'sidebar' && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 flex items-center justify-between">
          <div className="text-right">
            <span className="font-bold text-slate-800 text-xs block">🧬 رمز باركود التحليل الجانبي المخصص للأنابيب</span>
            <span className="text-[10px] text-slate-400 mt-1 block">رقم الملصق التعريفي: {test.barcode}</span>
          </div>
          <div className="font-mono font-black text-slate-800 text-base tracking-widest bg-white border border-slate-200 px-3 py-1 rounded-lg">
            ||||| {test.barcode} |||||
          </div>
        </div>
      )}

      {/* Lab Results Table */}
      <div className="border border-slate-100 rounded-xl overflow-hidden mb-8">
        <table className="w-full text-right border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
              <th className="p-3.5 pr-5 font-bold">الاختبار | Test Target</th>
              <th className="p-3.5 font-bold text-center">النتيجة | Result</th>
              <th className="p-3.5 font-bold text-center">الوحدة | Unit</th>
              <th className="p-3.5 font-bold text-center">المدى المرجعي الطبيعي | Normal Range</th>
              <th className="p-3.5 pl-5 font-bold text-left">الحالة | Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {test.parameters.map((param, index) => {
              const abnormal = param.value !== undefined && isValueAbnormal(param.value, param.minNormal, param.maxNormal);
              const tooHigh = param.value !== undefined && param.value > param.maxNormal;
              const tooLow = param.value !== undefined && param.value < param.minNormal;

              return (
                <tr key={index} className={`hover:bg-slate-50/50 transition-colors ${abnormal ? 'bg-red-50/30' : ''}`}>
                  <td className="p-4 pr-5">
                    <div className="font-bold text-slate-800">{param.nameAr}</div>
                    <div className="text-xs text-slate-400 font-mono">{param.name}</div>
                  </td>
                  <td className="p-4 text-center font-mono font-bold text-base">
                    <span className={abnormal ? 'text-rose-600 font-extrabold text-lg' : 'text-teal-900'}>
                      {param.value !== undefined ? param.value : '—'}
                    </span>
                  </td>
                  <td className="p-4 text-center text-slate-500 font-mono text-xs">
                    {param.unit}
                  </td>
                  <td className="p-4 text-center text-slate-600 font-mono text-xs">
                    {param.minNormal} - {param.maxNormal}
                  </td>
                  <td className="p-4 pl-5 text-left">
                    {abnormal ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100 animate-pulse">
                        {tooHigh ? 'مرتفع ↑ (High)' : 'منخفض ↓ (Low)'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 text-left">
                        طبيعي ✔ (Normal)
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Custom Interpretative Notes based on general findings */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-8">
        <h4 className="text-xs font-bold text-slate-600 mb-1.5">ملاحظات الطبيب الاستشارية والمصادقة الطبية:</h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          * تم فحص ومعايرة النتائج السابقة على الأجهزة التحليلية المعيارية المعتمدة محلياً. يرجى مراجعة الطبيب المعالج لتفسير النتائج ضمن الإطار السريري المتكامل للمريض.
          {test.parameters.some(p => p.isAbnormal) && " يلاحظ وجود بعض المؤشرات الطبية الطفيفة خارج النطاق الطبيعي والتي تستوجب الاستشارة السريرية والمتابعة بعد استكمال الصيام والتحضير المناسب."}
        </p>
      </div>

      {/* Stamp, Signatures & Digital Verification Portal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100 items-center justify-between text-center select-none text-slate-700">
        
        {/* Verification QR Code Section */}
        <div className="flex flex-col items-center justify-center p-3 border border-dashed border-teal-200 rounded-xl bg-teal-50/40 relative group">
          <span className="text-[10px] font-bold text-teal-800 mb-1.5 text-center px-1">
            المصادقة السحابية | CLOUD VERIFY
          </span>
          
          {/* Real Scannable QR Code */}
          <div 
            onClick={onVerifySelf}
            className="w-24 h-24 bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center cursor-pointer shadow-sm hover:ring-2 hover:ring-teal-500 hover:ring-offset-2 transition-all relative group"
            title="رمز استجابة سريعة حقيقي. امسحه بالجوال للتحقق!"
          >
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="Certification QR Code" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-slate-50 flex items-center justify-center text-[9px] text-slate-400 font-bold">
                جاري التوليد...
              </div>
            )}
            
            <div className="absolute inset-0 bg-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-teal-900/10 rounded-lg">
              <span className="text-[9px] bg-teal-600 text-white font-bold py-0.5 px-1.5 rounded-full shadow-md">
                فحص فوري
              </span>
            </div>
          </div>
          
          <span className="text-[9px] text-slate-400 font-mono mt-2 text-center break-all">
            رمز التحقق: {test.qrToken}
          </span>
        </div>

        {/* Dynamic Stamp Simulation */}
        <div className="flex flex-col items-center justify-center">
          <div className="transform rotate-1 border-4 border-teal-600/60 p-2.5 rounded-full text-teal-600/80 max-w-[130px] font-bold text-[10px] leading-tight select-none pointer-events-none relative shadow-sm">
            <div className="border border-double border-teal-600/40 p-1.5 rounded-full">
              <span className="block mb-0.5 text-slate-800 font-bold tracking-tight">{settings?.labNameEn ? settings.labNameEn.toUpperCase().slice(0, 10) : "MY LABS"}</span>
              <span className="block border-y border-teal-600/30 py-0.5 text-[8px]">مختبر معتمد</span>
              <span className="block mt-0.5 text-slate-500 font-mono font-medium">APPROVED</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-2 block">الختم الرقمي الرسمي للمعمل</span>
        </div>

        {/* Director Signature */}
        <div className="flex flex-col items-center justify-center text-xs">
          <div className="h-10 flex items-end justify-center">
            {/* Calligraphic-like Signature look */}
            <span className="font-mono text-2xl italic text-slate-500 tracking-widest block opacity-70 cursor-default select-none">
              {settings?.doctorName ? settings.doctorName.split(' ').map(n => n[0]).join('.') + '.' : 'A. AlFadhli'}
            </span>
          </div>
          <div className="border-t border-slate-200 w-44 mt-2 pt-1 font-bold text-slate-700">
            {test.approvedBy || settings?.doctorName || "د. عبد الرحمن الفضلي"}
          </div>
          {settings?.doctorLicense && (
            <span className="text-[10px] text-slate-400 block mt-0.5">ترخيص رقم: {settings.doctorLicense}</span>
          )}
          {test.approvedAt && (
            <span className="text-[8px] text-slate-400 font-mono mt-0.5">{test.approvedAt}</span>
          )}
        </div>
      </div>

      {settings?.barcodeLocation === 'bottom' && (
        <div className="mt-8 pt-4 border-t border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-slate-400 mb-1 block">رمز باركود التحقق المعتمد (موضع التمهيد والختم)</span>
          <span className="font-mono text-xl font-black text-slate-700 tracking-widest block">||||| {test.barcode} |||||</span>
          <span className="text-[10px] text-slate-500 font-mono mt-1">{test.barcode}</span>
        </div>
      )}

      {/* --- REAL HARDWARE THERMAL PRINTER DIALOG OVERLAY --- */}
      {showThermalPreview && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col my-auto">
            {/* Header */}
            <div className="bg-teal-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 animate-pulse text-teal-300" />
                <h3 className="text-sm font-bold">بوابة اتصال الطابعات الحرارية المباشر</h3>
              </div>
              <button 
                onClick={() => { setShowThermalPreview(false); setTicketLoading(false); }}
                className="text-white hover:text-red-300 text-lg transition-colors font-extrabold cursor-pointer"
                title="إغلاق"
              >
                ✕
              </button>
            </div>

            {/* Instruction Warning */}
            <div className="bg-teal-50 border-b border-teal-100 p-3 text-[11px] font-bold text-teal-900 flex flex-col gap-1.5 leading-relaxed">
              <span>💡 يرجى التأكد من توصيل طابعة تذاكر الفواتير الحرارية (Epson/Xprinter/Star) مقاس 80mm أو 58mm عبر كابل الـ USB أو البلوتوث وتفعيلها على نظام التشغيل.</span>
            </div>

            {/* Simulated Receipt Roll Canvas Container */}
            <div className="p-4 bg-slate-100 flex justify-center overflow-y-auto max-h-[380px]">
              <div className="w-[74mm] bg-white border border-slate-300 shadow-lg p-4 font-mono text-[11px] text-black leading-tight relative rounded-sm">
                {/* Simulated jagged/teeth tear-line at top */}
                <div className="absolute top-0 inset-x-0 h-1 bg-[linear-gradient(135deg,transparent_25%,#f1f5f9_25%,#f1f5f9_50%,transparent_50%,transparent_75%,#f1f5f9_75%)] bg-[length:6px_6px]" />
                
                {/* Ticket Body mockup */}
                <div className="text-center font-bold mt-2">
                  <div className="text-sm tracking-tight">{settings?.labNameAr || "معمل النيل للتحاليل الطبية والتشخيص"}</div>
                  <div className="text-[10px] text-slate-600">{settings?.labNameEn || "Nile Clinical Laboratory"}</div>
                  <div className="text-[9px] text-slate-500">جوال المعمل: {settings?.labPhone || "0102919381"}</div>
                </div>

                <div className="border-t border-dashed border-black my-2" />

                <div className="space-y-0.5 text-right font-medium">
                  <div><b>المريض:</b> {patient.name}</div>
                  <div><b>رقم الملف:</b> {patient.id}</div>
                  <div><b>رقم الفحص:</b> {test.id}</div>
                  <div><b>التاريخ:</b> {test.requestDate}</div>
                  <div><b>التحليل المطلق:</b> {test.titleAr || test.testType}</div>
                </div>

                <div className="border-t border-dashed border-black my-2" />

                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="font-bold text-[10px] text-right pb-1">التحليل</th>
                      <th className="font-bold text-[10px] text-center pb-1">النتيجة</th>
                      <th className="font-bold text-[10px] text-left pb-1 font-mono">الطبيعي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {test.parameters.map((p, i) => (
                      <tr key={i} className="border-b border-dotted border-slate-300">
                        <td className="py-1 text-right text-[10px] font-bold">{p.nameAr || p.name}</td>
                        <td className={`py-1 text-center text-[10px] font-bold ${p.isAbnormal ? 'text-red-600' : ''}`}>
                          {p.value} {p.unit}
                        </td>
                        <td className="py-1 text-left text-[9px] text-slate-600 font-mono">
                          {p.minNormal}-{p.maxNormal}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-dashed border-black my-2" />

                <div className="text-center text-[10px] font-bold">
                  <b>الطبيب المسؤول والمعتمد:</b><br/>
                  {test.approvedBy || settings?.doctorName || "د. عبد الرحمن الفضلي"}
                </div>

                <div className="border-t border-dashed border-black my-2" />

                <div className="flex flex-col items-center justify-center text-center">
                  <div className="text-[9px] font-bold mb-1">امسح للتحقق والوصول المباشر للتقرير:</div>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&color=000000&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}?verify=${test.qrToken}`)}`} 
                    alt="Thermal QR Verify" 
                    className="w-24 h-24 border border-slate-200 p-1" 
                  />
                  <div className="text-[8px] font-mono text-slate-500 mt-1">Ref: {test.qrToken}</div>
                </div>

                <div className="border-t border-dashed border-black my-2" />

                <div className="text-center text-[10px] font-extrabold pb-2">
                  نشكركم لثقتكم بنا.<br/>
                  تمنياتنا لكم بالشفاء العاجل ❤️
                </div>

                {/* Simulated jagged/teeth tear-line at bottom */}
                <div className="absolute bottom-0 inset-x-0 h-1 bg-[linear-gradient(45deg,transparent_25%,#f1f5f9_25%,#f1f5f9_50%,transparent_50%,transparent_75%,#f1f5f9_75%)] bg-[length:6px_6px]" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  // Print directly using standard browser printing of a custom clean popup window
                  const printWindow = window.open('', '_blank', 'width=350,height=600');
                  if (printWindow) {
                    const paramsStr = test.parameters.map(p => `
                      <tr style="border-bottom: 1px dashed #ccc;">
                        <th style="text-align: right; padding: 4px 0; font-size: 11px;">${p.nameAr || p.name}</th>
                        <td style="text-align: center; padding: 4px 0; font-size: 11px; font-weight: bold; ${p.isAbnormal ? 'color: red;' : ''}">${p.value} ${p.unit}</td>
                        <td style="text-align: left; padding: 4px 0; font-size: 9px; color: #555;">${p.minNormal}-${p.maxNormal}</td>
                      </tr>
                    `).join('');
                    const verifyUrl = `${window.location.origin}${window.location.pathname}?verify=${test.qrToken}`;
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=000000&data=${encodeURIComponent(verifyUrl)}`;

                    const layout = `
                      <!DOCTYPE html>
                      <html dir="rtl" lang="ar">
                      <head>
                        <meta charset="UTF-8">
                        <title>طباعة تيكيت - LIMS</title>
                        <style>
                          @page { size: 80mm auto; margin: 0; }
                          body {
                            font-family: Arial, sans-serif;
                            width: 76mm;
                            margin: 0 auto;
                            padding: 5mm 2mm;
                            font-size: 11px;
                            line-height: 1.4;
                            color: #000;
                            background: #fff;
                          }
                          .text-center { text-align: center; }
                          .font-bold { font-weight: bold; }
                          .header-title { font-size: 14px; margin: 2px 0; }
                          .divider { border-top: 1px dashed #000; margin: 8px 0; }
                          table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                          th, td { font-size: 10px; }
                          .qr-container { display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 10px 0; }
                          .qr-image { width: 110px; height: 110px; }
                        </style>
                      </head>
                      <body>
                        <div class="text-center">
                          <div class="font-bold header-title">${settings?.labNameAr || "معمل النيل للتحاليل الطبية والتشخيص"}</div>
                          <div style="font-size: 10px;">${settings?.labNameEn || "Nile Clinical Laboratory"}</div>
                          <div style="font-size: 9px; margin-top: 2px;">الهاتف: ${settings?.labPhone || "0102919381"}</div>
                        </div>
                        <div class="divider"></div>
                        <div>
                          <div><b>المريض:</b> ${patient.name}</div>
                          <div><b>كود الملف:</b> ${patient.id}</div>
                          <div><b>رقم الفحص:</b> ${test.id}</div>
                          <div><b>التاريخ:</b> ${test.requestDate}</div>
                        </div>
                        <div class="divider"></div>
                        <table>
                          <thead>
                            <tr style="border-bottom: 1px solid #000;">
                              <th style="text-align: right;">التحليل</th>
                              <th style="text-align: center;">النتيجة</th>
                              <th style="text-align: left;">الطبيعي</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${paramsStr}
                          </tbody>
                        </table>
                        <div class="divider"></div>
                        <div class="text-center">
                          <b>الطبيب المسؤول:</b><br/>
                          ${test.approvedBy || settings?.doctorName || "د. عبد الرحمن الفضلي"}
                        </div>
                        <div class="divider"></div>
                        <div class="qr-container text-center">
                          <div style="font-size: 9px; margin-bottom: 4px; font-weight: bold;">امسح للتحقق والوصول للتقرير المباشر رقمياً:</div>
                          <img class="qr-image" src="${qrUrl}" alt="QR Verify" />
                          <div style="font-size: 8px; font-family: monospace; mt-1">Ref: ${test.qrToken}</div>
                        </div>
                        <div class="divider"></div>
                        <div class="text-center font-bold" style="font-size: 9px;">
                          نشكركم لثقتكم بنا.<br/>
                          تمنياتنا لكم بالشفاء العاجل.
                        </div>
                        <script>
                          window.onload = function() {
                            window.focus();
                            setTimeout(function() {
                              window.print();
                              window.close();
                            }, 300);
                          }
                        </script>
                      </body>
                      </html>
                    `;
                    printWindow.document.open();
                    printWindow.document.write(layout);
                    printWindow.document.close();
                    setTicketPrinted(true);
                    setTimeout(() => setTicketPrinted(false), 2000);
                  } else {
                    alert('⚠️ يرجى السماح بالنوافذ المنبثقة للطباعة المباشرة!');
                  }
                }}
                className="w-full bg-teal-850 hover:bg-teal-800 text-white font-extrabold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg text-xs"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>إرسال وإطلاق تيكيت الطباعة الفوري 🖨️</span>
              </button>

              <button
                type="button"
                onClick={() => { setShowThermalPreview(false); setTicketLoading(false); }}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-4 rounded-xl text-xs transition-colors"
              >
                إلغاء وإغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
