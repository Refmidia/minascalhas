import { createServerFn } from "@tanstack/react-start";

import { loadHomeLandingData } from "@/lib/home-landing.server";

export const getHomeLandingData = createServerFn({ method: "GET" }).handler(async () => loadHomeLandingData());
