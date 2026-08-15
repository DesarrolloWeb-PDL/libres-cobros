import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { authOptions } from '@/lib/auth';

const CreateClosingSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

function serializeClosing(closing: {
  id: string;
  month: number;
  year: number;
  status: string;
  totalPayments: number;
  totalCommissions: number;
  commissionRate: number;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...closing,
    closedAt: closing.closedAt?.toISOString() ?? null,
    createdAt: closing.createdAt.toISOString(),
    updatedAt: closing.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return apiError('No autorizado', 401);
    }

    const closings = await prisma.monthlyClosing.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return apiSuccess({ data: closings.map(serializeClosing) });
  } catch (error) {
    return apiDbError(error, 'Error al listar los cierres');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return apiError('No autorizado', 401);
    }

    const body = await request.json();
    const parsed = CreateClosingSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { month, year } = parsed.data;

    const existing = await prisma.monthlyClosing.findUnique({
      where: { month_year: { month, year } },
    });

    if (existing) {
      return apiError(
        'Ya existe un cierre para el período seleccionado',
        409,
        'Use el cierre existente para cerrar el período',
        'CLOSING_ALREADY_EXISTS'
      );
    }

    const config = await prisma.siteConfig.findUnique({
      where: { key: 'commission_rate' },
    });

    const commissionRate = config && config.value !== '' ? parseFloat(config.value) : 0;

    const closing = await prisma.monthlyClosing.create({
      data: {
        month,
        year,
        status: 'OPEN',
        commissionRate: Number.isNaN(commissionRate) ? 0 : commissionRate,
      },
    });

    return apiSuccess(serializeClosing(closing));
  } catch (error) {
    return apiDbError(error, 'Error al crear el cierre');
  }
}
