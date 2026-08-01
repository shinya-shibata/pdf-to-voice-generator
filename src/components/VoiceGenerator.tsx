import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Volume2,
  Play,
  Pause,
  Download,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Key,
  Settings,
  AudioWaveform as Waveform,
  Check,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { TextChunk, AppSettings } from "../types";
import { VOICE_PRESETS } from "../constants/voicePresets";

interface VoiceGeneratorProps {
  chunks: TextChunk[];
  setChunks: React.Dispatch<React.SetStateAction<TextChunk[]>>;
  settings: AppSettings;
  onOpenSettings: () => void;
  onBackToChunking: () => void;
}

export const VoiceGenerator: React.FC<VoiceGeneratorProps> = ({
  chunks,
  setChunks,
  settings,
  onOpenSettings,
  onBackToChunking,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneratingIndex, setCurrentGeneratingIndex] = useState<number | null>(null);
  const [combinedAudioUrl, setCombinedAudioUrl] = useState<string | null>(null);
  const [combinedAudioBase64, setCombinedAudioBase64] = useState<string | null>(null);
  const [isCombining, setIsCombining] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isPlayingMaster, setIsPlayingMaster] = useState(false);
  const [playingChunkId, setPlayingChunkId] = useState<string | null>(null);
  const [masterProgress, setMasterProgress] = useState(0);

  const masterAudioRef = useRef<HTMLAudioElement | null>(null);
  const chunkAudioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<boolean>(false);

  const selectedPresetObj = VOICE_PRESETS.find((p) => p.id === settings.voicePreset) || VOICE_PRESETS[0];

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Generate a single chunk
  const generateSingleChunk = async (
    chunk: TextChunk,
    retryCount = 0
  ): Promise<{ success: boolean; audioBase64?: string; error?: string }> => {
    try {
      const res = await fetch("/api/generate-bark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textChunk: chunk.text,
          voicePreset: settings.voicePreset,
          hfToken: settings.hfApiToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.isModelLoading && retryCount < 5) {
          // Model loading, wait and retry
          const waitSec = Math.max(5, Math.ceil(data.estimatedTime || 15));
          console.log(`Hugging Face Model loading. Waiting ${waitSec}s (retry ${retryCount + 1})...`);
          await sleep(waitSec * 1000);
          return generateSingleChunk(chunk, retryCount + 1);
        }
        throw new Error(data.error || `音声生成エラー (HTTP ${res.status})`);
      }

      return { success: true, audioBase64: data.audioBase64 };
    } catch (err: any) {
      return { success: false, error: err.message || "ネットワークエラーが発生しました" };
    }
  };

  // Combine generated audio chunks
  const combineAudioChunks = useCallback(async (audioList: string[]) => {
    if (audioList.length === 0) {
      setGlobalError("結合できる完了済みの音声ブロックがありません。");
      return;
    }

    setIsCombining(true);
    setGlobalError(null);
    try {
      const res = await fetch("/api/combine-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioChunksBase64: audioList,
          pauseMs: settings.pauseDurationMs,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "音声の結合処理に失敗しました。");
      }

      setCombinedAudioBase64(data.combinedBase64);
      const blob = new Blob(
        [Uint8Array.from(atob(data.combinedBase64), (c) => c.charCodeAt(0))],
        { type: "audio/wav" }
      );
      const url = URL.createObjectURL(blob);
      setCombinedAudioUrl(url);
    } catch (err: any) {
      console.error(err);
      setGlobalError(err.message || "音声結合中にエラーが発生しました。");
    } finally {
      setIsCombining(false);
    }
  }, [settings.pauseDurationMs]);

  // Retry only failed chunks
  const retryFailedChunks = async () => {
    setIsGenerating(true);
    setGlobalError(null);
    abortControllerRef.current = false;

    const currentChunks = [...chunks];
    for (let i = 0; i < currentChunks.length; i++) {
      if (abortControllerRef.current) break;
      if (currentChunks[i].status !== "error") continue;

      setCurrentGeneratingIndex(i);
      setChunks((prev) =>
        prev.map((c, idx) => (idx === i ? { ...c, status: "generating", errorMessage: undefined } : c))
      );

      const result = await generateSingleChunk(currentChunks[i]);
      if (abortControllerRef.current) break;

      if (result.success && result.audioBase64) {
        setChunks((prev) =>
          prev.map((c, idx) =>
            idx === i ? { ...c, status: "success", audioBase64: result.audioBase64 } : c
          )
        );
      } else {
        setChunks((prev) =>
          prev.map((c, idx) =>
            idx === i ? { ...c, status: "error", errorMessage: result.error || "生成失敗" } : c
          )
        );
      }

      await sleep(settings.sleepTimeSec * 1000);
    }

    setIsGenerating(false);
    setCurrentGeneratingIndex(null);
  };

  // Start sequential batch audio generation loop
  const startFullGeneration = async () => {
    if (!settings.hfApiToken) {
      setGlobalError("Hugging Face API Token が設定されていません。右上の「API設定」からTokenを入力してください。");
      onOpenSettings();
      return;
    }

    setIsGenerating(true);
    setGlobalError(null);
    setCombinedAudioUrl(null);
    setCombinedAudioBase64(null);
    abortControllerRef.current = false;

    const updatedChunks = [...chunks];
    const generatedAudioBase64List: string[] = [];

    for (let i = 0; i < updatedChunks.length; i++) {
      if (abortControllerRef.current) break;

      setCurrentGeneratingIndex(i);

      // Update current chunk status to generating
      setChunks((prev) =>
        prev.map((c, idx) => (idx === i ? { ...c, status: "generating", errorMessage: undefined } : c))
      );

      const result = await generateSingleChunk(updatedChunks[i]);

      if (abortControllerRef.current) break;

      if (result.success && result.audioBase64) {
        generatedAudioBase64List.push(result.audioBase64);
        setChunks((prev) =>
          prev.map((c, idx) =>
            idx === i ? { ...c, status: "success", audioBase64: result.audioBase64 } : c
          )
        );
      } else {
        setChunks((prev) =>
          prev.map((c, idx) =>
            idx === i
              ? { ...c, status: "error", errorMessage: result.error || "生成失敗" }
              : c
          )
        );
      }

      // Rate limit interval wait
      if (i < updatedChunks.length - 1 && !abortControllerRef.current) {
        await sleep(settings.sleepTimeSec * 1000);
      }
    }

    setIsGenerating(false);
    setCurrentGeneratingIndex(null);

    // Combine successful chunks
    if (generatedAudioBase64List.length > 0 && !abortControllerRef.current) {
      await combineAudioChunks(generatedAudioBase64List);
    }
  };

  const cancelGeneration = () => {
    abortControllerRef.current = true;
    setIsGenerating(false);
    setCurrentGeneratingIndex(null);
  };

  // Individual Chunk audio play
  const playChunkAudio = (chunk: TextChunk) => {
    if (!chunk.audioBase64) return;

    if (playingChunkId === chunk.id && chunkAudioRef.current) {
      chunkAudioRef.current.pause();
      setPlayingChunkId(null);
      return;
    }

    const blob = new Blob(
      [Uint8Array.from(atob(chunk.audioBase64), (c) => c.charCodeAt(0))],
      { type: "audio/wav" }
    );
    const url = URL.createObjectURL(blob);

    if (chunkAudioRef.current) {
      chunkAudioRef.current.src = url;
      chunkAudioRef.current.play();
      setPlayingChunkId(chunk.id);
    }
  };

  // Master Audio player controls
  const toggleMasterPlay = () => {
    if (!masterAudioRef.current || !combinedAudioUrl) return;

    if (isPlayingMaster) {
      masterAudioRef.current.pause();
      setIsPlayingMaster(false);
    } else {
      masterAudioRef.current.play();
      setIsPlayingMaster(true);
    }
  };

  const handleDownload = () => {
    if (!combinedAudioUrl) return;
    const a = document.createElement("a");
    a.href = combinedAudioUrl;
    a.download = "suno_bark_long_output.wav";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const completedCount = chunks.filter((c) => c.status === "success").length;
  const errorCount = chunks.filter((c) => c.status === "error").length;
  const progressPercent = chunks.length > 0 ? Math.round((completedCount / chunks.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Volume2 className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Step 3: AI音声合成 & 結合</h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            選択ボイス: <strong className="text-purple-300">{selectedPresetObj.name}</strong> / 無音間隔: {settings.pauseDurationMs}ms
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            ※ Bark非対応時もMeta MMS高品質TTS（日本語/英語）に自動フォールバックして確実に読み上げます。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!isGenerating ? (
            <>
              <button
                onClick={startFullGeneration}
                className="px-5 py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-600/30 flex items-center space-x-2 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <Sparkles className="w-4 h-4" />
                <span>AI音声生成ループを開始</span>
              </button>
            </>
          ) : (
            <button
              onClick={cancelGeneration}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-red-300 bg-red-950/60 border border-red-500/40 hover:bg-red-900/60 transition-all flex items-center space-x-1.5"
            >
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              <span>生成を一時停止</span>
            </button>
          )}
        </div>
      </div>


      {!settings.hfApiToken && (
        <div className="bg-amber-950/50 border border-amber-500/40 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3 text-amber-200 text-xs">
            <Key className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold">Hugging Face API Tokenが必要です</p>
              <p className="text-amber-300/80">Suno Barkで音声生成を行うため、Hugging Faceの無料API Tokenを入力してください。</p>
            </div>
          </div>
          <button
            onClick={onOpenSettings}
            className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-400 transition-colors shrink-0"
          >
            API設定を開く
          </button>
        </div>
      )}

      {globalError && (
        <div className="bg-red-950/50 border border-red-500/40 p-4 rounded-xl text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-300 flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>進行状況: {completedCount} / {chunks.length} ブロック完了</span>
            {errorCount > 0 && <span className="text-red-400 font-normal">({errorCount} 件エラー)</span>}
          </span>
          <span className="font-mono text-indigo-400">{progressPercent}%</span>
        </div>

        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 shadow-sm shadow-indigo-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {isGenerating && currentGeneratingIndex !== null && (
          <p className="text-xs text-indigo-300 animate-pulse flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>
              [{currentGeneratingIndex + 1}/{chunks.length}] 音声生成中: &quot;{chunks[currentGeneratingIndex]?.text}&quot;
            </span>
          </p>
        )}
      </div>

      {/* Master Audio Player Card */}
      {combinedAudioUrl && (
        <div className="bg-gradient-to-r from-indigo-950/80 via-purple-950/80 to-slate-900 border border-indigo-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Waveform className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">完成した音声ファイル (長尺WAV)</h3>
                <p className="text-xs text-slate-300">
                  全 {completedCount} ブロックを自然な無音間隔({settings.pauseDurationMs}ms)で結合しました
                </p>
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 text-xs flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>WAVをダウンロード</span>
            </button>
          </div>

          <audio
            ref={masterAudioRef}
            src={combinedAudioUrl}
            onEnded={() => setIsPlayingMaster(false)}
            onTimeUpdate={() => {
              if (masterAudioRef.current) {
                const current = masterAudioRef.current.currentTime;
                const duration = masterAudioRef.current.duration || 1;
                setMasterProgress((current / duration) * 100);
              }
            }}
            className="hidden"
          />

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex items-center space-x-4">
            <button
              onClick={toggleMasterPlay}
              className="w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md transition-all shrink-0 cursor-pointer"
            >
              {isPlayingMaster ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            <div className="flex-1 space-y-1">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  if (masterAudioRef.current) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    masterAudioRef.current.currentTime = pos * masterAudioRef.current.duration;
                  }
                }}
              >
                <div
                  className="h-full bg-indigo-400 rounded-full transition-all"
                  style={{ width: `${masterProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>
                  {masterAudioRef.current ? Math.floor(masterAudioRef.current.currentTime || 0) : 0}s
                </span>
                <span>
                  {masterAudioRef.current ? Math.floor(masterAudioRef.current.duration || 0) : 0}s
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCombining && (
        <div className="bg-indigo-950/40 border border-indigo-500/30 p-6 rounded-2xl text-center space-y-2 animate-pulse">
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-indigo-300">
            生成された音声ブロックを無音間隔({settings.pauseDurationMs}ms)を挟んで結合中...
          </p>
        </div>
      )}

      {/* Line-by-line Chunk Status List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">各ブロックの生成ステータス</h3>

        <audio
          ref={chunkAudioRef}
          onEnded={() => setPlayingChunkId(null)}
          className="hidden"
        />

        {chunks.map((chunk, index) => {
          const isCurrent = currentGeneratingIndex === index;
          const isSuccess = chunk.status === "success";
          const isError = chunk.status === "error";

          return (
            <div
              key={chunk.id}
              className={`p-3.5 rounded-xl border transition-all flex items-center justify-between space-x-3 ${
                isCurrent
                  ? "bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/50"
                  : isSuccess
                  ? "bg-slate-900 border-slate-800"
                  : isError
                  ? "bg-red-950/30 border-red-500/40"
                  : "bg-slate-900/60 border-slate-850 opacity-70"
              }`}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{chunk.text}</p>
                  {chunk.errorMessage && (
                    <p className="text-[10px] text-red-400 mt-0.5 truncate">{chunk.errorMessage}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {isSuccess && (
                  <button
                    onClick={() => playChunkAudio(chunk)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
                      playingChunkId === chunk.id
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 hover:bg-slate-700 text-indigo-300"
                    }`}
                  >
                    {playingChunkId === chunk.id ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>停止</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>試聴</span>
                      </>
                    )}
                  </button>
                )}

                {isCurrent && (
                  <span className="text-[10px] text-indigo-400 bg-indigo-950 px-2 py-1 rounded border border-indigo-500/30 flex items-center space-x-1 animate-pulse">
                    <RotateCw className="w-3 h-3 animate-spin" />
                    <span>生成中...</span>
                  </span>
                )}

                {isSuccess && (
                  <span className="p-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}

                {isError && (
                  <button
                    onClick={async () => {
                      setChunks((prev) =>
                        prev.map((c) => (c.id === chunk.id ? { ...c, status: "generating", errorMessage: undefined } : c))
                      );
                      const res = await generateSingleChunk(chunk);
                      if (res.success && res.audioBase64) {
                        setChunks((prev) =>
                          prev.map((c) =>
                            c.id === chunk.id
                              ? { ...c, status: "success", audioBase64: res.audioBase64, errorMessage: undefined }
                              : c
                          )
                        );
                      } else {
                        setChunks((prev) =>
                          prev.map((c) =>
                            c.id === chunk.id
                              ? { ...c, status: "error", errorMessage: res.error || "生成失敗" }
                              : c
                          )
                        );
                      }
                    }}
                    className="p-1 text-red-400 hover:bg-red-950 rounded transition-colors flex items-center space-x-1 cursor-pointer"
                    title="再試行"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="text-[10px]">再試行</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Nav */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
        <button
          onClick={onBackToChunking}
          className="px-5 py-2.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
        >
          文編集に戻る
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {errorCount > 0 && !isGenerating && (
            <button
              onClick={retryFailedChunks}
              className="px-4 py-2.5 text-xs font-semibold text-amber-300 bg-amber-950/70 hover:bg-amber-900/80 border border-amber-500/40 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>エラーブロックを再生成 ({errorCount}件)</span>
            </button>
          )}

          {completedCount > 0 && (
            <button
              onClick={() => {
                const audios = chunks
                  .filter((c) => c.status === "success" && c.audioBase64)
                  .map((c) => c.audioBase64!);
                combineAudioChunks(audios);
              }}
              disabled={isCombining}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center space-x-2 cursor-pointer ${
                isCombining
                  ? "bg-indigo-950/50 border-indigo-500/30 text-indigo-400"
                  : "text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-indigo-500/50 shadow-lg shadow-indigo-600/30"
              }`}
            >
              {isCombining ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>音声を結合中...</span>
                </>
              ) : (
                <>
                  <Waveform className="w-4 h-4" />
                  <span>手動で音声を結合 ({completedCount}/{chunks.length}件)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
