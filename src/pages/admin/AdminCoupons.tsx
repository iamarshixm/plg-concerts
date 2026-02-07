import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Plus, Copy, Trash2 } from 'lucide-react';
import { toPersianNumber, formatPersianDateTime } from '@/lib/persian';

interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  is_active: boolean;
  is_used: boolean;
  used_at: string | null;
  created_at: string;
}

const generateCouponCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const AdminCoupons = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: generateCouponCode(),
    discount_percent: '10',
    is_active: true,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Coupon[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('coupons').insert({
        code: data.code.toUpperCase(),
        discount_percent: parseInt(data.discount_percent),
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setIsDialogOpen(false);
      setFormData({
        code: generateCouponCode(),
        discount_percent: '10',
        is_active: true,
      });
      toast({ title: 'کد تخفیف ایجاد شد' });
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast({ title: 'خطا', description: 'این کد قبلاً وجود دارد', variant: 'destructive' });
      } else {
        toast({ title: 'خطا', description: String(error), variant: 'destructive' });
      }
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast({ title: 'وضعیت به‌روزرسانی شد' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast({ title: 'کد تخفیف حذف شد' });
    },
  });

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'کپی شد' });
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
          <h1 className="text-2xl font-bold">کدهای تخفیف</h1>
          <p className="text-muted-foreground">ایجاد و مدیریت کدهای تخفیف یکبار مصرف</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-gold">
              <Plus className="ml-2 h-4 w-4" />
              کد جدید
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ایجاد کد تخفیف</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(formData);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>کد تخفیف</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="font-mono"
                    dir="ltr"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData({ ...formData, code: generateCouponCode() })}
                  >
                    تصادفی
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>درصد تخفیف</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.discount_percent}
                  onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                  required
                  dir="ltr"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>فعال</Label>
              </div>

              <Button type="submit" className="w-full btn-gold" disabled={createMutation.isPending}>
                ایجاد
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Coupons Table */}
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>کد</TableHead>
              <TableHead>تخفیف</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead>استفاده شده</TableHead>
              <TableHead>تاریخ ایجاد</TableHead>
              <TableHead className="w-[100px]">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons?.map((coupon) => (
              <TableRow key={coupon.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">{coupon.code}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(coupon.code)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{toPersianNumber(coupon.discount_percent)}٪</Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={coupon.is_active}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({ id: coupon.id, is_active: checked })
                    }
                    disabled={coupon.is_used}
                  />
                </TableCell>
                <TableCell>
                  {coupon.is_used ? (
                    <Badge variant="secondary">
                      استفاده شده
                      {coupon.used_at && (
                        <span className="mr-1 text-xs">
                          ({formatPersianDateTime(coupon.used_at)})
                        </span>
                      )}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-success border-success/30">
                      موجود
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatPersianDateTime(coupon.created_at)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(coupon.id)}
                    disabled={coupon.is_used}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {coupons?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            کد تخفیفی وجود ندارد
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCoupons;