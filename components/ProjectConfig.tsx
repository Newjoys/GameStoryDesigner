
import React, { useState } from 'react';
import { Project, PuzzleDefinition, NodeTypeConfig, CustomAttribute, AttributeType } from '../types';

interface ProjectConfigProps {
  project: Project;
  onUpdate: (p: Project) => void;
  onAddChapter: () => void;
  onAddPuzzle: () => void;
  onSelectPuzzle: (pz: PuzzleDefinition) => void;
  onMovePuzzle: (puzzleId: string, targetChapterId: string) => void;
  onOpenCanvas: () => void;
}

const ProjectConfig: React.FC<ProjectConfigProps> = ({ project, onUpdate, onAddChapter, onAddPuzzle, onSelectPuzzle, onMovePuzzle, onOpenCanvas }) => {
  const [expandedPuzzles, setExpandedPuzzles] = useState<Record<string, boolean>>({});
  const [dragOverChapterId, setDragOverChapterId] = useState<string | null>(null);

  const togglePuzzle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPuzzles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const onDragStart = (e: React.DragEvent, puzzleId: string) => {
    e.dataTransfer.setData('puzzleId', puzzleId);
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

  const handleAddNodeType = () => {
    const newType: NodeTypeConfig = {
      id: `type-${Date.now()}`,
      name: '新节点类型',
      color: '#94a3b8',
      showHints: true,
      showMechanics: true,
      showRewards: true,
      customAttributes: []
    };
    onUpdate({ ...project, nodeTypes: [...project.nodeTypes, newType] });
  };

  const handleUpdateNodeType = (index: number, updated: NodeTypeConfig) => {
    const nodeTypes = [...project.nodeTypes];
    nodeTypes[index] = updated;
    onUpdate({ ...project, nodeTypes });
  };

  const handleRemoveNodeType = (index: number) => {
    if (project.nodeTypes.length <= 1) return;
    const nodeTypes = project.nodeTypes.filter((_, i) => i !== index);
    onUpdate({ ...project, nodeTypes });
  };

  const handleAddCustomAttr = (typeIndex: number) => {
    const nodeTypes = [...project.nodeTypes];
    const newAttr: CustomAttribute = { id: `attr-${Date.now()}`, name: '新属性', type: 'text' };
    nodeTypes[typeIndex].customAttributes.push(newAttr);
    onUpdate({ ...project, nodeTypes });
  };

  const handleRemoveCustomAttr = (typeIndex: number, attrIndex: number) => {
    const nodeTypes = [...project.nodeTypes];
    nodeTypes[typeIndex].customAttributes.splice(attrIndex, 1);
    onUpdate({ ...project, nodeTypes });
  };

  const handleAddAttrOption = (typeIndex: number, attrIndex: number) => {
    const nodeTypes = [...project.nodeTypes];
    const attr = nodeTypes[typeIndex].customAttributes[attrIndex];
    if (!attr.options) attr.options = [];
    attr.options.push('新选项');
    onUpdate({ ...project, nodeTypes });
  };

  const handleRemoveAttrOption = (typeIndex: number, attrIndex: number, optIndex: number) => {
    const nodeTypes = [...project.nodeTypes];
    const attr = nodeTypes[typeIndex].customAttributes[attrIndex];
    if (attr.options) {
      attr.options.splice(optIndex, 1);
      onUpdate({ ...project, nodeTypes });
    }
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto p-12 bg-slate-50 custom-scroll">
      <div className="max-w-4xl mx-auto space-y-12 pb-20">
        <header className="flex justify-between items-end">
          <div className="space-y-4 flex-1">
            <input
              type="text"
              value={project.name}
              onChange={e => onUpdate({...project, name: e.target.value})}
              className="text-5xl font-black text-slate-900 bg-transparent border-none outline-none w-full focus:ring-0"
              placeholder="项目名称..."
            />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Project Configuration Hub</p>
          </div>
          <button 
            onClick={onOpenCanvas}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-700 rounded-2xl font-bold hover:bg-indigo-100 transition shadow-sm border border-indigo-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            打开逻辑流画板
          </button>
        </header>

        {/* Node Type Configuration */}
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-800">节点类型配置 (Node Type Config)</h3>
            <button 
              onClick={handleAddNodeType}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition"
            >
              + 新增类型
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {project.nodeTypes.map((type, idx) => (
              <div key={type.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 flex gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">画板颜色</label>
                      <input 
                        type="color" 
                        value={type.color} 
                        onChange={e => handleUpdateNodeType(idx, { ...type, color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border-none p-0 bg-transparent"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">类型名称</label>
                      <input 
                        type="text" 
                        value={type.name} 
                        onChange={e => handleUpdateNodeType(idx, { ...type, name: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-sm"
                      />
                    </div>
                  </div>
                  <button onClick={() => handleRemoveNodeType(idx)} className="text-slate-300 hover:text-red-500 transition p-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>

                <div className="flex gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={type.showHints} onChange={e => handleUpdateNodeType(idx, { ...type, showHints: e.target.checked })} className="rounded text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-xs font-bold text-slate-600">显示提示</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={type.showMechanics} onChange={e => handleUpdateNodeType(idx, { ...type, showMechanics: e.target.checked })} className="rounded text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-xs font-bold text-slate-600">显示手法</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={type.showRewards} onChange={e => handleUpdateNodeType(idx, { ...type, showRewards: e.target.checked })} className="rounded text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-xs font-bold text-slate-600">显示奖励</span>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-50 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">自定义属性 (Custom Attributes)</label>
                    <button onClick={() => handleAddCustomAttr(idx)} className="text-indigo-600 hover:text-indigo-800 text-[10px] font-black uppercase">+ 添加属性</button>
                  </div>
                  <div className="space-y-4">
                    {type.customAttributes.map((attr, attrIdx) => (
                      <div key={attr.id} className="bg-slate-50 p-4 rounded-2xl space-y-3 relative group/attr">
                        <button 
                          onClick={() => handleRemoveCustomAttr(idx, attrIdx)} 
                          className="absolute top-2 right-2 opacity-0 group-hover/attr:opacity-100 text-slate-300 hover:text-red-500 transition p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">属性名称</label>
                            <input 
                              type="text" 
                              value={attr.name} 
                              onChange={e => {
                                const customAttributes = [...type.customAttributes];
                                customAttributes[attrIdx].name = e.target.value;
                                handleUpdateNodeType(idx, { ...type, customAttributes });
                              }}
                              className="w-full bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-100 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">数据类型</label>
                            <select 
                              value={attr.type} 
                              onChange={e => {
                                const customAttributes = [...type.customAttributes];
                                customAttributes[attrIdx].type = e.target.value as AttributeType;
                                if (e.target.value === 'select' && !customAttributes[attrIdx].options) {
                                  customAttributes[attrIdx].options = ['选项1'];
                                }
                                handleUpdateNodeType(idx, { ...type, customAttributes });
                              }}
                              className="w-full bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-100 outline-none"
                            >
                              <option value="text">文本</option>
                              <option value="number">数值</option>
                              <option value="image">本地上传图片</option>
                              <option value="select">多选</option>
                            </select>
                          </div>
                        </div>
                        {attr.type === 'select' && (
                          <div className="space-y-2 pt-2">
                             <div className="flex justify-between items-center">
                               <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">选项列表</label>
                               <button onClick={() => handleAddAttrOption(idx, attrIdx)} className="text-indigo-600 text-[9px] font-bold uppercase hover:underline">+ 新增选项</button>
                             </div>
                             <div className="flex flex-wrap gap-2">
                               {attr.options?.map((opt, optIdx) => (
                                 <div key={optIdx} className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg pl-3 pr-1 py-1">
                                   <input 
                                     type="text" 
                                     value={opt} 
                                     onChange={e => {
                                       const customAttributes = [...type.customAttributes];
                                       if (customAttributes[attrIdx].options) {
                                         customAttributes[attrIdx].options![optIdx] = e.target.value;
                                         handleUpdateNodeType(idx, { ...type, customAttributes });
                                       }
                                     }}
                                     className="bg-transparent border-none text-[10px] font-bold text-slate-600 p-0 focus:ring-0 w-16"
                                   />
                                   <button onClick={() => handleRemoveAttrOption(idx, attrIdx, optIdx)} className="text-slate-300 hover:text-red-500 transition">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                   </button>
                                 </div>
                               ))}
                             </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <h3 className="text-sm font-black text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-widest">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              世界观与故事背景
            </h3>
            <textarea
              value={project.backgroundStory}
              onChange={e => onUpdate({...project, backgroundStory: e.target.value})}
              placeholder="描述游戏的整体背景、时代设定、核心冲突等..."
              className="w-full h-40 p-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-100 text-slate-600 resize-none leading-relaxed transition-all"
            />
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <h3 className="text-sm font-black text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-widest">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              故事脉络 (Narrative Arc)
            </h3>
            <textarea
              value={project.narrativeArc}
              onChange={e => onUpdate({...project, narrativeArc: e.target.value})}
              placeholder="简述游戏的主线流程，例如：起、承、转、合的关键节点..."
              className="w-full h-40 p-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-purple-100 text-slate-600 resize-none leading-relaxed transition-all"
            />
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-800">章节与节点矩阵</h3>
            <div className="flex gap-3">
              <button 
                onClick={onAddChapter}
                className="px-6 py-2 bg-white border-2 border-slate-900 text-slate-900 rounded-xl font-bold hover:bg-slate-50 transition shadow-sm"
              >
                + 新增章节
              </button>
              <button 
                onClick={onAddPuzzle}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition shadow-lg"
              >
                + 新增节点
              </button>
            </div>
          </div>
          
          <div className="space-y-6">
            {project.chapters.map(ch => (
              <div 
                key={ch.id} 
                className={`bg-white p-6 rounded-3xl border-2 transition-all ${dragOverChapterId === ch.id ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 shadow-sm'}`}
                onDragOver={(e) => onDragOver(e, ch.id)}
                onDragLeave={() => setDragOverChapterId(null)}
                onDrop={(e) => onDrop(e, ch.id)}
              >
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                   <h4 className="font-black text-slate-800 uppercase tracking-tighter italic flex items-center gap-2">
                     <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1m-6 9a2 2 0 01-2-2V7m6 10l-2 2-2-2m4-4l-4 4-4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                     Chapter: {ch.name}
                   </h4>
                   <span className="text-[10px] text-slate-400 font-bold">{ch.puzzles.length} 个节点</span>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {ch.puzzles.map(pz => {
                    const nodeType = project.nodeTypes.find(t => t.id === pz.typeId);
                    return (
                      <div 
                        key={pz.id} 
                        draggable
                        onDragStart={(e) => onDragStart(e, pz.id)}
                        className="p-4 bg-slate-50 border border-transparent rounded-2xl flex flex-col hover:border-indigo-300 hover:bg-white transition group cursor-grab active:cursor-grabbing"
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
                              <div className="font-bold text-slate-800">{pz.name}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: nodeType?.color || '#cbd5e1' }}></span>
                                {nodeType?.name || '未知类型'}
                              </div>
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition text-indigo-600 font-black text-xs uppercase tracking-tighter">
                            编辑设计 →
                          </div>
                        </div>
                        
                        {expandedPuzzles[pz.id] && (pz.summary || (pz.mechanics.type.length > 0)) && (
                          <div className="mt-4 pt-4 border-t border-slate-200/50 space-y-3">
                            {pz.summary && (
                              <p className="text-xs text-slate-500 leading-relaxed italic">
                                "{pz.summary}"
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1">
                              {nodeType?.showMechanics && pz.mechanics.type.map(m => (
                                <span key={m} className="px-2 py-0.5 bg-indigo-50 text-[9px] font-bold text-indigo-400 rounded uppercase">{m}</span>
                              ))}
                              {nodeType?.showHints && pz.hints.map(h => (
                                <span key={h} className="px-2 py-0.5 bg-purple-50 text-[9px] font-bold text-purple-400 rounded uppercase">{h}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {ch.puzzles.length === 0 && (
                    <div className="py-8 border-2 border-dashed border-slate-100 rounded-2xl text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">
                      该章节暂无内容（支持拖拽移入）
                    </div>
                  )}
                </div>
              </div>
            ))}
            {project.chapters.length === 0 && (
              <div className="py-20 border-4 border-dashed border-slate-200 rounded-[2.5rem] text-center text-slate-300 font-black italic">
                当前项目尚无章节，点击上方按钮开始构建。
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProjectConfig;
