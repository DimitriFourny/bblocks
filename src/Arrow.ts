import Block from "./Block";
import Theme from "./Theme";
import { DepthArea } from "./Layout";


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

  private createPath(coord : string)
  {
    let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", coord);
    path.setAttribute("stroke", this.color);
    path.setAttribute("stroke-width", this.thickness);
    path.setAttribute("fill", "none");
    return path;
  }

  private createLine(x1: number, y1: number, x2: number, y2: number) 
  {
    let coord = `M ${x1} ${y1} L ${x2} ${y2}`;
    return this.createPath(coord);
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

  draw(svg: SVGElement, depthAreas: Map<number, DepthArea>) 
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
      // This is the easy scenario, one simple line
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
      let coord = `M ${x} ${y} L ${x2} ${y2}`;

      // This x2 needs to be calculated correctly to not cover a previous block.
      // Get all traversed areas
      let smallestDepth = this.blockA.depth > this.blockB.depth ? this.blockB.depth : this.blockA.depth;
      let biggestDepth  = this.blockA.depth > this.blockB.depth ? this.blockA.depth : this.blockB.depth;
      let traversedAreas = [];
      for (let depth = smallestDepth; depth <= biggestDepth; depth++) {
        traversedAreas.push(depth);
      }
      
      // Now the biggest position X where we can have something
      let biggestX = 0;
      traversedAreas.forEach((depth) => {
        let area = depthAreas.get(depth);
        if (!area) {
          return;
        }

        let areaBiggestX = area.x + area.width;
        if (areaBiggestX > biggestX) {
          biggestX = areaBiggestX;
        }
      });

      x2 = biggestX + 10;
      x2 += this.currentInput*10; // Padding to not have collision with others input
      coord += ` L ${x2} ${y2}`;

      y2 = this.blockB.y - 10 - this.currentInput*10; ;
      coord += ` L ${x2} ${y2}`;

      x2 = this.blockB.x + this.blockB.width/3 + inputPos*(this.blockB.width/3);
      coord += ` L ${x2} ${y2}`;

      x  = x2;
      y  = y2;
      y2 = this.blockB.y;
      coord += ` L ${x2} ${y2}`;

      group.appendChild(this.createPath(coord));
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