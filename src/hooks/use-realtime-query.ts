import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useRealtimeQuery<T>(
  key: readonly unknown[],
  table: string,
  fetcher: (userId: string) => Promise<T>,
) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: [...key, user?.id],
    queryFn: () => fetcher(user!.id),
    enabled: !!user,
  });

  React.useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`rt:${table}:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `user_id=eq.${user.id}` },
        () => query.refetch(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, table]);

  return query;
}
