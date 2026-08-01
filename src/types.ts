export interface VoicePreset {
  id: string;
  name: string;
  language: "Japanese" | "English" | "Chinese" | "Other";
  gender: "Female" | "Male";
  description: string;
  recommendedFor: string;
}

export interface TextChunk {
  id: string;
  text: string;
  status: "idle" | "generating" | "success" | "error";
  audioBase64?: string;
  errorMessage?: string;
  durationSec?: number;
}

export interface AppSettings {
  geminiApiKey: string;
  hfApiToken: string;
  voicePreset: string;
  pauseDurationMs: number;
  sleepTimeSec: number;
}

export type ActiveStep = "upload" | "chunking" | "generation";
