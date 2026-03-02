/**
 * Ringtone store — manages alarm sound selection.
 * Presets use Web Audio API patterns. Custom uploads are stored as base64 data URLs.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PresetTone =
  | 'classic'
  | 'gentle'
  | 'urgent'
  | 'chime'
  | 'pulse'

export const PRESET_TONES: { id: PresetTone; label: string; emoji: string }[] = [
  { id: 'classic', label: 'Classic Beeps', emoji: '🔔' },
  { id: 'gentle', label: 'Gentle Chime', emoji: '🎵' },
  { id: 'urgent', label: 'Urgent Alarm', emoji: '🚨' },
  { id: 'chime', label: 'Wind Chime', emoji: '🎐' },
  { id: 'pulse', label: 'Soft Pulse', emoji: '💓' },
]

interface RingtoneStore {
  selectedPreset: PresetTone
  customAudioData: string | null   // base64 data URL of uploaded file
  customAudioName: string | null   // filename for display
  useCustom: boolean               // true = use uploaded file, false = use preset

  setPreset: (preset: PresetTone) => void
  setCustomAudio: (dataUrl: string, name: string) => void
  clearCustomAudio: () => void
  setUseCustom: (use: boolean) => void
}

export const useRingtoneStore = create<RingtoneStore>()(
  persist(
    (set) => ({
      selectedPreset: 'classic',
      customAudioData: null,
      customAudioName: null,
      useCustom: false,

      setPreset: (preset) => set({ selectedPreset: preset, useCustom: false }),
      setCustomAudio: (dataUrl, name) =>
        set({ customAudioData: dataUrl, customAudioName: name, useCustom: true }),
      clearCustomAudio: () =>
        set({ customAudioData: null, customAudioName: null, useCustom: false }),
      setUseCustom: (use) => set({ useCustom: use }),
    }),
    { name: 'ringtone-storage' }
  )
)

// ---- Preset tone players using Web Audio API ----

function createCtx() {
  return new (window.AudioContext || (window as any).webkitAudioContext)()
}

function playClassic() {
  try {
    const ctx = createCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 800
    osc.type = 'sine'
    gain.gain.value = 0.3
    osc.start()
    // 3 short beeps
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.3)
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.45)
    gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.6)
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.75)
    osc.stop(ctx.currentTime + 0.8)
  } catch { /* */ }
}

function playGentle() {
  try {
    const ctx = createCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(523, ctx.currentTime)       // C5
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.3) // E5
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.6) // G5
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2)
    osc.start()
    osc.stop(ctx.currentTime + 1.2)
  } catch { /* */ }
}

function playUrgent() {
  try {
    const ctx = createCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'square'
    osc.frequency.value = 880
    gain.gain.value = 0.25
    osc.start()
    // Rapid beeps
    for (let i = 0; i < 6; i++) {
      gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.12)
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12 + 0.06)
    }
    osc.stop(ctx.currentTime + 0.75)
  } catch { /* */ }
}

function playChime() {
  try {
    const ctx = createCtx()
    const notes = [1047, 1319, 1568, 1319, 1047]  // C6 E6 G6 E6 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = ctx.currentTime + i * 0.2
      gain.gain.setValueAtTime(0.15, start)
      gain.gain.linearRampToValueAtTime(0, start + 0.25)
      osc.start(start)
      osc.stop(start + 0.25)
    })
  } catch { /* */ }
}

function playPulse() {
  try {
    const ctx = createCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 440
    osc.start()
    // 2 gentle pulses
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.3)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6)
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.9)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2)
    osc.stop(ctx.currentTime + 1.3)
  } catch { /* */ }
}

const presetPlayers: Record<PresetTone, () => void> = {
  classic: playClassic,
  gentle: playGentle,
  urgent: playUrgent,
  chime: playChime,
  pulse: playPulse,
}

/** Play a preset tone by id */
export function playPresetTone(preset: PresetTone) {
  presetPlayers[preset]?.()
}

/** Play the user's selected alarm (custom or preset) */
export function playSelectedAlarm() {
  const { useCustom, customAudioData, selectedPreset } = useRingtoneStore.getState()

  if (useCustom && customAudioData) {
    try {
      const audio = new Audio(customAudioData)
      audio.volume = 0.5
      audio.play().catch(() => {
        // If custom audio fails, fall back to preset
        playPresetTone(selectedPreset)
      })
    } catch {
      playPresetTone(selectedPreset)
    }
  } else {
    playPresetTone(selectedPreset)
  }
}

/** Read a user-selected audio file and return a base64 data URL (max 500KB) */
export function pickAudioFile(): Promise<{ dataUrl: string; name: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return resolve(null)
      if (file.size > 500 * 1024) {
        alert('Audio file too large. Please select a file under 500 KB.')
        return resolve(null)
      }
      const reader = new FileReader()
      reader.onload = () => {
        resolve({ dataUrl: reader.result as string, name: file.name })
      }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    }
    input.click()
  })
}
