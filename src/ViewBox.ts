import Context from "./Context";


export default class ViewBox 
{
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(x: number, y: number, width: number, height: number) 
  {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  updateViewBox(svg: SVGElement)
  {
    svg.setAttribute("viewBox", `${this.x} ${this.y} ${this.width} ${this.height}`);
  }

  zoomAt(context: Context, offsetX: number, offsetY: number, deltaY: number) 
  {
    // Get SVG info
    let svg = context.svg();
    if (!svg) {
      return;
    }
    let svgWidth = context.svgWidth();
    let svgHeight = context.svgHeight();

    // Calculate the new positions
    let mx = offsetX;
    let my = offsetY;    
    let dw = svgWidth * Math.sign(deltaY) * 0.01;
    let dh = svgHeight * Math.sign(deltaY) * 0.01;
    let dx = dw * mx/svgWidth;
    let dy = dh * my/svgHeight;

    let x = this.x - dx;
    let y = this.y - dy;
    let width = this.width + dw;
    let height = this.height + dh;

    if (width > 200 && height > 200 && width < 2000 && height < 2000) {
      // This zoom is acceptable
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.updateViewBox(svg);
      context.moveBackground(this.x, this.y, this.width, this.height);
    }
  }
}