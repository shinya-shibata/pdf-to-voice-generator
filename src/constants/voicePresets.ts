import { VoicePreset } from "../types";

export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: "facebook/mms-tts-jpn",
    name: "日本語 - Meta MMS (高速・安定標準ボイス)",
    language: "Japanese",
    gender: "Female",
    description: "Hugging Face公式で安定稼働する高速な日本語音声合成モデル",
    recommendedFor: "確実かつ迅速に日本語ナレーションを生成したい場合",
  },
  {
    id: "facebook/mms-tts-eng",
    name: "English - Meta MMS (Fast & Reliable)",
    language: "English",
    gender: "Female",
    description: "High-speed and reliable English text-to-speech model",
    recommendedFor: "Fast and clear English narration without errors",
  },
  {
    id: "v2/ja_speaker_6",
    name: "日本語 - Suno Bark 女性 1 (アナウンサー風)",
    language: "Japanese",
    gender: "Female",
    description: "抑揚の自然なSuno Bark日本語女性ボイス（自動フォールバック機能付き）",
    recommendedFor: "説明文・ビジネス資料・論文解説",
  },
  {
    id: "v2/ja_speaker_3",
    name: "日本語 - Suno Bark 男性 1 (温かいトーン)",
    language: "Japanese",
    gender: "Male",
    description: "落ち着いた温かみのある男性ボイス",
    recommendedFor: "オーディオブック・ニュース・プレゼン",
  },
  {
    id: "v2/en_speaker_9",
    name: "English - Suno Bark Female (Broadcast Quality)",
    language: "English",
    gender: "Female",
    description: "Clear and articulate American English accent",
    recommendedFor: "Articles, Reports & Audiobooks",
  },
  {
    id: "v2/en_speaker_6",
    name: "English - Suno Bark Male (Engaging Presenter)",
    language: "English",
    gender: "Male",
    description: "Dynamic and clear natural speaking voice",
    recommendedFor: "Podcasts & Explainer Videos",
  },
];

