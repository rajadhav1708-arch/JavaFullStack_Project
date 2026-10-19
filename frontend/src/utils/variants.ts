import type { Product, ProductUnit, ProductVariant } from '../types';

/**
 * Renders a variant as a customer-facing pack label: "25 kg", "1 unit",
 * "20 pcs", "1 L".
 *
 * `weightKg` is the variant's numeric identity and is often not a weight at all
 * (a sprayer is 1, a pack of pipe fittings is 20), so the unit decides how the
 * number should be read. Units that already read as a count are left singular.
 */
export function formatVariantLabel(weightKg: number, unit: ProductUnit): string {
  const isCountable = unit === 'pcs' || unit === 'unit' || unit === 'pack' || unit === 'coil' || unit === 'box' || unit === 'set' || unit === 'roll';
  const plural = isCountable && weightKg !== 1;
  return `${weightKg} ${unit}${plural ? 's' : ''}`;
}

/**
 * The label for a cart or order line. Cart items carry only the numeric
 * variant id, so the unit is looked back up from the product rather than being
 * duplicated onto the cart item where it could drift.
 */
export function formatCartVariantLabel(
  product: Product,
  weightKg: number,
  fallbackUnit: ProductUnit = 'kg'
): string {
  const variant = product.weightOptions?.find((w) => w.weightKg === weightKg);
  return formatVariantLabel(weightKg, variant?.unit ?? fallbackUnit);
}

/** True for things you feed or apply, false for hardware and machinery. */
export function isConsumable(product: Product): boolean {
  return product.suitableFor.length > 0;
}

/**
 * Total cart contents grouped by unit, because adding kilograms to litres and
 * pieces produces a number that means nothing. Returns e.g.
 * ["50 kg", "3 L", "2 pcs"] in first-seen order.
 */
export function summariseCartUnits(
  items: { product: Product; weightKg: number; quantity: number }[]
): string[] {
  const totals = new Map<string, { total: number; unit: ProductUnit }>();

  for (const item of items) {
    const unit =
      item.product.weightOptions?.find((w) => w.weightKg === item.weightKg)?.unit ??
      item.product.unit ??
      'kg';
    const existing = totals.get(unit);
    const amount = item.weightKg * item.quantity;
    if (existing) existing.total += amount;
    else totals.set(unit, { total: amount, unit });
  }

  return [...totals.values()].map(({ total, unit }) => formatVariantLabel(total, unit));
}

/** The variants a card or modal should show as selectable pack options. */
export function productVariants(product: Product): ProductVariant[] {
  return product.weightOptions ?? [];
}