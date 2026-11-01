import { Navigate, useParams } from 'react-router'
import EmailEditor from './email_editor'
import WhatsappEditor from './whatsapp_editor'

/** /templates/:canal/:id → editor do canal certo. */
export default function TemplateEditar() {
  const { canal, id } = useParams()
  const templateId = Number(id)
  if (!Number.isInteger(templateId) || templateId <= 0) return <Navigate to="/templates" replace />
  // key: trocar de template recria o editor com o estado limpo.
  if (canal === 'whatsapp') return <WhatsappEditor key={templateId} id={templateId} />
  if (canal === 'email') return <EmailEditor key={templateId} id={templateId} />
  return <Navigate to="/templates" replace />
}
