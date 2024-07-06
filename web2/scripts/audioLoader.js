var app = app || {};
var source;
var buffer;
var analyser;

window.onload = function () {
  function getMicInput() {
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then(function (stream) {
        app.ctx = new (window.AudioContext || window.webkitAudioContext)();
        source = app.ctx.createBufferSource();
        analyser = app.ctx.createAnalyser();
        analyser.fftSize = 2048;
        app.microphone = app.ctx.createMediaStreamSource(stream);
        app.microphone.connect(analyser);
      })
      .catch(function (err) {
        console.log("error", err);
      });
  }
  getMicInput();
};
