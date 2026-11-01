import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MsgNok from './msg_nok'

describe('MsgNok', () => {
  it('mostra título padrão e mensagem', () => {
    render(<MsgNok mensagem="Falha ao salvar" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado')
    expect(screen.getByText('Falha ao salvar')).toBeInTheDocument()
  })

  it('chama onClose ao clicar em fechar', async () => {
    const onClose = vi.fn()
    render(<MsgNok mensagem="Falha" onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Fechar mensagem' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
