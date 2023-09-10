import Context from "./Context";
import Theme from "./Theme";


let blocksLines = [
  [
    "push    rbp",
    "mov     rbp, rsp",
    "sub     rsp, 20h",
    "mov     [rbp+s1], rdi",
    "mov     [rbp+var_4], 0",
    "jmp     short loc_400EBB"
  ],
  [
    "loc_400EBB:",
    "mov     eax, cs:num_users",
    "cmp     [rbp+var_4], eax",
    "jl      short loc_400E8E",
  ],
  [
    "loc_400E8E:",
    "mov     eax, [rbp+var_4]",
    "cdqe",
    "mov     rax, ds:user_list[rax*8]",
    "lea     rdx, [rax+0Ch]",
    "mov     rax, [rbp+s1]",
    "mov     rsi, rdx        ; s2",
    "mov     rdi, rax        ; s1",
    "call    _strcmp",
    "test    eax, eax",
    "jnz     short loc_400EB7",
  ],
  [
    "mov     eax, [rbp+var_4]",
    "jmp     short locret_400EE1",
  ],
  [
    "mov     rax, [rbp+s1]",
    "mov     rsi, rax",
    "mov     edi, offset aInvalidIdS ; 'Invalid id : <%s>\\n'",
    "mov     eax, 0",
    "call    _printf",
    "mov     eax, 0FFFFFFFFh",
  ],
  [
    "loc_400EB7:",
    "add     [rbp+var_4], 1",
  ],
  [
    "locret_400EE1:",
    "leave",
    "retn",
  ],
];

let links = [
  [0, 1],
  [1, 2, Theme.arrowValidColor],
  [1, 4, Theme.arrowInvalidColor],
  [2, 3, Theme.arrowInvalidColor],
  [2, 5, Theme.arrowValidColor],
  [3, 6],
  [4, 6],
  [5, 1],
];

let context = new Context(blocksLines, links);
context.draw();



