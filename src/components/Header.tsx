import React from "react";
import { Mic, Settings, Sparkles, FileText, Volume2, HelpCircle } from "lucide-react";
import { ActiveStep, AppSettings } from "../types";

interface HeaderProps {
  activeStep: ActiveStep;
  setActiveStep: (step: ActiveStep) => void;
  onOpenSettings: () => void;
  settings: AppSettings;
  canNavigateToChunking: boolean;
  canNavigateToGeneration: boolean;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeStep,
  setActiveStep,
  onOpenSettings,
  settings,
  canNavigateToChunking,
  canNavigateToGeneration,
  onOpenHelp,
}) => {
  const steps: { id: ActiveStep; label: string; icon: React.ReactNode; enabled: boolean }[] = [
    { id: "upload", label: "1. ドキュメント入力", icon: <FileText className="w-4 h-4" />, enabled: true },
    { id: "chunking", label: "2. Gemini文分割", icon: <Sparkles className="w-4 h-4" />, enabled: canNavigateToChunking },
    { id: "generation", label: "3. Suno Bark音声生成", icon: <Volume2 className="w-4 h-4" />, enabled: canNavigateToGeneration },
  ];

  const isHfConfigured = Boolean(settings.hfApiToken && settings.hfApiToken.trim().length > 0);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveStep("upload")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/20 ring-1 ring-white/20">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  PDF & Document Voice Studio
                </h1>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Suno Bark + Gemini 3.6
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Geminiでスマート分割 ➔ Hugging Face Suno Barkで自然読み上げ
              </p>
            </div>
          </div>

          {/* Stepper Navigation */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            {steps.map((step) => {
              const isActive = activeStep === step.id;
              const isDisabled = !step.enabled;

              return (
                <button
                  key={step.id}
                  disabled={isDisabled}
                  onClick={() => setActiveStep(step.id)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : isDisabled
                      ? "text-slate-500 cursor-not-allowed opacity-50"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/60"
                  }`}
                >
                  {step.icon}
                  <span>{step.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Controls & API Settings Trigger */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenHelp}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center space-x-1"
              title="使い方ガイド"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">ガイド</span>
            </button>

            <button
              onClick={onOpenSettings}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                isHfConfigured
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40"
                  : "bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/40"
              }`}
            >
              <Settings className="w-4 h-4 animate-spin-slow" />
              <span>API設定</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isHfConfigured ? "bg-emerald-400 shadow-sm shadow-emerald-400" : "bg-amber-400"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
