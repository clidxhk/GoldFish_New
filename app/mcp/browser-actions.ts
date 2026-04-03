import { getClientConfig } from "../config/client";
import type {
  ListToolsResponse,
  McpConfigData,
  McpRequestMessage,
  ServerConfig,
  ServerStatusResponse,
} from "./types";

function isExportBuild() {
  return getClientConfig()?.buildMode === "export";
}

async function loadActions() {
  const dynamicImport = new Function("path", "return import(path);") as (
    path: string,
  ) => Promise<typeof import("./actions")>;
  return dynamicImport("./actions");
}

export async function isMcpEnabled() {
  if (isExportBuild()) return false;
  return (await loadActions()).isMcpEnabled();
}

export async function initializeMcpSystem() {
  if (isExportBuild()) return undefined;
  return (await loadActions()).initializeMcpSystem();
}

export async function getClientsStatus(): Promise<
  Record<string, ServerStatusResponse>
> {
  if (isExportBuild()) return {};
  return (await loadActions()).getClientsStatus();
}

export async function getClientTools(clientId: string) {
  if (isExportBuild()) return null as ListToolsResponse["tools"] | null;
  return (await loadActions()).getClientTools(clientId);
}

export async function getAvailableClientsCount() {
  if (isExportBuild()) return 0;
  return (await loadActions()).getAvailableClientsCount();
}

export async function getAllTools() {
  if (isExportBuild()) return [];
  return (await loadActions()).getAllTools();
}

export async function getMcpConfigFromFile(): Promise<McpConfigData> {
  if (isExportBuild()) {
    return { mcpServers: {} };
  }
  return (await loadActions()).getMcpConfigFromFile();
}

export async function addMcpServer(clientId: string, config: ServerConfig) {
  if (isExportBuild()) {
    throw new Error("MCP is unavailable in export build");
  }
  return (await loadActions()).addMcpServer(clientId, config);
}

export async function pauseMcpServer(clientId: string) {
  if (isExportBuild()) {
    throw new Error("MCP is unavailable in export build");
  }
  return (await loadActions()).pauseMcpServer(clientId);
}

export async function restartAllClients() {
  if (isExportBuild()) {
    throw new Error("MCP is unavailable in export build");
  }
  return (await loadActions()).restartAllClients();
}

export async function resumeMcpServer(clientId: string): Promise<void> {
  if (isExportBuild()) {
    throw new Error("MCP is unavailable in export build");
  }
  return (await loadActions()).resumeMcpServer(clientId);
}

export async function executeMcpAction(
  clientId: string,
  request: McpRequestMessage,
) {
  if (isExportBuild()) {
    throw new Error("MCP is unavailable in export build");
  }
  return (await loadActions()).executeMcpAction(clientId, request);
}
