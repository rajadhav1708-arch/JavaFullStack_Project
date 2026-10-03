import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  useInView,
  useScrollProgress,
  parallaxOffset,
} from '../../hooks/useScrollProgress';
import {
  Sparkles,
  ShoppingBag,
  Calculator,
  CheckCircle2,
  TrendingUp,
  Award,
  Truck,
  ArrowRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Activity,
} from 'lucide-react';

/**
 * Parallax distances in px, applied to the element's own viewport progress rather
 * than to window.scrollY. Each layer is capped, so scrolling the full page can
 * never pull the headline, the video and the glow apart from each other.
 */
const GLOW_TRAVEL = 40;
const COPY_TRAVEL = 18;
const VIDEO_TRAVEL = 8;

export const HeroSection: React.FC = () => {
  const { setCurrentView } = useApp();
  const section = useInView<HTMLElement>();
  const { ref: parallaxRef, progress } = useScrollProgress<HTMLDivElement>(section.inView);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  // Hero background video, tried in order. The onError handler below advances to the
  // next entry, so local clips are optional drop-in assets: drop a real file at
  // public/videos/cow_eating.mp4 to use it, and if absent the remote clips take over.
  const videoSources = [
    '/videos/cow_eating.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-cows-grazing-in-a-green-field-43029-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-cows-in-a-pasture-42686-large.mp4',
  ];

  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoError = () => {
    if (currentSourceIndex < videoSources.length - 1) {
      setCurrentSourceIndex((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [currentSourceIndex]);

  const glowOffset = parallaxOffset(progress, GLOW_TRAVEL);
  const copyOffset = parallaxOffset(progress, COPY_TRAVEL);
  const videoOffset = parallaxOffset(progress, VIDEO_TRAVEL);

  return (
    <section
      ref={section.ref}
      className="relative bg-slate-950/50 backdrop-blur-md text-white pt-10 pb-20 overflow-hidden border-b border-white/10"
    >
      {/* Glow Effect */}
      <div
        className="absolute top-1/4 left-1/2 w-[600px] h-[350px] bg-emerald-600/20 blur-[120px] rounded-full pointer-events-none will-change-transform"
        style={{ transform: `translate3d(-50%, calc(-50% + ${glowOffset}px), 0)` }}
      />

      <div ref={parallaxRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column - Copy & CTA */}
          <div
            className="lg:col-span-7 space-y-6 text-center lg:text-left will-change-transform"
            style={{ transform: `translate3d(0, ${copyOffset}px, 0)` }}
          >
            <div data-reveal className="inline-flex items-center gap-2 bg-[#065f46] border border-[#10b981]/50 text-[#a7f3d0] text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md">
              <Sparkles className="w-4 h-4 text-[#34d399] animate-spin-slow" />
              <span>Next-Gen AgroFeed Pro SaaS & Cattle Nutrition</span>
            </div>

            <h1 data-reveal data-reveal-delay="80" className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              Better Nutrition for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#34d399] via-emerald-200 to-amber-300">Healthier Livestock</span>
            </h1>

            <p data-reveal data-reveal-delay="160" className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Scientific compound feed pellets, high-fat bypass protein, and chelated calcium formulations designed to maximize daily milk production, boost SNF fat test, and maintain peak herd health.
            </p>

            <div data-reveal data-reveal-delay="240" className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                id="btn-shop-cattle-feed"
                onClick={() => setCurrentView('shop')}
                className="flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg transition-all cursor-pointer transform hover:-translate-y-0.5"
              >
                <ShoppingBag className="w-4 h-4 text-white" />
                <span>Shop Cattle Feed</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <button
                id="btn-ration-calculator"
                onClick={() => setCurrentView('nutrition-quiz')}
                className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-sm px-5 py-3.5 rounded-2xl transition-all cursor-pointer"
              >
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>AI Ration Calculator</span>
              </button>
            </div>

            <div data-reveal data-reveal-delay="320" className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-300">100% Lab Tested</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-300">Village Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-300">+2.5L Milk/Day</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-300">Farmer Khata Credit</span>
              </div>
            </div>
          </div>

          {/* Right Column - Cow Eating at Dairy Farm Video Showcase */}
            <div
              data-reveal
              data-reveal-delay="200"
              className="lg:col-span-5 relative will-change-transform"
              style={{ transform: `translate3d(0, ${videoOffset}px, 0)` }}
            >
            <div className="relative rounded-3xl overflow-hidden border border-emerald-500/30 shadow-2xl bg-slate-900/60 backdrop-blur-md p-2 group">
              
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video sm:h-[380px] flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={videoSources[currentSourceIndex]}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  onError={handleVideoError}
                  className="w-full h-full object-cover rounded-2xl"
                />

                {/* Live Dairy Farm Tag */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-emerald-500/40 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Dairy Farm Intake Reel</span>
                </div>

                {/* Control Buttons */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                  <button
                    id="btn-toggle-play"
                    onClick={togglePlay}
                    className="p-2.5 bg-slate-950/80 hover:bg-emerald-600 text-white rounded-full border border-slate-700 shadow-lg backdrop-blur-md transition-all cursor-pointer"
                    title={isPlaying ? 'Pause Video' : 'Play Video'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>

                  <button
                    id="btn-toggle-mute"
                    onClick={toggleMute}
                    className="p-2.5 bg-slate-950/80 hover:bg-emerald-600 text-white rounded-full border border-slate-700 shadow-lg backdrop-blur-md transition-all cursor-pointer"
                    title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                {/* Bottom Overlay Label */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent p-4 z-10 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>Cows Eating Fresh Fodder & Feed</span>
                    </h3>
                    <p className="text-xs text-emerald-400 font-medium">
                      High Energy Palatable Feed • Maximize Fat %
                    </p>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                    Farm Footage
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
