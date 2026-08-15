import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { authOptions } from '@/lib/auth';
import { UpdateMemberSchema } from '@/types/member';

function serializeMember(member: {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  category: string;
  status: string;
  joinDate: Date;
  notes: string | null;
}) {
  return {
    ...member,
    joinDate: member.joinDate.toISOString(),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return apiError('No autorizado', 401);
    }

    const { id } = await params;

    const member = await prisma.member.findUnique({
      where: { id },
    });

    if (!member) {
      return apiError('Socio no encontrado', 404);
    }

    return apiSuccess(serializeMember(member));
  } catch (error) {
    return apiDbError(error, 'Error al obtener el socio');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return apiError('No autorizado', 401);
    }

    const { id } = await params;

    const existing = await prisma.member.findUnique({
      where: { id },
    });

    if (!existing) {
      return apiError('Socio no encontrado', 404);
    }

    const body = await request.json();
    const parsed = UpdateMemberSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'Datos inválidos',
        400,
        parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        'VALIDATION_ERROR'
      );
    }

    const { email, dni, ...rest } = parsed.data;

    if (dni && dni !== existing.dni) {
      const duplicateDni = await prisma.member.findUnique({
        where: { dni },
      });
      if (duplicateDni) {
        return apiError('Ya existe un socio con ese DNI', 409, 'DNI duplicado', 'DUPLICATE_DNI');
      }
    }

    const normalizedEmail = email && email.trim() !== '' ? email.trim() : null;

    if (normalizedEmail && normalizedEmail !== existing.email) {
      const duplicateEmail = await prisma.member.findUnique({
        where: { email: normalizedEmail },
      });
      if (duplicateEmail) {
        return apiError('Ya existe un socio con ese email', 409, 'Email duplicado', 'DUPLICATE_EMAIL');
      }
    }

    const member = await prisma.member.update({
      where: { id },
      data: {
        ...rest,
        ...(dni && { dni }),
        ...(email !== undefined && { email: normalizedEmail }),
      },
    });

    return apiSuccess(serializeMember(member));
  } catch (error) {
    return apiDbError(error, 'Error al actualizar el socio');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return apiError('No autorizado', 401);
    }

    const { id } = await params;

    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        _count: {
          select: { fees: true, payments: true },
        },
      },
    });

    if (!member) {
      return apiError('Socio no encontrado', 404);
    }

    if (member._count.fees > 0 || member._count.payments > 0) {
      return apiError(
        'No se puede eliminar el socio porque tiene cuotas o pagos asociados',
        409,
        'El socio tiene registros relacionados',
        'MEMBER_HAS_DEPENDENCIES'
      );
    }

    await prisma.member.delete({
      where: { id },
    });

    return apiSuccess({ success: true });
  } catch (error) {
    return apiDbError(error, 'Error al eliminar el socio');
  }
}
