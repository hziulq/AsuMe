"use client";

import React, { useState, useEffect } from 'react';
import { getProjects, saveProject, deleteProject } from '@/lib/projectManager';
import { parseCSV } from '@/lib/csvParser';
import { exportProjectToCSV } from '@/lib/csvExporter';
import { exportProjectToZip, importProjectFromZip } from '@/lib/zipManager';
import { Project } from '@/types';
import Link from 'next/link';

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [exportingProject, setExportingProject] = useState<Project | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => {
      setProjects(getProjects());
    });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.zip')) {
      try {
        await importProjectFromZip(file);
        setProjects(getProjects());
        alert('ZIPからプロジェクトを復元しました！');
      } catch {
        alert('ZIPの読み込みに失敗しました。');
      }
    } else if (file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const questions = await parseCSV(content);

          const newProject: Project = {
            id: `proj-${Date.now()}`,
            name: file.name.replace('.csv', ''),
            questions,
            wrongQuestionIds: [],
            createdAt: Date.now()
          };

          const missingJapaneseCount = questions.filter(q => !q.japanese).length;

          saveProject(newProject);
          setProjects(getProjects());

          if (missingJapaneseCount > 0) {
            alert(`読み込みが完了しました。\n\n※ ${missingJapaneseCount}件の単語に日本語訳が設定されていません。\n管理画面の「不足データを一括補完」から自動生成を実行してください。`);
          } else {
            alert('CSVからプロジェクトを作成しました！');
          }
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : 'フォーマットを確認してください。';
          alert(`CSVの読み込みエラー: ${errMsg}`);
        }
      };
      reader.readAsText(file);
    } else {
      alert('CSVまたはZIPファイルを選択してください。');
    }

    e.target.value = '';
  };

  const handleExportZip = async (project: Project) => {
    try {
      await exportProjectToZip(project);
    } catch {
      alert('エクスポートに失敗しました。');
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold text-orange-600 mb-8 text-center drop-shadow-sm">
          英単語アプリ AsuMe
        </h1>

        <div className="bg-white rounded-3xl shadow-lg p-8 mb-8 text-center border border-orange-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-orange-400"></div>
          <h2 className="text-2xl font-bold text-gray-700 mb-6">学習プロジェクトを追加・復元</h2>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <label className="cursor-pointer bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-full inline-block transition-transform hover:-translate-y-1 hover:shadow-xl shadow-md w-full sm:w-auto">
              ＋ CSV / ZIP をアップロード
              <input type="file" accept=".csv,.zip" className="hidden" onChange={handleFileUpload} />
            </label>
            <Link href="/generator" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-full inline-block transition-transform hover:-translate-y-1 hover:shadow-xl shadow-md w-full sm:w-auto">
              ✨ 英単語から自動生成
            </Link>
          </div>
          <p className="text-gray-400 text-sm mt-4">.csvファイルから新規作成、またはAPIを利用して単語データを作成できます。</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 ml-2">プロジェクト一覧</h2>
          {projects.length === 0 ? (
            <p className="text-gray-500 ml-2">プロジェクトがありません。</p>
          ) : (
            projects.map(project => {
              const studiedWords = project.questions.filter(q => q.correctCount || q.incorrectCount).length;
              const totalAnswers = project.questions.reduce((sum, q) => sum + (q.correctCount || 0) + (q.incorrectCount || 0), 0);
              const totalCorrect = project.questions.reduce((sum, q) => sum + (q.correctCount || 0), 0);
              const accuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
              const cycles = project.questions.length > 0
                ? Math.min(...project.questions.map(q => (q.correctCount || 0) + (q.incorrectCount || 0)))
                : 0;
              const masteredWords = project.questions.filter(q => q.isMastered).length;

              return (
                <div key={project.id} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-full sm:w-1/2">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-gray-800">{project.name}</h3>
                      {cycles > 0 && <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md text-xs font-bold">{cycles}周クリア</span>}
                    </div>

                    <div className="flex flex-wrap text-sm text-gray-500 gap-x-4 gap-y-1 mb-3 font-medium">
                      <span>全 {project.questions.length} 問</span>
                      <span>殿堂入り: {masteredWords} 問</span>
                      <span>正答率: {accuracy}%</span>
                    </div>

                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(studiedWords / project.questions.length) * 100}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">学習進捗: {studiedWords} / {project.questions.length}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                    {project.wrongQuestionIds && project.wrongQuestionIds.length > 0 && (
                      <Link href={`/quiz/${project.id}?review=true`} className="bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-2 px-5 rounded-xl shadow-sm transition-transform hover:scale-105 flex items-center justify-center">
                        復習 ({project.wrongQuestionIds.length}問)
                      </Link>
                    )}
                    <Link href={`/quiz/${project.id}`} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-5 rounded-xl shadow-sm transition-transform hover:scale-105 flex items-center justify-center">
                      学習開始
                    </Link>
                    <Link href={`/manage/${project.id}`} className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2 px-4 rounded-xl transition-colors">
                      管理⚙️
                    </Link>
                    <button onClick={() => setExportingProject(project)} className="bg-blue-50 hover:bg-blue-100 text-blue-500 font-bold py-2 px-4 rounded-xl transition-colors">
                      エクスポート
                    </button>
                    <button onClick={() => { if (confirm('削除しますか？')) { deleteProject(project.id); setProjects(getProjects()); } }} className="bg-red-50 hover:bg-red-100 text-red-500 font-bold py-2 px-4 rounded-xl transition-colors">
                      削除
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* --- アプリの使い方ガイド --- */}
        <div className="mt-16 bg-white rounded-3xl shadow-sm p-8 border border-orange-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span>💡</span> アプリの簡単な使い方
          </h2>
          
          <div className="space-y-6 text-gray-700">
            <div className="flex gap-4 items-start">
              <div className="bg-orange-100 text-orange-600 font-bold rounded-full w-8 h-8 flex items-center justify-center shrink-0">1</div>
              <div>
                <h3 className="font-bold text-lg mb-1">英単語だけを入力して自動生成！</h3>
                <p className="text-sm leading-relaxed">
                  「<span className="font-bold text-blue-500">✨ 英単語から自動生成</span>」ボタンを押し、覚えたい英単語を改行区切りで入力するだけ。<br/>
                  自動で品詞や発音記号、日本語訳が生成されます。最大の強みは、**TOEIC（ビジネス・旅行・フォーマル等）を意識した実践的な穴埋め例文**が<span className="font-bold text-orange-500">無料</span>で作れる点です！
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="bg-orange-100 text-orange-600 font-bold rounded-full w-8 h-8 flex items-center justify-center shrink-0">2</div>
              <div>
                <h3 className="font-bold text-lg mb-1">サクサク学習＆ネイティブ音声</h3>
                <p className="text-sm leading-relaxed">
                  「<span className="font-bold text-green-500">学習開始</span>」ボタンからクイズをスタート！<br/>
                  自動生成された自然な音声が再生されます。間違えた問題は後からまとめて復習でき、3回連続で正解すると「殿堂入り👑」となり出題されなくなります。
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="bg-orange-100 text-orange-600 font-bold rounded-full w-8 h-8 flex items-center justify-center shrink-0">3</div>
              <div>
                <h3 className="font-bold text-lg mb-1">既存のデータから取り込む・補完する</h3>
                <p className="text-sm leading-relaxed">
                  お手持ちのExcelやCSVファイルから一括で単語帳を作成することも可能。<br/>
                  もし日本語訳や例文が不足している単語があっても、管理画面の「**一括補完（Batch Enrich）**」機能で、後からボタン1つで全自動補完できます。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {exportingProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">エクスポート形式の選択</h2>
            <p className="text-sm text-gray-600 mb-6">{exportingProject.name} を出力します。</p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  handleExportZip(exportingProject);
                  setExportingProject(null);
                }}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl flex flex-col items-center transition-colors shadow-sm"
              >
                <span className="text-lg">プロジェクトデータ (ZIP)</span>
                <span className="text-xs font-normal opacity-90 mt-1">学習履歴や成績を含む完全なバックアップ</span>
              </button>

              <button
                onClick={() => {
                  exportProjectToCSV(exportingProject);
                  setExportingProject(null);
                }}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-xl flex flex-col items-center transition-colors shadow-sm"
              >
                <span className="text-lg">単語帳データ (CSV)</span>
                <span className="text-xs font-normal opacity-90 mt-1">Excel等で編集できる単語リストのみ</span>
              </button>
            </div>

            <button
              onClick={() => setExportingProject(null)}
              className="w-full mt-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
