import { execSync } from "child_process";
import type { ComposeProject, DockerContainer } from "./types";

function execOutput(cmd: string): string {
    try {
        const result = execSync(cmd);
        if (typeof result === "string") return result;
        return `${result}`;
    } catch {
        return "";
    }
}

export function isDockerAvailable(): boolean {
    try {
        execSync("docker info 2>/dev/null");
        return true;
    } catch {
        return false;
    }
}

export function listContainers(): DockerContainer[] {
    try {
        const output = execOutput(
            'docker ps -a --format "{{.ID}}\\t{{.Names}}\\t{{.Status}}\\t{{.Ports}}\\t{{.Image}}"',
        );
        const containers: DockerContainer[] = [];
        const lines = output.trim().split("\n");

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.length === 0) continue;
            const parts = line.split("\t");
            if (parts.length < 5) continue;

            const status = parts[2];
            containers.push({
                id: parts[0],
                name: parts[1],
                status,
                ports: parts[3] === "<none>" ? "—" : parts[3],
                image: parts[4],
                running: status.toLowerCase().startsWith("up"),
            });
        }

        return attachStats(containers);
    } catch {
        return [];
    }
}

function attachStats(containers: DockerContainer[]): DockerContainer[] {
    try {
        const statsOut = execOutput(
            'docker stats --no-stream --format "{{.ID}}\\t{{.CPUPerc}}\\t{{.MemUsage}}" 2>/dev/null',
        );
        const statLines = statsOut.trim().split("\n");
        const statsMap = new Map<string, { cpu: string; mem: string }>();

        for (let i = 0; i < statLines.length; i++) {
            const line = statLines[i];
            if (line.length === 0) continue;
            const parts = line.split("\t");
            if (parts.length < 3) continue;
            statsMap.set(parts[0], { cpu: parts[1], mem: parts[2] });
        }

        const result: DockerContainer[] = [];
        for (let i = 0; i < containers.length; i++) {
            const c = containers[i];
            const stat = statsMap.get(c.id);
            result.push({
                id: c.id,
                name: c.name,
                status: c.status,
                ports: c.ports,
                image: c.image,
                running: c.running,
                cpu: stat ? stat.cpu : "—",
                mem: stat ? stat.mem : "—",
            });
        }
        return result;
    } catch {
        return containers;
    }
}

export function getContainerLogs(id: string, tail: number = 50): string {
    try {
        const out = execOutput(`docker logs --tail ${tail} ${id} 2>&1`);
        if (out.trim().length === 0) return "(no logs)";
        if (out.length > 3000) return out.substring(0, 3000) + "\n…(truncated)";
        return out;
    } catch {
        return "Failed to fetch logs";
    }
}

export function startContainer(id: string): boolean {
    try {
        execSync(`docker start ${id}`);
        return true;
    } catch {
        return false;
    }
}

export function stopContainer(id: string): boolean {
    try {
        execSync(`docker stop ${id}`);
        return true;
    } catch {
        return false;
    }
}

export function listComposeProjects(): ComposeProject[] {
    try {
        const output = execOutput(
            'docker compose ls -a --format "{{.Name}}\\t{{.Status}}\\t{{.ConfigFiles}}" 2>/dev/null',
        );
        const projects: ComposeProject[] = [];
        const lines = output.trim().split("\n");

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.length === 0) continue;
            const parts = line.split("\t");
            if (parts.length < 2) continue;
            const status = parts[1];
            projects.push({
                name: parts[0],
                status,
                configFiles: parts.length >= 3 ? parts[2] : "—",
                running: status.toLowerCase().indexOf("running") >= 0,
            });
        }
        return projects;
    } catch {
        return [];
    }
}

export function composeUp(project: string): boolean {
    try {
        execSync(`docker compose -p ${project} up -d 2>/dev/null`);
        return true;
    } catch {
        return false;
    }
}

export function composeDown(project: string): boolean {
    try {
        execSync(`docker compose -p ${project} down 2>/dev/null`);
        return true;
    } catch {
        return false;
    }
}

export function formatDockerSummary(containers: DockerContainer[]): string {
    if (containers.length === 0) return "No containers found";
    let running = 0;
    for (let i = 0; i < containers.length; i++) {
        if (containers[i].running) running++;
    }
    return `${containers.length} container${containers.length === 1 ? "" : "s"} (${running} running)`;
}
