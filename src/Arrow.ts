import Block from "./Block";
import Theme from "./Theme";

export default class Arrow
{
  static next_id = 0;
  id: number;
  blockA: Block;
  blockB: Block;
  currentOutput: number;
  nbOutput: number;
  currentInput: number;
  nbInput: number;
  color: string;
  thickness: string;

  constructor(blockA: Block, blockB: Block, currentOutput=0, nbOutput=0, currentInput=0, nbInput=0, color="") 
  {
    this.id = Arrow.next_id++;
    this.blockA = blockA;
    this.blockB = blockB;
    this.currentOutput = currentOutput;
    this.nbOutput = nbOutput;
    this.currentInput = currentInput;
    this.nbInput = nbInput;

    if (color == "") {
      color = Theme.arrowColor;
    }
    this.color = color;
    this.thickness = Theme.arrowThickness;
  }

  private createLine(x1: number, y1: number, x2: number, y2: number) 
  {
    let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1.toString());
    line.setAttribute("y1", y1.toString());
    line.setAttribute("x2", x2.toString());
    line.setAttribute("y2", y2.toString());
    line.setAttribute("stroke", this.color);
    line.setAttribute("stroke-width", this.thickness);
    return line;
  }

  private createArrowEnd(x: number, y: number, width: number, height: number, rotate_degrees=0) 
  {
    let polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("fill", this.color);

    let points = "0,0";
    points += " " + (-width/2).toString() + "," + (-height).toString();
    points += " " + (width/2).toString() + "," + (-height).toString();
    polygon.setAttribute("points", points);

    polygon.setAttribute("transform", `translate(${x}, ${y}) rotate(${rotate_degrees})`);

    return polygon;
  }

  draw(svg: SVGElement) 
  {
    let group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("id", "l"+this.id);
    group.setAttribute("class", "arrow");
    svg.appendChild(group);

    let x, y, x2, y2;

    // Use 1/3 of the block width to put the arrows
    let outputPos = 0.5;
    if (this.nbOutput > 1) {
      outputPos = this.currentOutput/(this.nbOutput-1);
    }
    let inputPos = 0.5;
    if (this.nbInput > 1) {
      inputPos = this.currentInput/(this.nbInput-1);
    }

    if (this.blockB.y >= this.blockA.y + this.blockA.height) {
      // BlockB is after BlockA      
      x  = this.blockA.x + this.blockA.width/3 + outputPos*(this.blockA.width/3);
      y  = this.blockA.y + this.blockA.height;
      x2 = this.blockB.x + this.blockB.width/3 + inputPos*(this.blockB.width/3);
      y2 = this.blockB.y;
      group.appendChild(this.createLine(x, y, x2, y2));
    }
    else {
      // BlockB is before BlockA
      x  = this.blockA.x + this.blockA.width/3 + outputPos*(this.blockA.width/3);
      y  = this.blockA.y + this.blockA.height;
      x2 = x;
      y2 = y + 10 + this.currentOutput*10;
      group.appendChild(this.createLine(x, y, x2, y2));

      x  = x2;
      y  = y2;
      x2 = Math.max(this.blockA.x+this.blockA.width, this.blockB.x+this.blockB.width) + 20 + this.currentInput*10; 
      group.appendChild(this.createLine(x, y, x2, y2));

      x  = x2;
      y  = y2;
      y2 = this.blockB.y - 20 - this.currentInput*10; ;
      group.appendChild(this.createLine(x, y, x2, y2));

      x  = x2;
      y  = y2;
      x2 = this.blockB.x + this.blockB.width/3 + inputPos*(this.blockB.width/3);
      group.appendChild(this.createLine(x, y, x2, y2));

      x  = x2;
      y  = y2;
      y2 = this.blockB.y;
      group.appendChild(this.createLine(x, y, x2, y2));
    }

    const arrowEndWidth = 10; 
    const arrowEndHeight = 15; 
    const arrowAngle = Math.atan2(y2-y, x2-x) * 180 / Math.PI;
    group.appendChild(this.createArrowEnd(x2, y2, arrowEndWidth, arrowEndHeight,  -90 + arrowAngle));
  }

  getElement()
  {
    return document.getElementById("l" + this.id);
  }
}