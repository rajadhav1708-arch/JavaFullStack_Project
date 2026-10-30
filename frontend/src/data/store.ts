/**
 * Single source of truth for the shop's public identity.
 *
 * These values are the ones already used across the repository. Update this
 * file — not individual components — when the real business details change.
 */
export const STORE = {
  name: 'Hindavi Traders',
  tagline: 'Cattle feed & farm supply',
  region: 'Kolhapur, Maharashtra',
  phone: '+91 98223 11000',
  phoneHref: 'tel:+919822311000',
  email: 'pratikgunjal.demo@gmail.com',
  emailHref: 'mailto:pratikgunjal.demo@gmail.com',
  gstNote: 'GST invoice included with every order',
} as const;
