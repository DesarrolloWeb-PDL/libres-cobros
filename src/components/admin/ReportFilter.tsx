'use client';

import { StyledSelect } from '@/components/ui/styled-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const monthLabels: Record<number, string> = {
  1: 'Enero',
  2: 'Febrero',
  3: 'Marzo',
  4: 'Abril',
  5: 'Mayo',
  6: 'Junio',
  7: 'Julio',
  8: 'Agosto',
  9: 'Septiembre',
  10: 'Octubre',
  11: 'Noviembre',
  12: 'Diciembre',
};

const categories = [
  { value: 'ADULT', label: 'Adulto' },
  { value: 'FAMILY', label: 'Familia' },
  { value: 'MINOR', label: 'Menor' },
];

const methods = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'mercadopago', label: 'MercadoPago' },
  { value: 'bank_transfer', label: 'Transferencia' },
];

const statuses = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'PAID', label: 'Pagada' },
  { value: 'OVERDUE', label: 'Vencida' },
];

export interface ReportFilterValues {
  month: string;
  year: string;
  category: string;
  method: string;
  status: string;
  from: string;
  to: string;
}

interface ReportFilterProps {
  values: ReportFilterValues;
  onChange: (values: ReportFilterValues) => void;
  showPeriod?: boolean;
  showCategory?: boolean;
  showMethod?: boolean;
  showStatus?: boolean;
  showDateRange?: boolean;
}

export function ReportFilter({
  values,
  onChange,
  showPeriod = true,
  showCategory = false,
  showMethod = false,
  showStatus = false,
  showDateRange = false,
}: ReportFilterProps) {
  function updateValue<K extends keyof ReportFilterValues>(
    key: K,
    value: ReportFilterValues[K]
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="flex flex-1 flex-col gap-4 sm:flex-row">
      {showPeriod && (
        <>
          <div className="flex-1 space-y-2 sm:flex-initial">
            <Label htmlFor="report-month">Mes</Label>
            <StyledSelect
              id="report-month"
              value={values.month}
              onChange={(value) => updateValue('month', value)}
              options={Object.entries(monthLabels).map(([key, label]) => ({
                value: key,
                label,
              }))}
              placeholder="Mes"
              className="w-full sm:w-44"
            />
          </div>

          <div className="flex-1 space-y-2 sm:flex-initial">
            <Label htmlFor="report-year">Año</Label>
            <Input
              id="report-year"
              placeholder="Año"
              value={values.year}
              onChange={(e) => updateValue('year', e.target.value)}
              className="w-full sm:w-28"
              type="number"
              min={2000}
              max={2100}
            />
          </div>
        </>
      )}

      {showDateRange && (
        <>
          <div className="flex-1 space-y-2 sm:flex-initial">
            <Label htmlFor="report-from">Desde</Label>
            <Input
              id="report-from"
              type="date"
              value={values.from}
              onChange={(e) => updateValue('from', e.target.value)}
              className="w-full sm:w-40"
            />
          </div>

          <div className="flex-1 space-y-2 sm:flex-initial">
            <Label htmlFor="report-to">Hasta</Label>
            <Input
              id="report-to"
              type="date"
              value={values.to}
              onChange={(e) => updateValue('to', e.target.value)}
              className="w-full sm:w-40"
            />
          </div>
        </>
      )}

      {showCategory && (
        <div className="flex-1 space-y-2 sm:flex-initial">
          <Label htmlFor="report-category">Categoría</Label>
          <StyledSelect
            id="report-category"
            value={values.category}
            onChange={(value) => updateValue('category', value)}
            options={[
              { value: '', label: 'Todas' },
              ...categories,
            ]}
            placeholder="Todas las categorías"
            className="w-full sm:w-44"
          />
        </div>
      )}

      {showMethod && (
        <div className="flex-1 space-y-2 sm:flex-initial">
          <Label htmlFor="report-method">Método</Label>
          <StyledSelect
            id="report-method"
            value={values.method}
            onChange={(value) => updateValue('method', value)}
            options={[
              { value: '', label: 'Todos' },
              ...methods,
            ]}
            placeholder="Todos los métodos"
            className="w-full sm:w-44"
          />
        </div>
      )}

      {showStatus && (
        <div className="flex-1 space-y-2 sm:flex-initial">
          <Label htmlFor="report-status">Estado</Label>
          <StyledSelect
            id="report-status"
            value={values.status}
            onChange={(value) => updateValue('status', value)}
            options={[
              { value: '', label: 'Todos' },
              ...statuses,
            ]}
            placeholder="Todos los estados"
            className="w-full sm:w-44"
          />
        </div>
      )}
    </div>
  );
}
