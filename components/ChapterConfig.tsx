
import React, { useState } from 'react';
import { Project, Chapter, PuzzleDefinition } from '../types';

interface ChapterConfigProps {
  project: Project;
  chapter: Chapter;
  onUpdate: (ch: Chapter) => void;
  onAddPuzzle: () => void;
  onSelectPuzzle: (pz: PuzzleDefinition) => void;
  onMovePuzzle: (puzzleId: string, targetChapterId: string) => void;
}

const ChapterConfig: React.FC<ChapterConfigProps> = ({ project, chapter, onUpdate, onAddPuzzle, onSelectPuzzle, onMovePuzzle }) => {
  const [expandedPuzzles, setExpandedPuzzles] = useState<Record<string, boolean>>({});
  
  const mechanicCounts = chapter.puzzles.reduce((acc, pz) => {
    pz.mechanics.type.forEach(m => {
      acc[m] = (acc[m] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const togglePuzzle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPuzzles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const onDragStart = (e: React.DragEvent, puzzleId: string) => {
    e.dataTransfer.setData('puzzleId', puzzleId);
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto p-12 bg-slate-50 custom-scroll">
      <div className="max-w-4xl mx-auto space-y-12 pb-20">
        <header className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest">
            {project.name} / CHAPTER OVERVIEW
          </div>
          <input
            type="text"
            value={chapter.name}
            onChange={e => onUpdate({...chapter, name: e.target.value})}
            className="text-5xl font-black text-slate-900 bg-transparent border-none outline-none w-full focus:ring-0"
            placeholder="章节名称..."
          />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
             <div className="text-3xl font-black text-indigo-600">{chapter.puzzles.length}</div>
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">谜题总数</div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
             <div className="text-3xl font-black text-purple-600">{Object.keys(mechanicCounts).length}</div>
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">核心手法覆盖</div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
             <div className="text-3xl font-black text-pink-600">{chapter.puzzles.filter(p => p.rewards.length > 0).length}</div>
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">带奖励谜题</div>
          </div>
        </div>

        <section className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-widest">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              本章节概述 (Description)
            </h3>
            <textarea
              value={chapter.description}
              onChange={e => onUpdate({...chapter, description: e.target.value})}
              placeholder="描述这一章的整体环境氛围、玩家的核心目标，以及这一章在故事中的节奏位置..."
              className="w-full h-32 p-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-100 text-slate-600 resize-none leading-relaxed transition-all"
            />
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-widest">
               手法使用统计
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(mechanicCounts).length > 0 ? Object.entries(mechanicCounts).map(([m, count]) => (
                <div key={m} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs flex items-center gap-3">
                  <span className="font-bold text-slate-700">{m}</span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-black text-[10px]">{count}</span>
                </div>
              )) : <p className="text-xs text-slate-300 italic">尚无手法数据</p>}
            </div>
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-800">章节谜题库</h3>
            <button 
              onClick={onAddPuzzle}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg"
            >
              + 新增谜题
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {chapter.puzzles.map(pz => (
              <div 
                key={pz.id} 
                draggable
                onDragStart={(e) => onDragStart(e, pz.id)}
                className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col hover:border-indigo-400 transition group cursor-grab active:cursor-grabbing shadow-sm"
              >
                <div className="flex justify-between items-center" onClick={() => onSelectPuzzle(pz)}>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => togglePuzzle(pz.id, e)}
                      className="text-slate-400 hover:text-indigo-600 transition"
                    >
                      <svg className={`w-4 h-4 transition-transform ${expandedPuzzles[pz.id] ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <div>
                      <div className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{pz.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">{pz.mechanics.type[0] || '未定手法'}</div>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition text-indigo-600 font-black text-[10px] uppercase">
                    ENTER →
                  </div>
                </div>

                {expandedPuzzles[pz.id] && (pz.summary || pz.mechanics.type.length > 0) && (
                  <div className="mt-4 pt-4 border-t border-slate-200/50 space-y-3">
                    {pz.summary && (
                      <p className="text-xs text-slate-500 leading-relaxed italic">
                        "{pz.summary}"
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {pz.mechanics.type.map(m => (
                        <span key={m} className="px-2 py-0.5 bg-indigo-50 text-[9px] font-bold text-indigo-400 rounded uppercase">{m}</span>
                      ))}
                      {pz.hints.map(h => (
                        <span key={h} className="px-2 py-0.5 bg-purple-50 text-[9px] font-bold text-purple-400 rounded uppercase">{h}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {chapter.puzzles.length === 0 && (
              <div className="py-16 border-4 border-dashed border-slate-200 rounded-[2rem] text-center text-slate-300 font-black italic">
                本章暂无谜题，点击按钮开始创作。
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ChapterConfig;
