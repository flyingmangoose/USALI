import { notFound } from 'next/navigation';
import { getProperty, listPeriods } from '@/lib/db';
import { authEnabled } from '@/lib/auth';
import { isValidPeriod } from '@/lib/fiscal';
import Workspace from '@/components/Workspace';
import ErrorBoundary from '@/components/ErrorBoundary';

export const dynamic = 'force-dynamic';

const VALID_VIEWS = new Set(['dashboard', 'trends', 'rooms', 'fb', 'other', 'undist', 'fixed', 'budget', 'gst', 'daily', 'import', 'summary', 'settings']);

export default async function PropertyPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string; period?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const property = getProperty(Number(id));
  if (!property) notFound();
  const periods = listPeriods(property.id);
  const initialView = sp.v && VALID_VIEWS.has(sp.v) ? sp.v : 'dashboard';
  const initialPeriod = sp.period && isValidPeriod(sp.period) ? sp.period : undefined;
  return (
    <ErrorBoundary>
      <Workspace
        property={property}
        initialPeriods={periods}
        initialView={initialView}
        initialPeriod={initialPeriod}
        authEnabled={authEnabled()}
      />
    </ErrorBoundary>
  );
}