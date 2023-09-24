import Block from "./Block";
import Arrow from "./Arrow";
import Theme from "./Theme";
import ViewBox from "./ViewBox";
import { Layout, DepthArea } from "./Layout";

export default class Context 
{
  svgId: string;
  blocksLines: Array<Array<string>>;
  links: Array<Array<number|string>>;
  blocks: Map<number, Block>;
  arrows: Array<Arrow>;
  elementMoving: HTMLElement | null;
  movingView: Boolean;
  viewBox: ViewBox;
  backgroundElement: Element;
  layout: Layout;
  pinchDistance: number;

  constructor(svgId: string, blocksLines: Array<Array<string>>, links: Array<Array<number|string>>)
  {
    this.svgId = svgId;
    this.blocksLines = blocksLines;
    this.links = links;
    this.blocks = new Map<number, Block>;
    this.arrows = [];
    this.elementMoving = null;
    this.movingView = false;
    this.viewBox = new ViewBox(0, 0, 0, 0);
    this.backgroundElement = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    this.layout = new Layout;
    this.pinchDistance = 0;
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

  moveBackground(x: number, y: number, width: number, height: number) 
  {
    this.backgroundElement.setAttribute("x", x.toString());
    this.backgroundElement.setAttribute("y", y.toString());
    this.backgroundElement.setAttribute("width", width.toString());
    this.backgroundElement.setAttribute("height", height.toString());
  }

  addDebugRect(x: number, y: number, width: number, height:number) 
  {
    let svg = this.svg();
    if (!svg) {
      console.error("Can't find HTML element #svg");
      return;
    }

    let block = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    block.setAttribute("width", width.toString());
    block.setAttribute("height", height.toString());
    block.setAttribute("fill", "none");
    block.setAttribute("stroke", "#ff0000");
    block.setAttribute("stroke-width", Theme.blockBorderSize);
    block.setAttribute("rx", Theme.blockBorderSize);
    block.setAttribute("ry", Theme.blockBorderSize);
    block.setAttribute("stroke-linejoin", "round");
    block.setAttribute("transform", `translate(${x},${y})`);   
    svg.append(block);
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

    for (let i = 0; i < this.blocks.size; i++) {
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
        this.blocks.get(output_id)!, 
        this.blocks.get(input_id)!,
        states[output_id].current_output++,
        states[output_id].nb_outputs,
        states[input_id].current_input++,
        states[input_id].nb_inputs,
        color);

      let depthAreas = this.layout.calculateDepthAreas(this, this.blocks);
      arrow.draw(svg!, depthAreas); 
    
      // Register the mouse events
      let arrow_elem = arrow.getElement();
      if (!arrow_elem) {
        console.error("Can't find arrow element id " + arrow.id);
        return;
      }

      arrow_elem.onpointerenter = this.onPointerEnterLine.bind(this);
      arrow_elem.onpointerleave = this.onPointerLeaveLine.bind(this);

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

    const imgWidth = window.innerWidth;
    const imgHeight = window.innerHeight;
    svg.setAttribute("width", imgWidth.toString());
    svg.setAttribute("height", imgHeight.toString());

    // Update the viewbox
    this.viewBox.width = imgWidth;
    this.viewBox.height = imgHeight;

    document.body.style.background = Theme.svgBackgroundColor;

    // Add the background
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

    this.backgroundElement.setAttribute("fill", "url(#p1)");
    this.moveBackground(0, 0, imgWidth, imgHeight);
    svg.appendChild(this.backgroundElement);

    // Now a bit of CSS style
    let style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.innerHTML = "path { stroke-dasharray: 4 1; }";
    svg.appendChild(style);

    // Create a blocks tree
    interface BlockLinksStatus {
      sources: Array<number>;
      destinations: Array<number>;
    };

    let blocksLinks: Array<BlockLinksStatus> = [];

    for (let i = 0; i < this.blocksLines.length; i++) {
      let status: BlockLinksStatus = {
        sources: [],
        destinations: []     
      };
      blocksLinks.push(status);
    }

    this.links.forEach(link => {
      const sourceId = <number>link[0];
      const destinationId = <number>link[1];
      blocksLinks[sourceId].destinations.push(destinationId);
      blocksLinks[destinationId].sources.push(sourceId);
    });

    // Remove blocks without source links, except for the root node
    let nodeWithSrcLinks = new Array<number>;
    for (let blockId = 0; blockId < this.blocksLines.length; blockId++) {
      nodeWithSrcLinks = nodeWithSrcLinks.concat(blocksLinks[blockId].destinations);
    }
    
    let nbBlocksWithoutSrcLinks = 0; 
    for (let blockId = 1; blockId < this.blocksLines.length; blockId++) {
      if (!nodeWithSrcLinks.includes(blockId)) {
        console.log(blockId);
        nbBlocksWithoutSrcLinks++;
      }
    }

    let orderedBlocks : Array<number> = [];
    let currentBlockId = 0;
    let depth = 0;
    let posXForDepth = new Map<number, number>;

    // Show the block in the right order
    while (true) {
      if (orderedBlocks.length >= this.blocksLines.length - nbBlocksWithoutSrcLinks) {
        // We have all our blocks
        break;
      }

      if (!orderedBlocks.includes(currentBlockId)) {
        orderedBlocks.push(currentBlockId);

        // Render it
        let lines = this.blocksLines[currentBlockId];
        let dbgInfo = `id: ${currentBlockId.toString()} | depth: ${depth.toString()}`;
        lines.unshift(dbgInfo); // to debug

        if (!posXForDepth.has(depth)) {
          posXForDepth.set(depth, 40);
        }
        let posX = posXForDepth.get(depth)!;
        let posY = depth * 200;                 // We will update it just after

        let block = new Block(currentBlockId, depth, posX, posY, lines);
        block.draw(svg!); 

        posXForDepth.set(depth, posX + block.width + 40);
 
        let block_elem = block.getElement();
        if (!block_elem) {
          console.error("Can't find block element id " + block.id);
          return;
        }
        block_elem.onpointerdown = this.onPointerDownBlock.bind(this); 
        block_elem.onpointerup = this.onPointerUpBlock.bind(this); 
        block_elem.onpointerenter = this.onPointerEnterBlock.bind(this); 
        block_elem.onpointerleave = this.onPointerLeaveBlock.bind(this); 

        this.blocks.set(currentBlockId, block);
      }

      let nextBlockId = -1;
      
      // Continue in a children if possible
      for (let i = 0; i < blocksLinks[currentBlockId].destinations.length; i++) {
        let possibleNextBlockId = blocksLinks[currentBlockId].destinations[i];
        if (!orderedBlocks.includes(possibleNextBlockId)) {
          // Not registered yet
          nextBlockId = possibleNextBlockId;  
          break;
        }
      }
      if (nextBlockId != -1) {
        // We have a children not registered, continue
        depth++;
        if (!posXForDepth.has(depth)) {
          let currentBlock = this.blocks.get(currentBlockId)!;
          posXForDepth.set(depth, currentBlock.x);
        }

        currentBlockId = nextBlockId;
        continue
      }

      // Go back inside the first source
      if (blocksLinks[currentBlockId].sources.length > 0) {
        currentBlockId = blocksLinks[currentBlockId].sources[0];
        depth--;
        continue;
      }

      // The root node doesn't have any source, we stop
      break;
    }

    // Update the blocs Y to fit
    let maxHeightForDepth = new Map<number, number>;
    this.blocks.forEach((block) => {
      let maxHeight = maxHeightForDepth.get(block.depth);
      if (!maxHeight || maxHeight < block.height) {
        maxHeightForDepth.set(block.depth, block.height);
      }
    });

    this.blocks.forEach((block) => {
      let y = 40;
      for (let prevDepth = 0; prevDepth < block.depth; prevDepth++) {
        let maxHeight = maxHeightForDepth.get(prevDepth)!;
        y += maxHeight + 40;
      }

      block.updatePosition(block.x, y);
    });

    svg.onpointerdown = this.onPointerDownSvg.bind(this); 
    svg.onpointerup = this.onPointerUpSvg.bind(this); 
    svg.onpointermove = this.onPointerMoveSvg.bind(this);
    svg.onwheel = this.onWheelSvg.bind(this);
    svg.ontouchmove = this.onTouchMoveSvg.bind(this);
    svg.ontouchend = this.onTouchEndSvg.bind(this);

    this.drawArrows();
  }

  /** The drag and drop on a block is starting */
  onPointerDownBlock(event: MouseEvent) 
  {
    event.preventDefault();
    if (event.button != 0) {
      // Not left click
      return;
    }

    if (!this.elementMoving) {
      this.elementMoving = <HTMLElement> event.currentTarget;
    } else {
      this.elementMoving = null;
      this.movingView = true;
    }
  }

  /** The drag and drop on a block is finishing */
  onPointerUpBlock(event: MouseEvent) 
  {
    event.preventDefault();
    if (event.button != 0) {
      // Not left click
      return;
    }
    this.elementMoving = null;
    this.movingView = false;
  }

  onPointerDownSvg(event: MouseEvent) 
  {
    event.preventDefault();
    if (event.button != 0) {
      // Not left click
      return;
    }
    if (this.elementMoving) {
      return;
    }
    this.movingView = true;
  }

  onPointerUpSvg(event: MouseEvent) 
  {
    event.preventDefault();
    if (event.button != 0) {
      // Not left click
      return;
    }
    this.movingView = false;
  }

  /** The mouse is moving inside the SVG */
  onPointerMoveSvg(event: MouseEvent) 
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
      const block = this.blocks.get(blockId)!;
      let x = block.x + event.movementX / scaleWidth; 
      let y = block.y + event.movementY / scaleHeight;
      block.updatePosition(x, y);
      this.drawArrows();
    } else if (this.movingView) {
      this.viewBox.x -= event.movementX / scaleWidth; 
      this.viewBox.y -= event.movementY / scaleHeight;
      this.viewBox.updateViewBox(svg);
      this.moveBackground(this.viewBox.x, this.viewBox.y, this.viewBox.width, this.viewBox.height);
    }
  }

  onTouchMoveSvg(event: TouchEvent)
  {
    event.preventDefault();

    if (event.touches.length === 2) {
      // We try to zoom in or out
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      const deltaX = touch1.clientX - touch2.clientX;
      const deltaY = touch1.clientY - touch2.clientY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (this.pinchDistance == 0) {
        this.pinchDistance = distance;
      }
      if (!this.pinchDistance) {
        return;
      }

      const midX = touch1.clientX + (touch2.clientX - touch1.clientX)/2;
      const midY = touch1.clientY + (touch2.clientY - touch1.clientY)/2;
      let zoomFactor = (distance / this.pinchDistance) * 5;

      if (distance > this.pinchDistance) {
        zoomFactor = -zoomFactor;
      }

      this.viewBox.zoomAt(this, midX, midY, zoomFactor);
    }
  }

  onTouchEndSvg(event: TouchEvent)
  {
    event.preventDefault();
    this.pinchDistance = 0;   
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
  onPointerEnterBlock(event: MouseEvent) 
  {
    event.preventDefault();

    let target = <HTMLElement> event.currentTarget;
    target.children[0].setAttribute("fill", Theme.blockOverBackgroundColor);
  }

  /** The mouse is not anymore on a block */
  onPointerLeaveBlock(event: MouseEvent) 
  {
    event.preventDefault();

    let target = <HTMLElement> event.currentTarget;
    target.children[0].setAttribute("fill", Theme.blockBackgroundColor);
  }

  /** The mouse is on a line */
  onPointerEnterLine(event: MouseEvent) 
  {
    event.preventDefault();
    let target = <HTMLElement> event.currentTarget;

    for (let i = 0; i < target.children.length; i++) {
      if (target.children[i].tagName == "path") {
        target.children[i].setAttribute("stroke", Theme.arrowOverColor);
        target.children[i].setAttribute("stroke-width", Theme.arrowOverThickness);
      } else {
        target.children[i].setAttribute("fill", Theme.arrowOverColor);
      }
    };
  }

  /** The mouse is not anymore on a line */
  onPointerLeaveLine(event: MouseEvent) 
  {
    event.preventDefault();
    let target = <HTMLElement> event.currentTarget;

    const arrowId = parseInt(target.id.substring(1));
    const arrow = this.arrows[arrowId];

    for (let i = 0; i < target.children.length; i++) {
      if (target.children[i].tagName == "path") {
        target.children[i].setAttribute("stroke", arrow.color);
        target.children[i].setAttribute("stroke-width", arrow.thickness);
      } else {
        target.children[i].setAttribute("fill", arrow.color);
      }
    };
  } 
}