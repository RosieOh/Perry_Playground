/** Deep Charcoal & Neon design tokens — hex → 0..1 RGBA for Perry FFI setters. */

export const C = {
    // #121316 — 메인 배경. 눈의 피로를 줄이는 딥 차콜
    bg: { r: 18 / 255, g: 19 / 255, b: 22 / 255, a: 1 },
    // #1C1D22 — 카드/서피스. 배경 대비 한 단계 밝아 계층 분리
    surface: { r: 28 / 255, g: 29 / 255, b: 34 / 255, a: 1 },
    // #0B0C0E — 사이드바. 가장 어두운 블랙으로 내비 영역 고정
    sidebar: { r: 11 / 255, g: 12 / 255, b: 14 / 255, a: 1 },
    // #007AFF — 네온 블루 액센트. 선택·하이라이트
    accent: { r: 0, g: 122 / 255, b: 1, a: 1 },
    // #34C759 — 일렉트릭 그린. Live / Up 상태
    green: { r: 52 / 255, g: 199 / 255, b: 89 / 255, a: 1 },
    // #FF453A — 비비드 레드. Kill / Stop
    red: { r: 1, g: 69 / 255, b: 58 / 255, a: 1 },
    // #FFFFFF — 메인 텍스트
    text: { r: 1, g: 1, b: 1, a: 1 },
    // #8E8E93 — 보조 텍스트 (PID, ID, 캡션)
    muted: { r: 142 / 255, g: 142 / 255, b: 147 / 255, a: 1 },
    // 액센트 블루 12% — 선택된 사이드바 아이템 배경
    accentSoft: { r: 0, g: 122 / 255, b: 1, a: 0.12 },
    // 레드 14% — Kill 버튼 hover 배경
    redSoft: { r: 1, g: 69 / 255, b: 58 / 255, a: 0.14 },
    // 그린 14% — Start 버튼 배경
    greenSoft: { r: 52 / 255, g: 199 / 255, b: 89 / 255, a: 0.18 },
    transparent: { r: 0, g: 0, b: 0, a: 0 },
} as const;

export const RADIUS = {
    window: 12,
    card: 8,
    badge: 6,
    dot: 99,
    button: 6,
} as const;

export const LAYOUT = {
    windowW: 720,
    windowH: 600,
    sidebarW: 180,
    cardRowH: 76,
    cardGap: 10,
} as const;
