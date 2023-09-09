import Context from "./Context";
import Theme from "./Theme";


// TODO:  calculate the block position automatically (load basic blocks from JSON file?)
//        multiple childs block possible (if/else/switch blocks)
//        add color, count the number of in/out arrow for each block before render them
//        count nb input/output arrows. Will need to know links for each blocks


// let blocksLines = [
//   ["Block A", "begin"],
//   ["Block B"],
//   ["Block C"],
//   ["Block D"],
//   ["Block E", "end"],
// ];
// let links = [
//   [0, 1], 
//   [1, 2, Theme.arrowValidColor], 
//   [1, 0, Theme.arrowInvalidColor], 
//   [2, 3],
//   [2, 4],
//   [3, 0]
// ]; 

let blocksLines = [
  ["xor ecx, ecx", "jmp 0x41414141"],
  ["push ebp", "mov ebp, esp", "je next", "jmp begin"],
  ["next:", "inc eax", "end"],
  ["mul eax, 5", "loop"],
  ["mul eax, 5", "loop"],
  ["mul eax, 5", "loop"],
  ["ret eax"],
  ["mul eax, 5", "loop"],
  ["mul eax, 5", "loop"],
];

let links = [
  [0, 1],
  [0, 3],
  [1, 2],
  [3, 4],
  [3, 5],
  [3, 6],
  [5, 7, Theme.arrowValidColor], 
  [5, 8, Theme.arrowInvalidColor], 
  [8, 0],
];

let context = new Context(blocksLines, links);
context.draw();



