export class AudioManager {
    private audioContext: AudioContext | null = null;
    private backgroundMusic: HTMLAudioElement | null = null;
    private soundEffects: Map<string, HTMLAudioElement> = new Map();
    
    // 볼륨 설정
    private masterVolume: number = 0.7;
    private musicVolume: number = 0.5;
    private sfxVolume: number = 0.8;
    
    // 음소거 상태
    private isMuted: boolean = false;

    constructor() {
        this.initAudioContext();
        this.loadSounds();
    }

    private initAudioContext(): void {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (error) {
            console.warn('Web Audio API를 지원하지 않는 브라우저입니다:', error);
        }
    }

    private loadSounds(): void {
        // 배경음악 (실제 파일 없이 데모용)
        console.log('🎵 오디오 파일 로딩 준비 (실제 파일은 public/sounds/ 폴더에 배치하세요)');
        
        // 효과음 파일 경로들 (실제 파일이 있을 때 사용)
        const soundFiles = {
            'key_pickup': '/sounds/key_pickup.mp3',
            'drawer_open': '/sounds/drawer_open.mp3',
            'door_open': '/sounds/door_open.mp3',
            'puzzle_solve': '/sounds/puzzle_solve.mp3',
            'hint_show': '/sounds/hint_show.mp3',
            'game_complete': '/sounds/game_complete.mp3'
        };

        // 실제 환경에서는 파일 로딩
        // for (const [name, path] of Object.entries(soundFiles)) {
        //     this.loadSound(name, path);
        // }
    }

    private loadSound(name: string, path: string): void {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.volume = this.sfxVolume * this.masterVolume;
        
        audio.addEventListener('canplaythrough', () => {
            console.log(`✅ 효과음 로딩 완료: ${name}`);
        });
        
        audio.addEventListener('error', (e) => {
            console.warn(`❌ 효과음 로딩 실패: ${name}`, e);
        });
        
        this.soundEffects.set(name, audio);
    }

    public playBackgroundMusic(trackName: string = 'library_ambient'): void {
        if (this.isMuted) return;
        
        // 기존 배경음악 정지
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
        }
        
        // 실제 파일이 있을 때 사용
        // const musicPath = `/sounds/music/${trackName}.mp3`;
        // this.backgroundMusic = new Audio(musicPath);
        // this.backgroundMusic.loop = true;
        // this.backgroundMusic.volume = this.musicVolume * this.masterVolume;
        // this.backgroundMusic.play().catch(e => console.warn('배경음악 재생 실패:', e));
        
        console.log(`🎵 배경음악 재생: ${trackName} (파일이 있을 때 활성화됩니다)`);
    }

    public stopBackgroundMusic(): void {
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
        }
    }

    public playSoundEffect(soundName: string, volume: number = 1.0): void {
        if (this.isMuted) return;
        
        // 실제 파일이 있을 때의 로직
        const sound = this.soundEffects.get(soundName);
        if (sound) {
            sound.currentTime = 0;
            sound.volume = this.sfxVolume * this.masterVolume * volume;
            sound.play().catch(e => console.warn(`효과음 재생 실패: ${soundName}`, e));
        } else {
            // 데모용 콘솔 로그
            this.playDemoSound(soundName);
        }
    }

    private playDemoSound(soundName: string): void {
        // 실제 사운드 파일이 없을 때 콘솔로 시뮬레이션
        const soundEmojis: { [key: string]: string } = {
            'key_pickup': '🔑',
            'drawer_open': '📦',
            'door_open': '🚪',
            'puzzle_solve': '🧩',
            'hint_show': '💡',
            'game_complete': '🎉'
        };
        
        const emoji = soundEmojis[soundName] || '🔊';
        console.log(`${emoji} 효과음: ${soundName}`);
    }

    // VR 전용 3D 오디오 (Web Audio API 사용)
    public play3DSound(soundName: string, position: { x: number, y: number, z: number }, volume: number = 1.0): void {
        if (!this.audioContext || this.isMuted) return;
        
        console.log(`🎧 3D 사운드: ${soundName} at (${position.x}, ${position.y}, ${position.z})`);
        
        // 실제 구현에서는 Web Audio API의 PannerNode 사용
        // const panner = this.audioContext.createPanner();
        // panner.setPosition(position.x, position.y, position.z);
        // ... 3D 오디오 설정 및 재생
    }

    // 볼륨 제어
    public setMasterVolume(volume: number): void {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }

    public setMusicVolume(volume: number): void {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = this.musicVolume * this.masterVolume;
        }
    }

    public setSFXVolume(volume: number): void {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.updateSFXVolumes();
    }

    private updateAllVolumes(): void {
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = this.musicVolume * this.masterVolume;
        }
        this.updateSFXVolumes();
    }

    private updateSFXVolumes(): void {
        this.soundEffects.forEach(audio => {
            audio.volume = this.sfxVolume * this.masterVolume;
        });
    }

    // 음소거 제어
    public toggleMute(): void {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            this.stopBackgroundMusic();
            console.log('🔇 오디오 음소거');
        } else {
            console.log('🔊 오디오 음소거 해제');
        }
    }

    public mute(): void {
        this.isMuted = true;
        this.stopBackgroundMusic();
    }

    public unmute(): void {
        this.isMuted = false;
    }

    // 게임 이벤트별 사운드 재생
    public onKeyPickup(): void {
        this.playSoundEffect('key_pickup');
    }

    public onDrawerOpen(): void {
        this.playSoundEffect('drawer_open');
    }

    public onPuzzleSolve(): void {
        this.playSoundEffect('puzzle_solve');
    }

    public onHintShow(): void {
        this.playSoundEffect('hint_show');
    }

    public onGameComplete(): void {
        this.playSoundEffect('game_complete');
    }

    // 방별 배경음악 전환
    public switchRoomMusic(roomType: string): void {
        const musicTracks: { [key: string]: string } = {
            'library': 'library_ambient',
            'lab': 'lab_electronic',
            'mystery': 'mystery_spooky'
        };
        
        const track = musicTracks[roomType] || 'library_ambient';
        this.playBackgroundMusic(track);
    }

    // 리소스 정리
    public dispose(): void {
        this.stopBackgroundMusic();
        
        this.soundEffects.forEach(audio => {
            audio.pause();
            audio.src = '';
        });
        this.soundEffects.clear();
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        console.log('🎵 AudioManager 리소스 정리 완료');
    }
} 