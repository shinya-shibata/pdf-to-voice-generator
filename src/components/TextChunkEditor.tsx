import React, { useState, useEffect, useCallback } from "react";
import { Sparkles, Plus, Trash2, ArrowRight, RotateCw, AlertCircle, CheckCircle2, Type } from "lucide-react";
import { TextChunk } from "../types";

interface TextChunkEditorProps {
  rawText: string;
  chunks: TextChunk[];
  setChunks: React.Dispatch<React.SetStateAction<TextChunk[]>>;
  geminiApiKey?: string;
  onProceedToGeneration: () => void;
  onBackToUpload: () => void;
}

export const TextChunkEditor: React.FC<TextChunkEditorProps> = ({
  rawText,
  chunks,
  setChunks,
  geminiApiKey,
  onProceedToGeneration,
  onBackToUpload,
}) => {
  const [isSplitting, setIsSplitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const runGeminiSplitting = useCallback(async () => {
    if (!rawText.trim()) return;

    setIsSplitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const res = await fetch("/api/split-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          customApiKey: geminiApiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Geminiでのテキスト分割に失敗しました。");
      }

      if (data.fallbackMessage) {
        setInfoMessage(data.fallbackMessage);
      }

      const formattedChunks: TextChunk[] = (data.chunks || []).map((text: string, index: number) => ({
        id: `chunk-${Date.now()}-${index}`,
        text,
        status: "idle",
      }));

      setChunks(formattedChunks);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "テキストの最適化分割中にエラーが発生しました。");
    } finally {
      setIsSplitting(false);
    }
  }, [rawText, geminiApiKey, setChunks]);

  useEffect(() => {
    if (chunks.length === 0 && rawText.trim() && !isSplitting) {
      runGeminiSplitting();
    }
  }, [chunks.length, rawText, isSplitting, runGeminiSplitting]);

  const handleUpdateChunkText = (id: string, newText: string) => {
    setChunks((prev) =>
      prev.map((chunk) => (chunk.id === id ? { ...chunk, text: newText } : chunk))
    );
  };

  const handleDeleteChunk = (id: string) => {
    setChunks((prev) => prev.filter((chunk) => chunk.id !== id));
  };

  const handleAddChunk = (afterIndex: number) => {
    const newChunk: TextChunk = {
      id: `chunk-${Date.now()}-${Math.random()}`,
      text: "",
      status: "idle",
    };
    setChunks((prev) => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, newChunk);
      return next;
    });
  };

  const avgCharLength =
    chunks.length > 0
      ? Math.round(chunks.reduce((acc, curr) => acc + curr.text.length, 0) / chunks.length)
      : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Step 2: ナレーション文の確認・編集</h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            コンマ・ピリオド（、, 。.）および句読点区切りルールでナレーション原稿を小分け分割しました。必要に応じて直接編集できます。
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={runGeminiSplitting}
            disabled={isSplitting}
            className="px-3 py-2 text-xs font-medium text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 rounded-xl transition-all flex items-center space-x-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSplitting ? "animate-spin" : ""}`} />
            <span>再分割を実行</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">総分割ブロック数</p>
          <p className="text-lg font-bold text-indigo-400 font-mono mt-0.5">{chunks.length} 文節</p>
        </div>
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">平均ブロック文字数</p>
          <p className="text-lg font-bold text-purple-400 font-mono mt-0.5">{avgCharLength} 文字</p>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-center flex flex-col justify-center">
          <p className="text-[11px] text-slate-400">分割方式</p>
          <p className="text-xs font-semibold text-emerald-400 mt-1 flex items-center justify-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>コンマ・ピリオド区切り (日/英)</span>
          </p>
        </div>
      </div>

      {/* Loading indicator */}
      {isSplitting && (
        <div className="bg-indigo-950/40 border border-indigo-500/30 p-8 rounded-2xl text-center space-y-3 animate-pulse">
          <div className="w-8 h-8 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-indigo-300">
            テキストを「コンマ・ピリオド区切り」に自動分割中...
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-950/50 border border-red-500/40 p-4 rounded-xl text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {infoMessage && (
        <div className="bg-amber-950/40 border border-amber-500/40 p-3.5 rounded-xl text-amber-200 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* Chunk List */}
      {!isSplitting && chunks.length > 0 && (
        <div className="space-y-3">
          {chunks.map((chunk, index) => {
            const isOptimalLength = chunk.text.length >= 10 && chunk.text.length <= 40;

            return (
              <div
                key={chunk.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 hover:border-slate-700 transition-all flex items-center space-x-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </div>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={chunk.text}
                    onChange={(e) => handleUpdateChunkText(chunk.id, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                    placeholder="ナレーション文を入力..."
                  />
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                      isOptimalLength
                        ? "bg-slate-800 border-slate-700 text-slate-300"
                        : "bg-amber-950/40 border-amber-500/30 text-amber-300"
                    }`}
                    title="20〜30文字前後がSuno Barkで最も安定して生成できます"
                  >
                    {chunk.text.length}字
                  </span>

                  <button
                    onClick={() => handleAddChunk(index)}
                    className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="下に行を追加"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteChunk(chunk.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="この行を削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Nav */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBackToUpload}
          className="px-5 py-2.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
        >
          ドキュメント入力に戻る
        </button>

        <button
          disabled={chunks.length === 0 || isSplitting}
          onClick={onProceedToGeneration}
          className="px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer hover:scale-[1.01]"
        >
          <Type className="w-4 h-4" />
          <span>Suno Barkで音声合成へ進む ({chunks.length} 文)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
