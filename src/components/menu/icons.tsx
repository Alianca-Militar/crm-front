import type { ReactNode } from 'react'

type IconProps = { size?: number; strokeWidth?: number }

function Svg({ size = 20, strokeWidth = 1.8, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  </Svg>
)

export const IconCampanhas = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 10v4h3l7 4V6L6 10H3z" />
    <path d="M17 9a4 4 0 0 1 0 6" />
  </Svg>
)

export const IconResultados = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 20V11M11 20V5M17 20v-7M3 20h18" />
  </Svg>
)

export const IconClientes = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.2 2.5 3.5 5.2" />
  </Svg>
)

export const IconBloqueios = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M6 6l12 12" />
  </Svg>
)

export const IconConversas = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5h16v11H9l-5 4z" />
  </Svg>
)

export const IconTemplates = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 8h6M9 12h6M9 16h4" />
  </Svg>
)

export const IconGatilhos = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
  </Svg>
)

export const IconRelatorios = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h9l4 4v14H6z" />
    <path d="M10 17v-3M13 17v-6M16 17v-2" />
  </Svg>
)

export const IconUsuarios = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
  </Svg>
)

export const IconLojas = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9l1.5-5h13L20 9M4 9h16v11H4zM9 20v-5h6v5" />
  </Svg>
)

export const IconCanais = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5h16v10H8l-4 4z" />
    <path d="M8 9h8M8 12h5" />
  </Svg>
)

export const IconIntegracoes = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 3v5M15 3v5M7 8h10v4a5 5 0 0 1-10 0zM12 17v4" />
  </Svg>
)

export const IconLinks = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
  </Svg>
)

export const IconLogs = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
  </Svg>
)

export const IconConfiguracoes = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
    <circle cx="15" cy="6" r="2" />
    <circle cx="9" cy="12" r="2" />
    <circle cx="17" cy="18" r="2" />
  </Svg>
)

export const IconChevronLeft = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Svg>
)

export const IconChevronRight = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
)

export const IconSearch = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4-4" />
  </Svg>
)

export const IconBell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
    <path d="M10 21h4" />
  </Svg>
)

export const IconLogout = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
  </Svg>
)

export const IconCheck = (p: IconProps) => (
  <Svg strokeWidth={2.4} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
)

export const IconAlert = (p: IconProps) => (
  <Svg strokeWidth={2.4} {...p}>
    <path d="M12 7v6" />
    <path d="M12 17h.01" />
  </Svg>
)

export const IconClose = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
)

export const IconPlus = (p: IconProps) => (
  <Svg strokeWidth={2.2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const IconArrowRight = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
)

export const IconAprovacoes = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 12l2 2 4-4" />
    <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" />
  </Svg>
)
