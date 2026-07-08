export class GameLoop {
  private animationFrameId: number | null = null;
  private previousTimestamp = 0;

  start(update: (deltaTime: number) => void, render: () => void) {
    const runFrame = (timestamp: number) => {
      if (!this.previousTimestamp) {
        this.previousTimestamp = timestamp;
      }

      // Delta time keeps movement consistent across different monitor refresh rates.
      const deltaTime = (timestamp - this.previousTimestamp) / 1000;
      this.previousTimestamp = timestamp;

      update(deltaTime);
      render();

      this.animationFrameId = window.requestAnimationFrame(runFrame);
    };

    this.animationFrameId = window.requestAnimationFrame(runFrame);
  }

  stop() {
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.previousTimestamp = 0;
  }
}
