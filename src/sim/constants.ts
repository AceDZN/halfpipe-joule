import type { Surface } from './track';

/** Workbook's value: g = 10 m/s² (N/kg). */
export const G = 10;

/**
 * Rolling-friction coefficients (approximate, chosen to be in a realistic
 * range for skateboard wheels and to make the difference visible).
 */
export const MU: Record<Surface, number> = {
  smooth: 0.01, // polished skate-park concrete
  concrete: 0.016, // promenade concrete
  wood: 0.012,
  asphalt: 0.05, // rough patched asphalt
  sand: 0.22, // wheels sink into sand
  brake: 0.45, // rubber braking strip: the rider drags a foot
};

export const SURFACE_HE: Record<Surface, string> = {
  smooth: 'בטון חלק',
  concrete: 'בטון',
  wood: 'עץ',
  asphalt: 'אספלט מחוספס',
  sand: 'חול',
  brake: 'רצועת בלימה',
};

/** A well-timed pump adds work equal to lifting yourself this high (m·g·h). */
export const PUMP_LIFT = 0.3;
/** A pump at the wrong moment scrubs speed: this much m·g·h becomes heat. */
export const SCRUB_LIFT = 0.04;
/** Ollie pop speed perpendicular to the ramp (m/s); work = ½·m·v². */
export const OLLIE_POP = 2.4;
/** Landing with more speed than this into the ground = bail. */
export const BAIL_VN = 5.2;
/** Grip that keeps a stopped board from creeping on gentle slopes. */
export const REST_TAN = 0.06;
/** Fixed physics substep (s). */
export const SUBSTEP = 1 / 240;
/** Bounce restitution against a deck's back wall (speed ratio). */
export const BOUNCE_E = 0.5;
