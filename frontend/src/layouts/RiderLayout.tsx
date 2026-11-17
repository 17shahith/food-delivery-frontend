import { LocationSharingProvider } from '@/contexts/LocationSharingContext';
import { DashboardLayout } from './DashboardLayout';

/** Rider routes share one GPS stream that survives navigation between rider pages. */
export function RiderLayout() {
  return (
    <LocationSharingProvider>
      <DashboardLayout />
    </LocationSharingProvider>
  );
}
