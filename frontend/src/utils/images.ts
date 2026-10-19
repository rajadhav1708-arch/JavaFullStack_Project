/**
 * Helpers for the responsive product photography in `public/products`.
 *
 * Every SKU has three WebP derivatives (400/800/1600 long edge) produced by
 * `scripts/optimise_product_images.py`. Products whose image is still a remote
 * Unsplash URL have no derivatives, so these functions pass those through
 * untouched rather than producing a broken srcset.
 */

const DERIVATIVE_SUFFIX = /-\d+\.webp$/;

/** True when the product has locally generated responsive derivatives. */
export function hasDerivatives(image: string): boolean {
  return DERIVATIVE_SUFFIX.test(image);
}

/**
 * The `srcSet` for a product image, so a phone downloads the 400px file
 * instead of the 1600px one. Returns undefined for remote images.
 */
export function imageSrcSet(image: string, widths: number[] = [400, 800, 1600]): string | undefined {
  if (!hasDerivatives(image)) return undefined;
  const base = image.replace(DERIVATIVE_SUFFIX, '');
  return widths.map((w) => `${base}-${w}.webp ${w}w`).join(', ');
}

/** The full-size derivative, for the detail modal. Falls back to the card image. */
export function detailImage(image: string): string {
  if (!hasDerivatives(image)) return image;
  return image.replace(DERIVATIVE_SUFFIX, '-1600.webp');
}