import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('ایمیل نامعتبر است'),
  password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'نام باید حداقل ۲ کاراکتر باشد'),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  if (user) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    try {
      if (isLogin) {
        loginSchema.parse(formData);
      } else {
        signupSchema.parse(formData);
      }
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

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'خطا',
              description: 'ایمیل یا رمز عبور اشتباه است',
              variant: 'destructive',
            });
          } else if (error.message.includes('Email not confirmed')) {
            toast({
              title: 'تایید ایمیل',
              description: 'لطفاً ابتدا ایمیل خود را تایید کنید',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'خطا',
              description: error.message,
              variant: 'destructive',
            });
          }
          return;
        }
        navigate('/');
      } else {
        const { error } = await signUp(formData.email, formData.password, formData.fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'خطا',
              description: 'این ایمیل قبلاً ثبت شده است',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'خطا',
              description: error.message,
              variant: 'destructive',
            });
          }
          return;
        }
        toast({
          title: 'ثبت نام موفق',
          description: 'لطفاً ایمیل خود را برای تایید حساب بررسی کنید',
        });
        setIsLogin(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout showFooter={false}>
      <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-8">
        <div className="w-full max-w-md">
          <div className="glass-card space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">
                {isLogin ? 'ورود به حساب' : 'ثبت نام'}
              </h1>
              <p className="text-muted-foreground">
                {isLogin
                  ? 'برای ادامه وارد حساب خود شوید'
                  : 'یک حساب جدید ایجاد کنید'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">نام و نام خانوادگی</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      placeholder="نام کامل"
                      className="input-focus pr-10"
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">ایمیل</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="email@example.com"
                    className="input-focus pr-10"
                    dir="ltr"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">رمز عبور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="input-focus pr-10"
                    dir="ltr"
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full btn-gold"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                {isLogin ? 'ورود' : 'ثبت نام'}
              </Button>
            </form>

            {/* Toggle */}
            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                {isLogin ? 'حساب ندارید؟' : 'قبلاً ثبت نام کرده‌اید؟'}
              </span>{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="text-primary hover:underline font-medium"
              >
                {isLogin ? 'ثبت نام کنید' : 'وارد شوید'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Auth;