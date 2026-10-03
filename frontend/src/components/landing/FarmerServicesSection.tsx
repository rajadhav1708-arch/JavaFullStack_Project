import React from 'react';
import { useApp } from '../../context/AppContext';
import { useInView, useScrollProgress, parallaxOffset } from '../../hooks/useScrollProgress';
import { Calculator, Repeat, Truck, ShieldCheck, Stethoscope, MessageSquare, ArrowRight } from 'lucide-react';

/** Bounded travel for the heading. The cards themselves must not be translated. */
const HEADING_TRAVEL = 14;

export const FarmerServicesSection: React.FC = () => {
  const { setCurrentView } = useApp();
  const section = useInView<HTMLElement>();
  const { ref: headingRef, progress } = useScrollProgress<HTMLDivElement>(section.inView);

  const services = [
    {
      id: 'ration',
      title: 'AI Ration Recommendation',
      description: 'Input your cow or buffalo milk yield, fat goals, and lactation stage to receive an exact customized feed ration plan.',
      icon: Calculator,
      cta: 'Calculate Ration',
      view: 'nutrition-quiz' as const,
      color: 'bg-emerald-950/80 text-[#34d399] border-emerald-500/40',
    },
    {
      id: 'sub',
      title: 'Subscription Orders',
      description: 'Automate monthly feed deliveries directly to your village barn. Pause or modify delivery dates anytime.',
      icon: Repeat,
      cta: 'Start Subscription',
      view: 'subscriptions' as const,
      color: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    },
    {
      id: 'khata',
      title: 'Farmer Credit Khata',
      description: 'Purchase cattle feed on credit and clear your balance after monthly dairy milk collection payments.',
      icon: ShieldCheck,
      cta: 'View Khata Balance',
      view: 'customer-dashboard' as const,
      color: 'bg-teal-950/80 text-teal-300 border-teal-500/40',
    },
    {
      id: 'delivery',
      title: 'Tractor-Express Barn Delivery',
      description: 'Heavy bag deliveries handled via local tractor-trolleys direct to your farm gate within 24 hours.',
      icon: Truck,
      cta: 'Track Live Delivery',
      view: 'shop' as const,
      color: 'bg-blue-950/80 text-blue-300 border-blue-500/40',
    },
    {
      id: 'vet',
      title: 'Free Vet Doctor Advice',
      description: 'Get free advice on post-calving milk fever, mastitis prevention, and rumen acidosis treatment.',
      icon: Stethoscope,
      cta: 'Consult Vet Doctor',
      view: 'services' as const,
      color: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Order & Support',
      description: 'Send a simple audio message on WhatsApp to place feed reorders or ask questions about feeds.',
      icon: MessageSquare,
      cta: 'Chat on WhatsApp',
      view: 'services' as const,
      color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    },
  ];

  const headingOffset = parallaxOffset(progress, HEADING_TRAVEL);

  return (
    <section ref={section.ref} className="py-16 bg-transparent text-white border-b border-white/10 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={headingRef}
          data-reveal
          className="text-center max-w-3xl mx-auto mb-12 will-change-transform"
          style={{ transform: `translate3d(0, ${headingOffset}px, 0)` }}
        >
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-950/80 border border-amber-500/40 px-3 py-1 rounded-full">
            Farmer First Ecosystem
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white mt-3 tracking-tight">
            Specialized Dairy Farm Services
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mt-2">
            Designed to remove hassle, guarantee feed supply, and provide financial flexibility for every dairy farm size.
          </p>
        </div>

        {/*
          The cards are deliberately NOT parallaxed. They are grid children, and a
          translate on a grid child takes it out of row alignment - the row splits
          and the columns stop matching height. An earlier version offset each card
          by `scrollY * 0.02 * (index % 2 ? -1 : 1)`, which drifted them hundreds of
          pixels apart and never undid it.
        */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((srv, index) => {
            const Icon = srv.icon;
            return (
              <div
                key={srv.id}
                data-reveal
                data-reveal-delay={String(index * 80)}
                className="bg-slate-900/40 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 flex flex-col justify-between hover:border-[#10b981] transition-all hover:bg-slate-900/60 group shadow-lg"
              >
                <div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border mb-4 ${srv.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-[#34d399] transition-colors">
                    {srv.title}
                  </h3>
                  <p className="text-slate-300 text-xs leading-relaxed mt-2">{srv.description}</p>
                </div>

                <button
                  onClick={() => setCurrentView(srv.view)}
                  className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-[#34d399] group-hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <span>{srv.cta}</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
