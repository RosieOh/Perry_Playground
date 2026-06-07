/**
 * DevDash — full-featured local dev environment dashboard
 */

import {
    App,
    VStack,
    HStack,
    Text,
    Button,
    Spacer,
    State,
    LazyVStack,
    lazyvstackUpdate,
    lazyvstackSetRowHeight,
    appSetTimer,
    alertWithButtons,
    alert,
    widgetSetEdgeInsets,
    widgetSetBackgroundColor,
    widgetSetWidth,
    widgetSetHeight,
    stackSetAlignment,
    setCornerRadius,
    textSetColor,
    textSetFontSize,
    textSetFontWeight,
    buttonSetBordered,
    buttonSetTextColor,
    widgetSetBorderColor,
    widgetSetBorderWidth,
    TextField,
    Toggle,
    clipboardWrite,
    addKeyboardShortcut,
    trayCreate,
    traySetTooltip,
    trayAttachMenu,
    menuCreate,
    menuAddItem,
    menuAddSeparator,
    type Widget,
} from "perry/ui";

import { openURL } from "perry/system";
import { notificationSend } from "perry/system";
import { exit } from "process";

import { scanAllListeningPorts, killPortProcess, getProcessCommand, formatPortSummary } from "./ports";
import {
    isDockerAvailable,
    listContainers,
    startContainer,
    stopContainer,
    getContainerLogs,
    listComposeProjects,
    composeUp,
    composeDown,
    formatDockerSummary,
} from "./docker";
import { filterPorts, portToUrl } from "./filter";
import {
    toggleFavorite,
    isFavorite,
    checkWatchAlerts,
    getWatchStatuses,
    addFavoritePort,
} from "./favorites";
import { addKillRecord, getKillHistory, getKillHistoryCount } from "./history";
import { portsToJson, portsToCsv, containersToJson } from "./export";
import type { PortEntry, DockerContainer, ComposeProject, KillRecord } from "./types";
import { C, RADIUS, LAYOUT } from "./theme";

const TAB_PORTS = 0;
const TAB_DOCKER = 1;
const TAB_COMPOSE = 2;
const TAB_WATCH = 3;
const TAB_HISTORY = 4;

const activeTab = State(0);
const allPortEntries = State<PortEntry[]>([]);
const filteredPortEntries = State<PortEntry[]>([]);
const filteredPortCount = State(0);
const portSearchQuery = State("");
const devOnlyMode = State(false);
const hideSystemMode = State(true);
const dockerContainers = State<DockerContainer[]>([]);
const dockerCount = State(0);
const composeProjects = State<ComposeProject[]>([]);
const composeCount = State(0);
const watchStatuses = State<{ port: number; occupied: boolean; entry?: PortEntry }[]>([]);
const watchCount = State(0);
const killHistory = State<KillRecord[]>([]);
const historyCount = State(0);
const lastUpdated = State("");
const exportFormat = State(0);
const dockerReady = isDockerAvailable();

function paintBg(w: Widget): void {
    widgetSetBackgroundColor(w, C.bg.r, C.bg.g, C.bg.b, C.bg.a);
}

function paintSurface(w: Widget): void {
    widgetSetBackgroundColor(w, C.surface.r, C.surface.g, C.surface.b, C.surface.a);
    setCornerRadius(w, RADIUS.card);
}

function paintSidebar(w: Widget): void {
    widgetSetBackgroundColor(w, C.sidebar.r, C.sidebar.g, C.sidebar.b, C.sidebar.a);
}

function styleTitle(w: Widget): Widget {
    textSetColor(w, C.text.r, C.text.g, C.text.b, C.text.a);
    textSetFontSize(w, 15);
    textSetFontWeight(w, 600);
    return w;
}

function styleBody(w: Widget): Widget {
    textSetColor(w, C.text.r, C.text.g, C.text.b, C.text.a);
    textSetFontSize(w, 13);
    return w;
}

function styleMuted(w: Widget): Widget {
    textSetColor(w, C.muted.r, C.muted.g, C.muted.b, C.muted.a);
    textSetFontSize(w, 11);
    return w;
}

function styleCaption(w: Widget): Widget {
    textSetColor(w, C.muted.r, C.muted.g, C.muted.b, C.muted.a);
    textSetFontSize(w, 12);
    return w;
}

