import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RationRecommendationInput, FeedRecommendationResult, Product } from '../../types';
import { MOCK_PRODUCTS } from '../../data/mockData';
import {
  Calculator,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShoppingBag,
  Check,
} from 'lucide-react';

export const SmartRationQuiz: React.FC = () => {
  const { addToCart, setCurrentView, setIsCartDrawerOpen } = useApp();

  const [step, setStep] = useState<number>(1);

  // Form State
  const [formData, setFormData] = useState<RationRecommendationInput>({
    animalType: 'Cow',
    milkYieldLiters: 15,
    fatPercentTarget: 4.2,
    lactationStage: 'Peak (3-6 Mo)',
    currentFeedType: 'Local Cottonseed Cake & Green Fodder',
    healthGoals: ['Milk Yield Boost', 'Fat Test Boost'],
    numberOfAnimals: 6,
  });

  const [recommendationResult, setRecommendationResult] = useState<FeedRecommendationResult | null>(null);

  const toggleGoal = (goal: string) => {
    setFormData((prev) => {
      if (prev.healthGoals.includes(goal)) {
        return { ...prev, healthGoals: prev.healthGoals.filter((g) => g !== goal) };
      } else {
        return { ...prev, healthGoals: [...prev.healthGoals, goal] };
      }
    });
  };

  const handleCalculateRation = () => {
    // Calculate tailored feed bundle based on farmer answers
    let primaryProduct: Product = MOCK_PRODUCTS[0]; // PashuPoshan Gold Pellets
    if (formData.animalType === 'Buffalo') {
      primaryProduct = MOCK_PRODUCTS[1]; // Murrah Special Buffalo Feed
    } else if (formData.animalType === 'Calf') {
      primaryProduct = MOCK_PRODUCTS[3]; // NutriCalf
    }

    const calciumProduct: Product = MOCK_PRODUCTS[2]; // Veer-Cal Liquid Calcium
    const bypassFatProduct: Product = MOCK_PRODUCTS[4]; // Bypass Fat 99

    const isHighYield = formData.milkYieldLiters >= 15;
    const dailyRationKg = Math.max(3, Math.round(formData.milkYieldLiters * 0.4 + 1));

    const result: FeedRecommendationResult = {
      dailyRationKg,
      recommendedProducts: [
        {
          product: primaryProduct,
          dailyQtyKg: dailyRationKg,
          reasoning: `Provides ${formData.animalType === 'Buffalo' ? '20%' : '22%'} bypass protein & TDN energy tailored for ${formData.milkYieldLiters}L daily production.`,
        },
        {
          product: calciumProduct,
          dailyQtyKg: 0.1,
          reasoning: 'Ionic calcium & Shatavari herbs to improve milk letdown and prevent post-calving fever.',
        },
        ...(isHighYield
          ? [
              {
                product: bypassFatProduct,
                dailyQtyKg: 0.15,
                reasoning: `Fractionated fatty acids to boost fat test above ${formData.fatPercentTarget}% and prevent weight drop.`,
              },
            ]
          : []),
      ],
      expectedYieldIncrease: `+${(1.5 + (formData.numberOfAnimals * 0.2)).toFixed(1)} Liters / Day per animal`,
      estimatedFatBoost: `+${formData.animalType === 'Buffalo' ? '0.8%' : '0.4%'} Fat Test Boost`,
      healthBenefits: [
        'Optimal rumen pH preventing acidosis',
        'Improves conception rate in next heat cycle',
        'Stronger hooves and shiny skin coat',
      ],
      monthlyCostEstimate: Math.round(dailyRationKg * 36 * 30 * formData.numberOfAnimals),
    };

    setRecommendationResult(result);
    setStep(6); // Go to results screen
  };

  const handleAddBundleToCart = () => {
    if (recommendationResult) {
      recommendationResult.recommendedProducts.forEach((rec) => {
        addToCart(rec.product, rec.product.selectedWeightKg || 50, 1);
      });
      setIsCartDrawerOpen(true);
    }
  };

  return (
    <div className="bg-transparent text-slate-100 min-h-screen py-12 relative z-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Top Bar */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs mb-8">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-3">
            <span className="text-emerald-800 flex items-center gap-1.5">
              <Calculator className="w-4 h-4" />
              <span>Smart AI Cattle Feed Advisor</span>
            </span>
            <span>Step {step} of 6</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-800 h-full transition-all duration-300"
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: Animal Type */}
        {step === 1 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md uppercase">
                Step 1
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">What animals do you keep on your farm?</h2>
              <p className="text-slate-500 text-xs mt-1">Select the primary animal type for this feed ration calculation.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { type: 'Cow', icon: '🐄', desc: 'HF / Jersey / Gir Cross' },
                { type: 'Buffalo', icon: '🦬', desc: 'Murrah / Nili-Ravi' },
                { type: 'Calf', icon: '🐂', desc: '15 Days to 6 Months' },
                { type: 'Pregnant Heifer', icon: '🌾', desc: 'Pre-Calving Heifers' },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => setFormData({ ...formData, animalType: item.type as any })}
                  className={`p-4 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-2 ${
                    formData.animalType === item.type
                      ? 'border-emerald-700 bg-emerald-50/80 ring-2 ring-emerald-600/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-3xl">{item.icon}</span>
                  <div className="font-bold text-slate-900 text-sm">{item.type}</div>
                  <div className="text-[10px] text-slate-500">{item.desc}</div>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(2)}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-6 py-3 rounded-2xl flex items-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Milk Yield & Animal Count */}
        {step === 2 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md uppercase">
                Step 2
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">Milk Yield & Farm Herd Size</h2>
              <p className="text-slate-500 text-xs mt-1">Specify current daily milk yield per animal and total herd size.</p>
            </div>

            <div className="space-y-6">
              {/* Slider for milk yield */}
              <div>
                <div className="flex justify-between items-center mb-2 text-xs font-bold">
                  <span className="text-slate-700">Daily Milk Yield per Animal:</span>
                  <span className="text-emerald-800 font-extrabold text-sm">{formData.milkYieldLiters} Liters / Day</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="35"
                  value={formData.milkYieldLiters}
                  onChange={(e) => setFormData({ ...formData, milkYieldLiters: Number(e.target.value) })}
                  className="w-full accent-emerald-800 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>2L (Low)</span>
                  <span>15L (Average)</span>
                  <span>35L (High-Yield HF)</span>
                </div>
              </div>

              {/* Number of animals */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">Number of Animals on Farm:</label>
                <div className="flex items-center gap-3">
                  {[2, 5, 10, 20, 50].map((num) => (
                    <button
                      key={num}
                      onClick={() => setFormData({ ...formData, numberOfAnimals: num })}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        formData.numberOfAnimals === num
                          ? 'bg-emerald-800 text-white border-emerald-800'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {num} Animals
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(1)}
                className="text-xs font-bold text-slate-600 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={() => setStep(3)}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-6 py-3 rounded-2xl flex items-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Lactation Stage */}
        {step === 3 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md uppercase">
                Step 3
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">What is the Lactation / Gestation Stage?</h2>
              <p className="text-slate-500 text-xs mt-1">Lactation stage determines energy and bypass protein requirements.</p>
            </div>

            <div className="space-y-3">
              {[
                { stage: 'Early (1-3 Mo)', desc: 'Peak energy drop & body weight loss risks. High bypass fat required.' },
                { stage: 'Peak (3-6 Mo)', desc: 'Maximum milk yield output. High protein pellet feed needed.' },
                { stage: 'Late (6-10 Mo)', desc: 'Preparing for dry period and body weight recovery.' },
                { stage: 'Dry Period', desc: 'Pre-calving steam feed & ionic calcium preparation.' },
              ].map((st) => (
                <button
                  key={st.stage}
                  onClick={() => setFormData({ ...formData, lactationStage: st.stage as any })}
                  className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    formData.lactationStage === st.stage
                      ? 'border-emerald-700 bg-emerald-50/80 ring-2 ring-emerald-600/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold text-slate-900 text-sm">{st.stage}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{st.desc}</div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(2)}
                className="text-xs font-bold text-slate-600 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={() => setStep(4)}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-6 py-3 rounded-2xl flex items-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Health & Fat Target Goals */}
        {step === 4 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md uppercase">
                Step 4
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">What are your primary goals?</h2>
              <p className="text-slate-500 text-xs mt-1">Select one or more targets for your herd&apos;s nutrition plan.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                'Milk Fat % Boost (SNF)',
                'Milk Volume Increase (+2L/day)',
                'Prevent Post-Calving Milk Fever',
                'Accelerate Heat Cycle & Conception',
                'Calf Rumen Weight Gain',
                'Improve Digestion & Rumen Health',
              ].map((goal) => {
                const selected = formData.healthGoals.includes(goal);
                return (
                  <button
                    key={goal}
                    onClick={() => toggleGoal(goal)}
                    className={`p-3.5 rounded-2xl border text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                      selected
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{goal}</span>
                    {selected && <Check className="w-4 h-4 text-emerald-700" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(3)}
                className="text-xs font-bold text-slate-600 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={() => setStep(5)}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-6 py-3 rounded-2xl flex items-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Current Feed Review */}
        {step === 5 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md uppercase">
                Step 5
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">Current Feed Being Used</h2>
              <p className="text-slate-500 text-xs mt-1">What are you currently feeding your cattle?</p>
            </div>

            <div>
              <select
                value={formData.currentFeedType}
                onChange={(e) => setFormData({ ...formData, currentFeedType: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs rounded-xl p-3.5 outline-none focus:border-emerald-600"
              >
                <option value="Local Cottonseed Cake & Wheat Straw">Local Cottonseed Cake & Wheat Straw</option>
                <option value="Home-made Mash Feed Mix">Home-made Mash Feed Mix</option>
                <option value="Standard Local Pellet Feed">Standard Local Pellet Feed</option>
                <option value="Green Napier Fodder + Dry Straw">Green Napier Fodder + Dry Straw</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(4)}
                className="text-xs font-bold text-slate-600 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                onClick={handleCalculateRation}
                className="bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-900 hover:to-teal-900 text-white font-bold text-xs px-8 py-3.5 rounded-2xl flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Calculate AI Feed Plan</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: RECOMMENDATION RESULTS */}
        {step === 6 && recommendationResult && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
            <div className="text-center pb-4 border-b border-slate-100">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold text-emerald-800 uppercase bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                AI Ration Calculation Complete
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">
                Recommended Feed Ration Plan
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Optimized for {formData.numberOfAnimals} {formData.animalType}s giving {formData.milkYieldLiters}L daily milk.
              </p>
            </div>

            {/* Impact Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                <div className="text-xs text-slate-500 font-semibold">Expected Yield</div>
                <div className="text-sm sm:text-base font-black text-emerald-800 mt-0.5">
                  {recommendationResult.expectedYieldIncrease}
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-center">
                <div className="text-xs text-slate-500 font-semibold">Fat Boost</div>
                <div className="text-sm sm:text-base font-black text-amber-900 mt-0.5">
                  {recommendationResult.estimatedFatBoost}
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 text-center col-span-2 sm:col-span-1">
                <div className="text-xs text-slate-500 font-semibold">Daily Ration</div>
                <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                  {recommendationResult.dailyRationKg} kg / Animal
                </div>
              </div>
            </div>

            {/* Recommended Products Bundle */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Recommended Ration Bundle Products:
              </h3>
              {recommendationResult.recommendedProducts.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={rec.product.image}
                      alt={rec.product.name}
                      className="w-14 h-14 object-cover rounded-xl shrink-0"
                    />
                    <div>
                      <div className="text-[10px] font-bold text-emerald-800 uppercase">{rec.product.brand}</div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">{rec.product.name}</div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{rec.reasoning}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-slate-900 text-sm">₹{rec.product.price}</div>
                    <div className="text-[10px] text-slate-400">50kg Bag</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action CTAs */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={() => setStep(1)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Recalculate Ration
              </button>

              <button
                onClick={handleAddBundleToCart}
                className="w-full sm:w-auto bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm px-8 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add Complete Ration Bundle to Cart</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
