import { Audio } from 'expo-av';
import { Vibration, Platform } from 'react-native';

export type AlarmTone = 'radar' | 'chime' | 'siren' | 'bell';
export type VibrationStyle = 'pulse' | 'heavy' | 'gentle';

class AlarmSoundService {
  private currentSound: Audio.Sound | null = null;
  private isRinging: boolean = false;
  private previewSound: Audio.Sound | null = null;
  private audioModeConfigured: boolean = false;
  private uriCache: Map<string, string> = new Map();

  private async ensureAudioMode() {
    if (this.audioModeConfigured) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      this.audioModeConfigured = true;
    } catch (e) {
      console.warn('[AlarmSoundService] Error setting audio mode:', e);
    }
  }

  /**
   * Generates a loud 16-bit PCM WAV base64 Data URI for a given tone pattern.
   * Completely offline, instantaneous, zero external asset file dependencies.
   * Caches results so mathematical waveform synthesis runs at most once per tone.
   */
  private generateWavUri(tone: AlarmTone, durationSeconds = 1.6): string {
    const cacheKey = `${tone}_${durationSeconds.toFixed(1)}`;
    const cached = this.uriCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const sampleRate = 22050;
    const numSamples = Math.floor(sampleRate * durationSeconds);
    const dataSize = numSamples * 2; // 16-bit mono = 2 bytes per sample
    const fileSize = 44 + dataSize;
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // RIFF header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, fileSize - 8, true);
    this.writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, 1, true); // NumChannels (1 = Mono)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample

    // data sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Synthesis formulas
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      if (tone === 'radar') {
        // High-pitched rapid chirps with echoing pulse
        const pulseCycle = t % 0.4;
        if (pulseCycle < 0.22) {
          const freq = 900 + (pulseCycle / 0.22) * 1100;
          const envelope = Math.sin((pulseCycle / 0.22) * Math.PI);
          sample = Math.sin(2 * Math.PI * freq * t) * envelope;
          // Add second harmonic for loudness
          sample += 0.4 * Math.sin(4 * Math.PI * freq * t) * envelope;
        }
      } else if (tone === 'siren') {
        // Warbling emergency two-tone siren
        const cycle = (Math.sin(2 * Math.PI * 2.5 * t) + 1) / 2; // 2.5 Hz warble
        const freq = 650 + cycle * 450;
        const envelope = 0.85;
        sample = Math.sin(2 * Math.PI * freq * t) * envelope;
        sample += 0.3 * Math.sign(Math.sin(2 * Math.PI * freq * t)) * envelope;
      } else if (tone === 'bell') {
        // Rapid striking alarm bells with metallic ring
        const strikePeriod = 0.2;
        const strikePhase = (t % strikePeriod) / strikePeriod;
        const decay = Math.exp(-strikePhase * 8);
        const f1 = 1100;
        const f2 = 2250;
        sample = (Math.sin(2 * Math.PI * f1 * t) * 0.7 + Math.sin(2 * Math.PI * f2 * t) * 0.4) * decay;
      } else {
        // 'chime' - Upbeat 4-note ascending chord arpeggio
        const noteDuration = 0.35;
        const noteIdx = Math.min(3, Math.floor((t % 1.5) / noteDuration));
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        const currentFreq = notes[noteIdx];
        const noteTime = (t % 1.5) - noteIdx * noteDuration;
        const decay = Math.exp(-noteTime * 3.5);
        sample = (Math.sin(2 * Math.PI * currentFreq * t) * 0.8 + Math.sin(4 * Math.PI * currentFreq * t) * 0.2) * decay;
      }

      // Clamp and write 16-bit signed integer
      sample = Math.max(-1, Math.min(1, sample * 0.95));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(44 + i * 2, intSample, true);
    }

    // High-speed 8KB chunked conversion to base64
    const bytes = new Uint8Array(buffer);
    const CHUNK_SIZE = 8192;
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.subarray(i, i + CHUNK_SIZE);
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    const base64 = btoa(binary);
    const uri = `data:audio/wav;base64,${base64}`;
    this.uriCache.set(cacheKey, uri);
    return uri;
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Starts the loud continuous alarm: audio loop + repeating vibration
   */
  public async startAlarm(tone: AlarmTone = 'radar', vibration: VibrationStyle = 'pulse'): Promise<void> {
    if (this.isRinging) return;
    this.isRinging = true;

    try {
      await this.ensureAudioMode();
      await this.stopAlarmSoundOnly();

      // Trigger continuous vibration loop
      this.startVibrationLoop(vibration);

      const uri = this.generateWavUri(tone, 1.8);
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: true,
          isLooping: true,
          volume: 1.0,
        }
      );
      this.currentSound = sound;
      await sound.playAsync();
      console.log(`[AlarmSoundService] Loud alarm started with tone: ${tone}`);
    } catch (e: any) {
      console.error('[AlarmSoundService] Failed to play loud alarm sound:', e.message || e);
    }
  }

  /**
   * Stops both alarm audio playback, previews, and vibration completely
   */
  public async stopAlarm(): Promise<void> {
    this.isRinging = false;
    this.stopVibration();
    await this.stopAlarmSoundOnly();
    await this.stopPreviewSoundOnly();
    console.log('[AlarmSoundService] Alarm stopped and silenced.');
  }

  private async stopAlarmSoundOnly(): Promise<void> {
    if (this.currentSound) {
      try {
        await this.currentSound.stopAsync();
        await this.currentSound.unloadAsync();
      } catch (e) {
        // ignore unload error
      }
      this.currentSound = null;
    }
  }

  private async stopPreviewSoundOnly(): Promise<void> {
    if (this.previewSound) {
      try {
        await this.previewSound.stopAsync();
        await this.previewSound.unloadAsync();
      } catch (e) {
        // ignore unload error
      }
      this.previewSound = null;
    }
  }

  /**
   * Plays a brief 2-second preview of a tone for settings configuration
   */
  public async previewTone(tone: AlarmTone): Promise<void> {
    try {
      await this.ensureAudioMode();
      await this.stopPreviewSoundOnly();

      const uri = this.generateWavUri(tone, 1.4);
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: true,
          isLooping: false,
          volume: 0.9,
        }
      );
      this.previewSound = sound;
      await sound.playAsync();
    } catch (e: any) {
      console.warn('[AlarmSoundService] Tone preview failed:', e.message);
    }
  }

  private startVibrationLoop(style: VibrationStyle) {
    this.stopVibration();

    let pattern: number[];
    if (style === 'heavy') {
      // Continuous heavy repeating vibration
      pattern = [0, 800, 200, 800, 200];
    } else if (style === 'gentle') {
      // Soft pulsing taps
      pattern = [0, 250, 250, 250, 500];
    } else {
      // Urgent triple pulse rhythm (default)
      pattern = [0, 400, 150, 400, 150, 600, 300];
    }

    // Pass true for repeating pattern on Android
    Vibration.vibrate(pattern, true);
  }

  private stopVibration() {
    Vibration.cancel();
  }

  public getIsRinging(): boolean {
    return this.isRinging;
  }
}

export const alarmSoundService = new AlarmSoundService();
