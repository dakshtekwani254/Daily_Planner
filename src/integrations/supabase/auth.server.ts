import { createServerClient } from "@supabase/ssr";
import { getCookie, setCookie, getHeader } from "@tanstack/react-start/server";
import type { Database } from "./types";

export function createSupabaseServerClient() {
  const env = typeof process !== "undefined" ? process.env : (import.meta as any).env || {};
  const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase environment variables for Server Client.");
  }

  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          try {
            const cookieHeader = getHeader("cookie");
            if (!cookieHeader) return [];
            return cookieHeader.split(";").map((c) => {
              const [name, ...rest] = c.split("=");
              return { name: name.trim(), value: rest.join("=").trim() };
            }).filter((c) => c.name);
          } catch {
            return [];
          }
        },
        get(name: string) {
          try {
            return getCookie(name);
          } catch {
            return "";
          }
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              setCookie(name, value, {
                ...options,
                path: options.path || "/",
              });
            });
          } catch {
            // Ignored
          }
        },
      },
    }
  );
}

export async function getServerSessionCore() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}