function ghostBtn(label: string, onPress: () => void, accent?: boolean): Widget {
    const btn = Button(label, onPress);
    buttonSetBordered(btn, 0);
    if (accent) {
        buttonSetTextColor(btn, C.accent.r, C.accent.g, C.accent.b, C.accent.a);
    } else {
        buttonSetTextColor(btn, C.muted.r, C.muted.g, C.muted.b, C.muted.a);
    }
    textSetFontSize(btn, 11);
    setCornerRadius(btn, RADIUS.button);
    widgetSetEdgeInsets(btn, 4, 8, 4, 8);
    return btn;
}

function liveDot(): Widget {
    const dot = VStack(0, []);
    widgetSetWidth(dot, 8);
    widgetSetHeight(dot, 8);
    widgetSetBackgroundColor(dot, C.green.r, C.green.g, C.green.b, C.green.a);
    setCornerRadius(dot, RADIUS.dot);
    return dot;
}

function offlineDot(): Widget {
    const dot = VStack(0, []);
    widgetSetWidth(dot, 8);
    widgetSetHeight(dot, 8);
    widgetSetBackgroundColor(dot, C.muted.r, C.muted.g, C.muted.b, 0.5);
    setCornerRadius(dot, RADIUS.dot);
    return dot;
}

function statusBadge(label: string, running: boolean): Widget {
    const labelText = styleBody(Text(label));
    if (running) textSetColor(labelText, C.green.r, C.green.g, C.green.b, C.green.a);
    const badge = running ? HStack(6, [liveDot(), labelText]) : HStack(6, [labelText]);
    widgetSetEdgeInsets(badge, 4, 10, 4, 10);
    widgetSetBackgroundColor(
        badge,
        running ? C.greenSoft.r : C.muted.r,
        running ? C.greenSoft.g : C.muted.g,
        running ? C.greenSoft.b : C.muted.b,
        running ? C.greenSoft.a : 0.12,
    );
    setCornerRadius(badge, RADIUS.badge);
    return badge;
}

function card(inner: Widget): Widget {
    const shell = VStack(0, [inner]);
    paintSurface(shell);
    widgetSetEdgeInsets(shell, 12, 14, 12, 14);
    return shell;
}

function killButton(onPress: () => void): Widget {
    const btn = Button("Kill 💥", onPress);
    buttonSetBordered(btn, 0);
    buttonSetTextColor(btn, C.red.r, C.red.g, C.red.b, C.red.a);
    textSetFontSize(btn, 11);
    setCornerRadius(btn, RADIUS.button);
    widgetSetEdgeInsets(btn, 4, 10, 4, 10);
    widgetSetBackgroundColor(btn, C.redSoft.r, C.redSoft.g, C.redSoft.b, 0.08);
    return btn;
}

function startButton(onPress: () => void): Widget {
    const btn = Button("▶ Start", onPress);
    buttonSetBordered(btn, 0);
    buttonSetTextColor(btn, C.green.r, C.green.g, C.green.b, C.green.a);
    setCornerRadius(btn, RADIUS.button);
    widgetSetEdgeInsets(btn, 4, 10, 4, 10);
    widgetSetBackgroundColor(btn, C.greenSoft.r, C.greenSoft.g, C.greenSoft.b, C.greenSoft.a);
    widgetSetBorderColor(btn, C.green.r, C.green.g, C.green.b, 0.35);
    widgetSetBorderWidth(btn, 1);
    return btn;
}

function stopButton(onPress: () => void): Widget {
    const btn = Button("■ Stop", onPress);
    buttonSetBordered(btn, 0);
    buttonSetTextColor(btn, C.red.r, C.red.g, C.red.b, C.red.a);
    setCornerRadius(btn, RADIUS.button);
    widgetSetEdgeInsets(btn, 4, 10, 4, 10);
    widgetSetBackgroundColor(btn, C.redSoft.r, C.redSoft.g, C.redSoft.b, 0.06);
    widgetSetBorderColor(btn, C.red.r, C.red.g, C.red.b, 0.55);
    widgetSetBorderWidth(btn, 1);
    return btn;
}

function applyPortFilters(): void {
    const filtered = filterPorts(
        allPortEntries.value,
        portSearchQuery.value,
        devOnlyMode.value,
        hideSystemMode.value,
    );
    filteredPortEntries.set(filtered);
    filteredPortCount.set(filtered.length);
    lazyvstackUpdate(portsList, filtered.length);
}

