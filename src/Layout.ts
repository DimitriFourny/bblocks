import Block from "./Block";
import Context from "./Context";

export class DepthArea {
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
};

export class Layout {
  constructor() {}

  calculateDepthAreas(context: Context, blocks: Map<number, Block>) : Map<number, DepthArea>
  {
    // Get the blocks per depth
    let blocksPerDepth = new Map<number, Array<Block>>;
    blocks.forEach((block) => {
      let blocks = blocksPerDepth.get(block.depth);
      if (!blocks) {
        blocks = [];
        blocksPerDepth.set(block.depth, []);
      }

      blocks.push(block);
      blocksPerDepth.set(block.depth, blocks);
    });

    // Now calculate each depth area size
    let areaPerDepth = new Map<number, DepthArea>;
    blocksPerDepth.forEach((blocks, depth) => {
      if (!blocks.length) {
        return;
      }
      let area = new DepthArea(blocks[0].x, blocks[0].y, 0, 0);

      blocks.forEach((block) => {
        // In case all the blocks are not in order
        if (block.x < area.x) {
          area.x = block.x;
        }
        if (block.y < area.y) {
          area.y = block.y;
        }
      });

      blocks.forEach((block) => {
        let zoneWidth = block.x + block.width - area.x;
        if (zoneWidth > area.width) {
          area.width = zoneWidth;
        }

        let zoneHeight = block.y + block.height - area.y;
        if (zoneHeight > area.height) {
          area.height = zoneHeight;
        }
      });

      areaPerDepth.set(depth, area);
    });

    return areaPerDepth;
  }

}