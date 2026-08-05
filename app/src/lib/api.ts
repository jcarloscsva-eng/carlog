import type {
  Averia,
  Itv,
  Mantenimiento,
  Repuesto,
  Vehiculo,
} from '@shared/types'
import { getDevEmail } from './devAuth'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const devEmail = getDevEmail()

  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(devEmail ? { 'X-Dev-User-Email': devEmail } : {}),
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `Error ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  vehiculos: {
    list: () => request<Vehiculo[]>('/vehiculos'),
    create: (data: Omit<Vehiculo, 'id' | 'propietarioEmail'>) =>
      request<Vehiculo>('/vehiculos', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Omit<Vehiculo, 'id' | 'propietarioEmail'>>) =>
      request<Vehiculo>(`/vehiculos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<{ ok: true }>(`/vehiculos/${id}`, { method: 'DELETE' }),
  },
  averias: {
    list: () => request<Averia[]>('/averias'),
    create: (data: Omit<Averia, 'id'>) =>
      request<Averia>('/averias', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Omit<Averia, 'id'>>) =>
      request<Averia>(`/averias/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<{ ok: true }>(`/averias/${id}`, { method: 'DELETE' }),
  },
  mantenimientos: {
    list: () => request<Mantenimiento[]>('/mantenimientos'),
    create: (data: Omit<Mantenimiento, 'id'>) =>
      request<Mantenimiento>('/mantenimientos', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Omit<Mantenimiento, 'id'>>) =>
      request<Mantenimiento>(`/mantenimientos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (id: string) => request<{ ok: true }>(`/mantenimientos/${id}`, { method: 'DELETE' }),
  },
  repuestos: {
    list: () => request<Repuesto[]>('/repuestos'),
    create: (data: Omit<Repuesto, 'id'>) =>
      request<Repuesto>('/repuestos', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Omit<Repuesto, 'id'>>) =>
      request<Repuesto>(`/repuestos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<{ ok: true }>(`/repuestos/${id}`, { method: 'DELETE' }),
  },
  itv: {
    list: () => request<Itv[]>('/itv'),
    create: (data: Pick<Itv, 'vehiculoId' | 'fechaRealizada' | 'resultado'>) =>
      request<Itv>('/itv', { method: 'POST', body: JSON.stringify(data) }),
    remove: (id: string) => request<{ ok: true }>(`/itv/${id}`, { method: 'DELETE' }),
  },
  pushSubscribe: (subscription: PushSubscriptionJSON) =>
    request<{ ok: true }>('/push-subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
    }),
}
