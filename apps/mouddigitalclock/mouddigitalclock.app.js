Graphics.prototype.setFont7Seg = function() {
  return this.setFontCustom(atob("AAAAAAAAAAAACAQCAAAAAAIAd0BgMBdwAAAAAAAADuAAAB0RiMRcAAAAAiMRiLuAAAcAQCAQdwAADgiMRiIOAAAd0RiMRBwAAAAgEAgDuAAAd0RiMRdwAADgiMRiLuAAAABsAAAd0QiEQdwAADuCIRCIOAAAd0BgMBAAAAAOCIRCLuAAAd0RiMRAAAADuiEQiAAAAAd0BgMBBwAADuCAQCDuAAAdwAAAAAAAAAAAIBALuAAAdwQCAQdwAADuAIBAIAAAAd0AgEAcEAgEAdwAd0AgEAdwAADugMBgLuAAAd0QiEQcAAADgiEQiDuAAAd0AgEAAAAADgiMRiIOAAAAEAgEAdwAADuAIBALuAAAdwBAIBdwAADuAIBAIOAIBALuADuCAQCDuAAAcAQCAQdwAAAOiMRiLgAAAA=="), 32, atob("BwAAAAAAAAAAAAAAAAcCAAcHBwcHBwcHBwcEAAAAAAAABwcHBwcHBwcHBwcHCgcHBwcHBwcHBwoHBwc="), 9);
};

