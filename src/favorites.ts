import { DEV_PORTS } from "./filter";
import type { PortEntry } from "./types";

let favorites: number[] = DEV_PORTS.slice();
let lastOccupied = new Set<number>();

export function getFavoritePorts(): number[] {
    return favorites.slice();
}

export function isFavorite(port: number): boolean {
    for (let i = 0; i < favorites.length; i++) {
        if (favorites[i] === port) return true;
    }
    return false;
}

export function toggleFavorite(port: number): boolean {
    if (isFavorite(port)) {
        const next: number[] = [];
        for (let i = 0; i < favorites.length; i++) {
            if (favorites[i] !== port) next.push(favorites[i]);
        }
        favorites = next;
        return false;
    }
    favorites = [...favorites, port];
    favorites.sort((a, b) => a - b);
    return true;
}

export function addFavoritePort(port: number): void {
    if (!isFavorite(port)) {
        favorites = [...favorites, port];
        favorites.sort((a, b) => a - b);
    }
}

/** Returns alert messages for newly occupied favorite ports. */
export function checkWatchAlerts(allEntries: PortEntry[]): string[] {
    const occupied = new Set<number>();
    for (let i = 0; i < allEntries.length; i++) {
        occupied.add(allEntries[i].port);
    }

    const alerts: string[] = [];
    for (let i = 0; i < favorites.length; i++) {
        const port = favorites[i];
        const wasOccupied = lastOccupied.has(port);
        const nowOccupied = occupied.has(port);
        if (nowOccupied && !wasOccupied) {
            let cmd = "unknown";
            for (let j = 0; j < allEntries.length; j++) {
                if (allEntries[j].port === port) {
                    cmd = allEntries[j].command;
                    break;
                }
            }
            alerts.push(`Port :${port} is now in use by ${cmd}`);
        }
    }

    lastOccupied = occupied;
    return alerts;
}

export function getWatchStatuses(allEntries: PortEntry[]): { port: number; occupied: boolean; entry?: PortEntry }[] {
    const byPort = new Map<number, PortEntry>();
    for (let i = 0; i < allEntries.length; i++) {
        byPort.set(allEntries[i].port, allEntries[i]);
    }
    const result: { port: number; occupied: boolean; entry?: PortEntry }[] = [];
    for (let i = 0; i < favorites.length; i++) {
        const port = favorites[i];
        const entry = byPort.get(port);
        result.push({ port, occupied: entry !== undefined, entry });
    }
    return result;
}
