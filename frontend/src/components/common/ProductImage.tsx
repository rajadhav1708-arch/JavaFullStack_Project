import React from 'react';
import { imageSrcSet, detailImage } from '../../utils/images';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  /** The full 1600px derivative, used where the image is shown large. */
  full?: boolean;
  /** Tiny thumbnails in carts and order lists are already in view on open. */
  eager?: boolean;
  /** Intrinsic ratio of the derivative, reserved so the box does not shift. */
  width?: number;
  height?: number;
}

/**
 * A product photo that always picks the smallest derivative that fits and
 * reserves its space, so swapping in the real catalogue photography does not
 * introduce layout shift as the grid reflows.
 */
export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = '',
  full = false,
  eager = false,
  width,
  height,
}) => {
  const srcSet = full ? imageSrcSet(src, [800, 1600]) : imageSrcSet(src);

  return (
    <img
      src={full ? detailImage(src) : src}
      srcSet={srcSet}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
};