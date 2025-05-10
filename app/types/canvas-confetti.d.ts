declare module 'canvas-confetti' {
  interface ConfettiOptions {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: {
      x?: number;
      y?: number;
    };
    colors?: string[];
    shapes?: string[];
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
  }

  interface ConfettiCannon {
    fire(options?: ConfettiOptions): void;
    reset(): void;
  }

  type ConfettiFunction = (options?: ConfettiOptions) => Promise<null>;

  interface ConfettiNamespace extends ConfettiFunction {
    create(canvas: HTMLCanvasElement, options?: { resize?: boolean, useWorker?: boolean }): ConfettiCannon;
    reset(): void;
  }

  const confetti: ConfettiNamespace;
  export = confetti;
} 