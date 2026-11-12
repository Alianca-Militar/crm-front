import { useState } from 'react'
import Modal from '../../../components/modal/modal'
import MsgNok from '../../../components/msg_nok/msg_nok'
import MsgOk from '../../../components/msg_ok/msg_ok'
import {
  type NumberProfile,
  type ProfileInput,
  useNumberProfile,
  useSaveNumberProfile,
} from './numero_meta_api'

type Form = Required<ProfileInput>

const LABEL: Record<keyof Form, string> = {
  about: 'Sobre',
  description: 'Descrição',
  vertical: 'Segmento',
  websites: 'Sites',
  email: 'E-mail',
  address: 'Endereço',
}

function toForm(p: NumberProfile): Form {
  return {
    about: p.about,
    description: p.description,
    vertical: p.vertical,
    websites: p.websites,
    email: p.email,
    address: p.address,
  }
}

/** Aba Perfil: o perfil do WhatsApp na Meta, lido na hora e gravado só depois de confirmar. */
export default function NumeroPerfil({
  numberId,
  canEdit,
}: {
  numberId: number
  canEdit: boolean
}) {
  const profile = useNumberProfile(canEdit ? numberId : null)

  if (!canEdit) {
    return <p className="muted">Só o Admin vê e altera o perfil do WhatsApp na Meta.</p>
  }
  if (profile.isError) {
    return (
      <MsgNok titulo="Não foi possível ler o perfil na Meta" mensagem={profile.error.message} />
    )
  }
  if (!profile.data) return <p className="muted">Lendo o perfil na Meta…</p>
  // key: troca de número recomeça o formulário com o perfil dele.
  return <PerfilForm key={numberId} numberId={numberId} profile={profile.data} />
}

function PerfilForm({ numberId, profile }: { numberId: number; profile: NumberProfile }) {
  const save = useSaveNumberProfile()
  const [form, setForm] = useState<Form>(toForm(profile))
  const [confirm, setConfirm] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const original = toForm(profile)
  const changed = (Object.keys(form) as (keyof Form)[]).filter(
    (k) => JSON.stringify(form[k]) !== JSON.stringify(original[k]),
  )
  const sites = [form.websites[0] ?? '', form.websites[1] ?? '']

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setSaved(null)
    setForm({ ...form, [key]: value })
  }

  function onSave() {
    setConfirm(false)
    const data = Object.fromEntries(changed.map((k) => [k, form[k]])) as ProfileInput
    save.mutate(
      { id: numberId, data },
      {
        onSuccess: (p) => {
          setForm(toForm(p))
          setSaved(
            'Perfil salvo na Meta. No WhatsApp dos clientes a mudança pode levar alguns minutos.',
          )
        },
      },
    )
  }

  const show = (k: keyof Form) =>
    k === 'websites'
      ? form.websites.join(', ') || '(vazio)'
      : k === 'vertical'
        ? (profile.verticals[form.vertical] ?? form.vertical)
        : form[k] || '(vazio)'

  return (
    <div className="canais-perfil">
      {saved && <MsgOk mensagem={saved} onClose={() => setSaved(null)} />}
      {save.isError && <MsgNok titulo="A Meta recusou" mensagem={save.error.message} />}

      <section className="canais-perfil-card">
        <div className="canais-perfil-top">
          {profile.profile_picture_url ? (
            <img
              className="canais-perfil-foto"
              src={profile.profile_picture_url}
              alt="Foto do perfil"
            />
          ) : (
            <span className="canais-perfil-foto vazio">sem foto</span>
          )}
          <div className="muted canais-small">
            A foto aparece aqui; a troca da foto pelo CRM fica para depois (hoje, pelo Gerenciador
            do WhatsApp).
          </div>
        </div>

        <div className="field">
          <label htmlFor="pf-about">Sobre</label>
          <input
            id="pf-about"
            maxLength={139}
            value={form.about}
            onChange={(e) => set('about', e.target.value)}
          />
          <span className="cfg-hint">{form.about.length}/139</span>
        </div>
        <div className="field">
          <label htmlFor="pf-desc">Descrição</label>
          <textarea
            id="pf-desc"
            rows={3}
            maxLength={512}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
          <span className="cfg-hint">{form.description.length}/512</span>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="pf-vert">Segmento</label>
            <select
              id="pf-vert"
              value={form.vertical}
              onChange={(e) => set('vertical', e.target.value)}
            >
              {Object.entries(profile.verticals).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pf-email">E-mail</label>
            <input
              id="pf-email"
              type="email"
              maxLength={128}
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>
          {sites.map((site, i) => (
            <div key={i} className="field">
              <label htmlFor={`pf-site-${i}`}>Site {i + 1}</label>
              <input
                id={`pf-site-${i}`}
                type="url"
                placeholder="https://"
                value={site}
                onChange={(e) => {
                  const next = [...sites]
                  next[i] = e.target.value.trim()
                  set('websites', next.filter(Boolean))
                }}
              />
            </div>
          ))}
        </div>
        <div className="field">
          <label htmlFor="pf-addr">Endereço</label>
          <input
            id="pf-addr"
            maxLength={256}
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
          />
        </div>

        <div className="canais-perfil-actions">
          <button
            type="button"
            className="btn"
            disabled={!changed.length || save.isPending}
            onClick={() => setForm(original)}
          >
            Desfazer
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!changed.length || save.isPending}
            onClick={() => setConfirm(true)}
          >
            {save.isPending ? 'Salvando na Meta…' : 'Salvar na Meta'}
          </button>
        </div>
      </section>

      <Modal
        open={confirm}
        titulo="Salvar o perfil na Meta?"
        onClose={() => setConfirm(false)}
        footer={
          <>
            <button type="button" className="btn sm" onClick={() => setConfirm(false)}>
              Voltar
            </button>
            <button type="button" className="btn sm primary" onClick={onSave}>
              Salvar na Meta
            </button>
          </>
        }
      >
        <p>Isso muda o perfil que os clientes veem no WhatsApp. O que vai mudar:</p>
        <ul className="canais-perfil-diff">
          {changed.map((k) => (
            <li key={k}>
              <strong>{LABEL[k]}:</strong> {show(k)}
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  )
}
