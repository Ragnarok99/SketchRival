/**
 * Utilidades para optimizar el rendimiento en operaciones de canvas
 */

/**
 * Función de throttling para limitar la frecuencia de ejecución de una función
 * @param func Función a ejecutar
 * @param limit Límite de tiempo en ms entre ejecuciones
 * @returns Función con throttling aplicado
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let lastArgs: Parameters<T> | null = null;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function throttled(this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const context = this;

    if (now - lastCall < limit) {
      // Guardar los últimos argumentos para una posible ejecución final
      lastArgs = args;

      // Si no hay un timeout programado, configurar uno para asegurar que la última llamada se ejecuta
      if (!timeout) {
        timeout = setTimeout(() => {
          timeout = null;
          lastCall = Date.now();
          if (lastArgs) {
            func.apply(context, lastArgs);
            lastArgs = null;
          }
        }, limit - (now - lastCall));
      }
      return;
    }

    // Si ha pasado el tiempo límite, ejecutar inmediatamente
    lastCall = now;
    func.apply(context, args);
    lastArgs = null;

    // Limpiar cualquier timeout pendiente
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
}

/**
 * Función de debouncing para retrasar la ejecución hasta que el evento se detenga
 * @param func Función a ejecutar
 * @param delay Tiempo de espera en ms
 * @param leading Ejecutar al inicio en lugar de al final
 * @returns Función con debouncing aplicado
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  leading = false
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function debounced(this: any, ...args: Parameters<T>) {
    const context = this;
    
    const executeFunc = () => {
      func.apply(context, args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    if (leading && !timeout) {
      executeFunc();
    }

    timeout = setTimeout(() => {
      if (!leading) {
        executeFunc();
      }
      timeout = null;
    }, delay);
  };
}

/**
 * Clase para gestionar animaciones optimizadas con requestAnimationFrame
 */
export class AnimationLoop {
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private targetFPS: number = 60;
  private frameInterval: number;
  private renderCallback: (deltaTime: number) => void;

  /**
   * Constructor del gestor de animaciones
   * @param renderCallback Función de renderizado a ejecutar en cada frame
   * @param targetFPS FPS objetivo (por defecto 60)
   */
  constructor(
    renderCallback: (deltaTime: number) => void,
    targetFPS = 60
  ) {
    this.renderCallback = renderCallback;
    this.targetFPS = targetFPS;
    this.frameInterval = 1000 / targetFPS;
  }

  /**
   * Inicia el bucle de animación
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
  }

  /**
   * Detiene el bucle de animación
   */
  stop(): void {
    if (!this.isRunning || this.animationFrameId === null) return;
    
    cancelAnimationFrame(this.animationFrameId);
    this.isRunning = false;
    this.animationFrameId = null;
  }

  /**
   * Bucle principal de renderizado
   */
  private loop(currentTime: number): void {
    if (!this.isRunning) return;
    
    // Calcular tiempo transcurrido desde el último frame
    const deltaTime = currentTime - this.lastFrameTime;
    
    // Ejecutar renderizado solo si ha pasado el tiempo adecuado
    if (deltaTime >= this.frameInterval) {
      // Ajustar tiempo del último frame para mantener precisión
      this.lastFrameTime = currentTime - (deltaTime % this.frameInterval);
      
      // Llamar a la función de renderizado
      this.renderCallback(deltaTime);
    }
    
    // Programar el siguiente frame
    this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
  }

  /**
   * Cambia la frecuencia objetivo de frames
   */
  setTargetFPS(fps: number): void {
    this.targetFPS = fps;
    this.frameInterval = 1000 / fps;
  }

  /**
   * Verifica si el bucle está activo
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

/**
 * Función para optimizar operaciones de pixel en canvas
 * @param ctx Contexto del canvas
 * @param callback Función a ejecutar con los datos de la imagen
 */
export function optimizedPixelOperation(
  ctx: CanvasRenderingContext2D,
  callback: (imageData: ImageData) => void
): void {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;
  
  // Obtener todos los datos de píxeles de una vez
  const imageData = ctx.getImageData(0, 0, width, height);
  
  // Procesar los datos
  callback(imageData);
  
  // Dibujar los datos procesados de vuelta al canvas
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Mide el tiempo de ejecución de una función
 * @param callback Función a medir
 * @param label Etiqueta para el log (opcional)
 * @returns Resultado de la función
 */
export function measurePerformance<T>(
  callback: () => T,
  label?: string
): T {
  const start = performance.now();
  const result = callback();
  const end = performance.now();
  
  if (label) {
    console.log(`${label}: ${end - start}ms`);
  }
  
  return result;
}

/**
 * Clase para monitorear y gestionar el rendimiento del canvas
 */
export class PerformanceMonitor {
  private framesTimes: number[] = [];
  private maxSamples: number = 60;
  private warningThreshold: number = 16.7; // ~60fps
  private criticalThreshold: number = 33.3; // ~30fps
  private adaptiveQualityCallback?: (quality: 'high' | 'medium' | 'low') => void;
  
  /**
   * Registra el tiempo de un frame
   * @param deltaTime Tiempo en ms que tardó el frame
   */
  logFrameTime(deltaTime: number): void {
    this.framesTimes.push(deltaTime);
    
    // Mantener solo las últimas muestras
    if (this.framesTimes.length > this.maxSamples) {
      this.framesTimes.shift();
    }
    
    // Adaptar calidad si es necesario
    this.checkPerformance();
  }
  
  /**
   * Obtiene el tiempo promedio de frame
   */
  getAverageFrameTime(): number {
    if (this.framesTimes.length === 0) return 0;
    
    const sum = this.framesTimes.reduce((acc, time) => acc + time, 0);
    return sum / this.framesTimes.length;
  }
  
  /**
   * Obtiene los FPS actuales aproximados
   */
  getCurrentFPS(): number {
    const avgTime = this.getAverageFrameTime();
    return avgTime > 0 ? 1000 / avgTime : 0;
  }
  
  /**
   * Verifica el rendimiento y adapta la calidad si es necesario
   */
  private checkPerformance(): void {
    if (!this.adaptiveQualityCallback || this.framesTimes.length < 10) return;
    
    const avgTime = this.getAverageFrameTime();
    
    if (avgTime > this.criticalThreshold) {
      // Rendimiento crítico, reducir calidad al mínimo
      this.adaptiveQualityCallback('low');
    } else if (avgTime > this.warningThreshold) {
      // Rendimiento bajo, reducir calidad
      this.adaptiveQualityCallback('medium');
    } else {
      // Buen rendimiento, usar calidad alta
      this.adaptiveQualityCallback('high');
    }
  }
  
  /**
   * Establece una función para adaptar la calidad según el rendimiento
   */
  setAdaptiveQualityCallback(
    callback: (quality: 'high' | 'medium' | 'low') => void
  ): void {
    this.adaptiveQualityCallback = callback;
  }
  
  /**
   * Reinicia las mediciones
   */
  reset(): void {
    this.framesTimes = [];
  }
} 