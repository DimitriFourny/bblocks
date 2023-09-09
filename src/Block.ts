import Theme from "./Theme";

export default class Block 
{
  static next_id = 0;
  id: number;
  x: number;
  y: number;
  lines: Array<string>;
  width: number;
  height: number;
  fontFamily: string;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;

  constructor(x: number, y: number, lines: Array<string>, width=0, height=0) 
  {
    this.id = Block.next_id++;
    this.x = x;
    this.y = y;
    this.lines = lines;
    this.width = width;
    this.height = height;
    this.fontFamily = "Menlo";
    this.paddingTop = 20;
    this.paddingBottom = 10;
    this.paddingLeft = 10;
  }

  draw(svg: SVGElement) 
  {
    let group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("id", "b"+this.id);
    group.setAttribute("transform", `translate(${this.x},${this.y})`);   
    svg.appendChild(group);

    // Create the text first to know the max width
    let textX = this.paddingLeft;
    let textY = this.paddingTop;

    let maxTextWidth = 0;
    let minBoxHeight = 2*this.paddingBottom;
    let firstText: SVGTextElement | null = null;

    this.lines.forEach((line) => {
      let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      if (!firstText) {
        firstText = text;
      }

      text.setAttribute("font-family", Theme.blockFontFamily);
      text.setAttribute("font-size", Theme.blockFontSize);
      text.setAttribute("fill", Theme.blockFontColor);
      text.textContent = line;

      text.setAttribute("x", textX.toString());
      text.setAttribute("y", textY.toString());

      group.appendChild(text);
      const bbox = text.getBBox();
      textY += bbox.height;

      minBoxHeight += bbox.height;
      if (bbox.width > maxTextWidth) {
        maxTextWidth = bbox.width;
      }
    });   

    if (!this.height) {
      this.height = minBoxHeight;
    }
    if (!this.width) {
      this.width = maxTextWidth + 2*this.paddingLeft;
    }

    // Block background
    let block = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    block.setAttribute("width", this.width.toString());
    block.setAttribute("height", this.height.toString());
    block.setAttribute("fill", Theme.blockBackgroundColor);
    block.setAttribute("stroke", Theme.blockBorderColor);
    block.setAttribute("stroke-width", Theme.blockBorderSize);
    block.setAttribute("rx", Theme.blockBorderSize);
    block.setAttribute("ry", Theme.blockBorderSize);
    block.setAttribute("stroke-linejoin", "round");
    group.prepend(block);
  }

  getElement()
  {
    return document.getElementById("b" + this.id);
  }

  updatePosition(x: number, y: number) 
  {
    let block_elem = this.getElement();
    if (!block_elem) {
      return;
    }

    this.x = x;
    this.y = y;
    block_elem.setAttribute("transform", `translate(${x},${y})`);   
  }
}