import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, ShoppingBasket } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAsync } from '@/hooks/useAsync';
import { productService } from '@/services/productService';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  ImageWithFallback,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
  Toggle,
} from '@/components/ui';
import { getErrorMessage } from '@/utils/errors';
import { isValid, required, validatePrice } from '@/utils/validation';
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from '@/utils/constants';
import type { ProductInput } from '@/types';

interface FormState {
  name: string;
  description: string;
  price: string;
  category: string;
  unit: string;
  stock: string;
  image_url: string;
  is_available: boolean;
}

const empty: FormState = {
  name: '',
  description: '',
  price: '',
  category: '',
  unit: 'piece',
  stock: '',
  image_url: '',
  is_available: true,
};

const MAX_IMAGE_MB = 5;

/** Handles both "Add product" and "Edit product". */
export default function ProductEditorPage() {
  const { productId } = useParams();
  const isEdit = !!productId;
  const navigate = useNavigate();
  const existing = useAsync(() => productService.get(productId!), [productId], isEdit);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const p = existing.data;
    if (p) {
      setForm({
        name: p.name,
        description: p.description ?? '',
        price: String(p.price),
        category: p.category,
        unit: p.unit ?? 'piece',
        stock: p.stock == null ? '' : String(p.stock),
        image_url: p.image_url ?? '',
        is_available: p.is_available,
      });
    }
  }, [existing.data]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`Images must be under ${MAX_IMAGE_MB} MB.`);
      return;
    }
    setUploading(true);
    try {
      const url = await productService.uploadImage(file);
      setForm((f) => ({ ...f, image_url: url }));
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const stockN = form.stock.trim() === '' ? null : Number(form.stock);
    const errs = {
      name: required(form.name, 'Name'),
      price: validatePrice(form.price),
      category: required(form.category, 'Category'),
      stock: stockN != null && (!Number.isInteger(stockN) || stockN < 0) ? 'Stock must be a whole number ≥ 0.' : null,
    };
    setErrors(errs);
    if (!isValid(errs)) return;

    const payload: ProductInput = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: Math.round(Number(form.price) * 100) / 100,
      category: form.category,
      unit: form.unit || undefined,
      stock: stockN,
      image_url: form.image_url.trim() || undefined,
      is_available: form.is_available,
    };
    setSaving(true);
    try {
      if (isEdit) {
        await productService.update(productId!, payload);
        toast.success('Product updated');
      } else {
        await productService.create(payload);
        toast.success('Product added');
      }
      navigate('/vendor/products');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && existing.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }
  if (isEdit && existing.error) {
    return <ErrorState title="Could not load product" message={existing.error} onRetry={() => void existing.reload()} />;
  }

  return (
    <div>
      <PageHeader
        back={
          <Link to="/vendor/products" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" /> Products
          </Link>
        }
        title={isEdit ? 'Edit product' : 'Add product'}
        description={isEdit ? existing.data?.name : 'List a new item in your store.'}
      />
      <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader title="Details" />
          <CardBody className="space-y-4">
            <Input label="Product name" value={form.name} onChange={set('name')} error={errors.name} required maxLength={120} />
            <Textarea label="Description" value={form.description} onChange={set('description')} rows={4} maxLength={1000} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Category"
                value={form.category}
                onChange={set('category')}
                error={errors.category}
                placeholder="Select…"
                options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))}
                required
              />
              <Select label="Unit" value={form.unit} onChange={set('unit')} options={PRODUCT_UNITS.map((u) => ({ value: u, label: u }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Price"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={form.price}
                onChange={set('price')}
                error={errors.price}
                required
              />
              <Input
                label="Stock"
                type="number"
                inputMode="numeric"
                min={0}
                step="1"
                value={form.stock}
                onChange={set('stock')}
                error={errors.stock}
                hint="Leave empty if you don't track stock"
              />
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Image" />
            <CardBody className="space-y-3">
              <ImageWithFallback
                src={form.image_url}
                alt="Product preview"
                className="aspect-square w-full rounded-xl border border-slate-200"
                fallbackIcon={<ShoppingBasket className="h-10 w-10" />}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                fullWidth
                loading={uploading}
                leftIcon={<ImagePlus className="h-4 w-4" />}
                onClick={() => fileRef.current?.click()}
              >
                Upload image
              </Button>
              <Input label="…or image URL" type="url" value={form.image_url} onChange={set('image_url')} placeholder="https://…" />
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Available for sale</p>
                <p className="text-xs text-slate-500">Customers can add it to their cart.</p>
              </div>
              <Toggle
                checked={form.is_available}
                onChange={(v) => setForm((f) => ({ ...f, is_available: v }))}
                label="Available for sale"
              />
            </CardBody>
          </Card>
          <div className="flex gap-2">
            <Button type="button" variant="outline" fullWidth onClick={() => navigate('/vendor/products')} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={saving} disabled={uploading}>
              {isEdit ? 'Save changes' : 'Add product'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
