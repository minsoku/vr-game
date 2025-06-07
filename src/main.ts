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
        document.addEventListener('keydown', (event) => {
            if (event.key === 'd' || event.key === 'D') {
                this.toggle();
            }
        });
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
        if (debugConsole) {
            debugConsole.style.display = this.isVisible ? 'block' : 'none';
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
                }
            });
        }

        if (uiOverlay) {
            uiOverlay.style.display = 'block';
        }

        // 키보드 컨트롤 안내 (2D 모드용)
        this.showControls();
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
            
            // 더 자세한 에러 메시지 표시
            const errorMessage = error instanceof Error ? error.message : 'VR 모드를 시작할 수 없습니다.';
            alert(`VR 모드 실패: ${errorMessage}\n\n2D 모드로 계속 진행합니다.\n\n디버그 콘솔(D키)에서 자세한 정보를 확인하세요.`);
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