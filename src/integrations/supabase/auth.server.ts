import { createServerClient } from "@supabase/ssr";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import type { Database } from "./types";

export function createSupabaseServerClient() {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

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
            return [];
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
