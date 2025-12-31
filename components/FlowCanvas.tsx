
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Project, PuzzleDefinition, NodePosition, FlowConnection, NodeTypeConfig, CustomAttributeValue } from '../types';

interface FlowCanvasProps {
  project: Project;
  onUpdate: (positions: Record<string, NodePosition>, connections: FlowConnection[]) => void;
  onUpdatePuzzle: (puzzle: PuzzleDefinition) => void;
  onAddNode: (typeId: string) => string;
  onSelectPuzzle: (pz: PuzzleDefinition) => void;
  onClose: () => void;
}

interface DragLine {
  sourceId: string;
  currentX: number;
  currentY: number;
  isReconnectingId?: string;
}

interface SelectionRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const FlowCanvas: React.FC<FlowCanvasProps> = ({ project, onUpdate, onUpdatePuzzle, onAddNode, onSelectPuzzle, onClose }) => {
  const [positions, setPositions] = useState<Record<string, NodePosition>>(project.canvasState?.positions || {});
  const [connections, setConnections] = useState<FlowConnection[]>(project.canvasState?.connections || []);
  
  // Canvas Transform State
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Selection State
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);

  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  
  const [dragLine, setDragLine] = useState<DragLine | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [annotatingNodeId, setAnnotatingNodeId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const puzzles = useMemo(() => {
    return project.chapters.flatMap(ch => ch.puzzles);
  }, [project]);

  useEffect(() => {
    const newPositions = { ...positions };
    let changed = false;
    puzzles.forEach((pz, idx) => {
      if (!newPositions[pz.id]) {
        newPositions[pz.id] = { x: 100 + (idx % 3) * 350, y: 100 + Math.floor(idx / 3) * 250 };
        changed = true;
      }
    });
    if (changed) {
      setPositions(newPositions);
      onUpdate(newPositions, connections);
    }
  }, [puzzles]);

  // handleAttrImageUpload: processes image selection for custom attributes in the quick edit panel
  const handleAttrImageUpload = (e: React.ChangeEvent<HTMLInputElement>, pz: PuzzleDefinition, attrId: string) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const values = [...(pz.customAttributeValues || [])];
        const idx = values.findIndex(v => v.attributeId === attrId);
        if (idx >= 0) {
          const currentImages = Array.isArray(values[idx].value) ? values[idx].value : [];
          values[idx].value = [...currentImages, base64];
        } else {
          values.push({ attributeId: attrId, value: [base64] });
        }
        onUpdatePuzzle({ ...pz, customAttributeValues: values });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleMouseDown = (e: React.MouseEvent, id?: string) => {
    // Middle mouse button for panning
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    if (id) {
      if ((e.target as HTMLElement).closest('.socket')) return;
      if ((e.target as HTMLElement).closest('.controls')) return;
      
      e.stopPropagation();
      setDraggingNodeId(id);
      
      // If node is not already selected, select only it. If it is selected, keep selection for batch drag.
      if (!selectedNodeIds.includes(id)) {
        setSelectedNodeIds([id]);
      }
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else {
      // Start marquee selection on background
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setSelectionRect({
          startX: e.clientX,
          startY: e.clientY,
          currentX: e.clientX,
          currentY: e.clientY
        });
        setSelectedNodeIds([]);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;

    if (isPanning) {
      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    } else if (draggingNodeId) {
      // Batch move all selected nodes
      setPositions(prev => {
        const next = { ...prev };
        selectedNodeIds.forEach(nodeId => {
          const currentPos = prev[nodeId];
          if (currentPos) {
            next[nodeId] = {
              x: currentPos.x + dx / transform.scale,
              y: currentPos.y + dy / transform.scale
            };
          }
        });
        return next;
      });
    } else if (selectionRect) {
      setSelectionRect(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
      
      // Update selection in real-time
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x1 = Math.min(selectionRect.startX, e.clientX);
        const y1 = Math.min(selectionRect.startY, e.clientY);
        const x2 = Math.min(selectionRect.startX, e.clientX); // Note: Fix marquee selection bounds if needed
        const newX1 = Math.min(selectionRect.startX, e.clientX);
        const newY1 = Math.min(selectionRect.startY, e.clientY);
        const newX2 = Math.max(selectionRect.startX, e.clientX);
        const newY2 = Math.max(selectionRect.startY, e.clientY);

        const newSelected = puzzles.filter(pz => {
          const pos = positions[pz.id];
          if (!pos) return false;
          // Convert node pos to screen space
          const screenX = pos.x * transform.scale + transform.x + rect.left;
          const screenY = pos.y * transform.scale + transform.y + rect.top;
          const screenW = 280 * transform.scale;
          const screenH = (collapsedNodes[pz.id] ? 100 : 250) * transform.scale;

          return screenX < newX2 && screenX + screenW > newX1 && screenY < newY2 && screenY + screenH > newY1;
        }).map(p => p.id);
        
        setSelectedNodeIds(newSelected);
      }
    }
    
    if (dragLine) {
      setDragLine(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
    }

    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) setIsPanning(false);
    if (draggingNodeId) {
      setDraggingNodeId(null);
      onUpdate(positions, connections);
    }
    if (selectionRect) setSelectionRect(null);
    if (dragLine) {
      if (dragLine.isReconnectingId) removeConnection(dragLine.isReconnectingId);
      setDragLine(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    const delta = -e.deltaY * zoomSpeed;
    const newScale = Math.min(Math.max(transform.scale + delta, 0.1), 5);
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const canvasX = (mouseX - transform.x) / transform.scale;
      const canvasY = (mouseY - transform.y) / transform.scale;

      const nextX = mouseX - canvasX * newScale;
      const nextY = mouseY - canvasY * newScale;

      setTransform({ x: nextX, y: nextY, scale: newScale });
    }
  };

  const locateNode = (id: string) => {
    const pos = positions[id];
    if (!pos || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Set transform so node (pos.x, pos.y) is at center
    setTransform({
      x: centerX - (pos.x + 140) * transform.scale,
      y: centerY - (pos.y + 100) * transform.scale,
      scale: transform.scale
    });
    setSelectedNodeIds([id]);
  };

  const handleSocketMouseDown = (e: React.MouseEvent, id: string, isOutput: boolean) => {
    e.stopPropagation();
    if (isOutput) {
      setDragLine({ sourceId: id, currentX: e.clientX, currentY: e.clientY });
    }
  };

  const handleSocketMouseUp = (e: React.MouseEvent, id: string, isInput: boolean) => {
    e.stopPropagation();
    if (dragLine && isInput && dragLine.sourceId !== id) {
      const sourceId = dragLine.sourceId;
      const targetId = id;
      
      const exists = connections.some(c => c.sourceId === sourceId && c.targetId === targetId);
      if (!exists) {
        const newConn: FlowConnection = { 
          id: `conn-${Date.now()}`, 
          sourceId: sourceId, 
          targetId: targetId,
          label: '' 
        };
        const newConns = [...connections, newConn];
        setConnections(newConns);
        onUpdate(positions, newConns);
      }
      setDragLine(null);
    }
  };

  const handleUnplugMouseDown = (e: React.MouseEvent, conn: FlowConnection) => {
    e.stopPropagation();
    setDragLine({ 
      sourceId: conn.sourceId, 
      currentX: e.clientX, 
      currentY: e.clientY,
      isReconnectingId: conn.id 
    });
  };

  const removeConnection = (id: string) => {
    const newConns = connections.filter(c => c.id !== id);
    setConnections(newConns);
    onUpdate(positions, newConns);
  };

  const updateConnectionLabel = (id: string, label: string) => {
    const newConns = connections.map(c => c.id === id ? { ...c, label } : c);
    setConnections(newConns);
    onUpdate(positions, newConns);
  };

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderConnection = (conn: FlowConnection) => {
    const startPos = positions[conn.sourceId];
    const endPos = positions[conn.targetId];
    if (!startPos || !endPos) return null;

    const startX = startPos.x + 280;
    const startY = startPos.y + (collapsedNodes[conn.sourceId] ? 20 : 40);
    const endX = endPos.x;
    const endY = endPos.y + (collapsedNodes[conn.targetId] ? 20 : 40);

    const cp1X = startX + (endX - startX) / 2;
    const cp2X = startX + (endX - startX) / 2;

    const pathD = `M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`;

    return (
      <g 
        key={conn.id} 
        className="group cursor-pointer"
        onDoubleClick={(e) => { e.stopPropagation(); setEditingConnectionId(conn.id); }}
        onContextMenu={(e) => { e.preventDefault(); removeConnection(conn.id); }}
      >
        <path d={pathD} fill="none" stroke="transparent" strokeWidth="15" className="pointer-events-auto" />
        <path d={pathD} fill="none" stroke="#cbd5e1" strokeWidth="3" className="group-hover:stroke-indigo-400 transition-colors pointer-events-none" />
        
        {conn.label && (
          <foreignObject x={(startX + endX) / 2 - 50} y={(startY + endY) / 2 - 12} width="100" height="24" className="pointer-events-none">
            <div className="flex items-center justify-center h-full">
              <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-md text-[9px] font-black text-slate-500 shadow-sm truncate max-w-full">
                {conn.label}
              </span>
            </div>
          </foreignObject>
        )}

        <circle cx={endX} cy={endY} r="6" className="fill-indigo-400 opacity-0 group-hover:opacity-100 cursor-move transition-opacity" onMouseDown={(e) => handleUnplugMouseDown(e, conn)} />
      </g>
    );
  };

  const filteredSearchPuzzles = puzzles.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full bg-slate-50 relative overflow-hidden custom-scroll select-none ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseDown={(e) => handleMouseDown(e)}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Selection Box Visual */}
      {selectionRect && (
        <div 
          className="absolute border-2 border-indigo-400 bg-indigo-100/30 z-[100] pointer-events-none rounded-sm"
          style={{
            left: Math.min(selectionRect.startX, selectionRect.currentX),
            top: Math.min(selectionRect.startY, selectionRect.currentY),
            width: Math.abs(selectionRect.currentX - selectionRect.startX),
            height: Math.abs(selectionRect.currentY - selectionRect.startY)
          }}
        />
      )}

      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-[70] pointer-events-none">
        <div className="flex gap-4 items-center pointer-events-auto">
          <div className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-200 shadow-xl flex items-center gap-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              逻辑画板
            </h2>
            <div className="h-6 w-[1px] bg-slate-200"></div>
            <div className="relative group/search">
               <div className="flex items-center bg-slate-100 rounded-xl px-3 py-1.5 border border-transparent focus-within:border-indigo-300 transition-all">
                  <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2" /></svg>
                  <input 
                    type="text" 
                    placeholder="搜索节点..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs font-bold text-slate-600 w-32 focus:w-48 transition-all" 
                  />
               </div>
               {searchQuery && (
                 <div className="absolute top-full mt-2 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden py-1">
                    {filteredSearchPuzzles.map(p => (
                      <button 
                        key={p.id} 
                        onClick={() => { locateNode(p.id); setSearchQuery(''); }}
                        className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 flex items-center gap-2"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.nodeTypes.find(t => t.id === p.typeId)?.color }}></span>
                        {p.name}
                      </button>
                    ))}
                    {filteredSearchPuzzles.length === 0 && <div className="px-4 py-2 text-[10px] text-slate-400 italic">未找到节点</div>}
                 </div>
               )}
            </div>
            <span className="text-xs font-bold text-slate-400">缩放: {Math.round(transform.scale * 100)}%</span>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-xl hover:bg-indigo-700 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              新增
            </button>
            {showAddMenu && (
              <div className="absolute top-full mt-2 left-0 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-[80]">
                {project.nodeTypes.map(type => (
                  <button 
                    key={type.id}
                    onClick={() => { onAddNode(type.id); setShowAddMenu(false); }} 
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 font-bold text-sm flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: type.color }}></span> {type.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={onClose}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold shadow-xl hover:bg-black transition pointer-events-auto flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          关闭
        </button>
      </div>

      {/* Infinite Canvas Layer */}
      <div 
        className="absolute inset-0 origin-top-left"
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
      >
        <svg ref={svgRef} className="absolute inset-0 w-[10000px] h-[10000px] pointer-events-none" style={{ left: '-5000px', top: '-5000px' }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <g transform="translate(5000, 5000)">
            {connections.map(renderConnection)}
            
            {dragLine && (() => {
              const startPos = positions[dragLine.sourceId];
              if (!startPos) return null;
              const startX = startPos.x + 280;
              const startY = startPos.y + (collapsedNodes[dragLine.sourceId] ? 20 : 40);
              const rect = containerRef.current?.getBoundingClientRect();
              if (!rect) return null;
              const endX = (dragLine.currentX - rect.left - transform.x) / transform.scale;
              const endY = (dragLine.currentY - rect.top - transform.y) / transform.scale;
              const cp1X = startX + (endX - startX) / 2;
              const cp2X = startX + (endX - startX) / 2;
              return <path d={`M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`} fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="5,5" className="pointer-events-none" />;
            })()}
          </g>
        </svg>

        {/* Nodes Layer */}
        {puzzles.map(pz => {
          const pos = positions[pz.id] || { x: 0, y: 0 };
          const isCollapsed = collapsedNodes[pz.id];
          const nodeType = project.nodeTypes.find(t => t.id === pz.typeId);
          const nodeColor = nodeType?.color || '#cbd5e1';
          const isSelected = selectedNodeIds.includes(pz.id);
          
          const hasInput = connections.some(c => c.targetId === pz.id);
          const hasOutput = connections.some(c => c.sourceId === pz.id);
          
          return (
            <div
              key={pz.id}
              style={{ 
                left: pos.x, 
                top: pos.y, 
                width: 280, 
                borderColor: isSelected ? '#6366f1' : nodeColor 
              }}
              className={`absolute bg-white border-2 rounded-2xl shadow-lg transition-shadow z-10 hover:z-20 group ${isSelected ? 'shadow-2xl ring-4 ring-indigo-400/20' : ''}`}
              onMouseDown={(e) => handleMouseDown(e, pz.id)}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setAnnotatingNodeId(pz.id); }}
            >
              {/* Annotation Badge */}
              {pz.annotation && (
                <div className="absolute -top-10 left-0 bg-amber-100 border border-amber-200 text-amber-800 px-3 py-1 rounded-lg text-[10px] font-black shadow-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" strokeWidth="2" /></svg>
                   {pz.annotation}
                </div>
              )}

              <div className="controls absolute -top-3 left-0 right-0 flex justify-end gap-2 px-2 pointer-events-none">
                <button onClick={(e) => { e.stopPropagation(); setEditingNodeId(pz.id); }} className="w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-400 transition shadow-sm z-30 pointer-events-auto" title="快速编辑">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button onClick={(e) => toggleCollapse(pz.id, e)} className="w-6 h-6 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white transition shadow-sm z-30 pointer-events-auto">
                  <svg className={`w-3 h-3 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>

              <div 
                className={`socket absolute -left-2 top-8 w-4 h-4 rounded-full border-2 border-slate-200 transition-all z-30 cursor-pointer ${hasInput ? 'bg-indigo-500 border-indigo-600' : 'bg-white hover:bg-indigo-400'}`} 
                onMouseUp={(e) => handleSocketMouseUp(e, pz.id, true)} 
                title="逻辑入口" 
              />
              <div 
                className={`socket absolute -right-2 top-8 w-4 h-4 rounded-full border-2 transition-all z-30 cursor-crosshair group-hover:scale-125 ${hasOutput ? 'bg-indigo-500 border-indigo-600' : 'bg-white hover:bg-indigo-600'}`} 
                style={{ borderColor: nodeColor }} 
                onMouseDown={(e) => handleSocketMouseDown(e, pz.id, true)} 
                title="逻辑出口" 
              />

              <div className={`p-5 ${isCollapsed ? 'py-3' : ''} pointer-events-none`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[8px] font-black uppercase tracking-tighter" style={{ color: nodeColor }}>
                    {nodeType?.name || 'NODE'}
                  </span>
                  <div className="flex-1 h-[1px] bg-slate-100"></div>
                </div>
                <h4 className="font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors mb-3">
                  {pz.name}
                </h4>
                
                {!isCollapsed && (
                  <div className="space-y-3">
                    {nodeType?.showHints && (
                      <div className="space-y-1">
                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">提示 (Hints)</div>
                        <div className="text-[10px] text-slate-600 leading-snug bg-purple-50/50 p-2 rounded-lg border border-purple-100/50 line-clamp-2">{pz.hintsDescription || pz.hints.join(', ') || '未设置'}</div>
                      </div>
                    )}

                    {nodeType?.showMechanics && (
                      <div className="space-y-1">
                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">手法 (Mechanics)</div>
                        <div className="text-[10px] text-slate-600 leading-snug bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50 line-clamp-2">{pz.mechanics.mechanicsDescription || pz.mechanics.type.join(', ') || '未设置'}</div>
                      </div>
                    )}

                    {nodeType?.showRewards && (
                      <div className="space-y-1">
                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">奖励 (Rewards)</div>
                        <div className="text-[10px] text-slate-600 leading-snug bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50 line-clamp-2">{pz.rewardsDescription || pz.rewards.join(', ') || '未设置'}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Editing Connection Modal */}
      {editingConnectionId && (() => {
        const conn = connections.find(c => c.id === editingConnectionId);
        if (!conn) return null;
        return (
          <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-[1px] z-[200] flex items-center justify-center">
            <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-200 w-80 animate-in fade-in zoom-in duration-200">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">逻辑关系</h3>
              <input autoFocus type="text" value={conn.label || ''} onChange={(e) => updateConnectionLabel(conn.id, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setEditingConnectionId(null); }} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-bold text-slate-700" />
              <div className="flex justify-end mt-4">
                <button onClick={() => setEditingConnectionId(null)} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-black transition">确定</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Annotation Modal */}
      {annotatingNodeId && (() => {
        const pz = puzzles.find(p => p.id === annotatingNodeId);
        if (!pz) return null;
        return (
          <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-[1px] z-[200] flex items-center justify-center">
            <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-200 w-80 animate-in fade-in zoom-in duration-200">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">填写节点批注</h3>
              <input 
                autoFocus 
                type="text" 
                placeholder="例如: 这里的逻辑需要细化..."
                value={pz.annotation || ''} 
                onChange={(e) => onUpdatePuzzle({ ...pz, annotation: e.target.value })} 
                onKeyDown={(e) => { if (e.key === 'Enter') setAnnotatingNodeId(null); }} 
                className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-100 outline-none text-sm font-bold text-slate-700" 
              />
              <div className="flex justify-end mt-4">
                <button onClick={() => setAnnotatingNodeId(null)} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-black transition">保存批注</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Quick Edit Node Panel */}
      {editingNodeId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex justify-end">
          <div className="w-[400px] h-full bg-white shadow-2xl p-8 overflow-y-auto animate-slide-left custom-scroll">
            {puzzles.find(p => p.id === editingNodeId) && (() => {
              const pz = puzzles.find(p => p.id === editingNodeId)!;
              const nodeType = project.nodeTypes.find(t => t.id === pz.typeId);
              return (
                <div className="space-y-8">
                  <header className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-slate-900">快速编辑</h3>
                    <button onClick={() => setEditingNodeId(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </header>

                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">名称</label>
                      <input type="text" value={pz.name} onChange={(e) => onUpdatePuzzle({ ...pz, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none font-bold" />
                    </div>

                    {nodeType?.showHints && (
                      <div>
                        <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block mb-2">提示内容</label>
                        <textarea value={pz.hintsDescription || ''} onChange={(e) => onUpdatePuzzle({ ...pz, hintsDescription: e.target.value })} className="w-full h-20 px-4 py-3 bg-purple-50/30 border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-100 outline-none text-sm resize-none" />
                      </div>
                    )}

                    {nodeType?.showMechanics && (
                      <div>
                        <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-2">手法逻辑</label>
                        <textarea value={pz.mechanics.mechanicsDescription || ''} onChange={(e) => onUpdatePuzzle({ ...pz, mechanics: { ...pz.mechanics, mechanicsDescription: e.target.value } })} className="w-full h-20 px-4 py-3 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm resize-none" />
                      </div>
                    )}

                    {nodeType?.showRewards && (
                      <div>
                        <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-2">奖励内容</label>
                        <textarea value={pz.rewardsDescription || ''} onChange={(e) => onUpdatePuzzle({ ...pz, rewardsDescription: e.target.value })} className="w-full h-20 px-4 py-3 bg-emerald-50/30 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none text-sm resize-none" />
                      </div>
                    )}
                    
                    {nodeType?.customAttributes.map(attr => {
                      const valObj = pz.customAttributeValues?.find(v => v.attributeId === attr.id);
                      const val = valObj ? valObj.value : (attr.type === 'select' || attr.type === 'image' ? [] : '');

                      return (
                        <div key={attr.id} className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{attr.name}</label>
                          {attr.type === 'text' && (
                            <textarea value={val || ''} onChange={(e) => {
                                const customAttributeValues = [...(pz.customAttributeValues || [])];
                                const idx = customAttributeValues.findIndex(v => v.attributeId === attr.id);
                                if (idx >= 0) customAttributeValues[idx].value = e.target.value;
                                else customAttributeValues.push({ attributeId: attr.id, value: e.target.value });
                                onUpdatePuzzle({ ...pz, customAttributeValues });
                              }} className="w-full h-20 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm resize-none" />
                          )}
                          {attr.type === 'number' && (
                            <input type="number" value={val || 0} onChange={(e) => {
                                const customAttributeValues = [...(pz.customAttributeValues || [])];
                                const idx = customAttributeValues.findIndex(v => v.attributeId === attr.id);
                                if (idx >= 0) customAttributeValues[idx].value = parseFloat(e.target.value);
                                else customAttributeValues.push({ attributeId: attr.id, value: parseFloat(e.target.value) });
                                onUpdatePuzzle({ ...pz, customAttributeValues });
                              }} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold" />
                          )}
                          {attr.type === 'image' && (
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 w-fit px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-slate-200 transition">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                传图
                                <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleAttrImageUpload(e, pz, attr.id)} />
                              </label>
                            </div>
                          )}
                          {attr.type === 'select' && (
                            <div className="flex flex-wrap gap-1">
                              {attr.options?.map(opt => (
                                <button key={opt} onClick={() => {
                                    const currentArr = Array.isArray(val) ? val : [];
                                    const nextArr = currentArr.includes(opt) ? currentArr.filter(i => i !== opt) : [...currentArr, opt];
                                    const customAttributeValues = [...(pz.customAttributeValues || [])];
                                    const idx = customAttributeValues.findIndex(v => v.attributeId === attr.id);
                                    if (idx >= 0) customAttributeValues[idx].value = nextArr;
                                    else customAttributeValues.push({ attributeId: attr.id, value: nextArr });
                                    onUpdatePuzzle({ ...pz, customAttributeValues });
                                  }} className={`px-2 py-1 rounded-md text-[9px] font-bold border transition-colors ${Array.isArray(val) && val.includes(opt) ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>{opt}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-8">
                    <button onClick={() => onSelectPuzzle(pz)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:bg-black transition flex items-center justify-center gap-2">
                      进入详情编辑器
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 5l7 7-7 7M3 12h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button onClick={() => setEditingNodeId(null)} className="w-full py-4 mt-4 text-slate-400 font-bold hover:text-slate-600 transition">完成并关闭</button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-left { animation: slide-left 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default FlowCanvas;
