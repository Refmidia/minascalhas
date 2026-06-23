/**
 * Limpa o banco para um NOVO cliente (dados operacionais), mantendo estrutura e admins.
 *
 * IMPORTANTE: aponte o `.env` local para o banco NOVO — nunca o da Vercel/produção.
 *
 * Uso:
 *   node scripts/limpar-banco-novo-cliente.mjs --dry-run
 *   node scripts/limpar-banco-novo-cliente.mjs --confirm
 *   node scripts/limpar-banco-novo-cliente.mjs --confirm --admin-usuario admin --admin-senha "SuaSenha123"
 *
 * Opções:
 *   --dry-run              Só mostra o que seria feito
 *   --confirm              Obrigatório para executar de verdade
 *   --admin-usuario <login>  Cria admin se não existir nenhum (padrão: admin)
 *   --admin-senha <senha>    Senha do admin criado (obrigatório se precisar criar)
 *   --remover-admins         Apaga TODOS os usuários (inclui admins) e recria o admin
 *   --force                  Ignora bloqueio de nomes de banco de produção conhecidos
 */

import { config } from "dotenv";
import { resolve } from "path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env"), override: true });

const dryRun = process.argv.includes("--dry-run");
const confirm = process.argv.includes("--confirm");
const force = process.argv.includes("--force");
const removerAdmins = process.argv.includes("--remover-admins");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1]?.trim() : undefined;
}

const adminUsuario = argValue("--admin-usuario") || "admin";
const adminSenha = argValue("--admin-senha");

/** Bancos do projeto Alex/Vercel — bloqueados por segurança. */
const BANCOS_PROTEGIDOS = ["u101686138_alexcalhas", "alexcalhas"];

/** Ordem: filhas antes das pais (FK). Só limpa tabelas que existirem. */
const TABELAS_DADOS = [
  "fornecedor_entrega_itens",
  "fornecedor_entregas",
  "fornecedor_compras",
  "inventario_recebimento",
  "funcionario_pagamento_vale",
  "funcionario_pagamento_empreita",
  "funcionario_pagamento_semanal",
  "funcionario_ponto",
  "material_fornecedor_liberacao",
  "inventario",
  "produto_fotos",
  "produtos_site",
  "materiais",
  "admin_logs",
  "documento_nome_cache",
  "notification",
  "fornecedores",
];

function dbUrl() {
  const host = process.env.DB_HOST?.trim();
  const port = process.env.DB_PORT?.trim() || "3306";
  const user = process.env.DB_USER?.trim();
  const pass = process.env.DB_PASSWORD;
  const name = process.env.DB_NAME?.trim();
  if (host && user && pass !== undefined && pass !== "" && name) {
    return {
      url: `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${encodeURIComponent(name)}`,
      host,
      name,
      user,
    };
  }
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  return { url, host: "(DATABASE_URL)", name: "(DATABASE_URL)", user: "?" };
}

async function tabelasExistentes(prisma) {
  const rows = await prisma.$queryRawUnsafe("SHOW TABLES");
  return new Set(rows.map((r) => String(Object.values(r)[0])));
}

async function contar(prisma, tabela) {
  const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS c FROM \`${tabela}\``);
  return Number(rows[0]?.c ?? 0);
}

