// WebXR 타입 정의 보완
interface Navigator {
  xr?: XRSystem;
}

interface XRSystem {
  isSessionSupported(mode: XRSessionMode): Promise<boolean>;
  requestSession(mode: XRSessionMode, options?: XRSessionInit): Promise<XRSession>;
}

interface XRSession {
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  end(): Promise<void>;
}

interface XRInputSource {
  gamepad?: Gamepad;
  hand?: XRHand;
  profiles: string[];
  targetRayMode: XRTargetRayMode;
}

interface XRHand {
  size: number;
  get(key: XRHandJoint): XRJointSpace | undefined;
}

type XRSessionMode = 'inline' | 'immersive-vr' | 'immersive-ar';
type XRTargetRayMode = 'gaze' | 'tracked-pointer' | 'screen';
type XRHandJoint = string;

interface XRSessionInit {
  requiredFeatures?: string[];
  optionalFeatures?: string[];
}

interface XRJointSpace {
  // XR Joint Space properties
}

// Gamepad API 확장
interface Gamepad {
  hapticActuators?: GamepadHapticActuator[];
}

interface GamepadHapticActuator {
  pulse(value: number, duration: number): Promise<boolean>;
}

// Three.js WebXR 확장
declare module 'three' {
  interface WebGLRenderer {
    xr: WebXRManager;
  }

  interface WebXRManager {
    enabled: boolean;
    isPresenting: boolean;
    getController(index: number): Group;
    getControllerGrip(index: number): Group;
    getHand(index: number): Group;
    setSession(session: XRSession): Promise<void>;
    addEventListener(type: string, listener: (event: any) => void): void;
    setAnimationLoop(callback: ((time: number) => void) | null): void;
  }

  interface Raycaster {
    setFromXRController(controller: Group): void;
  }
} 