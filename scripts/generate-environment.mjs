import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultApiBaseUrl = 'https://back-2-hazel.vercel.app/api';
const apiBaseUrl = (process.env.NG_APP_API_BASE_URL || process.env.API_BASE_URL || defaultApiBaseUrl).trim();
const apiDiagnosticsEnabled = /^(1|true|yes|on)$/i.test(process.env.NG_APP_API_DIAGNOSTICS ?? 'false');

if (!apiBaseUrl) {
  throw new Error('NG_APP_API_BASE_URL no puede estar vacia.');
}

const normalizedApiBaseUrl = apiBaseUrl.replace(/\/$/, '');
const environmentFileContent = `export const environment = {\n  apiBaseUrl: '${normalizedApiBaseUrl}',\n  apiDiagnosticsEnabled: ${apiDiagnosticsEnabled}\n} as const;\n`;

const currentFilePath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(currentFilePath), '..');
const environmentsDirectory = path.join(projectRoot, 'src', 'environments');
const productionEnvironmentFile = path.join(environmentsDirectory, 'environment.production.ts');

await mkdir(environmentsDirectory, { recursive: true });
await writeFile(productionEnvironmentFile, environmentFileContent, 'utf8');

console.log(`environment.production.ts generado con apiBaseUrl=${normalizedApiBaseUrl} y apiDiagnosticsEnabled=${apiDiagnosticsEnabled}`);