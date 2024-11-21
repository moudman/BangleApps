Graphics.prototype.setFont7Seg = function() {
  return this.setFontCustom(atob("AAAAAAAAAAAACAQCAAAAAAIAd0BgMBdwAAAAAAAADuAAAB0RiMRcAAAAAiMRiLuAAAcAQCAQdwAADgiMRiIOAAAd0RiMRBwAAAAgEAgDuAAAd0RiMRdwAADgiMRiLuAAAABsAAAd0QiEQdwAADuCIRCIOAAAd0BgMBAAAAAOCIRCLuAAAd0RiMRAAAADuiEQiAAAAAd0BgMBBwAADuCAQCDuAAAdwAAAAAAAAAAAIBALuAAAdwQCAQdwAADuAIBAIAAAAd0AgEAcEAgEAdwAd0AgEAdwAADugMBgLuAAAd0QiEQcAAADgiEQiDuAAAd0AgEAAAAADgiMRiIOAAAAEAgEAdwAADuAIBALuAAAdwBAIBdwAADuAIBAIOAIBALuADuCAQCDuAAAcAQCAQdwAAAOiMRiLgAAAA=="), 32, atob("BwAAAAAAAAAAAAAAAAcCAAcHBwcHBwcHBwcEAAAAAAAABwcHBwcHBwcHBwcHCgcHBwcHBwcHBwoHBwc="), 9);
};

{ // must be inside our own scope here so that when we are unloaded everything disappears
  // we also define functions using 'let fn = function() {..}' for the same reason. function decls are global
let drawTimeout;

require("Font7x11Numeric7Seg").add(Graphics);
const is12Hour = (require("Storage").readJSON("setting.json", 1) || {})["12hour"];

// Actually draw the watch face
let draw = function() {
  var x = R.x + R.w/2;
  var y = R.y + 48;
  g.reset().setColor(g.theme.bg).setBgColor(g.theme.fg);
  g.clearRect(R.x, bar1Y+2, R.x2, bar2Y-2);
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
  var secondsStr = ("0" + seconds).substr(-2);

  var timeStr = hoursStr + ":" + minutesStr;
  var secondsDisplay = ":" + secondsStr;

  // Measure widths and heights
  g.setFont("7x11Numeric7Seg:4");
  var timeWidth = g.stringWidth(timeStr);
  var timeHeight = g.getFontHeight();

  g.setFont("7x11Numeric7Seg:2");
  var secondsWidth = g.stringWidth(secondsDisplay);
  var secondsHeight = g.getFontHeight();

  var totalWidth = timeWidth + secondsWidth;

  var startX = x - totalWidth / 2;

  // Adjust y-coordinate to align bottoms
  var yTimeCenter = y + 39;
  var yBaseline = yTimeCenter + (timeHeight / 2);

  // Draw timeStr
  g.setFont("7x11Numeric7Seg:4");
  g.setFontAlign(-1, 1); // Left alignment, bottom alignment
  g.drawString(timeStr, startX, yBaseline);

  // Draw seconds
  g.setFont("7x11Numeric7Seg:2");
  g.setFontAlign(-1, 1); // Left alignment, bottom alignment
  g.drawString(secondsDisplay, startX + timeWidth, yBaseline);

  // Draw AM/PM if 12-hour mode
  if (is12Hour) {
    var meridian = require("locale").meridian(date).toUpperCase();
    g.setFont("7Seg:2");
    g.setFontAlign(1, 1); // Right alignment, bottom alignment

    // Position AM/PM above the seconds
    var ampmX = R.x2 - 2; // Keep at the right side
    var ampmY = yBaseline - secondsHeight - 4; // Move up by secondsHeight plus clearance

    g.drawString(meridian, ampmX, ampmY);
  }

  // Day of week
  g.setFontAlign(-1, 0).setFont("7Seg:2").drawString(require("locale").dow(date, 1).toUpperCase(), R.x+2, y);

  // Date
  g.setFontAlign(-1, 0).setFont("7Seg:2").drawString(require("locale").month(date, 2).toUpperCase(), x, y);
  g.setFontAlign(1, 0).setFont("7Seg:2").drawString(date.getDate(), R.x2 - 6, y);

  // Queue next draw
  if (drawTimeout) clearTimeout(drawTimeout);
  drawTimeout = setTimeout(function() {
    drawTimeout = undefined;
    draw();
  }, 1000 - (Date.now() % 1000));
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
  mode : "clock",
  remove : function() {
    // Called to unload all of the clock app
    if (drawTimeout) clearTimeout(drawTimeout);
    drawTimeout = undefined;
    delete Graphics.prototype.setFont7Seg;
    // remove info menu
    clockInfoMenu.remove();
    delete clockInfoMenu;
    clockInfoMenu2.remove();
    delete clockInfoMenu2;
    clockInfoMenu3.remove();
    delete clockInfoMenu3;
    clockInfoMenu4.remove();
    delete clockInfoMenu4;
    // reset theme
    g.setTheme(oldTheme);
  }});

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
let clockInfoMenu = require("clock_info").addInteractive(clockInfoItems, { app:"lcdclock", x:R.x, y:R.y, w:midX - 2, h:bar1Y - R.y - 2, draw : clockInfoDraw});
let clockInfoMenu2 = require("clock_info").addInteractive(clockInfoItems, { app:"lcdclock", x:midX + 1, y:R.y, w:midX - 2, h:bar1Y - R.y - 2, draw : clockInfoDraw});
let clockInfoMenu3 = require("clock_info").addInteractive(clockInfoItems, { app:"lcdclock", x:R.x, y:bar2Y + 2, w:midX - 2, h:bar1Y - R.y - 2, draw : clockInfoDraw});
let clockInfoMenu4 = require("clock_info").addInteractive(clockInfoItems, { app:"lcdclock", x:midX + 1, y:bar2Y + 2, w:midX - 2, h:bar1Y - R.y - 2, draw : clockInfoDraw});
}