function refreshWatch(): void {
    const statuses = getWatchStatuses(allPortEntries.value);
    watchStatuses.set(statuses);
    watchCount.set(statuses.length);
    lazyvstackUpdate(watchList, statuses.length);
}

function refreshHistory(): void {
    const records = getKillHistory();
    killHistory.set(records);
    historyCount.set(getKillHistoryCount());
    lazyvstackUpdate(historyList, records.length);
}

function refreshPorts(): void {
    try {
        const entries = scanAllListeningPorts();
        allPortEntries.set(entries);

        const alerts = checkWatchAlerts(entries);
        for (let i = 0; i < alerts.length; i++) {
            try {
                notificationSend("DevDash Watch", alerts[i]);
            } catch { /* noop */ }
        }

        applyPortFilters();
        refreshWatch();
        lastUpdated.set(formatPortSummary(entries));
    } catch {
        allPortEntries.set([]);
        filteredPortEntries.set([]);
        filteredPortCount.set(0);
        lazyvstackUpdate(portsList, 0);
        lastUpdated.set("Scan failed");
    }
}

function refreshDocker(): void {
    if (!dockerReady) {
        dockerContainers.set([]);
        dockerCount.set(0);
        lazyvstackUpdate(dockerList, 0);
        lastUpdated.set("Docker unavailable");
        return;
    }
    try {
        const containers = listContainers();
        dockerContainers.set(containers);
        dockerCount.set(containers.length);
        lazyvstackUpdate(dockerList, containers.length);
        lastUpdated.set(formatDockerSummary(containers));
    } catch {
        dockerContainers.set([]);
        dockerCount.set(0);
        lazyvstackUpdate(dockerList, 0);
        lastUpdated.set("Docker scan failed");
    }
}

function refreshCompose(): void {
    if (!dockerReady) {
        composeProjects.set([]);
        composeCount.set(0);
        lazyvstackUpdate(composeList, 0);
        return;
    }
    try {
        const projects = listComposeProjects();
        composeProjects.set(projects);
        composeCount.set(projects.length);
        lazyvstackUpdate(composeList, projects.length);
        lastUpdated.set(`${projects.length} compose project(s)`);
    } catch {
        composeProjects.set([]);
        composeCount.set(0);
        lazyvstackUpdate(composeList, 0);
    }
}

function refreshAll(): void {
    refreshPorts();
    if (activeTab.value === TAB_DOCKER) refreshDocker();
    else if (activeTab.value === TAB_COMPOSE) refreshCompose();
    else if (activeTab.value === TAB_HISTORY) refreshHistory();
}

function switchTab(tab: number): void {
    activeTab.set(tab);
    if (tab === TAB_PORTS) refreshPorts();
    else if (tab === TAB_DOCKER) refreshDocker();
    else if (tab === TAB_COMPOSE) refreshCompose();
    else if (tab === TAB_WATCH) refreshWatch();
    else if (tab === TAB_HISTORY) refreshHistory();
}

function confirmKill(entry: PortEntry): void {
    alertWithButtons(
        "Kill Process",
        `Terminate "${entry.command}" (PID ${entry.pid}) on :${entry.port}?`,
        ["Cancel", "Kill 💥"],
        (index: number) => {
            if (index !== 1) return;
            try {
                if (killPortProcess(entry.pid)) {
                    addKillRecord(entry.port, entry.pid, entry.command);
                    refreshHistory();
                    refreshPorts();
                }
            } catch { /* noop */ }
        },
    );
}

function showProcessInfo(entry: PortEntry): void {
    try {
        const cmd = getProcessCommand(entry.pid);
        alert("Process Detail", `PID ${entry.pid}\nPort :${entry.port}\n\n${cmd}`);
    } catch {
        alert("Process Detail", "Failed to read process info");
    }
}

function copyText(text: string, label: string): void {
    try {
        clipboardWrite(text);
        alert("Copied", `${label} copied to clipboard`);
    } catch {
        alert("Copy failed", "Could not write to clipboard");
    }
}

function exportData(): void {
    try {
        if (activeTab.value === TAB_DOCKER || activeTab.value === TAB_COMPOSE) {
            clipboardWrite(containersToJson(dockerContainers.value));
            alert("Exported", "Docker data copied as JSON");
            return;
        }
        if (exportFormat.value === 1) {
            clipboardWrite(portsToCsv(filteredPortEntries.value));
            alert("Exported", "Ports copied as CSV");
        } else {
            clipboardWrite(portsToJson(filteredPortEntries.value));
            alert("Exported", "Ports copied as JSON");
        }
    } catch {
        alert("Export failed", "Could not export data");
    }
}

function showDockerLogs(c: DockerContainer): void {
    try {
        const logs = getContainerLogs(c.id, 50);
        alertWithButtons(`Logs — ${c.name}`, logs, ["Copy", "Close"], (idx: number) => {
            if (idx === 0) clipboardWrite(logs);
        });
    } catch {
        alert("Logs", "Failed to fetch logs");
    }
}

// ─── Lists ────────────────────────────────────────────────────────────────────

const portsList = LazyVStack(0, (i: number) => {
    const entry = filteredPortEntries.value[i];
    const starred = isFavorite(entry.port);
    return card(
        HStack(10, [
            liveDot(),
            VStack(3, [
                HStack(8, [
                    styleTitle(Text(`:${entry.port}`)),
                    styleMuted(Text(entry.command)),
                    starred ? Text("★") : Text("☆"),
                ]),
                styleCaption(Text(`PID ${entry.pid} · ${entry.address}`)),
            ]),
            Spacer(),
            HStack(6, [
                ghostBtn("Open", () => { try { openURL(portToUrl(entry)); } catch { /* noop */ } }, true),
                ghostBtn("Copy", () => copyText(`PID=${entry.pid} :${entry.port}`, "Port info")),
                ghostBtn("Info", () => showProcessInfo(entry)),
                ghostBtn(starred ? "Unpin" : "Pin", () => {
                    toggleFavorite(entry.port);
                    refreshWatch();
                }),
                killButton(() => confirmKill(entry)),
            ]),
        ]),
    );
});
lazyvstackSetRowHeight(portsList, LAYOUT.cardRowH + LAYOUT.cardGap);

const dockerList = LazyVStack(0, (i: number) => {
    const c = dockerContainers.value[i];
    const action = c.running
        ? stopButton(() => { try { if (stopContainer(c.id)) refreshDocker(); } catch { /* noop */ } })
        : startButton(() => { try { if (startContainer(c.id)) refreshDocker(); } catch { /* noop */ } });
    return card(
        HStack(10, [
            VStack(3, [
                HStack(8, [styleTitle(Text(c.name)), statusBadge(c.running ? "Up" : "Exited", c.running)]),
                styleCaption(Text(`${c.image} · ${c.ports}`)),
                styleMuted(Text(`CPU ${c.cpu ?? "—"} · MEM ${c.mem ?? "—"}`)),
            ]),
            Spacer(),
            HStack(6, [
                ghostBtn("Logs", () => showDockerLogs(c), true),
                ghostBtn("Copy", () => copyText(c.id, "Container ID")),
                action,
            ]),
        ]),
    );
});
lazyvstackSetRowHeight(dockerList, LAYOUT.cardRowH + 8);

const composeList = LazyVStack(0, (i: number) => {
    const p = composeProjects.value[i];
    return card(
        HStack(10, [
            VStack(3, [
                HStack(8, [styleTitle(Text(p.name)), statusBadge(p.running ? "Running" : "Stopped", p.running)]),
                styleCaption(Text(p.configFiles)),
                styleMuted(Text(p.status)),
            ]),
            Spacer(),
            HStack(6, [
                startButton(() => { try { if (composeUp(p.name)) refreshCompose(); } catch { /* noop */ } }),
                stopButton(() => { try { if (composeDown(p.name)) refreshCompose(); } catch { /* noop */ } }),
            ]),
        ]),
    );
});
lazyvstackSetRowHeight(composeList, LAYOUT.cardRowH + 8);

const watchList = LazyVStack(0, (i: number) => {
    const w = watchStatuses.value[i];
    const dot = w.occupied ? liveDot() : offlineDot();
    const statusText = w.occupied ? `${w.entry!.command} · PID ${w.entry!.pid}` : "Free";
    return card(
        HStack(10, [
            dot,
            VStack(3, [
                styleTitle(Text(`:${w.port}`)),
                styleCaption(Text(statusText)),
            ]),
            Spacer(),
            w.occupied && w.entry
                ? HStack(6, [
                    ghostBtn("Open", () => { try { openURL(portToUrl(w.entry!)); } catch { /* noop */ } }, true),
                    killButton(() => confirmKill(w.entry!)),
                ])
                : ghostBtn("Pin", () => { addFavoritePort(w.port); refreshWatch(); }),
        ]),
    );
});
lazyvstackSetRowHeight(watchList, LAYOUT.cardRowH);

