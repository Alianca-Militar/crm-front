import { useEffect, useState } from 'react'

export const WINDOW_MS = 24 * 60 * 60 * 1000

/** Relógio da tela: atualiza a cada 30 s (janela de 24h e tempo de espera). */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

/** "2h 05min", "42 min", "menos de 1 min". */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000)
  if (minutes < 1) return 'menos de 1 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${String(minutes % 60).padStart(2, '0')}min`
  const days = Math.floor(hours / 24)
  return days === 1 ? '1 dia' : `${days} dias`
}

/** Tempo curto para a lista: "agora", "4 min", "2 h", "ontem", "12/11". */
export function formatAgo(iso: string, now: number): string {
  const ms = now - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  if (hours < 48) return 'ontem'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatDay(iso: string, now: number): string {
  const day = new Date(iso)
  const today = new Date(now)
  const yesterday = new Date(now - 24 * 60 * 60 * 1000)
  if (day.toDateString() === today.toDateString()) return 'Hoje'
  if (day.toDateString() === yesterday.toDateString()) return 'Ontem'
  return day.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export type WindowState = {
  open: boolean
  /** Tempo restante (aberta) ou desde quando fechou (fechada). */
  ms: number
  /** 0–1 do tempo que ainda resta. */
  ratio: number
  tone: 'tone-green' | 'tone-yellow' | 'tone-red' | 'tone-gray'
}

/** Janela de atendimento da Meta: 24h desde a última mensagem do cliente. */
export function windowState(lastCustomerAt: string | null, now: number): WindowState {
  if (!lastCustomerAt) return { open: false, ms: 0, ratio: 0, tone: 'tone-gray' }
  const left = new Date(lastCustomerAt).getTime() + WINDOW_MS - now
  if (left <= 0) return { open: false, ms: -left, ratio: 0, tone: 'tone-gray' }
  const hours = left / 3_600_000
  const tone = hours > 4 ? 'tone-green' : hours > 1 ? 'tone-yellow' : 'tone-red'
  return { open: true, ms: left, ratio: left / WINDOW_MS, tone }
}

/** Espera em Aguardando: amarelo depois de 15 min, vermelho depois de 1 h. */
export function waitTone(ms: number): string {
  const minutes = ms / 60_000
  return minutes >= 60 ? 'tone-red' : minutes >= 15 ? 'tone-yellow' : 'tone-gray'
}

export function fillTemplate(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (match, key: string) => values[key] ?? match)
}
