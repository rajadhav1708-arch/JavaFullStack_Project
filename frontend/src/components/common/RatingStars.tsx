import React from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const RatingStars: React.FC<RatingStarsProps> = ({ rating, count, size = 'sm' }) => {
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${iconSize} ${
              star <= Math.round(rating) ? 'fill-ochre text-ochre' : 'text-line'
            }`}
          />
        ))}
      </div>
      <span className="ml-1 text-xs font-semibold text-ink">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-xs text-ink-soft">({count})</span>}
    </div>
  );
};
