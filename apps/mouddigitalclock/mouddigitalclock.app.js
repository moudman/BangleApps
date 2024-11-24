Graphics.prototype.setFont7Seg = function() {
  return this.setFontCustom(
    atob("AAAAAAAAAAAACAQCAAAAAAIAd0BgMBdwAAAAAAAADuAAAB0RiMRcAAAAAiMRiLuAAAcAQCAQdwAADgiMRiIOAAAd0RiMRBwAAAAgEAgDuAAAd0RiMRdwAADgiMRiLuAAAABsAAAd0QiEQdwAADuCIRCIOAAAd0BgMBAAAAAOCIRCLuAAAd0RiMRAAAADuiEQiAAAAAd0BgMBBwAADuCAQCDuAAAdwAAAAAAAAAAAIBALuAAAdwQCAQdwAADuAIBAIAAAAd0AgEAcEAgEAdwAd0AgEAdwAADugMBgLuAAAd0QiEQcAAADgiEQiDuAAAd0AgEAAAAADgiMRiIOAAAAEAgEAdwAADuAIBALuAAAdwBAIBdwAADuAIBAIOAIBALuADuCAQCDuAAAcAQCAQdwAAAOiMRiLgAAAA=="),
    32,
    atob("BwAAAAAAAAAAAAAAAAcCAAcHBwcHBwcHBwcEAAAAAAAABwcHBwcHBwcHBwcHCgcHBwcHBwcHBwoHBwc="),
    9
  );
};

