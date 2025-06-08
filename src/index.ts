import Context from "./Context";


export default class {
  static new(svg: SVGAElement, blocksLines: Array<Array<string>>, 
      links: Array<Array<number|string>>) {
    return new Context(svg, blocksLines, links);
  }
} 



