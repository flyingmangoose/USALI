import { notFound } from 'next/navigation';
import { getProperty, listPeriods } from '@/lib/db';
import Workspace from '@/components/Workspace';

export const dynamic = 'force-dynamic';

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = getProperty(Number(id));
  if (!property) notFound();
  const periods = listPeriods(property.id);
  return <Workspace property={property} initialPeriods={periods} />;
}
