import { createServerFn } from "@tanstack/react-start";

export const getUsdBrlRateFn = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchUsdBrlRate } = await import("./exchange-rate.server");
  return fetchUsdBrlRate();
});
