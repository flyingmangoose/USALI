/**
 * USALI 11th-edition calculation engine.
 * Ported 1:1 from the source workbook formulas (see usali-prototype.html and
 * "USALI Hotel Accounting Templates_BSG.xlsx"). Pure functions, no I/O.
 */

export interface RoomsData {
  // Revenue — transient segments
  retail: number; discount: number; negotiated: number; qualified: number; wholesale: number;
  // Revenue — group segments
  corporate: number; assoc: number; govt: number; tour: number; smerf: number;
  contract: number; other: number; allowances: number;
  // Labor — salaries & wages
  salMgmt: number; salFront: number; salGuest: number; salHK: number;
  salLaundry: number; salRes: number; salTransport: number;
  svcCharge: number; contractLabor: number; bonus: number;
  // Payroll-related
  payTax: number; suppPay: number; benefits: number;
  // Other expenses
  cleaning: number; commissions: number; compFB: number; contractSvc: number;
  guestSupplies: number; laundryDC: number; linen: number; opSupplies: number;
  reservations: number; training: number; uniforms: number; miscRooms: number;
}

/** F&B outlet revenue breakdown (Schedule 2 detail). */
export interface FBOutlets { restaurant: number; banquet: number; roomService: number; bar: number; other: number }
/** F&B cost of sales (Schedule 2 detail). */
export interface FBCost { food: number; beverage: number }
/** F&B labor detail (Schedule 2). */
export interface FBLabor { sal: number; svcCharge: number; contractLabor: number; bonus: number; payTax: number; suppPay: number; benefits: number }
/** F&B other operating expenses detail (Schedule 2). */
export interface FBOther { cleaning: number; laundry: number; supplies: number; misc: number }

export interface FBData {
  rev: number; labor: number; other: number;  // Authoritative aggregates used by the roll-up
  outlets: FBOutlets;   // Revenue by outlet — sums into `rev` when edited in the F&B view
  cost: FBCost;         // Cost of food / beverage — sums into `other`
  laborD: FBLabor;      // Labor detail — sums into `labor`
  otherD: FBOther;      // Other-expense detail — sums into `other`
}

export interface DeptData { rev: number; labor: number; other: number }
export interface ExpOnly { exp: number }

export interface PeriodData {
  stats: { sold: number };
  rooms: RoomsData;
  fb: FBData;      // Schedule 2
  ood: DeptData;     // Schedule 3 — other operated departments
  misc: { rev: number }; // Schedule 4 — miscellaneous income
  ag: ExpOnly; it: ExpOnly; sm: ExpOnly; pom: ExpOnly; util: ExpOnly; // Sch 5–9
  mgmtFee: { base: number; incentive: number };  // Sch 10
  nonop: { rent: number; tax: number; insurance: number; other: number }; // Sch 11
  reserve: number;   // FF&E replacement reserve
}

export function emptyRooms(): RoomsData {
  return {
    retail: 0, discount: 0, negotiated: 0, qualified: 0, wholesale: 0,
    corporate: 0, assoc: 0, govt: 0, tour: 0, smerf: 0,
    contract: 0, other: 0, allowances: 0,
    salMgmt: 0, salFront: 0, salGuest: 0, salHK: 0, salLaundry: 0, salRes: 0, salTransport: 0,
    svcCharge: 0, contractLabor: 0, bonus: 0,
    payTax: 0, suppPay: 0, benefits: 0,
    cleaning: 0, commissions: 0, compFB: 0, contractSvc: 0, guestSupplies: 0,
    laundryDC: 0, linen: 0, opSupplies: 0, reservations: 0, training: 0,
    uniforms: 0, miscRooms: 0,
  };
}

export function emptyFB(): FBData {
  return {
    rev: 0, labor: 0, other: 0,
    outlets: { restaurant: 0, banquet: 0, roomService: 0, bar: 0, other: 0 },
    cost: { food: 0, beverage: 0 },
    laborD: { sal: 0, svcCharge: 0, contractLabor: 0, bonus: 0, payTax: 0, suppPay: 0, benefits: 0 },
    otherD: { cleaning: 0, laundry: 0, supplies: 0, misc: 0 },
  };
}

