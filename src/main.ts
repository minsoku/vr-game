// @ts-nocheck
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/core/Debug/debugLayer';
import { VRGame } from './core/VRGame';
import { LoadingManager } from './utils/LoadingManager';

// Inspector는 개발 모드에서만 로드
if (import.meta.env.DEV) {
    import('@babylonjs/inspector');
}

// VR 디버깅용 콘솔 래퍼
class DebugConsole {
    private messages: string[] = [];
    private isVisible: boolean = false;
    private originalConsole: any = {};

    constructor() {
        this.setupDebugConsole();
        this.setupKeyToggle();
    }

    private setupDebugConsole(): void {
        // 기존 콘솔 메서드 백업
        this.originalConsole.log = console.log;
        this.originalConsole.error = console.error;
        this.originalConsole.warn = console.warn;

        // 콘솔 메서드 오버라이드
        console.log = (...args) => {
            this.originalConsole.log(...args);
            this.addMessage('LOG', args.join(' '), '#00ff00');
        };

        console.error = (...args) => {
            this.originalConsole.error(...args);
            this.addMessage('ERROR', args.join(' '), '#ff0000');
        };

        console.warn = (...args) => {
            this.originalConsole.warn(...args);
            this.addMessage('WARN', args.join(' '), '#ffff00');
        };
    }

    private setupKeyToggle(): void {
        // 키보드 토글 (PC용)
        document.addEventListener('keydown', (event) => {
            if (event.key === 'd' || event.key === 'D') {
                this.toggle();
            }
        });

        // 버튼 토글 (VR/모바일용)
        const toggleBtn = document.getElementById('debug-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggle();
            });
            
            // 터치 이벤트도 추가 (VR 컨트롤러 호환성)
            toggleBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.toggle();
            });
        }
    }

    private addMessage(type: string, message: string, color: string): void {
        const timestamp = new Date().toLocaleTimeString();
        const formattedMessage = `[${timestamp}] ${type}: ${message}`;
        this.messages.push(formattedMessage);

        // 최대 50개 메시지만 유지
        if (this.messages.length > 50) {
            this.messages.shift();
        }

        this.updateDisplay();
    }

    private updateDisplay(): void {
        const messagesDiv = document.getElementById('debug-messages');
        if (messagesDiv) {
            messagesDiv.innerHTML = this.messages
                .slice(-20) // 최근 20개만 표시
                .map(msg => `<div style="margin-bottom: 2px;">${msg}</div>`)
                .join('');
            
            // 스크롤을 맨 아래로
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }

    public toggle(): void {
        this.isVisible = !this.isVisible;
        const debugConsole = document.getElementById('debug-console');
        const toggleBtn = document.getElementById('debug-toggle-btn');
        
        if (debugConsole) {
            debugConsole.style.display = this.isVisible ? 'block' : 'none';
        }
        
        // 버튼 스타일 업데이트
        if (toggleBtn) {
            toggleBtn.style.background = this.isVisible 
                ? 'rgba(0, 255, 0, 0.3)' 
                : 'rgba(0, 0, 0, 0.7)';
            toggleBtn.style.borderColor = this.isVisible ? '#00ff00' : '#00ff00';
        }
        
        console.log(`디버그 콘솔 ${this.isVisible ? '활성화' : '비활성화'}`);
    }

    public show(): void {
        this.isVisible = true;
        const debugConsole = document.getElementById('debug-console');
        if (debugConsole) {
            debugConsole.style.display = 'block';
        }
    }
}

class QuestEscapeVR {
    private game: VRGame | null = null;
    private loadingManager: LoadingManager;
    private debugConsole: DebugConsole;
    private canvas: HTMLCanvasElement | null = null;

    constructor() {
        this.loadingManager = new LoadingManager();
        this.debugConsole = new DebugConsole();
        this.init();
    }

