export type VehiculoTipo = 'Turismo' | 'Moto' | 'Furgoneta'

export interface Vehiculo {
  id: string
  propietarioEmail: string
  marca: string
  modelo: string
  matricula: string
  anio: number
  tipo: VehiculoTipo
  kmActual: number
  kmActualFecha: string
}

export type AveriaEstado = 'Pendiente' | 'Resuelta'

export interface Averia {
  id: string
  vehiculoId: string
  fecha: string
  descripcion: string
  estado: AveriaEstado
}

export interface Mantenimiento {
  id: string
  vehiculoId: string
  fecha: string
  km: number
  precio: number
  tienda: string
  elementos: string
  /** Si se rellena, genera una alerta para el próximo mantenimiento del mismo tipo. */
  intervaloKm?: number
  intervaloMeses?: number
}

export type TipoRepuesto =
  | 'Neumáticos'
  | 'Batería'
  | 'Frenos'
  | 'Correa de distribución'
  | 'Filtros'
  | 'Otro'

export interface Repuesto {
  id: string
  vehiculoId: string
  tipoRepuesto: TipoRepuesto
  fecha: string
  km: number
  precio: number
  tienda: string
  vidaUtilKm?: number
  vidaUtilAnios?: number
}

export type ItvResultado = 'Favorable' | 'Desfavorable' | 'Negativo'

export interface Itv {
  id: string
  vehiculoId: string
  fechaRealizada: string
  resultado: ItvResultado
  fechaProxima: string
}

export interface PushSubscriptionRecord {
  id: string
  email: string
  endpoint: string
  keysP256dh: string
  keysAuth: string
}

export type AlertaTipo = 'Mantenimiento' | 'Repuesto' | 'ITV'

export interface AlertaEnviada {
  id: string
  tipo: AlertaTipo
  referenciaId: string
  fechaEnviada: string
}
