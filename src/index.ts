import Context from "./Context";
import Theme from "./Theme";


// TODO:  calculate the block position automatically (load basic blocks from JSON file?)
//        multiple childs block possible (if/else/switch blocks)
//        add color, count the number of in/out arrow for each block before render them
//        count nb input/output arrows. Will need to know links for each blocks


let blocksLines = [
  ["Block A", "begin"],
  ["Block B"],
  ["Block C"],
  ["Block D"],
  ["Block E", "end"],
];
let links = [
  [0, 1], 
  [1, 2, Theme.arrowValidColor], 
  [1, 0, Theme.arrowInvalidColor], 
  [2, 3],
  [2, 4],
  [3, 0]
]; 

let context = new Context(blocksLines, links);
context.draw();



