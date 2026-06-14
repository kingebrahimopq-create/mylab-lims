import { Patient, LabTest, Appointment } from './types';

export const INITIAL_PATIENTS: Patient[] = [];

export const INITIAL_APPOINTMENTS: Appointment[] = [];

export const PARAMETER_TEMPLATES = {
  CBC: [
    { name: "Hemoglobin (Hb)", nameAr: "الهيموجلوبين", unit: "g/dL", minNormal: 12.0, maxNormal: 17.5 },
    { name: "White Blood Cells (WBC)", nameAr: "خلايا الدم البيضاء", unit: "10^3/µL", minNormal: 4.0, maxNormal: 11.0 },
    { name: "Red Blood Cells (RBC)", nameAr: "خلايا الدم الحمراء", unit: "10^6/µL", minNormal: 4.2, maxNormal: 5.9 },
    { name: "Platelets (PLT)", nameAr: "الصفائح الدموية", unit: "10^3/µL", minNormal: 150, maxNormal: 450 }
  ],
  LIPID: [
    { name: "Total Cholesterol", nameAr: "الكوليسترول الكلي", unit: "mg/dL", minNormal: 120, maxNormal: 200 },
    { name: "Triglycerides", nameAr: "الدهون الثلاثية", unit: "mg/dL", minNormal: 40, maxNormal: 150 },
    { name: "HDL Cholesterol", nameAr: "الكوليسترول النافع (HDL)", unit: "mg/dL", minNormal: 40, maxNormal: 60 },
    { name: "LDL Cholesterol", nameAr: "الكوليسترول الضار (LDL)", unit: "mg/dL", minNormal: 50, maxNormal: 130 }
  ],
  LIVER: [
    { name: "Alanine Aminotransferase (ALT)", nameAr: "إنزيم ALT", unit: "U/L", minNormal: 7, maxNormal: 56 },
    { name: "Aspartate Aminotransferase (AST)", nameAr: "إنزيم AST", unit: "U/L", minNormal: 10, maxNormal: 40 },
    { name: "Total Bilirubin", nameAr: "الصفراء الكلية", unit: "mg/dL", minNormal: 0.2, maxNormal: 1.2 },
    { name: "Alkaline Phosphatase (ALP)", nameAr: "الفوسفاتاز القلوي", unit: "U/L", minNormal: 44, maxNormal: 147 }
  ],
  GLUCOSE: [
    { name: "Fasting Blood Sugar", nameAr: "سكر الدم الصائم", unit: "mg/dL", minNormal: 70, maxNormal: 100 },
    { name: "Postprandial Glucose", nameAr: "سكر الدم بعد الأكل", unit: "mg/dL", minNormal: 80, maxNormal: 140 },
    { name: "HbA1c (Cumulative)", nameAr: "السكر التراكمي", unit: "%", minNormal: 4.0, maxNormal: 5.6 }
  ],
  THYROID: [
    { name: "TSH", nameAr: "الهرمون المنبه للغدة الدرقية", unit: "mIU/L", minNormal: 0.4, maxNormal: 4.0 },
    { name: "Free T3", nameAr: "هرمون الغدة الدرقية T3", unit: "pg/mL", minNormal: 2.3, maxNormal: 4.1 },
    { name: "Free T4", nameAr: "هرمون الغدة الدرقية T4", unit: "ng/dL", minNormal: 0.9, maxNormal: 2.3 }
  ],
  KIDNEY: [
    { name: "Creatinine", nameAr: "الكرياتينين", unit: "mg/dL", minNormal: 0.6, maxNormal: 1.2 },
    { name: "Blood Urea Nitrogen (BUN)", nameAr: "نيتروجين اليوريا", unit: "mg/dL", minNormal: 7, maxNormal: 20 },
    { name: "Uric Acid", nameAr: "حمض اليوريك", unit: "mg/dL", minNormal: 3.5, maxNormal: 7.2 }
  ]
};

export const INITIAL_TESTS: LabTest[] = [];

// Historical Glycemic trend data for charting
export const GLUCOSE_HISTORICAL_TREND: any[] = [];
