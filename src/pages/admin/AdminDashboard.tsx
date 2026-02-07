import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, ShoppingCart, DollarSign, Users } from 'lucide-react';
import { toPersianNumber, formatPrice } from '@/lib/persian';

const AdminDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Get events count
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get orders stats
      const { data: orders } = await supabase
        .from('orders')
        .select('price_usd, status');

      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
      const totalRevenue = orders
        ?.filter(o => o.status === 'approved')
        .reduce((sum, o) => sum + Number(o.price_usd), 0) || 0;

      return {
        eventsCount: eventsCount || 0,
        totalOrders,
        pendingOrders,
        totalRevenue,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'کنسرت‌های فعال',
      value: toPersianNumber(stats?.eventsCount || 0),
      icon: Calendar,
      color: 'text-primary',
    },
    {
      title: 'کل سفارشات',
      value: toPersianNumber(stats?.totalOrders || 0),
      icon: ShoppingCart,
      color: 'text-blue-500',
    },
    {
      title: 'سفارشات در انتظار',
      value: toPersianNumber(stats?.pendingOrders || 0),
      icon: Users,
      color: 'text-warning',
    },
    {
      title: 'درآمد کل',
      value: formatPrice(stats?.totalRevenue || 0, 'USD'),
      icon: DollarSign,
      color: 'text-success',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">داشبورد</h1>
        <p className="text-muted-foreground">خلاصه وضعیت سیستم</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;