async function main() {
  const cfg = dbUrl();
  if (!cfg) {
    console.error("Configure DB_HOST, DB_USER, DB_PASSWORD e DB_NAME no .env (banco NOVO).");
    process.exit(1);
  }

  const dbNameLower = cfg.name.toLowerCase();
  const protegido = BANCOS_PROTEGIDOS.some(
    (b) => dbNameLower === b.toLowerCase() || dbNameLower.includes("alexcalhas"),
  );

  if (protegido && !force) {
    console.error(
      "BLOQUEADO: o DB_NAME parece ser o banco da Vercel/produção (Alex Calhas).\n" +
        `  DB_NAME atual: ${cfg.name}\n` +
        "  Aponte o .env para o banco NOVO do outro cliente.\n" +
        "  Se tiver certeza absoluta, use --force (não recomendado).",
    );
    process.exit(1);
  }

  if (!dryRun && !confirm) {
    console.error(
      "Modo seguro: use --dry-run para simular ou --confirm para executar.\n" +
        "  node scripts/limpar-banco-novo-cliente.mjs --dry-run",
    );
    process.exit(1);
  }

  const prisma = new PrismaClient({ datasources: { db: { url: cfg.url } } });

  try {
    await prisma.$connect();
    console.log(dryRun ? "[DRY-RUN] " : "", "Banco alvo:", cfg.name, `@ ${cfg.host}`);
    console.log("");

    const existentes = await tabelasExistentes(prisma);
    const limpar = TABELAS_DADOS.filter((t) => existentes.has(t));

    console.log("Tabelas a esvaziar:");
    for (const t of limpar) {
      const n = await contar(prisma, t);
      console.log(`  ${t}: ${n} registro(s)`);
    }

    const adminsAntes = existentes.has("usuarios")
      ? await prisma.$queryRawUnsafe(
          `SELECT id, usuario, nome, nivel FROM usuarios WHERE LOWER(TRIM(nivel)) = 'admin'`,
        )
      : [];

    console.log("");
    console.log(`Admins atuais: ${adminsAntes.length}`);
    for (const a of adminsAntes) {
      console.log(`  #${a.id} ${a.usuario} (${a.nome})`);
    }

    if (removerAdmins) {
      console.log("\n--remover-admins: todos os usuários serão apagados.");
    } else {
      console.log("\nUsuários não-admin serão removidos; admins mantidos.");
    }

    if (dryRun) {
      console.log("\n[DRY-RUN] Nada foi alterado.");
      return;
    }

    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");

    for (const t of limpar) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${t}\``);
      console.log(`  TRUNCATE ${t}`);
    }

    if (existentes.has("usuarios")) {
      if (removerAdmins) {
        await prisma.$executeRawUnsafe("TRUNCATE TABLE `usuarios`");
        console.log("  TRUNCATE usuarios");
      } else {
        const del = await prisma.$executeRawUnsafe(
          `DELETE FROM usuarios WHERE LOWER(TRIM(nivel)) <> 'admin'`,
        );
        console.log(`  DELETE usuarios (não-admin): ${del} linha(s)`);
      }
    }

    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");

    let adminsDepois = existentes.has("usuarios")
      ? await prisma.$queryRawUnsafe(
          `SELECT id, usuario, nome FROM usuarios WHERE LOWER(TRIM(nivel)) = 'admin'`,
        )
      : [];

    if (adminsDepois.length === 0) {
      if (!adminSenha) {
        console.error(
          "\nNenhum admin restou. Informe --admin-senha para criar o usuário inicial.",
        );
        process.exit(1);
      }
      const hash = (await bcrypt.hash(adminSenha, 10)).replace(/^\$2[ab]\$/, "$2y$");
      await prisma.$executeRawUnsafe(
        `INSERT INTO usuarios (thumb, nome, email, usuario, senha, nivel, fornecedor_id, valor_diario)
         VALUES ('default.png', 'Administrador', '', ?, ?, 'admin', NULL, 0.00)`,
        adminUsuario,
        hash,
      );
      adminsDepois = await prisma.$queryRawUnsafe(
        `SELECT id, usuario, nome FROM usuarios WHERE LOWER(TRIM(nivel)) = 'admin'`,
      );
      console.log(`\nAdmin criado: usuario="${adminUsuario}"`);
    }

    console.log("\nLimpeza concluída. Sistema pronto para o novo cliente.");
    console.log("Admins disponíveis:");
    for (const a of adminsDepois) {
      console.log(`  #${a.id} ${a.usuario} (${a.nome})`);
    }
    console.log("\nPróximos passos:");
    console.log("  1. Cadastre materiais, fornecedores e funcionários pelo painel");
    console.log("  2. node scripts/reset-senha.mjs <usuario> <senha>  (se quiser trocar senha)");
    console.log("  3. Deploy na Vercel com DB_* do NOVO banco (projeto separado)");
  } catch (e) {
    console.error("ERRO:", e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
