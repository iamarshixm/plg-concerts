import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ExchangeRate {
  usd_to_tl: number;
  fetched_at: string;
}

export const useExchangeRate = () => {
  return useQuery({
    queryKey: ['exchangeRate'],
    queryFn: async (): Promise<ExchangeRate> => {
      // First try to get the latest rate from the database
      const { data: dbRate, error } = await supabase
        .from('exchange_rates')
        .select('usd_to_tl, fetched_at')
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching exchange rate:', error);
        throw error;
      }

      // If we have a recent rate (less than 1 hour old), use it
      if (dbRate) {
        const fetchedAt = new Date(dbRate.fetched_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        if (fetchedAt > oneHourAgo) {
          return {
            usd_to_tl: Number(dbRate.usd_to_tl),
            fetched_at: dbRate.fetched_at,
          };
        }
      }

      // Default fallback rate if no rate exists
      // In production, this would call an exchange rate API via edge function
      return {
        usd_to_tl: dbRate?.usd_to_tl ? Number(dbRate.usd_to_tl) : 34.5,
        fetched_at: new Date().toISOString(),
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
};
