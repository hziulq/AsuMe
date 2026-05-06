import { saveProject, getProjects, getProject, deleteProject } from './projectManager';
import { Project } from '@/types';

// localStorageのモック化
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Project Manager', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const mockProject: Project = {
    id: 'test-proj-1',
    name: 'Test Project',
    questions: [],
    createdAt: Date.now(),
  };

  it('saves and retrieves a project', () => {
    saveProject(mockProject);
    const projects = getProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].id).toBe('test-proj-1');

    const single = getProject('test-proj-1');
    expect(single).toEqual(mockProject);
  });

  it('updates an existing project', () => {
    saveProject(mockProject);
    const updatedProject = { ...mockProject, name: 'Updated Name' };
    saveProject(updatedProject);
    
    const projects = getProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('Updated Name');
  });

  it('deletes a project', () => {
    saveProject(mockProject);
    deleteProject('test-proj-1');
    expect(getProjects()).toHaveLength(0);
  });
});
