"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProject, saveProject } from '@/lib/projectManager';
import { Project, QuestionData } from '@/types';
import Link from 'next/link';

export default function ManageProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;
  const [project, setProject] = useState<Project | null>(null);

  const [newWord, setNewWord] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionData | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isBatchEnriching, setIsBatchEnriching] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');

  useEffect(() => {
    if (projectId) {
      Promise.resolve().then(() => {
        const p = getProject(projectId);
        if (p) setProject(p);
        else router.push('/');
      });
    }
  }, [projectId, router]);

  if (!project) return <div className="p-8 text-center">読み込み中...</div>;

  const handleUpdate = (updatedProject: Project) => {
    saveProject(updatedProject);
    setProject({ ...updatedProject });
  };

  const resetMastered = (questionId: string) => {
    const updatedQuestions = project.questions.map(q =>
      q.id === questionId ? { ...q, isMastered: false, consecutiveCorrectCount: 0 } : q
    );
    handleUpdate({ ...project, questions: updatedQuestions });
  };

  const deleteQuestion = (questionId: string) => {
    if (!confirm('本当に削除しますか？')) return;
    const updatedQuestions = project.questions.filter(q => q.id !== questionId);
    handleUpdate({ ...project, questions: updatedQuestions });
  };

  const generateAndAddWord = async () => {
    if (!newWord.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: [newWord.trim()] })
      });
      const data = await res.json();
      if (res.status === 429) throw new Error(data.message || '本日のAPI利用上限に達しました。明日またお試しください。');
      if (!res.ok) throw new Error(data.error || '自動生成に失敗しました');

      if (data.results && data.results.length > 0) {
        const generated = data.results[0];
        const newQuestion: QuestionData = {
          ...generated,
          id: `q-gen-${Date.now()}`
        };
        handleUpdate({ ...project, questions: [newQuestion, ...project.questions] });
        setNewWord('');
        alert(`「${generated.word}」を追加しました！`);
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        alert(e.message);
      } else {
        alert('エラーが発生しました');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditSave = () => {
    if (editingQuestion) {
      let updatedQuestions;
      const exists = project.questions.find(q => q.id === editingQuestion.id);
      if (exists) {
        updatedQuestions = project.questions.map(q => q.id === editingQuestion.id ? editingQuestion : q);
      } else {
        updatedQuestions = [editingQuestion, ...project.questions];
      }
      handleUpdate({ ...project, questions: updatedQuestions });
      setEditingQuestion(null);
    }
  };

  const handleManualAdd = () => {
    setEditingQuestion({
      id: `q-manual-${Date.now()}`,
      word: newWord.trim(),
      japanese: '',
      phonetic: '',
      partOfSpeech: '',
      paragraph: ''
    });
    setNewWord('');
  };

  const handleEnrich = async () => {
    if (!editingQuestion || !editingQuestion.word) return;
    setIsEnriching(true);
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: editingQuestion.word,
          japanese: editingQuestion.japanese,
          partOfSpeech: editingQuestion.partOfSpeech
        })
      });
      const data = await res.json();
      if (res.status === 429) throw new Error(data.message || '本日のAPI利用上限に達しました。明日またお試しください。');
      if (!res.ok) throw new Error(data.error || '自動生成に失敗しました');

      setEditingQuestion({
        ...editingQuestion,
        phonetic: data.phonetic || editingQuestion.phonetic,
        paragraph: data.paragraph || editingQuestion.paragraph
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

  const missingDataQuestions = project.questions.filter(q => !q.japanese || !q.paragraph || !q.phonetic);

  const handleBatchEnrich = async () => {
    if (missingDataQuestions.length === 0) return;
    if (!confirm(`${missingDataQuestions.length}件の単語の不足データを一括補完しますか？（少し時間がかかります）`)) return;

    setIsBatchEnriching(true);
    setBatchProgress(0);

    const updatedQuestions = [...project.questions];

    try {
      for (let i = 0; i < missingDataQuestions.length; i++) {
        const q = missingDataQuestions[i];
        const index = updatedQuestions.findIndex(uq => uq.id === q.id);
        if (index === -1) continue;

        if (!q.japanese) {
          const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ words: [q.word] })
          });
          const data = await res.json();
          if (res.status === 429) throw new Error(data.message || '本日のAPI利用上限に達しました。明日またお試しください。');
          if (res.ok && data.results && data.results.length > 0) {
            updatedQuestions[index] = { ...updatedQuestions[index], ...data.results[0] };
          }
        } else {
          const res = await fetch('/api/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: q.word, japanese: q.japanese, partOfSpeech: q.partOfSpeech })
          });
          const data = await res.json();
          if (res.status === 429) throw new Error(data.message || '本日のAPI利用上限に達しました。明日またお試しください。');
          if (res.ok) {
            updatedQuestions[index] = { 
              ...updatedQuestions[index], 
              phonetic: data.phonetic || updatedQuestions[index].phonetic, 
              paragraph: data.paragraph || updatedQuestions[index].paragraph 
            };
          }
        }

        setBatchProgress(Math.round(((i + 1) / missingDataQuestions.length) * 100));
        saveProject({ ...project, questions: updatedQuestions });
      }
      setProject({ ...project, questions: updatedQuestions });
      alert('一括補完が完了しました！');
    } catch (e: unknown) {
      if (e instanceof Error) {
        alert(e.message || '通信中にエラーが発生しました。処理を中断します。');
      } else {
        alert('通信中にエラーが発生しました。処理を中断します。');
      }
    } finally {
      setIsBatchEnriching(false);
      setBatchProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          {isEditingName ? (
            <div className="flex items-center gap-2 w-full max-w-lg">
              <input
                type="text"
                value={editNameValue}
                onChange={e => setEditNameValue(e.target.value)}
                className="text-3xl font-extrabold text-orange-600 border-b-2 border-orange-400 focus:outline-none bg-transparent w-full"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter' && editNameValue.trim()) {
                    handleUpdate({ ...project, name: editNameValue.trim() });
                    setIsEditingName(false);
                  } else if (e.key === 'Escape') {
                    setIsEditingName(false);
                  }
                }}
              />
              <button
                onClick={() => {
                  if (editNameValue.trim()) {
                    handleUpdate({ ...project, name: editNameValue.trim() });
                    setIsEditingName(false);
                  }
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-bold shadow-sm whitespace-nowrap"
              >
                保存
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-orange-600 drop-shadow-sm">
                {project.name} の管理⚙️
              </h1>
              <button
                onClick={() => {
                  setEditNameValue(project.name);
                  setIsEditingName(true);
                }}
                className="text-gray-400 hover:text-orange-500 transition-colors p-2 text-xl"
                title="名前を変更"
              >
                ✏️
              </button>
            </div>
          )}
          <Link href="/" className="text-gray-500 hover:text-gray-800 font-bold ml-4">ホームに戻る</Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-orange-100 flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-grow w-full">
            <label className="block text-sm font-bold text-gray-600 mb-1">新しい単語を1つ追加</label>
            <input
              type="text"
              value={newWord}
              onChange={e => setNewWord(e.target.value)}
              placeholder="apple"
              className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-orange-500 outline-none"
              onKeyDown={e => e.key === 'Enter' && generateAndAddWord()}
            />
          </div>
          <div className="w-full sm:w-auto mt-4 sm:mt-5 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleManualAdd}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-xl shadow-sm whitespace-nowrap transition-transform hover:-translate-y-1"
            >
              手動で追加 ✏️
            </button>
            <button
              onClick={generateAndAddWord}
              disabled={isGenerating || !newWord.trim()}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-md disabled:opacity-50 whitespace-nowrap transition-transform hover:-translate-y-1"
            >
              {isGenerating ? '生成中...' : '自動生成して追加 ✨'}
            </button>
          </div>
        </div>

        {missingDataQuestions.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div>
              <h3 className="font-bold text-blue-800 text-lg mb-1">不足データの補完</h3>
              <p className="text-blue-600 text-sm">
                日本語訳や例文が不足している単語が <strong>{missingDataQuestions.length}件</strong> あります。<br/>
                APIを使用して不足しているデータを一括で自動生成できます。
              </p>
            </div>
            <button 
              onClick={handleBatchEnrich}
              disabled={isBatchEnriching}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-transform hover:-translate-y-1 whitespace-nowrap disabled:opacity-50 disabled:transform-none flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              {isBatchEnriching ? <span className="animate-pulse">⏳ 生成中 ({batchProgress}%)</span> : '✨ 一括補完を実行する'}
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-orange-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-orange-100 text-orange-800 border-b-2 border-orange-200">
                  <th className="p-4 w-24">ステータス</th>
                  <th className="p-4">英単語</th>
                  <th className="p-4 w-48">日本語訳</th>
                  <th className="p-4 text-center">正答率</th>
                  <th className="p-4 text-center">連続正解</th>
                  <th className="p-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {project.questions.map(q => {
                  const total = (q.correctCount || 0) + (q.incorrectCount || 0);
                  const rate = total > 0 ? Math.round(((q.correctCount || 0) / total) * 100) : 0;
                  const isMissingData = !q.japanese || !q.paragraph || !q.phonetic;

                  return (
                    <tr key={q.id} className={`border-b border-gray-100 transition-colors ${q.isMastered ? 'bg-orange-50/50 hover:bg-orange-100/50' : (isMissingData ? 'bg-red-50 hover:bg-red-100/50' : 'hover:bg-gray-50')}`}>
                      <td className="p-4 text-center">
                        {q.isMastered ? <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm">殿堂入り</span> : <span className="text-gray-400 text-xs">学習中</span>}
                      </td>
                      <td className="p-4 font-bold text-lg text-gray-800">
                        {q.word}
                        <div className="text-xs text-gray-400 font-normal mt-1">
                          {q.phonetic ? q.phonetic : <span className="text-red-400">(発音記号なし)</span>}
                          {q.partOfSpeech && ` • ${q.partOfSpeech}`}
                        </div>
                        <div className="text-xs text-gray-500 font-normal mt-1 line-clamp-1">
                          {q.paragraph ? q.paragraph.replace(/_\[活用形:.*?\]/g, '_[活用形]') : <span className="text-red-400">(例文なし)</span>}
                        </div>
                      </td>
                      <td className="p-4 text-gray-700">
                        {q.japanese ? q.japanese : <span className="text-red-500 font-bold">(日本語訳なし)</span>}
                      </td>
                      <td className="p-4 text-center">
                        <div className="font-bold text-gray-700">
                          <span className="text-green-500">{q.correctCount || 0}</span> / <span className="text-red-500">{q.incorrectCount || 0}</span>
                        </div>
                        {total > 0 && <div className="text-xs text-gray-400 mt-1">{rate}%</div>}
                      </td>
                      <td className="p-4 text-center font-bold text-orange-500">
                        {q.consecutiveCorrectCount || 0} 回
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingQuestion(q)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors">
                            編集
                          </button>
                          {q.isMastered && (
                            <button onClick={() => resetMastered(q.id)} className="bg-yellow-50 hover:bg-yellow-100 text-yellow-600 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors">
                              リセット
                            </button>
                          )}
                          <button onClick={() => deleteQuestion(q.id)} className="bg-red-50 hover:bg-red-100 text-red-500 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors">
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {project.questions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">単語がありません。</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 編集モーダル */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">単語データの編集</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">英単語</label>
                <input type="text" value={editingQuestion.word} onChange={e => setEditingQuestion({ ...editingQuestion, word: e.target.value })} className="w-full border p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">日本語訳</label>
                <input type="text" value={editingQuestion.japanese} onChange={e => setEditingQuestion({ ...editingQuestion, japanese: e.target.value })} className="w-full border p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">発音記号</label>
                <input type="text" value={editingQuestion.phonetic} onChange={e => setEditingQuestion({ ...editingQuestion, phonetic: e.target.value })} className="w-full border p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">品詞</label>
                <input type="text" value={editingQuestion.partOfSpeech || ''} onChange={e => setEditingQuestion({ ...editingQuestion, partOfSpeech: e.target.value })} className="w-full border p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">英文（穴埋めは_、活用形は_[活用形:xxx]）</label>
                <textarea value={editingQuestion.paragraph} onChange={e => setEditingQuestion({ ...editingQuestion, paragraph: e.target.value })} className="w-full border p-2 rounded-lg h-24" />
              </div>
            </div>
            
            <button 
              onClick={handleEnrich}
              disabled={isEnriching || !editingQuestion.word}
              className="w-full mt-4 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isEnriching ? '生成中...' : '✨ 英単語・意味・品詞から例文と発音を自動生成'}
            </button>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setEditingQuestion(null)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-colors">キャンセル</button>
              <button onClick={handleEditSave} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-md transition-colors">保存する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
