import type { DockerContainer, PortEntry } from "./types";

export function portsToJson(entries: PortEntry[]): string {
    const rows: object[] = [];
    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        rows.push({
            port: e.port,
            command: e.command,
            pid: e.pid,
            address: e.address,
        });
    }
    return JSON.stringify(rows, null, 2);
}

export function portsToCsv(entries: PortEntry[]): string {
    const lines = ["port,command,pid,address"];
    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        lines.push(`${e.port},${e.command},${e.pid},"${e.address}"`);
    }
    return lines.join("\n");
}

export function containersToJson(containers: DockerContainer[]): string {
    return JSON.stringify(containers, null, 2);
}
