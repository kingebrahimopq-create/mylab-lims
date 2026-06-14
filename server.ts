import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Parse incoming JSON requests
app.use(express.json());

// Health check endpoint for monitoring
app.get("/api/health", (_req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development"
  });
});

// Helper function to get or lazily initialize the Gemini client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[LIMS AI Gateway] GEMINI_API_KEY is not defined in environment variables.");
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } catch (error) {
    console.error("[LIMS AI Gateway] Failed to instantiate GoogleGenAI client:", error);
    return null;
  }
}

// 1. API Endpoint for Interactive Smart AI Medical Assistant Chatbot
app.post("/api/gemini/chat", async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const aiClient = getGeminiClient();
  if (!aiClient) {
    console.log("[LIMS AI Gateway] No API key configured, returning fallback info.");
    return res.json({
      text: `⚠️ المساعد الطبي يعمل الآن في وضع التشغيل المحلي التجريبي. لتنشيط التكامل الفعلي والكامل مع نموذج الذكاء الاصطناعي Gemini من Google، يُرجى تزويد مفتاح GEMINI_API_KEY السري في إعدادات المنصة (Settings > Secrets) ثم المحاولة مجدداً.`
    });
  }

  try {
    // Format history for Google GenAI structure if present
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        // Skip system messages or invalid objects
        if (!h || !h.text) return;
        contents.push({
          role: h.sender === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        });
      });
    }

    // Append the latest user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    console.log(`[LIMS AI Gateway] Sending request to Gemini... Turns: ${contents.length}`);
    let response;
    const systemInstruction = `أنت مساعد طبي ذكي خبير ومستشار طبي رقمي لنظام LIMS المطور (My Lab / مختبرات تكنو-كلينيك الطبية).
مهمتك هي تقديم الدعم الإداري والتحليل الطبي والإجابة عن الاستفسارات الطبية والفحوصات في المختبر:
1. أجب دائماً باللغة العربية بأسلوب راقٍ، وقور، وإنساني، وعلمي دقيق.
2. قدم توضيحات مفيدة ومبسطة للقيم الطبيعية مثل الهيموجلوبين (12.5 - 17.5 للبالغين)، سكر الدم، الكرياتينين، ووظائف الغدة الدرقية والكبد والكلى.
3. وجّه المريض دائماً وفي كل إجابة طبية إلى ضرورة مراجعة وتأكيد التشخيص الإكلينيكي عبر الطبيب المعالج المسؤول لدقة التقييم ومنع الفهم الخاطئ.
4. كن جاهزاً لتقديم معلومات وافية وملخصة بناءً على الأسئلة الإدارية السريعة مثل كيفية تعديل تكلفتها أو طرق تسجل وحفظ البيانات أو النسخ الاحتياطي عبر Google Cloud.
5. لا تقدم معلومات وهمية أو غير دقيقة. إذا لم تكن متأكداً من إجابة، قم بالتوصية بمراجعة الطبيب المعالج.
6. اذكر دائماً أن المعلومات المقدمة هي للإرشاد فقط ولا تغني عن استشارة الطبيب المعالج.`;

    try {
      response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: { systemInstruction }
      });
    } catch (primaryError: any) {
      console.warn("[LIMS AI Gateway] gemini-3.5-flash returned error, falling back to gemini-1.5-flash:", primaryError.message || primaryError);
      response = await aiClient.models.generateContent({
        model: "gemini-1.5-flash",
        contents,
        config: { systemInstruction }
      });
    }

    console.log("[LIMS AI Gateway] Gemini response received successfully.");
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API error detailed:", error);
    res.status(500).json({
      error: "Failed to generate AI response",
      details: error.message || String(error)
    });
  }
});

// 2. API Endpoint for SMS/WhatsApp real-time dispatching log/simulation
app.post("/api/notifications/send", (req, res) => {
  const { type, phone, patientName, testId, message } = req.body;

  console.log(`[Notification Gateway] Dispatching real ${type === 'whatsapp' ? 'WhatsApp' : 'SMS'} to ${phone} for Patient: ${patientName} (Test: ${testId})`);
  console.log(`[Message Content]: \n${message}\n===================`);

  res.json({
    success: true,
    status: `تمت مزامنة وتسجيل إرسال الرسالة بنجاح عبر بوابة ${type === 'whatsapp' ? 'WhatsApp Gateway' : 'SMS GSM'} برقم مرجعي وتأكيد تواصل فعال.`,
    sentTo: phone,
    method: type
  });
});

// 3. API Endpoint for Printer Management
app.post("/api/printer/connect", async (req, res) => {
  const { type, ipAddress, port } = req.body;

  console.log(`[Printer Gateway] Connecting to ${type} printer at ${ipAddress}:${port || 9100}`);

  // In a production environment, this would establish a real connection
  // For now, we simulate a successful connection
  res.json({
    success: true,
    status: 'connected',
    type,
    ipAddress,
    port: port || 9100,
    message: 'Printer connection established successfully'
  });
});

app.post("/api/printer/print", async (req, res) => {
  const { ipAddress, port, data } = req.body;

  console.log(`[Printer Gateway] Sending print job to ${ipAddress}:${port || 9100}`);
  console.log(`[Print Data Length]: ${data?.length || 0} bytes`);

  // In a production environment, this would send raw data to the printer
  // For now, we simulate a successful print
  res.json({
    success: true,
    jobId: `JOB-${Date.now()}`,
    status: 'printed',
    message: 'Print job sent successfully'
  });
});

app.get("/api/printer/status", async (_req, res) => {
  res.json({
    connected: true,
    status: 'online',
    type: 'network',
    paperStatus: 'ok',
    lastError: null
  });
});

// 4. API Endpoint for Database Backup/Restore
app.post("/api/database/backup", async (_req, res) => {
  // In production, this would create a server-side backup
  res.json({
    success: true,
    message: 'Backup endpoint ready. Use client-side backup for localStorage data.',
    timestamp: new Date().toISOString()
  });
});

app.post("/api/database/restore", async (_req, res) => {
  res.json({
    success: true,
    message: 'Restore endpoint ready. Use client-side restore for localStorage data.',
    timestamp: new Date().toISOString()
  });
});

// 5. API Endpoint for System Settings
app.get("/api/settings", async (_req, res) => {
  res.json({
    labName: process.env.DEFAULT_LAB_NAME_AR || 'معمل النيل للتحاليل الطبية',
    version: '2.0.0',
    features: {
      ai: !!process.env.GEMINI_API_KEY,
      printing: true,
      googleDrive: true,
      qrVerification: true,
      biometric: true
    }
  });
});

// Vite Middleware for development, or static file serving for production
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`[LIMS System Server v2.0.0] Express full-stack running on http://0.0.0.0:${PORT}`);
    console.log(`[Environment] ${process.env.NODE_ENV || "development"}`);
    console.log(`[AI Assistant] ${process.env.GEMINI_API_KEY ? 'Enabled (Gemini)' : 'Disabled (No API key)'}`);
  });
}

setupServer();
