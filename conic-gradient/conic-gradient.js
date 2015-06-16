/**
 * CSS conic-gradient() polyfill
 * Original conical gradient code via http://jsdo.it/akm2/yr9B
 */

(function(){

var dummy = document.createElement("div");
document.head.appendChild(dummy);

var _ = self.ConicGradient = function(stops, w, h, repeating) {
	var me = this;
	_.all.push(this);

	this.canvas = document.createElement("canvas");
	this.context = this.canvas.getContext("2d");

	this.repeating = !!repeating; // TODO implement this

	h = h || w;

	this.canvas.width = w;
	this.canvas.height = h;

	var stops = stops;

	this.stops = (stops || "").split(/\s*,(?![^(]*\))\s*/); // commas that are not followed by a ) without a ( first

	for (var i=0; i<this.stops.length; i++) {
		var stop = this.stops[i] = new _.ColorStop(this, this.stops[i]);

		if (stop.next) {
			this.stops.splice(i+1, 0, stop.next);
			i++;
		}
	}

	// Normalize stops
	
	if (this.stops[0].pos === undefined) {
			this.stops[0].pos = 0;
		}
	else if (this.stops[0].pos > 0) {
		var first = this.stops[0].clone();
		first.pos = 0;
		this.stops.unshift(first);
	}
	
	if (this.stops[this.stops.length - 1].pos === undefined) {
		this.stops[this.stops.length - 1].pos = 1;
	}
	else if (this.stops[this.stops.length - 1].pos < 1) {
		var last = this.stops[this.stops.length - 1].clone();
		last.pos = 1;
		this.stops.push(last);
	}
	
	this.stops.forEach(function(stop, i){
		if (stop.pos === undefined) {
			for (var j=i+1; this[j]; j++) {
				if (this[j].pos !== undefined) {
					stop.pos = this[i-1].pos + (this[j].pos - this[i-1].pos)/(j-i+1);
					break;
				}
			}
		}
		else if (i > 0) {
			stop.pos = Math.max(stop.pos, this[i-1].pos);
		}
	}, this.stops);

	this.paint();
};

_.all = [];

_.prototype = {
	toString: function() {
		return "url('" + 
			'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="none">' + 
			'<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">' +
			'<image width="100" height="100%" xlink:href="' + this.canvas.toDataURL() + '" /></svg></svg>' +
			"')";
	},

	get r() {
		return Math.sqrt(2) * Math.max(this.canvas.width, this.canvas.height) / 2;
	},
	
	paint: function() {
		var c = this.context;

		var π = Math.PI;
		var τ = 2 * π;
		
		var radius = this.r;
		var x = this.canvas.width / 2;
		var y = this.canvas.height / 2;
		
		var startAngle = -π/2;
		var endAngle = 3*π/2;
		
		var currentColorIndex = 0; // The index of the current color
		var currentColor = this.stops[currentColorIndex].color; // Current color
		var nextColor    = this.stops[currentColorIndex].color; // Next color
		
		var prevOffset = 0; // Before the offset value
		var currentOffset = this.stops[currentColorIndex].pos; // The current offset value
		var offsetDist = currentOffset - prevOffset; // The difference between the offset

		var arcStartAngle = startAngle; // Start angle of fill in the loop
		var arcEndAngle; // Exit angle of fill in the loop

		var r1 = currentColor[0],
			g1 = currentColor[1],
			b1 = currentColor[2],
			a1 = currentColor[3];

		var r2 = nextColor[0],
			g2 = nextColor[1],
			b2 = nextColor[2],
			a2 = nextColor[3];

		if (!a1 && a1 !== 0) a1 = 1;
		if (!a2 && a2 !== 0) a2 = 1;
		
		var rd = r2 - r1,
			gd = g2 - g1,
			bd = b2 - b1,
			ad = a2 - a1;
		var t, r, g, b, a;
					
		c.save();

		for (var i = 0, n = 1 / 360; i < 1; i += n) {
			if (i >= currentOffset) {
				// To the next color
				currentColorIndex++;

				currentColor = nextColor;
				
				r1 = currentColor[0];
				g1 = currentColor[1];
				b1 = currentColor[2];
				a1 = currentColor[3];

				if (!a1 && a1 !== 0) a1 = 1;

				nextColor = this.stops[currentColorIndex].color;
				r2 = nextColor[0]; g2 = nextColor[1]; b2 = nextColor[2]; a2 = nextColor[3];
				if (!a2 && a2 !== 0) a2 = 1;
				
				rd = r2 - r1; gd = g2 - g1; bd = b2 - b1; ad = a2 - a1;
				
				prevOffset = currentOffset;
				currentOffset = this.stops[currentColorIndex].pos;
				offsetDist = currentOffset - prevOffset;
			}
			
			t = (i - prevOffset) / offsetDist;
			r = (rd * t + r1) & 255;
			g = (gd * t + g1) & 255;
			b = (bd * t + b1) & 255;
			a = ad * t + a1;

			arcEndAngle = arcStartAngle + π / 180;

			// Go painted in a fan shape (?!)
			c.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
			c.beginPath();
			c.moveTo(x, y);
			c.arc(x, y, radius, arcStartAngle - 0.02, arcEndAngle, false); // Little start from the front the startAngle so that moire is not out
			c.closePath();
			c.fill();

			arcStartAngle += π / 180;
		}

		c.restore();
	}
};

_.ColorStop = function(gradient, stop) {
	this.gradient = gradient;

	if (stop) {
		var parts = stop.match(/^(.+?)(?:\s+([\d.]+)(%|deg|turn)?)?(?:\s+([\d.]+)(%|deg|turn)?)?\s*$/);

		this.color = _.ColorStop.colorToRGBA(parts[1]);

		if (parts[2]) {
			var unit = parts[3];

			if (unit == "%" || parts[2] === "0" && !unit) {
				this.pos = parts[2]/100;
			}
			else if (unit == "turn") {
				this.pos  = +parts[2];
			}
			else if (unit == "deg") {
				this.pos  = parts[2] / 360;
			}
		}

		if (parts[4]) {
			this.next = new _.ColorStop(gradient, parts[1] + " " + parts[4] + parts[5]);
		}
	}
}

_.ColorStop.prototype = {
	clone: function() {
		var ret = new _.ColorStop(this.gradient);
		ret.color = this.color;
		ret.pos = this.pos;

		return ret;
	},

	toString: function() {
		return "rgba(" + this.color.join(", ") + ") " + this.pos * 100 + "%";
	}
};

_.ColorStop.colorToRGBA = function(color) {
	if (!Array.isArray(color)) {
		dummy.style.color = color;

		var rgba = getComputedStyle(dummy).color.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/);

		if (rgba) {
			rgba.shift();
			rgba = rgba.map(function(a) { return +a });
			rgba[3] = isNaN(rgba[3])? 1 : rgba[3];
		}

		return rgba || [0,0,0,0];
	}

	return color;
};

})();

StyleFix.register(function(css, raw) {
	if (css.indexOf("conic-gradient") > -1) {
		css = css.replace(/(?:repeating-)?conic-gradient\(([^;}]+)\)/g, function(gradient, stops) {
			return new ConicGradient(stops, 400, 400, gradient.indexOf("repeating-") > -1);
		});
	}

	return css;
});