import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

function loadEnvFile(path: string) {
  // Na Vercel as variáveis vêm do painel — nunca sobrescrever com arquivo local.
  config({ path, override: process.env.NODE_ENV !== "production" });
}

/** Sobe diretórios até achar `.env` ou `.env.example` (dev). */
function findAndLoadEnv(startDirs: string[]) {
  if (process.env.VERCEL) return null;
  for (const start of startDirs) {
    let dir = start;
    for (let i = 0; i < 6; i++) {
      const envFile = resolve(dir, ".env");
      if (existsSync(envFile)) {
        loadEnvFile(envFile);
        return "env";
      }
      if (process.env.NODE_ENV !== "production") {
        const exampleFile = resolve(dir, ".env.example");
        if (existsSync(exampleFile)) {
          loadEnvFile(exampleFile);
          console.warn(
            "[env] .env não encontrado — usando .env.example. Rode: copy .env.example .env",
          );
          return "example";
        }
      }
      const parent = resolve(dir, "..");
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

const here = dirname(fileURLToPath(import.meta.url));
const roots = [process.cwd(), resolve(here, "../.."), resolve(here, "../../..")];

findAndLoadEnv(roots);
