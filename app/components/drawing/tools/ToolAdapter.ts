import { DrawingTool, DrawingToolOptions, DrawingToolType, LayerContexts, Point, RenderQuality } from "./DrawingTool";

/**
 * Adaptador mejorado que permite utilizar herramientas de dibujo antiguas con el nuevo sistema de capas.
 * Implementa una capa de compatibilidad más robusta para facilitar la transición sin necesidad de reescribir
 * todas las herramientas de dibujo existentes.
 */
export class ToolAdapter implements DrawingTool {
  type: DrawingToolType;
  options: DrawingToolOptions;
  private isDrawing: boolean = false;
  private temporaryCanvas: HTMLCanvasElement | null = null;
  private temporaryCtx: CanvasRenderingContext2D | null = null;
  private lastUpdatePoint: Point | null = null;
  private currentContext: CanvasRenderingContext2D | null = null;
  private currentContexts: LayerContexts | null = null;
  private isSingleContextMode: boolean = false;
  // Banderas para el manejo mejorado de herramientas
  private hasStartedDrawing: boolean = false;
  private isDragTool: boolean = false;
  private dragStartPoint: Point | null = null;
  private debugMode: boolean = true; // Activa mensajes de depuración

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
    
    // Determinar si la herramienta es de arrastre (como rectángulo, círculo o línea) 
    // o de dibujo continuo (como lápiz o pincel)
    this.isDragTool = ['circle', 'rectangle', 'line', 'eraser-area'].includes(this.type);
    
