import { Link } from 'react-router'
import { IconChevronLeft } from '../menu/icons'
import './back_link.css'

type BackLinkProps = {
  to: string
  /** Nome da tela de destino, ex.: "Campanhas". */
  label: string
}

/** Voltar para a lista: seta num círculo e o nome da tela, igual em todas as páginas. */
export default function BackLink({ to, label }: BackLinkProps) {
  return (
    <Link to={to} className="back-link" aria-label={`Voltar para ${label}`}>
      <span className="back-link-icon">
        <IconChevronLeft size={16} />
      </span>
      <span className="back-link-label">{label}</span>
    </Link>
  )
}
