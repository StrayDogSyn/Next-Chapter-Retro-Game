export class AudioManager {
  private context: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();

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
    const context = await this.getContext();
    const response = await fetch(sourceUrl);

    if (!response.ok) {
      throw new Error(`Unable to load sound: ${sourceUrl}`);
    }

    const data = await response.arrayBuffer();
    const decoded = await context.decodeAudioData(data.slice(0));
    this.buffers.set(soundId, decoded);
  }

  async play(soundId: string) {
    const context = await this.getContext();
    const buffer = this.buffers.get(soundId);

    if (!buffer) {
      return;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start();
  }
}
