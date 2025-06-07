import { SimpleVRGame } from './core/SimpleVRGame';
import { LoadingManager } from './utils/LoadingManager';

class QuestEscapeVR {
    private game: SimpleVRGame | null = null;
    private loadingManager: LoadingManager;

    constructor() {
        this.loadingManager = new LoadingManager();
        this.init();
    }

    private async init(): Promise<void> {
        try {
            // 로딩 시작
            this.loadingManager.show('게임 초기화 중...');

            // VR 게임 인스턴스 생성 (WebXR 지원 확인은 나중에)
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