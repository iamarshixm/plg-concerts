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
import { Plus, Pencil, Trash2, Copy } from 'lucide-react';

interface Bank {
  id: string;
  bank_name: string;
  account_holder_name: string;
  iban: string;
  is_active: boolean;
  created_at: string;
}

const AdminBanks = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [formData, setFormData] = useState({
    bank_name: '',
    account_holder_name: '',
    iban: '',
    is_active: true,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: banks, isLoading } = useQuery({
    queryKey: ['admin-banks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Bank[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('banks')
          .update({
            bank_name: data.bank_name,
            account_holder_name: data.account_holder_name,
            iban: data.iban,
            is_active: data.is_active,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('banks').insert({
          bank_name: data.bank_name,
          account_holder_name: data.account_holder_name,
          iban: data.iban,
          is_active: data.is_active,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banks'] });
      setIsDialogOpen(false);
      setEditingBank(null);
      resetForm();
      toast({ title: editingBank ? 'حساب ویرایش شد' : 'حساب اضافه شد' });
    },
    onError: (error) => {
      toast({ title: 'خطا', description: String(error), variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('banks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banks'] });
      toast({ title: 'حساب حذف شد' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('banks')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banks'] });
      toast({ title: 'وضعیت به‌روزرسانی شد' });
    },
  });

  const resetForm = () => {
    setFormData({
      bank_name: '',
      account_holder_name: '',
      iban: '',
      is_active: true,
    });
  };

  const handleEdit = (bank: Bank) => {
    setEditingBank(bank);
    setFormData({
      bank_name: bank.bank_name,
      account_holder_name: bank.account_holder_name,
      iban: bank.iban,
      is_active: bank.is_active,
    });
    setIsDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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
          <h1 className="text-2xl font-bold">حساب‌های بانکی</h1>
          <p className="text-muted-foreground">مدیریت حساب‌های دریافت وجه</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="btn-gold"
              onClick={() => {
                setEditingBank(null);
                resetForm();
              }}
            >
              <Plus className="ml-2 h-4 w-4" />
              حساب جدید
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBank ? 'ویرایش حساب' : 'حساب جدید'}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate({ ...formData, id: editingBank?.id });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>نام بانک</Label>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="مثال: Ziraat Bankası"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>نام صاحب حساب</Label>
                <Input
                  value={formData.account_holder_name}
                  onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>IBAN</Label>
                <Input
                  value={formData.iban}
                  onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                  placeholder="TR..."
                  className="font-mono"
                  dir="ltr"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>فعال (نمایش به کاربران)</Label>
              </div>

              <Button type="submit" className="w-full btn-gold" disabled={saveMutation.isPending}>
                {editingBank ? 'ذخیره تغییرات' : 'افزودن'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Banks Table */}
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>بانک</TableHead>
              <TableHead>صاحب حساب</TableHead>
              <TableHead>IBAN</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="w-[100px]">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks?.map((bank) => (
              <TableRow key={bank.id}>
                <TableCell className="font-medium">{bank.bank_name}</TableCell>
                <TableCell>{bank.account_holder_name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm" dir="ltr">{bank.iban}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(bank.iban)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={bank.is_active}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({ id: bank.id, is_active: checked })
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(bank)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(bank.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {banks?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            حساب بانکی وجود ندارد
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBanks;