import type { KillRecord } from "./types";

const MAX_HISTORY = 50;
let records: KillRecord[] = [];

export function addKillRecord(port: number, pid: number, command: string): void {
    const next: KillRecord[] = [
        {
            port,
            pid,
            command,
            killedAt: new Date().toLocaleTimeString(),
        },
        ...records,
    ];
    if (next.length > MAX_HISTORY) {
        records = next.slice(0, MAX_HISTORY);
    } else {
        records = next;
    }
}

export function getKillHistory(): KillRecord[] {
    return records;
}

export function getKillHistoryCount(): number {
    return records.length;
}
