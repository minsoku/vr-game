import { VRGame } from './core/VRGame';
import { LoadingManager } from './utils/LoadingManager';

class QuestEscapeVR {
    private game: VRGame | null = null;
    private loadingManager: LoadingManager;

    constructor() {
        this.loadingManager = new LoadingManager();
        this.init();
    }

    private async init(): Promise<void> {
        try {
            // 로딩 시작
            this.loadingManager.show('게임 초기화 중...');

            // WebXR 지원 확인
            if (!('xr' in navigator)) {
                throw new Error('WebXR을 지원하지 않는 브라우저입니다.');
            }

            // VR 게임 인스턴스 생성
            this.game = new VRGame();
            await this.game.init();

            // 로딩 완료
            this.loadingManager.hide();

            // UI 이벤트 설정
            this.setupUI();

            console.log('🎮 Quest Escape VR이 성공적으로 초기화되었습니다!');
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
        if (!this.game) return;

        try {
            const vrButton = document.getElementById('vr-button') as HTMLButtonElement;
            vrButton.disabled = true;
            vrButton.textContent = 'VR 모드 시작 중...';

            await this.game.startVR();
        } catch (error) {
            console.error('VR 모드 시작 실패:', error);
            const vrButton = document.getElementById('vr-button') as HTMLButtonElement;
            vrButton.disabled = false;
            vrButton.textContent = 'VR 모드 시작';
            alert('VR 모드를 시작할 수 없습니다. 2D 모드로 계속 진행합니다.');
        }
    }

    private showControls(): void {
        console.log(`
🎮 조작 방법:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VR 모드:
• 컨트롤러로 오브젝트 가리키기 및 트리거로 선택
• 그립 버튼으로 오브젝트 집기/놓기
• 조이스틱으로 이동 (텔레포트 모드)

2D 모드:
• WASD: 이동
• 마우스: 시점 회전
• 클릭: 오브젝트 상호작용
• E: 아이템 줍기/사용
• TAB: 인벤토리 열기
• H: 힌트 보기
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