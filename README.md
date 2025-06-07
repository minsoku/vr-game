# 🔐 Quest Escape VR

메타퀘스트 3 기반 웹 VR 방탈출 게임

## 🎯 프로젝트 개요

**Quest Escape VR**은 웹 브라우저를 통해 메타퀘스트 3에서 접근 가능한 몰입형 VR 방탈출 게임입니다. WebXR과 Three.js를 활용하여 별도 앱 설치 없이 브라우저만으로 VR 경험을 제공합니다.

### ✨ 주요 기능

- 🥽 **WebXR 기반 VR 지원** - 메타퀘스트 3 최적화
- 🖱️ **2D 모드 지원** - VR 기기 없이도 플레이 가능
- 🏠 **다양한 방 테마** - 고전 서재, 과학 연구소, 미스터리 하우스
- 🧩 **물리 기반 퍼즐** - 직관적인 VR 인터랙션
- 🎮 **컨트롤러 지원** - 햅틱 피드백 포함
- 📦 **인벤토리 시스템** - 아이템 수집 및 관리
- 💡 **힌트 시스템** - 단계별 도움말
- 🏆 **점수 시스템** - 시간 및 성과 기반 점수

## 🛠️ 기술 스택

- **Frontend**: TypeScript, Three.js, WebXR
- **Build Tool**: Vite
- **Runtime**: ES2020, WebXR Device API
- **Hosting**: 정적 호스팅 (Vercel, Netlify 등)

## 🚀 빠른 시작

### 1. 설치

```bash
# 의존성 설치
npm install
```

### 2. 개발 서버 실행

```bash
# 개발 모드 실행 (HTTPS 필요 - WebXR 요구사항)
npm run dev
```

개발 서버가 `https://localhost:3000`에서 실행됩니다.

### 3. 빌드

```bash
# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

## 🎮 게임 플레이 방법

### VR 모드 (메타퀘스트 3)

1. **브라우저 열기** - Quest Browser에서 게임 URL 접속
2. **VR 모드 버튼 클릭** - "VR 모드 시작" 버튼 선택
3. **컨트롤러 사용**:
   - 트리거: 오브젝트 선택/상호작용
   - 그립: 오브젝트 집기/놓기
   - 조이스틱: 텔레포트 이동

### 2D 모드 (데스크톱)

1. **마우스 클릭** - 포인터 락 활성화
2. **키보드 조작**:
   - `WASD`: 이동
   - `마우스`: 시점 회전
   - `E`: 오브젝트 상호작용
   - `H`: 힌트 보기
   - `TAB`: 인벤토리 (향후 구현)
   - `ESC`: 포인터 락 해제

## 📁 프로젝트 구조

```
quest-escape-vr/
├── src/
│   ├── main.ts              # 메인 엔트리포인트
│   ├── core/                # 핵심 게임 시스템
│   │   ├── VRGame.ts        # VR 게임 메인 클래스
│   │   ├── SceneManager.ts  # 3D 씬 관리
│   │   ├── InputManager.ts  # 입력 처리 (VR/2D)
│   │   ├── GameStateManager.ts # 게임 상태 관리
│   │   └── AudioManager.ts  # 오디오 시스템
│   └── utils/
│       └── LoadingManager.ts # 로딩 관리
├── public/                  # 정적 파일
│   └── sounds/             # 오디오 파일 (선택적)
├── index.html              # 메인 HTML
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🎯 현재 구현 상태

### ✅ 완료된 기능

- [x] WebXR 기본 환경 구축
- [x] Three.js 3D 렌더링
- [x] VR 컨트롤러 지원
- [x] 2D 모드 폴백
- [x] 기본 방 환경 (고전 서재)
- [x] 물리 기반 오브젝트 상호작용
- [x] 인벤토리 시스템
- [x] 점수/타이머 시스템
- [x] 힌트 시스템
- [x] 기본 퍼즐 (열쇠-서랍)

### 🚧 개발 중 / 향후 계획

- [ ] 추가 방 테마 (과학 연구소, 미스터리 하우스)
- [ ] 고급 퍼즐 시스템
- [ ] 3D 사운드 시스템
- [ ] 컨트롤러 레이저 포인터
- [ ] VR 인벤토리 UI
- [ ] 멀티플레이어 지원
- [ ] 커스텀 방 제작 도구

## 🔧 개발 환경 설정

### WebXR 개발을 위한 요구사항

1. **HTTPS 필수** - WebXR은 보안 컨텍스트에서만 동작
2. **메타퀘스트 3** - VR 테스트용
3. **Chrome/Edge** - WebXR 지원 브라우저

### 디버깅

```bash
# 타입 체크
npm run type-check

# 린트
npm run lint
```

### 성능 최적화

- 90fps 목표 (메타퀘스트 3 기준)
- LOD(Level of Detail) 시스템 활용
- 효율적인 메모리 관리

## 🎨 에셋 추가

### 3D 모델

`public/models/` 폴더에 GLTF/GLB 파일 배치:

```
public/
├── models/
│   ├── library/
│   ├── lab/
│   └── mystery/
```

### 오디오 파일

`public/sounds/` 폴더에 MP3/OGG 파일 배치:

```
public/
├── sounds/
│   ├── music/
│   └── sfx/
```

## 📱 배포

### Vercel 배포

```bash
# Vercel CLI 설치 및 배포
npm i -g vercel
vercel
```

### Netlify 배포

```bash
# 빌드 후 dist 폴더 배포
npm run build
# dist 폴더를 Netlify에 드래그 앤 드롭
```

## 🤝 기여 방법

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 라이선스

MIT License

## 🆘 문제 해결

### 일반적인 문제들

**Q: VR 모드가 시작되지 않아요**
A: HTTPS 환경인지 확인하고, 메타퀘스트 3에서 개발자 모드가 활성화되어 있는지 확인하세요.

**Q: 성능이 떨어져요**
A: 브라우저 개발자 도구에서 GPU 사용량을 확인하고, 렌더링 품질을 조정해보세요.

**Q: 컨트롤러가 인식되지 않아요**
A: Quest Browser에서 컨트롤러 권한이 허용되어 있는지 확인하세요.

## 📞 지원

이슈가 있으시면 GitHub Issues를 통해 문의해주세요.

---

**Quest Escape VR** - 웹에서 만나는 새로운 차원의 방탈출 경험! 🚀 