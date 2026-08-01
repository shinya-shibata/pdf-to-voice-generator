import React, { useState, useRef } from "react";
import { FileUp, FileText, UploadCloud, File, AlertCircle, Sparkles, Check, ArrowRight, BookOpen } from "lucide-react";

interface FileUploaderProps {
  rawText: string;
  setRawText: (text: string) => void;
  onProceedToChunking: () => void;
  isLoadingPdf: boolean;
  setIsLoadingPdf: (loading: boolean) => void;
}

const SAMPLE_TEXTS = {
  japaneseArticle: `人工知能技術の進化により、文章から自然な音声への変換技術（TTS）が飛躍的に向上しました。
特にGoogle AI Studioが提供するGemini APIを活用することで、長文のテキストを自然な間や文脈を維持したまま、音声合成エンジンが処理しやすい適切な長さの文章へと最適化・分割することが可能になりました。
本システムでは、抽出されたテキストをSuno Barkなどの最先端AI音声モデルと連携させ、人間が読み上げるような自然なナレーション音声をリアルタイムで生成します。
PDFやドキュメントの文章をオーディオブック化して移動中に聴くことで、読書や情報収集の効率が格段に高まります。`,

  japaneseStory: `昔々、あるところに大きな森に囲まれた静かな村がありました。
村の若者たちは、夜になると星空を見上げて、遠い国での冒険に想いを馳せていました。
ある満月の夜、森の奥深くから不思議な美しい音楽が聞こえてきました。
若者は勇気を出して、光り輝く小道をたどり、音楽の源へと歩みを進めました。`,

  englishSample: `Artificial intelligence has revolutionized text-to-speech technologies in recent years.
By converting long documents into concise, natural audio, readers can listen to complex research papers, news articles, and books while on the move.
Combining Gemini with advanced audio engines produces highly realistic and natural vocal performances.`,
};

export const FileUploader: React.FC<FileUploaderProps> = ({
  rawText,
  setRawText,
  onProceedToChunking,
  isLoadingPdf,
  setIsLoadingPdf,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processPdfFile = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("PDF形式のファイル (.pdf) をアップロードしてください。");
      return;
    }

    setErrorMessage(null);
    setIsLoadingPdf(true);
    setPdfFileName(file.name);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        if (!base64) {
          setErrorMessage("ファイルの読み込みに失敗しました。");
          setIsLoadingPdf(false);
          return;
        }

        const res = await fetch("/api/extract-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfBase64: base64 }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "PDFテキスト解析エラー");
        }

        setRawText(data.text || "");
        setPdfPageCount(data.numpages || 1);
        setIsLoadingPdf(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "PDFからのテキスト抽出に失敗しました。");
      setIsLoadingPdf(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processPdfFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processPdfFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Introduction Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <FileUp className="w-5 h-5 text-indigo-400" />
              <span>Step 1: ドキュメントまたはテキストの入力</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              PDFファイルをアップロードするか、Google ドキュメントやWeb記事のテキストを直接貼り付けてください。Gemini 3.6 Flashが内容を解析し、Suno Barkに最適化されたナレーション原稿を自動作成します。
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => {
                setRawText(SAMPLE_TEXTS.japaneseArticle);
                setPdfFileName(null);
                setPdfPageCount(null);
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-xl transition-all flex items-center space-x-1"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>日本語サンプル</span>
            </button>
            <button
              onClick={() => {
                setRawText(SAMPLE_TEXTS.japaneseStory);
                setPdfFileName(null);
                setPdfPageCount(null);
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-xl transition-all"
            >
              朗読サンプル
            </button>
          </div>
        </div>
      </div>

      {/* PDF Upload Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? "border-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-500/10"
            : "border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-200">
              PDFファイルをドラッグ＆ドロップ または <span className="text-indigo-400 underline">ファイルを選択</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">最大50MBのPDF文書に対応</p>
          </div>

          {isLoadingPdf && (
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-medium animate-pulse mt-2">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span>PDFテキストを高速解析中...</span>
            </div>
          )}

          {pdfFileName && !isLoadingPdf && (
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs mt-2">
              <File className="w-4 h-4" />
              <span className="font-medium">{pdfFileName}</span>
              {pdfPageCount && <span className="text-emerald-400 font-mono">({pdfPageCount} ページ抽出済み)</span>}
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-950/50 border border-red-500/40 p-3 rounded-xl text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Raw Text / Google Docs Input Area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>抽出されたテキスト / 直接テキスト入力 (Google Docs対応)</span>
          </label>
          <div className="flex items-center space-x-3 text-xs text-slate-400">
            <span>
              総文字数: <strong className="text-indigo-300 font-mono">{rawText.length}</strong> 文字
            </span>
            {rawText.length > 0 && (
              <button
                onClick={() => {
                  setRawText("");
                  setPdfFileName(null);
                  setPdfPageCount(null);
                }}
                className="text-slate-500 hover:text-slate-300 underline text-[11px]"
              >
                クリア
              </button>
            )}
          </div>
        </div>

        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="ここにテキストを直接入力・貼り付けするか、上部にPDFをアップロードしてください..."
          rows={10}
          className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-sans leading-relaxed resize-y shadow-inner"
        />
      </div>

      {/* Proceed Action Button */}
      <div className="flex justify-end pt-2">
        <button
          disabled={!rawText.trim() || isLoadingPdf}
          onClick={onProceedToChunking}
          className={`px-6 py-3.5 rounded-xl font-bold text-sm shadow-xl flex items-center space-x-2 transition-all ${
            rawText.trim() && !isLoadingPdf
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30 cursor-pointer hover:scale-[1.01]"
              : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Geminiで文章をスマート分割する</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
