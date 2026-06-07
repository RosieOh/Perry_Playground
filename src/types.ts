export interface PortEntry {
    port: number;
    command: string;
    pid: number;
    address: string;
    commandLine?: string;
}

export interface DockerContainer {
    id: string;
    name: string;
    status: string;
    ports: string;
    image: string;
    running: boolean;
    cpu?: string;
    mem?: string;
}

export interface ComposeProject {
    name: string;
    status: string;
    configFiles: string;
    running: boolean;
}

export interface KillRecord {
    port: number;
    pid: number;
    command: string;
    killedAt: string;
}

export interface WatchPortStatus {
    port: number;
    occupied: boolean;
    entry?: PortEntry;
}
