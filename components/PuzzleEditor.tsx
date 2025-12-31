
import React, { useState, useEffect } from 'react';
import { 
  PuzzleDefinition, HintType, MechanicType, RewardType, 
  ItemOperation, ItemFunction, Project, CustomAttributeValue
} from '../types';
import { generatePuzzleDesign, generateUIPrototype } from '../geminiService';

interface PuzzleEditorProps {
  project: Project;
  puzzle: PuzzleDefinition;
  onSave: (p: PuzzleDefinition) => void;
  onDelete: (id: string) => void;
  onSaveTemplate: (p: PuzzleDefinition) => void;
}

const HINTS: HintType[] = ['图文提示', '声音提示', '颜色差异提示', '动态物体提示', '特写提示'];
const MECHANICS: MechanicType[] = [
  '道具', '穷举法与重复操作', '特殊能力', '音符谜题', '考眼力', 
  '流程谜题', '分开的"锁"与钥匙', '小游戏', '多条件谜题'
];
const REWARDS: RewardType[] = ['道具', '动画演出', '改变场景'];
const ITEM_OPS: ItemOperation[] = ['道具获取', '道具组合', '道具使用', '道具说明'];
const ITEM_FUNCS: ItemFunction[] = ['奖励道具', '解锁道具', '提示道具'];

const Chip: React.FC<{ label: string, selected: boolean, onClick: () => void, colorClass?: string, size?: 'sm' | 'md' }> = ({ label, selected, onClick, colorClass, size = 'md' }) => (
  <button
    onClick={onClick}
    className={`${size === 'sm' ? 'px-3 py-1 text-[11px]' : 'px-4 py-2 text-sm'} rounded-xl font-medium transition-all border ${
      selected 
        ? (colorClass ? `${colorClass} text-white shadow-md border-transparent` : 'bg-indigo-600 text-white border-indigo-600 shadow-md')
        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 shadow-sm'
    }`}
  >
    {label}
  </button>
);

