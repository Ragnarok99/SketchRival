import { DrawingTool, DrawingToolOptions, Point } from "./DrawingTool";

export class LineTool implements DrawingTool {
  type: "line" = "line";
  options: DrawingToolOptions;
  private startPoint: Point | null = null;

  constructor(options: DrawingToolOptions) {
    this.options = options;
  }

  startDrawing(ctx: CanvasRenderingContext2D, point: Point): void {
    // Guardar el punto inicial
    this.startPoint = { ...point };

    // Guardar configuración actual
    ctx.save();

    // Aplicar configuración
    ctx.strokeStyle = this.options.color;
    ctx.lineWidth = this.options.lineWidth;
    ctx.globalAlpha = this.options.opacity || 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  continueDrawing(ctx: CanvasRenderingContext2D, from: Point, to: Point): void {
    if (!this.startPoint) return;

    // Calcular bounding box para limpiar
    const minX = Math.min(this.startPoint.x, to.x);
    const minY = Math.min(this.startPoint.y, to.y);
    const maxX = Math.max(this.startPoint.x, to.x);
    const maxY = Math.max(this.startPoint.y, to.y);
    const width = maxX - minX;
    const height = maxY - minY;

    // Limpiar el área con margen adicional para el grosor de línea
    ctx.clearRect(
      minX - this.options.lineWidth * 2,
      minY - this.options.lineWidth * 2,
      width + this.options.lineWidth * 4,
      height + this.options.lineWidth * 4,
    );

    // Dibujar la línea
    ctx.beginPath();
    ctx.moveTo(this.startPoint.x, this.startPoint.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  endDrawing(ctx: CanvasRenderingContext2D, point: Point): void {
    if (!this.startPoint) return;

    // Dibujar la línea final
    ctx.beginPath();
    ctx.moveTo(this.startPoint.x, this.startPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    // Restaurar configuración y limpiar punto inicial
    ctx.restore();
    this.startPoint = null;
  }
}
