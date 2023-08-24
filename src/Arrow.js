import Theme from "./Theme";
var Arrow = /** @class */ (function () {
    function Arrow(blockA, blockB, currentOutput, nbOutput, currentInput, nbInput, color) {
        if (currentOutput === void 0) { currentOutput = 0; }
        if (nbOutput === void 0) { nbOutput = 0; }
        if (currentInput === void 0) { currentInput = 0; }
        if (nbInput === void 0) { nbInput = 0; }
        if (color === void 0) { color = ""; }
        this.id = Arrow.next_id++;
        this.blockA = blockA;
        this.blockB = blockB;
        this.currentOutput = currentOutput;
        this.nbOutput = nbOutput;
        this.currentInput = currentInput;
        this.nbInput = nbInput;
        if (color == "") {
            color = Theme.arrowColor;
        }
        this.color = color;
    }
    Arrow.prototype.createLine = function (x1, y1, x2, y2) {
        var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1.toString());
        line.setAttribute("y1", y1.toString());
        line.setAttribute("x2", x2.toString());
        line.setAttribute("y2", y2.toString());
        line.setAttribute("stroke", this.color);
        return line;
    };
    Arrow.prototype.createArrowEnd = function (x, y, width, height, rotate_degrees) {
        if (rotate_degrees === void 0) { rotate_degrees = 0; }
        var polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute("fill", this.color);
        var points = "0,0";
        points += " " + (-width / 2).toString() + "," + (-height).toString();
        points += " " + (width / 2).toString() + "," + (-height).toString();
        polygon.setAttribute("points", points);
        polygon.setAttribute("transform", "translate(".concat(x, ", ").concat(y, ") rotate(").concat(rotate_degrees, ")"));
        return polygon;
    };
    Arrow.prototype.draw = function (svg) {
        var group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("id", "l" + this.id);
        group.setAttribute("class", "arrow");
        svg.appendChild(group);
        var x, y, x2, y2;
        // Use 1/3 of the block width to put the arrows
        var outputPos = 0.5;
        if (this.nbOutput > 1) {
            outputPos = this.currentOutput / (this.nbOutput - 1);
        }
        var inputPos = 0.5;
        if (this.nbInput > 1) {
            inputPos = this.currentInput / (this.nbInput - 1);
        }
        if (this.blockB.y >= this.blockA.y + this.blockA.height) {
            // BlockB is after BlockA      
            x = this.blockA.x + this.blockA.width / 3 + outputPos * (this.blockA.width / 3);
            y = this.blockA.y + this.blockA.height;
            x2 = this.blockB.x + this.blockB.width / 3 + inputPos * (this.blockB.width / 3);
            y2 = this.blockB.y;
            group.appendChild(this.createLine(x, y, x2, y2));
        }
        else {
            // BlockB is before BlockA
            x = this.blockA.x + this.blockA.width / 3 + outputPos * (this.blockA.width / 3);
            y = this.blockA.y + this.blockA.height;
            x2 = x;
            y2 = y + 10 + this.currentOutput * 10;
            group.appendChild(this.createLine(x, y, x2, y2));
            x = x2;
            y = y2;
            x2 = Math.max(this.blockA.x + this.blockA.width, this.blockB.x + this.blockB.width) + 20 + this.currentInput * 10;
            group.appendChild(this.createLine(x, y, x2, y2));
            x = x2;
            y = y2;
            y2 = this.blockB.y - 20 - this.currentInput * 10;
            ;
            group.appendChild(this.createLine(x, y, x2, y2));
            x = x2;
            y = y2;
            x2 = this.blockB.x + this.blockB.width / 3 + inputPos * (this.blockB.width / 3);
            group.appendChild(this.createLine(x, y, x2, y2));
            x = x2;
            y = y2;
            y2 = this.blockB.y;
            group.appendChild(this.createLine(x, y, x2, y2));
        }
        var arrowEndWidth = 10;
        var arrowEndHeight = 15;
        var arrowAngle = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI;
        group.appendChild(this.createArrowEnd(x2, y2, arrowEndWidth, arrowEndHeight, -90 + arrowAngle));
    };
    Arrow.prototype.getElement = function () {
        return document.getElementById("l" + this.id);
    };
    Arrow.next_id = 0;
    return Arrow;
}());
export default Arrow;
