import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Ticket } from 'lucide-react';
import { formatPersianDateTime, formatPrice, toPersianNumber } from '@/lib/persian';

interface Event {
  id: string;
  title: string;
  artist_name: string;
  description: string | null;
  venue: string;
  event_date: string;
  image_url: string | null;
  is_active: boolean;
  ticket_tiers: Array<{
    id: string;
    name: string;
    price_usd: number;
    quantity_total: number;
    quantity_sold: number;
  }>;
}

interface EventFormData {
  title: string;
  artist_name: string;
  description: string;
  venue: string;
  event_date: string;
  image_url: string;
  is_active: boolean;
}

interface TierFormData {
  name: string;
  description: string;
  price_usd: string;
  quantity_total: string;
}

const AdminEvents = () => {
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isTierDialogOpen, setIsTierDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventFormData>({
    title: '',
    artist_name: '',
    description: '',
    venue: '',
    event_date: '',
    image_url: '',
    is_active: true,
  });
  const [tierForm, setTierForm] = useState<TierFormData>({
    name: '',
    description: '',
    price_usd: '',
    quantity_total: '',
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: events, isLoading } = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          ticket_tiers (id, name, price_usd, quantity_total, quantity_sold)
        `)
        .order('event_date', { ascending: false });

      if (error) throw error;
      return data as Event[];
    },
  });

  const eventMutation = useMutation({
    mutationFn: async (data: EventFormData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('events')
          .update({
            title: data.title,
            artist_name: data.artist_name,
            description: data.description || null,
            venue: data.venue,
            event_date: data.event_date,
            image_url: data.image_url || null,
            is_active: data.is_active,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('events').insert({
          title: data.title,
          artist_name: data.artist_name,
          description: data.description || null,
          venue: data.venue,
          event_date: data.event_date,
          image_url: data.image_url || null,
          is_active: data.is_active,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      setIsEventDialogOpen(false);
      setEditingEvent(null);
      resetEventForm();
      toast({ title: editingEvent ? 'کنسرت ویرایش شد' : 'کنسرت اضافه شد' });
    },
    onError: (error) => {
      toast({ title: 'خطا', description: String(error), variant: 'destructive' });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      toast({ title: 'کنسرت حذف شد' });
    },
  });

  const tierMutation = useMutation({
    mutationFn: async (data: TierFormData & { event_id: string }) => {
      const { error } = await supabase.from('ticket_tiers').insert({
        event_id: data.event_id,
        name: data.name,
        description: data.description || null,
        price_usd: parseFloat(data.price_usd),
        quantity_total: parseInt(data.quantity_total),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      setIsTierDialogOpen(false);
      setSelectedEventId(null);
      resetTierForm();
      toast({ title: 'نوع بلیط اضافه شد' });
    },
  });

  const deleteTierMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ticket_tiers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      toast({ title: 'نوع بلیط حذف شد' });
    },
  });

  const resetEventForm = () => {
    setEventForm({
      title: '',
      artist_name: '',
      description: '',
      venue: '',
      event_date: '',
      image_url: '',
      is_active: true,
    });
  };

  const resetTierForm = () => {
    setTierForm({
      name: '',
      description: '',
      price_usd: '',
      quantity_total: '',
    });
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      artist_name: event.artist_name,
      description: event.description || '',
      venue: event.venue,
      event_date: new Date(event.event_date).toISOString().slice(0, 16),
      image_url: event.image_url || '',
      is_active: event.is_active,
    });
    setIsEventDialogOpen(true);
  };

  const handleAddTier = (eventId: string) => {
    setSelectedEventId(eventId);
    setIsTierDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">مدیریت کنسرت‌ها</h1>
          <p className="text-muted-foreground">ایجاد و ویرایش کنسرت‌ها و بلیط‌ها</p>
        </div>

        <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-gold" onClick={() => { setEditingEvent(null); resetEventForm(); }}>
              <Plus className="ml-2 h-4 w-4" />
              کنسرت جدید
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingEvent ? 'ویرایش کنسرت' : 'کنسرت جدید'}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                eventMutation.mutate({ ...eventForm, id: editingEvent?.id });
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>عنوان</Label>
                  <Input
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>نام هنرمند</Label>
                  <Input
                    value={eventForm.artist_name}
                    onChange={(e) => setEventForm({ ...eventForm, artist_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>توضیحات</Label>
                <Textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>مکان</Label>
                  <Input
                    value={eventForm.venue}
                    onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>تاریخ و ساعت</Label>
                  <Input
                    type="datetime-local"
                    value={eventForm.event_date}
                    onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>لینک تصویر</Label>
                <Input
                  value={eventForm.image_url}
                  onChange={(e) => setEventForm({ ...eventForm, image_url: e.target.value })}
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={eventForm.is_active}
                  onCheckedChange={(checked) => setEventForm({ ...eventForm, is_active: checked })}
                />
                <Label>فعال</Label>
              </div>

              <Button type="submit" className="w-full btn-gold" disabled={eventMutation.isPending}>
                {editingEvent ? 'ذخیره تغییرات' : 'ایجاد کنسرت'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tier Dialog */}
      <Dialog open={isTierDialogOpen} onOpenChange={setIsTierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>افزودن نوع بلیط</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedEventId) {
                tierMutation.mutate({ ...tierForm, event_id: selectedEventId });
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>نام (مثال: VIP، عادی)</Label>
              <Input
                value={tierForm.name}
                onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>توضیحات</Label>
              <Input
                value={tierForm.description}
                onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>قیمت (دلار)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={tierForm.price_usd}
                  onChange={(e) => setTierForm({ ...tierForm, price_usd: e.target.value })}
                  required
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>تعداد کل</Label>
                <Input
                  type="number"
                  value={tierForm.quantity_total}
                  onChange={(e) => setTierForm({ ...tierForm, quantity_total: e.target.value })}
                  required
                  dir="ltr"
                />
              </div>
            </div>
            <Button type="submit" className="w-full btn-gold" disabled={tierMutation.isPending}>
              افزودن
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Events Table */}
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>کنسرت</TableHead>
              <TableHead>تاریخ</TableHead>
              <TableHead>بلیط‌ها</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="w-[100px]">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events?.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <div>
                    <div className="font-semibold">{event.title}</div>
                    <div className="text-sm text-muted-foreground">{event.artist_name}</div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {formatPersianDateTime(event.event_date)}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {event.ticket_tiers.map((tier) => (
                      <div key={tier.id} className="flex items-center justify-between text-sm">
                        <span>{tier.name}: {formatPrice(Number(tier.price_usd), 'USD')}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {toPersianNumber(tier.quantity_sold)}/{toPersianNumber(tier.quantity_total)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => deleteTierMutation.mutate(tier.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => handleAddTier(event.id)}
                    >
                      <Ticket className="ml-1 h-3 w-3" />
                      افزودن بلیط
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={event.is_active ? 'default' : 'secondary'}>
                    {event.is_active ? 'فعال' : 'غیرفعال'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditEvent(event)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteEventMutation.mutate(event.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminEvents;