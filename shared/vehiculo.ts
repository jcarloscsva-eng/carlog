/** Años transcurridos desde la fecha de compra, redondeados al entero más cercano. */
export function calcularAntiguedad(fechaCompra: string, hoy: Date): number {
  const compra = new Date(fechaCompra)
  const dias = (hoy.getTime() - compra.getTime()) / 86_400_000
  return Math.round(dias / 365.25)
}
