import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LocateFixed, PackageSearch, SlidersHorizontal, Store } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { vendorService, type VendorQuery } from '@/services/vendorService';
import { productService } from '@/services/productService';
import { Button, EmptyState, ErrorState, Input, PageHeader, SearchInput, Select, SkeletonGrid, Tabs } from '@/components/ui';
import { VendorCard } from '@/components/customer/VendorCard';
import { ProductCard, cartVendorFromProduct } from '@/components/customer/ProductCard';
import { useAddToCart } from '@/components/customer/useAddToCart';
import { PRODUCT_CATEGORIES, SEARCH_RADIUS_OPTIONS, VENDOR_CATEGORIES } from '@/utils/constants';

type Tab = 'shops' | 'products';

export default function VendorListingPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'shops';
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const radius = Number(params.get('radius')) || 10;
  const sort = (params.get('sort') as VendorQuery['sort']) || 'distance';
  const openNow = params.get('open') === '1';
  const minPrice = params.get('min') ?? '';
  const maxPrice = params.get('max') ?? '';
  const inStock = params.get('stock') === '1';

  const debouncedQ = useDebounce(q);
  const debouncedMin = useDebounce(minPrice);
  const debouncedMax = useDebounce(maxPrice);
  const { location, locate, locating } = useCurrentLocation();
  const { add, dialog } = useAddToCart();

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '') next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
  };

  const vendors = useAsync(
    () =>
      vendorService.list({
        latitude: location.latitude,
        longitude: location.longitude,
        radius_km: radius,
        search: debouncedQ || undefined,
        category: category || undefined,
        open_now: openNow || undefined,
        sort,
      }),
    [tab, debouncedQ, category, radius, sort, openNow, location.latitude, location.longitude],
    tab === 'shops',
  );

  const products = useAsync(
    () =>
      productService.list({
        search: debouncedQ || undefined,
        category: category || undefined,
        min_price: debouncedMin ? Number(debouncedMin) : undefined,
        max_price: debouncedMax ? Number(debouncedMax) : undefined,
        available: inStock || undefined,
      }),
    [tab, debouncedQ, category, debouncedMin, debouncedMax, inStock],
    tab === 'products',
  );

  const categoryOptions = useMemo(
    () => (tab === 'shops' ? VENDOR_CATEGORIES : PRODUCT_CATEGORIES).map((c) => ({ value: c, label: c })),
    [tab],
  );
  const hasFilters = !!(q || category || openNow || minPrice || maxPrice || inStock || radius !== 10);

  return (
    <div>
      <PageHeader title="Browse" description="Discover shops and products around you." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs<Tab>
          tabs={[
            { value: 'shops', label: 'Shops' },
            { value: 'products', label: 'Products' },
          ]}
          value={tab}
          onChange={(t) => update({ tab: t === 'shops' ? null : t, category: null })}
        />
        <SearchInput
          value={q}
          onChange={(v) => update({ q: v })}
          placeholder={tab === 'shops' ? 'Search shops…' : 'Search products…'}
          className="sm:w-80"
        />
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <SlidersHorizontal className="mb-2.5 hidden h-4 w-4 text-slate-400 sm:block" aria-hidden />
        <Select
          label="Category"
          value={category}
          onChange={(e) => update({ category: e.target.value })}
          placeholder="All categories"
          options={categoryOptions}
          wrapperClassName="w-full sm:w-48"
        />
        {tab === 'shops' ? (
          <>
            <Select
              label="Within"
              value={String(radius)}
              onChange={(e) => update({ radius: e.target.value === '10' ? null : e.target.value })}
              options={SEARCH_RADIUS_OPTIONS.map((r) => ({ value: String(r), label: `${r} km` }))}
              wrapperClassName="w-[calc(50%-0.375rem)] sm:w-32"
            />
            <Select
              label="Sort by"
              value={sort}
              onChange={(e) => update({ sort: e.target.value === 'distance' ? null : e.target.value })}
              options={[
                { value: 'distance', label: 'Nearest' },
                { value: 'rating', label: 'Top rated' },
                { value: 'name', label: 'Name' },
              ]}
              wrapperClassName="w-[calc(50%-0.375rem)] sm:w-36"
            />
            <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={openNow}
                onChange={(e) => update({ open: e.target.checked ? '1' : null })}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Open now
            </label>
            <Button
              variant="ghost"
              size="sm"
              className="h-10"
              loading={locating}
              leftIcon={<LocateFixed className="h-4 w-4" />}
              onClick={() => void locate()}
            >
              Update location
            </Button>
          </>
        ) : (
          <>
            <Input
              label="Min price"
              type="number"
              min={0}
              inputMode="decimal"
              value={minPrice}
              onChange={(e) => update({ min: e.target.value })}
              wrapperClassName="w-[calc(50%-0.375rem)] sm:w-28"
            />
            <Input
              label="Max price"
              type="number"
              min={0}
              inputMode="decimal"
              value={maxPrice}
              onChange={(e) => update({ max: e.target.value })}
              wrapperClassName="w-[calc(50%-0.375rem)] sm:w-28"
            />
            <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => update({ stock: e.target.checked ? '1' : null })}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              In stock only
            </label>
          </>
        )}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-10"
            onClick={() => setParams(tab === 'products' ? { tab } : {}, { replace: true })}
          >
            Clear filters
          </Button>
        )}
      </div>

      {tab === 'shops' ? (
        vendors.loading ? (
          <SkeletonGrid />
        ) : vendors.error ? (
          <ErrorState message={vendors.error} onRetry={() => void vendors.reload()} />
        ) : !vendors.data?.length ? (
          <EmptyState
            icon={<Store className="h-6 w-6" />}
            title="No shops match your filters"
            description="Try widening the distance or clearing some filters."
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-500">
              {vendors.data.length} shop{vendors.data.length === 1 ? '' : 's'} found
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vendors.data.map((v) => (
                <VendorCard key={v.id} vendor={v} />
              ))}
            </div>
          </>
        )
      ) : products.loading ? (
        <SkeletonGrid count={8} className="lg:grid-cols-4" />
      ) : products.error ? (
        <ErrorState message={products.error} onRetry={() => void products.reload()} />
      ) : !products.data?.length ? (
        <EmptyState
          icon={<PackageSearch className="h-6 w-6" />}
          title={q ? `No products found for “${q}”` : 'No products found'}
          description="Check the spelling or try a broader search."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.data.map((p) => (
            <ProductCard key={p.id} product={p} vendor={cartVendorFromProduct(p)} onAdd={add} showVendor />
          ))}
        </div>
      )}
      {dialog}
    </div>
  );
}
