import { useState } from 'react'
import './avatar.css'

type AvatarProps = {
  /** Classe do círculo (ex.: "avatar sm dark", "app-header-avatar", "perfil-avatar") */
  className: string
  url?: string | null
  initials: string
}

/** Foto do usuário; sem foto (ou se ela falhar ao carregar), mostra as iniciais. */
export default function Avatar({ className, url, initials }: AvatarProps) {
  const [failed, setFailed] = useState<string | null>(null)
  const showPhoto = url && failed !== url
  return (
    <span className={`${className} avatar-box`} aria-hidden="true">
      {showPhoto ? (
        <img className="avatar-img" src={url} alt="" onError={() => setFailed(url)} />
      ) : (
        initials
      )}
    </span>
  )
}
