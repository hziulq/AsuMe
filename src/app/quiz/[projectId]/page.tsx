"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getProject, saveProject } from '@/lib/projectManager';
import { Project, QuestionType, QuestionData, AttemptResult } from '@/types';
import { QuizCard } from '@/components/QuizCard';
import { CountUpResult } from '@/components/CountUpResult';
import { PerfectCelebration } from '@/components/PerfectCelebration';
import { generateQuizOptions, shuffle, selectFairQuestionSet } from '@/lib/quizEngine';
import { isEffectiveSuccess, summarizeSet, loadQuizPrefs, saveQuizPrefs } from '@/lib/gamification';
import { playAudio } from '@/lib/audio';

const getAudioText = (q: QuestionData) => {
  if (!q.paragraph) return q.word;
  let text = q.paragraph;
  text = text.replace(/_\[活用形:(.*?)\]/g, '$1');
  text = text.replace(/_\[活用形\]/g, q.word);
  text = text.replace(/_/g, q.word);
  return text;
};

export default function QuizPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params?.projectId as string;
  const isReviewMode = searchParams?.get('review') === 'true';
  const router = useRouter();
  
  const [project, setProject] = useState<Project | null>(null);
  
  // 10問のキュー。間違えた問題はここに追加される。
  const [activeQuestions, setActiveQuestions] = useState<QuestionData[]>([]);
  
  // 連続出題用の更新キー
  const [refreshKey, setRefreshKey] = useState(0);
  
  // 1回目（初回）の解答結果を記録する（id -> {isCorrect, timedOut}）
  const [firstAttemptResults, setFirstAttemptResults] = useState<Record<string, AttemptResult>>({});

  const [hasStarted, setHasStarted] = useState(false);
  const [mode, setMode] = useState<QuestionType>('en_to_ja');

  const [currentIndex, setCurrentIndex] = useState(0);

  // ゲーミフィケーション: タイム制限設定と結果演出の完了状態
  const [timedMode, setTimedMode] = useState(false);
  const [questionSeconds, setQuestionSeconds] = useState(15);
  const [celebrationDone, setCelebrationDone] = useState(false);

  // 直近のタイム制限設定を復元
  useEffect(() => {
    Promise.resolve().then(() => {
      const prefs = loadQuizPrefs();
      setTimedMode(prefs.timedMode);
      setQuestionSeconds(prefs.questionSeconds);
    });
  }, []);

  useEffect(() => {
    if (!projectId) return;
    Promise.resolve().then(() => {
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
            selectedQuestions = selectFairQuestionSet(activePool, 10);
          }
        }
        setActiveQuestions(selectedQuestions);
      } else {
        router.push('/');
      }
    });
  }, [projectId, router, isReviewMode, refreshKey]);

  const currentQuestion = activeQuestions[currentIndex];
  const isFinished = hasStarted && activeQuestions.length > 0 && currentIndex >= activeQuestions.length;

  const currentChoices = useMemo(() => {
    if (hasStarted && currentQuestion && project) {
      return generateQuizOptions(currentQuestion, project.questions, mode, 4);
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, currentQuestion, mode]);

  useEffect(() => {
    if (hasStarted && currentQuestion && !isFinished) {
      if (mode === 'en_to_ja' || mode === 'fill_in_the_blank') {
        const textToRead = mode === 'en_to_ja' ? currentQuestion.word : getAudioText(currentQuestion);
        playAudio(textToRead);
      }
    }
  }, [hasStarted, currentQuestion, mode, isFinished]);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<QuestionData | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);

  const startEdit = (q: QuestionData) => {
    setEditForm({ ...q });
    setIsEditing(true);
  };

  const handleEnrich = async () => {
    if (!editForm || !editForm.word) return;
    setIsEnriching(true);
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: editForm.word,
          japanese: editForm.japanese,
          partOfSpeech: editForm.partOfSpeech
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '自動生成に失敗しました');

      setEditForm({
        ...editForm,
        phonetic: data.phonetic || editForm.phonetic,
        paragraph: data.paragraph || editForm.paragraph
      });
    } catch (e: unknown) {
      if (e instanceof Error) {
        alert(e.message);
      } else {
        alert('エラーが発生しました');
      }
    } finally {
      setIsEnriching(false);
    }
  };

  const handleEditSave = () => {
    if (project && editForm) {
      const updatedQuestions = project.questions.map(q => q.id === editForm.id ? editForm : q);
      const updatedProject = { ...project, questions: updatedQuestions };
      saveProject(updatedProject);
      setProject(updatedProject);
      
      const updatedActive = activeQuestions.map(q => q.id === editForm.id ? editForm : q);
      setActiveQuestions(updatedActive);
      
      setIsEditing(false);
    }
  };

  const editModal = isEditing && editForm && (
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
            <label className="block text-sm font-bold text-gray-600 mb-1">英文（穴埋めは_、活用形は_[活用形:xxx]）</label>
            <textarea value={editForm.paragraph} onChange={e => setEditForm({...editForm, paragraph: e.target.value})} className="w-full border p-2 rounded-lg h-24" />
          </div>
        </div>
          
          <button 
            onClick={handleEnrich}
            disabled={isEnriching || !editForm.word}
            className="w-full mt-4 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isEnriching ? '生成中...' : '✨ 英単語・意味・品詞から例文と発音を自動生成'}
          </button>

          <div className="mt-6 flex gap-3">
          <button onClick={() => setIsEditing(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl">キャンセル</button>
          <button onClick={handleEditSave} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-md">保存して再開</button>
        </div>
      </div>
    </div>
  );

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

          {/* ゲーミフィケーション: タイム制限モード */}
          <div className="mb-8 bg-orange-50 rounded-2xl p-4 border border-orange-100">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-bold text-gray-700">⏱ タイム制限モード</span>
              <input
                type="checkbox"
                checked={timedMode}
                onChange={(e) => setTimedMode(e.target.checked)}
                className="w-6 h-6 accent-orange-500"
              />
            </label>
            {timedMode && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm font-bold text-gray-500">1問あたり</span>
                <select
                  value={questionSeconds}
                  onChange={(e) => setQuestionSeconds(Number(e.target.value))}
                  className="border border-orange-200 rounded-lg px-3 py-1 font-bold text-gray-700 bg-white"
                >
                  {[10, 15, 20, 30].map((s) => (
                    <option key={s} value={s}>{s} 秒</option>
                  ))}
                </select>
                <span className="text-xs text-gray-400">時間切れの解答は「失敗」扱いになります</span>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              saveQuizPrefs({ timedMode, questionSeconds });
              setHasStarted(true);
            }}
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
    const summary = summarizeSet(firstAttemptResults);

    const hasMoreQuestions = project ? (
      isReviewMode
        ? (project.wrongQuestionIds && project.wrongQuestionIds.length > 0)
        : project.questions.some(q => !q.isMastered)
    ) : false;

    const handleNext10 = () => {
      setFirstAttemptResults({});
      setCurrentIndex(0);
      setCelebrationDone(false);
      setRefreshKey(k => k + 1);
    };
    
    return (
      <div className="min-h-screen bg-orange-50 p-8 flex flex-col items-center pt-12 pb-32">
        <h1 className="text-4xl font-extrabold text-orange-500 mb-8 drop-shadow-sm">結果発表</h1>

        <CountUpResult
          correctCount={summary.correctCount}
          total={summary.total}
          durationMs={2000}
          onDone={() => setCelebrationDone(true)}
        />

        <PerfectCelebration show={summary.isPerfect && celebrationDone} />

        <div className="w-full max-w-lg space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 ml-2 mb-4">今回の単語</h2>
          {Object.entries(firstAttemptResults).map(([id, res]) => {
            const q = project?.questions.find(q => q.id === id);
            if (!q) return null;
            const effective = isEffectiveSuccess(res);
            return (
              <div key={id} className={`p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${effective ? 'bg-white border-l-8 border-green-500' : 'bg-red-50 border-l-8 border-red-500'}`}>
                <div className="flex-grow w-full">
                  <div className="font-bold text-xl text-gray-800 mb-1 flex items-center flex-wrap gap-2">
                    {q.word}
                    {q.partOfSpeech && <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md text-xs font-bold">{q.partOfSpeech}</span>}
                    <span className="text-gray-400 text-sm font-normal">/{q.phonetic}/</span>
                    {res.timedOut && <span className="bg-red-100 text-red-500 px-2 py-0.5 rounded-md text-xs font-bold">⏱ 時間切れ</span>}
                  </div>
                  <div className="text-gray-600 font-medium">{q.japanese}</div>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => startEdit(q)}
                    className="text-gray-400 hover:text-orange-500 p-2 rounded-full hover:bg-orange-50 transition-colors bg-white/50"
                    title="問題を修正"
                  >
                    ✏️
                  </button>
                  <div className="font-extrabold text-3xl">
                    {effective
                      ? <span className="text-green-500">○</span>
                      : <span className="text-red-500" title={res.timedOut && res.isCorrect ? '正解だが時間切れのため失敗扱い' : undefined}>×</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* スクロール不要の固定アクションバー */}
        <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-sm border-t border-orange-100 p-4 sm:p-6 flex justify-center z-40 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)]">
          <div className={`w-full max-w-lg flex gap-3 transition-opacity duration-300 ${celebrationDone ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <button
              onClick={() => router.push('/')}
              disabled={!celebrationDone}
              className={`flex-1 ${hasMoreQuestions ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 py-3' : 'bg-orange-500 text-white py-4'} font-bold rounded-xl transition-colors shadow-sm`}
            >
              ホーム
            </button>
            {hasMoreQuestions && (
              <button
                onClick={handleNext10}
                disabled={!celebrationDone}
                className="flex-[2] bg-green-500 hover:bg-green-600 text-white font-extrabold py-4 text-lg rounded-xl transition-transform hover:-translate-y-1 shadow-md shadow-green-200 flex items-center justify-center gap-2"
              >
                次の10問へ！ <span>🚀</span>
              </button>
            )}
          </div>
        </div>
        
        {editModal}
      </div>
    );
  }

  if (currentChoices.length === 0 || !currentQuestion) return null;

  const handleAnswer = (isCorrect: boolean, timedOut: boolean) => {
    const qId = currentQuestion.id;
    // 実効成功: 正解かつ時間切れでない。時間切れ後の正解は失敗扱い。
    const effective = isCorrect && !timedOut;

    // 初回の回答かどうかを判定
    if (firstAttemptResults[qId] === undefined) {
      setFirstAttemptResults(prev => ({ ...prev, [qId]: { isCorrect, timedOut } }));

      const updatedProject = { ...project };
      const updatedQuestions = [...updatedProject.questions];
      const qIndex = updatedQuestions.findIndex(q => q.id === qId);

      if (qIndex !== -1) {
        const q = { ...updatedQuestions[qIndex] };
        q.correctCount = (q.correctCount || 0) + (effective ? 1 : 0);
        q.incorrectCount = (q.incorrectCount || 0) + (effective ? 0 : 1);
        q.consecutiveCorrectCount = effective ? (q.consecutiveCorrectCount || 0) + 1 : 0;

        if (q.consecutiveCorrectCount >= 3) {
          q.isMastered = true;
        } else if (!effective) {
          q.isMastered = false;
        }
        q.lastStudiedAt = Date.now();
        updatedQuestions[qIndex] = q;
      }

      updatedProject.questions = updatedQuestions;
      updatedProject.lastStudiedAt = Date.now();

      // localStorageのwrongQuestionIdsを更新 (初回のみ評価)
      if (effective) {
        updatedProject.wrongQuestionIds = (updatedProject.wrongQuestionIds || []).filter(id => id !== qId);
      } else {
        updatedProject.wrongQuestionIds = Array.from(new Set([...(updatedProject.wrongQuestionIds || []), qId]));
      }
      saveProject(updatedProject);
      setProject(updatedProject);
    }

    if (effective) {
      setCurrentIndex(i => i + 1);
    } else {
      // 失敗（誤答 or 時間切れ）はキューの最後に追加して再度出題する
      setActiveQuestions(prev => [...prev, currentQuestion]);
      setCurrentIndex(i => i + 1);
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
            const textToRead = mode === 'en_to_ja' ? currentQuestion.word : getAudioText(currentQuestion);
            playAudio(textToRead);
          }}
          className="bg-white border border-orange-200 rounded-full py-2 px-4 shadow-sm hover:bg-orange-50 text-orange-500 font-bold flex items-center gap-2 transition-transform hover:scale-105"
        >
          <span>🔊 音声</span>
        </button>

        <button 
          onClick={() => startEdit(currentQuestion)}
          className="bg-gray-100 text-gray-500 hover:bg-gray-200 font-bold py-2 px-4 rounded-full shadow-sm transition-colors text-sm flex items-center gap-1"
        >
          <span>✏️ 問題を修正</span>
        </button>
      </div>

      <QuizCard
        key={`${currentIndex}-${currentQuestion.id}`}
        question={currentQuestion}
        choices={currentChoices}
        mode={mode}
        timedMode={timedMode}
        questionSeconds={questionSeconds}
        onAnswer={handleAnswer}
      />

      {editModal}
    </div>
  );
}
