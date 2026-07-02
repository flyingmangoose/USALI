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

export interface DeptData { rev: number; labor: number; other: number }
export interface ExpOnly { exp: number }

export interface PeriodData {
  stats: { sold: number };
  rooms: RoomsData;
  fb: DeptData;      // Schedule 2
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

export function emptyPeriodData(): PeriodData {
  return {
    stats: { sold: 0 },
    rooms: emptyRooms(),
    fb: { rev: 0, labor: 0, other: 0 },
    ood: { rev: 0, labor: 0, other: 0 },
    misc: { rev: 0 },
    ag: { exp: 0 }, it: { exp: 0 }, sm: { exp: 0 }, pom: { exp: 0 }, util: { exp: 0 },
    mgmtFee: { base: 0, incentive: 0 },
    nonop: { rent: 0, tax: 0, insurance: 0, other: 0 },
    reserve: 0,
  };
}

/** Deep-merge stored JSON over an empty skeleton so schema additions never break old rows. */
export function normalizePeriodData(raw: unknown): PeriodData {
  const base = emptyPeriodData() as unknown as Record<string, unknown>;
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (!(k in base)) continue;
      if (typeof base[k] === 'object' && base[k] !== null && typeof v === 'object' && v !== null) {
        Object.assign(base[k] as object, Object.fromEntries(
          Object.entries(v as Record<string, unknown>).filter(([kk]) => kk in (base[k] as object))
        ));
      } else if (typeof base[k] === 'number' && typeof v === 'number') {
        base[k] = v;
      }
    }
  }
  return base as unknown as PeriodData;
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
