import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  emailSlots,
  fillHtml,
  formatMessage,
  htmlToText,
  isFullHtml,
  textToHtml,
  nextGeneric,
  normalizeName,
  resolveVariables,
  whatsappSlots,
} from './template_utils'
import type { VariableInfo } from './templates_api'

const CATALOG: VariableInfo[] = [
  {
    key: 'nome-cliente',
    label: 'Nome do cliente',
    origin: 'customer',
    example: 'Maria',
    fallback: 'cliente',
  },
  { key: 'cupom', label: 'Cupom', origin: 'campaign', example: 'INV10' },
]

describe('template_utils', () => {
  it('normaliza o nome no formato da Meta', () => {
    expect(normalizeName('Promoção de Inverno-2026!')).toBe('promocao_de_inverno_2026')
  })

  it('sugere a próxima variável genérica livre em todos os textos', () => {
    expect(nextGeneric(['Oi {{nome-cliente}}', 'loja {{var1}}', null, 'x {{var3}}'])).toBe('var4')
    expect(nextGeneric(['Sem variável'])).toBe('var1')
  })

  it('lista as variáveis do WhatsApp na ordem da mensagem, sem repetir', () => {
    const slots = whatsappSlots({
      category: 'MARKETING',
      header_type: 'text',
      header_content: 'Oi {{nome-cliente}}',
      body: 'Olá {{nome-cliente}}, cupom {{cupom}}',
      buttons: [
        { type: 'QUICK_REPLY', text: 'Sim' },
        { type: 'URL', text: 'Site', url: 'https://a.com/{{var1}}' },
      ],
    })
    expect(slots).toEqual(['nome-cliente', 'cupom', 'var1'])
  })

  it('junta as variáveis de todos os textos do e-mail', () => {
    expect(emailSlots(['Oi {{nome-cliente}}', null, 'Texto {{var1}} {{nome-cliente}}'])).toEqual([
      'nome-cliente',
      'var1',
    ])
  })

  it('preenche o exemplo padrão das variáveis novas e mantém as editadas', () => {
    const resolved = resolveVariables(
      ['nome-cliente', 'cupom', 'var2'],
      [{ key: 'cupom', example: 'NATAL' }],
      CATALOG,
    )
    expect(resolved).toEqual([
      { key: 'nome-cliente', example: 'Maria', fallback: 'cliente' },
      { key: 'cupom', example: 'NATAL' },
      { key: 'var2', example: '' },
    ])
  })

  it('formata como o WhatsApp e troca a variável pelo exemplo', () => {
    const { container } = render(
      <p>
        {formatMessage('*Olá {{nome-cliente}}*, _veja_ ~isso~ {{var1}}', {
          'nome-cliente': 'Maria',
        })}
      </p>,
    )
    expect(container.querySelector('strong')).toHaveTextContent('Olá Maria')
    expect(container.querySelector('em')).toHaveTextContent('veja')
    expect(container.querySelector('s')).toHaveTextContent('isso')
    // Sem exemplo: aparece a própria variável, destacada.
    expect(container.querySelector('.tpl-var:not(.filled)')).toHaveTextContent('{{var1}}')
  })

  it('converte texto em HTML e volta', () => {
    const html = textToHtml('Olá *Maria* <3\nlinha 2\n\nSegundo _parágrafo_')
    expect(html).toBe(
      '<p>Olá <strong>Maria</strong> &lt;3<br>linha 2</p>\n<p>Segundo <em>parágrafo</em></p>',
    )
    expect(htmlToText(html)).toBe('Olá Maria <3\nlinha 2\n\nSegundo parágrafo')
  })

  it('troca variáveis no HTML com o exemplo escapado', () => {
    expect(fillHtml('<b>{{nome-cliente}}</b> {{var1}}', { 'nome-cliente': '<Ana>' })).toBe(
      '<b>&lt;Ana&gt;</b> {{var1}}',
    )
    expect(isFullHtml('<!doctype html><html lang="pt">')).toBe(true)
    expect(isFullHtml('<p>trecho</p>')).toBe(false)
  })
})