const historyList = LazyVStack(0, (i: number) => {
    const h = killHistory.value[i];
    return card(
        HStack(10, [
            Text("💀"),
            VStack(3, [
                styleTitle(Text(`:${h.port} · ${h.command}`)),
                styleCaption(Text(`PID ${h.pid} · ${h.killedAt}`)),
            ]),
            Spacer(),
            ghostBtn("Copy", () => copyText(`kill -9 ${h.pid}`, "Kill command")),
        ]),
    );
});
lazyvstackSetRowHeight(historyList, LAYOUT.cardRowH);

function emptyState(emoji: string, title: string, subtitle: string): Widget {
    const block = VStack(10, [Text(emoji), styleTitle(Text(title)), styleCaption(Text(subtitle))]);
    stackSetAlignment(block, 1);
    widgetSetEdgeInsets(block, 0, 24, 0, 24);
    return block;
}

function sidebarItem(label: string, tab: number, icon: string): Widget {
    const selected = activeTab.value === tab;
    const btn = Button(`${icon} ${label}`, () => switchTab(tab));
    buttonSetBordered(btn, 0);
    if (selected) {
        buttonSetTextColor(btn, C.accent.r, C.accent.g, C.accent.b, C.accent.a);
        widgetSetBackgroundColor(btn, C.accentSoft.r, C.accentSoft.g, C.accentSoft.b, C.accentSoft.a);
    } else {
        buttonSetTextColor(btn, C.text.r, C.text.g, C.text.b, C.text.a);
    }
    setCornerRadius(btn, 6);
    widgetSetEdgeInsets(btn, 6, 10, 6, 10);
    return btn;
}

function buildSidebar(): Widget {
    const brand = styleTitle(Text("DevDash"));
    widgetSetEdgeInsets(brand, 16, 0, 4, 0);
    const side = VStack(4, [
        brand,
        styleMuted(Text("Local Environment")),
        Spacer(),
        sidebarItem("Ports", TAB_PORTS, "⚡"),
        sidebarItem("Docker", TAB_DOCKER, "🐳"),
        sidebarItem("Compose", TAB_COMPOSE, "📦"),
        sidebarItem("Watch", TAB_WATCH, "👁"),
        sidebarItem("History", TAB_HISTORY, "📜"),
        Spacer(),
        styleMuted(Text(`${lastUpdated.value}`)),
        styleCaption(Text("Tray · 5s refresh")),
    ]);
    paintSidebar(side);
    widgetSetWidth(side, LAYOUT.sidebarW);
    widgetSetEdgeInsets(side, 12, 10, 12, 10);
    stackSetAlignment(side, 5);
    return side;
}

function buildToolbar(): Widget {
    const search = TextField("Search port / process / PID…", (v: string) => {
        portSearchQuery.set(v);
        applyPortFilters();
    });

    const devToggle = Toggle("Dev ports", (v: boolean) => {
        devOnlyMode.set(v);
        applyPortFilters();
    });

    const sysToggle = Toggle("Hide system", (v: boolean) => {
        hideSystemMode.set(v);
        applyPortFilters();
    });

    const exportBtn = ghostBtn("Export", () => exportData(), true);
    const fmtBtn = ghostBtn(exportFormat.value === 0 ? "JSON" : "CSV", () => {
        exportFormat.set(exportFormat.value === 0 ? 1 : 0);
    });
    const refreshBtn = Button("↻", () => refreshAll());
    buttonSetBordered(refreshBtn, 0);
    buttonSetTextColor(refreshBtn, C.accent.r, C.accent.g, C.accent.b, C.accent.a);
    widgetSetBackgroundColor(refreshBtn, C.accentSoft.r, C.accentSoft.g, C.accentSoft.b, C.accentSoft.a);
    setCornerRadius(refreshBtn, RADIUS.button);

    const bar = HStack(8, [
        activeTab.value === TAB_PORTS ? search : Spacer(),
        activeTab.value === TAB_PORTS ? devToggle : Spacer(),
        activeTab.value === TAB_PORTS ? sysToggle : Spacer(),
        fmtBtn,
        exportBtn,
        refreshBtn,
    ]);
    widgetSetEdgeInsets(bar, 8, 16, 8, 16);
    return bar;
}

