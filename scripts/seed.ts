/**
 * Seeds a demo Indian independent hotel with six months of USALI data.
 * Run: npm run seed
 */
import { seedDemoData, DEMO_NAME } from '../src/lib/seed';

const { property, created } = seedDemoData();
if (created) {
  console.log(`Seeded "${DEMO_NAME}" (id ${property.id}).`);
} else {
  console.log(`"${DEMO_NAME}" already exists (id ${property.id}) — nothing to do. Delete it in Property Settings to re-seed.`);
}