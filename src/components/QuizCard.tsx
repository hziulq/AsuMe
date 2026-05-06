import React, { useState } from 'react';
import { QuestionData, QuestionType } from '@/types';
import { QuizChoice } from '@/lib/quizEngine';

interface QuizCardProps {
  question: QuestionData;
  choices: QuizChoice[];
  mode: QuestionType;
  onAnswer: (isCorrect: boolean) => void;
}

export const QuizCard: React.FC<QuizCardProps> = ({ question, choices, mode, onAnswer }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleChoiceClick = (choice: QuizChoice) => {
    if (selectedId) return; // Prevent multiple clicks
    setSelectedId(choice.id);
    
    // ユーザーに正誤の色を見せるために1秒遅延して次の問題へ
    setTimeout(() => {
      onAnswer(choice.isCorrect);
      setSelectedId(null);
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
        return <h2 className="text-2xl font-bold text-gray-800 text-center leading-relaxed">{question.paragraph}</h2>;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
      {/* 問題表示エリア (AsuMeのオレンジ基調) */}
      <div className="bg-orange-500 p-8 flex items-center justify-center min-h-[200px]">
        <div className="bg-white px-8 py-6 rounded-xl shadow-inner w-full">
          {renderQuestionText()}
        </div>
      </div>
      
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
    </div>
  );
};
