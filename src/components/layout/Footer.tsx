import { Music, Instagram, Send, Phone } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="border-t border-border/40 bg-card/50">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Logo & About */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Music className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold text-gradient">PLG Entertainment</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              برگزارکننده برترین کنسرت‌های ایرانی در ترکیه
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold">دسترسی سریع</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/" className="hover:text-primary transition-colors">
                  کنسرت‌های پیش رو
                </a>
              </li>
              <li>
                <a href="/auth" className="hover:text-primary transition-colors">
                  ورود / ثبت نام
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold">تماس با ما</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-primary" />
                <span>@plg_entertainment</span>
              </li>
              <li className="flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                <span>@plg_support</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <span dir="ltr">+90 XXX XXX XXXX</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border/40 pt-6 text-center text-sm text-muted-foreground">
          <p>© ۲۰۲۵ PLG Entertainment - تمامی حقوق محفوظ است</p>
        </div>
      </div>
    </footer>
  );
};
