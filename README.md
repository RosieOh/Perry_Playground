# Dev Dashboard (DevDash)

Perry 기반 로컬 개발 환경 대시보드 — 포트, Docker, Compose, Watch, History.

## 실행

```bash
npm run build
./dist/dev-dashboard
```

## 기능

### Ports
- `lsof` 실시간 TCP LISTEN 스캔
- 검색 (포트 / 프로세스 / PID)
- **Dev ports** / **Hide system** 필터
- **Open** — 브라우저에서 localhost 열기
- **Copy** — PID/포트 클립보드 복사
- **Info** — `ps` 전체 커맨드라인
- **Pin/Unpin** — Watch 목록에 추가
- **Kill 💥** — 프로세스 종료 + History 기록

### Docker
- `docker ps -a` + **CPU/MEM stats**
- Start / Stop
- **Logs** (tail 50) + Copy
- Container ID 복사

### Compose
- `docker compose ls` 프로젝트 목록
- **Up / Down** per project

### Watch
- Pin된 포트 실시간 감시
- 새 점유 시 **macOS 알림** (`notificationSend`)
- Free / Occupied 상태 표시

### History
- Kill 기록 (포트, PID, 시간)
- `kill -9` 명령 Copy

### 공통
- **⌘R** Refresh · **⌘1–5** 탭 전환 · **⌘E** Export
- **Export** JSON / CSV (Ports) 또는 JSON (Docker)
- **메뉴바 트레이** — Open / Refresh / Quit
- 5초 자동 새로고침

## 단축키

| 단축키 | 동작 |
|--------|------|
| ⌘R | Refresh |
| ⌘1–5 | Ports / Docker / Compose / Watch / History |
| ⌘E | Export |

## 구조

```
src/
  dashboard.ts   # UI
  ports.ts         # lsof, kill, ps
  docker.ts        # docker ps/stats/logs/compose
  filter.ts        # 검색·필터
  favorites.ts     # Watch / Pin / 알림
  history.ts       # Kill 기록
  export.ts        # JSON/CSV
  theme.ts         # 디자인 토큰
  types.ts
```
