
import React, { useState, useEffect, useMemo } from 'react';
import { Project, PuzzleDefinition, Chapter, TemplateLibrary, MechanicType, FlowConnection, NodePosition, NodeTypeConfig } from './types';
import Sidebar from './components/Sidebar';
import PuzzleEditor from './components/PuzzleEditor';
import ProjectConfig from './components/ProjectConfig';
import ChapterConfig from './components/ChapterConfig';
import FlowCanvas from './components/FlowCanvas';

const STORAGE_KEY = 'puzzle_architect_v6';

const DEFAULT_NODE_TYPES: NodeTypeConfig[] = [
  {
    id: 'type-puzzle',
    name: '谜题类',
    color: '#6366f1', // Indigo
    showHints: true,
    showMechanics: true,
    showRewards: true,
    customAttributes: []
  },
  {
    id: 'type-narrative',
    name: '叙事类',
    color: '#f59e0b', // Amber
    showHints: true,
    showMechanics: false,
    showRewards: false,
    customAttributes: []
  }
];

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<TemplateLibrary[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activePuzzleId, setActivePuzzleId] = useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [view, setView] = useState<'welcome' | 'project' | 'chapter' | 'puzzle' | 'library' | 'template_edit' | 'canvas'>('welcome');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<MechanicType[]>([]);

  const currentProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId) || null
  , [projects, activeProjectId]);

  const currentChapter = useMemo(() => {
    if (!currentProject || !activeChapterId) return null;
    return currentProject.chapters.find(ch => ch.id === activeChapterId) || null;
  }, [currentProject, activeChapterId]);

  const currentPuzzle = useMemo(() => {
    if (view === 'template_edit' && activeTemplateId) {
      return templates.find(t => t.id === activeTemplateId)?.puzzle || null;
    }
    if (!currentProject || !activePuzzleId) return null;
    for (const ch of currentProject.chapters) {
      const pz = ch.puzzles.find(p => p.id === activePuzzleId);
      if (pz) return pz;
    }
    return null;
  }, [currentProject, activePuzzleId, view, activeTemplateId, templates]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      setProjects(data.projects || []);
      setTemplates(data.templates || []);
    }
  }, []);

  const saveToStorage = (newProjects: Project[], newTemplates: TemplateLibrary[] = templates) => {
    setProjects(newProjects);
    setTemplates(newTemplates);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects: newProjects, templates: newTemplates }));
  };

  const handleNewProject = () => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: '新未命名项目',
      backgroundStory: '',
      narrativeArc: '',
      nodeTypes: [...DEFAULT_NODE_TYPES],
      chapters: [{
        id: `ch-${Date.now()}`,
        name: '第一章',
        description: '',
        puzzles: []
      }],
      canvasState: { positions: {}, connections: [] }
    };
    saveToStorage([...projects, newProj]);
    setActiveProjectId(newProj.id);
    setActiveChapterId(null);
    setActivePuzzleId(null);
    setView('project');
  };

  const handleUpdateProject = (updated: Project) => {
    saveToStorage(projects.map(p => p.id === updated.id ? updated : p));
  };

  const handleUpdateCanvas = (projectId: string, positions: Record<string, NodePosition>, connections: FlowConnection[]) => {
    const updated = projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          canvasState: { positions, connections }
        };
      }
      return p;
    });
    saveToStorage(updated);
  };

  const handleUpdateChapter = (updatedChapter: Chapter) => {
    if (!activeProjectId) return;
    const updated = projects.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          chapters: p.chapters.map(ch => ch.id === updatedChapter.id ? updatedChapter : ch)
        };
      }
      return p;
    });
    saveToStorage(updated);
  };

  const handleAddChapter = (projectId: string) => {
    const updated = projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          chapters: [...p.chapters, {
            id: `ch-${Date.now()}`,
            name: `新章节 ${p.chapters.length + 1}`,
            description: '',
            puzzles: []
          }]
        };
      }
      return p;
    });
    saveToStorage(updated);
  };

  const handleNewPuzzle = (projectId: string, chapterId?: string, typeId: string = 'type-puzzle') => {
    const proj = projects.find(p => p.id === projectId);
    const nodeType = proj?.nodeTypes.find(t => t.id === typeId) || proj?.nodeTypes[0];
    
    const newPuzzle: PuzzleDefinition = {
      id: `pz-${Date.now()}`,
      name: `新${nodeType?.name || '节点'}`,
      typeId: typeId,
      narrativeContext: '',
      summary: '',
      hints: [],
      mechanics: { 
        type: [],
        itemDetails: { operations: [], functions: [] }
      },
      rewards: [],
      customAttributeValues: []
    };
    
    const updated = projects.map(p => {
      if (p.id === projectId) {
        const targetChapterId = chapterId || p.chapters[0]?.id;
        if (!targetChapterId) return p;
        return {
          ...p,
          chapters: p.chapters.map(ch => 
            ch.id === targetChapterId ? { ...ch, puzzles: [...ch.puzzles, newPuzzle] } : ch
          )
        };
      }
      return p;
    });
    
    saveToStorage(updated);
    
    if (view !== 'canvas') {
      setActivePuzzleId(newPuzzle.id);
      setView('puzzle');
    }
    return newPuzzle.id;
  };

  const handleUpdatePuzzle = (updatedPuzzle: PuzzleDefinition) => {
    if (view === 'template_edit' && activeTemplateId) {
      const updatedTemplates = templates.map(t => 
        t.id === activeTemplateId ? { ...t, puzzle: updatedPuzzle } : t
      );
      saveToStorage(projects, updatedTemplates);
      return;
    }
    if (!activeProjectId) return;
    const updated = projects.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          chapters: p.chapters.map(ch => ({
            ...ch,
            puzzles: ch.puzzles.map(pz => pz.id === updatedPuzzle.id ? updatedPuzzle : pz)
          }))
        };
      }
      return p;
    });
    saveToStorage(updated);
  };

  const handleMovePuzzle = (puzzleId: string, targetChapterId: string) => {
    let puzzleToMove: PuzzleDefinition | null = null;
    const updatedProjects = projects.map(p => ({
      ...p,
      chapters: p.chapters.map(ch => {
        const pz = ch.puzzles.find(item => item.id === puzzleId);
        if (pz) puzzleToMove = pz;
        return { ...ch, puzzles: ch.puzzles.filter(item => item.id !== puzzleId) };
      })
    }));
    if (!puzzleToMove) return;
    const finalProjects = updatedProjects.map(p => ({
      ...p,
      chapters: p.chapters.map(ch => {
        if (ch.id === targetChapterId) return { ...ch, puzzles: [...ch.puzzles, puzzleToMove!] };
        return ch;
      })
    }));
    saveToStorage(finalProjects);
  };

  const handleSaveTemplate = (p: PuzzleDefinition) => {
    const newTemp: TemplateLibrary = { 
      id: `tpl-${Date.now()}`, 
      name: p.name, 
      puzzle: JSON.parse(JSON.stringify(p)) 
    };
    saveToStorage(projects, [...templates, newTemp]);
    alert("已保存到模板收藏夹！");
  };

  const handleEditTemplate = (id: string) => {
    setActiveTemplateId(id);
    setView('template_edit');
    setActivePuzzleId(null);
  };

  const handleUseTemplate = (tpl: TemplateLibrary) => {
    if (!activeProjectId) {
      alert("请先选择一个项目，然后再应用模板。");
      return;
    }
    
    const newPuzzle: PuzzleDefinition = {
      ...JSON.parse(JSON.stringify(tpl.puzzle)),
      id: `pz-${Date.now()}`
    };
    
    const updated = projects.map(p => {
      if (p.id === activeProjectId) {
        const targetChapterId = activeChapterId || p.chapters[0]?.id;
        if (!targetChapterId) return p;
        return {
          ...p,
          chapters: p.chapters.map(ch => 
            ch.id === targetChapterId ? { ...ch, puzzles: [...ch.puzzles, newPuzzle] } : ch
          )
        };
      }
      return p;
    });
    
    saveToStorage(updated);
    setActivePuzzleId(newPuzzle.id);
    setView('puzzle');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar 
        projects={projects}
        activeId={activePuzzleId || activeChapterId || activeProjectId || undefined}
        onSelectProject={(p) => { setActiveProjectId(p.id); setView('project'); setActivePuzzleId(null); setActiveChapterId(null); }}
        onSelectChapter={(proj, ch) => { setActiveProjectId(proj.id); setActiveChapterId(ch.id); setView('chapter'); setActivePuzzleId(null); }}
        onSelectPuzzle={(proj, ch, pz) => { setActiveProjectId(proj.id); setActiveChapterId(ch.id); setActivePuzzleId(pz.id); setView('puzzle'); }}
        onNewProject={handleNewProject}
        onAddChapter={handleAddChapter}
        onAddPuzzle={(projId, chId, typeId) => handleNewPuzzle(projId, chId, typeId)}
        onMovePuzzle={handleMovePuzzle}
        onOpenLibrary={() => setView('library')}
        onOpenCanvas={(projId) => { setActiveProjectId(projId); setView('canvas'); setActivePuzzleId(null); setActiveChapterId(null); }}
      />

      <main className="flex-1 overflow-hidden relative">
        {(view === 'puzzle' || view === 'template_edit') && currentPuzzle && currentProject && (
          <PuzzleEditor 
            project={view === 'template_edit' ? { name: '模板编辑', nodeTypes: DEFAULT_NODE_TYPES } as any : currentProject}
            puzzle={currentPuzzle}
            onSave={handleUpdatePuzzle}
            onDelete={() => {}}
            onSaveTemplate={view === 'template_edit' ? () => alert("这是模板模式，已自动保存") : handleSaveTemplate}
          />
        )}

        {view === 'chapter' && currentChapter && currentProject && (
          <ChapterConfig 
            project={currentProject}
            chapter={currentChapter}
            onUpdate={handleUpdateChapter}
            onAddPuzzle={() => handleNewPuzzle(currentProject.id, currentChapter.id)}
            onSelectPuzzle={(pz) => { setActivePuzzleId(pz.id); setView('puzzle'); }}
            onMovePuzzle={handleMovePuzzle}
          />
        )}

        {view === 'project' && currentProject && (
          <ProjectConfig 
            project={currentProject}
            onUpdate={handleUpdateProject}
            onAddChapter={() => handleAddChapter(currentProject.id)}
            onAddPuzzle={() => handleNewPuzzle(currentProject.id)}
            onSelectPuzzle={(pz) => { setActivePuzzleId(pz.id); setView('puzzle'); }}
            onMovePuzzle={handleMovePuzzle}
            onOpenCanvas={() => setView('canvas')}
          />
        )}

        {view === 'canvas' && currentProject && (
          <FlowCanvas 
            project={currentProject}
            onUpdate={(pos, conn) => handleUpdateCanvas(currentProject.id, pos, conn)}
            onUpdatePuzzle={handleUpdatePuzzle}
            onAddNode={(typeId) => handleNewPuzzle(currentProject.id, undefined, typeId)}
            onSelectPuzzle={(pz) => { setActivePuzzleId(pz.id); setView('puzzle'); }}
            onClose={() => setView('project')}
          />
        )}

        {view === 'welcome' && (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
             <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8 rotate-3">
                <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
             </div>
             <h2 className="text-3xl font-bold text-slate-800 mb-4">开始您的史诗架构</h2>
             <p className="max-w-md text-lg">创建一个项目来组织您的故事和谜题。将谜题与叙事交织，并使用 AI 生成交互原型。</p>
             <button onClick={handleNewProject} className="mt-8 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:scale-105 transition-all">
                开启新设计蓝图
             </button>
          </div>
        )}

        {view === 'library' && (
          <div className="p-12 max-w-6xl mx-auto overflow-y-auto h-full custom-scroll">
            <header className="mb-10">
              <h2 className="text-3xl font-bold text-slate-800 mb-8 flex items-center gap-4">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" strokeWidth="2"/></svg>
                模板收藏夹
              </h2>
            </header>
            {templates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(tpl => (
                  <div key={tpl.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition group overflow-hidden relative flex flex-col h-full">
                    <div className="text-indigo-600 font-bold mb-2 flex justify-between items-start">
                      <span className="text-[10px] tracking-widest uppercase opacity-60">TEMPLATE</span>
                      <button onClick={() => handleEditTemplate(tpl.id)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">{tpl.name}</h4>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {tpl.puzzle.mechanics.type.map(m => (
                        <span key={m} className="px-2 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-500 rounded uppercase">{m}</span>
                      ))}
                    </div>
                    <p className="text-slate-500 text-sm line-clamp-3 mb-6 flex-grow">{tpl.puzzle.narrativeContext || '无剧情描述'}</p>
                    <div className="flex gap-2 mt-auto pt-4 border-t border-slate-50">
                      <button onClick={() => handleUseTemplate(tpl)} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition shadow-sm">应用此模板</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800">未找到合适匹配模板</h3>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
