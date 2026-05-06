"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveProject } from '@/lib/projectManager';
import { Project, QuestionData } from '@/types';
import Link from 'next/link';

export default function GeneratorPage() {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState<QuestionData[] | null>(null);

  const handleGenerate = async () => {
    setError('');
    const words = inputText.split('\n').map(w => w.trim()).filter(w => w);
    if (words.length === 0) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '自動生成に失敗しました');
      }

      const questionsWithIds = data.results.map((q: any, i: number) => ({
        ...q,
        id: `q-gen-${Date.now()}-${i}`
      }));

      setPreviewData(questionsWithIds);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!previewData) return;
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: `自動生成単語帳 (${new Date().toLocaleDateString()})`,
      questions: previewData,
      createdAt: Date.now(),
      wrongQuestionIds: []
    };
    saveProject(newProject);
    alert('プロジェクトを保存しました！');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-orange-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-extrabold text-orange-600 drop-shadow-sm">単語データ自動生成 ✨</h1>
          <Link href="/" className="text-gray-500 hover:text-gray-800 font-bold">ホームに戻る</Link>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-orange-100">
          <p className="text-gray-600 mb-4 font-bold">追加したい英単語を改行区切りで入力してください。</p>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full h-48 border-2 border-gray-200 rounded-xl p-4 focus:border-orange-500 outline-none mb-4 font-mono"
            placeholder="apple&#10;banana&#10;ambiguity"
          />
          {error && <p className="text-red-500 font-bold mb-4">{error}</p>}
          <button
            onClick={handleGenerate}
            disabled={isLoading || inputText.trim() === ''}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-extrabold py-4 rounded-xl shadow-md transition-transform hover:-translate-y-1 disabled:opacity-50 disabled:transform-none flex justify-center items-center gap-2"
          >
            {isLoading ? <span className="animate-pulse">🔄 API連携中... しばらくお待ちください</span> : 'データを自動生成する'}
          </button>
        </div>

        {previewData && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">プレビュー</h2>
              <button 
                onClick={handleSave}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-transform hover:scale-105"
              >
                プロジェクトとして保存
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-orange-100 text-orange-800 border-b-2 border-orange-200">
                    <th className="p-3 rounded-tl-xl w-32">英単語</th>
                    <th className="p-3 w-32">日本語訳</th>
                    <th className="p-3 w-24">品詞</th>
                    <th className="p-3 w-32">発音記号</th>
                    <th className="p-3 rounded-tr-xl">例文 (穴埋め)</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((q, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-bold text-lg">{q.word}</td>
                      <td className="p-3 text-gray-700">{q.japanese}</td>
                      <td className="p-3 text-sm">
                        {q.partOfSpeech && <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-md font-bold">{q.partOfSpeech}</span>}
                      </td>
                      <td className="p-3 text-gray-500 font-mono text-sm">{q.phonetic}</td>
                      <td className="p-3 text-sm text-gray-600">{q.paragraph}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
