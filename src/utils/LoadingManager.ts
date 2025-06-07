export class LoadingManager {
    private loadingElement: HTMLElement | null = null;
    private loadingText: HTMLElement | null = null;
    private progressBar: HTMLElement | null = null;

    constructor() {
        this.loadingElement = document.getElementById('loadingScreen');
        this.loadingText = this.loadingElement?.querySelector('.loading-text') || null;
        this.progressBar = document.getElementById('loadingProgress');
    }

    public show(message: string = '로딩 중...'): void {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'flex';
            this.loadingElement.classList.remove('hidden');
        }
        
        if (this.loadingText) {
            this.loadingText.textContent = message;
        }
    }

    public hide(): void {
        if (this.loadingElement) {
            this.loadingElement.classList.add('hidden');
            
            // 애니메이션 완료 후 완전히 숨김
            setTimeout(() => {
                if (this.loadingElement) {
                    this.loadingElement.style.display = 'none';
                }
            }, 500);
        }
    }

    public updateProgress(message: string, progress?: number): void {
        if (this.loadingText) {
            this.loadingText.textContent = message;
        }
        
        if (this.progressBar && progress !== undefined) {
            this.progressBar.style.width = `${Math.round(progress * 100)}%`;
        }
    }
} 