    private async init(): Promise<void> {
        try {
            // 로딩 시작
            this.loadingManager.show('게임 초기화 중...');

            // 캔버스 생성 또는 가져오기
            this.canvas = this.getOrCreateCanvas();

            // VR 게임 인스턴스 생성
            console.log('🎮 Babylon.js VRGame 인스턴스 생성 중...');
            this.game = new VRGame(this.canvas);

            // 렌더링 루프 시작
            this.game.startRenderLoop();

            // 로딩 완료
            this.loadingManager.hide();

            // UI 이벤트 설정
            this.setupUI();

            console.log('🎮 Quest Escape VR이 성공적으로 초기화되었습니다!');
            console.log('💡 VR 버튼을 클릭하여 VR 모드를 시작하세요.');
        } catch (error) {
            console.error('게임 초기화 실패:', error);
            this.showError(error as Error);
        }
    }

    private getOrCreateCanvas(): HTMLCanvasElement {
        // 기존 캔버스가 있는지 확인
        let canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
        
        if (!canvas) {
            // 캔버스 생성
            canvas = document.createElement('canvas');
            canvas.id = 'renderCanvas';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.display = 'block';
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.zIndex = '1';
            
            // body에 추가
            document.body.appendChild(canvas);
        }

        // 캔버스 크기 설정
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // 리사이즈 이벤트 리스너
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });

        return canvas;
    }

    private setupUI(): void {
        const vrButton = document.getElementById('vr-button') as HTMLButtonElement;
        const uiOverlay = document.getElementById('ui-overlay') as HTMLDivElement;

        if (vrButton && this.game) {
            vrButton.style.display = 'block';
            vrButton.addEventListener('click', () => {
                this.startVRMode();
            });

            // VR 지원 확인 (Babylon.js 방식)
            this.checkVRSupport().then((supported: boolean) => {
                if (!supported) {
                    vrButton.textContent = '3D 모드로 플레이';
                    vrButton.title = 'VR이 지원되지 않아 3D 모드로 실행됩니다';
                    console.log('❌ VR 지원되지 않음 - 3D 모드로 설정');
                } else {
                    console.log('✅ VR 지원됨 - VR 버튼 활성화');
                    vrButton.title = '메타 퀘스트에서 VR 모드로 체험하세요';
                }
            }).catch((error) => {
                console.error('❌ VR 지원 확인 중 오류:', error);
                vrButton.textContent = '3D 모드로 플레이';
                vrButton.title = 'VR 확인 실패 - 3D 모드로 실행됩니다';
            });
        }

        if (uiOverlay) {
            uiOverlay.style.display = 'block';
        }

        // 키보드 컨트롤 안내 (3D 모드용)
        this.showControls();

        // 컨트롤러 강제 활성화 버튼 설정
        this.setupControllerActivateButton();
    }

    private async checkVRSupport(): Promise<boolean> {
        try {
            // Babylon.js WebXR 지원 확인
            const supported = await BABYLON.WebXRSessionManager.IsSessionSupportedAsync('immersive-vr');
            return supported;
        } catch (error) {
            console.error('VR 지원 확인 실패:', error);
            return false;
        }
    }

    private async startVRMode(): Promise<void> {
        // 디버그 콘솔 자동 표시
        this.debugConsole.show();
        
        if (!this.game) {
            console.error('❌ 게임 인스턴스가 없습니다.');
            return;
        }

        try {
            const vrButton = document.getElementById('vr-button') as HTMLButtonElement;
            vrButton.disabled = true;
            vrButton.textContent = 'VR 모드 시작 중...';

            // Babylon.js VR 모드 시작
            await this.game.enterVRMode();

            console.log('🥽 VR 모드가 성공적으로 시작되었습니다!');
            
            // UI 숨기기
            const uiOverlay = document.getElementById('ui-overlay');
            if (uiOverlay) {
                uiOverlay.style.display = 'none';
            }

        } catch (error) {
            console.error('❌ VR 모드 시작 실패:', error);
            
            // 버튼 복원
            const vrButton = document.getElementById('vr-button') as HTMLButtonElement;
            vrButton.disabled = false;
            vrButton.textContent = 'VR 모드 시작';
            
            // 에러 표시
            this.showError(error as Error);
        }
    }

    private setupControllerActivateButton(): void {
        const controllerBtn = document.getElementById('controller-activate-btn');
        if (controllerBtn) {
            const handleActivate = () => {
                console.log('🎮 컨트롤러 강제 활성화 시도...');
                this.forceActivateControllers();
            };

            controllerBtn.addEventListener('click', handleActivate);
            controllerBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                handleActivate();
            });
        }
    }

    private async forceActivateControllers(): Promise<void> {
        if (!this.game) {
            console.error('❌ 게임 인스턴스가 없습니다.');
            return;
        }

        try {
            console.log('💪 컨트롤러 강제 활성화 시작...');
            
            // VR 세션이 활성화되어 있는지 확인
            const xrHelper = this.game.getXRHelper();
            if (!xrHelper || !this.game.isInVRMode()) {
                console.warn('⚠️ VR 모드가 활성화되지 않았습니다. 먼저 VR 모드를 시작해주세요.');
                return;
            }

            // 직접 Gamepad API로 컨트롤러 검색
            console.log('🔍 Gamepad API로 컨트롤러 검색...');
            const gamepads = navigator.getGamepads();
            let foundController = false;

            for (let i = 0; i < gamepads.length; i++) {
                const gamepad = gamepads[i];
                if (gamepad && gamepad.connected) {
                    console.log(`🎮 게임패드 ${i} 발견:`, {
                        id: gamepad.id,
                        mapping: gamepad.mapping,
                        buttons: gamepad.buttons.length,
                        axes: gamepad.axes.length,
                        connected: gamepad.connected
                    });
                    foundController = true;

                    // 컨트롤러가 Quest 계열인지 확인
                    if (gamepad.id.toLowerCase().includes('oculus') || 
                        gamepad.id.toLowerCase().includes('meta') ||
                        gamepad.id.toLowerCase().includes('quest')) {
                        console.log('✅ 메타 퀘스트 컨트롤러 확인됨!');
                        
                        // 진동 테스트
                        if (gamepad.vibrationActuator) {
                            try {
                                await gamepad.vibrationActuator.playEffect('dual-rumble', {
                                    duration: 200,
                                    strongMagnitude: 0.5,
                                    weakMagnitude: 0.3
                                });
                                console.log('✅ 컨트롤러 진동 테스트 성공');
                            } catch (vibError) {
                                console.log('⚠️ 진동 테스트 실패:', vibError);
                            }
                        }
                    }
                }
            }

            if (!foundController) {
                console.warn('⚠️ 연결된 게임패드를 찾을 수 없습니다.');
                console.log('💡 컨트롤러를 흔들어보거나 버튼을 눌러보세요.');
            }

        } catch (error) {
            console.error('❌ 컨트롤러 활성화 실패:', error);
        }
    }

    private showControls(): void {
        console.log('🎮 컨트롤 방법:');
        console.log('  - WASD: 이동');
        console.log('  - 마우스: 시점 변경');
        console.log('  - E: 상호작용');
        console.log('  - Space: 점프');
        console.log('  - Shift: 달리기');
        console.log('  - Tab: 인벤토리');
        console.log('  - D: 디버그 콘솔 토글');
        console.log('🥽 VR 모드:');
        console.log('  - 왼손 조이스틱: 이동');
        console.log('  - 오른손 조이스틱: 회전');
        console.log('  - 트리거: 선택/상호작용');
        console.log('  - 그립: 잡기');
    }

    private showError(error: Error): void {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 10000;
            max-width: 500px;
            text-align: center;
            font-family: monospace;
        `;
        
        errorDiv.innerHTML = `
            <h3>❌ 오류 발생</h3>
            <p>${error.message}</p>
            <button onclick="location.reload()" style="
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: 1px solid white;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 10px;
            ">페이지 새로고침</button>
        `;
        
        document.body.appendChild(errorDiv);
        
        // 5초 후 자동 제거
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
}

// 게임 시작
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Quest Escape VR 시작...');
    new QuestEscapeVR();
}); 