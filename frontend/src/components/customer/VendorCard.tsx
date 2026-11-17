import { Link } from 'react-router-dom';
import { Clock, MapPin, Star, Store } from 'lucide-react';
import type { Vendor } from '@/types';
import { Badge, ImageWithFallback } from '@/components/ui';
import { formatCurrency, formatDistance } from '@/utils/format';

export function VendorCard({ vendor }: { vendor: Vendor }) {
  return (
    <Link
      to={`/vendors/${vendor.id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <div className="relative">
        <ImageWithFallback
          src={vendor.banner_url ?? vendor.logo_url}
          alt={vendor.name}
          className="h-36 w-full"
          fallbackIcon={<Store className="h-8 w-8" />}
        />
        {!vendor.is_open && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-900">Closed now</span>
          </div>
        )}
        {vendor.logo_url && vendor.banner_url && (
          <img
            src={vendor.logo_url}
            alt=""
            className="absolute -bottom-5 left-4 h-11 w-11 rounded-xl border-2 border-white bg-white object-cover shadow"
          />
        )}
      </div>
      <div className="p-4 pt-6">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold text-slate-900 group-hover:text-brand-700">{vendor.name}</h3>
          {vendor.rating != null && (
            <span className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">
              <Star className="h-3 w-3 fill-current" aria-hidden /> {vendor.rating.toFixed(1)}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-slate-500">{vendor.category}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {vendor.distance_km != null && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden /> {formatDistance(vendor.distance_km)}
            </span>
          )}
          {vendor.avg_prep_minutes != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden /> ~{vendor.avg_prep_minutes} min
            </span>
          )}
          {vendor.delivery_fee != null && (
            <Badge tone={vendor.delivery_fee === 0 ? 'green' : 'gray'}>
              {vendor.delivery_fee === 0 ? 'Free delivery' : `${formatCurrency(vendor.delivery_fee)} delivery`}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
