import React, { useState, useEffect, useRef } from 'react';
import { QuestionData, QuestionType } from '@/types';
import { QuizChoice } from '@/lib/quizEngine';

interface QuizCardProps {
  question: QuestionData;
  choices: QuizChoice[];
  mode: QuestionType;
  timedMode?: boolean;
  questionSeconds?: number;
  onAnswer: (isCorrect: boolean, timedOut: boolean) => void;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  question,
  choices,
  mode,
  timedMode = false,
  questionSeconds = 15,
  onAnswer,
}) => {
  // この問題用の状態。問題切替時は親が key を変えて再マウントするためここで初期化される。
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(questionSeconds * 1000);
  const deadlineRef = useRef<number | null>(null);

  // 表示用の残り秒（切り上げ）と、制限時間に到達したか（到達後も解答は可能）
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const expired = timedMode && remainingMs <= 0;

  // カウントダウン（タイム制限モード時のみ・回答確定後は凍結）。
  // 実時刻ベースのデッドラインで残り時間を算出し、バー・数値・判定を一致させる。
  // setState は interval コールバック内（非同期）で行い、effect 本体では呼ばない。
  useEffect(() => {
    if (!timedMode || selectedId) return;
    if (deadlineRef.current === null) {
      deadlineRef.current = performance.now() + questionSeconds * 1000;
    }
    const id = setInterval(() => {
      const left = Math.max(0, (deadlineRef.current as number) - performance.now());
      setRemainingMs(left);
      if (left <= 0) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [timedMode, selectedId, questionSeconds]);

  const handleChoiceClick = (choice: QuizChoice) => {
    if (selectedId) return; // Prevent multiple clicks
    const timedOut = timedMode && remainingMs <= 0; // クリック時点で確定（以後タイマーは凍結）
    setSelectedId(choice.id);

    // ユーザーに正誤の色を見せるために1秒遅延して次の問題へ（次問は再マウントで初期化）
    setTimeout(() => {
      onAnswer(choice.isCorrect, timedOut);
    }, 1000);
  };

  const renderQuestionText = () => {
    switch (mode) {
      case 'en_to_ja':
        return (
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-800 mb-2">{question.word}</h2>
            <div className="flex items-center justify-center gap-3">
              {question.partOfSpeech && (
                <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-bold">{question.partOfSpeech}</span>
              )}
              {question.phonetic && <p className="text-gray-500 text-lg">/{question.phonetic}/</p>}
            </div>
          </div>
        );
      case 'ja_to_en':
        return (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{question.japanese}</h2>
            {question.partOfSpeech && (
              <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-bold inline-block">{question.partOfSpeech}</span>
            )}
          </div>
        );
      case 'fill_in_the_blank':
        const displayParagraph = question.paragraph.replace(/_\[活用形:.*?\]/g, '_[活用形]');
        return <h2 className="text-2xl font-bold text-gray-800 text-center leading-relaxed">{displayParagraph}</h2>;
    }
  };

  // タイマー表示（残り秒のバーと数値）。残り0で「時間切れ」を明示。
  const renderTimer = () => {
    if (!timedMode) return null;
    const ratio = Math.max(0, Math.min(1, remainingMs / (questionSeconds * 1000)));
    const danger = secondsLeft <= 5 && !expired;
    return (
      <div className="px-6 pt-4 bg-orange-50" aria-live="polite">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold text-gray-500">残り時間</span>
          <span className={`text-sm font-extrabold ${expired ? 'text-red-500' : danger ? 'text-red-500' : 'text-orange-500'}`}>
            {expired ? '⏱ 時間切れ' : `${secondsLeft} 秒`}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-[width] duration-100 ease-linear ${expired ? 'bg-red-500' : danger ? 'bg-red-400' : 'bg-green-500'}`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        {expired && (
          <p className="text-xs text-red-500 font-bold mt-2 text-center">
            時間切れです。解答はできますが「失敗（時間切れ）」として記録されます。
          </p>
        )}
      </div>
    );
  };

  // 回答後フィードバックの帯（タイムアウトの明示）
  const renderFeedbackBanner = () => {
    if (!selectedId) return null;
    const selectedChoice = choices.find((c) => c.id === selectedId);
    const isCorrect = selectedChoice?.isCorrect ?? false;
    let text: string;
    let cls: string;
    if (expired) {
      text = isCorrect ? '⏱ 正解！ただし時間切れのため「失敗」扱い' : '⏱ 不正解（時間切れ）';
      cls = 'bg-red-100 text-red-600';
    } else if (isCorrect) {
      text = '○ 時間内に正解！';
      cls = 'bg-green-100 text-green-600';
    } else {
      text = '× 不正解';
      cls = 'bg-red-100 text-red-600';
    }
    return <div className={`mx-6 mb-4 py-2 rounded-xl text-center font-bold ${cls}`}>{text}</div>;
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
      {/* 問題表示エリア (AsuMeのオレンジ基調) */}
      <div className="bg-orange-500 p-8 flex items-center justify-center min-h-[200px]">
        <div className="bg-white px-8 py-6 rounded-xl shadow-inner w-full">
          {renderQuestionText()}
        </div>
      </div>

      {renderTimer()}

      {/* 選択肢ボタンエリア */}
      <div className="p-6 space-y-4 bg-orange-50">
        {choices.map((choice) => {
          // 選択状態に応じたボタンのスタイル判定
          let buttonClass = "bg-white border-2 border-orange-200 text-gray-800 hover:border-orange-500 hover:bg-orange-50 hover:shadow-md transform hover:-translate-y-1";
          if (selectedId) {
            if (choice.isCorrect) {
              buttonClass = "bg-green-500 border-green-500 text-white font-extrabold transform scale-105 shadow-lg"; // 正解は緑で強調
            } else if (selectedId === choice.id) {
              buttonClass = "bg-red-500 border-red-500 text-white"; // 選んだ不正解は赤
            } else {
              buttonClass = "bg-gray-100 border-gray-200 text-gray-400 opacity-50"; // その他は薄く
            }
          }

          return (
            <button
              key={choice.id}
              onClick={() => handleChoiceClick(choice)}
              disabled={selectedId !== null}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ease-out shadow-sm flex items-center justify-center min-h-[64px] ${buttonClass}`}
            >
              {choice.text}
            </button>
          );
        })}
      </div>

      {renderFeedbackBanner()}
    </div>
  );
};
