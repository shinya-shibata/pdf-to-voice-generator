import React, { useState } from "react";
import { X, Key, Sliders, Volume2, ExternalLink, Check, ShieldCheck, Info } from "lucide-react";
import { AppSettings } from "../types";
import { VOICE_PRESETS } from "../constants/voicePresets";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [form, setForm] = useState<AppSettings>(settings);
  const [showSavedToast, setShowSavedToast] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">システム & API 設定</h2>
              <p className="text-xs text-slate-400">Hugging Face API Token 及び音声パラメータ設定</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Hugging Face Token Section */}
          <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold flex items-center space-x-2 text-indigo-300">
                <Key className="w-4 h-4 text-indigo-400" />
                <span>Hugging Face API Token (必須)</span>
              </label>
              <a
                href="https://huggingface.co/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 underline"
              >
                <span>Tokenの取得はこちら (無料)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <input
              type="password"
              placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxx"
              value={form.hfApiToken}
              onChange={(e) => setForm({ ...form, hfApiToken: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-400 leading-relaxed">
              * Suno Bark（HF Inference API）を呼び出すために使用します。Hugging Faceの「User Access Tokens」で<code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">Read</code>権限のTokenを作成して貼り付けてください。
            </p>
          </div>

          {/* Gemini API Key Section */}
          <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold flex items-center space-x-2 text-indigo-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Google Gemini API Key (任意)</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1 underline"
              >
                <span>AI Studio Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <input
              type="password"
              placeholder="空欄の場合はサーバー組み込み環境変数を使用します"
              value={form.geminiApiKey}
              onChange={(e) => setForm({ ...form, geminiApiKey: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-400">
              * 文章をSuno Barkに最適化された20〜30文字程度の短文にスマート分割するために使用します（Gemini 3.6 Flash）。
            </p>
          </div>

          {/* Voice Preset Selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold flex items-center space-x-2 text-slate-200">
              <Volume2 className="w-4 h-4 text-purple-400" />
              <span>Suno Bark 音声プリセット (Voice Preset)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {VOICE_PRESETS.map((preset) => {
                const isSelected = form.voicePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setForm({ ...form, voicePreset: preset.id })}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      isSelected
                        ? "bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500"
                        : "bg-slate-800/60 border-slate-700/60 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-100">{preset.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{preset.description}</p>
                    <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-700">
                      {preset.recommendedFor}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audio Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Pause Duration */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">文と文の間の無音時間</span>
                <span className="font-mono text-indigo-400 font-bold">{form.pauseDurationMs} ms</span>
              </div>
              <input
                type="range"
                min={0}
                max={1000}
                step={50}
                value={form.pauseDurationMs}
                onChange={(e) => setForm({ ...form, pauseDurationMs: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0ms (間隔なし)</span>
                <span>150ms (テンポ良い)</span>
                <span>500ms (ゆったり)</span>
              </div>
            </div>

            {/* API Delay */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">APIリクエスト間隔 (レート制限対策)</span>
                <span className="font-mono text-indigo-400 font-bold">{form.sleepTimeSec.toFixed(1)} 秒</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={5.0}
                step={0.5}
                value={form.sleepTimeSec}
                onChange={(e) => setForm({ ...form, sleepTimeSec: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>1.0s (高速)</span>
                <span>2.0s (標準)</span>
                <span>5.0s (安全)</span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-950/30 border border-indigo-500/20 p-3 rounded-xl flex items-start space-x-2 text-xs text-indigo-200">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p>
              Hugging Face Inference APIのモデル初回呼び出し時は、モデルの読み込み（ウォームアップ）に20秒前後かかる場合があります。自動リトライ機能が組み込まれています。
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {showSavedToast ? (
              <span className="text-emerald-400 font-medium flex items-center space-x-1">
                <Check className="w-4 h-4" /> <span>設定を保存しました！</span>
              </span>
            ) : (
              <span>設定はローカルブラウザに保存されます</span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/30 transition-all"
            >
              設定を保存する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
