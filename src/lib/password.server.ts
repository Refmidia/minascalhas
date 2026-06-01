/** Hash compatível com login PHP (bcrypt $2y$). */
export async function hashPasswordPhp(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash(password, 10);
  return hash.replace(/^\$2a\$/, "$2y$");
}
