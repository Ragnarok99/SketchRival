/**
 * Gestor de historial para operaciones de deshacer/rehacer en el canvas
 */
export class HistoryManager {
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private maxStackSize: number;
  private isCapturing: boolean = false;

  /**
   * Constructor del gestor de historial
   * @param maxStackSize Número máximo de estados a almacenar para optimizar memoria
   */
  constructor(maxStackSize: number = 30) {
    this.maxStackSize = maxStackSize;
  }

  /**
   * Captura el estado actual del canvas y lo añade al historial
   * @param canvas El elemento canvas a capturar
   * @param throttleDelay Opcional: tiempo en ms para throttling de capturas
   */
  public captureState(
    canvas: HTMLCanvasElement,
    throttleDelay: number = 0
  ): void {
    // Evita capturas duplicadas en operaciones rápidas
    if (this.isCapturing) return;

    this.isCapturing = true;

    const captureSnapshot = () => {
      try {
        // Captura el estado actual como una imagen en formato DataURL
        const snapshot = canvas.toDataURL('image/png');

        // Solo guarda si es diferente al último estado
        if (
          this.undoStack.length === 0 ||
          this.undoStack[this.undoStack.length - 1] !== snapshot
        ) {
          // Agregar al stack de deshacer
          this.undoStack.push(snapshot);

          // Limpiar el stack de rehacer cuando se añade una nueva acción
          this.redoStack = [];

          // Limitar el tamaño del historial
          if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift(); // Elimina el estado más antiguo
          }
        }
      } catch (error) {
        console.error('Error al capturar estado del canvas:', error);
      }

      this.isCapturing = false;
    };

    // Aplicar throttling si se especifica un tiempo
    if (throttleDelay > 0) {
      setTimeout(captureSnapshot, throttleDelay);
    } else {
      captureSnapshot();
    }
  }

  /**
   * Deshace la última acción y devuelve el estado anterior
   * @returns URL de datos de la imagen anterior o null si no hay estados
   */
  public undo(): string | null {
    // Verifica si hay acciones para deshacer
    if (this.undoStack.length <= 1) {
      return null; // No hay suficientes estados para deshacer
    }

    // Obtener el estado actual antes de deshacer y añadirlo al stack de rehacer
    const currentState = this.undoStack.pop();
    if (currentState) {
      this.redoStack.push(currentState);
    }

    // Devolver el estado anterior (ahora el último en el stack de deshacer)
    return this.undoStack[this.undoStack.length - 1] || null;
  }

  /**
   * Rehace la última acción deshecha
   * @returns URL de datos de la siguiente imagen o null si no hay estados
   */
  public redo(): string | null {
    // Verifica si hay acciones para rehacer
    if (this.redoStack.length === 0) {
      return null;
    }

    // Obtener el siguiente estado y moverlo al stack de deshacer
    const nextState = this.redoStack.pop();
    if (nextState) {
      this.undoStack.push(nextState);
      return nextState;
    }

    return null;
  }

  /**
   * Limpia el historial completo
   */
  public clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Verifica si hay acciones que se pueden deshacer
   */
  public canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  /**
   * Verifica si hay acciones que se pueden rehacer
   */
  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Obtiene el número de estados en el historial para deshacer
   */
  public getUndoStackSize(): number {
    return Math.max(0, this.undoStack.length - 1);
  }

  /**
   * Obtiene el número de estados en el historial para rehacer
   */
  public getRedoStackSize(): number {
    return this.redoStack.length;
  }
} 