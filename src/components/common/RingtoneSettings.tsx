import React, { useState } from 'react'
import {
  useRingtoneStore,
  PRESET_TONES,
  playPresetTone,
  playSelectedAlarm,
  pickAudioFile,
} from '../../store/ringtoneStore'
import { Volume2, Play, X, Upload, Music } from 'lucide-react'

const RingtoneSettings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const {
    selectedPreset,
    customAudioData,
    customAudioName,
    useCustom,
    setPreset,
    setCustomAudio,
    clearCustomAudio,
    setUseCustom,
  } = useRingtoneStore()

  const [uploading, setUploading] = useState(false)

  const handleUpload = async () => {
    setUploading(true)
    const result = await pickAudioFile()
    if (result) {
      setCustomAudio(result.dataUrl, result.name)
    }
    setUploading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal ringtone-modal" onClick={(e) => e.stopPropagation()}>
        <h3><Volume2 size={18} /> Notification Sound</h3>

        <div className="ringtone-section">
          <div className="ringtone-section-title">Preset Tones</div>
          <div className="ringtone-presets">
            {PRESET_TONES.map((tone) => (
              <div
                key={tone.id}
                className={`ringtone-option ${!useCustom && selectedPreset === tone.id ? 'active' : ''}`}
                onClick={() => setPreset(tone.id)}
              >
                <span className="ringtone-emoji">{tone.emoji}</span>
                <span className="ringtone-label">{tone.label}</span>
                <button
                  className="btn-icon ringtone-preview"
                  onClick={(e) => {
                    e.stopPropagation()
                    playPresetTone(tone.id)
                  }}
                  title="Preview"
                >
                  <Play size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="ringtone-section">
          <div className="ringtone-section-title">Custom Ringtone</div>
          {customAudioData ? (
            <div className={`ringtone-option custom-option ${useCustom ? 'active' : ''}`}>
              <Music size={16} />
              <span className="ringtone-label" onClick={() => setUseCustom(true)}>
                {customAudioName || 'Custom audio'}
              </span>
              <button
                className="btn-icon ringtone-preview"
                onClick={() => {
                  setUseCustom(true)
                  playSelectedAlarm()
                }}
                title="Preview"
              >
                <Play size={12} />
              </button>
              <button
                className="btn-icon danger"
                onClick={clearCustomAudio}
                title="Remove"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <p className="ringtone-hint">
              Upload a short audio file (.mp3, .wav, .ogg — max 500 KB) from your device.
            </p>
          )}
          <button
            className="btn btn-sm btn-secondary ringtone-upload-btn"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? '...' : <><Upload size={14} /> Upload Audio File</>}
          </button>
        </div>

        <div className="ringtone-section">
          <div className="ringtone-section-title">Test Current Selection</div>
          <button
            className="btn btn-primary btn-sm"
            onClick={playSelectedAlarm}
          >
            <Volume2 size={14} /> Play Current Sound
          </button>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default RingtoneSettings
