import { createFileRoute } from "@tanstack/react-router";

import { isAdminRequest } from "@/lib/auth.server";
import { getPrisma } from "@/lib/db.server";
import { jsonResponse } from "@/lib/http.server";

export const Route = createFileRoute("/api/admin/produtos-menu")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAdminRequest(request)) {
          return jsonResponse({ ok: false }, 401);
        }
        const prisma = await getPrisma();
        const itens = await prisma.produtoSite.findMany({
          orderBy: [{ ordem: "asc" }, { nome: "asc" }],
          select: { id: true, nome: true },
        });
        return jsonResponse({ ok: true, itens });
      },
    },
  },
});
