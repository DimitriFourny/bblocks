import type { Bounds, Point } from './types';

export default class ViewBox {
  x = 0;
  y = 0;
  width = 800;
  height = 600;
  private fittedWidth = 800;

  fit(bounds: Bounds, width: number, height: number): void {
    const ratio = width / height;
    this.width = Math.max(bounds.width + 80, (bounds.height + 80) * ratio, 160);
    this.height = this.width / ratio;
    this.x = bounds.x + bounds.width / 2 - this.width / 2;
    this.y = bounds.y + bounds.height / 2 - this.height / 2;
    this.fittedWidth = this.width;
  }

  resize(width: number, height: number): void {
    const centerY = this.y + this.height / 2;
    this.height = this.width * height / width;
    this.y = centerY - this.height / 2;
  }

  zoom(factor: number, anchor: Point): void {
    const width = Math.min(this.fittedWidth * 20, Math.max(this.fittedWidth / 100, this.width / factor));
    const scale = width / this.width;
    this.x = anchor.x - (anchor.x - this.x) * scale;
    this.y = anchor.y - (anchor.y - this.y) * scale;
    this.width = width;
    this.height *= scale;
  }

  apply(svg: SVGSVGElement): void {
    svg.setAttribute('viewBox', `${this.x} ${this.y} ${this.width} ${this.height}`);
  }
}
