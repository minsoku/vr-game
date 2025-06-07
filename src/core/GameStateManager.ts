import type { VRGame } from './VRGame';
import type { InventoryItem } from './types';

export class GameStateManager {
    private game: VRGame;
    
    // 게임 상태
    private isGameStarted: boolean = false;
    private isGameCompleted: boolean = false;
    private startTime: number = 0;
    private currentTime: number = 0;
    
    // 점수 시스템
    private score: number = 0;
    private hintsUsed: number = 0;
    private maxHints: number = 3;
    
    // 인벤토리
    private inventory: InventoryItem[] = [];
    
    // UI 업데이트를 위한 타이머
    private timerInterval: number | null = null;

    constructor(game: VRGame) {
        this.game = game;
    }

    public startGame(): void {
        this.isGameStarted = true;
        this.isGameCompleted = false;
        this.startTime = Date.now();
        this.currentTime = 0;
        this.score = 0;
        this.hintsUsed = 0;
        this.inventory = [];
        
        // 타이머 시작
        this.startTimer();
        
        console.log('🎮 게임이 시작되었습니다!');
        this.updateUI();
    }

    public completeGame(): void {
        if (!this.isGameStarted || this.isGameCompleted) return;
        
        this.isGameCompleted = true;
        this.stopTimer();
        
        // 완료 보너스 점수 계산
        const timeBonus = Math.max(0, 1000 - this.currentTime);
        const hintPenalty = this.hintsUsed * 50;
        const finalScore = this.score + timeBonus - hintPenalty;
        
        console.log(`🎉 게임 완료!`);
        console.log(`총 시간: ${this.formatTime(this.currentTime)}`);
        console.log(`최종 점수: ${finalScore}`);
        
        this.showGameCompleteUI(finalScore);
    }

    public addScore(points: number): void {
        this.score += points;
        this.updateUI();
        console.log(`+${points} 점수 획득! 현재 점수: ${this.score}`);
    }

    public useHint(): void {
        if (this.hintsUsed >= this.maxHints) {
            console.log('❌ 더 이상 힌트를 사용할 수 없습니다.');
            return;
        }
        
        this.hintsUsed++;
        this.updateUI();
        
        // 현재 방에 따른 힌트 제공
        this.showCurrentHint();
    }

    public addToInventory(item: InventoryItem): void {
        this.inventory.push(item);
        console.log(`📦 인벤토리에 추가됨: ${item.name}`);
        this.updateUI();
    }

    public removeFromInventory(itemId: string): InventoryItem | null {
        const index = this.inventory.findIndex(item => item.id === itemId);
        if (index !== -1) {
            const item = this.inventory.splice(index, 1)[0];
            console.log(`📦 인벤토리에서 제거됨: ${item.name}`);
            this.updateUI();
            return item;
        }
        return null;
    }

    public hasItemInInventory(itemId: string): boolean {
        return this.inventory.some(item => item.id === itemId);
    }

    public getInventory(): InventoryItem[] {
        return [...this.inventory];
    }

    private startTimer(): void {
        this.timerInterval = window.setInterval(() => {
            this.currentTime = Math.floor((Date.now() - this.startTime) / 1000);
            this.updateUI();
        }, 1000);
    }

    private stopTimer(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    private formatTime(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    private updateUI(): void {
        // HTML UI 업데이트
        const timerElement = document.getElementById('timer');
        const scoreElement = document.getElementById('score');
        const hintsElement = document.getElementById('hints');
        
        if (timerElement) {
            timerElement.textContent = `시간: ${this.formatTime(this.currentTime)}`;
        }
        
        if (scoreElement) {
            scoreElement.textContent = `점수: ${this.score}`;
        }
        
        if (hintsElement) {
            const remainingHints = this.maxHints - this.hintsUsed;
            hintsElement.textContent = `힌트: ${remainingHints}개 남음`;
        }
    }

    private showCurrentHint(): void {
        const hints = [
            "🔍 책상 위를 자세히 살펴보세요.",
            "🗝️ 획득한 아이템들을 어디에 사용할 수 있을지 생각해보세요.",
            "📚 책장 사이에 숨겨진 것이 있을 수 있습니다."
        ];
        
        const currentHint = hints[this.hintsUsed - 1] || "더 이상 힌트가 없습니다.";
        console.log(`💡 힌트: ${currentHint}`);
        
        // 힌트 UI 표시 (3초 후 자동 사라짐)
        this.showHintUI(currentHint);
    }

    private showHintUI(hint: string): void {
        // 힌트 팝업 생성
        const hintPopup = document.createElement('div');
        hintPopup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-size: 18px;
            z-index: 1000;
            max-width: 400px;
            text-align: center;
        `;
        hintPopup.textContent = hint;
        document.body.appendChild(hintPopup);
        
        // 3초 후 제거
        setTimeout(() => {
            document.body.removeChild(hintPopup);
        }, 3000);
    }

    private showGameCompleteUI(finalScore: number): void {
        const completePopup = document.createElement('div');
        completePopup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1e3c72, #2a5298);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            z-index: 2000;
        `;
        
        completePopup.innerHTML = `
            <h1 style="font-size: 3rem; margin-bottom: 1rem;">🎉 축하합니다!</h1>
            <p style="font-size: 1.5rem; margin-bottom: 1rem;">方탈출에 성공했습니다!</p>
            <div style="font-size: 1.2rem; margin-bottom: 2rem;">
                <p>완료 시간: ${this.formatTime(this.currentTime)}</p>
                <p>사용한 힌트: ${this.hintsUsed}개</p>
                <p>최종 점수: ${finalScore}점</p>
            </div>
            <button onclick="location.reload()" style="
                padding: 15px 30px;
                background: #ff6b6b;
                color: white;
                border: none;
                border-radius: 25px;
                font-size: 18px;
                cursor: pointer;
            ">다시 플레이</button>
        `;
        
        document.body.appendChild(completePopup);
    }

    // 퍼즐 진행 상태 체크
    public checkPuzzleProgress(): void {
        // 예시: 모든 열쇠를 모았고 서랍을 열었는지 확인
        const hasKey = this.hasItemInInventory('library_key_1');
        
        // 간단한 승리 조건 체크 (향후 확장)
        if (this.score >= 100) {
            this.completeGame();
        }
    }

    // 게임 저장/로드 (향후 구현)
    public saveGame(): void {
        const gameData = {
            score: this.score,
            currentTime: this.currentTime,
            hintsUsed: this.hintsUsed,
            inventory: this.inventory.map(item => ({
                id: item.id,
                type: item.type,
                name: item.name
            }))
        };
        
        localStorage.setItem('quest-escape-vr-save', JSON.stringify(gameData));
        console.log('💾 게임이 저장되었습니다.');
    }

    public loadGame(): boolean {
        const savedData = localStorage.getItem('quest-escape-vr-save');
        if (!savedData) return false;
        
        try {
            const gameData = JSON.parse(savedData);
            this.score = gameData.score || 0;
            this.currentTime = gameData.currentTime || 0;
            this.hintsUsed = gameData.hintsUsed || 0;
            // 인벤토리 복원은 오브젝트 참조 때문에 복잡 (향후 구현)
            
            console.log('📁 게임이 로드되었습니다.');
            this.updateUI();
            return true;
        } catch (error) {
            console.error('게임 로드 실패:', error);
            return false;
        }
    }

    public update(): void {
        // 게임 상태 업데이트
        if (this.isGameStarted && !this.isGameCompleted) {
            this.checkPuzzleProgress();
        }
    }

    public dispose(): void {
        this.stopTimer();
    }
} 