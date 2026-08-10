import type {
  AlertaEnviada,
  Averia,
  Elemento,
  Itv,
  LoginCode,
  Parte,
  PushSubscriptionRecord,
  Seguro,
  UsuarioPermitido,
  Vehiculo,
} from './types'

export const TABLES = {
  Vehiculos: 'Vehiculos',
  Averias: 'Averias',
  Elementos: 'Elementos',
  Itv: 'ITV',
  Seguros: 'Seguros',
  Partes: 'Partes',
  PushSubscriptions: 'PushSubscriptions',
  AlertasEnviadas: 'AlertasEnviadas',
  LoginCodes: 'LoginCodes',
  UsuariosPermitidos: 'UsuariosPermitidos',
  IaUsos: 'IaUsos',
} as const

interface AirtableFields {
  [key: string]: unknown
}

// --- Vehiculos ---------------------------------------------------------

export function vehiculoFromAirtable(id: string, fields: AirtableFields): Vehiculo {
  return {
    id,
    propietarioEmail: String(fields.Propietario_Email ?? ''),
    marca: String(fields.Marca ?? ''),
    modelo: String(fields.Modelo ?? ''),
    matricula: String(fields.Matricula ?? ''),
    anio: Number(fields.Año ?? 0),
    tipo: (fields.Tipo as Vehiculo['tipo']) ?? 'Turismo',
    kmActual: Number(fields.Km_Actual ?? 0),
    kmActualFecha: String(fields.Km_Actual_Fecha ?? ''),
    fechaCompra: fields.Fecha_Compra ? String(fields.Fecha_Compra) : undefined,
  }
}

export function vehiculoToAirtable(v: Omit<Vehiculo, 'id'>): AirtableFields {
  return {
    Propietario_Email: v.propietarioEmail,
    Marca: v.marca,
    Modelo: v.modelo,
    Matricula: v.matricula,
    Año: v.anio,
    Tipo: v.tipo,
    Km_Actual: v.kmActual,
    Km_Actual_Fecha: v.kmActualFecha,
    Fecha_Compra: v.fechaCompra || null,
  }
}

// --- Averias -------------------------------------------------------------

export function averiaFromAirtable(id: string, fields: AirtableFields): Averia {
  return {
    id,
    vehiculoId: String(fields.Vehiculo ?? ''),
    fecha: String(fields.Fecha ?? ''),
    descripcion: String(fields.Descripcion ?? ''),
    estado: (fields.Estado as Averia['estado']) ?? 'Pendiente',
    diagnosticoIA: fields.Diagnostico_IA ? String(fields.Diagnostico_IA) : undefined,
  }
}

export function averiaToAirtable(a: Omit<Averia, 'id'>): AirtableFields {
  return {
    Vehiculo: a.vehiculoId,
    Fecha: a.fecha,
    Descripcion: a.descripcion,
    Estado: a.estado,
    Diagnostico_IA: a.diagnosticoIA || null,
  }
}

// --- Elementos --------------------------------------------------------

export function elementoFromAirtable(id: string, fields: AirtableFields): Elemento {
  return {
    id,
    vehiculoId: String(fields.Vehiculo ?? ''),
    tipo: String(fields.Tipo ?? ''),
    fecha: String(fields.Fecha ?? ''),
    km: Number(fields.Km ?? 0),
    precio: Number(fields.Precio ?? 0),
    tienda: String(fields.Tienda ?? ''),
    intervaloKm: fields.Intervalo_Km ? Number(fields.Intervalo_Km) : undefined,
    intervaloMeses: fields.Intervalo_Meses ? Number(fields.Intervalo_Meses) : undefined,
    visitaId: fields.Visita_Id ? String(fields.Visita_Id) : undefined,
  }
}

export function elementoToAirtable(e: Omit<Elemento, 'id'>): AirtableFields {
  return {
    Vehiculo: e.vehiculoId,
    Tipo: e.tipo,
    Fecha: e.fecha,
    Km: e.km,
    Precio: e.precio,
    Tienda: e.tienda,
    Intervalo_Km: e.intervaloKm ?? null,
    Intervalo_Meses: e.intervaloMeses ?? null,
    Visita_Id: e.visitaId || null,
  }
}

// --- ITV -------------------------------------------------------------------

export function itvFromAirtable(id: string, fields: AirtableFields): Itv {
  return {
    id,
    vehiculoId: String(fields.Vehiculo ?? ''),
    fechaRealizada: String(fields.Fecha_Realizada ?? ''),
    resultado: (fields.Resultado as Itv['resultado']) ?? 'Favorable',
    fechaProxima: String(fields.Fecha_Proxima ?? ''),
  }
}

export function itvToAirtable(i: Omit<Itv, 'id'>): AirtableFields {
  return {
    Vehiculo: i.vehiculoId,
    Fecha_Realizada: i.fechaRealizada,
    Resultado: i.resultado,
    Fecha_Proxima: i.fechaProxima,
  }
}

// --- Seguros -------------------------------------------------------------

