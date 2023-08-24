import Block from "./Block";
import Arrow from "./Arrow";
import Theme from "./Theme";
var Context = /** @class */ (function () {
    function Context(blocksLines, links) {
        this.blocksLines = blocksLines;
        this.links = links;
        this.blocks = [];
        this.arrows = [];
        this.elementMoving = null;
    }
    Context.prototype.getSVG = function () {
        return document.getElementById("svg");
    };
    Context.prototype.drawArrows = function () {
        var _this = this;
        var svg = this.getSVG();
        if (!svg) {
            console.error("Can't find HTML element #svg");
            return;
        }
        // Remove all arrows
        var existingArrows = svg.querySelectorAll(".arrow");
        existingArrows.forEach(function (arrow) {
            arrow.remove();
        });
        ;
        var states = [];
        for (var i = 0; i < this.blocks.length; i++) {
            var state = {
                current_input: 0,
                nb_inputs: 0,
                current_output: 0,
                nb_outputs: 0
            };
            states.push(state);
        }
        this.links.forEach(function (link) {
            var ouput_id = link[0];
            var input_id = link[1];
            states[ouput_id].nb_outputs++;
            states[input_id].nb_inputs++;
        });
        // Create the arrows
        this.links.forEach(function (link) {
            var output_id = link[0];
            var input_id = link[1];
            var color = Theme.arrowColor;
            if (link.length > 2) {
                color = link[2];
            }
            var arrow = new Arrow(_this.blocks[output_id], _this.blocks[input_id], states[output_id].current_output++, states[output_id].nb_outputs, states[input_id].current_input++, states[input_id].nb_inputs, color);
            arrow.draw(svg);
            // Register the mouse events
            var arrow_elem = arrow.getElement();
            if (!arrow_elem) {
                console.error("Can't find arrow element id " + arrow.id);
                return;
            }
            arrow_elem.onmouseenter = _this.onMouseEnterLine.bind(_this);
            arrow_elem.onmouseleave = _this.onMouseLeaveLine.bind(_this);
            _this.arrows.push(arrow);
        });
    };
    Context.prototype.draw = function () {
        var _this = this;
        var svg = this.getSVG();
        if (!svg) {
            console.error("Can't find HTML element #svg");
            return;
        }
        svg.setAttribute("dominant-baseline", "hanging"); // Reference text position to top left
        var imgWidth = window.innerWidth;
        var imgHeight = window.innerHeight;
        svg.setAttribute("width", imgWidth.toString());
        svg.setAttribute("height", imgHeight.toString());
        document.body.style.background = Theme.svgBackgroundColor;
        var background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        background.setAttribute("width", "100%");
        background.setAttribute("height", "100%");
        background.setAttribute("fill", Theme.svgBackgroundColor);
        svg.appendChild(background);
        var marginBottomBlocks = 40;
        var marginLeftBlocks = 40;
        var posY = marginBottomBlocks;
        this.blocksLines.forEach(function (lines) {
            var block = new Block(0, posY, lines);
            block.draw(svg);
            // Move the element to the center 
            block.updatePosition(imgWidth / 2 - block.width / 2, block.y);
            // Register the mouse events
            var block_elem = block.getElement();
            if (!block_elem) {
                console.error("Can't find block element id " + block.id);
                return;
            }
            block_elem.onmouseenter = _this.onMouseEnterBlock.bind(_this);
            block_elem.onmouseleave = _this.onMouseLeaveBlock.bind(_this);
            block_elem.onclick = _this.onClickBlock.bind(_this);
            _this.blocks.push(block);
            posY += block.height + marginBottomBlocks;
        });
        svg.onmousemove = this.onMouseMoveSvg.bind(this);
        this.drawArrows();
    };
    // Moving blocks by clicking on it
    Context.prototype.onClickBlock = function (event) {
        if (!this.elementMoving) {
            this.elementMoving = event.currentTarget;
        }
        else {
            this.elementMoving = null;
        }
    };
    Context.prototype.onMouseMoveSvg = function (event) {
        if (!this.elementMoving) {
            return;
        }
        var svg = this.getSVG();
        if (!svg) {
            console.error("Can't find HTML element #svg");
            return;
        }
        var bounds = svg.getBoundingClientRect();
        var x = event.clientX - bounds.left;
        var y = event.clientY - bounds.top;
        var blockId = parseInt(this.elementMoving.id.substring(1));
        var block = this.blocks[blockId];
        block.updatePosition(x - block.width / 2, y - block.height / 2);
        this.drawArrows();
    };
    // Change colors when moving pointers on a block or arrow
    Context.prototype.onMouseEnterBlock = function (event) {
        var target = event.currentTarget;
        target.children[0].setAttribute("fill", Theme.blockOverBackgroundColor);
    };
    Context.prototype.onMouseLeaveBlock = function (event) {
        var target = event.currentTarget;
        target.children[0].setAttribute("fill", Theme.blockBackgroundColor);
    };
    Context.prototype.onMouseEnterLine = function (event) {
        var target = event.currentTarget;
        for (var i = 0; i < target.children.length; i++) {
            if (target.children[i].tagName == "line") {
                target.children[i].setAttribute("stroke", Theme.arrowOverColor);
                target.children[i].setAttribute("stroke-width", Theme.arrowOverSize);
            }
            else {
                target.children[i].setAttribute("fill", Theme.arrowOverColor);
            }
        }
        ;
    };
    Context.prototype.onMouseLeaveLine = function (event) {
        var target = event.currentTarget;
        var arrowId = parseInt(target.id.substring(1));
        var arrow = this.arrows[arrowId];
        for (var i = 0; i < target.children.length; i++) {
            if (target.children[i].tagName == "line") {
                target.children[i].setAttribute("stroke", arrow.color);
                target.children[i].setAttribute("stroke-width", "1");
            }
            else {
                target.children[i].setAttribute("fill", arrow.color);
            }
        }
        ;
    };
    return Context;
}());
export default Context;
