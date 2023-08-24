import Theme from "./Theme";
var Block = /** @class */ (function () {
    function Block(x, y, lines, width, height) {
        if (width === void 0) { width = 0; }
        if (height === void 0) { height = 0; }
        this.id = Block.next_id++;
        this.x = x;
        this.y = y;
        this.lines = lines;
        this.width = width;
        this.height = height;
        this.fontFamily = "Menlo";
        this.paddingTop = 10;
        this.paddingLeft = 10;
    }
    Block.prototype.draw = function (svg) {
        var group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("id", "b" + this.id);
        group.setAttribute("transform", "translate(".concat(this.x, ",").concat(this.y, ")"));
        svg.appendChild(group);
        // Create the text first to know the max width
        var textX = this.paddingLeft;
        var textY = this.paddingTop;
        var maxTextWidth = 0;
        var minBoxHeight = 2 * this.paddingTop;
        var firstText = null;
        this.lines.forEach(function (line) {
            var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            if (!firstText) {
                firstText = text;
            }
            text.setAttribute("font-family", Theme.blockFontFamily);
            text.setAttribute("font-size", Theme.blockFontSize);
            text.setAttribute("fill", Theme.blockFontColor);
            text.textContent = line;
            text.setAttribute("x", textX.toString());
            text.setAttribute("y", textY.toString());
            group.appendChild(text);
            var bbox = text.getBBox();
            textY += bbox.height;
            minBoxHeight += bbox.height;
            if (bbox.width > maxTextWidth) {
                maxTextWidth = bbox.width;
            }
        });
        if (!this.height) {
            this.height = minBoxHeight;
        }
        if (!this.width) {
            this.width = maxTextWidth + 2 * this.paddingLeft;
        }
        // Block background
        var block = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        block.setAttribute("width", this.width.toString());
        block.setAttribute("height", this.height.toString());
        block.setAttribute("fill", Theme.blockBackgroundColor);
        block.setAttribute("stroke", Theme.blockBorderColor);
        block.setAttribute("stroke-width", Theme.blockBorderSize);
        group.prepend(block);
    };
    Block.prototype.getElement = function () {
        return document.getElementById("b" + this.id);
    };
    Block.prototype.updatePosition = function (x, y) {
        var block_elem = this.getElement();
        if (!block_elem) {
            return;
        }
        this.x = x;
        this.y = y;
        block_elem.setAttribute("transform", "translate(".concat(x, ",").concat(y, ")"));
    };
    Block.next_id = 0;
    return Block;
}());
export default Block;
