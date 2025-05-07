import { DrawingTool, DrawingToolOptions, DrawingToolType, LayerContexts, Point, RenderQuality } from "./DrawingTool";

/**
 * Adaptador que permite utilizar herramientas de dibujo antiguas con el nuevo sistema de capas.
 * Implementa una capa de compatibilidad para facilitar la transición sin necesidad de reescribir
 * todas las herramientas de dibujo existentes.
 */
export class ToolAdapter implements DrawingTool {
  type: DrawingToolType;
  options: DrawingToolOptions;

  /**
   * Referencia a la herramienta original que se está adaptando
   */
  private originalTool: {
    type: DrawingToolType;
    options: DrawingToolOptions;
    startDrawing: (ctx: CanvasRenderingContext2D, point: Point) => void;
    continueDrawing: (
      ctx: CanvasRenderingContext2D,
      from: Point,
      to: Point
    ) => void;
    endDrawing: (ctx: CanvasRenderingContext2D, point: Point) => void;
  };

  constructor(originalTool: {
    type: DrawingToolType;
    options: DrawingToolOptions;
    startDrawing: (ctx: CanvasRenderingContext2D, point: Point) => void;
    continueDrawing: (
      ctx: CanvasRenderingContext2D,
      from: Point,
      to: Point
    ) => void;
    endDrawing: (ctx: CanvasRenderingContext2D, point: Point) => void;
  }) {
    this.originalTool = originalTool;
    this.type = originalTool.type;
    this.options = originalTool.options;
  }

  /**
   * Determina qué contexto utilizar, priorizando capa de previsualización
   * para operaciones de dibujo interactivas.
   */
  private getTargetContext(contexts: LayerContexts): CanvasRenderingContext2D | null {
    // Preferimos la capa de previsualización para la mayoría de las herramientas
    if (contexts.previewCtx) {
      return contexts.previewCtx;
    }
    
    // Capa principal como fallback
    if (contexts.mainCtx) {
      return contexts.mainCtx;
    }
    
    // Capa de fondo solo si nada más está disponible
    return contexts.backgroundCtx;
  }

  /**
   * Inicia el dibujo adaptando la llamada al sistema de capas
   */
  startDrawing(
    contexts: LayerContexts,
    point: Point,
    renderQuality?: RenderQuality
  ): void {
    const ctx = this.getTargetContext(contexts);
    if (!ctx) return;

    // Llamar al método original con el contexto adecuado
    this.originalTool.startDrawing(ctx, point);
  }

  /**
   * Continúa el dibujo adaptando la llamada al sistema de capas
   */
  continueDrawing(
    contexts: LayerContexts,
    from: Point,
    to: Point,
    renderQuality?: RenderQuality
  ): void {
    const ctx = this.getTargetContext(contexts);
    if (!ctx) return;

    // Llamar al método original con el contexto adecuado
    this.originalTool.continueDrawing(ctx, from, to);
  }

  /**
   * Finaliza el dibujo y transfiere el resultado a la capa principal si es necesario
   */
  endDrawing(
    contexts: LayerContexts,
    point: Point,
    renderQuality?: RenderQuality
  ): void {
    const ctx = this.getTargetContext(contexts);
    if (!ctx) return;

    // Llamar al método original con el contexto adecuado
    this.originalTool.endDrawing(ctx, point);

    // Si estamos dibujando en la capa de previsualización, transferir a la capa principal
    if (ctx === contexts.previewCtx && contexts.previewCtx && contexts.mainCtx) {
      // Transferir el contenido a la capa principal
      contexts.mainCtx.drawImage(contexts.previewCtx.canvas, 0, 0);
      
      // Limpiar la capa de previsualización
      contexts.clearLayer("preview");
    }
  }

  /**
   * Limpia cualquier recurso utilizado por la herramienta
   * Método de la interfaz DrawingTool implementado como no-op para herramientas antiguas
   */
  cleanup(): void {
    // Las herramientas antiguas no tienen método de limpieza
  }

  /**
   * Actualiza la calidad de renderizado
   * Método de la interfaz DrawingTool implementado como no-op para herramientas antiguas
   */
  updateRenderQuality(quality: RenderQuality): void {
    // Las herramientas antiguas no soportan ajustes de calidad
  }
} 