import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getHousehold = createServerFn({ method: "GET" }).handler(async () => {
  const { readHouseholdSummary } = await import("./household.server");
  return readHouseholdSummary();
});

export const joinHousehold = createServerFn({ method: "POST" })
  .inputValidator(z.object({ inviteCode: z.string().min(4) }))
  .handler(async ({ data }) => {
    const { joinHouseholdByInviteCode } = await import("./household.server");
    const { requireUser } = await import("./session.server");
    const user = await requireUser();
    return joinHouseholdByInviteCode(user.id, data.inviteCode);
  });
