import { useState } from 'react'
import DateRangePicker from '../../../components/date_range/date_range'
import {
  type DateRange,
  presetRange,
  rangeText,
} from '../../../components/date_range/date_range_utils'
import MsgNok from '../../../components/msg_nok/msg_nok'
import AtendimentoSac from './atendimento_sac'
import BaseClientes from './base_clientes'
import DesempenhoCampanhas from './desempenho_campanhas'
import {
  atendimentoResumo,
  baseResumo,
  clientesPorLoja,
  completude,
  conversasPorDia,
  conversasPorNumero,
  iaAcertos,
  iaNotas,
  notasGoogle,
  nps,
  relatorios,
  rfm,
  semIdentificacao,
} from './mocks'
import { useProductsReport } from './relatorios_api'
import VendasProduto from './vendas_produto'
import './relatorios.css'

function VendasProdutoReal({ range }: { range: DateRange }) {
  const report = useProductsReport(range)
  return (
    <>
      {report.isError && (
        <MsgNok titulo="Não foi possível carregar o relatório" mensagem={report.error.message} />
      )}
      <VendasProduto
        leaves={report.data ?? []}
        loading={report.isPending}
        title={`Vendas por produto · ${rangeText(range)}`}
      />
    </>
  )
}

export default function Relatorios() {
  const [selecionado, setSelecionado] = useState(0)
  const nome = relatorios[selecionado].nome
  const [periodo, setPeriodo] = useState(() => presetRange('month'))

  return (
    <div className="page page-relatorios">
      <div className="page-head">
        <h1 className="page-title">Relatórios</h1>
        <div className="page-actions">
          <DateRangePicker value={periodo} onChange={setPeriodo} />
          <button type="button" className="btn md">
            Exportar PDF
          </button>
          <button type="button" className="btn md">
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="relatorios-picker">
        {relatorios.map((r, i) => (
          <button
            key={r.nome}
            type="button"
            aria-pressed={i === selecionado}
            className={i === selecionado ? 'relatorios-option on' : 'relatorios-option'}
            onClick={() => setSelecionado(i)}
          >
            <span className="relatorios-option-name">{r.nome}</span>
            <span className="relatorios-option-desc">{r.desc}</span>
          </button>
        ))}
      </div>

      {nome === 'Vendas por produto' && <VendasProdutoReal range={periodo} />}

      {nome === 'Desempenho de campanhas' && <DesempenhoCampanhas range={periodo} />}

      {nome === 'Base de clientes' && (
        <BaseClientes
          resumo={baseResumo}
          semId={semIdentificacao}
          completude={completude}
          porLoja={clientesPorLoja}
          rfm={rfm}
        />
      )}

      {nome === 'Atendimento e SAC' && (
        <AtendimentoSac
          nps={nps}
          google={notasGoogle}
          resumo={atendimentoResumo}
          dias={conversasPorDia}
          porNumero={conversasPorNumero}
          iaAcertos={iaAcertos}
          iaNotas={iaNotas}
          periodo={rangeText(periodo)}
        />
      )}
    </div>
  )
}
