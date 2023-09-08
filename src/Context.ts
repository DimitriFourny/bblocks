import Block from "./Block";
import Arrow from "./Arrow";
import Theme from "./Theme";
import ViewBox from "./ViewBox";

export default class Context 
{
  blocksLines: Array<Array<string>>;
  links: Array<Array<number|string>>;
  blocks: Array<Block>;
  arrows: Array<Arrow>;
  elementMoving: HTMLElement | null;
  movingView: Boolean;
  viewBox: ViewBox;
  
  constructor(blocksLines: Array<Array<string>>, links: Array<Array<number|string>>)
  {
    this.blocksLines = blocksLines;
    this.links = links;
    this.blocks = [];
    this.arrows = [];
    this.elementMoving = null;
    this.movingView = false;
    this.viewBox = new ViewBox(0, 0, 0, 0);
  }
  
  svg() : SVGElement|null 
  {
    return <SVGElement|null> document.getElementById("svg");
  }

  svgWidth() : number
  {
    let svg = this.svg();
    if (!svg) {
      return 0;
    }

    let svgWidth : string|null = svg.getAttribute("width");
    if (!svgWidth) {
      return 0;
    }

    return parseInt(svgWidth);
  }

  svgHeight() : number
  {
    let svg = this.svg();
    if (!svg) {
      return 0;
    }

    let svgHeight : string|null = svg.getAttribute("height");
    if (!svgHeight) {
      return 0;
    }

    return parseInt(svgHeight);
  }