{
  // Must be inside our own scope here so that when we are unloaded everything disappears

  let drawTimeout;

  // Load settings
  var settings = Object.assign(
    {
      showSeconds: true,
      tempUnit: "C", // "C" for Celsius, "F" for Fahrenheit
    },
    require('Storage').readJSON("mouddigitalclock.settings.json", 1) || {}
  );

  require("Font7x11Numeric7Seg").add(Graphics);
  const is12Hour = (require("Storage").readJSON("setting.json", 1) || {})["12hour"];

  // Define the areas for temperature display and stopwatch
  let tempArea;
  let tempWidth;
  let stopwatchArea;

  // Initialize stopwatch variables
  let stopwatchTime = 0; // Accumulated time in milliseconds
  let stopwatchStartTime = 0; // Timestamp when stopwatch started
  let stopwatchState = 'stopped'; // 'stopped', 'running', 'paused'
  let lastTapTime = 0; // For detecting double-taps

  // Actually draw the watch face
  let draw = () => {
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
      var ampmX = R.x2 - 2; // Adjusted as per your preference
      var ampmY = yBaseline - secondsHeight - 4; // Move up by secondsHeight plus clearance

      g.drawString(meridian, ampmX, ampmY);
    }

    // Day of week
    g.setFontAlign(-1, 0)
      .setFont("7Seg:2")
      .drawString(require("locale").dow(date, 1).toUpperCase(), R.x + 6, y);

    // Date
    g.setFontAlign(-1, 0)
      .setFont("7Seg:2")
      .drawString(require("locale").month(date, 2).toUpperCase(), x, y);
    g.setFontAlign(1, 0)
      .setFont("7Seg:2")
      .drawString(date.getDate(), R.x2 - 6, y);

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
      tempStr = "20C";
    }

    // Clear temp area
    g.reset();
    g.setColor(g.theme.bg).setBgColor(g.theme.fg); // Invert colors to match watchface style
    g.clearRect(tempArea.x, tempArea.y, tempArea.x + tempArea.w, tempArea.y + tempArea.h);

    // Use the same font as elsewhere
    g.setFont("7Seg:2");

    // Measure text dimensions, tempWidth will be used later
    tempWidth = g.stringWidth(tempStr);
    var tempHeight = g.getFontHeight();

    // Position the text within the tempArea
    var tempX = tempArea.x + 6;
    var tempY = tempArea.y + (tempArea.h - tempHeight) / 2;

    g.setFontAlign(-1, -1); // Left-top alignment
    g.drawString(tempStr, tempX, tempY);

    // Draw stopwatch in upper right corner
    let stopwatchStr = "00:00:00";
    if (stopwatchState === 'running') {
      let elapsed = stopwatchTime + (Date.now() - stopwatchStartTime);
      stopwatchStr = formatStopwatchTime(elapsed);
    } else if (stopwatchState === 'paused') {
      stopwatchStr = formatStopwatchTime(stopwatchTime);
    }

    // Clear stopwatch area
    g.reset();
    g.setColor(g.theme.bg).setBgColor(g.theme.fg); // Invert colors to match watchface style
    g.clearRect(
      stopwatchArea.x,
      stopwatchArea.y,
      stopwatchArea.x + stopwatchArea.w,
      stopwatchArea.y + stopwatchArea.h
    );

    // Use the same font
    g.setFont("7Seg:2");

    // Measure text dimensions
    var stopwatchWidth = g.stringWidth(stopwatchStr);
    var stopwatchHeight = g.getFontHeight();

    // Center the text within the stopwatchArea
    var stopwatchX = stopwatchArea.x;
    var stopwatchY = stopwatchArea.y + (stopwatchArea.h - stopwatchHeight) / 2;

    g.setFontAlign(-1, -1); // Left-top alignment
    g.drawString(stopwatchStr, stopwatchX, stopwatchY);

    // Queue next draw
    if (drawTimeout) clearTimeout(drawTimeout);
    drawTimeout = setTimeout(() => {
      drawTimeout = undefined;
      draw();
    }, 1000 - (Date.now() % 1000));
  };

  let formatStopwatchTime = (ms) => {
    let totalSeconds = Math.floor(ms / 1000);
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;

    let hoursStr = ("0" + hours).substr(-2);
    let minutesStr = ("0" + minutes).substr(-2);
    let secondsStr = ("0" + seconds).substr(-2);

    return hoursStr + ":" + minutesStr + ":" + secondsStr;
  };

  let clockInfoDraw = (itm, info, options) => {
    g.reset().setFont("7Seg").setColor(g.theme.bg).setBgColor(g.theme.fg);
    if (options.focus) g.setBgColor("#FF0");
    g.clearRect({ x: options.x, y: options.y, w: options.w, h: options.h, r: 8 });

    if (info.img) {
      g.drawImage(info.img, options.x + 1, options.y + 2);
    }
    var text = info.text.toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (g.setFont("7Seg:2").stringWidth(text) + 24 - 2 > options.w) g.setFont("7Seg");
    g.setFontAlign(0, -1).drawString(text, options.x + options.w / 2 + 13, options.y + 6);
  };

  // Touch handler for stopwatch area
  let touchHandler = (button, xy) => {
    if (
      xy.x >= stopwatchArea.x &&
      xy.x <= stopwatchArea.x + stopwatchArea.w &&
      xy.y >= stopwatchArea.y &&
      xy.y <= stopwatchArea.y + stopwatchArea.h
    ) {
      let currentTime = Date.now();
      if (currentTime - lastTapTime < 500) {
        // Double-tap detected
        lastTapTime = 0;
        // Reset stopwatch
        stopwatchTime = 0;
        stopwatchState = 'stopped';
        //draw(); // Update display immediately
      } else {
        // Single tap
        lastTapTime = currentTime;
        if (stopwatchState === 'stopped') {
          // Start stopwatch
          stopwatchStartTime = Date.now();
          stopwatchState = 'running';
        } else if (stopwatchState === 'running') {
          // Pause stopwatch
          stopwatchTime += Date.now() - stopwatchStartTime;
          stopwatchState = 'paused';
        } else if (stopwatchState === 'paused') {
          // Resume stopwatch
          stopwatchStartTime = Date.now();
          stopwatchState = 'running';
        }
        //draw(); // Update display immediately
      }
    }
  };

  // Show launcher when middle button pressed
  Bangle.setUI("clock");

  // Register touch handler
  Bangle.on('touch', touchHandler);

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
  let midX1 = R.x + R.w / 2 - 40;
  let midX2 = R.x + R.w / 2;
  let bar1Y = R.y + 30;
  let bar2Y = R.y2 - 30;
  // Define temperature display area
  tempArea = { x: R.x, y: R.y, w: midX1 - 2, h: bar1Y - R.y - 2 };
  // Define stopwatch display area (using your adjustment)
  stopwatchArea = {
    x: midX1 + 8,
    y: R.y,
    w: R.w - midX1 ,
    h: bar1Y - R.y - 2,
  };

  // Clear the screen once, at startup
  let oldTheme = g.theme;
  g.setTheme({ bg: "#000", fg: "#3ff", dark: true }).clear(1);
  g.fillRect({ x: R.x, y: R.y, w: R.w, h: R.h, r: 8 })
    .clearRect(R.x, bar1Y, R.w, bar1Y + 1)
    .clearRect(midX1, R.y, midX1, bar1Y) // Vertical divider between temperature and stopwatch
    .clearRect(R.x, bar2Y, R.w, bar2Y + 1)
    .clearRect(midX2, bar2Y, midX2, R.y2 + 1);
  draw();
  Bangle.drawWidgets();

  // Allocate and draw clock infos
  let clockInfoItems = require("clock_info").load();
  let clockInfoMenu3 = require("clock_info").addInteractive(clockInfoItems, {
    app: "mouddigitalclock",
    x: R.x,
    y: bar2Y + 2,
    w: midX1 - 2,
    h: bar1Y - R.y - 2,
    draw: clockInfoDraw,
  });
  let clockInfoMenu4 = require("clock_info").addInteractive(clockInfoItems, {
    app: "mouddigitalclock",
    x: midX2 + 1,
    y: bar2Y + 2,
    w: midX2 - 2,
    h: bar1Y - R.y - 2,
    draw: clockInfoDraw,
  });

  // Cleanup on unload
  Bangle.on('kill', () => {
    if (drawTimeout) clearTimeout(drawTimeout);
    drawTimeout = undefined;
    delete Graphics.prototype.setFont7Seg;
    clockInfoMenu3.remove();
    delete clockInfoMenu3;
    clockInfoMenu4.remove();
    delete clockInfoMenu4;
    // Remove touch handler
    Bangle.removeListener('touch', touchHandler);
    // Reset theme
    g.setTheme(oldTheme);
  });
}
