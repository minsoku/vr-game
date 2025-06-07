// 프로젝트 전체에서 사용하는 공통 타입 정의

export interface VRGameSession {
  scene: any;
  renderer: any;
  camera: any;
  controllers: any[];
}

export interface InventoryItem {
  id: string;
  type: string;
  name: string;
  object?: any;
}

export interface PuzzleObject {
  id: string;
  type: string;
  interactive: boolean;
  locked?: boolean;
  userData?: any;
}

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  isMuted: boolean;
  vrEnabled: boolean;
}

export interface RoomConfiguration {
  id: string;
  name: string;
  theme: string;
  puzzles: PuzzleObject[];
  backgroundMusic?: string;
}

// WebXR 이벤트 타입
export interface XRControllerEvent {
  target: any;
  type: string;
  data?: any;
}

// 게임 이벤트 콜백 타입
export type GameEventCallback = (data?: any) => void;

// 오디오 재생 옵션
export interface AudioPlayOptions {
  volume?: number;
  loop?: boolean;
  fadeIn?: number;
  position?: { x: number; y: number; z: number };
} 