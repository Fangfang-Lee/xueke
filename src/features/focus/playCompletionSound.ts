import type { TimerPhase } from '../../../shared/types'

export function playCompletionSound(phase: TimerPhase): void {
  const AudioContextConstructor = window.AudioContext
  if (!AudioContextConstructor) return

  const context = new AudioContextConstructor()
  const notes = phase === 'focus' ? [880, 1174.66] : [659.25, 880]

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const startAt = context.currentTime + index * 0.24
    const endAt = startAt + 0.28
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(frequency, startAt)
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(0.2, startAt + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(startAt)
    oscillator.stop(endAt)
  })

  void context.resume()
  window.setTimeout(() => void context.close(), 700)
}

export function playModeSwitchSound(): void {
  const AudioContextConstructor = window.AudioContext
  if (!AudioContextConstructor) return
  const context = new AudioContextConstructor()
  ;[880, 1046.5, 1318.51].forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const startAt = context.currentTime + index * 0.12
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(frequency, startAt)
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(0.17, startAt + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.13)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(startAt)
    oscillator.stop(startAt + 0.13)
  })
  void context.resume()
  window.setTimeout(() => void context.close(), 600)
}

export function startRestMusic(url: string): () => void {
  const audio = new Audio(url)
  audio.loop = true
  audio.volume = 0.12
  void audio.play().catch(() => undefined)
  return () => { audio.pause(); audio.currentTime = 0 }
}
