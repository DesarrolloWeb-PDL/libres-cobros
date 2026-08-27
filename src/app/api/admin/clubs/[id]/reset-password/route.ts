import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Find the club admin user
    const clubAdmin = await prisma.adminUser.findFirst({
      where: {
        clubId: id,
        role: 'ADMIN',
      },
    });

    if (!clubAdmin) {
      return NextResponse.json(
        { error: 'No se encontró un administrador para este club' },
        { status: 404 }
      );
    }

    // Generate a random 8-character password
    const tempPassword = randomBytes(4).toString('hex');
    
    // Hash the password
    const passwordHash = await hash(tempPassword, 12);

    // Update the admin user with the new password and mustChangePassword flag
    await prisma.adminUser.update({
      where: { id: clubAdmin.id },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    return NextResponse.json({
      success: true,
      tempPassword,
      message: 'Contraseña temporal generada. El administrador deberá cambiarla en el próximo login.',
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Error al blanquear la clave' },
      { status: 500 }
    );
  }
}
