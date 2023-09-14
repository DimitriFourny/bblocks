import Context from "./Context";


export default class {
  static draw(svgId : string, blocksLines: Array<Array<string>>, links: Array<Array<number|string>>) {
    let context = new Context(svgId, blocksLines, links);
    context.draw();
  }
} 



