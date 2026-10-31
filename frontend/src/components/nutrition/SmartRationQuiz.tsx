import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RationRecommendationInput, FeedRecommendationResult, Product } from '../../types';
import { ProductImage } from '../common/ProductImage';
import {
  Calculator,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Check,
  AlertTriangle,
} from 'lucide-react';

/**
 * Rule-based ration calculator (no AI claims). Uses standard DMI heuristics and
 * real catalogue SKUs; monthly cost is computed from live product prices.
 * Framed as an estimate — not a veterinary prescription.
 */
export const SmartRationQuiz: React.FC = () => {
  const { addToCart, setIsCartDrawerOpen, products, addToast } = useApp();

  const [step, setStep] = useState<number>(1);

  const [formData, setFormData] = useState<RationRecommendationInput>({
    animalType: 'Cow',
    milkYieldLiters: 0,
    fatPercentTarget: 0,
    lactationStage: 'Early (1-3 Mo)',
    currentFeedType: '',
    healthGoals: [],
    numberOfAnimals: 0,
  });

  const [confirmedFields, setConfirmedFields] = useState<Set<string>>(new Set());
  const [recommendationResult, setRecommendationResult] = useState<FeedRecommendationResult | null>(null);

  const toggleGoal = (goal: string) => {
    setFormData((prev) => {
      const goals = prev.healthGoals.includes(goal)
        ? prev.healthGoals.filter((g) => g !== goal)
        : [...prev.healthGoals, goal];
      return { ...prev, healthGoals: goals };
    });
    setConfirmedFields((prev) => new Set([...prev, 'healthGoals']));
  };

  const markConfirmed = (field: string) => {
    setConfirmedFields((prev) => new Set([...prev, field]));
  };

  const canProceed = (required: string[]): boolean => required.every((f) => confirmedFields.has(f));

  const handleAnimalSelect = (type: string) => {
    setFormData((prev) => ({ ...prev, animalType: type as RationRecommendationInput['animalType'] }));
    markConfirmed('animalType');
  };

  const handleYieldChange = (value: number) => {
    setFormData((prev) => ({ ...prev, milkYieldLiters: value }));
    if (value > 0) markConfirmed('milkYieldLiters');
  };

  const handleAnimalCount = (num: number) => {
    setFormData((prev) => ({ ...prev, numberOfAnimals: num }));
    if (num > 0) markConfirmed('numberOfAnimals');
  };

  const handleLactationSelect = (stage: string) => {
    setFormData((prev) => ({ ...prev, lactationStage: stage as RationRecommendationInput['lactationStage'] }));
    markConfirmed('lactationStage');
  };

  const handleFatTarget = (value: number) => {
    setFormData((prev) => ({ ...prev, fatPercentTarget: value }));
    if (value > 0) markConfirmed('fatPercentTarget');
  };

  const handleFeedType = (value: string) => {
    setFormData((prev) => ({ ...prev, currentFeedType: value }));
    markConfirmed('currentFeedType');
  };

  /**
   * Estimate daily ration kg from milk yield, animal type and lactation stage.
   * Uses common dairy nutrition rules of thumb (DMI ≈ 3–4% BW; concentrate
   * scaled to yield). Not a substitute for a qualified nutritionist.
   */
  const handleCalculateRation = () => {
    const bySku = (sku: string): Product | undefined => products.find((p) => p.sku === sku);

    const pick = (...skus: string[]): Product | undefined => {
      for (const sku of skus) {
        const product = bySku(sku);
        if (product) return product;
      }
      return undefined;
    };

    const calfFeed = pick('PP-CLF-25KG');
    const calciumProduct = pick('VET-CAL-5L');
    const bypassFatProduct = pick('NRT-FAT-10KG');
    const mineralProduct = pick('KCN-MIN-1KG');
    const buffaloStandard = pick('AMUL-BUF-50KG', 'FDM-BUF-40KG', 'DMX-BUF-50KG');
    const dairyCowStandard = pick('HER-GMT-50KG', 'KKA-DST1-50KG', 'PP-GLD-50KG');

    const {
      animalType,
      milkYieldLiters,
      fatPercentTarget,
      lactationStage,
      healthGoals,
      numberOfAnimals,
    } = formData;

    const wantsFatBoost =
      healthGoals.includes('Milk Fat % Boost (SNF)') ||
      milkYieldLiters >= 15 ||
      fatPercentTarget > 6;
    const wantsVolume =
      healthGoals.includes('Milk Volume Increase (+2L/day)') || milkYieldLiters >= 12;
    const wantsDigestion = healthGoals.includes('Improve Digestion & Rumen Health');

    let baseRationKg: number;
    let energyNote: string;

    switch (animalType) {
      case 'Buffalo':
        baseRationKg = Math.max(4, Math.round(milkYieldLiters * 0.5 + 2));
        energyNote = 'High bypass protein & fat suited to buffalo milk fat synthesis';
        break;
      case 'Calf':
        baseRationKg = Math.max(1, Math.round(milkYieldLiters * 0.3 + 0.5));
        energyNote = 'Rumen-developing starter with probiotics for growing calves';
        break;
      case 'Pregnant Heifer':
        baseRationKg = Math.max(3, Math.round(milkYieldLiters * 0.35 + 1.5));
        energyNote = 'Steam-up ration for pre-calving body condition';
        break;
      case 'Cow':
      default:
        baseRationKg = Math.max(4, Math.round(milkYieldLiters * 0.45 + 1.5));
        energyNote = 'Bypass protein & TDN to support sustained milk yield';
        break;
    }

    let stageMultiplier = 1.0;
    let stageReason = '';
    switch (lactationStage) {
      case 'Early (1-3 Mo)':
        stageMultiplier = 1.15;
        stageReason = 'Higher energy demand in early lactation';
        break;
      case 'Peak (3-6 Mo)':
        stageMultiplier = 1.1;
        stageReason = 'Peak yield window — protein-forward concentrate';
        break;
      case 'Late (6-10 Mo)':
        stageMultiplier = 0.9;
        stageReason = 'Moderate energy as yield declines';
        break;
      case 'Dry Period':
        stageMultiplier = 0.7;
        stageReason = 'Controlled energy before calving';
        break;
    }

    const dailyRationKg = Math.max(1, Math.round(baseRationKg * stageMultiplier * 10) / 10);

    let primaryProduct: Product | undefined;

    if (animalType === 'Buffalo') {
      if (wantsFatBoost && fatPercentTarget >= 7) {
        primaryProduct = pick('HER-BUF-50KG', 'AMUL-BUF-50KG', 'DMX-BUF-50KG');
      } else if (wantsVolume) {
        primaryProduct = pick('SAR-BUFF-50KG', 'AMUL-BUF-50KG', 'DMX-BUF-50KG');
      } else {
        primaryProduct = buffaloStandard;
      }
    } else if (animalType === 'Calf') {
      primaryProduct = calfFeed;
    } else if (animalType === 'Pregnant Heifer') {
      primaryProduct = pick('KKA-DST1-50KG', 'SWN-CAT-50KG', 'PP-GLD-50KG');
    } else if (wantsVolume || (wantsFatBoost && fatPercentTarget >= 4.5)) {
      primaryProduct = pick('HOL-XM8-50KG', 'NRT-MB-50KG', 'PP-GLD-50KG');
    } else if (wantsDigestion) {
      primaryProduct = pick('NRT-MB-50KG', 'KKA-DST1-50KG', 'PP-GLD-50KG');
    } else {
      primaryProduct = dairyCowStandard;
    }

    if (!primaryProduct) {
      addToast('The ration calculator could not find a suitable feed in the catalogue. Please seed the database.', 'error');
      return;
    }

    const recommendedProducts: FeedRecommendationResult['recommendedProducts'] = [];

    if (primaryProduct) {
      recommendedProducts.push({
        product: primaryProduct,
        dailyQtyKg: animalType === 'Calf' ? Math.max(0.25, dailyRationKg * 0.6) : dailyRationKg * 0.7,
        reasoning: `${primaryProduct.name}: ${energyNote}. ${stageReason}.`,
      });
    }

    if (mineralProduct) {
      recommendedProducts.push({
        product: mineralProduct,
        dailyQtyKg: 0.06,
        reasoning: 'Trace minerals for heat cycles, hoof health and immunity',
      });
    }

    if (
      calciumProduct &&
      (lactationStage === 'Early (1-3 Mo)' || lactationStage === 'Peak (3-6 Mo)' || animalType === 'Pregnant Heifer')
    ) {
      recommendedProducts.push({
        product: calciumProduct,
        dailyQtyKg: 0.1,
        reasoning: 'Ionic calcium to support post-calving calcium balance',
      });
    }

    const primaryFat = Number.parseFloat(primaryProduct.nutritionalInfo.crudeFat);
    const feedAlreadyHighFat = Number.isFinite(primaryFat) && primaryFat >= 6;
    if (bypassFatProduct && wantsFatBoost && !feedAlreadyHighFat) {
      recommendedProducts.push({
        product: bypassFatProduct,
        dailyQtyKg: 0.15,
        reasoning: 'Bypass fat to top up energy when the base feed does not already claim 6%+ fat',
      });
    }

    const healthBenefits: string[] = [
      'Forage-to-concentrate balance supports rumen health',
      'Mineral mix covers common deficiencies in stall-fed herds',
    ];
    if (healthGoals.includes('Prevent Post-Calving Milk Fever') || lactationStage === 'Early (1-3 Mo)') {
      healthBenefits.push('Calcium support around calving (monitor with your vet for milk fever risk)');
    }
    if (wantsFatBoost) {
      healthBenefits.push(
        feedAlreadyHighFat
          ? 'Selected base feed already carries a 6%+ fat claim'
          : 'Bypass fat included for energy density during peak yield'
      );
    }
    if (animalType === 'Calf') {
      healthBenefits.push('Starter feed supports early rumen development');
    }

    const primaryPrice = primaryProduct ? primaryProduct.price / (primaryProduct.weightOptions[0]?.weightKg || 50) : 36;
    const monthlyCostEstimate = Math.round(dailyRationKg * primaryPrice * 30 * numberOfAnimals);

    const result: FeedRecommendationResult = {
      dailyRationKg,
      recommendedProducts,
      targetFatPercent: fatPercentTarget,
      healthBenefits,
      monthlyCostEstimate,
      disclaimer:
        'Estimates only, based on standard dairy nutrition rules of thumb and current catalogue prices. Actual requirements depend on body weight, fodder quality, water and health status — confirm with a qualified nutritionist or veterinarian before changing the ration.',
    };

    setRecommendationResult(result);
    setStep(6);
  };

  const handleAddBundleToCart = () => {
    if (recommendationResult) {
      recommendationResult.recommendedProducts.forEach((rec) => {
        const variant = rec.product.weightOptions[0];
        addToCart(rec.product, variant.weightKg, 1);
      });
      setIsCartDrawerOpen(true);
    }
  };

  const step1 = (
    <div className="card space-y-6 p-6 sm:p-8">
      <div>
        <span className="mb-2 inline-block rounded-md bg-pine-soft px-2.5 py-0.5 text-xs font-bold uppercase text-pine">
          Step 1 of 6
        </span>
        <h2 className="mt-2 text-2xl text-ink">What animals do you keep on your farm?</h2>
        <p className="mt-1 text-xs text-ink-soft">Select the primary animal type — this sets the base ration.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { type: 'Cow', emoji: '🐄', desc: 'HF / Jersey / Gir Cross' },
          { type: 'Buffalo', emoji: '🦬', desc: 'Murrah / Nili-Ravi' },
          { type: 'Calf', emoji: '🐄', desc: '15 Days to 6 Months' },
          { type: 'Pregnant Heifer', emoji: '🌿', desc: 'Pre-Calving Heifers' },
        ].map((item) => {
          const selected = formData.animalType === item.type;
          return (
            <button
              key={item.type}
              onClick={() => handleAnimalSelect(item.type)}
              className={`flex cursor-pointer flex-col items-center justify-center space-y-2 rounded-2xl border p-4 text-center transition-all ${
                selected
                  ? 'border-pine bg-pine-soft ring-2 ring-pine/20'
                  : 'border-line bg-cream hover:bg-pine-soft/50'
              }`}
            >
              <span className="text-3xl">{item.emoji}</span>
              <div className="text-sm font-bold text-ink">{item.type}</div>
              <div className="text-[10px] text-ink-soft">{item.desc}</div>
            </button>
          );
        })}
      </div>

      {!confirmedFields.has('animalType') && (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-ochre-soft p-3 text-[10px] text-ink">
          <AlertTriangle className="h-4 w-4 text-ochre" />
          <span>Please select your animal type to continue.</span>
        </div>
      )}

      <div className="flex justify-end border-t border-line pt-4">
        <button
          onClick={() => setStep(2)}
          disabled={!canProceed(['animalType'])}
          className="btn btn-primary disabled:opacity-50"
        >
          <span>Continue</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const step2 = (
    <div className="card space-y-6 p-6 sm:p-8">
      <div>
        <span className="mb-2 inline-block rounded-md bg-pine-soft px-2.5 py-0.5 text-xs font-bold uppercase text-pine">
          Step 2 of 6
        </span>
        <h2 className="mt-2 text-2xl text-ink">Milk Yield & Herd Size</h2>
        <p className="mt-1 text-xs text-ink-soft">Daily milk yield per animal and total animals on the farm.</p>
      </div>

      <div className="space-y-6">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-bold">
            <span className="text-ink">Daily milk yield per animal:</span>
            <span className="text-sm text-pine">{formData.milkYieldLiters} L / day</span>
          </div>
          <input
            type="range"
            min="0"
            max="35"
            value={formData.milkYieldLiters}
            onChange={(e) => handleYieldChange(Number(e.target.value))}
            className="w-full cursor-pointer accent-pine"
          />
          <div className="mt-1 flex justify-between text-[10px] text-ink-soft">
            <span>0 L (dry/calf)</span>
            <span>10 L</span>
            <span>25 L</span>
            <span>35 L</span>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold text-ink">Number of animals on farm:</label>
          <div className="flex flex-wrap items-center gap-3">
            {[1, 2, 5, 10, 20, 50].map((num) => (
              <button
                key={num}
                onClick={() => handleAnimalCount(num)}
                className={`cursor-pointer rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
                  formData.numberOfAnimals === num
                    ? 'border-pine bg-pine text-white'
                    : 'border-line bg-cream text-ink hover:border-pine/40'
                }`}
              >
                {num} {num === 1 ? 'animal' : 'animals'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {formData.milkYieldLiters === 0 && (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-ochre-soft p-3 text-[10px] text-ink">
          <AlertTriangle className="h-4 w-4 text-ochre" />
          <span>Set a milk yield above 0 L for milking animals (use the calf path for young stock).</span>
        </div>
      )}
      {formData.numberOfAnimals === 0 && (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-ochre-soft p-3 text-[10px] text-ink">
          <AlertTriangle className="h-4 w-4 text-ochre" />
          <span>Please select the number of animals.</span>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line pt-4">
        <button onClick={() => setStep(1)} className="flex cursor-pointer items-center gap-1 text-xs font-bold text-ink-soft hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={formData.milkYieldLiters === 0 || formData.numberOfAnimals === 0}
          className="btn btn-primary disabled:opacity-50"
        >
          <span>Continue</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const step3 = (
    <div className="card space-y-6 p-6 sm:p-8">
      <div>
        <span className="mb-2 inline-block rounded-md bg-pine-soft px-2.5 py-0.5 text-xs font-bold uppercase text-pine">
          Step 3 of 6
        </span>
        <h2 className="mt-2 text-2xl text-ink">Lactation / Gestation Stage</h2>
        <p className="mt-1 text-xs text-ink-soft">Stage adjusts energy and protein requirements in the estimate.</p>
      </div>

      <div className="space-y-3">
        {[
          { stage: 'Early (1-3 Mo)', desc: 'Higher energy demand; body-condition loss risk.' },
          { stage: 'Peak (3-6 Mo)', desc: 'Maximum yield window; protein-forward concentrate.' },
          { stage: 'Late (6-10 Mo)', desc: 'Yield declining; moderate energy.' },
          { stage: 'Dry Period', desc: 'Pre-calving; controlled energy intake.' },
        ].map((st) => {
          const selected = formData.lactationStage === st.stage;
          return (
            <button
              key={st.stage}
              onClick={() => handleLactationSelect(st.stage)}
              className={`w-full cursor-pointer rounded-2xl border p-4 text-left transition-all ${
                selected ? 'border-pine bg-pine-soft ring-2 ring-pine/20' : 'border-line bg-cream hover:bg-pine-soft/50'
              }`}
            >
              <div className="text-sm font-bold text-ink">{st.stage}</div>
              <div className="mt-0.5 text-xs text-ink-soft">{st.desc}</div>
            </button>
          );
        })}
      </div>

      {!confirmedFields.has('lactationStage') && (
        <div className="flex items-center gap-2 rounded-xl bg-ochre-soft p-3 text-[10px] text-ink">
          <AlertTriangle className="h-4 w-4 text-ochre" />
          <span>Please select a lactation stage.</span>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line pt-4">
        <button onClick={() => setStep(2)} className="flex cursor-pointer items-center gap-1 text-xs font-bold text-ink-soft hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <button
          onClick={() => setStep(4)}
          disabled={!canProceed(['lactationStage'])}
          className="btn btn-primary disabled:opacity-50"
        >
          <span>Continue</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const step4 = (
    <div className="card space-y-6 p-6 sm:p-8">
      <div>
        <span className="mb-2 inline-block rounded-md bg-pine-soft px-2.5 py-0.5 text-xs font-bold uppercase text-pine">
          Step 4 of 6
        </span>
        <h2 className="mt-2 text-2xl text-ink">Primary Goals</h2>
        <p className="mt-1 text-xs text-ink-soft">Pick one or more targets for the ration estimate.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 text-left text-xs font-bold transition-all ${
                selected ? 'border-pine bg-pine-soft text-pine ring-2 ring-pine/20' : 'border-line bg-cream text-ink'
              }`}
            >
              <span>{goal}</span>
              {selected && <Check className="h-4 w-4 text-pine" />}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-xs font-bold">
          <span className="text-ink">Target milk fat %:</span>
          <span className="text-sm text-pine">{formData.fatPercentTarget}%</span>
        </div>
        <input
          type="range"
          min="3"
          max="9"
          step="0.5"
          value={formData.fatPercentTarget}
          onChange={(e) => handleFatTarget(parseFloat(e.target.value))}
          className="w-full cursor-pointer accent-pine"
        />
        <div className="mt-1 flex justify-between text-[10px] text-ink-soft">
          <span>3.0%</span>
          <span>6.0%</span>
          <span>9.0%</span>
        </div>
      </div>

      {formData.healthGoals.length === 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-ochre-soft p-3 text-[10px] text-ink">
          <AlertTriangle className="h-4 w-4 text-ochre" />
          <span>Please select at least one goal.</span>
        </div>
      )}
      {formData.fatPercentTarget === 0 && (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-ochre-soft p-3 text-[10px] text-ink">
          <AlertTriangle className="h-4 w-4 text-ochre" />
          <span>Please set a target fat percentage.</span>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line pt-4">
        <button onClick={() => setStep(3)} className="flex cursor-pointer items-center gap-1 text-xs font-bold text-ink-soft hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <button
          onClick={() => setStep(5)}
          disabled={formData.healthGoals.length === 0 || formData.fatPercentTarget === 0}
          className="btn btn-primary disabled:opacity-50"
        >
          <span>Continue</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const step5 = (
    <div className="card space-y-6 p-6 sm:p-8">
      <div>
        <span className="mb-2 inline-block rounded-md bg-pine-soft px-2.5 py-0.5 text-xs font-bold uppercase text-pine">
          Step 5 of 6
        </span>
        <h2 className="mt-2 text-2xl text-ink">Current Feed Being Used</h2>
        <p className="mt-1 text-xs text-ink-soft">What are you currently feeding your cattle?</p>
      </div>

      <div>
        <select
          value={formData.currentFeedType}
          onChange={(e) => handleFeedType(e.target.value)}
          className="field w-full"
        >
          <option value="">-- Select current feed --</option>
          <option value="Local Cottonseed Cake & Wheat Straw">Local cottonseed cake & wheat straw</option>
          <option value="Home-made Mash Feed Mix">Home-made mash feed mix</option>
          <option value="Standard Local Pellet Feed">Standard local pellet feed</option>
          <option value="Green Napier Fodder + Dry Straw">Green napier fodder + dry straw</option>
          <option value="Commercial Compound Feed">Commercial compound feed</option>
        </select>
      </div>

      {!formData.currentFeedType && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-ochre-soft p-3 text-[10px] text-ink">
          <AlertTriangle className="h-4 w-4 text-ochre" />
          <span>Please select your current feed type.</span>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line pt-4">
        <button onClick={() => setStep(4)} className="flex cursor-pointer items-center gap-1 text-xs font-bold text-ink-soft hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <button
          onClick={handleCalculateRation}
          disabled={!formData.currentFeedType}
          className="btn btn-primary disabled:opacity-50"
        >
          <Calculator className="h-4 w-4" />
          <span>Calculate feed plan</span>
        </button>
      </div>
    </div>
  );

  const step6 = (
    <div className="card space-y-6 p-6 sm:p-8 shadow-lg">
      <div className="border-b border-line pb-4 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-pine-soft text-pine">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <span className="inline-block rounded-full border border-pine/20 bg-pine-soft px-3 py-1 text-xs font-bold uppercase text-pine">
          Feed plan estimate ready
        </span>
        <h2 className="mt-2 text-2xl text-ink">Recommended ration plan</h2>
        <p className="mt-1 text-xs text-ink-soft">
          For {formData.numberOfAnimals} {formData.animalType}
          {formData.numberOfAnimals > 1 ? 's' : ''} giving {formData.milkYieldLiters} L daily milk.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-pine/20 bg-pine-soft p-3 text-center">
          <div className="text-xs font-semibold text-ink-soft">Daily ration / animal</div>
          <div className="mt-0.5 text-base text-pine">{recommendationResult?.dailyRationKg} kg</div>
        </div>
        <div className="rounded-2xl border border-ochre/20 bg-ochre-soft p-3 text-center">
          <div className="text-xs font-semibold text-ink-soft">Target fat test</div>
          <div className="mt-0.5 text-base text-ink">{recommendationResult?.targetFatPercent}%</div>
        </div>
        <div className="col-span-2 rounded-2xl border border-line bg-cream p-3 text-center sm:col-span-1">
          <div className="text-xs font-semibold text-ink-soft">Est. monthly cost</div>
          <div className="mt-0.5 text-base text-ink">
            ₹{recommendationResult?.monthlyCostEstimate.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink">Recommended products (current catalogue prices):</h3>
        {recommendationResult?.recommendedProducts.map((rec, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-cream p-4">
            <div className="flex items-center gap-3">
              <ProductImage src={rec.product.image} alt={rec.product.name} className="h-14 w-14 shrink-0 rounded-xl" />
              <div>
                <div className="text-[10px] font-bold uppercase text-pine">{rec.product.brand}</div>
                <div className="text-xs font-bold text-ink sm:text-sm">{rec.product.name}</div>
                <p className="mt-0.5 text-[11px] text-ink-soft">{rec.reasoning}</p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-bold text-ink">₹{rec.product.price.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-ink-soft">{rec.product.weightOptions[0]?.weightKg} kg bag</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-cream p-4">
        <h4 className="mb-2 text-xs font-bold uppercase text-ink">Notes</h4>
        <ul className="list-disc space-y-1 pl-4 text-xs text-ink-soft">
          {recommendationResult?.healthBenefits.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>

      {recommendationResult && (
        <div className="flex items-start gap-2 rounded-2xl border border-ochre/30 bg-ochre-soft p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ochre" />
          <p className="text-[11px] leading-relaxed text-ink">{recommendationResult.disclaimer}</p>
        </div>
      )}

      <div className="flex flex-col items-center justify-between gap-4 border-t border-line pt-4 sm:flex-row">
        <button onClick={() => setStep(1)} className="cursor-pointer text-xs font-bold text-ink-soft hover:text-ink">
          Recalculate
        </button>
        <button onClick={handleAddBundleToCart} className="btn btn-primary w-full sm:w-auto">
          <ShoppingBag className="h-4 w-4" />
          <span>Add bundle to cart</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="card mb-8 p-6">
          <div className="mb-3 flex items-center justify-between text-xs font-bold text-ink-soft">
            <span className="flex items-center gap-1.5 text-pine">
              <Calculator className="h-4 w-4" />
              <span>Smart ration calculator</span>
            </span>
            <span>Step {step} of 6</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-cream">
            <div className="h-full bg-pine transition-all duration-300" style={{ width: `${(step / 6) * 100}%` }} />
          </div>
        </div>

        {step === 1 && step1}
        {step === 2 && step2}
        {step === 3 && step3}
        {step === 4 && step4}
        {step === 5 && step5}
        {step === 6 && recommendationResult && step6}
      </div>
    </div>
  );
};
