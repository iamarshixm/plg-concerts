import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EventCard } from './EventCard';
import { Skeleton } from '@/components/ui/skeleton';

interface Event {
  id: string;
  title: string;
  artist_name: string;
  venue: string;
  event_date: string;
  image_url: string | null;
  ticket_tiers: { price_usd: number }[];
}

export const EventList = () => {
  const { data: events, isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          artist_name,
          venue,
          event_date,
          image_url,
          ticket_tiers (price_usd)
        `)
        .eq('is_active', true)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true });

      if (error) throw error;
      return data as Event[];
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="aspect-[16/10] rounded-2xl" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">خطا در بارگذاری کنسرت‌ها</p>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="text-6xl">🎵</div>
        <h3 className="text-xl font-semibold">کنسرتی در دسترس نیست</h3>
        <p className="text-muted-foreground">
          به زودی کنسرت‌های جدید اضافه خواهند شد
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => {
        const minPrice = event.ticket_tiers.length > 0
          ? Math.min(...event.ticket_tiers.map((t) => Number(t.price_usd)))
          : undefined;

        return (
          <EventCard
            key={event.id}
            id={event.id}
            title={event.title}
            artistName={event.artist_name}
            venue={event.venue}
            eventDate={event.event_date}
            imageUrl={event.image_url || undefined}
            minPrice={minPrice}
          />
        );
      })}
    </div>
  );
};