function buildContentHeader(): Widget {
    const titles = ["Port Manager", "Docker Manager", "Compose", "Port Watch", "Kill History"];
    const subs = [
        `${filteredPortCount.value} shown`,
        `${dockerCount.value} containers`,
        `${composeCount.value} projects`,
        `${watchCount.value} watched`,
        `${historyCount.value} records`,
    ];
    const t = activeTab.value;
    return HStack(12, [
        VStack(2, [styleTitle(Text(titles[t])), styleCaption(Text(subs[t]))]),
        Spacer(),
    ]);
}

function buildTabContent(): Widget {
    const t = activeTab.value;

    if (t === TAB_PORTS) {
        return filteredPortCount.value === 0
            ? VStack(0, [Spacer(), emptyState("✨", "표시할 포트가 없습니다", "필터를 조정하거나 서버를 실행해 보세요"), Spacer()])
            : portsList;
    }
    if (t === TAB_DOCKER) {
        if (!dockerReady) return VStack(0, [Spacer(), emptyState("🐳", "Docker unavailable", "Docker Desktop을 실행하세요"), Spacer()]);
        return dockerCount.value === 0
            ? VStack(0, [Spacer(), emptyState("📦", "컨테이너 없음", "docker run 으로 추가하세요"), Spacer()])
            : dockerList;
    }
    if (t === TAB_COMPOSE) {
        if (!dockerReady) return VStack(0, [Spacer(), emptyState("🐳", "Docker unavailable", "Docker Desktop을 실행하세요"), Spacer()]);
        return composeCount.value === 0
            ? VStack(0, [Spacer(), emptyState("📦", "Compose 프로젝트 없음", "docker compose up 으로 시작하세요"), Spacer()])
            : composeList;
    }
    if (t === TAB_WATCH) {
        return watchCount.value === 0
            ? VStack(0, [Spacer(), emptyState("👁", "감시 포트 없음", "Ports 탭에서 Pin으로 추가하세요"), Spacer()])
            : watchList;
    }
    return historyCount.value === 0
        ? VStack(0, [Spacer(), emptyState("📜", "Kill 기록 없음", "프로세스를 종료하면 여기에 기록됩니다"), Spacer()])
        : historyList;
}

function setupTray(): void {
    try {
        const tray = trayCreate("");
        traySetTooltip(tray, "DevDash — Local Environment");
        const menu = menuCreate();
        menuAddItem(menu, "Open Dashboard", () => switchTab(TAB_PORTS));
        menuAddItem(menu, "Refresh", () => refreshAll());
        menuAddSeparator(menu);
        menuAddItem(menu, "Quit", () => { try { exit(0); } catch { /* noop */ } });
        trayAttachMenu(tray, menu);
    } catch { /* tray optional */ }
}

function setupShortcuts(): void {
    addKeyboardShortcut("r", 1, () => refreshAll());
    addKeyboardShortcut("1", 1, () => switchTab(TAB_PORTS));
    addKeyboardShortcut("2", 1, () => switchTab(TAB_DOCKER));
    addKeyboardShortcut("3", 1, () => switchTab(TAB_COMPOSE));
    addKeyboardShortcut("4", 1, () => switchTab(TAB_WATCH));
    addKeyboardShortcut("5", 1, () => switchTab(TAB_HISTORY));
    addKeyboardShortcut("e", 1, () => exportData());
}

export function runDashboard(): void {
    setupShortcuts();
    setupTray();

    refreshPorts();
    refreshDocker();
    refreshCompose();
    refreshHistory();

    const mainContent = VStack(0, [
        buildContentHeader(),
        buildToolbar(),
        buildTabContent(),
    ]);
    paintBg(mainContent);

    const root = HStack(0, [buildSidebar(), mainContent]);
    paintBg(root);
    setCornerRadius(root, RADIUS.window);

    appSetTimer(5000, () => refreshAll());

    App({
        title: "DevDash",
        width: LAYOUT.windowW,
        height: LAYOUT.windowH,
        body: root,
    });
}
