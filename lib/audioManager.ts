export class AudioManager {
  private context: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loops = new Map<string, { source: AudioBufferSourceNode; gain: GainNode }>();
  private sfxGainValue = 0.5;
  private musicGainValue = 0.35;

  private async getContext() {
    if (!this.context) {
      // Lazy creation avoids browser autoplay restrictions before user input.
      this.context = new AudioContext();
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    return this.context;
  }

  async load(soundId: string, sourceUrl: string) {
    if (this.buffers.has(soundId)) return;
    const context = await this.getContext();
    const response = await fetch(sourceUrl);

    if (!response.ok) {
      throw new Error(`Unable to load sound: ${sourceUrl}`);
    }

    const data = await response.arrayBuffer();
    const decoded = await context.decodeAudioData(data.slice(0));
    this.buffers.set(soundId, decoded);
  }

  /** Load many sounds; failures are logged, not fatal (missing SFX != broken game). */
  async loadAll(entries: Record<string, string>) {
    await Promise.all(
      Object.entries(entries).map(([id, url]) =>
        this.load(id, url).catch((error) => {
          console.warn(`[audio] failed to load "${id}" from ${url}:`, error);
        }),
      ),
    );
  }

  async play(soundId: string, volume = 1, playbackRate = 1) {
    const context = await this.getContext();
    const buffer = this.buffers.get(soundId);

    if (!buffer) {
      return;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    const gain = context.createGain();
    gain.gain.value = this.sfxGainValue * volume;
    source.connect(gain);
    gain.connect(context.destination);
    source.start();
  }

  /** Start (or restart) a looping track under the given loop id. */
  async playLoop(loopId: string, soundId: string) {
    const context = await this.getContext();
    const buffer = this.buffers.get(soundId);
    if (!buffer) return;

    const existing = this.loops.get(loopId);
    if (existing) {
      existing.source.stop();
      this.loops.delete(loopId);
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = context.createGain();
    gain.gain.value = this.musicGainValue;
    source.connect(gain);
    gain.connect(context.destination);
    source.start();
    this.loops.set(loopId, { source, gain });
  }

  stopLoop(loopId: string) {
    const loop = this.loops.get(loopId);
    if (loop) {
      loop.source.stop();
      this.loops.delete(loopId);
    }
  }

  stopAllLoops() {
    for (const loopId of Array.from(this.loops.keys())) this.stopLoop(loopId);
  }

  async close() {
    this.stopAllLoops();
    if (!this.context) return;
    const context = this.context;
    this.context = null;
    try {
      await context.close();
    } catch {
      // Ignore close failures in constrained/unsupported environments.
    }
  }
}
