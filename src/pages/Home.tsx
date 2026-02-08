import { MainLayout } from '@/components/layout/MainLayout';
import { EventList } from '@/components/events/EventList';
import { Music, Sparkles, Users } from 'lucide-react';
import heroConcert from '@/assets/hero-concert.jpg';

const Home = () => {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src={heroConcert}
            alt="Concert background"
            className="h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        </div>
        <div className="absolute top-20 right-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 left-10 h-48 w-48 rounded-full bg-primary/5 blur-2xl" />

        <div className="container relative py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              <span>PLG Entertainment</span>
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              <span className="text-gradient">کنسرت‌های برتر</span>
              <br />
              <span className="text-foreground">در ترکیه</span>
            </h1>
            
            <p className="text-lg text-muted-foreground md:text-xl">
              بهترین هنرمندان ایرانی را در استانبول تجربه کنید
            </p>

            {/* Stats */}
            <div className="flex justify-center gap-8 pt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">۵۰+</div>
                <div className="text-sm text-muted-foreground">کنسرت برگزار شده</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">۱۰K+</div>
                <div className="text-sm text-muted-foreground">بلیط فروخته شده</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">۱۰۰%</div>
                <div className="text-sm text-muted-foreground">رضایت مشتری</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="mb-10 flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold md:text-3xl">کنسرت‌های پیش رو</h2>
              <p className="text-muted-foreground">بلیط خود را همین حالا رزرو کنید</p>
            </div>
            <div className="flex items-center gap-2 text-primary">
              <Music className="h-5 w-5" />
              <span className="text-sm font-medium">زنده</span>
            </div>
          </div>

          <EventList />
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border/40 py-16 md:py-24 bg-card/30">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="glass-card text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Music className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">هنرمندان برتر</h3>
              <p className="text-sm text-muted-foreground">
                بهترین خوانندگان و هنرمندان ایرانی
              </p>
            </div>

            <div className="glass-card text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">خرید گروهی</h3>
              <p className="text-sm text-muted-foreground">
                امکان خرید بلیط برای چند نفر
              </p>
            </div>

            <div className="glass-card text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">پشتیبانی ۲۴/۷</h3>
              <p className="text-sm text-muted-foreground">
                پاسخگویی سریع به سوالات شما
              </p>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default Home;