export function emptyPeriodData(): PeriodData {
  return {
    stats: { sold: 0 },
    rooms: emptyRooms(),
    fb: emptyFB(),
    ood: { rev: 0, labor: 0, other: 0 },
    misc: { rev: 0 },
    ag: { exp: 0 }, it: { exp: 0 }, sm: { exp: 0 }, pom: { exp: 0 }, util: { exp: 0 },
    mgmtFee: { base: 0, incentive: 0 },
    nonop: { rent: 0, tax: 0, insurance: 0, other: 0 },
    reserve: 0,
  };
}

/** Deep-merge stored JSON over an empty skeleton so schema additions never break
 *  old rows. Recurses through nested objects (fb.outlets, fb.cost, …) so partial
 *  detail never clobbers the zero-filled defaults on the rest of the object. */
function isPlainObj(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}
export function normalizePeriodData(raw: unknown): PeriodData {
  const base = emptyPeriodData();
  const merge = (target: Record<string, unknown>, src: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(src)) {
      if (!(k in target)) continue;
      const tv = target[k];
      if (isPlainObj(tv) && isPlainObj(v)) merge(tv as Record<string, unknown>, v);
      else if (typeof tv === 'number' && typeof v === 'number') target[k] = v;
    }
  };
  if (isPlainObj(raw)) merge(base as unknown as Record<string, unknown>, raw);
  return base;
}

export interface RoomsCalc {
  transient: number; group: number; totalRev: number;
  sw: number; totalLaborWages: number; payroll: number; totalLabor: number;
  otherExp: number; totalExp: number; profit: number;
}

export function calcRooms(r: RoomsData): RoomsCalc {
  const transient = r.retail + r.discount + r.negotiated + r.qualified + r.wholesale;
  const group = r.corporate + r.assoc + r.govt + r.tour + r.smerf;
  const totalRev = transient + group + r.contract + r.other - r.allowances;
  const sw = r.salMgmt + r.salFront + r.salGuest + r.salHK + r.salLaundry + r.salRes + r.salTransport;
  const totalLaborWages = sw + r.svcCharge + r.contractLabor + r.bonus;
  const payroll = r.payTax + r.suppPay + r.benefits;
  const totalLabor = totalLaborWages + payroll;
  const otherExp = r.cleaning + r.commissions + r.compFB + r.contractSvc + r.guestSupplies
    + r.laundryDC + r.linen + r.opSupplies + r.reservations + r.training + r.uniforms + r.miscRooms;
  const totalExp = totalLabor + otherExp;
  const profit = totalRev - totalExp;
  return { transient, group, totalRev, sw, totalLaborWages, payroll, totalLabor, otherExp, totalExp, profit };
}

export interface DeptCalc { rev: number; exp: number; profit: number }
export function deptCalc(d: DeptData): DeptCalc {
  const rev = d.rev || 0;
  const exp = (d.labor || 0) + (d.other || 0);
  return { rev, exp, profit: rev - exp };
}

/** Re-aggregate the F&B detail (outlets/cost/labor/other) into rev/labor/other. */
export function recomputeFBAggregates(fb: FBData): void {
  const o = fb.outlets || emptyFB().outlets, c = fb.cost || emptyFB().cost;
  const l = fb.laborD || emptyFB().laborD, od = fb.otherD || emptyFB().otherD;
  const outletSum = o.restaurant + o.banquet + o.roomService + o.bar + o.other;
  const laborSum = l.sal + l.svcCharge + l.contractLabor + l.bonus + l.payTax + l.suppPay + l.benefits;
  const otherSum = c.food + c.beverage + od.cleaning + od.laundry + od.supplies + od.misc;
  if (outletSum) fb.rev = outletSum;
  if (laborSum) fb.labor = laborSum;
  if (otherSum) fb.other = otherSum;
}

/** Whether any F&B detail has been entered (else the aggregates stand alone). */
export function fbHasDetail(fb: FBData): boolean {
  const o = fb.outlets || emptyFB().outlets, c = fb.cost || emptyFB().cost;
  const l = fb.laborD || emptyFB().laborD, od = fb.otherD || emptyFB().otherD;
  return !!(o.restaurant || o.banquet || o.roomService || o.bar || o.other
    || c.food || c.beverage
    || l.sal || l.svcCharge || l.contractLabor || l.bonus || l.payTax || l.suppPay || l.benefits
    || od.cleaning || od.laundry || od.supplies || od.misc);
}

