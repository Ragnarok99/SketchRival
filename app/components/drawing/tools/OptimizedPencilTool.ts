import { BaseDrawingTool, DrawingToolOptions, LayerContexts, Point, RenderQuality } from "./DrawingTool";
import { throttle } from "../utils/performanceUtils";

/**
 * Herramienta de lápiz optimizada para el sistema de capas
 * Utiliza técnicas de optimización y el sistema de capas para mejorar rendimiento
 */
export class OptimizedPencilTool extends BaseDrawingTool {
  private lastPoint: Point | null = null;
  private pointsBuffer: Point[] = [];
  private bufferThreshold = 4;
  private debugMode = true; // Activar para depuración
  private currentContexts: LayerContexts | null = null;
  private pathStarted = false;

  constructor(options: DrawingToolOptions) {
    super("pencil", options);
  }

  /**
   * Configura los contextos para la herramienta de lápiz
   */
  initialize(contexts: LayerContexts): void {
    super.initialize(contexts);
    // Reiniciar estado interno
    this.lastPoint = null;
    this.pointsBuffer = [];
    this.pathStarted = false;
    this.currentContexts = contexts;
    
    if (this.debugMode) {
      console.log("OptimizedPencilTool.initialize");
    }
  }

  /**
   * Inicia el trazado en el punto especificado
   */
  startDrawing(
    contexts: LayerContexts,
    point: Point,
    renderQuality?: RenderQuality
  ): void {
    if (renderQuality) {
      this.renderQuality = renderQuality;
    }

    // Reiniciar estado
    this.isDrawing = true;
    this.lastPoint = { ...point };
    this.pointsBuffer = [{ ...point }];
    this.pathStarted = false;
    this.currentContexts = contexts;

    // Limpiar el contexto de previsualización
    if (contexts.previewCtx) {
      contexts.clearLayer("preview");
    }

    // Usar contexto de previsualización para dibujar
    const ctx = contexts.previewCtx;
    if (!ctx) return;

    // Configurar contexto
    this.applyDrawingSettings(ctx);

    // Dibujar un punto en la posición inicial
    ctx.beginPath();
    ctx.arc(point.x, point.y, this.options.lineWidth / 4, 0, Math.PI * 2);
    ctx.fill();
    
    if (this.debugMode) {
      console.log("OptimizedPencilTool.startDrawing en", point.x, point.y);
    }
  }

  /**
   * Continúa el trazado desde un punto a otro
   */
  continueDrawing(
    contexts: LayerContexts,
    from: Point,
    to: Point,
    renderQuality?: RenderQuality
  ): void {
    if (!this.isDrawing) return;
    
    if (renderQuality) {
      this.renderQuality = renderQuality;
    }

    this.currentContexts = contexts;
    
    // Verificar si los puntos son diferentes
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Si la distancia es demasiado pequeña, ignorar este evento
    if (distance < 0.5 && this.pointsBuffer.length > 1) {
      return;
    }

    // Añadir el nuevo punto al buffer
    this.pointsBuffer.push({ ...to });
    
    // Actualizar último punto
    this.lastPoint = { ...to };

    if (this.debugMode) {
      console.log("OptimizedPencilTool.continueDrawing de", from.x, from.y, "a", to.x, to.y, "buffer:", this.pointsBuffer.length);
    }

    // Renderizar inmediatamente si hay suficientes puntos o si la distancia es significativa
    if (this.pointsBuffer.length >= this.bufferThreshold || distance > 5) {
      this.renderBuffer(contexts);
    }
  }

  /**
   * Finaliza el trazado en el punto especificado
   */
  endDrawing(
    contexts: LayerContexts,
    point: Point,
    renderQuality?: RenderQuality
  ): void {
    if (!this.isDrawing) return;

    // Asegurarse de que el último punto está en el buffer
    if (this.lastPoint && 
        (this.lastPoint.x !== point.x || this.lastPoint.y !== point.y)) {
      this.pointsBuffer.push({ ...point });
    }

    // Renderizar cualquier punto pendiente
    if (this.pointsBuffer.length > 0) {
      this.renderBuffer(contexts);
    }
    
    if (this.debugMode) {
      console.log("OptimizedPencilTool.endDrawing en", point.x, point.y);
    }

    // Transferir el resultado de la capa de previsualización a la capa principal
    const previewCtx = contexts.previewCtx;
    const mainCtx = contexts.mainCtx;
    
    if (previewCtx && mainCtx) {
      // Copiar el contenido de la capa de previsualización a la capa principal
      try {
        mainCtx.drawImage(previewCtx.canvas, 0, 0);
      } catch (error) {
        console.error("Error al transferir dibujo a capa principal:", error);
      }
      
      // Limpiar la capa de previsualización
      contexts.clearLayer("preview");
    }

    // Reiniciar estado
    this.isDrawing = false;
    this.lastPoint = null;
    this.pointsBuffer = [];
    this.pathStarted = false;
    this.currentContexts = null;
  }

  /**
   * Renderiza los puntos almacenados en el buffer
   */
  private renderBuffer(contexts: LayerContexts): void {
    // Verificar que tenemos suficientes puntos para dibujar
    if (this.pointsBuffer.length < 2) return;

    const ctx = contexts.previewCtx;
    if (!ctx) return;

    // Configurar contexto
    this.applyDrawingSettings(ctx);
    
    if (!this.pathStarted) {
      // Comenzar un nuevo camino solo si no hemos empezado ya
      ctx.beginPath();
      ctx.moveTo(this.pointsBuffer[0].x, this.pointsBuffer[0].y);
      this.pathStarted = true;
    }

    // Dibujar líneas entre los puntos del buffer
    for (let i = 1; i < this.pointsBuffer.length; i++) {
      const p = this.pointsBuffer[i];
      ctx.lineTo(p.x, p.y);
    }
    
    // Aplicar el trazo
    ctx.stroke();
    
    // Comenzar un nuevo camino desde el último punto
    ctx.beginPath();
    ctx.moveTo(this.pointsBuffer[this.pointsBuffer.length - 1].x, 
               this.pointsBuffer[this.pointsBuffer.length - 1].y);
    
    // Mantener solo el último punto en el buffer para continuar desde ahí
    this.pointsBuffer = [this.pointsBuffer[this.pointsBuffer.length - 1]];
    
    if (this.debugMode) {
      console.log("OptimizedPencilTool.renderBuffer - Pintando trazo");
    }
  }

  /**
   * Limpia recursos y finaliza operaciones pendientes
   */
  cleanup(): void {
    // Renderizar cualquier punto pendiente antes de limpiar
    if (this.isDrawing && this.currentContexts && this.pointsBuffer.length > 0) {
      this.renderBuffer(this.currentContexts);
      
      // Transferir a la capa principal
      const { previewCtx, mainCtx } = this.currentContexts;
      if (previewCtx && mainCtx) {
        try {
          mainCtx.drawImage(previewCtx.canvas, 0, 0);
        } catch (error) {
          console.error("Error al transferir dibujo durante limpieza:", error);
        }
        this.currentContexts.clearLayer("preview");
      }
    }
    
    // Reiniciar estado completamente
    this.lastPoint = null;
    this.pointsBuffer = [];
    this.pathStarted = false;
    this.currentContexts = null;
    super.cleanup();
    
    if (this.debugMode) {
      console.log("OptimizedPencilTool.cleanup");
    }
  }
} 