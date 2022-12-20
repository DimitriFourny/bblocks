import Block from "./Block";
import Arrow from "./Arrow";


export default class Context 
{
  blocksLines: Array<Array<string>>;
  links: Array<Array<number|string>>;
  blocks: Array<Block>;
  elementMoving: HTMLElement | null;
  
  constructor(blocksLines: Array<Array<string>>, links: Array<Array<number|string>>)
  {
    this.blocksLines = blocksLines;
    this.links = links;
    this.blocks = [];
    this.elementMoving = null;
  }

  getSVG() :SVGElement|null 
  {
    return <SVGElement|null> document.getElementById("svg");
  }

  drawArrows() 
  {
    let svg = this.getSVG();
    if (!svg) {
      console.error("Can't find HTML element #svg");
      return;
    }

    // Remove all arrows
    let existingArrows = svg.querySelectorAll(".arrow");
    existingArrows.forEach(arrow => {
      arrow.remove();
    });

    // Count the number of inputs/outputs for each block
    interface State {
      current_input: number;
      nb_inputs: number;
      current_output: number;
      nb_outputs: number;
    };

    let states: Array<State> = [];

    for (let i = 0; i < this.blocks.length; i++) {
      let state: State = {
        current_input: 0,
        nb_inputs: 0,
        current_output: 0,
        nb_outputs: 0        
      };
      states.push(state);
    }

    this.links.forEach(link => {
      const ouput_id = <number>link[0];
      const input_id = <number>link[1];
      states[ouput_id].nb_outputs++;
      states[input_id].nb_inputs++;
    });

    // Create the arrows
    this.links.forEach((link) => {
      const output_id = <number>link[0];
      const input_id = <number>link[1];
      let color = "black";
      if (link.length > 2) {
        color = <string>link[2];
      }

      let arrow = new Arrow(
        this.blocks[output_id], 
        this.blocks[input_id],
        states[output_id].current_output++,
        states[output_id].nb_outputs,
        states[input_id].current_input++,
        states[input_id].nb_inputs,
        color
      );
      arrow.draw(svg!); 
    
      // Register the mouse events
      let arrow_elem = arrow.getElement();
      if (!arrow_elem) {
        console.error("Can't find arrow element id " + arrow.id);
        return;
      }

      arrow_elem.onmouseenter = this.onMouseEnterLine.bind(this);
      arrow_elem.onmouseleave = this.onMouseLeaveLine.bind(this);
    });
  }

  draw()
  {
    let svg = this.getSVG();
    if (!svg) {
      console.error("Can't find HTML element #svg");
      return;
    }

    svg.setAttribute("dominant-baseline", "hanging"); // Reference text position to top left

    const imgWidth = window.innerWidth;
    const imgHeight = window.innerHeight;
    svg.setAttribute("width", imgWidth.toString());
    svg.setAttribute("height", imgHeight.toString());

    let background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    background.setAttribute("width", "100%");
    background.setAttribute("height", "100%");
    background.setAttribute("fill", "#ddffff");
    svg.appendChild(background);

    const marginBottomBlocks = 40;
    const marginLeftBlocks = 40;
    let posY = marginBottomBlocks;

    this.blocksLines.forEach((lines) => {
      let block = new Block(0, posY, lines);
      block.draw(svg!); 

      // Move the element to the center 
      block.updatePosition(imgWidth/2 - block.width/2, block.y);

      // Register the mouse events
      let block_elem = block.getElement();
      if (!block_elem) {
        console.error("Can't find block element id " + block.id);
        return;
      }

      block_elem.onmouseenter = this.onMouseEnterBlock.bind(this);
      block_elem.onmouseleave = this.onMouseLeaveBlock.bind(this);
      block_elem.onclick = this.onClickBlock.bind(this);

      this.blocks.push(block);
      posY += block.height + marginBottomBlocks;
    });

    svg.onmousemove = this.onMouseMoveSvg.bind(this);

    this.drawArrows();
  }

  // Moving blocks by clicking on it
  onClickBlock(event: MouseEvent) 
  {
    if (!this.elementMoving) {
      this.elementMoving = <HTMLElement> event.currentTarget;
    } else {
      this.elementMoving = null;
    }
  }

  onMouseMoveSvg(event: MouseEvent) 
  {
    if (!this.elementMoving) {
      return;
    }
    let svg = this.getSVG();
    if (!svg) {
      console.error("Can't find HTML element #svg");
      return;
    }

    let bounds = svg.getBoundingClientRect();
    let x = event.clientX - bounds.left;
    let y = event.clientY - bounds.top;

    const blockId = parseInt(this.elementMoving.id.substring(1));
    const block = this.blocks[blockId];
    block.updatePosition(x - block.width/2, y - block.height/2);
    this.drawArrows();
  }

  // Change colors when moving pointers on a block or arrow
  onMouseEnterBlock(event: MouseEvent) 
  {
    let target = <HTMLElement> event.currentTarget;
    target.children[0].setAttribute("fill", "#ffffdd");
  }

  onMouseLeaveBlock(event: MouseEvent) 
  {
    let target = <HTMLElement> event.currentTarget;
    target.children[0].setAttribute("fill", "#ffffff");
  }

  onMouseEnterLine(event: MouseEvent) 
  {
    let target = <HTMLElement> event.currentTarget;

    for (let i = 0; i < target.children.length; i++) {
      if (target.children[i].tagName == "line") {
        target.children[i].setAttribute("stroke", "#0000ff");
        target.children[i].setAttribute("stroke-width", "2");
      } else {
        target.children[i].setAttribute("fill", "#0000ff");
      }
    };
  }

  onMouseLeaveLine(event: MouseEvent) 
  {
    let target = <HTMLElement> event.currentTarget;

    for (let i = 0; i < target.children.length; i++) {
      if (target.children[i].tagName == "line") {
        target.children[i].setAttribute("stroke", "#000000");
        target.children[i].setAttribute("stroke-width", "1");
      } else {
        target.children[i].setAttribute("fill", "#000000");
      }
    };
  } 
}