{ // our scope
let drawTimeout;

// Load settings
var settings = Object.assign({
  showSeconds: true,
  tempUnit: "C", // "C" for Celsius, "F" for Fahrenheit
}, require('Storage').readJSON("mouddigitalclock.settings.json", 1) || {});

require("Font7x11Numeric7Seg").add(Graphics);
const is12Hour = (require("Storage").readJSON("setting.json", 1) || {})["12hour"];

// Define the area for temperature display
let tempArea;

// Actually draw the watch face
let draw = function() {
  var x = R.x + R.w / 2;
  var y = R.y + 48;
  g.reset().setColor(g.theme.bg).setBgColor(g.theme.fg);
  g.clearRect(R.x, bar1Y + 2, R.x2, bar2Y - 2);
  var date = new Date();
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var seconds = date.getSeconds();

  if (is12Hour) {
    hours = hours % 12;
    if (hours === 0) hours = 12;
  }

  var hoursStr = ("0" + hours).substr(-2);
  var minutesStr = ("0" + minutes).substr(-2);
  var timeStr = hoursStr + ":" + minutesStr;

  // Measure widths and heights
  g.setFont("7x11Numeric7Seg:4");
  var timeWidth = g.stringWidth(timeStr);
  var timeHeight = g.getFontHeight();

  var totalWidth = timeWidth;

  // Include seconds if enabled
  if (settings.showSeconds) {
    var secondsStr = ("0" + seconds).substr(-2);
    var secondsDisplay = ":" + secondsStr;
    g.setFont("7x11Numeric7Seg:2");
    var secondsWidth = g.stringWidth(secondsDisplay);
    var secondsHeight = g.getFontHeight();
    totalWidth += secondsWidth;
  } else {
    var secondsWidth = 0;
  }

  var startX = x - totalWidth / 2;

  // Adjust y-coordinate to align bottoms
  var yTimeCenter = y + 39;
  var yBaseline = yTimeCenter + (timeHeight / 2);

  // Draw timeStr
  g.setFont("7x11Numeric7Seg:4");
  g.setFontAlign(-1, 1); // Left alignment, bottom alignment
  g.drawString(timeStr, startX, yBaseline);

  // Draw seconds if enabled
  if (settings.showSeconds) {
    g.setFont("7x11Numeric7Seg:2");
    g.setFontAlign(-1, 1); // Left alignment, bottom alignment
    g.drawString(secondsDisplay, startX + timeWidth, yBaseline);
  }

  // Draw AM/PM if 12-hour mode
  if (is12Hour) {
    var meridian = require("locale").meridian(date).toUpperCase();
    g.setFont("7Seg:2");
    g.setFontAlign(1, 1); // Right alignment, bottom alignment

    // Position AM/PM above the seconds or time
    var ampmX = R.x2 - 2; // Keep at the right side
    var ampmY = yBaseline - (settings.showSeconds ? secondsHeight : 0) - 4;

    g.drawString(meridian, ampmX, ampmY);
  }

  // Day of week (moved slightly to the right)
  g.setFontAlign(-1, 0).setFont("7Seg:2").drawString(require("locale").dow(date, 1).toUpperCase(), R.x + 6, y);

  // Date
  g.setFontAlign(-1, 0).setFont("7Seg:2").drawString(require("locale").month(date, 2).toUpperCase(), x, y);
  g.setFontAlign(1, 0).setFont("7Seg:2").drawString(date.getDate(), R.x2 - 6, y);

  // Draw temperature in upper left corner
  // Fetch temperature using Bangle.js API
  let tempC = E.getTemperature(); // No correction factor

  let tempStr;
  if (!isNaN(tempC)) {
    if (settings.tempUnit === "C") {
      tempStr = Math.round(tempC) + "C";
    } else {
      let tempF = tempC * 9 / 5 + 32;
      tempStr = Math.round(tempF) + "F";
    }
  } else {
    tempStr = "--";
  }

  // Clear temp area
  g.reset();
  g.setColor(g.theme.bg).setBgColor(g.theme.fg); // Invert colors to match watchface style
  g.clearRect(tempArea.x, tempArea.y, tempArea.x + tempArea.w, tempArea.y + tempArea.h);

  // Use the same font as elsewhere
  g.setFont("7Seg:2");

  // Measure text dimensions
  var tempWidth = g.stringWidth(tempStr);
  var tempHeight = g.getFontHeight();

  // Adjust tempX to move it to the right a few pixels
  var tempX = tempArea.x + 6; // Move right by 6 pixels
  var tempY = tempArea.y + (tempArea.h - tempHeight) / 2;

  g.setFontAlign(-1, -1); // Left-top alignment
  g.drawString(tempStr, tempX, tempY);

  // Queue next draw
  if (drawTimeout) clearTimeout(drawTimeout);
  var interval = settings.showSeconds ? 1000 : 60000;
  drawTimeout = setTimeout(function() {
    drawTimeout = undefined;
    draw();
  }, interval - (Date.now() % interval));
};

let clockInfoDraw = (itm, info, options) => {
  g.reset().setFont("7Seg").setColor(g.theme.bg).setBgColor(g.theme.fg);
  if (options.focus) g.setBgColor("#FF0");
  g.clearRect({x: options.x, y: options.y, w: options.w, h: options.h, r: 8});

  if (info.img) {
    g.drawImage(info.img, options.x + 1, options.y + 2);
  }
  var text = info.text.toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (g.setFont("7Seg:2").stringWidth(text) + 24 - 2 > options.w) g.setFont("7Seg");
  g.setFontAlign(0, -1).drawString(text, options.x + options.w / 2 + 13, options.y + 6);
};

// Show launcher when middle button pressed
Bangle.setUI({
  mode: "clock",
  remove: function() {
    // Called to unload all of the clock app
    if (drawTimeout) clearTimeout(drawTimeout);
    drawTimeout = undefined;
    delete Graphics.prototype.setFont7Seg;
    // remove info menu
    // Removed clockInfoMenu as we're not using it for the upper left corner
    //clockInfoMenu.remove();
    //delete clockInfoMenu;
    clockInfoMenu2.remove();
    delete clockInfoMenu2;
    clockInfoMenu3.remove();
    delete clockInfoMenu3;
    clockInfoMenu4.remove();
    delete clockInfoMenu4;
    // reset theme
    g.setTheme(oldTheme);
  }
});

// Load widgets
Bangle.loadWidgets();
// Work out sizes
let R = Bangle.appRect;
R.x += 1;
R.y += 1;
R.x2 -= 1;
R.y2 -= 1;
R.w -= 1;
R.h -= 1;
let midX = R.x + R.w / 2;
let bar1Y = R.y + 30;
let bar2Y = R.y2 - 30;
// Define temperature display area
tempArea = { x: R.x, y: R.y, w: midX - 2, h: bar1Y - R.y - 2 };
// Clear the screen once, at startup
let oldTheme = g.theme;
g.setTheme({bg:"#000", fg:"#3ff", dark:true}).clear(1);
g.fillRect({x:R.x, y:R.y, w:R.w, h:R.h, r:8})
  .clearRect(R.x, bar1Y, R.w, bar1Y + 1)
  .clearRect(midX, R.y, midX, bar1Y)
  .clearRect(R.x, bar2Y, R.w, bar2Y + 1)
  .clearRect(midX, bar2Y, midX, R.y2 + 1);
draw();
Bangle.drawWidgets();
// Allocate and draw clockinfos
let clockInfoItems = require("clock_info").load();
// Remove clockInfoMenu for the upper left corner
//clockInfoMenu = require("clock_info").addInteractive(clockInfoItems, { app:"mouddigitalclock", x:R.x, y:R.y, w:midX - 2, h:bar1Y - R.y - 2, draw: clockInfoDraw });
let clockInfoMenu2 = require("clock_info").addInteractive(clockInfoItems, { app:"mouddigitalclock", x:midX + 1, y:R.y, w:midX - 2, h:bar1Y - R.y - 2, draw: clockInfoDraw });
let clockInfoMenu3 = require("clock_info").addInteractive(clockInfoItems, { app:"mouddigitalclock", x:R.x, y:bar2Y + 2, w:midX - 2, h:bar1Y - R.y - 2, draw: clockInfoDraw });
let clockInfoMenu4 = require("clock_info").addInteractive(clockInfoItems, { app:"mouddigitalclock", x:midX + 1, y:bar2Y + 2, w:midX - 2, h:bar1Y - R.y - 2, draw: clockInfoDraw });
}