const PuzzleEditor: React.FC<PuzzleEditorProps> = ({ project, puzzle, onSave, onDelete, onSaveTemplate }) => {
  const [edited, setEdited] = useState<PuzzleDefinition>(puzzle);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [loadingUI, setLoadingUI] = useState(false);

  useEffect(() => { setEdited(puzzle); }, [puzzle]);

  const nodeType = project.nodeTypes.find(t => t.id === edited.typeId);

  const toggleItem = <T,>(arr: T[], item: T) => 
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  const handleGenDoc = async () => {
    setLoadingDoc(true);
    const content = await generatePuzzleDesign(edited, project);
    const updated = { ...edited, aiGeneratedContent: content };
    setEdited(updated);
    onSave(updated);
    setLoadingDoc(false);
  };

  const handleGenUI = async () => {
    setLoadingUI(true);
    const ui = await generateUIPrototype(edited);
    const updated = { ...edited, uiPrototype: ui };
    setEdited(updated);
    onSave(updated);
    setLoadingUI(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, attrId?: string) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (attrId) {
          const values = [...(edited.customAttributeValues || [])];
          const idx = values.findIndex(v => v.attributeId === attrId);
          if (idx >= 0) {
            const currentImages = Array.isArray(values[idx].value) ? values[idx].value : [];
            values[idx].value = [...currentImages, base64];
          } else {
            values.push({ attributeId: attrId, value: [base64] });
          }
          setEdited({ ...edited, customAttributeValues: values });
        } else {
          setEdited(prev => ({
            ...prev,
            manualImages: [...(prev.manualImages || []), base64]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttrImage = (attrId: string, imgIndex: number) => {
    const values = [...(edited.customAttributeValues || [])];
    const idx = values.findIndex(v => v.attributeId === attrId);
    if (idx >= 0 && Array.isArray(values[idx].value)) {
      values[idx].value = values[idx].value.filter((_: any, i: number) => i !== imgIndex);
      setEdited({ ...edited, customAttributeValues: values });
    }
  };

  const removeImage = (index: number) => {
    setEdited(prev => ({
      ...prev,
      manualImages: (prev.manualImages || []).filter((_, i) => i !== index)
    }));
  };

  const handleAttrChange = (attrId: string, value: any) => {
    const values = [...(edited.customAttributeValues || [])];
    const idx = values.findIndex(v => v.attributeId === attrId);
    if (idx >= 0) {
      values[idx].value = value;
    } else {
      values.push({ attributeId: attrId, value });
    }
    setEdited({ ...edited, customAttributeValues: values });
  };

  const updateItemDetails = (key: 'operations' | 'functions', value: any) => {
    setEdited({
      ...edited,
      mechanics: {
        ...edited.mechanics,
        itemDetails: {
          operations: edited.mechanics.itemDetails?.operations || [],
          functions: edited.mechanics.itemDetails?.functions || [],
          [key]: value
        }
      }
    });
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto p-8 custom-scroll bg-slate-50">
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        
        {/* Header */}
        <div className="flex justify-between items-start bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: nodeType?.color }}></span>
              {project.name} / {nodeType?.name || '编辑器'}
            </div>
            <input
              type="text"
              value={edited.name}
              placeholder="命名您的节点..."
              onChange={e => setEdited({...edited, name: e.target.value})}
              className="text-4xl font-black text-slate-900 w-full focus:outline-none placeholder-slate-300 bg-slate-50/50 hover:bg-slate-50 focus:bg-white px-3 py-2 rounded-xl border-2 border-transparent focus:border-indigo-200 transition-all"
            />
          </div>
          <div className="flex gap-3 pt-3">
            <button onClick={() => onSaveTemplate(edited)} className="px-4 py-2 text-indigo-600 font-bold hover:bg-indigo-50 rounded-xl transition">设为模板</button>
            <button onClick={() => onSave(edited)} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold shadow-xl hover:bg-black transition">保存设计</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              叙事与剧情衔接
            </h3>
            <textarea
              value={edited.narrativeContext}
              onChange={e => setEdited({...edited, narrativeContext: e.target.value})}
              placeholder="描述此节点在剧情中的位置..."
              className="w-full h-32 p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-100 text-slate-600 resize-none text-sm leading-relaxed"
            />
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-indigo-700 flex items-center gap-2 text-sm uppercase tracking-wider">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              功能概要 (Summary)
            </h3>
            <textarea
              value={edited.summary}
              onChange={e => setEdited({...edited, summary: e.target.value})}
              placeholder="提炼核心逻辑概要..."
              className="w-full h-32 p-4 bg-indigo-50/50 rounded-xl border-none focus:ring-2 focus:ring-indigo-100 text-slate-600 resize-none text-sm leading-relaxed"
            />
          </div>
        </div>

        {/* User Manual Section */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              用户设计手册 (Manual Design)
            </h3>
            <label className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-emerald-100 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              上传参考图
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e)} />
            </label>
          </div>
          
          <textarea
            value={edited.userDesignManual || ''}
            onChange={e => setEdited({...edited, userDesignManual: e.target.value})}
            placeholder="在这里记录详细逻辑、解密步骤或关卡草案..."
            className="w-full h-64 p-5 bg-emerald-50/30 rounded-2xl border-none focus:ring-2 focus:ring-emerald-100 text-slate-700 leading-relaxed text-sm"
          />

          {edited.manualImages && edited.manualImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-4">
              {edited.manualImages.map((img, idx) => (
                <div key={idx} className="relative aspect-square group rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                  <img src={img} className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conditional Sections based on Node Type Config */}
        {nodeType?.showHints && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">提示 (Hints)</h4>
            <div className="flex flex-wrap gap-2">
              {HINTS.map(h => <Chip key={h} label={h} selected={edited.hints.includes(h)} onClick={() => setEdited({...edited, hints: toggleItem(edited.hints, h)})} />)}
            </div>
            <textarea
              value={edited.hintsDescription || ''}
              onChange={e => setEdited({...edited, hintsDescription: e.target.value})}
              placeholder="填写提示的具体内容..."
              className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-purple-100 text-sm"
            />
          </div>
        )}

        {nodeType?.showMechanics && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-4">
              <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">核心手法 (Mechanics)</h4>
              <div className="flex flex-wrap gap-2">
                {MECHANICS.map(m => (
                  <Chip 
                    key={m} 
                    label={m} 
                    selected={edited.mechanics.type.includes(m)} 
                    onClick={() => setEdited({...edited, mechanics: {...edited.mechanics, type: toggleItem(edited.mechanics.type, m)}})} 
                  />
                ))}
              </div>

              {/* Sub-Mechanics for Item (道具) */}
              {edited.mechanics.type.includes('道具') && (
                <div className="mt-4 p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-5 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-3">
                    <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">道具操作 (Item Operations)</div>
                    <div className="flex flex-wrap gap-2">
                      {ITEM_OPS.map(op => (
                        <Chip 
                          key={op} 
                          size="sm"
                          label={op} 
                          colorClass="bg-emerald-600"
                          selected={edited.mechanics.itemDetails?.operations?.includes(op) || false} 
                          onClick={() => updateItemDetails('operations', toggleItem(edited.mechanics.itemDetails?.operations || [], op))} 
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">道具功能 (Item Functions)</div>
                    <div className="flex flex-wrap gap-2">
                      {ITEM_FUNCS.map(fn => (
                        <Chip 
                          key={fn} 
                          size="sm"
                          label={fn} 
                          colorClass="bg-emerald-600"
                          selected={edited.mechanics.itemDetails?.functions?.includes(fn) || false} 
                          onClick={() => updateItemDetails('functions', toggleItem(edited.mechanics.itemDetails?.functions || [], fn))} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <textarea
              value={edited.mechanics.mechanicsDescription || ''}
              onChange={e => setEdited({...edited, mechanics: { ...edited.mechanics, mechanicsDescription: e.target.value }})}
              placeholder="填写手法的具体逻辑..."
              className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-100 text-sm"
            />
          </div>
        )}

        {/* Dynamic Custom Attributes Section */}
        {nodeType?.customAttributes.map(attr => {
          const valObj = edited.customAttributeValues?.find(v => v.attributeId === attr.id);
          const val = valObj ? valObj.value : (attr.type === 'select' || attr.type === 'image' ? [] : '');

          return (
            <div key={attr.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">{attr.name}</h4>
              
              {attr.type === 'text' && (
                <textarea
                  value={val || ''}
                  onChange={e => handleAttrChange(attr.id, e.target.value)}
                  placeholder={`输入 ${attr.name} 的文本内容...`}
                  className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-slate-100 text-sm"
                />
              )}

              {attr.type === 'number' && (
                <input
                  type="number"
                  value={val || 0}
                  onChange={e => handleAttrChange(attr.id, parseFloat(e.target.value))}
                  className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-slate-100 text-sm font-bold"
                />
              )}

              {attr.type === 'image' && (
                <div className="space-y-4">
                   <label className="flex items-center gap-2 w-fit px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-200 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    上传图片
                    <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, attr.id)} />
                  </label>
                  {Array.isArray(val) && val.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {val.map((img: string, idx: number) => (
                        <div key={idx} className="relative aspect-video group rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                          <img src={img} className="w-full h-full object-cover" />
                          <button onClick={() => removeAttrImage(attr.id, idx)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {attr.type === 'select' && (
                <div className="flex flex-wrap gap-2">
                  {attr.options?.map(opt => (
                    <Chip 
                      key={opt} 
                      label={opt} 
                      selected={Array.isArray(val) && val.includes(opt)} 
                      colorClass="bg-slate-700"
                      onClick={() => {
                        const currentArr = Array.isArray(val) ? val : [];
                        handleAttrChange(attr.id, toggleItem(currentArr, opt));
                      }} 
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {nodeType?.showRewards && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">奖励构成 (Rewards)</h4>
            <div className="flex flex-wrap gap-2">
              {REWARDS.map(r => (
                <Chip key={r} label={r} selected={edited.rewards.includes(r)} onClick={() => setEdited({...edited, rewards: toggleItem(edited.rewards, r)})} />
              ))}
            </div>
            <textarea
              value={edited.rewardsDescription || ''}
              onChange={e => setEdited({...edited, rewardsDescription: e.target.value})}
              placeholder="填写奖励的具体内容..."
              className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-100 text-sm"
            />
          </div>
        )}

        {/* AI Generation Section */}
        <div className="flex gap-4 p-8 bg-indigo-900 rounded-3xl shadow-2xl">
          <div className="flex-1 space-y-4">
             <div className="text-indigo-300 font-black text-xs uppercase tracking-widest">AI 设计辅助系统</div>
             <div className="flex gap-4">
                <button onClick={handleGenDoc} disabled={loadingDoc} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl hover:bg-indigo-500 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {loadingDoc ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                  生成逻辑方案 (AI)
                </button>
                <button onClick={handleGenUI} disabled={loadingUI} className="flex-1 py-4 bg-indigo-800 text-indigo-100 rounded-2xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {loadingUI ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  生成 UI 原型 (AI)
                </button>
             </div>
          </div>
        </div>

        {/* AI Output Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {edited.aiGeneratedContent && (
            <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-2xl border border-indigo-500/10">
              <h3 className="text-xl font-bold text-indigo-400 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.596 15.13a2 2 0 01-1.022-.547V4.544a2 2 0 011.022-.547l2.387-.477a6 6 0 003.86.517l.318-.158a6 6 0 013.86-.517l2.387.477a2 2 0 011.022.547v10.884z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                AI 设计说明书
              </h3>
              <div className="prose prose-invert max-w-none opacity-90 text-sm leading-relaxed whitespace-pre-wrap font-serif">
                {edited.aiGeneratedContent}
              </div>
            </div>
          )}
          
          {edited.uiPrototype && (
            <div className="bg-indigo-950 text-indigo-100 p-8 rounded-2xl shadow-2xl border border-indigo-500/30">
              <h3 className="text-xl font-bold text-cyan-400 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                AI UI 原型方案
              </h3>
              <div className="prose prose-invert max-w-none opacity-90 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                {edited.uiPrototype}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PuzzleEditor;
