import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, ArrowRight } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="text-center space-y-6">
        <div className="text-8xl font-bold text-gradient">۴۰۴</div>
        <h1 className="text-2xl font-bold">صفحه یافت نشد</h1>
        <p className="text-muted-foreground max-w-md">
          متأسفانه صفحه‌ای که به دنبال آن هستید وجود ندارد یا حذف شده است.
        </p>
        <Link to="/">
          <Button className="btn-gold gap-2">
            <Home className="h-4 w-4" />
            بازگشت به صفحه اصلی
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;