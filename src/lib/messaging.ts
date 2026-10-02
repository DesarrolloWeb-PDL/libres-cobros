interface FeeForTemplate {
  status: string;
  amount: number;
  dueDate: Date;
}

interface MemberForTemplate {
  firstName: string;
  lastName: string;
  dni: string;
  fees: FeeForTemplate[];
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Replaces template variables in a mass message with member-specific values.
 *
 * Supported variables:
 * - {nombre}      -> member first name
 * - {apellido}    -> member last name
 * - {dni}         -> member DNI
 * - {monto}       -> total of pending/overdue fees, or "-" if none
 * - {vencimiento} -> due date of the next pending/overdue fee, or "-" if none
 */
export function resolveMessageTemplate(
  message: string,
  member: MemberForTemplate
): string {
  const pendingFees = member.fees.filter((fee) =>
    ['PENDING', 'OVERDUE'].includes(fee.status)
  );

  const totalPending = pendingFees.reduce((sum, fee) => sum + fee.amount, 0);
  const nextFee = pendingFees.sort(
    (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
  )[0];

  return message
    .replace(/\{nombre\}/g, member.firstName)
    .replace(/\{apellido\}/g, member.lastName)
    .replace(/\{dni\}/g, member.dni)
    .replace(/\{monto\}/g, pendingFees.length ? formatCurrency(totalPending) : '-')
    .replace(/\{vencimiento\}/g, nextFee ? formatDate(nextFee.dueDate) : '-');
}
