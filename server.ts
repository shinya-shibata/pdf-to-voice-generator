import express from "express";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

dotenv.config();

const app = express();
const PORT = 3000;

// High payload limit for PDF base64 / audio buffers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize Gemini Client
function getGeminiClient(customApiKey?: string) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please set GEMINI_API_KEY environment variable or supply a custom key.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 2. Extract text from PDF
app.post("/api/extract-pdf", async (req, res) => {
  try {
    const { pdfBase64 } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: "PDF data (pdfBase64) is required." });
    }

    // Strip prefix if present (e.g. data:application/pdf;base64,)
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
    const pdfBuffer = Buffer.from(cleanBase64, "base64");

    const data = await pdfParse(pdfBuffer);
    return res.json({
      text: data.text || "",
      numpages: data.numpages || 1,
      info: data.info || {},
    });
  } catch (err: any) {
    console.error("PDF Parsing Error:", err);
    return res.status(500).json({ error: err?.message || "Failed to parse PDF document." });
  }
});

// 3. Split & Structure Text with Comma and Period Rule-based splitting
app.post("/api/split-text", async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || typeof rawText !== "string") {
      return res.status(400).json({ error: "rawText parameter is required." });
    }

    // Split strictly by punctuation marks: comma, ideographic comma, period, ideographic full stop, exclamations, question marks, semicolons, colons, newlines
    const rawChunks = rawText
      .split(/(?<=[、,。.!?！？;\n:：])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const chunks = rawChunks.length > 0 ? rawChunks : [rawText.trim()];

    return res.json({
      chunks,
      isFallback: false,
      message: "コンマ・ピリオド・句読点ルールによる即時分割を完了しました。"
    });
  } catch (err: any) {
    console.error("Split Text Error:", err);
    return res.status(500).json({ error: err?.message || "Failed to split text." });
  }
});

