import { DrawingTool, DrawingToolOptions, Point } from "./DrawingTool";

export class AreaEraserTool implements DrawingTool {
  type: "eraser-area" = "eraser-area";
  options: DrawingToolOptions;
  startPoint: Point | null = null;
  endPoint: Point | null = null;
  tempCanvas: HTMLCanvasElement | null = null;
  tempCtx: CanvasRenderingContext2D | null = null;

  constructor(options: DrawingToolOptions) {
    this.options = {
      ...options,
      // El color no importa para el borrador pero necesitamos un valor para la interfaz
      color: "rgba(0,0,0,0)",
    };
  }

  // Inicializa un canvas temporal para previsualización
  private initTempCanvas(ctx: CanvasRenderingContext2D): void {
    const canvas = ctx.canvas;
    this.tempCanvas = document.createElement("canvas");
    this.tempCanvas.width = canvas.width;
    this.tempCanvas.height = canvas.height;
    this.tempCtx = this.tempCanvas.getContext("2d");
    
    if (this.tempCtx) {
      // Escalar el contexto igual que el canvas principal
      const dpr = window.devicePixelRatio || 1;
      this.tempCtx.scale(dpr, dpr);
    }
  }

  startDrawing(ctx: CanvasRenderingContext2D, point: Point): void {
    // Guardar punto inicial
    this.startPoint = { ...point };
    this.endPoint = { ...point };
    
    // Inicializar canvas temporal si no existe
    if (!this.tempCanvas || !this.tempCtx) {
      this.initTempCanvas(ctx);
    }
  }

  continueDrawing(ctx: CanvasRenderingContext2D, from: Point, to: Point): void {
    // Actualizar punto final
    this.endPoint = { ...to };
    
    if (!this.startPoint || !this.tempCtx || !this.tempCanvas) return;
    
    // Limpiar canvas temporal
    const canvas = ctx.canvas;
    const dpr = window.devicePixelRatio || 1;
    this.tempCtx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    // Dibujar rectángulo de previsualización en canvas temporal
    this.tempCtx.strokeStyle = "#ff0000"; // Borde rojo para previsualización
    this.tempCtx.lineWidth = 2;
    this.tempCtx.setLineDash([5, 5]); // Línea punteada
    
    const width = this.endPoint.x - this.startPoint.x;
    const height = this.endPoint.y - this.startPoint.y;
    
    this.tempCtx.strokeRect(
      this.startPoint.x,
      this.startPoint.y,
      width,
      height
    );
    
    // Mostrar la previsualización en el canvas principal
    ctx.drawImage(this.tempCanvas, 0, 0);
  }

  endDrawing(ctx: CanvasRenderingContext2D, point: Point): void {
    if (!this.startPoint || !this.endPoint) return;
    
    // Limpiar previsualización
    if (this.tempCtx) {
      const canvas = ctx.canvas;
      const dpr = window.devicePixelRatio || 1;
      this.tempCtx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
    
    // Guardar configuración actual
    ctx.save();
    
    // Aplicar borrado de área
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,1)";
    
    const width = this.endPoint.x - this.startPoint.x;
    const height = this.endPoint.y - this.startPoint.y;
    
    // Realizar el borrado real
    ctx.fillRect(
      this.startPoint.x,
      this.startPoint.y,
      width,
      height
    );
    
    // Restaurar configuración
    ctx.restore();
    
    // Resetear puntos
    this.startPoint = null;
    this.endPoint = null;
  }
} 