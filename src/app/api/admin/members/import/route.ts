import { NextRequest } from 'next/server';
import * as xlsx from 'xlsx';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, apiDbError } from '@/lib/api-response';
import { requireClub, AuthError } from '@/lib/access';
import { CreateMemberSchema } from '@/types/member';

interface ImportError {
  row: number;
  message: string;
}

function normalizeHeader(header: unknown): string {
  return String(header ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function mapHeaderToField(header: string): string | null {
  const normalized = normalizeHeader(header);

  const mappings: Record<string, string> = {
    dni: 'dni',
    documento: 'dni',
    document: 'dni',
    nombre: 'firstName',
    name: 'firstName',
    firstname: 'firstName',
    first: 'firstName',
    apellido: 'lastName',
    lastname: 'lastName',
    last: 'lastName',
    surname: 'lastName',
    email: 'email',
    correo: 'email',
    mail: 'email',
    telefono: 'phone',
    phone: 'phone',
    celular: 'phone',
    mobile: 'phone',
    categoria: 'category',
    category: 'category',
    tipo: 'category',
    estado: 'status',
    status: 'status',
    notas: 'notes',
    notes: 'notes',
    observaciones: 'notes',
  };

  return mappings[normalized] ?? null;
}

function cellToString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  const trimmed = String(value).trim();
  return trimmed === '' ? undefined : trimmed;
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireClub(request);

    if (!ctx.clubId) {
      return apiError(
        'Seleccione un club',
        400,
        'Se requiere un club para importar socios',
        'CLUB_REQUIRED'
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return apiError('No se recibió ningún archivo', 400);
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return apiError('El archivo debe ser un Excel (.xlsx o .xls)', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json<unknown[]>(worksheet, {
      defval: undefined,
      header: 1,
    });

    if (rows.length < 2) {
      return apiSuccess({ imported: 0, errors: [] });
    }

    const headerRow = rows[0] as unknown[];
    const fieldIndexes: Record<string, number> = {};

    headerRow.forEach((header, index) => {
      const field = mapHeaderToField(String(header));
      if (field && fieldIndexes[field] === undefined) {
        fieldIndexes[field] = index;
      }
    });

    if (fieldIndexes.dni === undefined) {
      return apiError(
        'No se encontró la columna DNI en el archivo',
        400,
        'Verificá que el encabezado sea "DNI"',
        'MISSING_DNI_COLUMN'
      );
    }

    const errors: ImportError[] = [];
    const validMembers: { dni: string; firstName: string; lastName: string; email: string | null; phone: string | null; category: string; status: string; notes: string | null }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;

      const rawDni = cellToString(row[fieldIndexes.dni]);

      if (!rawDni) {
        errors.push({ row: rowNumber, message: 'DNI es obligatorio' });
        continue;
      }

      const data: Record<string, unknown> = {
        dni: rawDni,
      };

      if (fieldIndexes.firstName !== undefined) {
        data.firstName = cellToString(row[fieldIndexes.firstName]);
      }
      if (fieldIndexes.lastName !== undefined) {
        data.lastName = cellToString(row[fieldIndexes.lastName]);
      }
      if (fieldIndexes.email !== undefined) {
        data.email = cellToString(row[fieldIndexes.email]);
      }
      if (fieldIndexes.phone !== undefined) {
        data.phone = cellToString(row[fieldIndexes.phone]);
      }
      if (fieldIndexes.category !== undefined) {
        data.category = cellToString(row[fieldIndexes.category]);
      }
      if (fieldIndexes.status !== undefined) {
        data.status = cellToString(row[fieldIndexes.status]);
      }
      if (fieldIndexes.notes !== undefined) {
        data.notes = cellToString(row[fieldIndexes.notes]);
      }

      const parsed = CreateMemberSchema.safeParse(data);

      if (!parsed.success) {
        const message = parsed.error.issues.map((e) => e.message).join('; ');
        errors.push({ row: rowNumber, message });
        continue;
      }

      const { email, ...rest } = parsed.data;
      validMembers.push({
        ...rest,
        email: email && email.trim() !== '' ? email.trim() : null,
        phone: rest.phone ?? null,
        notes: rest.notes ?? null,
      });
    }

    if (validMembers.length === 0) {
      return apiSuccess({ imported: 0, errors });
    }

    const existingDnis = await prisma.member.findMany({
      where: {
        clubId: ctx.clubId,
        dni: { in: validMembers.map((m) => m.dni) },
      },
      select: { dni: true },
    });

    const existingDniSet = new Set(existingDnis.map((m) => m.dni));
    const membersToCreate = validMembers.filter((m) => !existingDniSet.has(m.dni));
    const duplicateDnis = validMembers.filter((m) => existingDniSet.has(m.dni));

    duplicateDnis.forEach((m) => {
      errors.push({
        row: 0,
        message: `El DNI ${m.dni} ya existe en el sistema`,
      });
    });

    if (membersToCreate.length > 0) {
      await prisma.member.createMany({
        data: membersToCreate.map((m) => ({ ...m, clubId: ctx.clubId! })),
        skipDuplicates: true,
      });
    }

    return apiSuccess({ imported: membersToCreate.length, errors });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.message, error.status);
    }
    return apiDbError(error, 'Error al importar socios');
  }
}