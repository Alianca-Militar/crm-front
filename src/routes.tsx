import { createBrowserRouter, Navigate } from 'react-router'
import Layout from './components/layout/layout'

import Login from './pages/auth/login/login'
import RedefinirSenha from './pages/auth/redefinir_senha/redefinir_senha'
import CriarSenha from './pages/auth/criar_senha/criar_senha'

import Home from './pages/paginas/home/home'
import Campanhas from './pages/paginas/campanhas/campanhas'
import NovaCampanha from './pages/paginas/nova_campanha/nova_campanha'
import Resultados from './pages/paginas/resultados/resultados'
import Clientes from './pages/paginas/clientes/clientes'
import FichaCliente from './pages/paginas/ficha_cliente/ficha_cliente'
import Bloqueios from './pages/paginas/bloqueios/bloqueios'
import Templates from './pages/paginas/templates/templates'
import WhatsappEditor from './pages/paginas/templates/whatsapp_editor'
import EmailEditor from './pages/paginas/templates/email_editor'
import TemplateEditar from './pages/paginas/templates/template_editar'
import Conversas from './pages/paginas/conversas/conversas'
import Gatilhos from './pages/paginas/gatilhos/gatilhos'
import Relatorios from './pages/paginas/relatorios/relatorios'

import Usuarios from './pages/admin/usuarios/usuarios'
import Perfil from './pages/admin/perfil/perfil'
import Lojas from './pages/admin/lojas/lojas'
import Canais from './pages/admin/canais/canais'
import Configuracoes from './pages/admin/configuracoes/configuracoes'
import Logs from './pages/admin/logs/logs'
import Integracoes from './pages/admin/integracoes/integracoes'
import Aprovacoes from './pages/admin/aprovacoes/aprovacoes'

export const router = createBrowserRouter([
  // Auth (sem header/menu)
  { path: '/login', element: <Login /> },
  { path: '/redefinir-senha', element: <RedefinirSenha /> },
  // Links enviados por e-mail (core/access.py no backend)
  { path: '/criar-senha/:uid/:token', element: <CriarSenha kind="invite" /> },
  { path: '/nova-senha/:uid/:token', element: <CriarSenha kind="reset" /> },

  // Telas do CRM
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'campanhas', element: <Campanhas /> },
      { path: 'campanhas/nova', element: <NovaCampanha /> },
      { path: 'campanhas/:id', element: <NovaCampanha /> },
      { path: 'resultados', element: <Resultados /> },
      { path: 'campanhas/:id/resultados', element: <Resultados /> },
      { path: 'clientes', element: <Clientes /> },
      { path: 'clientes/:id', element: <FichaCliente /> },
      { path: 'bloqueios', element: <Bloqueios /> },
      { path: 'templates', element: <Templates /> },
      { path: 'templates/whatsapp/novo', element: <WhatsappEditor /> },
      { path: 'templates/email/novo', element: <EmailEditor /> },
      { path: 'templates/:canal/:id', element: <TemplateEditar /> },
      { path: 'conversas', element: <Conversas /> },
      { path: 'gatilhos', element: <Gatilhos /> },
      { path: 'relatorios', element: <Relatorios /> },

      // Administração
      { path: 'admin/usuarios', element: <Usuarios /> },
      { path: 'admin/perfil', element: <Perfil /> },
      { path: 'admin/lojas', element: <Lojas /> },
      { path: 'admin/canais', element: <Canais /> },
      { path: 'admin/configuracoes', element: <Configuracoes /> },
      { path: 'admin/logs', element: <Logs /> },
      { path: 'admin/integracoes', element: <Integracoes /> },
      { path: 'admin/aprovacoes', element: <Aprovacoes /> },
    ],
  },

  // Qualquer outra URL volta para o início
  { path: '*', element: <Navigate to="/" replace /> },
])
