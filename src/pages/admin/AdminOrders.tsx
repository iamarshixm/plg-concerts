import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, Check, X, Clock, ExternalLink } from 'lucide-react';
import { formatPersianDateTime, formatPrice, toPersianNumber, orderStatusLabels } from '@/lib/persian';

interface Order {
  id: string;
  buyer_email: string;
  buyer_name: string;
  buyer_surname: string;
  quantity: number;
  price_usd: number;
  price_tl: number;
  exchange_rate_used: number;
  discount_applied: number;
  receipt_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  events: {
    title: string;
    artist_name: string;
  };
  ticket_tiers: {
    name: string;
  };
  banks: {
    bank_name: string;
    iban: string;
  };
  order_attendees: Array<{ full_name: string }>;
}

const statusColors = {
  pending: 'bg-warning/20 text-warning border-warning/30',
  approved: 'bg-success/20 text-success border-success/30',
  rejected: 'bg-destructive/20 text-destructive border-destructive/30',
};

const statusIcons = {
  pending: Clock,
  approved: Check,
  rejected: X,
};

const AdminOrders = () => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          events (title, artist_name),
          ticket_tiers (name),
          banks (bank_name, iban),
          order_attendees (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'pending' | 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({ title: 'وضعیت سفارش به‌روزرسانی شد' });
    },
  });

  const getReceiptUrl = (path: string) => {
    const { data } = supabase.storage.from('receipts').getPublicUrl(path);
    return data.publicUrl;
  };

  const filteredOrders = orders?.filter((order) => {
    if (statusFilter === 'all') return true;
    return order.status === statusFilter;
  });

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
          <h1 className="text-2xl font-bold">مدیریت سفارشات</h1>
          <p className="text-muted-foreground">بررسی و تایید سفارشات</p>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="فیلتر وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه</SelectItem>
            <SelectItem value="pending">در انتظار</SelectItem>
            <SelectItem value="approved">تایید شده</SelectItem>
            <SelectItem value="rejected">رد شده</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>جزئیات سفارش</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="font-semibold text-muted-foreground">اطلاعات خریدار</h3>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-muted-foreground">نام: </span>
                      {selectedOrder.buyer_name} {selectedOrder.buyer_surname}
                    </div>
                    <div>
                      <span className="text-muted-foreground">ایمیل: </span>
                      <span dir="ltr">{selectedOrder.buyer_email}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-muted-foreground">اطلاعات کنسرت</h3>
                  <div className="space-y-1 text-sm">
                    <div>{selectedOrder.events.title}</div>
                    <div className="text-muted-foreground">
                      {selectedOrder.ticket_tiers.name} - {toPersianNumber(selectedOrder.quantity)} بلیط
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-muted-foreground">اطلاعات پرداخت</h3>
                <div className="grid gap-2 text-sm bg-secondary/50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">قیمت (دلار)</span>
                    <span>{formatPrice(Number(selectedOrder.price_usd), 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">نرخ تبدیل</span>
                    <span dir="ltr">1 USD = {Number(selectedOrder.exchange_rate_used).toFixed(2)} TL</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>قیمت (لیر)</span>
                    <span>{formatPrice(Number(selectedOrder.price_tl), 'TL')}</span>
                  </div>
                  {selectedOrder.discount_applied > 0 && (
                    <div className="flex justify-between text-success">
                      <span>تخفیف</span>
                      <span>{toPersianNumber(selectedOrder.discount_applied)}٪</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-muted-foreground">بانک مقصد</h3>
                <div className="text-sm">
                  <div>{selectedOrder.banks.bank_name}</div>
                  <div className="text-muted-foreground font-mono" dir="ltr">
                    {selectedOrder.banks.iban}
                  </div>
                </div>
              </div>

              {selectedOrder.order_attendees.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-muted-foreground">همراهان</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedOrder.order_attendees.map((attendee, i) => (
                      <Badge key={i} variant="outline">{attendee.full_name}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedOrder.receipt_url && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-muted-foreground">رسید پرداخت</h3>
                  <a
                    href={getReceiptUrl(selectedOrder.receipt_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    مشاهده رسید
                  </a>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => {
                    updateStatusMutation.mutate({ id: selectedOrder.id, status: 'rejected' });
                    setSelectedOrder(null);
                  }}
                >
                  <X className="ml-2 h-4 w-4" />
                  رد کردن
                </Button>
                <Button
                  className="flex-1 btn-gold"
                  onClick={() => {
                    updateStatusMutation.mutate({ id: selectedOrder.id, status: 'approved' });
                    setSelectedOrder(null);
                  }}
                >
                  <Check className="ml-2 h-4 w-4" />
                  تایید
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Orders Table */}
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>تاریخ</TableHead>
              <TableHead>خریدار</TableHead>
              <TableHead>کنسرت</TableHead>
              <TableHead>مبلغ</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="w-[80px]">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders?.map((order) => {
              const StatusIcon = statusIcons[order.status];
              return (
                <TableRow key={order.id}>
                  <TableCell className="text-sm">
                    {formatPersianDateTime(order.created_at)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {order.buyer_name} {order.buyer_surname}
                      </div>
                      <div className="text-sm text-muted-foreground" dir="ltr">
                        {order.buyer_email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div>{order.events.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {order.ticket_tiers.name} × {toPersianNumber(order.quantity)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div>{formatPrice(Number(order.price_usd), 'USD')}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatPrice(Number(order.price_tl), 'TL')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[order.status]}>
                      <StatusIcon className="ml-1 h-3 w-3" />
                      {orderStatusLabels[order.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {filteredOrders?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            سفارشی یافت نشد
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;