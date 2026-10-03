import React from 'react';
import { MOCK_REVIEWS } from '../../data/mockData';
import { useInView, useScrollProgress, parallaxOffset } from '../../hooks/useScrollProgress';
import { RatingStars } from '../common/RatingStars';
import { Quote, CheckCircle2, TrendingUp } from 'lucide-react';

const HEADING_TRAVEL = 12;

export const TestimonialsSection: React.FC = () => {
  const section = useInView<HTMLElement>();
  const { ref: headingRef, progress } = useScrollProgress<HTMLDivElement>(section.inView);
  const headingOffset = parallaxOffset(progress, HEADING_TRAVEL);

  return (
    <section ref={section.ref} className="py-16 bg-transparent text-white border-t border-white/10 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={headingRef}
          data-reveal
          className="text-center max-w-3xl mx-auto mb-12 will-change-transform"
          style={{ transform: `translate3d(0, ${headingOffset}px, 0)` }}
        >
          <span className="text-xs font-bold text-[#34d399] bg-[#065f46] border border-emerald-500/30 px-3 py-1 rounded-full uppercase tracking-wide">
            Real Impact Stories
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white mt-3 tracking-tight">
            Trusted by 10,000+ Dairy Farmers
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mt-2">
            Read verified results from farmers who boosted their milk yields, increased fat testing at dairy collection centers, and maintained healthy herds.
          </p>
        </div>

        {/* Cards are not parallaxed, for the grid-alignment reason noted in
            FarmerServicesSection. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MOCK_REVIEWS.map((rev, index) => {
            return (
              <div
                key={rev.id}
                data-reveal
                data-reveal-delay={String(index * 100)}
                className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-slate-700/60 shadow-lg flex flex-col justify-between relative hover:border-[#10b981] transition-all"
              >
                <Quote className="w-8 h-8 text-emerald-500/20 absolute top-4 right-4" />

                <div>
                  <RatingStars rating={rev.rating} />
                  <p className="text-slate-200 text-xs sm:text-sm leading-relaxed mt-4 italic font-medium">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span>{rev.author}</span>
                      {rev.verifiedFarmer && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 fill-emerald-950" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">{rev.location}</div>
                  </div>

                  {rev.farmSize && (
                    <span className="text-[10px] font-bold text-[#34d399] bg-[#065f46] px-2 py-1 rounded-md border border-emerald-500/30 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-[#34d399]" />
                      {rev.farmSize}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
