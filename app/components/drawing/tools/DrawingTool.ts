export interface Point {
  x: number;
  y: number;
}

export type DrawingToolType =
  | "pencil"
  | "brush"
  | "circle"
  | "rectangle"
  | "line"
  | "eraser-precision"
  | "eraser-area";

export interface DrawingToolOptions {
  color: string;
  lineWidth: number;
  opacity?: number;
}

/**
 * Contextos de dibujo para el sistema de capas
 */
export interface LayerContexts {
  /** Contexto para capa de fondo (estática) */
  backgroundCtx: CanvasRenderingContext2D | null;
  /** Contexto para capa principal (dibujo permanente) */
  mainCtx: CanvasRenderingContext2D | null;
  /** Contexto para capa de previsualización (temporal) */
  previewCtx: CanvasRenderingContext2D | null;
  /** Función para limpiar una capa específica */
  clearLayer: (layer?: "background" | "main" | "preview" | "all") => void;
}

/**
 * Datos de calidad de renderizado
 */
export interface RenderQuality {
  /** Nivel de calidad actual */
  level: 'high' | 'medium' | 'low';
  /** Factor de optimización para operaciones complejas (1 = máxima calidad) */
  optimizationFactor: number;
}

/**
 * Interfaz común para todas las herramientas de dibujo
 */
export interface DrawingTool {
  /** Tipo de herramienta */
  type: DrawingToolType;
  /** Opciones configurables de la herramienta */
  options: DrawingToolOptions;

  /**
   * Inicializa la herramienta con los contextos de capas
   * Método opcional que se llama cuando se selecciona una herramienta
   */
  initialize?: (contexts: LayerContexts) => void;

  /**
   * Método para comenzar a dibujar en un punto
   * @param contexts Contextos de las diferentes capas
   * @param point Punto donde comienza el dibujo
   * @param renderQuality Calidad de renderizado actual
   */
  startDrawing: (
    contexts: LayerContexts,
    point: Point,
    renderQuality?: RenderQuality
  ) => void;

  /**
   * Método para continuar dibujando de un punto a otro
   * @param contexts Contextos de las diferentes capas
   * @param from Punto de origen
   * @param to Punto de destino
   * @param renderQuality Calidad de renderizado actual
   */
  continueDrawing: (
    contexts: LayerContexts,
    from: Point,
    to: Point,
    renderQuality?: RenderQuality
  ) => void;

  /**
   * Método para finalizar el dibujo
   * @param contexts Contextos de las diferentes capas
   * @param point Punto final
   * @param renderQuality Calidad de renderizado actual
   */
  endDrawing: (
    contexts: LayerContexts,
    point: Point,
    renderQuality?: RenderQuality
  ) => void;

  /**
   * Método para manejar cambios en la calidad de renderizado
   * @param quality Nueva calidad de renderizado
   */
  updateRenderQuality?: (quality: RenderQuality) => void;

  /**
   * Método para limpiar recursos usados por la herramienta
   * Se llama cuando se cambia a otra herramienta
   */
  cleanup?: () => void;
}

/**
 * Implementación base para herramientas simples
 * Proporciona funcionalidad común para extender fácilmente
 */
export abstract class BaseDrawingTool implements DrawingTool {
  type: DrawingToolType;
  options: DrawingToolOptions;
  protected contexts: LayerContexts | null = null;
  protected isDrawing: boolean = false;
  protected renderQuality: RenderQuality = {
    level: 'high',
    optimizationFactor: 1
  };

  constructor(type: DrawingToolType, options: DrawingToolOptions) {
    this.type = type;
    this.options = {
      ...options,
      opacity: options.opacity !== undefined ? options.opacity : 1
    };
  }

  initialize(contexts: LayerContexts): void {
    this.contexts = contexts;
    this.setupContexts();
  }

  protected setupContexts(): void {
    // Para sobreescribir en clases hijas si necesitan configuración especial
  }

  abstract startDrawing(
    contexts: LayerContexts,
    point: Point,
    renderQuality?: RenderQuality
  ): void;

  abstract continueDrawing(
    contexts: LayerContexts,
    from: Point,
    to: Point,
    renderQuality?: RenderQuality
  ): void;

  abstract endDrawing(
    contexts: LayerContexts,
    point: Point,
    renderQuality?: RenderQuality
  ): void;

  updateRenderQuality(quality: RenderQuality): void {
    this.renderQuality = quality;
  }

  cleanup(): void {
    this.isDrawing = false;
    this.contexts = null;
  }

  /**
   * Aplica las propiedades de dibujo comunes al contexto
   */
  protected applyDrawingSettings(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = this.options.color;
    ctx.fillStyle = this.options.color;
    ctx.lineWidth = this.options.lineWidth;
    ctx.globalAlpha = this.options.opacity || 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  /**
   * Optimiza la frecuencia de dibujado según la calidad de renderizado actual
   */
  protected getOptimizedPoints(from: Point, to: Point): Point[] {
    // En alta calidad, devuelve todos los puntos
    if (this.renderQuality.level === 'high') {
      return [from, to];
    }

    // En calidad media o baja, reduce la cantidad de puntos intermedios
    const distance = Math.sqrt(
      Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2)
    );

    // Factor de optimización basado en la calidad actual
    const factor = this.renderQuality.optimizationFactor;
    const skipPoints = Math.max(1, Math.round(distance / (10 * factor)));

    // Si la distancia es pequeña, devolver puntos originales
    if (skipPoints <= 1) {
      return [from, to];
    }

    // Calcular puntos intermedios con frecuencia reducida
    const points: Point[] = [];
    for (let i = 0; i <= skipPoints; i++) {
      const t = i / skipPoints;
      points.push({
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t
      });
    }

    return points;
  }
}
