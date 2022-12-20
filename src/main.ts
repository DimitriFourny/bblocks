import Context from "./Context";


// TODO:  calculate the block position automatically (load basic blocks from JSON file?)
//        multiple childs block possible (if/else/switch blocks)
//        add color, count the number of in/out arrow for each block before render them
//        count nb input/output arrows. Will need to know links for each blocks


let blocksLines = [
  ["xor ecx, ecx", "jmp 0x41414141"],
  ["push ebp", "mov ebp, esp", "je next", "jmp begin"],
  ["next:", "inc eax", "end"]
];
let links = [[0, 1], [1, 2, "green"], [1, 0, "red"]]; 

let context = new Context(blocksLines, links);
context.draw();



