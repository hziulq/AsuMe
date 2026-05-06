import JSZip from 'jszip';
import { Project } from '@/types';
import { saveProject } from './projectManager';

// プロジェクトをZIPとしてエクスポート
export const exportProjectToZip = async (project: Project) => {
  const zip = new JSZip();
  
  // 今後の拡張（音声ファイルや画像などを内包するなど）を見据え、データをJSON化して格納
  zip.file("project.json", JSON.stringify(project, null, 2));
  
  // ZIPのBlobを生成
  const content = await zip.generateAsync({ type: "blob" });
  
  // ブラウザの機能を利用してダウンロード
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name}_asume_export.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ZIPからプロジェクトをインポート
export const importProjectFromZip = async (file: File): Promise<void> => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  
  const projectFile = loadedZip.file("project.json");
  if (!projectFile) {
    throw new Error("無効なZIPファイルです: project.jsonが見つかりません。");
  }
  
  const content = await projectFile.async("string");
  const project: Project = JSON.parse(content);
  
  // IDが重複する可能性を考慮し、インポート時に新しいIDを付与
  project.id = `proj-${Date.now()}`;
  saveProject(project);
};
