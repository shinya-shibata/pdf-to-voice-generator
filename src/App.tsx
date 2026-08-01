import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { FileUploader } from "./components/FileUploader";
import { TextChunkEditor } from "./components/TextChunkEditor";
import { VoiceGenerator } from "./components/VoiceGenerator";
import { SettingsModal } from "./components/SettingsModal";
import { HelpModal } from "./components/HelpModal";
import { ActiveStep, AppSettings, TextChunk } from "./types";

const LOCAL_STORAGE_KEY = "suno_bark_pdf_voice_settings_v1";

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: "",
  hfApiToken: "",
  voicePreset: "v2/ja_speaker_6",
  pauseDurationMs: 150,
  sleepTimeSec: 2.0,
};

export default function App() {
  const [activeStep, setActiveStep] = useState<ActiveStep>("upload");
  const [rawText, setRawText] = useState<string>("");
  const [chunks, setChunks] = useState<TextChunk[]>([]);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SETTINGS;
  });

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.error(e);
    }
  };

  // Check if step navigation is allowed
  const canNavigateToChunking = Boolean(rawText.trim());
  const canNavigateToGeneration = chunks.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Header
        activeStep={activeStep}
        setActiveStep={setActiveStep}
        onOpenSettings={() => setIsSettingsOpen(true)}
        settings={settings}
        canNavigateToChunking={canNavigateToChunking}
        canNavigateToGeneration={canNavigateToGeneration}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeStep === "upload" && (
          <FileUploader
            rawText={rawText}
            setRawText={(text) => {
              setRawText(text);
              setChunks([]); // Reset chunks when raw text changes
            }}
            onProceedToChunking={() => setActiveStep("chunking")}
            isLoadingPdf={isLoadingPdf}
            setIsLoadingPdf={setIsLoadingPdf}
          />
        )}

        {activeStep === "chunking" && (
          <TextChunkEditor
            rawText={rawText}
            chunks={chunks}
            setChunks={setChunks}
            geminiApiKey={settings.geminiApiKey}
            onProceedToGeneration={() => setActiveStep("generation")}
            onBackToUpload={() => setActiveStep("upload")}
          />
        )}

        {activeStep === "generation" && (
          <VoiceGenerator
            chunks={chunks}
            setChunks={setChunks}
            settings={settings}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onBackToChunking={() => setActiveStep("chunking")}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <p>PDF & Document Voice Studio — Powered by Google Gemini 3.6 & Suno Bark (Hugging Face Inference API)</p>
      </footer>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
    </div>
  );
}
