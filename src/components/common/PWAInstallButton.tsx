import React from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { canInstall, isInstalled, isIOS, showIOSGuide, setShowIOSGuide, install } = usePWAInstall();

  if (isInstalled || !canInstall) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={install}
        className={`flex items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-950/60 text-emerald-400 font-bold transition-all hover:bg-emerald-900/60 hover:border-emerald-400 hover:text-emerald-300 shadow-sm shadow-emerald-500/20 active:translate-y-0.5 cursor-pointer ${
          compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs sm:text-sm'
        }`}
        title="تثبيت كـ تطبيق على هاتفك (PWA)"
      >
        <Smartphone className="w-4 h-4 text-emerald-400" />
        <span>تثبيت التطبيق (PWA)</span>
      </button>

      {/* iOS Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-sm rounded-2xl border-2 border-emerald-500/60 bg-[#060D06] p-6 text-white shadow-2xl">
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-black border border-emerald-900 text-slate-400 hover:text-emerald-400"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4">
              <Download className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-center text-emerald-300 mb-2">
              تثبيت التطبيق على آيفون (iOS)
            </h3>
            <p className="text-xs text-slate-300 text-center mb-5 leading-relaxed">
              لتثبيت MorseLingo واستخدامه كتطبيق مستقل بشاشة كاملة وبدون متصفح:
            </p>

            <ol className="space-y-3 text-xs text-slate-200">
              <li className="flex items-start gap-2.5 bg-black/80 p-2.5 rounded-xl border border-emerald-950">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0">1</span>
                <span>اضغط على زر المشاركة <Share className="w-3.5 h-3.5 inline mx-1 text-emerald-400" /> في أسفل متصفح Safari.</span>
              </li>
              <li className="flex items-start gap-2.5 bg-black/80 p-2.5 rounded-xl border border-emerald-950">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0">2</span>
                <span>مرر للأسفل واختر <strong>"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5 bg-black/80 p-2.5 rounded-xl border border-emerald-950">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0">3</span>
                <span>اضغط <strong>"إضافة" (Add)</strong> بالأعلى ليظهر التطبيق على شاشتك.</span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full mt-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all shadow-md shadow-emerald-500/20"
            >
              فهمت ذلك
            </button>
          </div>
        </div>
      )}
    </>
  );
};
