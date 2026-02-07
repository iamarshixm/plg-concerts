import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Ticket, Users, Minus, Plus, ArrowLeft } from 'lucide-react';
import { formatPersianDateTime, formatPrice, toPersianNumber } from '@/lib/persian';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { cn } from '@/lib/utils';

interface TicketTier {
  id: string;
  name: string;
  description: string | null;
  price_usd: number;
  quantity_total: number;
  quantity_sold: number;
}

interface Event {
  id: string;
  title: string;
  artist_name: string;
  description: string | null;
  venue: string;
  event_date: string;
  image_url: string | null;
  ticket_tiers: TicketTier[];
}

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  const { data: exchangeRate } = useExchangeRate();

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          artist_name,
          description,
          venue,
          event_date,
          image_url,
          ticket_tiers (
            id,
            name,
            description,
            price_usd,
            quantity_total,
            quantity_sold
          )
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data as Event;
    },
    enabled: !!id,
  });

  const selectedTierData = event?.ticket_tiers.find((t) => t.id === selectedTier);
  const availableQuantity = selectedTierData 
    ? selectedTierData.quantity_total - selectedTierData.quantity_sold 
    : 0;

  const handleProceedToCheckout = () => {
    if (!selectedTier) return;
    navigate(`/checkout/${id}?tier=${selectedTier}&qty=${quantity}`);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="aspect-[21/9] rounded-2xl mb-8" />
          <Skeleton className="h-10 w-1/2 mb-4" />
          <Skeleton className="h-6 w-1/3" />
        </div>
      </MainLayout>
    );
  }

  if (error || !event) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">کنسرت یافت نشد</h2>
          <Button onClick={() => navigate('/')}>بازگشت به صفحه اصلی</Button>
        </div>
      </MainLayout>
    );
  }

  const defaultImage = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80';

  return (
    <MainLayout>
      {/* Hero Image */}
      <div className="relative aspect-[21/9] md:aspect-[3/1] overflow-hidden">
        <img
          src={event.image_url || defaultImage}
          alt={event.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        
        <div className="absolute bottom-0 right-0 left-0 container pb-8">
          <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
            زنده
          </Badge>
          <h1 className="text-3xl font-bold md:text-4xl lg:text-5xl mb-2">
            {event.title}
          </h1>
          <p className="text-2xl text-gradient font-semibold">
            {event.artist_name}
          </p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Event Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Details */}
            <div className="glass-card space-y-4">
              <h2 className="text-xl font-semibold">جزئیات کنسرت</h2>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">تاریخ و ساعت</div>
                    <div className="font-medium">{formatPersianDateTime(event.event_date)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">مکان</div>
                    <div className="font-medium">{event.venue}</div>
                  </div>
                </div>
              </div>

              {event.description && (
                <div className="pt-4 border-t border-border/50">
                  <p className="text-muted-foreground leading-relaxed">
                    {event.description}
                  </p>
                </div>
              )}
            </div>

            {/* Ticket Tiers */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                انتخاب نوع بلیط
              </h2>

              <div className="grid gap-4">
                {event.ticket_tiers.map((tier) => {
                  const available = tier.quantity_total - tier.quantity_sold;
                  const isAvailable = available > 0;
                  const isSelected = selectedTier === tier.id;
                  const priceTL = exchangeRate 
                    ? Number(tier.price_usd) * exchangeRate.usd_to_tl 
                    : 0;

                  return (
                    <button
                      key={tier.id}
                      onClick={() => isAvailable && setSelectedTier(tier.id)}
                      disabled={!isAvailable}
                      className={cn(
                        "glass-card text-right transition-all duration-300",
                        isSelected && "ring-2 ring-primary border-primary",
                        !isAvailable && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{tier.name}</h3>
                            {!isAvailable && (
                              <Badge variant="destructive">تمام شد</Badge>
                            )}
                          </div>
                          {tier.description && (
                            <p className="text-sm text-muted-foreground">
                              {tier.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{toPersianNumber(available)} بلیط موجود</span>
                          </div>
                        </div>

                        <div className="text-left">
                          <div className="text-xl font-bold text-primary">
                            {formatPrice(Number(tier.price_usd), 'USD')}
                          </div>
                          {exchangeRate && (
                            <div className="text-sm text-muted-foreground">
                              ≈ {formatPrice(priceTL, 'TL')}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Checkout Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 glass-card space-y-6">
              <h3 className="text-lg font-semibold">سبد خرید</h3>

              {selectedTierData ? (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">نوع بلیط</span>
                      <span className="font-medium">{selectedTierData.name}</span>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">تعداد</span>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-semibold">
                          {toPersianNumber(quantity)}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setQuantity(Math.min(availableQuantity, quantity + 1))}
                          disabled={quantity >= availableQuantity}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="border-t border-border/50 pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">قیمت واحد</span>
                        <span>{formatPrice(Number(selectedTierData.price_usd), 'USD')}</span>
                      </div>
                      <div className="flex items-center justify-between text-lg font-bold">
                        <span>جمع کل</span>
                        <span className="text-primary">
                          {formatPrice(Number(selectedTierData.price_usd) * quantity, 'USD')}
                        </span>
                      </div>
                      {exchangeRate && (
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>معادل لیر</span>
                          <span>
                            ≈ {formatPrice(Number(selectedTierData.price_usd) * quantity * exchangeRate.usd_to_tl, 'TL')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button 
                    className="w-full btn-gold" 
                    size="lg"
                    onClick={handleProceedToCheckout}
                  >
                    ادامه خرید
                    <ArrowLeft className="mr-2 h-4 w-4" />
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Ticket className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>لطفاً نوع بلیط را انتخاب کنید</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default EventDetail;