"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getProject, saveProject } from '@/lib/projectManager';
import { Project, QuestionType, QuestionData } from '@/types';
import { QuizCard } from '@/components/QuizCard';
import { generateQuizOptions, QuizChoice, shuffle } from '@/lib/quizEngine';
import { playAudio } from '@/lib/audio';

export default function QuizPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params?.projectId as string;
  const isReviewMode = searchParams?.get('review') === 'true';
  const router = useRouter();
  
  const [project, setProject] = useState<Project | null>(null);
  
  // 10問のキュー。間違えた問題はここに追加される。
  const [activeQuestions, setActiveQuestions] = useState<QuestionData[]>([]);
  
  // 1回目（初回）の解答結果を記録する（id -> isCorrect）
  const [firstAttemptResults, setFirstAttemptResults] = useState<Record<string, boolean>>({});
  
  const [hasStarted, setHasStarted] = useState(false);
  const [mode, setMode] = useState<QuestionType>('en_to_ja');
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentChoices, setCurrentChoices] = useState<QuizChoice[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (projectId) {
      const p = getProject(projectId);
      if (p) {
        setProject(p);
        let selectedQuestions: QuestionData[] = [];
        if (isReviewMode && p.wrongQuestionIds && p.wrongQuestionIds.length > 0) {
          const wrongQs = p.questions.filter(q => p.wrongQuestionIds!.includes(q.id));
          selectedQuestions = shuffle(wrongQs).slice(0, 10);
        } else if (!isReviewMode) {
          const activePool = p.questions.filter(q => !q.isMastered);
          if (activePool.length > 0) {
            const scoredPool = activePool.map(q => {
              let score = 0;
              if (!q.lastStudiedAt) {
                score += 1000;
              } else {
                const total = (q.correctCount || 0) + (q.incorrectCount || 0);
                const correctRate = total === 0 ? 0 : (q.correctCount || 0) / total;
                score += (1 - correctRate) * 100;
                
                const daysSince = (Date.now() - q.lastStudiedAt) / (1000 * 60 * 60 * 24);
                score += Math.min(daysSince * 10, 200);
              }
              score += Math.random() * 40 - 20;
              return { q, score };
            });
            
            scoredPool.sort((a, b) => b.score - a.score);
            selectedQuestions = scoredPool.slice(0, 10).map(item => item.q);
          }
        }
        setActiveQuestions(selectedQuestions);
      }
      else router.push('/');
    }
  }, [projectId, router, isReviewMode]);

  useEffect(() => {
    if (hasStarted && activeQuestions.length > 0 && currentIndex < activeQuestions.length) {
      const question = activeQuestions[currentIndex];
      const choices = generateQuizOptions(question, project!.questions, mode, 4);
      setCurrentChoices(choices);
      
      if (mode === 'en_to_ja' || mode === 'fill_in_the_blank') {
        const textToRead = mode === 'en_to_ja' ? question.word : question.paragraph.replace('_', question.word);
        playAudio(textToRead);
      }
    } else if (hasStarted && activeQuestions.length > 0 && currentIndex >= activeQuestions.length) {
      setIsFinished(true);
    }
  }, [hasStarted, activeQuestions, currentIndex, mode, project]);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<QuestionData | null>(null);

  if (!project) return <div className="p-8 text-center text-gray-500 font-bold">読み込み中...</div>;

  if (activeQuestions.length === 0) {
    if (isReviewMode) {
      return (
        <div className="min-h-screen bg-orange-50 p-8 flex items-center justify-center">
          <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md w-full border border-orange-100">
            <h1 className="text-3xl font-extrabold text-orange-500 mb-6">復習する問題がありません！</h1>
            <p className="text-gray-500 mb-8">間違えた問題はすべてクリアしました。</p>
            <button onClick={() => router.push('/')} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-md">ホームに戻る</button>
          </div>
        </div>
      );
    } else {
      return (
        <div className="min-h-screen bg-orange-50 p-8 flex items-center justify-center">
          <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md w-full border border-orange-100">
            <h1 className="text-3xl font-extrabold text-green-500 mb-6">殿堂入り達成！👑</h1>
            <p className="text-gray-500 mb-8">この単語帳のすべての単語をマスターしました！</p>
            <button onClick={() => router.push('/')} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-md">ホームに戻る</button>
          </div>
        </div>
      );
    }
  }

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-orange-50 p-8 flex items-center justify-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full border border-orange-100">
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2 text-center">{project.name}</h1>
          <p className="text-gray-500 mb-8 text-center font-bold">
            {isReviewMode ? `復習モード (最大10問)` : `学習スタート (ランダム10問)`}
          </p>
          
          <div className="space-y-4 mb-8">
            <button 
              onClick={() => setMode('en_to_ja')}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all ${mode === 'en_to_ja' ? 'bg-orange-500 text-white shadow-md transform scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              英 → 日 (単語の意味)
            </button>
            <button 
              onClick={() => setMode('ja_to_en')}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all ${mode === 'ja_to_en' ? 'bg-orange-500 text-white shadow-md transform scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              日 → 英 (単語のスペル)
            </button>
            <button 
              onClick={() => setMode('fill_in_the_blank')}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all ${mode === 'fill_in_the_blank' ? 'bg-orange-500 text-white shadow-md transform scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              穴埋め問題 (英文コンテキスト)
            </button>
          </div>

          <button 
            onClick={() => setHasStarted(true)}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-extrabold py-4 rounded-xl shadow-lg transition-transform hover:-translate-y-1"
          >
            学習をスタート！
          </button>
          <button 
            onClick={() => router.push('/')}
            className="w-full mt-4 text-gray-400 font-bold py-2 hover:text-gray-600"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const correctIds = Object.entries(firstAttemptResults).filter(([, isCorrect]) => isCorrect).map(([id]) => id);
    const initialCount = Object.keys(firstAttemptResults).length;
    
    return (
      <div className="min-h-screen bg-orange-50 p-8 flex flex-col items-center pt-12 pb-20">
        <h1 className="text-4xl font-extrabold text-orange-500 mb-8 drop-shadow-sm">結果発表</h1>
        
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-lg mb-8 border border-orange-100 text-center">
           <div className="text-2xl font-bold text-gray-700">正解率</div>
           <div className="text-6xl text-orange-400 font-extrabold my-4">
             {Math.round((correctIds.length / initialCount) * 100)}<span className="text-3xl">%</span>
           </div>
           <div className="text-gray-500 font-bold text-lg">{correctIds.length} / {initialCount} 正解</div>
        </div>

        <div className="w-full max-w-lg space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 ml-2 mb-4">今回の単語</h2>
          {Object.entries(firstAttemptResults).map(([id, isCorrect]) => {
            const q = project?.questions.find(q => q.id === id);
            if (!q) return null;
            return (
              <div key={id} className={`p-4 rounded-2xl shadow-sm flex justify-between items-center ${isCorrect ? 'bg-white border-l-8 border-green-500' : 'bg-red-50 border-l-8 border-red-500'}`}>
                <div>
                  <div className="font-bold text-xl text-gray-800 mb-1">
                    {q.word} 
                    {q.partOfSpeech && <span className="ml-2 bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md text-xs font-bold align-middle">{q.partOfSpeech}</span>}
                    <span className="text-gray-400 text-sm font-normal ml-2">/{q.phonetic}/</span>
                  </div>
                  <div className="text-gray-600 font-medium">{q.japanese}</div>
                </div>
                <div className="font-extrabold text-3xl">
                  {isCorrect ? <span className="text-green-500">○</span> : <span className="text-red-500">×</span>}
                </div>
              </div>
            );
          })}
        </div>
        
        <button 
          onClick={() => router.push('/')}
          className="mt-10 w-full max-w-lg bg-orange-500 hover:bg-orange-600 text-white font-extrabold py-5 text-xl rounded-2xl transition-transform hover:-translate-y-1 shadow-lg"
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  if (currentChoices.length === 0) return null;

  const currentQuestion = activeQuestions[currentIndex];
  if (!currentQuestion) return null;

  const handleAnswer = (isCorrect: boolean) => {
    const qId = currentQuestion.id;
    
    // 初回の回答かどうかを判定
    if (firstAttemptResults[qId] === undefined) {
      setFirstAttemptResults(prev => ({ ...prev, [qId]: isCorrect }));
      
      const qIndex = project.questions.findIndex(q => q.id === qId);
      if (qIndex !== -1) {
        const q = project.questions[qIndex];
        q.correctCount = (q.correctCount || 0) + (isCorrect ? 1 : 0);
        q.incorrectCount = (q.incorrectCount || 0) + (isCorrect ? 0 : 1);
        q.consecutiveCorrectCount = isCorrect ? (q.consecutiveCorrectCount || 0) + 1 : 0;
        
        if (q.consecutiveCorrectCount >= 3) {
          q.isMastered = true;
        } else if (!isCorrect) {
          q.isMastered = false;
        }
        q.lastStudiedAt = Date.now();
      }
      
      project.lastStudiedAt = Date.now();
      
      // localStorageのwrongQuestionIdsを更新 (初回のみ評価)
      if (isCorrect) {
        project.wrongQuestionIds = (project.wrongQuestionIds || []).filter(id => id !== qId);
      } else {
        project.wrongQuestionIds = Array.from(new Set([...(project.wrongQuestionIds || []), qId]));
      }
      saveProject(project);
    }

    if (isCorrect) {
      setCurrentIndex(i => i + 1);
    } else {
      // 間違えた場合はキューの最後に追加して再度出題する
      setActiveQuestions(prev => [...prev, currentQuestion]);
      setCurrentIndex(i => i + 1);
    }
  };

  const startEdit = () => {
    setEditForm({ ...currentQuestion });
    setIsEditing(true);
  };

  const handleEditSave = () => {
    if (project && editForm) {
      const updatedQuestions = project.questions.map(q => q.id === editForm.id ? editForm : q);
      project.questions = updatedQuestions;
      saveProject(project);
      
      const updatedActive = activeQuestions.map(q => q.id === editForm.id ? editForm : q);
      setActiveQuestions(updatedActive);
      
      const newChoices = generateQuizOptions(editForm, updatedQuestions, mode, 4);
      setCurrentChoices(newChoices);
      
      setIsEditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 p-4 flex flex-col items-center pt-8 relative">
      <div className="w-full max-w-md mb-8 flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-orange-100">
        <button onClick={() => router.push('/')} className="text-gray-500 font-bold hover:text-orange-500 transition-colors">
          ✕ やめる
        </button>
        <div className="text-orange-500 font-extrabold text-lg">
          {currentIndex + 1} <span className="text-gray-400 text-sm">/ {activeQuestions.length}</span>
        </div>
      </div>
      
      <div className="w-full max-w-md flex justify-between mb-4">
        <button 
          onClick={() => {
            const textToRead = mode === 'en_to_ja' ? currentQuestion.word : currentQuestion.paragraph.replace('_', currentQuestion.word);
            playAudio(textToRead);
          }}
          className="bg-white border border-orange-200 rounded-full py-2 px-4 shadow-sm hover:bg-orange-50 text-orange-500 font-bold flex items-center gap-2 transition-transform hover:scale-105"
        >
          <span>🔊 音声</span>
        </button>

        <button 
          onClick={startEdit}
          className="bg-gray-100 text-gray-500 hover:bg-gray-200 font-bold py-2 px-4 rounded-full shadow-sm transition-colors text-sm flex items-center gap-1"
        >
          <span>✏️ 問題を修正</span>
        </button>
      </div>

      <QuizCard 
        question={currentQuestion}
        choices={currentChoices}
        mode={mode}
        onAnswer={handleAnswer}
      />

      {isEditing && editForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">問題データの修正</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">英単語</label>
                <input type="text" value={editForm.word} onChange={e => setEditForm({...editForm, word: e.target.value})} className="w-full border p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">日本語訳</label>
                <input type="text" value={editForm.japanese} onChange={e => setEditForm({...editForm, japanese: e.target.value})} className="w-full border p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">発音記号</label>
                <input type="text" value={editForm.phonetic} onChange={e => setEditForm({...editForm, phonetic: e.target.value})} className="w-full border p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">品詞・変形情報</label>
                <input type="text" value={editForm.partOfSpeech || ''} onChange={e => setEditForm({...editForm, partOfSpeech: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="例: 名詞, 動詞(過去形)など" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">英文（穴埋め部分を_に）</label>
                <textarea value={editForm.paragraph} onChange={e => setEditForm({...editForm, paragraph: e.target.value})} className="w-full border p-2 rounded-lg h-24" />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setIsEditing(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl">キャンセル</button>
              <button onClick={handleEditSave} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-md">保存して再開</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
