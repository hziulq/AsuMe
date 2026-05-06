import { Project } from '@/types';

const OLD_STORAGE_KEY = 'mikan_projects';
const STORAGE_KEY = 'asume_projects';

export const getProjects = (): Project[] => {
  if (typeof window === 'undefined') return [];
  
  // マイグレーション処理
  const oldData = localStorage.getItem(OLD_STORAGE_KEY);
  if (oldData) {
    localStorage.setItem(STORAGE_KEY, oldData);
    localStorage.removeItem(OLD_STORAGE_KEY);
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveProject = (project: Project): void => {
  const projects = getProjects();
  const existingIndex = projects.findIndex(p => p.id === project.id);
  
  if (existingIndex >= 0) {
    projects[existingIndex] = project;
  } else {
    projects.push(project);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

export const getProject = (id: string): Project | undefined => {
  return getProjects().find(p => p.id === id);
};

export const deleteProject = (id: string): void => {
  const projects = getProjects().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};
