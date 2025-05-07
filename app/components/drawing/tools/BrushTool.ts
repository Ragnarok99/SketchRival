import { DrawingTool, DrawingToolOptions, Point } from "./DrawingTool";

export class BrushTool implements DrawingTool {
  type: "brush" = "brush";
  options: DrawingToolOptions;

  constructor(options: DrawingToolOptions) {
    this.options = {
      ...options,
      opacity: options.opacity !== undefined ? options.opacity : 0.8, // Configuración predeterminada de opacidad
    };
  }

  startDrawing(ctx: CanvasRenderingContext2D, point: Point): void {
    // Guardar configuración actual
    ctx.save();

    // Aplicar configuración de pincel
    ctx.strokeStyle = this.options.color;
    ctx.lineWidth = this.options.lineWidth;
    ctx.globalAlpha = this.options.opacity || 0.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Sombra suave para efecto de pincel
    ctx.shadowColor = this.options.color;
    ctx.shadowBlur = this.options.lineWidth / 2;

    // Comenzar una nueva ruta
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  continueDrawing(ctx: CanvasRenderingContext2D, from: Point, to: Point): void {
    // Dibujar una línea con efecto de suavizado
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Dibujar un círculo en el punto actual para un efecto más suave
    ctx.beginPath();
    ctx.arc(to.x, to.y, this.options.lineWidth / 4, 0, Math.PI * 2);
    ctx.fill();

    // Iniciar una nueva subtrazo desde el punto actual
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
  }

  endDrawing(ctx: CanvasRenderingContext2D, point: Point): void {
    // Finalizar la línea
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    // Dibujar un círculo en el punto final
    ctx.beginPath();
    ctx.arc(point.x, point.y, this.options.lineWidth / 4, 0, Math.PI * 2);
    ctx.fill();

    // Restaurar configuración original
    ctx.restore();
  }
}