export function seguroFromAirtable(id: string, fields: AirtableFields): Seguro {
  return {
    id,
    vehiculoId: String(fields.Vehiculo ?? ''),
    compania: String(fields.Compania ?? ''),
    numeroPoliza: String(fields.Numero_Poliza ?? ''),
    tipoCobertura: (fields.Tipo_Cobertura as Seguro['tipoCobertura']) ?? 'Terceros',
    fechaInicio: String(fields.Fecha_Inicio ?? ''),
    fechaRenovacion: String(fields.Fecha_Renovacion ?? ''),
    precio: Number(fields.Precio ?? 0),
    telefonoAsistencia: fields.Telefono_Asistencia ? String(fields.Telefono_Asistencia) : undefined,
  }
}

export function seguroToAirtable(s: Omit<Seguro, 'id'>): AirtableFields {
  return {
    Vehiculo: s.vehiculoId,
    Compania: s.compania,
    Numero_Poliza: s.numeroPoliza,
    Tipo_Cobertura: s.tipoCobertura,
    Fecha_Inicio: s.fechaInicio,
    Fecha_Renovacion: s.fechaRenovacion,
    Precio: s.precio,
    Telefono_Asistencia: s.telefonoAsistencia || null,
  }
}

// --- Partes ----------------------------------------------------------------

export function parteFromAirtable(id: string, fields: AirtableFields): Parte {
  return {
    id,
    vehiculoId: String(fields.Vehiculo ?? ''),
    fecha: String(fields.Fecha ?? ''),
    tipo: (fields.Tipo as Parte['tipo']) ?? 'Otro',
    descripcion: String(fields.Descripcion ?? ''),
    numeroParte: fields.Numero_Parte ? String(fields.Numero_Parte) : undefined,
    estado: (fields.Estado as Parte['estado']) ?? 'Abierto',
    coste: fields.Coste !== undefined && fields.Coste !== null ? Number(fields.Coste) : undefined,
    terceroImplicado: Boolean(fields.Tercero_Implicado ?? false),
  }
}

export function parteToAirtable(p: Omit<Parte, 'id'>): AirtableFields {
  return {
    Vehiculo: p.vehiculoId,
    Fecha: p.fecha,
    Tipo: p.tipo,
    Descripcion: p.descripcion,
    Numero_Parte: p.numeroParte || null,
    Estado: p.estado,
    Coste: p.coste ?? null,
    Tercero_Implicado: p.terceroImplicado,
  }
}

// --- PushSubscriptions -------------------------------------------------

export function pushSubscriptionFromAirtable(
  id: string,
  fields: AirtableFields,
): PushSubscriptionRecord {
  return {
    id,
    email: String(fields.Email ?? ''),
    endpoint: String(fields.Endpoint ?? ''),
    keysP256dh: String(fields.Keys_p256dh ?? ''),
    keysAuth: String(fields.Keys_auth ?? ''),
  }
}

export function pushSubscriptionToAirtable(
  p: Omit<PushSubscriptionRecord, 'id'>,
): AirtableFields {
  return {
    Email: p.email,
    Endpoint: p.endpoint,
    Keys_p256dh: p.keysP256dh,
    Keys_auth: p.keysAuth,
  }
}

// --- AlertasEnviadas -----------------------------------------------------

export function alertaEnviadaFromAirtable(id: string, fields: AirtableFields): AlertaEnviada {
  return {
    id,
    tipo: (fields.Tipo as AlertaEnviada['tipo']) ?? 'Elemento',
    referenciaId: String(fields.Referencia_Id ?? ''),
    fechaEnviada: String(fields.Fecha_Enviada ?? ''),
  }
}

export function alertaEnviadaToAirtable(a: Omit<AlertaEnviada, 'id'>): AirtableFields {
  return {
    Tipo: a.tipo,
    Referencia_Id: a.referenciaId,
    Fecha_Enviada: a.fechaEnviada,
  }
}

// --- LoginCodes ------------------------------------------------------------

export function loginCodeFromAirtable(id: string, fields: AirtableFields): LoginCode {
  return {
    id,
    email: String(fields.Email ?? ''),
    code: String(fields.Code ?? ''),
    expiresAt: String(fields.ExpiresAt ?? ''),
    used: Boolean(fields.Used ?? false),
    attempts: Number(fields.Attempts ?? 0),
  }
}

export function loginCodeToAirtable(l: Omit<LoginCode, 'id'>): AirtableFields {
  return {
    Email: l.email,
    Code: l.code,
    ExpiresAt: l.expiresAt,
    Used: l.used,
    Attempts: l.attempts,
  }
}

// --- UsuariosPermitidos -----------------------------------------------------

export function usuarioPermitidoFromAirtable(id: string, fields: AirtableFields): UsuarioPermitido {
  return {
    id,
    email: String(fields.Email ?? ''),
    nota: fields.Nota ? String(fields.Nota) : undefined,
    fechaAlta: String(fields.Fecha_Alta ?? ''),
  }
}

export function usuarioPermitidoToAirtable(u: Omit<UsuarioPermitido, 'id'>): AirtableFields {
  return {
    Email: u.email,
    Nota: u.nota || null,
    Fecha_Alta: u.fechaAlta,
  }
}
