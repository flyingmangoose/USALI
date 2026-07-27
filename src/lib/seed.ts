/**
 * Demo data for LedgerLeaf — a 42-room independent leisure hotel in Jaipur
 * with six months of USALI figures (Jan–Jun 2026, spanning FY 2025-26 → 2026-27).
 * Shared between `npm run seed` and the in-app "Load demo data" action.
 */
import { createProperty, listProperties, upsertPeriod, type Property } from './db';
import { emptyPeriodData } from './engine';
import { daysInPeriod } from './fiscal';

export const DEMO_NAME = 'Tamarind Court Hotel';

const r100 = (n: number) => Math.round(n / 100) * 100;

const MONTHS: { period: string; occ: number; adr: number; heat: number }[] = [
  { period: '2026-01', occ: 0.82, adr: 4800, heat: 0.0 },
  { period: '2026-02', occ: 0.80, adr: 4700, heat: 0.0 },
  { period: '2026-03', occ: 0.72, adr: 4300, heat: 0.15 },
  { period: '2026-04', occ: 0.62, adr: 3800, heat: 0.35 },
  { period: '2026-05', occ: 0.52, adr: 3400, heat: 0.55 },
  { period: '2026-06', occ: 0.48, adr: 3300, heat: 0.60 },
];

/**
 * Seed the demo property + six months of data. Idempotent: if the demo
 * property already exists, nothing is written and `created` is false.
 * Returns the property (existing or new) and whether it was newly created.
 */
export function seedDemoData(): { property: Property; created: boolean } {
  const existing = listProperties().find(p => p.name === DEMO_NAME);
  if (existing) return { property: existing, created: false };

  const prop = createProperty({ name: DEMO_NAME, city: 'Jaipur', rooms: 42, ccy: 'INR' });

  for (const m of MONTHS) {
    const days = daysInPeriod(m.period);
    const sold = Math.round(prop.rooms * days * m.occ);
    const gross = sold * m.adr;

    const d = emptyPeriodData();
    d.stats.sold = sold;

    // Revenue segmentation typical of an independent leisure hotel (heavy OTA/retail).
    d.rooms.retail = r100(gross * 0.56);
    d.rooms.discount = r100(gross * 0.10);
    d.rooms.negotiated = r100(gross * 0.07);
    d.rooms.qualified = r100(gross * 0.03);
    d.rooms.wholesale = r100(gross * 0.06);
    d.rooms.corporate = r100(gross * 0.08);
    d.rooms.assoc = r100(gross * 0.02);
    d.rooms.govt = r100(gross * 0.02);
    d.rooms.tour = r100(gross * 0.04);
    d.rooms.smerf = r100(gross * 0.01);
    d.rooms.contract = r100(gross * 0.015);
    d.rooms.other = r100(gross * 0.01);
    d.rooms.allowances = r100(gross * 0.015);

    // Labor — largely fixed for a 42-room property.
    d.rooms.salMgmt = 95000; d.rooms.salFront = 88000; d.rooms.salGuest = 42000;
    d.rooms.salHK = 120000; d.rooms.salLaundry = 30000; d.rooms.salRes = 25000; d.rooms.salTransport = 18000;
    d.rooms.contractLabor = 35000;
    d.rooms.bonus = m.period === '2026-03' ? 60000 : 15000; // FY-end incentives
    d.rooms.payTax = 32000; d.rooms.suppPay = 20000; d.rooms.benefits = 62000; // PF/ESI/gratuity

    // Variable costs scale with occupied rooms; OTA commissions with revenue.
    d.rooms.commissions = r100(gross * 0.09);
    d.rooms.guestSupplies = r100(sold * 45);
    d.rooms.cleaning = r100(sold * 20);
    d.rooms.opSupplies = r100(sold * 30);
    d.rooms.laundryDC = r100(sold * 18);
    d.rooms.compFB = r100(sold * 12);
    d.rooms.linen = 15000; d.rooms.reservations = 22000; d.rooms.contractSvc = 18000;
    d.rooms.training = 5000; d.rooms.uniforms = 6000; d.rooms.miscRooms = 8000;

    // F&B — restaurant + banquets, roughly a third of rooms revenue.
    d.fb.rev = r100(gross * 0.36);
    d.fb.labor = r100(d.fb.rev * 0.38);
    d.fb.other = r100(d.fb.rev * 0.36);

    // Other operated (spa + airport transfers) and misc income.
    d.ood.rev = r100(140000 * (1 - m.heat * 0.4));
    d.ood.labor = 55000; d.ood.other = 38000;
    d.misc.rev = 42000;

    // Undistributed — utilities spike with summer air-conditioning load.
    d.ag.exp = 185000; d.it.exp = 46000;
    d.sm.exp = r100(135000 * (1 + m.heat * 0.25)); // push marketing in low season
    d.pom.exp = 112000;
    d.util.exp = r100(155000 * (1 + m.heat * 0.85));

    // Self-managed independent — no management fee.
    d.mgmtFee.base = 0; d.mgmtFee.incentive = 0;
    d.nonop.tax = 62000; d.nonop.insurance = 26000; // property tax + insurance accruals
    d.reserve = r100((gross + d.fb.rev + d.ood.rev + d.misc.rev) * 0.02);

    upsertPeriod(prop.id, m.period, d);
  }

  return { property: prop, created: true };
}