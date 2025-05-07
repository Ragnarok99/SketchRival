import { DrawingTool, DrawingToolOptions, Point } from "./DrawingTool";

export class PrecisionEraserTool implements DrawingTool {
  type: "eraser-precision" = "eraser-precision";
  options: DrawingToolOptions;
  lastPosition: Point | null = null;
  
  constructor(options: DrawingToolOptions) {
    this.options = {
      ...options,
      // El color no importa para el borrador ya que se usa destination-out
      // pero necesitamos un valor para cumplir con la interfaz
      color: "rgba(0,0,0,0)",
    };
  }

  startDrawing(ctx: CanvasRenderingContext2D, point: Point): void {
    // Guardar configuración actual
    ctx.save();

    // Guardar la posición inicial
    this.lastPosition = { ...point };

    // Configurar borrador con globalCompositeOperation
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = this.options.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // Comienza dibujando un punto en la posición inicial para
    // asegurar que incluso los clics simples borren contenido
    ctx.beginPath();
    ctx.arc(point.x, point.y, this.options.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();

    // Comenzar trazo para el movimiento continuo
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  continueDrawing(ctx: CanvasRenderingContext2D, from: Point, to: Point): void {
    // Dibujar línea que "borra" todo lo que toca
    // Usamos quadraticCurveTo para líneas más suavizadas
    if (this.lastPosition) {
      const midPoint = {
        x: (this.lastPosition.x + to.x) / 2,
        y: (this.lastPosition.y + to.y) / 2
      };
      
      ctx.quadraticCurveTo(
        this.lastPosition.x, 
        this.lastPosition.y, 
        midPoint.x, 
        midPoint.y
      );
      
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(midPoint.x, midPoint.y);
      
      this.lastPosition = { ...to };
    } else {
      // Fallback si no tenemos lastPosition
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
    }
  }

  endDrawing(ctx: CanvasRenderingContext2D, point: Point): void {
    // Dibujar el trazo final
    if (this.lastPosition) {
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }

    // Asegurar que incluso los clics simples borren contenido
    ctx.beginPath();
    ctx.arc(point.x, point.y, this.options.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();

    // Restaurar configuración original
    ctx.restore();
    
    // Resetear estado
    this.lastPosition = null;
  }
}
