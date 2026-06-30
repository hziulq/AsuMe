import React, { useEffect, useRef, useState } from 'react';

interface CountUpResultProps {
  correctCount: number;
  total: number;
  durationMs?: number;
  onDone?: () => void;
}

// セット完了時に正解数を 0→correctCount へカウントアップする演出（約2秒）。
export const CountUpResult: React.FC<CountUpResultProps> = ({ correctCount, total, durationMs = 2000, onDone }) => {
  const [display, setDisplay] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const finish = () => {
      setDisplay(correctCount);
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
    };

    // アクセシビリティ: アニメーションを抑制する設定なら即座に最終値へ
    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || correctCount <= 0) {
      finish();
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 2); // ease-out で「ドキドキ」感
      setDisplay(Math.round(eased * correctCount));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        finish();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correctCount, durationMs]);

  const pct = total > 0 ? Math.round((display / total) * 100) : 0;
  const isUpdating = display < correctCount;

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-lg mb-8 border border-orange-100 text-center">
      <div className="text-2xl font-bold text-gray-700">正解数</div>
      <div
        className={`text-7xl font-extrabold my-4 transition-transform ${isUpdating ? 'text-orange-400 scale-110 animate-pulse' : 'text-orange-500'}`}
      >
        {display}
        <span className="text-3xl text-gray-400"> / {total}</span>
      </div>
      <div className="text-gray-500 font-bold text-lg" aria-live="polite">
        正答率 {pct}%（{correctCount} / {total} 正解）
      </div>
    </div>
  );
};
