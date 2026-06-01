export const JSON_HEADERS = {
  "Content-Type": "application/json",
} as const;

/** Converte BigInt/Decimal do Prisma para tipos serializáveis em JSON. */
export function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  if (
    value !== null &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber: () => number }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return value;
}

export function jsonResponse(data: unknown, status = 200, extraHeaders?: HeadersInit) {
  return new Response(JSON.stringify(data, jsonReplacer), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

export const PUBLIC_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;
