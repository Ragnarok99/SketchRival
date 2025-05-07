import { DrawingTool, DrawingToolOptions, Point } from "./DrawingTool";

export class CircleTool implements DrawingTool {
  type: "circle" = "circle";
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
  }

  continueDrawing(ctx: CanvasRenderingContext2D, from: Point, to: Point): void {
    if (!this.startPoint) return;

    // Calcular el radio basado en la distancia entre el punto inicial y el actual
    const radius = Math.sqrt(
      Math.pow(to.x - this.startPoint.x, 2) +
        Math.pow(to.y - this.startPoint.y, 2),
    );

    // Limpiar solo la región del círculo + borde
    ctx.clearRect(
      this.startPoint.x - radius - this.options.lineWidth,
      this.startPoint.y - radius - this.options.lineWidth,
      radius * 2 + this.options.lineWidth * 2,
      radius * 2 + this.options.lineWidth * 2,
    );

    // Dibujar el círculo
    ctx.beginPath();
    ctx.arc(this.startPoint.x, this.startPoint.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  endDrawing(ctx: CanvasRenderingContext2D, point: Point): void {
    if (!this.startPoint) return;

    // Calcular el radio final
    const radius = Math.sqrt(
      Math.pow(point.x - this.startPoint.x, 2) +
        Math.pow(point.y - this.startPoint.y, 2),
    );

    // Dibujar el círculo final
    ctx.beginPath();
    ctx.arc(this.startPoint.x, this.startPoint.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Restaurar configuración y limpiar punto inicial
    ctx.restore();
    this.startPoint = null;
  }
}
