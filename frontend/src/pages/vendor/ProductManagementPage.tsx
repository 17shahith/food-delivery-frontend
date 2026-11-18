import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Pencil, Plus, ShoppingBasket, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAsync } from '@/hooks/useAsync';
import { productService } from '@/services/productService';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  ImageWithFallback,
  PageHeader,
  SearchInput,
  Select,
  SkeletonList,
  Tabs,
  Toggle,
} from '@/components/ui';
import { getErrorMessage } from '@/utils/errors';
import { formatCurrency } from '@/utils/format';
import type { Product } from '@/types';

type Filter = 'all' | 'available' | 'unavailable';

export default function ProductManagementPage() {
  const navigate = useNavigate();
  const products = useAsync(() => productService.mine(), []);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);

  const all = products.data ?? [];
  const categories = useMemo(() => Array.from(new Set(all.map((p) => p.category))).sort(), [all]);
  const shown = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter(
      (p) =>
        (!s || p.name.toLowerCase().includes(s)) &&
        (!category || p.category === category) &&
        (filter === 'all' || (filter === 'available' ? p.is_available : !p.is_available)),
    );
  }, [all, search, category, filter]);

  const toggle = async (p: Product, next: boolean) => {
    setToggling(p.id);
    products.setData((prev) => prev?.map((x) => (x.id === p.id ? { ...x, is_available: next } : x)));
    try {
      await productService.setAvailability(p.id, next);
      toast.success(`${p.name} is now ${next ? 'available' : 'unavailable'}`);
    } catch (err) {
      products.setData((prev) => prev?.map((x) => (x.id === p.id ? { ...x, is_available: !next } : x)));
      toast.error(getErrorMessage(err));
    } finally {
      setToggling(null);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await productService.remove(deleting.id);
      products.setData((prev) => prev?.filter((x) => x.id !== deleting.id));
      toast.success('Product deleted');
      setDeleting(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const availableCount = all.filter((p) => p.is_available).length;

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your catalogue and what's in stock."
        actions={
          <Link to="/vendor/products/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Add product</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs<Filter>
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: 'all', label: 'All', count: all.length },
            { value: 'available', label: 'Available', count: availableCount },
            { value: 'unavailable', label: 'Unavailable', count: all.length - availableCount },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Search products…" className="sm:w-64" />
          <Select
            aria-label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="All categories"
            options={categories.map((c) => ({ value: c, label: c }))}
            wrapperClassName="sm:w-48"
          />
        </div>
      </div>

      {products.loading ? (
        <SkeletonList rows={5} />
      ) : products.error ? (
        <ErrorState message={products.error} onRetry={() => void products.reload()} />
      ) : !all.length ? (
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title="No products yet"
          description="Add your first product so customers can start ordering."
          action={
            <Link to="/vendor/products/new">
              <Button leftIcon={<Plus className="h-4 w-4" />}>Add product</Button>
            </Link>
          }
        />
      ) : !shown.length ? (
        <EmptyState title="No products match" description="Try clearing the search or filters." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-card">
          {/* Desktop table */}
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3 text-right">Price</th>
                <th className="px-5 py-3 text-right">Stock</th>
                <th className="px-5 py-3">Available</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <ImageWithFallback src={p.image_url} alt={p.name} className="h-10 w-10 rounded-lg" fallbackIcon={<ShoppingBasket className="h-4 w-4" />} />
                      <span className="font-medium text-slate-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{p.category}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-900">
                    {formatCurrency(p.price)}
                    {p.unit && <span className="text-slate-400"> /{p.unit}</span>}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-600">{p.stock ?? '—'}</td>
                  <td className="px-5 py-3">
                    <Toggle
                      checked={p.is_available}
                      onChange={(v) => void toggle(p, v)}
                      disabled={toggling === p.id}
                      label={`${p.name} availability`}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/vendor/products/${p.id}/edit`)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(p)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile list */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {shown.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-4">
                <ImageWithFallback src={p.image_url} alt={p.name} className="h-12 w-12 shrink-0 rounded-lg" fallbackIcon={<ShoppingBasket className="h-4 w-4" />} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{p.name}</p>
                  <p className="text-sm text-slate-500">
                    {formatCurrency(p.price)} · {p.category}
                  </p>
                  {!p.is_available && <Badge tone="gray" className="mt-1">Unavailable</Badge>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Toggle checked={p.is_available} onChange={(v) => void toggle(p, v)} disabled={toggling === p.id} label={`${p.name} availability`} />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => navigate(`/vendor/products/${p.id}/edit`)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                      aria-label={`Edit ${p.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(p)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${p.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        title="Delete product?"
        message={deleting ? `“${deleting.name}” will be permanently removed from your catalogue.` : ''}
        confirmLabel="Delete"
        tone="danger"
      />
    </div>
  );
}
