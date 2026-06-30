import React, { useEffect } from 'react';
import { playAudio } from '@/lib/audio';

interface PerfectCelebrationProps {
  show: boolean;
  withVoice?: boolean;
}

// 全問正解（実効成功が全件）のときだけ表示する特別な称賛演出。
export const PerfectCelebration: React.FC<PerfectCelebrationProps> = ({ show, withVoice = false }) => {
  useEffect(() => {
    if (show && withVoice) {
      playAudio('Perfect! Congratulations!');
    }
  }, [show, withVoice]);

  if (!show) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      role="status"
      aria-live="polite"
    >
      <div className="bg-gradient-to-r from-orange-400 to-green-400 text-white font-extrabold text-2xl sm:text-3xl px-8 py-5 rounded-3xl shadow-2xl animate-bounce text-center">
        🎉 全問正解おめでとう！ 🎉
        <div className="text-base font-bold mt-1 opacity-90">パーフェクト達成！</div>
      </div>
    </div>
  );
};
