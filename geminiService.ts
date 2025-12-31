
import { GoogleGenAI } from "@google/genai";
import { PuzzleDefinition, Project } from "./types";

// Always instantiate GoogleGenAI right before making an API call to ensure it uses the correct context.
// In professional environments, the API key might be refreshed or managed via window.aistudio tools.

export async function generatePuzzleDesign(puzzle: PuzzleDefinition, projectContext?: Project): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    你是一位资深的解谜游戏关卡设计师和编剧。
    项目背景: ${projectContext?.backgroundStory || '未定义'}
    故事脉络: ${projectContext?.narrativeArc || '未定义'}
    
    当前谜题: ${puzzle.name}
    剧情衔接: ${puzzle.narrativeContext}
    提示要素: ${puzzle.hints.join(', ')}
    核心手法: ${puzzle.mechanics.type.join(', ')}
    奖励构成: ${puzzle.rewards.join(', ')}
    
    任务：生成一份详细的游戏玩法设计文档。特别强调该谜题如何服务于整体叙事，以及玩家在解密过程中的心理体验。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    // Use .text property to extract output
    return response.text || '';
  } catch (e) {
    console.error(e);
    return "生成失败。";
  }
}

export async function generateUIPrototype(puzzle: PuzzleDefinition): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    基于以下解谜手法设计一个游戏 UI 交互原型界面方案：
    手法: ${puzzle.mechanics.type.join(', ')}
    提示: ${puzzle.hints.join(', ')}
    
    请输出 Markdown 格式的 UI 设计方案：
    1. 布局结构 (Layout)：描述屏幕各区域的功能。
    2. 核心组件 (Components)：如需要哪些按钮、滑块、3D观察器等。
    3. 交互逻辑 (Interaction)：玩家点击/拖拽后的即时反馈。
    4. 视觉风格建议：符合解谜氛围的调色板和图标风格。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    // Use .text property to extract output
    return response.text || '';
  } catch (e) {
    console.error(e);
    return "UI 原型生成失败。";
  }
}
