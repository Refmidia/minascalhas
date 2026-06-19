import { defineConfig, loadEnv, mergeConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

export default defineConfig(({ command, mode }) => {
  const envDefine: Record<string, string> = {};
  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
  for (const [key, value] of Object.entries(loadedEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  const tanstackStartDefaults = {
    importProtection: {
      behavior: "error" as const,
      client: {
        files: ["**/server/**"],
        specifiers: ["server-only"],
      },
    },
  };

  return {
    define: envDefine,
    css: { transformer: "lightningcss" as const },
    resolve: {
      alias: {
        "@": `${process.cwd()}/src`,
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    server: {
      host: "::",
      port: 8080,
    },
    optimizeDeps: {
      include: ["html2pdf.js", "html2canvas", "jspdf"],
    },
    plugins: [
      tailwindcss(),
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart(
        mergeConfig(tanstackStartDefaults, {
          server: { entry: "server" },
        }),
      ),
      react(),
      ...(command === "build"
        ? [
            nitro({
              preset: "vercel",
              output: {
                dir: ".vercel/output",
                serverDir: ".vercel/output/functions/__server.func",
                publicDir: ".vercel/output/static",
              },
            }),
          ]
        : []),
    ],
  };
});
