(function(back) {
  var FILE = "mouddigitalclock.settings.json";
  // Load existing settings or set defaults
  var settings = Object.assign({
    showSeconds: true,
    tempUnit: "C", // "C" for Celsius, "F" for Fahrenheit
  }, require('Storage').readJSON(FILE, 1) || {});
  
  function saveSettings() {
    require('Storage').writeJSON(FILE, settings);
  }
  
  var menu = {
    '': { 'title': 'My Custom Clock' },
    '< Back': back,
    'Show Seconds': {
      value: settings.showSeconds,
      format: v => v ? "Yes" : "No",
      onchange: v => {
        settings.showSeconds = v;
        saveSettings();
      }
    },
    'Temperature Unit': {
      value: settings.tempUnit,
      format: v => v,
      onchange: v => {
        settings.tempUnit = v;
        saveSettings();
      },
      options: {"C": "Celsius", "F": "Fahrenheit"}
    },
  };
  E.showMenu(menu);
});
