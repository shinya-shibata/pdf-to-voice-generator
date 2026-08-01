import React from "react";
import { X, ExternalLink, Sparkles, Volume2, Key, CheckCircle } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, onOpenSettings }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">アプリの使い方・ガイド</h2>
              <p className="text-xs text-slate-400">Gemini & Suno Bark による完全無料の音声読み上げ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-300 leading-relaxed">
          {/* Step Guide */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">使い方の流れ (3ステップ)</h3>

            <div className="space-y-3">
              <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-indigo-400">1. ドキュメントまたはテキストの入力</span>
                <p>PDFファイルをドラッグ＆ドロップするか、GoogleドキュメントやWeb記事のテキストを貼り付けます。</p>
              </div>

              <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-indigo-400">2. コンマ・ピリオド自動ルール分割</span>
                <p>
                  日本語・英語に対応した「コンマ（, / 、）およびピリオド（. / 。）」区切りルールで文節を瞬時に自動分割します。クォータ制限なく、息継ぎ・ポーズを取りやすい原稿を作成します。
                </p>
              </div>

              <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-indigo-400">3. Suno Bark 音声生成 & WAV自動結合</span>
                <p>
                  分割された文章を順次Hugging Face Inference APIに送信し、各文間に設定された無音時間（デフォルト300ms）を挟んで長尺WAVファイルとして一本化します。
                </p>
              </div>
            </div>
          </div>

          {/* Token Setup Instructions */}
          <div className="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-xl space-y-2">
            <h4 className="font-bold text-indigo-300 flex items-center space-x-1.5">
              <Key className="w-4 h-4 text-indigo-400" />
              <span>Hugging Face API Token の無料取得方法</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-300">
              <li>
                <a
                  href="https://huggingface.co/join"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 underline"
                >
                  Hugging Face公式サイト
                </a>
                で無料アカウントを作成します。
              </li>
              <li>
                <a
                  href="https://huggingface.co/settings/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 underline"
                >
                  Settings &gt; Access Tokens
                </a>
                にアクセスします。
              </li>
              <li>「Create new token」をクリックし、Roleを「Read」に指定して作成します。</li>
              <li>作成された <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300">hf_...</code> から始まる文字列をコピーし、本アプリの「API設定」に入力します。</li>
            </ol>
          </div>

          {/* Tips for better voice */}
          <div className="space-y-2">
            <h4 className="font-bold text-white flex items-center space-x-1.5">
              <Volume2 className="w-4 h-4 text-purple-400" />
              <span>綺麗に読み上げさせるコツ</span>
            </h4>
            <ul className="space-y-1 text-slate-400">
              <li className="flex items-start space-x-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>1文の長さは20〜30文字に抑えるのがベストです（Geminiが自動調整します）。</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>句読点（、。）や疑問符（？）を適切に入れることで、AIが息継ぎや抑揚を表現します。</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>初回生成時、Hugging Faceのモデル読み込みに約20秒かかる場合があります。</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 flex justify-between items-center">
          <button
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="px-4 py-2 text-xs font-semibold text-indigo-300 bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/30 rounded-xl transition-all"
          >
            API設定を開く
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