  drawArrows() 
  {
    let svg = this.svg();
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
      let color = Theme.arrowColor;
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

      this.arrows.push(arrow);
    });
  }

  draw()
  {
    let svg = this.svg();
    if (!svg) {
      console.error("Can't find HTML element #svg");
      return;
    }

    svg.setAttribute("dominant-baseline", "hanging"); // Reference text position to top left

    const imgWidth = window.innerWidth;
    const imgHeight = window.innerHeight;
    svg.setAttribute("width", imgWidth.toString());
    svg.setAttribute("height", imgHeight.toString());

    document.body.style.background = Theme.svgBackgroundColor;

    let bg_pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
    bg_pattern.setAttribute("id", "p1");
    bg_pattern.setAttribute("x", "5");
    bg_pattern.setAttribute("y", "21.5");
    bg_pattern.setAttribute("width", "32");
    bg_pattern.setAttribute("height", "32");
    bg_pattern.setAttribute("patternUnits", "userSpaceOnUse");
    svg.appendChild(bg_pattern); 
    
    let bg_circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bg_circle.setAttribute("cx", "1");
    bg_circle.setAttribute("cy", "1");
    bg_circle.setAttribute("r", "1");
    bg_circle.setAttribute("fill", "#aaa");
    bg_pattern.appendChild(bg_circle); 

    let background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    background.setAttribute("width", imgWidth.toString());
    background.setAttribute("height", imgHeight.toString());
    background.setAttribute("fill", "url(#p1)");
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

      block_elem.onmousedown = this.onMouseDownBlock.bind(this); 
      block_elem.onmouseup = this.onMouseUpBlock.bind(this); 
      block_elem.onmouseenter = this.onMouseEnterBlock.bind(this); 
      block_elem.onmouseleave = this.onMouseLeaveBlock.bind(this); 

      this.blocks.push(block);
      posY += block.height + marginBottomBlocks;
    });

    svg.onmousedown = this.onMouseDownSvg.bind(this); 
    svg.onmouseup = this.onMouseUpSvg.bind(this); 
    svg.onmousemove = this.onMouseMoveSvg.bind(this);
    svg.onwheel = this.onWheelSvg.bind(this);

    this.drawArrows();

    // Update the viewbox
    this.viewBox.width = imgWidth;
    this.viewBox.height = imgHeight;
  }

  /** The drag and drop on a block is starting */
  onMouseDownBlock(event: MouseEvent) 
  {
    if (!this.elementMoving) {
      this.elementMoving = <HTMLElement> event.currentTarget;
    } else {
      this.elementMoving = null;
      this.movingView = true;
    }
  }

  /** The drag and drop on a block is finishing */
  onMouseUpBlock(event: MouseEvent) 
  {
    this.elementMoving = null;
    this.movingView = false;
  }

  onMouseDownSvg(event: MouseEvent) 
  {
    if (this.elementMoving) {
      return;
    }
    this.movingView = true;
  }

  onMouseUpSvg(event: MouseEvent) 
  {
    this.movingView = false;
  }

  /** The mouse is moving inside the SVG */
  onMouseMoveSvg(event: MouseEvent) 
  {
    event.preventDefault();

    if (!this.elementMoving && !this.movingView) {
      return;
    }

    let svg = this.svg();
    if (!svg) {
      console.error("Can't find HTML element #svg");
      return;
    }

    let svgWidth = this.svgWidth();
    let svgHeight = this.svgHeight();

    // Get the viewbox
    let scaleWidth = 1;
    let scaleHeight = 1;
    if (this.viewBox.width > 0) {
      scaleWidth = svgWidth / this.viewBox.width;
    }
    if (this.viewBox.height > 0) {
      scaleHeight = svgHeight / this.viewBox.height;
    }

    if (this.elementMoving) {
      // Calculate the position of the mouse in the SVG
      const blockId = parseInt(this.elementMoving.id.substring(1));
      const block = this.blocks[blockId];
      let x = block.x + event.movementX / scaleWidth; 
      let y = block.y + event.movementY / scaleHeight;
      block.updatePosition(x, y);
      this.drawArrows();
    } else if (this.movingView) {
      this.viewBox.x -= event.movementX / scaleWidth; 
      this.viewBox.y -= event.movementY / scaleHeight;
      this.viewBox.updateSvg(svg);
    }
  }

  /** The mouse is zooming inside the SVG */
  onWheelSvg(event: WheelEvent) 
  {
    event.preventDefault();

    let svg = this.svg();
    if (!svg) {
      console.error("Can't find HTML element #svg");
      return;
    }

    this.viewBox.zoomAt(this, event.offsetX, event.offsetY, event.deltaY);
  }

  /** The mouse is on a block */
  onMouseEnterBlock(event: MouseEvent) 
  {
    let target = <HTMLElement> event.currentTarget;
    target.children[0].setAttribute("fill", Theme.blockOverBackgroundColor);
  }

  /** The mouse is not anymore on a block */
  onMouseLeaveBlock(event: MouseEvent) 
  {
    let target = <HTMLElement> event.currentTarget;
    target.children[0].setAttribute("fill", Theme.blockBackgroundColor);
  }

  /** The mouse is on a line */
  onMouseEnterLine(event: MouseEvent) 
  {
    let target = <HTMLElement> event.currentTarget;

    for (let i = 0; i < target.children.length; i++) {
      if (target.children[i].tagName == "line") {
        target.children[i].setAttribute("stroke", Theme.arrowOverColor);
        target.children[i].setAttribute("stroke-width", Theme.arrowOverThickness);
      } else {
        target.children[i].setAttribute("fill", Theme.arrowOverColor);
      }
    };
  }

  /** The mouse is not anymore on a line */
  onMouseLeaveLine(event: MouseEvent) 
  {
    let target = <HTMLElement> event.currentTarget;

    const arrowId = parseInt(target.id.substring(1));
    const arrow = this.arrows[arrowId];

    for (let i = 0; i < target.children.length; i++) {
      if (target.children[i].tagName == "line") {
        target.children[i].setAttribute("stroke", arrow.color);
        target.children[i].setAttribute("stroke-width", arrow.thickness);
      } else {
        target.children[i].setAttribute("fill", arrow.color);
      }
    };
  } 
}