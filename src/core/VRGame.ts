// @ts-nocheck
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';

import { SceneManager } from './SceneManager';
import { InputManager } from './InputManager';
import { GameStateManager } from './GameStateManager';
import { AudioManager } from './AudioManager';

export class VRGame {
    // Three.js 핵심 컴포넌트
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    
    // VR 관련
    private controllerModelFactory: XRControllerModelFactory;
    private handModelFactory: XRHandModelFactory;
    public controllers: THREE.Group[] = [];
    public hands: THREE.Group[] = [];
    
    // 게임 매니저들
    public sceneManager: SceneManager;
    public inputManager: InputManager;
    public gameState: GameStateManager;
    public audioManager: AudioManager;
    
    // 게임 상태
    private isVRMode: boolean = false;
    private animationId: number = 0;

    constructor() {
        // Three.js 기본 설정
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        // VR 팩토리 초기화
        this.controllerModelFactory = new XRControllerModelFactory();
        this.handModelFactory = new XRHandModelFactory();
        
        // 매니저 초기화
        this.sceneManager = new SceneManager(this);
        this.inputManager = new InputManager(this);
        this.gameState = new GameStateManager(this);
        this.audioManager = new AudioManager();
    }

    public async init(): Promise<void> {
        await this.setupRenderer();
        await this.setupVR();
        await this.setupScene();
        this.setupEventListeners();
        this.startRenderLoop();
        
        console.log('✅ VR Game 초기화 완료');
    }

    private async setupRenderer(): Promise<void> {
        // 렌더러 설정
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        // DOM에 추가
        document.body.appendChild(this.renderer.domElement);
        
        // 카메라 초기 위치
        this.camera.position.set(0, 1.6, 3); // 평균 성인 눈높이
    }

    private async setupVR(): Promise<void> {
        // WebXR 활성화
        this.renderer.xr.enabled = true;
        
        // VR 버튼 설정 (Three.js의 VRButton 대신 커스텀 버튼 사용)
        // const vrButton = VRButton.createButton(this.renderer);
        // document.body.appendChild(vrButton);
        
        // 컨트롤러 설정
        this.setupControllers();
        
        // 핸드 트래킹 설정
        this.setupHandTracking();
    }

    private setupControllers(): void {
        // 왼쪽 컨트롤러
        const controller1 = this.renderer.xr.getController(0);
        controller1.addEventListener('selectstart', (event) => this.inputManager.onSelectStart(event));
        controller1.addEventListener('selectend', (event) => this.inputManager.onSelectEnd(event));
        this.scene.add(controller1);

        const controllerGrip1 = this.renderer.xr.getControllerGrip(0);
        controllerGrip1.add(this.controllerModelFactory.createControllerModel(controllerGrip1));
        this.scene.add(controllerGrip1);

        // 오른쪽 컨트롤러
        const controller2 = this.renderer.xr.getController(1);
        controller2.addEventListener('selectstart', (event) => this.inputManager.onSelectStart(event));
        controller2.addEventListener('selectend', (event) => this.inputManager.onSelectEnd(event));
        this.scene.add(controller2);

        const controllerGrip2 = this.renderer.xr.getControllerGrip(1);
        controllerGrip2.add(this.controllerModelFactory.createControllerModel(controllerGrip2));
        this.scene.add(controllerGrip2);

        this.controllers = [controller1, controller2];
    }

    private setupHandTracking(): void {
        // 손 추적 설정 (선택적)
        const hand1 = this.renderer.xr.getHand(0);
        hand1.add(this.handModelFactory.createHandModel(hand1, 'mesh'));
        this.scene.add(hand1);

        const hand2 = this.renderer.xr.getHand(1);
        hand2.add(this.handModelFactory.createHandModel(hand2, 'mesh'));
        this.scene.add(hand2);

        this.hands = [hand1, hand2];
    }

    private async setupScene(): Promise<void> {
        // 기본 조명 설정
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // 첫 번째 방 로드 (고전 서재)
        await this.sceneManager.loadRoom('library');
        
        // 게임 상태 초기화
        this.gameState.startGame();
    }

    private setupEventListeners(): void {
        // 윈도우 리사이즈
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // VR 세션 이벤트
        this.renderer.xr.addEventListener('sessionstart', () => {
            this.isVRMode = true;
            this.onVRSessionStart();
        });

        this.renderer.xr.addEventListener('sessionend', () => {
            this.isVRMode = false;
            this.onVRSessionEnd();
        });
    }

    private onVRSessionStart(): void {
        console.log('🥽 VR 세션 시작');
        // VR UI 숨기기
        const uiOverlay = document.getElementById('ui-overlay');
        if (uiOverlay) uiOverlay.style.display = 'none';
        
        // VR 전용 UI 표시
        this.sceneManager.showVRUI();
    }

    private onVRSessionEnd(): void {
        console.log('🖥️ VR 세션 종료');
        // 일반 UI 다시 표시
        const uiOverlay = document.getElementById('ui-overlay');
        if (uiOverlay) uiOverlay.style.display = 'block';
        
        // VR UI 숨기기
        this.sceneManager.hideVRUI();
    }

    private startRenderLoop(): void {
        const animate = () => {
            this.animationId = this.renderer.xr.isPresenting ? 
                this.renderer.setAnimationLoop(animate) as any : 
                requestAnimationFrame(animate);
            
            this.update();
            this.render();
        };
        
        if (this.renderer.xr.isPresenting) {
            this.renderer.setAnimationLoop(animate);
        } else {
            animate();
        }
    }

    private update(): void {
        // 매니저 업데이트
        this.inputManager.update();
        this.sceneManager.update();
        this.gameState.update();
    }

    private render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    // Public 메서드들
    public async checkVRSupport(): Promise<boolean> {
        if ('xr' in navigator) {
            try {
                const isSupported = await (navigator as any).xr.isSessionSupported('immersive-vr');
                return isSupported;
            } catch (e) {
                return false;
            }
        }
        return false;
    }

    public async startVR(): Promise<void> {
        if (this.renderer.xr.isPresenting) return;
        
        try {
            const session = await (navigator as any).xr.requestSession('immersive-vr', {
                optionalFeatures: ['hand-tracking', 'layers']
            });
            
            await this.renderer.xr.setSession(session);
            console.log('🥽 VR 모드 활성화');
        } catch (error) {
            console.error('VR 세션 시작 실패:', error);
            throw error;
        }
    }

    public dispose(): void {
        // 리소스 정리
        if (this.animationId) {
            if (this.renderer.xr.isPresenting) {
                this.renderer.setAnimationLoop(null);
            } else {
                cancelAnimationFrame(this.animationId);
            }
        }
        
        this.renderer.dispose();
        this.audioManager.dispose();
        this.sceneManager.dispose();
    }
} 