export interface Totals {
  R: RoomsCalc; fb: DeptCalc; ood: DeptCalc; miscRev: number;
  totalRev: number; deptExp: number; deptProfit: number;
  undist: number; gop: number; mgmt: number; incomeAfterMgmt: number;
  nonop: number; ebitda: number; ebitdaLessReserve: number;
  avail: number; sold: number;
  occ: number; adr: number; revpar: number; trevpar: number; goppar: number;
}

/** Full roll-up to the Summary Operating Statement plus operating statistics. */
export function calcAll(d: PeriodData, roomsAvailable: number): Totals {
  const R = calcRooms(d.rooms);
  const fb = deptCalc(d.fb), ood = deptCalc(d.ood);
  const miscRev = d.misc.rev || 0;
  const totalRev = R.totalRev + fb.rev + ood.rev + miscRev;
  const deptExp = R.totalExp + fb.exp + ood.exp;
  const deptProfit = totalRev - deptExp; // misc income carries no departmental expense
  const undist = (d.ag.exp || 0) + (d.it.exp || 0) + (d.sm.exp || 0) + (d.pom.exp || 0) + (d.util.exp || 0);
  const gop = deptProfit - undist;
  const mgmt = (d.mgmtFee.base || 0) + (d.mgmtFee.incentive || 0);
  const incomeAfterMgmt = gop - mgmt;
  const nonop = (d.nonop.rent || 0) + (d.nonop.tax || 0) + (d.nonop.insurance || 0) + (d.nonop.other || 0);
  const ebitda = incomeAfterMgmt - nonop;
  const ebitdaLessReserve = ebitda - (d.reserve || 0);

  const avail = roomsAvailable;
  const sold = d.stats.sold || 0;
  const occ = avail ? sold / avail : 0;
  const adr = sold ? R.totalRev / sold : 0;
  const revpar = avail ? R.totalRev / avail : 0;
  const trevpar = avail ? totalRev / avail : 0;
  const goppar = avail ? gop / avail : 0;

  return {
    R, fb, ood, miscRev, totalRev, deptExp, deptProfit, undist, gop, mgmt,
    incomeAfterMgmt, nonop, ebitda, ebitdaLessReserve,
    avail, sold, occ, adr, revpar, trevpar, goppar,
  };
}

/** Pairwise difference of two Totals — used for budget vs. actual and prior-year variance. */
export function diffTotals(actual: Totals, baseline: Totals | null | undefined): Partial<Totals> | null {
  if (!baseline) return null;
  const out: Record<string, number> = {};
  for (const k of Object.keys(actual) as (keyof Totals)[]) {
    const a = actual[k], b = baseline[k];
    if (typeof a === 'number' && typeof b === 'number') out[k as string] = a - b;
  }
  return out as unknown as Partial<Totals>;
}

/* ---------- GST liability (India) ---------- */

/** Indian GST accommodation slabs by declared tariff (₹/night), keyed by upper bound. */
export const GST_ROOM_SLABS: { upTo: number; rate: number; label: string }[] = [
  { upTo: 1000, rate: 0, label: 'Nil (≤ ₹1,000)' },
  { upTo: 2500, rate: 0.12, label: '12% (₹1,001–2,500)' },
  { upTo: 7500, rate: 0.18, label: '18% (₹2,501–7,500)' },
  { upTo: Infinity, rate: 0.28, label: '28% (> ₹7,500)' },
];

export interface GSTCalc {
  roomsRate: number; roomsSlab: string; roomsGST: number;
  fbRate: number; fbGST: number;
  totalGST: number;
}

/**
 * Estimate output GST liability for an Indian hotel. Rooms tax follows the
 * ADR-based accommodation slab; F&B is taxed at the 5% composition rate typical
 * for independent hotels. Only meaningful for INR properties.
 */
export function gstCalc(roomsRev: number, fbRev: number, adr: number): GSTCalc {
  const slab = GST_ROOM_SLABS.find(s => adr <= s.upTo) ?? GST_ROOM_SLABS[GST_ROOM_SLABS.length - 1];
  const roomsRate = slab.rate;
  const roomsGST = roomsRev * roomsRate;
  const fbRate = 0.05;
  const fbGST = fbRev * fbRate;
  return { roomsRate, roomsSlab: slab.label, roomsGST, fbRate, fbGST, totalGST: roomsGST + fbGST };
}