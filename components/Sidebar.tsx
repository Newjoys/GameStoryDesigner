
import React, { useState, useEffect, useRef } from 'react';
import { Project, Chapter, PuzzleDefinition } from '../types';

interface SidebarProps {
  projects: Project[];
  activeId?: string;
  onSelectProject: (p: Project) => void;
  onSelectChapter: (proj: Project, ch: Chapter) => void;
  onSelectPuzzle: (project: Project, chapter: Chapter, puzzle: PuzzleDefinition) => void;
  onNewProject: () => void;
  onAddChapter: (projectId: string) => void;
  onAddPuzzle: (projectId: string, chapterId: string, typeId?: string) => void;
  onMovePuzzle: (puzzleId: string, targetChapterId: string) => void;
  onOpenLibrary: () => void;
  onOpenCanvas: (projectId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  projects, onSelectProject, onSelectChapter, onSelectPuzzle, onNewProject, onAddChapter, onAddPuzzle, onMovePuzzle, onOpenLibrary, onOpenCanvas, activeId 
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dragOverChapterId, setDragOverChapterId] = useState<string | null>(null);
  const [addNodeMenu, setAddNodeMenu] = useState<{ chapterId: string; projectId: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setAddNodeMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const onDragStart = (e: React.DragEvent, puzzleId: string) => {
    e.dataTransfer.setData('puzzleId', puzzleId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, chapterId: string) => {
    e.preventDefault();
    setDragOverChapterId(chapterId);
  };

  const onDrop = (e: React.DragEvent, chapterId: string) => {
    e.preventDefault();
    const puzzleId = e.dataTransfer.getData('puzzleId');
    if (puzzleId) {
      onMovePuzzle(puzzleId, chapterId);
    }
    setDragOverChapterId(null);
  };

  return (
    <div className="w-80 flex flex-col border-r border-slate-200 h-screen bg-white">
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Puzzle Architect
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4">
        <button 
          onClick={onNewProject}
          className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-white rounded-xl transition flex items-center justify-center gap-2 font-medium shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          创建新项目
        </button>

        <button 
          onClick={onOpenLibrary}
          className="w-full py-2.5 px-4 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition flex items-center justify-center gap-2 font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
          模板收藏夹
        </button>

        <div className="space-y-1 mt-6">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">项目库</div>
          {projects.map(proj => (
            <div key={proj.id} className="space-y-1">
              <div 
                onClick={() => onSelectProject(proj)}
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${activeId === proj.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-100 text-slate-700'}`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <svg 
                    onClick={(e) => toggle(proj.id, e)}
                    className={`w-3.5 h-3.5 transition-transform shrink-0 ${expanded[proj.id] ? 'rotate-90' : ''}`} 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path d="M9 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="font-semibold truncate">{proj.name || '未命名项目'}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onOpenCanvas(proj.id); }}
                    className="p-1 hover:bg-indigo-100 rounded text-indigo-600"
                    title="逻辑流画板"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onAddChapter(proj.id); if(!expanded[proj.id]) toggle(proj.id, e); }}
                    className="p-1 hover:bg-indigo-100 rounded text-indigo-600"
                    title="新增章节"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
              </div>
              
              {expanded[proj.id] && (
                <div className="ml-3 border-l border-slate-200 pl-2 space-y-1">
                  {proj.chapters.map(ch => (
                    <div 
                      key={ch.id} 
                      className={`space-y-1 transition-colors rounded-r ${dragOverChapterId === ch.id ? 'bg-indigo-50 border-r-2 border-indigo-400' : ''}`}
                      onDragOver={(e) => onDragOver(e, ch.id)}
                      onDragLeave={() => setDragOverChapterId(null)}
                      onDrop={(e) => onDrop(e, ch.id)}
                    >
                      <div 
                        onClick={() => onSelectChapter(proj, ch)}
                        className={`group relative flex items-center justify-between text-[10px] font-bold px-2 py-1 uppercase tracking-tighter cursor-pointer rounded hover:bg-slate-50 transition ${activeId === ch.id ? 'text-indigo-600' : 'text-slate-400'}`}
                      >
                        <span className="truncate max-w-[120px]">章: {ch.name}</span>
                        <div className="relative">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setAddNodeMenu({ chapterId: ch.id, projectId: proj.id }); }}
                            className="opacity-0 group-hover:opacity-100 text-indigo-500 hover:text-indigo-700 p-0.5"
                            title="新增节点"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                          </button>
                          
                          {/* Node Type Select Dropdown */}
                          {addNodeMenu?.chapterId === ch.id && (
                            <div 
                              ref={menuRef}
                              className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] py-1 animate-in fade-in slide-in-from-top-1 duration-200"
                            >
                              <div className="px-3 py-1.5 text-[8px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-50 mb-1">选择节点类型</div>
                              {proj.nodeTypes.map(nt => (
                                <button 
                                  key={nt.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddPuzzle(proj.id, ch.id, nt.id);
                                    setAddNodeMenu(null);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-[10px] font-bold text-slate-600 flex items-center gap-2 transition-colors"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: nt.color }}></span>
                                  {nt.name}
                                </button>
                              ))}
                              {proj.nodeTypes.length === 0 && <div className="px-3 py-2 text-[9px] text-slate-300 italic">未定义类型</div>}
                            </div>
                          )}
                        </div>
                      </div>
                      {ch.puzzles.map(p => (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, p.id)}
                          onClick={() => onSelectPuzzle(proj, ch, p)}
                          className={`flex items-center gap-2 p-2 text-sm rounded-md cursor-grab active:cursor-grabbing truncate pl-4 ${activeId === p.id ? 'bg-indigo-600 text-white shadow-sm font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0`} style={{ backgroundColor: proj.nodeTypes.find(t => t.id === p.typeId)?.color || '#cbd5e1' }}></span>
                          <span className="truncate">{p.name || '新节点'}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {proj.chapters.length === 0 && (
                    <div className="text-[10px] text-slate-300 italic px-2 py-2">暂无章节</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