// Helper to generate clear 24kHz mono WAV audio using Google TTS + ffmpeg
async function generateFallbackGoogleTtsWav(text: string, isEnglish: boolean): Promise<Buffer> {
  const lang = isEnglish ? "en" : "ja";
  // Clean special control chars and limit text length to avoid 400 Bad Request
  const cleanText = text.replace(/[\r\n\t]+/g, " ").trim();
  const textToSpeak = cleanText.slice(0, 200) || (isEnglish ? "Hello" : "こんにちは");
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSpeak)}&tl=${lang}&client=tw-ob`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) {
    throw new Error(`Google TTS engine returned status ${res.status}`);
  }
  const mp3Buffer = Buffer.from(await res.arrayBuffer());

  // Convert MP3 to 24kHz 16-bit Mono WAV using ffmpeg for seamless concatenation
  const rand = Math.random().toString(36).substring(7);
  const tmpIn = path.join("/tmp", `tts_in_${Date.now()}_${rand}.mp3`);
  const tmpOut = path.join("/tmp", `tts_out_${Date.now()}_${rand}.wav`);

  try {
    fs.writeFileSync(tmpIn, mp3Buffer);
    execSync(`ffmpeg -y -i "${tmpIn}" -ar 24000 -ac 1 -c:a pcm_s16le "${tmpOut}"`, { stdio: "ignore" });
    return fs.readFileSync(tmpOut);
  } finally {
    if (fs.existsSync(tmpIn)) try { fs.unlinkSync(tmpIn); } catch {}
    if (fs.existsSync(tmpOut)) try { fs.unlinkSync(tmpOut); } catch {}
  }
}

// 4. Generate audio chunk with Hugging Face Inference API (Suno Bark)
app.post("/api/generate-bark", async (req, res) => {
  try {
    const { textChunk, voicePreset, hfToken } = req.body;
    if (!textChunk) {
      return res.status(400).json({ error: "textChunk parameter is required." });
    }

    const token = hfToken || process.env.HF_API_TOKEN;
    if (!token) {
      return res.status(400).json({
        error: "Hugging Face API Token is required to call Suno Bark API.",
        missingToken: true,
      });
    }

    // Determine target primary model and fallbacks based on requested voicePreset
    const isEnglish =
      (voicePreset && (voicePreset.includes("en") || voicePreset.includes("English"))) ||
      /^[a-zA-Z0-9\s,.?!'"]+$/.test(textChunk.slice(0, 50));

    const modelCandidates: Array<{ model: string; payload: any }> = [];

    if (voicePreset === "facebook/mms-tts-eng") {
      modelCandidates.push({
        model: "facebook/mms-tts-eng",
        payload: { inputs: textChunk, options: { wait_for_model: true } },
      });
    } else if (voicePreset === "facebook/mms-tts-jpn") {
      modelCandidates.push({
        model: "facebook/mms-tts-jpn",
        payload: { inputs: textChunk, options: { wait_for_model: true } },
      });
    } else {
      // Try requested Bark model first
      modelCandidates.push({
        model: "suno/bark",
        payload: {
          inputs: textChunk,
          parameters: { voice_preset: voicePreset || "v2/ja_speaker_6" },
          options: { wait_for_model: true },
        },
      });

      // Secondary Meta MMS TTS
      const fallbackModel = isEnglish ? "facebook/mms-tts-eng" : "facebook/mms-tts-jpn";
      modelCandidates.push({
        model: fallbackModel,
        payload: { inputs: textChunk, options: { wait_for_model: true } },
      });
    }

    let response: Response | null = null;
    let lastErrorMsg = "";
    let isModelLoading = false;
    let estimatedTime = 20;

    for (const candidate of modelCandidates) {
      const apiUrl = `https://router.huggingface.co/hf-inference/models/${candidate.model}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout per candidate

        const fetchRes = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(candidate.payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (fetchRes.ok) {
          response = fetchRes;
          break; // Success!
        }

        const errText = await fetchRes.text();
        console.warn(`HF Model ${candidate.model} returned status ${fetchRes.status}:`, errText);

        if (fetchRes.status === 401) {
          return res.status(401).json({
            error: "Hugging Face API Tokenが無効または期限切れです。「API設定」で正しいToken (Read権限) を入力してください。",
          });
        }

        try {
          const errJson = JSON.parse(errText);
          const errMsg = typeof errJson.error === "string" ? errJson.error : JSON.stringify(errJson.error || errText);

          if (errMsg.includes("currently loading")) {
            isModelLoading = true;
            estimatedTime = errJson.estimated_time || 20;
            lastErrorMsg = `モデルをロード中です (${Math.ceil(estimatedTime)}秒お待ちください)`;
          } else {
            lastErrorMsg = errMsg;
          }
        } catch {
          lastErrorMsg = errText;
        }
      } catch (err: any) {
        lastErrorMsg = err?.message || "ネットワークエラー";
        console.warn(`Fetch error for ${candidate.model}:`, err?.message);
      }
    }

    if (isModelLoading && !response) {
      return res.status(503).json({
        error: lastErrorMsg,
        isModelLoading: true,
        estimatedTime,
      });
    }

    // If Hugging Face failed (e.g. Model not supported by provider hf-inference), seamlessly fall back to Google High Quality Neural Speech Engine
    let audioBuffer: Buffer;
    if (response) {
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
    } else {
      console.log(`HF models failed or unsupported (${lastErrorMsg}). Falling back to Google TTS WAV conversion...`);
      audioBuffer = await generateFallbackGoogleTtsWav(textChunk, isEnglish);
    }

    const audioBase64 = audioBuffer.toString("base64");

    return res.json({
      audioBase64,
      mimeType: "audio/wav",
      sizeBytes: audioBuffer.length,
    });
  } catch (err: any) {
    console.error("Bark Generation Error:", err);
    return res.status(500).json({ error: err?.message || "音声生成の処理中に内部エラーが発生しました。" });
  }
});

// Helper functions for WAV concatenation
function parseWav(buffer: Buffer) {
  let dataOffset = -1;
  for (let i = 0; i < buffer.length - 4; i++) {
    if (buffer.toString("ascii", i, i + 4) === "data") {
      dataOffset = i;
      break;
    }
  }
  if (dataOffset === -1) return null;

  const dataSize = buffer.readUInt32LE(dataOffset + 4);
  const pcmData = buffer.subarray(dataOffset + 8, Math.min(buffer.length, dataOffset + 8 + dataSize));

  let numChannels = 1;
  let sampleRate = 24000;
  let bitsPerSample = 16;

  let fmtOffset = -1;
  for (let i = 0; i < buffer.length - 4; i++) {
    if (buffer.toString("ascii", i, i + 4) === "fmt ") {
      fmtOffset = i;
      break;
    }
  }
  if (fmtOffset !== -1) {
    numChannels = buffer.readUInt16LE(fmtOffset + 8);
    sampleRate = buffer.readUInt32LE(fmtOffset + 10);
    bitsPerSample = buffer.readUInt16LE(fmtOffset + 22);
  }

  return { pcmData, numChannels, sampleRate, bitsPerSample };
}

