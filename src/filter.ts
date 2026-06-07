import type { PortEntry } from "./types";

export const DEV_PORTS = [
    3000, 3001, 4000, 4173, 5000, 5173, 5432, 6379, 8000, 8080, 8443, 27017, 9000,
];

const SYSTEM_COMMANDS = new Set([
    "rapportd",
    "ControlCe",
    "ControlCenter",
    "mDNSResponder",
    "symptomsd",
    "configd",
    "launchd",
    "cursorsan",
]);

export function isSystemProcess(command: string): boolean {
    return SYSTEM_COMMANDS.has(command);
}

export function isDevPort(port: number): boolean {
    for (let i = 0; i < DEV_PORTS.length; i++) {
        if (DEV_PORTS[i] === port) return true;
    }
    return false;
}

export function filterPorts(
    entries: PortEntry[],
    query: string,
    devOnly: boolean,
    hideSystem: boolean,
): PortEntry[] {
    const q = query.trim().toLowerCase();
    const result: PortEntry[] = [];

    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (devOnly && !isDevPort(e.port)) continue;
        if (hideSystem && isSystemProcess(e.command)) continue;
        if (q.length > 0) {
            const portStr = `${e.port}`;
            const cmd = e.command.toLowerCase();
            const addr = e.address.toLowerCase();
            const pidStr = `${e.pid}`;
            if (
                portStr.indexOf(q) < 0 &&
                cmd.indexOf(q) < 0 &&
                addr.indexOf(q) < 0 &&
                pidStr.indexOf(q) < 0
            ) {
                continue;
            }
        }
        result.push(e);
    }
    return result;
}

export function portToUrl(entry: PortEntry): string {
    const host = entry.address.indexOf("127.0.0.1") >= 0 ? "127.0.0.1" : "localhost";
    return `http://${host}:${entry.port}`;
}
