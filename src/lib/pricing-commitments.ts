export interface Commitment {
  title: string;
  description: string;
}

/** Trust commitments surfaced on /precios and the marketing landing.
 *  Keep wording identical on both pages so guarantees don't diverge. */
export const commitments: Commitment[] = [
  {
    title: 'Cancelás cuando quieras',
    description: 'Desde el panel, en un clic. Sin llamados ni meses de preaviso.',
  },
  {
    title: 'Te avisamos antes de cada cobro',
    description: 'Email de renovación 7 días antes, con el monto exacto y el tramo en el que estás.',
  },
  {
    title: 'Sin saltos sorpresa',
    description: 'Los tramos están publicados: si tu club pasa de tramo, lo sabés de antemano, no en la factura.',
  },
  {
    title: 'Cero porcentaje sobre lo que recaudás',
    description: 'Ni de los pagos online, ni del efectivo que cargás a mano. El precio no depende de cuánto cobres.',
  },
];