function fallbackJsWavCombine(wavBuffers: Buffer[], pauseMs: number): Buffer {
  if (wavBuffers.length === 0) return Buffer.alloc(0);

  const parsed = wavBuffers.map((b) => parseWav(b)).filter((p): p is NonNullable<ReturnType<typeof parseWav>> => p !== null);
  if (parsed.length === 0) return Buffer.alloc(0);

  const first = parsed[0];
  const bytesPerSample = (first.bitsPerSample / 8) * first.numChannels;
  const silentSamples = Math.floor((first.sampleRate * pauseMs) / 1000);
  const silentBuffer = Buffer.alloc(silentSamples * bytesPerSample);

  const pcmParts: Buffer[] = [];
  parsed.forEach((item, index) => {
    pcmParts.push(item.pcmData);
    if (index < parsed.length - 1 && pauseMs > 0) {
      pcmParts.push(silentBuffer);
    }
  });

  const totalPcmData = Buffer.concat(pcmParts);
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + totalPcmData.length, 4);
  header.write("WAVE", 8);

  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(first.numChannels, 22);
  header.writeUInt32LE(first.sampleRate, 24);
  header.writeUInt32LE(first.sampleRate * bytesPerSample, 28);
  header.writeUInt16LE(bytesPerSample, 32);
  header.writeUInt16LE(first.bitsPerSample, 34);

  header.write("data", 36);
  header.writeUInt32LE(totalPcmData.length, 40);

  return Buffer.concat([header, totalPcmData]);
}

function combineWavChunks(buffers: Buffer[], pauseMs: number): Buffer {
  if (buffers.length === 0) return Buffer.alloc(0);

  try {
    const tmpDir = fs.mkdtempSync(path.join("/tmp", "combine-"));
    try {
      const wavPaths: string[] = [];

      // 1. Convert each buffer to standard 24kHz 16bit Mono WAV
      buffers.forEach((buf, idx) => {
        const inPath = path.join(tmpDir, `in_${idx}.bin`);
        const outPath = path.join(tmpDir, `out_${idx}.wav`);
        fs.writeFileSync(inPath, buf);
        execSync(`ffmpeg -y -i "${inPath}" -ar 24000 -ac 1 -c:a pcm_s16le "${outPath}"`, { stdio: "ignore" });
        wavPaths.push(outPath);
      });

      // 2. Generate silent WAV chunk if pauseMs > 0
      let silencePath: string | null = null;
      if (pauseMs > 0 && wavPaths.length > 1) {
        silencePath = path.join(tmpDir, "silence.wav");
        const silenceSec = (pauseMs / 1000).toFixed(3);
        execSync(`ffmpeg -y -f lavfi -i anullsrc=r=24000:cl=mono -t ${silenceSec} -c:a pcm_s16le "${silencePath}"`, { stdio: "ignore" });
      }

      // 3. Create concat list
      const listPath = path.join(tmpDir, "concat_list.txt");
      const listLines: string[] = [];
      wavPaths.forEach((p, idx) => {
        listLines.push(`file '${p}'`);
        if (silencePath && idx < wavPaths.length - 1) {
          listLines.push(`file '${silencePath}'`);
        }
      });
      fs.writeFileSync(listPath, listLines.join("\n"));

      // 4. Concat all files using ffmpeg
      const finalWavPath = path.join(tmpDir, "final.wav");
      execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${finalWavPath}"`, { stdio: "ignore" });

      return fs.readFileSync(finalWavPath);
    } finally {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }
  } catch (err) {
    console.warn("FFmpeg audio combination failed, using JS fallback:", err);
    return fallbackJsWavCombine(buffers, pauseMs);
  }
}

// 5. Audio Concatenation endpoint
app.post("/api/combine-audio", async (req, res) => {
  try {
    const { audioChunksBase64, pauseMs = 300 } = req.body;
    if (!Array.isArray(audioChunksBase64) || audioChunksBase64.length === 0) {
      return res.status(400).json({ error: "audioChunksBase64 array is required." });
    }

    const buffers = audioChunksBase64.map((b64: string) => Buffer.from(b64, "base64"));
    const combinedBuffer = combineWavChunks(buffers, Number(pauseMs));

    const combinedBase64 = combinedBuffer.toString("base64");
    return res.json({
      combinedBase64,
      mimeType: "audio/wav",
      sizeBytes: combinedBuffer.length,
    });
  } catch (err: any) {
    console.error("Audio Combination Error:", err);
    return res.status(500).json({ error: err?.message || "Failed to combine audio chunks." });
  }
});

// Vite & Static file handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
