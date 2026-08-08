import type { SVGProps } from 'react'

/**
 * Set de iconos propio, trazo fino (1.6) estilo Feather, para no arrastrar
 * una librería entera por una docena de glifos. `currentColor` por defecto,
 * así heredan el color de texto del contexto donde se usan.
 */
function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconAveria(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M10.3 3.86 1.82 18a1.5 1.5 0 0 0 1.3 2.25h17.76a1.5 1.5 0 0 0 1.3-2.25L13.7 3.86a1.5 1.5 0 0 0-2.6 0Z" />
      <path d="M12 9v4" />
      <path d="M12 16.5h.01" />
    </Icon>
  )
}

export function IconMantenimiento(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 4.6L2.8 17.4a1.7 1.7 0 0 0 2.4 2.4l6.5-6.5a4 4 0 0 0 4.6-5.4l-2.6 2.6-2-2Z" />
    </Icon>
  )
}

export function IconRepuesto(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M12 4v2.6M12 17.4V20M4 12h2.6M17.4 12H20" />
    </Icon>
  )
}

export function IconItv(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9h17" />
      <path d="M8 3v3M16 3v3" />
      <path d="M8 13.2 10.4 15.5 15.5 10.8" />
    </Icon>
  )
}

export function IconSeguro(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 3.2 4.5 6v6c0 5 3.2 8 7.5 9 4.3-1 7.5-4 7.5-9V6L12 3.2Z" />
      <path d="M9.2 12.2l1.9 1.9 3.7-3.9" />
    </Icon>
  )
}

export function IconVehiculo(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M3.5 16.5V12l2-4.5A2 2 0 0 1 7.35 6.3h9.3a2 2 0 0 1 1.85 1.2l2 4.5v4.5" />
      <path d="M3.5 16.5h17v2a1 1 0 0 1-1 1h-1.2a1 1 0 0 1-1-1v-1H6.7v1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-2Z" />
      <circle cx="7.2" cy="13.3" r="1.1" />
      <circle cx="16.8" cy="13.3" r="1.1" />
    </Icon>
  )
}

export function IconReportes(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 20V10M12 20V4M20 20v-7" />
      <path d="M2.5 20.5h19" />
    </Icon>
  )
}

export function IconEdit(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 20h4l10.3-10.3a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z" />
      <path d="M13.5 6.5l3 3" />
    </Icon>
  )
}

export function IconTrash(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4.5 7h15" />
      <path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" />
      <path d="M6.5 7 7.3 19a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 7" />
      <path d="M10.2 11v6M13.8 11v6" />
    </Icon>
  )
}

export function IconBell(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6 9.5a6 6 0 0 1 12 0c0 4.5 1.5 6 1.5 6h-15s1.5-1.5 1.5-6Z" />
      <path d="M10.2 19.5a1.9 1.9 0 0 0 3.6 0" />
    </Icon>
  )
}

export function IconUsers(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.2 20c0-3.5 2.6-6 5.8-6s5.8 2.5 5.8 6" />
      <path d="M15.5 6.2a3.2 3.2 0 0 1 0 6.3" />
      <path d="M17.4 14.3c2.6.4 4.4 2.4 4.4 5.7" />
    </Icon>
  )
}

export function IconGarage(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M3 20V9.5L12 4l9 5.5V20" />
      <path d="M3 20h18" />
      <path d="M7 20v-6.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1V20" />
    </Icon>
  )
}
