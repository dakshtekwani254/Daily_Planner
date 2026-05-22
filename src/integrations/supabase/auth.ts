import { createServerFn } from "@tanstack/react-start";
import { getServerSessionCore } from "./auth.server";

export const getServerSession = createServerFn({ method: "GET" }).handler(async () => {
  return await getServerSessionCore();
});
