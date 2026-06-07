import { execSync } from "child_process";
import type { PortEntry } from "./types";
import { DEV_PORTS } from "./filter";

function execOutput(cmd: string): string {
    try {
        const result = execSync(cmd);
        if (typeof result === "string") return result;
        return `${result}`;
    } catch {
        return "";
    }
}

function parseLsofLine(line: string): PortEntry | null {
    const match = line.match(/^(\S+)\s+(\d+)\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+(.+)$/);
    if (!match) return null;

    const command = match[1];
    const pid = parseInt(match[2], 10);
    const name = match[3];
    const portMatch = name.match(/:(\d+)/);
    if (!portMatch) return null;

    const port = parseInt(portMatch[1], 10);
    const address = name.replace(" (LISTEN)", "");

    return { port, command, pid, address };
}

export function scanAllListeningPorts(): PortEntry[] {
    try {
        const output = execOutput("lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null");
        return parseLsofOutput(output);
    } catch {
        return [];
    }
}

export function scanPort(port: number): PortEntry[] {
    try {
        const output = execOutput(`lsof -i :${port} -P -n 2>/dev/null`);
        return parseLsofOutput(output);
    } catch {
        return [];
    }
}

export function scanDevPorts(): PortEntry[] {
    const entries: PortEntry[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < DEV_PORTS.length; i++) {
        const port = DEV_PORTS[i];
        const parsed = scanPort(port);
        for (let j = 0; j < parsed.length; j++) {
            const entry = parsed[j];
            const key = `${entry.pid}:${entry.port}`;
            if (!seen.has(key)) {
                seen.add(key);
                entries.push(entry);
            }
        }
    }

    entries.sort((a, b) => a.port - b.port);
    return entries;
}

function parseLsofOutput(output: string): PortEntry[] {
    const lines = output.trim().split("\n");
    if (lines.length <= 1) return [];

    const entries: PortEntry[] = [];
    const seen = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
        const entry = parseLsofLine(lines[i]);
        if (!entry) continue;

        const key = `${entry.pid}:${entry.port}`;
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push(entry);
    }

    entries.sort((a, b) => a.port - b.port);
    return entries;
}

export function getProcessCommand(pid: number): string {
    try {
        const out = execOutput(`ps -p ${pid} -o command= 2>/dev/null`);
        return out.trim().length > 0 ? out.trim() : "Unable to read process command";
    } catch {
        return "Unable to read process command";
    }
}

export function killPortProcess(pid: number): boolean {
    try {
        execSync(`kill -9 ${pid}`);
        return true;
    } catch {
        return false;
    }
}

export function formatPortSummary(entries: PortEntry[]): string {
    if (entries.length === 0) return "No listening ports found";
    return `${entries.length} port${entries.length === 1 ? "" : "s"} in use`;
}
