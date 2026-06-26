/** Controle de imagem padrão do catálogo via SQL bruto (compatível sem prisma generate). */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaSql = any;

let colunaVerificada = false;

async function garantirColunaSemImagemPadrao(prisma: PrismaSql): Promise<void> {
  if (colunaVerificada) return;
  const rows = (await prisma.$queryRawUnsafe(
  `SELECT COUNT(*) AS n
   FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'produtos_site'
     AND COLUMN_NAME = 'sem_imagem_padrao'`,
  )) as { n: bigint | number }[];

  const existe = Number(rows[0]?.n ?? 0) > 0;
  if (!existe) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE produtos_site
       ADD COLUMN sem_imagem_padrao TINYINT NOT NULL DEFAULT 0
       AFTER ordem`,
    );
  }
  colunaVerificada = true;
}

export async function produtoSemImagemPadrao(
  prisma: PrismaSql,
  produtoId: number,
): Promise<boolean> {
  try {
    await garantirColunaSemImagemPadrao(prisma);
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT sem_imagem_padrao AS flag
       FROM produtos_site
       WHERE id = ?
       LIMIT 1`,
      produtoId,
    )) as { flag: number }[];
    return rows[0]?.flag === 1;
  } catch {
    return false;
  }
}

export async function ocultarImagemPadraoProduto(
  prisma: PrismaSql,
  produtoId: number,
): Promise<void> {
  await garantirColunaSemImagemPadrao(prisma);
  await prisma.$executeRawUnsafe(
    `UPDATE produtos_site SET sem_imagem_padrao = 1 WHERE id = ?`,
    produtoId,
  );
}

export async function ocultarImagemPadraoTodos(prisma: PrismaSql): Promise<void> {
  await garantirColunaSemImagemPadrao(prisma);
  await prisma.$executeRawUnsafe(`UPDATE produtos_site SET sem_imagem_padrao = 1`);
}
