import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { formatPrice, toPersianNumber } from '@/lib/persian';
import { 
  Upload, 
  Plus, 
  X, 
  CreditCard, 
  User, 
  Mail, 
  Tag,
  CheckCircle,
  Copy,
  AlertCircle
} from 'lucide-react';
import { z } from 'zod';

const checkoutSchema = z.object({
  email: z.string().email('ایمیل نامعتبر است'),
  buyerName: z.string().min(2, 'نام باید حداقل ۲ کاراکتر باشد'),
  buyerSurname: z.string().min(2, 'نام خانوادگی باید حداقل ۲ کاراکتر باشد'),
});

interface Bank {
  id: string;
  bank_name: string;
  account_holder_name: string;
  iban: string;
}

const Checkout = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: exchangeRate } = useExchangeRate();

  const tierId = searchParams.get('tier');
  const qty = parseInt(searchParams.get('qty') || '1');

  const [formData, setFormData] = useState({
    email: '',
    buyerName: '',
    buyerSurname: '',
    couponCode: '',
  });
  const [attendees, setAttendees] = useState<string[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [couponValid, setCouponValid] = useState<boolean | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Fetch event and tier data
  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['checkout-event', eventId, tierId],
    queryFn: async () => {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, title, artist_name, event_date, venue')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      const { data: tier, error: tierError } = await supabase
        .from('ticket_tiers')
        .select('id, name, price_usd')
        .eq('id', tierId)
        .single();

      if (tierError) throw tierError;

      return { event, tier };
    },
    enabled: !!eventId && !!tierId,
  });

  // Fetch active banks
  const { data: banks } = useQuery({
    queryKey: ['active-banks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data as Bank[];
    },
  });

  const selectedBank = banks?.[0]; // Use first active bank

  const priceUSD = eventData?.tier ? Number(eventData.tier.price_usd) * qty : 0;
  const discountAmount = priceUSD * (couponDiscount / 100);
  const finalPriceUSD = priceUSD - discountAmount;
  const finalPriceTL = exchangeRate ? finalPriceUSD * exchangeRate.usd_to_tl : 0;

  const validateCoupon = async () => {
    if (!formData.couponCode.trim()) {
      setCouponValid(null);
      setCouponDiscount(0);
      return;
    }

    const { data, error } = await supabase
      .from('coupons')
      .select('discount_percent, is_used')
      .eq('code', formData.couponCode.trim().toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data || data.is_used) {
      setCouponValid(false);
      setCouponDiscount(0);
    } else {
      setCouponValid(true);
      setCouponDiscount(data.discount_percent);
    }
  };

  const handleSubmit = async () => {
    // Validate form
    try {
      checkoutSchema.parse({
        email: formData.email,
        buyerName: formData.buyerName,
        buyerSurname: formData.buyerSurname,
      });
      setErrors({});
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    if (!receiptFile) {
      toast({
        title: 'خطا',
        description: 'لطفاً رسید پرداخت را آپلود کنید',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedBank) {
      toast({
        title: 'خطا',
        description: 'اطلاعات بانکی در دسترس نیست',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload receipt
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

      // Get coupon ID if valid
      let couponId = null;
      if (couponValid && formData.couponCode) {
        const { data: coupon } = await supabase
          .from('coupons')
          .select('id')
          .eq('code', formData.couponCode.trim().toUpperCase())
          .single();
        couponId = coupon?.id;
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          event_id: eventId,
          ticket_tier_id: tierId,
          buyer_email: formData.email,
          buyer_name: formData.buyerName,
          buyer_surname: formData.buyerSurname,
          quantity: qty,
          price_usd: finalPriceUSD,
          price_tl: finalPriceTL,
          exchange_rate_used: exchangeRate?.usd_to_tl || 0,
          coupon_id: couponId,
          discount_applied: couponDiscount,
          bank_id: selectedBank.id,
          receipt_url: fileName,
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Add attendees
      if (attendees.length > 0) {
        const attendeeRecords = attendees
          .filter((name) => name.trim())
          .map((name) => ({
            order_id: order.id,
            full_name: name.trim(),
          }));

        if (attendeeRecords.length > 0) {
          await supabase.from('order_attendees').insert(attendeeRecords);
        }
      }

      // Mark coupon as used
      if (couponId) {
        await supabase
          .from('coupons')
          .update({ is_used: true, used_at: new Date().toISOString(), used_by_order_id: order.id })
          .eq('id', couponId);
      }

      // Send Telegram notification (fire and forget)
      supabase.functions.invoke('telegram-notify', {
        body: { order_id: order.id },
      }).catch((err) => {
        console.error('Failed to send Telegram notification:', err);
      });

      setOrderSuccess(true);
    } catch (err) {
      console.error('Error creating order:', err);
      toast({
        title: 'خطا',
        description: 'مشکلی در ثبت سفارش پیش آمد. لطفاً دوباره تلاش کنید.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'کپی شد',
      description: 'اطلاعات در کلیپ‌بورد کپی شد',
    });
  };

  if (eventLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-10 w-1/2 mb-4" />
          <Skeleton className="h-64" />
        </div>
      </MainLayout>
    );
  }

  if (!eventData) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">اطلاعات یافت نشد</h2>
          <Button onClick={() => navigate('/')}>بازگشت به صفحه اصلی</Button>
        </div>
      </MainLayout>
    );
  }

  if (orderSuccess) {
    return (
      <MainLayout>
        <div className="container py-16">
          <div className="max-w-lg mx-auto text-center space-y-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/20 mx-auto">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold">سفارش با موفقیت ثبت شد!</h1>
            <p className="text-muted-foreground">
              سفارش شما در انتظار بررسی است. پس از تایید پرداخت، بلیط برای شما ارسال خواهد شد.
            </p>
            <Button onClick={() => navigate('/')} className="btn-gold">
              بازگشت به صفحه اصلی
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-2">تکمیل خرید</h1>
        <p className="text-muted-foreground mb-8">
          {eventData.event.title} - {eventData.tier.name}
        </p>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Buyer Info */}
            <div className="glass-card space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                اطلاعات خریدار
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="buyerName">نام</Label>
                  <Input
                    id="buyerName"
                    value={formData.buyerName}
                    onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
                    placeholder="نام"
                    className="input-focus"
                  />
                  {errors.buyerName && (
                    <p className="text-sm text-destructive">{errors.buyerName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyerSurname">نام خانوادگی</Label>
                  <Input
                    id="buyerSurname"
                    value={formData.buyerSurname}
                    onChange={(e) => setFormData({ ...formData, buyerSurname: e.target.value })}
                    placeholder="نام خانوادگی"
                    className="input-focus"
                  />
                  {errors.buyerSurname && (
                    <p className="text-sm text-destructive">{errors.buyerSurname}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">ایمیل</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    className="input-focus pr-10"
                    dir="ltr"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Attendees */}
            {qty > 1 && (
              <div className="glass-card space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">نام همراهان (اختیاری)</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAttendees([...attendees, ''])}
                    disabled={attendees.length >= qty - 1}
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    افزودن
                  </Button>
                </div>

                {attendees.map((name, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={name}
                      onChange={(e) => {
                        const newAttendees = [...attendees];
                        newAttendees[index] = e.target.value;
                        setAttendees(newAttendees);
                      }}
                      placeholder={`همراه ${toPersianNumber(index + 1)}`}
                      className="input-focus"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setAttendees(attendees.filter((_, i) => i !== index));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Coupon */}
            <div className="glass-card space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                کد تخفیف (اختیاری)
              </h2>

              <div className="flex gap-2">
                <Input
                  value={formData.couponCode}
                  onChange={(e) => {
                    setFormData({ ...formData, couponCode: e.target.value.toUpperCase() });
                    setCouponValid(null);
                  }}
                  placeholder="کد تخفیف"
                  className="input-focus"
                  dir="ltr"
                />
                <Button variant="outline" onClick={validateCoupon}>
                  اعمال
                </Button>
              </div>

              {couponValid === true && (
                <p className="text-sm text-success flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  کد تخفیف {toPersianNumber(couponDiscount)}٪ اعمال شد
                </p>
              )}
              {couponValid === false && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  کد تخفیف نامعتبر یا استفاده شده است
                </p>
              )}
            </div>

            {/* Bank Info */}
            {selectedBank && (
              <div className="glass-card space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  اطلاعات پرداخت
                </h2>

                <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">بانک</span>
                    <span className="font-medium">{selectedBank.bank_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">نام صاحب حساب</span>
                    <span className="font-medium">{selectedBank.account_holder_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">IBAN</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm" dir="ltr">{selectedBank.iban}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(selectedBank.iban)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                  <p className="text-sm text-primary">
                    مبلغ <strong>{formatPrice(finalPriceTL, 'TL')}</strong> را به حساب فوق واریز کرده و رسید را آپلود کنید.
                  </p>
                </div>
              </div>
            )}

            {/* Receipt Upload */}
            <div className="glass-card space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                آپلود رسید پرداخت
              </h2>

              <div className="relative">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  {receiptFile ? (
                    <div className="flex items-center justify-center gap-2 text-success">
                      <CheckCircle className="h-5 w-5" />
                      <span>{receiptFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        کلیک کنید یا فایل را بکشید
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        فرمت‌های مجاز: تصویر یا PDF
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 glass-card space-y-4">
              <h3 className="text-lg font-semibold">خلاصه سفارش</h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">کنسرت</span>
                  <span>{eventData.event.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">نوع بلیط</span>
                  <span>{eventData.tier.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">تعداد</span>
                  <span>{toPersianNumber(qty)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">قیمت واحد</span>
                  <span>{formatPrice(Number(eventData.tier.price_usd), 'USD')}</span>
                </div>

                {couponDiscount > 0 && (
                  <div className="flex items-center justify-between text-success">
                    <span>تخفیف ({toPersianNumber(couponDiscount)}٪)</span>
                    <span>-{formatPrice(discountAmount, 'USD')}</span>
                  </div>
                )}

                <div className="border-t border-border/50 pt-3">
                  <div className="flex items-center justify-between font-bold text-lg">
                    <span>جمع کل</span>
                    <span className="text-primary">{formatPrice(finalPriceUSD, 'USD')}</span>
                  </div>
                  {exchangeRate && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                      <span>معادل لیر</span>
                      <span>{formatPrice(finalPriceTL, 'TL')}</span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                className="w-full btn-gold"
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'در حال ثبت...' : 'ثبت سفارش'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Checkout;