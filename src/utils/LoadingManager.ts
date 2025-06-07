export class LoadingManager {
    private loadingElement: HTMLElement | null = null;
    private loadingText: HTMLElement | null = null;

    constructor() {
        this.loadingElement = document.getElementById('loading');
        this.loadingText = this.loadingElement?.querySelector('p') || null;
    }

    public show(message: string = '로딩 중...'): void {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'flex';
        }
        
        if (this.loadingText) {
            this.loadingText.textContent = message;
        }
    }

    public hide(): void {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
    }

    public updateProgress(message: string, progress?: number): void {
        if (this.loadingText) {
            const progressText = progress !== undefined ? ` (${Math.round(progress * 100)}%)` : '';
            this.loadingText.textContent = message + progressText;
        }
    }
} 