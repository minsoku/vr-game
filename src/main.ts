// @ts-nocheck
import { SimpleVRGame } from './core/SimpleVRGame';
import { LoadingManager } from './utils/LoadingManager';

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
    private game: SimpleVRGame | null = null;
    private loadingManager: LoadingManager;
    private debugConsole: DebugConsole;

    constructor() {
        this.loadingManager = new LoadingManager();
        this.debugConsole = new DebugConsole();
        this.init();
    }

    private async init(): Promise<void> {
        try {
            // 로딩 시작
            this.loadingManager.show('게임 초기화 중...');

            // VR 게임 인스턴스 생성 (WebXR 지원 확인은 나중에)
            console.log('🎮 SimpleVRGame 인스턴스 생성 중...');
            this.game = new SimpleVRGame();

            // 로딩 완료
            this.loadingManager.hide();

            // UI 이벤트 설정
            this.setupUI();

            console.log('🎮 Quest Escape VR이 성공적으로 초기화되었습니다!');
            console.log('💡 마우스를 클릭하여 포인터 락을 활성화하세요.');
        } catch (error) {
            console.error('게임 초기화 실패:', error);
            this.showError(error as Error);
        }
    }

    private setupUI(): void {
        const vrButton = document.getElementById('vr-button') as HTMLButtonElement;
        const uiOverlay = document.getElementById('ui-overlay') as HTMLDivElement;

        if (vrButton && this.game) {
            vrButton.style.display = 'block';
            vrButton.addEventListener('click', () => {
                this.startVRMode();
            });

            // VR 지원 확인
            this.game.checkVRSupport().then((supported: boolean) => {
                if (!supported) {
                    vrButton.textContent = '2D 모드로 플레이';
                    vrButton.title = 'VR이 지원되지 않아 2D 모드로 실행됩니다';
                    console.log('❌ VR 지원되지 않음 - 2D 모드로 설정');
                } else {
                    console.log('✅ VR 지원됨 - VR 버튼 활성화');
                    vrButton.title = '메타 퀘스트에서 VR 모드로 체험하세요';
                }
            }).catch((error) => {
                console.error('❌ VR 지원 확인 중 오류:', error);
                vrButton.textContent = '2D 모드로 플레이';
                vrButton.title = 'VR 확인 실패 - 2D 모드로 실행됩니다';
            });
        }

        if (uiOverlay) {
            uiOverlay.style.display = 'block';
        }

        // 키보드 컨트롤 안내 (2D 모드용)
        this.showControls();

        // 컨트롤러 강제 활성화 버튼 설정
        this.setupControllerActivateButton();
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

            // 브라우저 환경 확인
            console.log('🌐 브라우저 정보:');
            console.log('- User Agent:', navigator.userAgent);
            console.log('- Platform:', navigator.platform);
            console.log('- WebXR 지원:', 'xr' in navigator);
            
            if ('xr' in navigator) {
                console.log('- XR API 존재함');
                try {
                    const xr = (navigator as any).xr;
                    console.log('- XR 객체:', xr);
                    console.log('- isSessionSupported 메서드:', typeof xr.isSessionSupported);
                } catch (e) {
                    console.error('- XR 객체 접근 오류:', e);
                }
            } else {
                console.error('- WebXR API가 없습니다!');
            }

            console.log('🔍 VR 지원 확인 중...');
            const isSupported = await this.game.checkVRSupport();
            console.log('VR 지원 상태:', isSupported);

            if (!isSupported) {
                throw new Error('이 디바이스/브라우저에서는 VR이 지원되지 않습니다.');
            }

            console.log('🚀 VR 모드 시작 시도...');
            await this.game.startVR();
            console.log('✅ VR 모드 시작 성공!');
            
            // VR 가이드 표시
            const vrGuide = document.getElementById('vr-guide');
            const fpsGuide = document.getElementById('fps-guide');
            if (vrGuide && fpsGuide) {
                vrGuide.style.display = 'block';
                fpsGuide.style.display = 'none';
            }
        } catch (error) {
            console.error('❌ VR 모드 시작 실패:', error);
            console.error('❌ 에러 상세:', {
                name: error instanceof Error ? error.name : 'Unknown',
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : 'No stack trace'
            });
            
            const vrButton = document.getElementById('vr-button') as HTMLButtonElement;
            vrButton.disabled = false;
            vrButton.textContent = 'VR 모드 시작';
            
            // Reference Space 에러 특별 처리
            if (error instanceof Error && error.message.includes('requestReferenceSpace')) {
                console.log('🚨 Reference Space 에러 감지 - 사용자 안내 표시');
                const vrErrorGuide = document.getElementById('vr-error-guide');
                if (vrErrorGuide) {
                    vrErrorGuide.style.display = 'block';
                }
            } else {
                // 일반적인 에러 메시지 표시
                const errorMessage = error instanceof Error ? error.message : 'VR 모드를 시작할 수 없습니다.';
                alert(`VR 모드 실패: ${errorMessage}\n\n2D 모드로 계속 진행합니다.\n\n디버그 콘솔(D키)에서 자세한 정보를 확인하세요.`);
            }
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
            const renderer = (this.game as any).renderer;
            if (!renderer || !renderer.xr || !renderer.xr.isPresenting) {
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
                    foundController = true;
                    console.log(`🎮 컨트롤러 ${i} 발견:`, {
                        id: gamepad.id,
                        mapping: gamepad.mapping,
                        axes: gamepad.axes.length,
                        buttons: gamepad.buttons.length,
                        connected: gamepad.connected,
                        timestamp: gamepad.timestamp
                    });

                    // 컨트롤러 진동 시도 (활성화 용도)
                    if (gamepad.vibrationActuator) {
                        try {
                            await gamepad.vibrationActuator.playEffect('dual-rumble', {
                                duration: 300,
                                strongMagnitude: 0.7,
                                weakMagnitude: 0.3
                            });
                            console.log('✅ 컨트롤러 진동 성공');
                        } catch (e) {
                            console.log('진동 실패:', e);
                        }
                    }
                }
            }

            if (!foundController) {
                console.warn('⚠️ 연결된 게임 컨트롤러를 찾을 수 없습니다.');
                console.log('📝 메타 퀘스트3 컨트롤러 해결 방법:');
                console.log('1. 컨트롤러 전원을 다시 켜주세요 (Meta 버튼 길게 누르기)');
                console.log('2. Quest 설정 > 디바이스 > 컨트롤러에서 재페어링');
                console.log('3. 브라우저 새로고침 후 VR 모드 재시작');
                console.log('4. Quest 재시작 후 재시도');
            } else {
                console.log('✅ 컨트롤러 발견! 이제 조이스틱을 움직여보세요.');
            }

        } catch (error) {
            console.error('❌ 컨트롤러 활성화 실패:', error);
        }
    }

    private showControls(): void {
        console.log(`
🎮 Quest Escape VR - 조작 방법:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖱️ 마우스 모드:
• 마우스 이동: 오브젝트 하이라이트
• 클릭: FPS 모드 활성화 또는 오브젝트 상호작용
• H: 힌트 보기

🎯 FPS 모드 (포인터 락):
• WASD: 이동
• 마우스: 시점 회전
• 클릭: 중앙 크로스헤어로 상호작용
• P: 비밀번호 입력
• ESC: FPS 모드 해제

🎲 게임 목표:
• 황금 큐브 수집 (+100점)
• 터미널에서 비밀번호 입력 (+200점)
• 총 300점으로 게임 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `);
    }

    private showError(error: Error): void {
        const loadingDiv = document.getElementById('loading');
        if (loadingDiv) {
            loadingDiv.innerHTML = `
                <h1>❌ 오류 발생</h1>
                <p>${error.message}</p>
                <button onclick="location.reload()" style="
                    padding: 10px 20px;
                    background: #ff6b6b;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                ">다시 시도</button>
            `;
        }
    }
}

// 게임 시작
window.addEventListener('DOMContentLoaded', () => {
    new QuestEscapeVR();
});

// 전역으로 내보내기 (디버깅용)
(window as any).QuestEscapeVR = QuestEscapeVR; 