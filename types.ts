
export type HintType = '图文提示' | '声音提示' | '颜色差异提示' | '动态物体提示' | '特写提示';

export type ItemOperation = '道具获取' | '道具组合' | '道具使用' | '道具说明';
export type ItemFunction = '奖励道具' | '解锁道具' | '提示道具';

export interface MechanicItem {
  operations: ItemOperation[];
  functions: ItemFunction[];
}

export type MechanicType = 
  | '道具' | '穷举法与重复操作' | '特殊能力' | '音符谜题' 
  | '考眼力' | '流程谜题' | '分开的"锁"与钥匙' | '小游戏' | '多条件谜题';

export type RewardType = '道具' | '动画演出' | '改变场景';

export type AttributeType = 'text' | 'number' | 'image' | 'select';

export interface CustomAttribute {
  id: string;
  name: string;
  type: AttributeType;
  options?: string[]; // Used for 'select' type
}

export interface CustomAttributeValue {
  attributeId: string;
  value: any; // Can be string, number, or string array (for multiple images or select)
}

export interface NodeTypeConfig {
  id: string;
  name: string;
  color: string; // Hex color for canvas display
  showHints: boolean;
  showMechanics: boolean;
  showRewards: boolean;
  customAttributes: CustomAttribute[];
}

export interface PuzzleDefinition {
  id: string;
  name: string;
  typeId: string; // Reference to NodeTypeConfig.id
  narrativeContext: string; // 剧情衔接
  summary: string; // 功能概要
  hints: HintType[];
  hintsDescription?: string;
  mechanics: {
    type: MechanicType[];
    mechanicsDescription?: string;
    itemDetails?: MechanicItem;
  };
  rewards: RewardType[];
  rewardsDescription?: string;
  customAttributeValues?: CustomAttributeValue[]; // Values for custom attributes
  aiGeneratedContent?: string;
  userDesignManual?: string;
  manualImages?: string[];
  uiPrototype?: string;
  annotation?: string; // New: Node annotation/note
}

export interface FlowConnection {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface Chapter {
  id: string;
  name: string;
  description: string;
  puzzles: PuzzleDefinition[];
}

export interface Project {
  id: string;
  name: string;
  backgroundStory: string;
  narrativeArc: string;
  chapters: Chapter[];
  nodeTypes: NodeTypeConfig[]; // Global node types for the project
  canvasState?: {
    positions: Record<string, NodePosition>;
    connections: FlowConnection[];
  };
}

export interface TemplateLibrary {
  id: string;
  name: string;
  puzzle: PuzzleDefinition;
}