    if (this.debugMode) {
      console.log(`ToolAdapter creado para ${this.type}, isDragTool: ${this.isDragTool}`);
    }
  }

  /**
   * Inicializa recursos necesarios para la herramienta
   */
  initialize(contexts: LayerContexts): void {
    this.currentContexts = contexts;
    
    // Determinar si estamos en modo de contexto único (Canvas estándar)
    this.isSingleContextMode = !contexts.previewCtx && !!contexts.mainCtx;
    this.hasStartedDrawing = false;
    this.dragStartPoint = null;
    
    // En modo de contexto único, no necesitamos canvas temporal
    if (!this.isSingleContextMode) {
      this.setupTemporaryCanvas(contexts);
    }
    
    if (this.debugMode) {
      console.log(`ToolAdapter.initialize para ${this.type}, modo: ${this.isSingleContextMode ? 'contexto único' : 'capas'}`);
    }
  }

  /**
   * Crea y configura un canvas temporal para herramientas que necesitan
   * renderizado intermedio (círculos, rectángulos, líneas, etc.)
   */
  private setupTemporaryCanvas(contexts: LayerContexts): void {
    // Solo crear el canvas temporal si no existe ya y si necesitamos previsualización
    if ((this.temporaryCanvas && this.temporaryCtx) || this.isSingleContextMode) return;
    
    // Usar canvas de previsualización como referencia para dimensiones
    const canvas = contexts.previewCtx?.canvas || contexts.mainCtx?.canvas;
    if (!canvas) return;
    
    // Crear canvas temporal con las mismas dimensiones
    this.temporaryCanvas = document.createElement('canvas');
    this.temporaryCanvas.width = canvas.width;
    this.temporaryCanvas.height = canvas.height;
    
    // Obtener contexto 
    this.temporaryCtx = this.temporaryCanvas.getContext('2d', {
      willReadFrequently: true
    });
    
    // Aplicar configuración de alta calidad
    if (this.temporaryCtx) {
      this.temporaryCtx.imageSmoothingEnabled = true;
      this.temporaryCtx.imageSmoothingQuality = 'high';
      
      // Ajustar escala para pantallas de alta densidad
      const dpr = window.devicePixelRatio || 1;
      if (dpr > 1) {
        this.temporaryCtx.scale(dpr, dpr);
      }
    }
    
    if (this.debugMode) {
      console.log(`TemporaryCanvas configurado para ${this.type}`);
    }
  }

  /**
   * Inicia el dibujo adaptando la llamada al sistema de capas
   */
  startDrawing(
    contexts: LayerContexts,
    point: Point,
    renderQuality?: RenderQuality
  ): void {
    this.isDrawing = true;
    this.hasStartedDrawing = true;
    this.lastUpdatePoint = { ...point };
    this.dragStartPoint = { ...point }; // Guardar punto inicial para herramientas de arrastre
    this.currentContexts = contexts;
    
    if (this.debugMode) {
      console.log(`ToolAdapter.startDrawing para ${this.type} en (${point.x}, ${point.y})`);
    }
    
    // Limpiar preview para todas las herramientas al iniciar un nuevo trazo
    if (contexts.previewCtx) {
      contexts.clearLayer("preview");
    }
    
    // Para herramientas de arrastre, usar canvas temporal
    if (this.isDragTool && !this.isSingleContextMode) {
      // Limpiar el canvas temporal
      if (this.temporaryCtx && this.temporaryCanvas) {
        this.temporaryCtx.clearRect(0, 0, this.temporaryCanvas.width, this.temporaryCanvas.height);
        
        // Configurar contexto
        this.applyStyles(this.temporaryCtx);
        
        // Llamar a la herramienta original
        this.originalTool.startDrawing(this.temporaryCtx, point);
      }
    } else {
      // Para herramientas de dibujo continuo, usar previewCtx o mainCtx
      const ctx = this.isSingleContextMode ? contexts.mainCtx : contexts.previewCtx;
      if (!ctx) return;
      
      // Configurar contexto
      this.applyStyles(ctx);
      
      // Llamar a la herramienta original
      this.originalTool.startDrawing(ctx, point);
    }
  }

  /**
   * Aplica los estilos de dibujo al contexto
   */
  private applyStyles(ctx: CanvasRenderingContext2D): void {
    ctx.lineWidth = this.options.lineWidth || 2;
    ctx.strokeStyle = this.options.color || '#000000';
    ctx.fillStyle = this.options.color || '#000000';
    ctx.globalAlpha = this.options.opacity || 1.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
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
    if (!this.isDrawing || !this.hasStartedDrawing) {
      if (this.debugMode) {
        console.warn(`ToolAdapter.continueDrawing ignorado para ${this.type}: isDrawing=${this.isDrawing}, hasStartedDrawing=${this.hasStartedDrawing}`);
      }
      return;
    }
    
    this.lastUpdatePoint = { ...to };
    this.currentContexts = contexts;
    
    if (this.debugMode) {
      console.log(`ToolAdapter.continueDrawing para ${this.type} de (${from.x}, ${from.y}) a (${to.x}, ${to.y})`);
    }
    
    // Para herramientas de arrastre
    if (this.isDragTool && !this.isSingleContextMode) {
      // Usar el punto inicial y el punto actual
      const startPoint = this.dragStartPoint || from;
      
      // Limpiar el canvas temporal
      if (this.temporaryCtx && this.temporaryCanvas) {
        this.temporaryCtx.clearRect(0, 0, this.temporaryCanvas.width, this.temporaryCanvas.height);
        
        // Configurar contexto
        this.applyStyles(this.temporaryCtx);
        
        // Para herramientas de arrastre, necesitamos el punto inicial
        this.originalTool.startDrawing(this.temporaryCtx, startPoint);
        this.originalTool.continueDrawing(this.temporaryCtx, startPoint, to);
        
        // Copiar al canvas de previsualización
        if (contexts.previewCtx) {
          contexts.clearLayer("preview");
          contexts.previewCtx.drawImage(this.temporaryCanvas, 0, 0);
        }
      }
    } else {
      // Para herramientas de dibujo continuo
      const ctx = this.isSingleContextMode ? contexts.mainCtx : contexts.previewCtx;
      if (!ctx) return;
      
      // Configurar contexto
      this.applyStyles(ctx);
      
      // Llamar a continueDrawing de la herramienta original
      this.originalTool.continueDrawing(ctx, from, to);
    }
  }

  /**
   * Finaliza el dibujo y transfiere el resultado a la capa principal si es necesario
   */
  endDrawing(
    contexts: LayerContexts,
    point: Point,
    renderQuality?: RenderQuality
  ): void {
    if (!this.isDrawing || !this.hasStartedDrawing) {
      if (this.debugMode) {
        console.warn(`ToolAdapter.endDrawing ignorado para ${this.type}: isDrawing=${this.isDrawing}, hasStartedDrawing=${this.hasStartedDrawing}`);
      }
      return;
    }
    
    this.currentContexts = contexts;
    
    if (this.debugMode) {
      console.log(`ToolAdapter.endDrawing para ${this.type} en (${point.x}, ${point.y})`);
    }
    
    // Para herramientas de arrastre, finalizar en el canvas temporal
    if (this.isDragTool && !this.isSingleContextMode && this.temporaryCtx) {
      const startPoint = this.dragStartPoint || point;
      
      // Configurar contexto
      this.applyStyles(this.temporaryCtx);
      
      // Finalizar en el contexto temporal
      this.originalTool.endDrawing(this.temporaryCtx, point);
      
      // Transferir al contexto principal
      if (contexts.mainCtx && this.temporaryCanvas) {
        contexts.mainCtx.drawImage(this.temporaryCanvas, 0, 0);
      }
    } else {
      // Para herramientas de dibujo continuo
      const previewCtx = this.isSingleContextMode ? null : contexts.previewCtx;
      const mainCtx = contexts.mainCtx;
      
      if (previewCtx) {
        // Finalizar en preview
        this.applyStyles(previewCtx);
        this.originalTool.endDrawing(previewCtx, point);
        
        // Transferir a main
        if (mainCtx) {
          mainCtx.drawImage(previewCtx.canvas, 0, 0);
        }
      } else if (mainCtx) {
        // Finalizar directamente en main
        this.applyStyles(mainCtx);
        this.originalTool.endDrawing(mainCtx, point);
      }
    }
    
    // Limpiar capa de previsualización
    if (contexts.previewCtx) {
      contexts.clearLayer("preview");
    }
    
    // Limpiar canvas temporal
    if (this.temporaryCtx && this.temporaryCanvas) {
      this.temporaryCtx.clearRect(0, 0, this.temporaryCanvas.width, this.temporaryCanvas.height);
    }
    
    // Reiniciar estado
    this.isDrawing = false;
    this.hasStartedDrawing = false;
    this.lastUpdatePoint = null;
    this.dragStartPoint = null;
    this.currentContext = null;
  }

  /**
   * Limpia cualquier recurso utilizado por la herramienta
   */
  cleanup(): void {
    // Finalizar cualquier dibujo pendiente
    if (this.isDrawing && this.currentContexts && this.lastUpdatePoint) {
      this.endDrawing(this.currentContexts, this.lastUpdatePoint);
    }
    
    // Limpiar canvas temporal
    if (this.temporaryCtx && this.temporaryCanvas) {
      this.temporaryCtx.clearRect(0, 0, this.temporaryCanvas.width, this.temporaryCanvas.height);
    }
    
    // Reiniciar estado
    this.isDrawing = false;
    this.hasStartedDrawing = false;
    this.lastUpdatePoint = null;
    this.dragStartPoint = null;
    this.currentContext = null;
    
    if (this.debugMode) {
      console.log(`ToolAdapter.cleanup para ${this.type}`);
    }
  }

  /**
   * Actualiza la calidad de renderizado
   */
  updateRenderQuality(quality: RenderQuality): void {
    // Ajustar configuración de calidad para canvas temporal si existe
    if (this.temporaryCtx) {
      this.temporaryCtx.imageSmoothingEnabled = quality.level !== 'low';
      this.temporaryCtx.imageSmoothingQuality = 
        quality.level === 'high' ? 'high' : 
        quality.level === 'medium' ? 'medium' : 'low';
    }
  }
} 