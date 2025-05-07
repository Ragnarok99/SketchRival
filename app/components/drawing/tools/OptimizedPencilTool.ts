import { BaseDrawingTool, DrawingToolOptions, LayerContexts, Point, RenderQuality } from "./DrawingTool";
import { throttle } from "../utils/performanceUtils";

/**
 * Herramienta de lápiz optimizada para el sistema de capas
 * Utiliza técnicas de optimización y el sistema de capas para mejorar rendimiento
 */
export class OptimizedPencilTool extends BaseDrawingTool {
  private lastPoint: Point | null = null;
  private pointsBuffer: Point[] = [];
  private bufferThreshold = 5;
  private throttledRender: (points: Point[]) => void;

  constructor(options: DrawingToolOptions) {
    super("pencil", options);
    // Crear función de dibujo con throttling para mejorar rendimiento
    this.throttledRender = throttle(this.renderBuffer.bind(this), 16); // ~60fps
  }

  /**
   * Configura los contextos para la herramienta de lápiz
   */
  protected setupContexts(): void {
    // Reiniciar estado interno
    this.lastPoint = null;
    this.pointsBuffer = [];
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

    // Usar contexto de previsualización para dibujar
    const ctx = contexts.previewCtx;
    if (!ctx) return;

    // Configurar contexto
    this.applyDrawingSettings(ctx);

    // Dibujar un punto en la posición inicial
    ctx.beginPath();
    ctx.arc(point.x, point.y, this.options.lineWidth / 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Preparar para continuar dibujando
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
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
    if (!this.isDrawing || !this.lastPoint) return;
    
    if (renderQuality) {
      this.renderQuality = renderQuality;
    }

    // Añadir el nuevo punto al buffer
    this.pointsBuffer.push({ ...to });
    
    // Actualizar último punto
    this.lastPoint = { ...to };

    // Renderizar el buffer cuando alcance el umbral
    if (this.pointsBuffer.length >= this.bufferThreshold) {
      this.throttledRender(this.pointsBuffer);
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

    // Renderizar los puntos pendientes sin throttling
    this.renderBuffer(this.pointsBuffer, contexts);

    // Transferir el resultado de la capa de previsualización a la capa principal
    const previewCtx = contexts.previewCtx;
    const mainCtx = contexts.mainCtx;
    
    if (previewCtx && mainCtx) {
      // Copiar el contenido de la capa de previsualización a la capa principal
      const canvas = previewCtx.canvas;
      mainCtx.drawImage(canvas, 0, 0);
      
      // Limpiar la capa de previsualización
      contexts.clearLayer("preview");
    }

    // Reiniciar estado
    this.isDrawing = false;
    this.lastPoint = null;
    this.pointsBuffer = [];
  }

  /**
   * Renderiza los puntos almacenados en el buffer
   * @param points Puntos a renderizar
   * @param customContexts Contextos opcionales (si no se especifican, usa los almacenados)
   */
  private renderBuffer(
    points: Point[],
    customContexts?: LayerContexts
  ): void {
    if (points.length < 2) return;

    const contexts = customContexts || this.contexts;
    if (!contexts) return;

    const ctx = contexts.previewCtx;
    if (!ctx) return;

    // Configurar contexto
    this.applyDrawingSettings(ctx);

    // Si hay muchos puntos, optimizar según nivel de calidad
    if (points.length > 20 && this.renderQuality.level !== 'high') {
      const step = this.renderQuality.level === 'low' ? 4 : 2;
      const reducedPoints = [];
      
      for (let i = 0; i < points.length; i += step) {
        reducedPoints.push(points[i]);
      }
      
      // Asegurar que se incluya el último punto
      if (reducedPoints[reducedPoints.length - 1] !== points[points.length - 1]) {
        reducedPoints.push(points[points.length - 1]);
      }
      
      points = reducedPoints;
    }

    // Dibujar líneas con curvas suavizadas
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    // Dibujar curvas usando puntos de control para suavizar
    for (let i = 1; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      
      // Punto medio entre puntos para curva cuadrática
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      
      ctx.quadraticCurveTo(current.x, current.y, midX, midY);
    }

    // Manejar el último punto si existe
    if (points.length > 1) {
      const lastPoint = points[points.length - 1];
      ctx.lineTo(lastPoint.x, lastPoint.y);
    }

    // Aplicar trazo
    ctx.stroke();
    
    // Reiniciar buffer después de renderizar
    this.pointsBuffer = [points[points.length - 1]];
  }

  /**
   * Actualiza la configuración de calidad de renderizado
   */
  updateRenderQuality(quality: RenderQuality): void {
    super.updateRenderQuality(quality);
    
    // Ajustar buffer threshold según calidad
    switch (quality.level) {
      case 'high':
        this.bufferThreshold = 2;
        break;
      case 'medium':
        this.bufferThreshold = 5;
        break;
      case 'low':
        this.bufferThreshold = 8;
        break;
    }
  }

  /**
   * Limpia recursos y finaliza operaciones pendientes
   */
  cleanup(): void {
    // Renderizar cualquier punto pendiente antes de limpiar
    if (this.isDrawing && this.contexts && this.pointsBuffer.length > 0) {
      this.renderBuffer(this.pointsBuffer);
      
      // Transferir a la capa principal
      const { previewCtx, mainCtx } = this.contexts;
      if (previewCtx && mainCtx) {
        mainCtx.drawImage(previewCtx.canvas, 0, 0);
        this.contexts.clearLayer("preview");
      }
    }
    
    super.cleanup();
  }
} 