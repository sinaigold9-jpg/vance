import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TrialStatus {
  loading: boolean;
  isBeginner: boolean;
  trialEndDate: string | null;
  isTrialExpired: boolean;
  daysLeft: number;
}

/**
 * Trial: 7 days from signup for beginner (free) package.
 * When expired, subscription-only features (tasks, games, offers) should be blocked
 * and the user directed to /app/packages. Account/balance are preserved.
 */
export const useTrialStatus = (): TrialStatus => {
  const { user } = useAuth();
  const [state, setState] = useState<TrialStatus>({
    loading: true, isBeginner: false, trialEndDate: null, isTrialExpired: false, daysLeft: 0,
  });

  useEffect(() => {
    if (!user) { setState({ loading: false, isBeginner: false, trialEndDate: null, isTrialExpired: false, daysLeft: 0 }); return; }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("account_type, trial_end_date")
        .eq("id", user.id)
        .maybeSingle();
      const isBeginner = data?.account_type === "beginner";
      const end = data?.trial_end_date ? new Date(data.trial_end_date as any) : null;
      const now = new Date();
      const expired = !!(isBeginner && end && end.getTime() < now.getTime());
      const days = end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000)) : 0;
      setState({
        loading: false,
        isBeginner,
        trialEndDate: end?.toISOString() ?? null,
        isTrialExpired: expired,
        daysLeft: days,
      });
    })();
  }, [user]);

  return state;
};