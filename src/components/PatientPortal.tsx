import React, { useState } from 'react';
import { Patient, LabTest, Appointment, AppComplaint } from '../types';
import { TRANSLATIONS } from '../lib/translations';
import { GLUCOSE_HISTORICAL_TREND } from '../data';
import { 
  User, Phone, CalendarCheck2, Clock, History, FileHeart, 
  MapPin, HelpCircle, LogOut, CheckCircle2, ChevronLeft, 
  TrendingUp, Activity, ClipboardList, PlusCircle, Compass, Check, AlertTriangle, ShieldQuestion
} from 'lucide-react';
import InteractiveMap from './InteractiveMap';

interface PatientPortalProps {
  currentPatient: Patient;
  tests: LabTest[];
  appointments: Appointment[];
  complaints?: AppComplaint[];
  onSubmitComplaint?: (complaint: Omit<AppComplaint, 'id' | 'date' | 'status'>) => void;
  language: 'ar' | 'en';
  currency: 'SAR' | 'EGP';
  onLogout: () => void;
  onSelectTest: (test: LabTest) => void;
  onBookAppointment: (appointment: Omit<Appointment, 'id'>) => void;
}

export default function PatientPortal({ 
  currentPatient, 
  tests, 
  appointments, 
  complaints = [],
  onSubmitComplaint,
  language,
  currency,
  onLogout,
  onSelectTest,
  onBookAppointment
}: PatientPortalProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tests' | 'booking' | 'complaints'>('dashboard');
  const t = TRANSLATIONS[language];
  const isAr = language === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  
  // Booking Form State
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingType, setBookingType] = useState<'lab' | 'home'>('lab');
  const [bookingTest, setBookingTest] = useState('صورة دم كاملة (CBC)');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Complaints form states
  const [complaintCategory, setComplaintCategory] = useState<'technical' | 'administrative' | 'delay' | 'billing' | 'other'>('technical');
  const [complaintDetails, setComplaintDetails] = useState('');
  const [complaintTestId, setComplaintTestId] = useState('');
  const [complaintSuccess, setComplaintSuccess] = useState(false);

  const handleComplaintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintDetails.trim()) return;
    if (onSubmitComplaint) {
      onSubmitComplaint({
        name: currentPatient.name,
        phone: currentPatient.phone,
        category: complaintCategory,
        details: complaintDetails,
        testId: complaintTestId || undefined
      });
    }
    setComplaintSuccess(true);
    setComplaintDetails('');
    setComplaintTestId('');
    setTimeout(() => {
      setComplaintSuccess(false);
    }, 5000);
  };

  // Map / Geolocation State
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsAddress, setGpsAddress] = useState<string>('');
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Simulated Map Coordinates
  // Center of mock map is (30.0444, 31.2357) for Cairo or (24.7136, 46.6753) for Riyadh
  const mapCenterLat = currency === 'EGP' ? 30.0444 : 24.7136;
  const mapCenterLng = currency === 'EGP' ? 31.2357 : 46.6753;
  const [pinOffset, setPinOffset] = useState({ x: 180, y: 80 });

  // Filter patient tests and appointments
  const patientTests = tests.filter(t => t.patientId === currentPatient.id);
  const patientAppointments = appointments.filter(a => a.patientPhone === currentPatient.phone);
  const patientComplaints = complaints.filter(c => c.phone === currentPatient.phone || c.name === currentPatient.name);

  const notificationsList = [
    // Approved tests
    ...patientTests.filter(t => t.sampleStatus === 'approved').map(t => ({
      id: `notif-test-${t.id}`,
      title: isAr ? '✓ جاهزية نتائج التحليل فورا' : '✓ Laboratory Results Ready',
      desc: isAr 
        ? `تم اعتماد واعتماد فحص "${t.titleAr || t.testType}" وتوثيقه رقمياً بالباركود والختم.`
        : `Your analysis for "${t.testType}" has been approved and digitally certified.`,
      date: t.approvedAt || t.requestDate || '2026-06-10',
      type: 'success'
    })),
    // Booked/Confirmed appointments
    ...patientAppointments.map(a => ({
      id: `notif-apt-${a.id}`,
      title: isAr ? '📅 تحديث حالة موعد المختبر' : '📅 Lab Appointment Update',
      desc: isAr
        ? `حالة موعدك الطبي بتاريخ ${a.date} في تمام الساعة ${a.time} هي الآن: \`${a.status === 'confirmed' ? 'مؤكد ومحجوز' : 'قيد الانتظار'}\`.`
        : `Your appointment on ${a.date} at ${a.time} is now: \`${a.status}\`.`,
      date: a.date,
      type: a.status === 'confirmed' ? 'info' : 'warning'
    })),
    // Replied/Resolved complaints
    ...patientComplaints.filter(c => c.status !== 'pending').map(c => ({
      id: `notif-comp-${c.id}`,
      title: isAr ? '💬 الرد على شكوى أو استفسار' : '💬 Response to Your Complaint',
      desc: isAr
        ? `تم الرد على ملاحظتك رقم ${c.id}: "${c.adminReply || 'جاري إنهاء المعالجة والتحقق الإداري.'}"`
        : `Management replied to complaint #${c.id}: "${c.adminReply}"`,
      date: c.date,
      type: 'alert'
    }))
  ];

  const formatPrice = (sarPrice: number) => {
    const symbol = currency === 'EGP' ? (isAr ? 'ج.م' : 'EGP') : (isAr ? 'ر.س' : 'SAR');
    return `${sarPrice} ${symbol}`;
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onBookAppointment({
      patientName: currentPatient.name,
      patientPhone: currentPatient.phone,
      date: bookingDate,
      time: bookingTime,
      type: bookingType,
      testType: bookingTest,
      status: 'pending',
      notes: bookingType === 'home' 
        ? `${bookingNotes} | ${t.gpsStatus}: [Lat: ${gpsLat?.toFixed(4) || "Default"}, Lng: ${gpsLng?.toFixed(4) || "Default"}] | العنوان المعتمد: ${gpsAddress || 'موقع الخريطة البثي المختار'}`
        : bookingNotes,
      latitude: bookingType === 'home' ? (gpsLat || mapCenterLat) : undefined,
      longitude: bookingType === 'home' ? (gpsLng || mapCenterLng) : undefined,
      address: bookingType === 'home' ? (gpsAddress || 'العنوان المسجل بنقاط الإحداثيات') : undefined
    });
    setBookingSuccess(true);
    setTimeout(() => {
      setBookingSuccess(false);
      setBookingDate('');
      setBookingTime('');
      setBookingNotes('');
      setActiveTab('dashboard');
    }, 3000);
  };

  // Click on mock map to place pin
  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPinOffset({ x, y });

    // Calculate simulated lat long based on pin position offset
    // Width is 400, Height is 160
    const dx = (x - 200) / 2000;
    const dy = (80 - y) / 2000;
    const lat = mapCenterLat + dy;
    const lng = mapCenterLng + dx;
    setGpsLat(lat);
    setGpsLng(lng);

    // Dynamic address reverse geocoding
    if (currency === 'EGP') {
      const areas = ["مصر الجديدة", "الدقي", "الزمالك", "المهندسين", "مدينة نصر", "شبرا الخيمة", "شارع التسعين، التجمع الخامس"];
      const sIndex = Math.floor((x + y) % areas.length);
      setGpsAddress(isAr 
        ? `${areas[sIndex]}، شارع الامل، بناية ${Math.floor(x/10 + 1)}، شقة ${Math.floor(y/20 + 1)}`
        : `Building ${Math.floor(x/10 + 1)}, Al-Amal St, ${areas[sIndex] === "مصر الجديدة" ? "Heliopolis" : "El-Mohandessin"}`
      );
    } else {
      const areas = ["حي الملقا", "حي الياسمين", "حي العليا", "حي السليمانية", "شارع التخصصي", "طريق الملك عبدالعزيز"];
      const sIndex = Math.floor((x + y) % areas.length);
      setGpsAddress(isAr
        ? `${areas[sIndex]}، طريق العروبة، عمارة ${Math.floor(x/10 + 1)}، الدور ${Math.floor(y/30 + 1)}`
        : `Building ${Math.floor(x/10 + 1)}, Orouba Rd, ${areas[sIndex]}`
      );
    }
  };

  // Get real web browser Geolocation coordinates!
  const triggerRealGeolocation = () => {
    if (!navigator.geolocation) {
      setGpsError(isAr ? 'متصفحك لا يدعم فك المواقع الجغرافية GPS' : 'Your browser does not support GPS geolocation.');
      return;
    }
    setDetectingGps(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGpsLat(lat);
        setGpsLng(lng);
        setDetectingGps(false);

        // Place pin near center
        setPinOffset({ x: 230, y: 70 });

        // Simulated look-up for real GPS coordinates coordinates
        setGpsAddress(isAr 
          ? `الموقع المكتشف بالأقمار الصناعية (خط عرض: ${lat.toFixed(4)}، خط طول: ${lng.toFixed(4)})`
          : `GPS Satellite Detected Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`
        );
      },
      (err) => {
        console.error(err);
        setDetectingGps(false);
        setGpsError(isAr ? 'عذرًا، تعذر استدعاء إحداثيات GPS من هاتفك أو جهازك الحالي.' : 'Unable to retrieve GPS coordinates from your device.');
      },
      { timeout: 8000 }
    );
  };

  // Graph Area Config
  const maxVal = 120; // max fasting glucose
  const points = GLUCOSE_HISTORICAL_TREND.map((item, index) => {
    const x = (index / (GLUCOSE_HISTORICAL_TREND.length - 1)) * 360 + 20;
    const y = 100 - ((item.fbs - 70) / (maxVal - 70)) * 80;
    return { x, y, ...item };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="space-y-6 text-right font-sans" dir={dir}>
      {/* Patient Header Card */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-teal-900/40 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
              <User className="w-9 h-9 text-teal-300" />
            </div>
            <div className={isAr ? 'text-right' : 'text-left'}>
              <div className="flex items-center gap-2">
                <span className="bg-teal-700/80 text-teal-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-teal-600/50">
                  {t.patientVerified}
                </span>
                <span className="font-mono text-xs text-teal-200">{t.patientMrn} {currentPatient.id}</span>
              </div>
              <h2 className="text-2xl font-black mt-1">{isAr ? currentPatient.name : currentPatient.nameEn}</h2>
              <p className="text-xs text-teal-200 font-mono opacity-80 mt-0.5">{currentPatient.nameEn}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('booking')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl shadow-lg shadow-indigo-950/30 transition-all flex items-center gap-2 cursor-pointer"
              id="btn-patient-book"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.btonBookApt}</span>
            </button>
            <button
              onClick={onLogout}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs font-bold p-3 rounded-xl transition-all cursor-pointer"
              title={t.logout}
              id="btn-patient-logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mini information panels */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10 text-xs">
          <div className="bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-white/5">
            <span className="text-teal-300 block mb-0.5">{t.patientPhoneLabel}</span>
            <span className="font-mono font-bold text-sm block">{currentPatient.phone}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-white/5">
            <span className="text-teal-300 block mb-0.5">{t.patientGenderDob}</span>
            <span className="font-bold text-sm block">{isAr ? currentPatient.gender : (currentPatient.gender === 'ذكر' || currentPatient.gender === 'male' ? 'Male' : 'Female')} ({currentPatient.birthDate || '1990-01-01'})</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-white/5">
            <span className="text-teal-300 block mb-0.5">{t.patientBloodType}</span>
            <span className="font-mono font-extrabold text-sm text-rose-300 block">{currentPatient.bloodType || 'A+'}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-white/5">
            <span className="text-teal-300 block mb-0.5">{t.patientStatus}</span>
            <span className="font-bold text-sm text-emerald-300 block">{t.patientStatusReady}</span>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`pb-3 px-4 font-bold text-sm relative transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'dashboard' ? 'text-teal-600' : 'text-slate-500 hover:text-slate-800'
          }`}
          id="tab-patient-dashboard"
        >
          <span>{t.tabMyDashboard}</span>
          {activeTab === 'dashboard' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          className={`pb-3 px-4 font-bold text-sm relative transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'tests' ? 'text-teal-600' : 'text-slate-500 hover:text-slate-800'
          }`}
          id="tab-patient-tests"
        >
          <span>{t.tabMyReports} ({patientTests.length})</span>
          {activeTab === 'tests' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('booking')}
          className={`pb-3 px-4 font-bold text-sm relative transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'booking' ? 'text-teal-600' : 'text-slate-500 hover:text-slate-800'
          }`}
          id="tab-patient-booking"
        >
          <span>{t.tabBookApt}</span>
          {activeTab === 'booking' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('complaints')}
          className={`pb-3 px-4 font-bold text-sm relative transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'complaints' ? 'text-teal-600' : 'text-slate-500 hover:text-slate-800'
          }`}
          id="tab-patient-complaints"
        >
          <span>الشكاوى والمقترحات 📝</span>
          {activeTab === 'complaints' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full" />}
        </button>
      </div>

      {/* TAB CONTENT: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* INSTANT NOTIFICATION ALERT CENTER (التنبيهات الفورية النشطة) */}
          <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-500/20 rounded-2xl p-5 shadow-sm animate-fadeIn">
            <div className="flex items-center justify-between mb-4 border-b border-teal-500/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                  <div className="relative p-2 bg-red-500 text-white rounded-full">
                    <Activity className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">بوابة التنبيهات العاجلة والفورية للمريض</h3>
                  <p className="text-[11px] font-bold text-teal-800">تحديثات وتنبيهات مباشرة تصدر تلقائياً عبر الأنظمة الطبية</p>
                </div>
              </div>
              <span className="text-xs font-black bg-red-100 text-red-800 px-2.5 py-1 rounded-full border border-red-200">
                {notificationsList.length} تنبيهات نشطة
              </span>
            </div>

            {notificationsList.length === 0 ? (
              <div className="text-center py-4 bg-white/50 rounded-xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400 font-extrabold">لا يوجد أي خطابات أو تنبيهات غير مقروءة حالياً في ملفك.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notificationsList.map((notif) => (
                  <div 
                    key={notif.id}
                    className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-teal-500/35 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] bg-teal-50 text-teal-800 font-extrabold px-2 py-0.5 rounded-md border border-teal-150">
                          {notif.title}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono font-bold">{notif.date}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-bold leading-relaxed">{notif.desc}</p>
                    </div>

                    <div className="mt-3.5 pt-2.5 border-t border-slate-50 flex justify-end">
                      {notif.id.startsWith('notif-test-') && (
                        <button
                          onClick={() => {
                            const testId = notif.id.replace('notif-test-', '');
                            const testObj = tests.find(t => t.id === testId);
                            if (testObj) onSelectTest(testObj);
                          }}
                          className="text-[10px] text-teal-600 hover:text-white font-extrabold bg-teal-50 hover:bg-teal-600 border border-teal-200 hover:border-teal-600 px-3 py-1 rounded-lg transition-all cursor-pointer"
                        >
                          فتح التقرير المخبري المعاينة 🖨️
                        </button>
                      )}
                      {notif.id.startsWith('notif-apt-') && (
                        <button
                          onClick={() => setActiveTab('booking')}
                          className="text-[10px] text-blue-600 hover:text-white font-extrabold bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 px-3 py-1 rounded-lg transition-all cursor-pointer"
                        >
                          إدارة جدول المواعيد 📅
                        </button>
                      )}
                      {notif.id.startsWith('notif-comp-') && (
                        <button
                          onClick={() => setActiveTab('complaints')}
                          className="text-[10px] text-slate-600 hover:text-white font-extrabold bg-slate-50 hover:bg-slate-600 border border-slate-200 hover:border-slate-600 px-3 py-1 rounded-lg transition-all cursor-pointer"
                        >
                          عرض الشكاوى ومراجعة الردود 💬
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* EMR Curve Trend */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm animate-fadeIn">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-800">{t.glycemicTrend}</h3>
              </div>
              <span className="text-[10px] bg-teal-50 text-teal-800 font-bold px-2 py-1 rounded-md border border-teal-100">
                {t.emrRecord}
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
              {t.emrDesc}
            </p>

            {/* Custom High-Quality SVG Line Chart */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 relative">
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-2 px-4">
                <span>{t.fastingHigh}</span>
                <span>{t.fastingTarget}</span>
              </div>
              
              <svg viewBox="0 0 400 130" className="w-full h-auto overflow-visible select-none">
                <line x1="20" y1="20" x2="380" y2="20" stroke="#f12c56" strokeWidth="0.8" strokeDasharray="4,4" opacity="0.4" />
                <line x1="20" y1="60" x2="380" y2="60" stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="4,4" />
                <line x1="20" y1="100" x2="380" y2="100" stroke="#059669" strokeWidth="0.8" strokeDasharray="4,4" opacity="0.4" />

                <path
                  d={`${pathD} L 380 120 L 20 120 Z`}
                  fill="url(#teal-chart-grad)"
                  opacity="0.1"
                />

                <path
                  d={pathD}
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {points.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke="#0f766e" strokeWidth="2.5" />
                    <text x={p.x} y={p.y - 12} textAnchor="middle" className="text-[9px] font-bold font-mono fill-teal-900">
                      {p.fbs}
                    </text>
                    <text x={p.x} y={p.y + 16} textAnchor="middle" className="text-[8px] font-bold font-mono fill-slate-500">
                      {p.hba1c}%
                    </text>
                    <text x={p.x} y="125" textAnchor="middle" className="text-[8px] font-bold fill-slate-400">
                      {isAr ? p.month : p.month.replace("يناير", "Jan").replace("فبراير", "Feb").replace("مارس", "Mar").replace("أبريل", "Apr").replace("مايو", "May").replace("يونيو (الحالي)", "Jun")}
                    </text>
                  </g>
                ))}

                <defs>
                  <linearGradient id="teal-chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f766e" />
                    <stop offset="100%" stopColor="#ffffff" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Legends */}
              <div className="flex justify-center gap-6 mt-4 pt-3 border-t border-slate-200/50 text-[10px] font-semibold">
                <div className="flex items-center gap-1.5 text-teal-800">
                  <span className="w-3 h-1.5 rounded bg-teal-700 block"></span>
                  <span>{t.fbsLegend}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 block"></span>
                  <span>{t.hba1cLegend}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick tracker and actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-sm animate-fadeIn">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-indigo-600" />
                <span>{t.activeSamplesStatus}</span>
              </h3>

              <div className="space-y-4">
                {patientTests.length > 0 ? (
                  patientTests.map((tItem, idx) => {
                    const statusStr = 
                      tItem.sampleStatus === 'approved' ? (isAr ? 'تم الفحص ومصادقة التقرير' : 'Approved and certified') :
                      tItem.sampleStatus === 'analyzed' ? (isAr ? 'قيد المراجعة النهائية والاعتماد' : 'Under medical review') :
                      tItem.sampleStatus === 'collected' ? (isAr ? 'العينة وصلت في المختبر للتحليل' : 'Specimen received in lab') : 
                      (isAr ? 'بانتظار سحب العينة' : 'Awaiting collection');
                    
                    return (
                      <div key={idx} className="p-3 border border-slate-100 rounded-xl relative hover:border-slate-200 transition-colors">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-bold text-xs text-slate-800">{isAr ? tItem.titleAr : tItem.titleEn}</span>
                          <span className="font-mono text-[9px] text-slate-400">ID: {tItem.id}</span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[10px] block text-slate-400">{isAr ? 'مرحلة الفحص:' : 'Stage:'}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                            {statusStr}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-slate-400 py-6">
                    {t.noSamples}
                  </div>
                )}
              </div>
            </div>

            {/* Quick tips card */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-indigo-950">
              <h4 className="font-bold text-xs mb-1">{t.prepInstructionsTitle}</h4>
              <p className="text-[11px] leading-relaxed opacity-85">
                {t.prepInstructions}
              </p>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* TAB CONTENT: TEST REPORTS LIST */}
      {activeTab === 'tests' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm text-sm animate-fadeIn">
          <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
            <ClipboardList className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-800">{t.allApprovedReports}</h3>
          </div>

          <div className="space-y-4">
            {patientTests.length > 0 ? (
              patientTests.map((tItem, idx) => (
                <div 
                  key={idx}
                  className="p-4 border border-slate-100 rounded-xl hover:border-teal-200 hover:bg-teal-50/10 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                  onClick={() => onSelectTest(tItem)}
                  id={`patient-test-row-${tItem.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                      <FileHeart className="w-5 h-5" />
                    </div>
                    <div className={isAr ? 'text-right' : 'text-left'}>
                      <h4 className="font-bold text-slate-800 text-base">{isAr ? tItem.titleAr : tItem.titleEn}</h4>
                      <p className="font-mono text-xs text-slate-400 mt-0.5">{tItem.titleEn} | {tItem.id}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 mt-2 font-mono">
                        <span>{isAr ? 'قيمة الفاتورة' : 'Invoice'}: {formatPrice(tItem.cost)}</span>
                        <span>•</span>
                        <span>{isAr ? 'تاريخ' : 'Date'}: {tItem.requestDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-3 py-1 rounded-full border border-emerald-100">
                      {isAr ? 'جاهز ومعتمد ✔' : 'Approved ✔'}
                    </span>
                    <button 
                      className="text-teal-600 text-xs font-bold flex items-center gap-1 bg-teal-50 hover:bg-teal-100 px-3 py-2 rounded-lg transition-all"
                      id={`btn-view-${tItem.id}`}
                    >
                      <span>{t.viewReportBarcode}</span>
                      <ChevronLeft className={`w-4 h-4 ${isAr ? '' : 'rotate-180'}`} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400">
                {t.noReports}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: BOOK APPOINTMENT */}
      {activeTab === 'booking' && (
        <div className="bg-white rounded-2xl p-5 sm:p-8 border border-slate-100 shadow-sm text-sm animate-fadeIn">
          <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
            <CalendarCheck2 className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-800">{t.bookingFormHeader}</h3>
          </div>

          {bookingSuccess ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center text-emerald-950">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="font-bold text-lg">{t.bookingSuccess}</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {t.bookingSuccessDesc}
              </p>
            </div>
          ) : (
            <form onSubmit={handleBookingSubmit} className="space-y-6 max-w-2xl" id="patient-booking-form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t.bookingDate}</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-teal-500 outline-none transition-all"
                    required
                    id="booking-date"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t.bookingTime}</label>
                  <input
                    type="time"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-teal-500 outline-none transition-all"
                    required
                    id="booking-time"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t.bookingExtractionMethod}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBookingType('lab')}
                    className={`p-4 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      bookingType === 'lab' 
                        ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    id="btn-booking-lab"
                  >
                    <span>{t.atLab}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBookingType('home');
                      // Load default pin values
                      if (!gpsLat) {
                        setGpsLat(mapCenterLat);
                        setGpsLng(mapCenterLng);
                        setGpsAddress(isAr ? 'موقع سلكي افتراضي من الخريطة' : 'Default pin street coordinate');
                      }
                    }}
                    className={`p-4 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      bookingType === 'home' 
                        ? 'bg-indigo-55 bg-indigo-50 border-indigo-500 text-indigo-900 shadow-sm font-extrabold' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    id="btn-booking-home"
                  >
                    <span>{t.atHome} ({isAr ? 'تكلفة الانتقال يحددها الطبيب المعالج لاحقاً' : 'Transit fee is decided by treating physician'})</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  {t.homeNotice}
                </p>
              </div>

              {/* INTEGRATED GEOLOCATION AND MAP ACCORDING TO USER DEMAND */}
              {bookingType === 'home' && (
                <div className="bg-slate-50/70 border border-indigo-100 p-4 rounded-2xl space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-2 pb-2 border-b border-indigo-100/50">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                    <h4 className="font-extrabold text-xs text-slate-800">{t.mapLocation}</h4>
                  </div>

                  <InteractiveMap
                    lang={language}
                    currency={currency}
                    initialLat={gpsLat || undefined}
                    initialLng={gpsLng || undefined}
                    onLocationSelect={(latitude, longitude, address) => {
                      setGpsLat(latitude);
                      setGpsLng(longitude);
                      setGpsAddress(address);
                    }}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t.bookingCategory}</label>
                <select
                  value={bookingTest}
                  onChange={(e) => setBookingTest(e.target.value)}
                  className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-teal-500 outline-none transition-all cursor-pointer"
                  id="booking-test-select"
                >
                  <option value="صورة دم كاملة (CBC)">{isAr ? 'صورة دم كاملة (CBC)' : 'Complete Blood Count (CBC)'}</option>
                  <option value="تحليل السكر الشامل والغلايكوزيل">{isAr ? 'تحليل السكر الشامل (FBS / HbA1c)' : 'Sugar Profile Total (FBS / HbA1c)'}</option>
                  <option value="وظائف دهون الكبد والكولسترول">{isAr ? 'وظائف دهون الكبد والكولسترول (LIPID)' : 'Lipid Panel Profile (LIPID)'}</option>
                  <option value="وظائف الكلى والكبد المتكاملة">{isAr ? 'وظائف الكلى والكبد المتكاملة (LIVER)' : 'Comprehensive Liver Profile (LIVER)'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t.bookingComments}</label>
                <input
                  type="text"
                  required
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder={t.bookingPlaceholder}
                  className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-teal-500 outline-none transition-all duration-150"
                  id="booking-notes"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold p-3.5 rounded-xl text-sm shadow-md duration-150 cursor-pointer"
                  id="btn-booking-submit"
                >
                  {t.btnSubmitBooking}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB CONTENT: COMPLAINTS & SUGGESTIONS */}
      {activeTab === 'complaints' && (
        <div className="bg-white rounded-2xl p-5 sm:p-8 border border-slate-100 shadow-sm text-sm animate-fadeIn">
          <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
            <ShieldQuestion className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-black text-slate-800">مركز تقديم الشكاوى والاقتراحات</h3>
          </div>

          <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
            نحن في معمل النيل نسعى لتقديم أعلى معايير الجودة والدقة. إذا كان لديك أي شكوى أو مقترح فيما يخص التحاليل، السرعة، المعاملة أو نظام التطبيق، يرجى ملء النموذج أدناه وسيتابع فريق الجودة والإدارة الطبية طلبك مباشرة.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Form Column */}
            <form onSubmit={handleComplaintSubmit} className="lg:col-span-3 space-y-4" id="complaint-form">
              {complaintSuccess ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-950 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-xs">تم تسجيل الشكوى/المقترح بنجاح!</h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      تم إصدار رقم مرجعي تلقائي للشكوى لمتابعتها مع الإدارة الطبية. نشكرك لمساعدتنا على تقديم خدمة أفضل.
                    </p>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">نوع الشكوى / المقترح:</label>
                <select
                  value={complaintCategory}
                  onChange={(e) => setComplaintCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-extrabold outline-none text-right cursor-pointer focus:border-teal-500 transition-all"
                >
                  <option value="technical">مشكلة تقنية داخل التطبيق أو الموقع (Technical)</option>
                  <option value="delay">تأخر في ظهور أو تسليم نتيجة الفحص (Result Delay)</option>
                  <option value="administrative">شكوى إدارية أو معاملة الموظفين (Administrative)</option>
                  <option value="billing">خطأ في الحسابات أو عملية الدفع (Billing)</option>
                  <option value="other">مقترحات أخرى للتطوير والتحسين (General Suggestion)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">الرقم المرجعي للفحص (اختياري):</label>
                <input
                  type="text"
                  placeholder="مثال: LAB-2026-001"
                  value={complaintTestId}
                  onChange={(e) => setComplaintTestId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono outline-none text-left"
                />
                <p className="text-[10px] text-slate-400 mt-1">يساعدنا في ربط شكواك بالبيانات الطبية لسرعة الفحص والتدقيق الإكلينيكي.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">تفاصيل الشكوى أو المقترح بالتفصيل:</label>
                <textarea
                  required
                  rows={4}
                  placeholder="اكتب هنا تفاصيل الشكوى أو اقتراحك للتطبيق أو جودة الفحص والتحاليل..."
                  value={complaintDetails}
                  onChange={(e) => setComplaintDetails(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none text-right focus:border-teal-500 transition-all leading-relaxed"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-6 py-3 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>إرسال الشكوى للمراجعة الطبية ✉</span>
                </button>
              </div>
            </form>

            {/* List Column */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="font-extrabold text-xs text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-1.5">
                <span>سجل شكواك النشطة ومتابعة الإدارة</span>
                <span className="bg-indigo-50 text-indigo-800 text-[9px] px-2 py-0.5 rounded-full font-bold">
                  {complaints.filter(c => c.phone === currentPatient.phone).length} شكاوى
                </span>
              </h4>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {complaints.filter(c => c.phone === currentPatient.phone).length === 0 ? (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center text-slate-400 text-xs py-10">
                    لا توجد شكاوى مسجلة مسبقاً لهذا الملف الهاتفي.
                  </div>
                ) : (
                  complaints
                    .filter(c => c.phone === currentPatient.phone)
                    .map((c) => (
                      <div key={c.id} className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-slate-400">{c.id}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                            c.status === 'resolved' 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                              : c.status === 'investigating'
                              ? 'bg-amber-50 text-amber-800 border border-amber-100'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {c.status === 'resolved' ? 'تم الحل والرد ✓' : c.status === 'investigating' ? 'قيد المتابعة والتحقيق ⚖' : 'قيد الانتظار ⏳'}
                          </span>
                        </div>

                        <div className="text-slate-500 text-[10px] font-bold">
                          الفئة: {c.category === 'technical' ? 'مشكلة تقنية للبرنامج' : c.category === 'delay' ? 'تأخر تسليم النتيجة' : c.category === 'billing' ? 'مشكلة مالية/دفع' : 'أخرى'}
                        </div>

                        <p className="text-slate-800 font-medium leading-relaxed">
                          {c.details}
                        </p>

                        {c.adminReply ? (
                          <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-2.5 mt-2 text-[11px] text-indigo-950">
                            <span className="font-extrabold text-indigo-800 block text-[10px] mb-1">رد الإدارة الطبية للـ مختبرات:</span>
                            <p className="font-medium">{c.adminReply}</p>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">بانتظار رد الإدارة ومسؤول المعمل.</div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
