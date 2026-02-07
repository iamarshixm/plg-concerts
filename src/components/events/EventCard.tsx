import { Link } from 'react-router-dom';
import { Calendar, MapPin, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPersianDateTime, formatPrice } from '@/lib/persian';

interface EventCardProps {
  id: string;
  title: string;
  artistName: string;
  venue: string;
  eventDate: string;
  imageUrl?: string;
  minPrice?: number;
}

export const EventCard = ({
  id,
  title,
  artistName,
  venue,
  eventDate,
  imageUrl,
  minPrice,
}: EventCardProps) => {
  const defaultImage = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80';

  return (
    <div className="event-card group">
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={imageUrl || defaultImage}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        
        {/* Artist name overlay */}
        <div className="absolute bottom-4 right-4">
          <span className="text-gradient text-2xl font-bold">{artistName}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        <h3 className="text-lg font-semibold line-clamp-1">{title}</h3>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span>{formatPersianDateTime(eventDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{venue}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {minPrice !== undefined && (
            <div className="text-sm">
              <span className="text-muted-foreground">شروع از </span>
              <span className="text-primary font-semibold">
                {formatPrice(minPrice, 'USD')}
              </span>
            </div>
          )}
          <Link to={`/event/${id}`}>
            <Button className="btn-gold gap-2">
              <Ticket className="h-4 w-4" />
              خرید بلیط
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
