const spawn = require('cross-spawn');
const path = require('path');
const colors = require("colors");
const request = require('request');
const _cliProgress = require('cli-progress');
const version = "v0.1";
console.log(colors.green("SAMP Writer by Andro_Louis " + version));
const fs = require("fs");
if (!fs.existsSync("records")) {
  fs.mkdirSync("records");
}
if (!fs.existsSync("ffmpeg-logs")) {
  fs.mkdirSync("ffmpeg-logs");
}
if (!fs.existsSync("config.json")) {
  fs.writeFileSync("config.json", '{"fps": "30","duration": "30","bitrate":"16M","codec":"libopenh264","window":"MTA: Province"}');
}
const config = JSON.parse(fs.readFileSync("config.json"));
var child;
var tmo;
var date = new Date();
var filename = toISOStringg(date) + ".mp4";
var scriptOutput = "";
var extract = require('extract-zip');
var filebn = "";

function pad(number) {
  if (number < 10) {
    return '0' + number;
  }
  return number;
}

function toISOStringg(date) {
  return pad(date.getHours()) +
    '-' + pad(date.getMinutes()) +
    '-' + pad(date.getSeconds());
}

const download = (url, filename, callback) => {
  const progressBar = new _cliProgress.SingleBar({
    format: colors.blue("[+]") + ' Downloading ffmpeg : [{bar}] {percentage}%'
  }, _cliProgress.Presets.legacy);
  const file = fs.createWriteStream(filename);
  let receivedBytes = 0
  request.get(url)
    .on('response', (response) => {
      if (response.statusCode !== 200) {
        return callback('Response status was ' + response.statusCode);
      }

      const totalBytes = response.headers['content-length'];
      progressBar.start(totalBytes, 0);
    })
    .on('data', (chunk) => {
      receivedBytes += chunk.length;
      progressBar.update(receivedBytes);
    })
    .pipe(file)
    .on('error', (err) => {
      fs.unlink(filename);
      progressBar.stop();
      return callback(err.message);
    });

  file.on('finish', () => {
    progressBar.stop();
    file.close(callback);
  });

  file.on('error', (err) => {
    fs.unlink(filename);
    progressBar.stop();
    return callback(err.message);
  });
}
if (!fs.existsSync("ffmpeg.exe")) {
  fn = ("https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n5.0-latest-win64-gpl-5.0.zip").split("/");
  fn = fn[fn.length - 1];
  download("https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n5.0-latest-win64-gpl-5.0.zip", fn, () => {
    console.log(colors.blue("[+]"), "Unpacking ffmpeg...");
    async function main() {
      try {
        await extract(fn, {
          dir: process.cwd()
        })
        filebn = fn.split(".");
        filebn = filebn.slice(0, -1);
        filebn = filebn.join(".");
        fs.copyFileSync(process.cwd() + "\\" + filebn + "\\bin\\ffmpeg.exe", process.cwd() + "\\ffmpeg.exe");
        fs.rmSync(filebn, { recursive: true, force: true });
        fs.rmSync(fn);
        startChild();
        console.log(colors.blue("[+]"), "Successful, starting...");
      } catch (err) {
        console.log(colors.red("[-]"), "Unpacking error:", err);
      }
    }
    main();
  });
} else {
  startChild();
}

function startChild() {
  clearTimeout(tmo);
  scriptOutput = "";
  date = new Date();
  filename = toISOStringg(date) + ".mp4";
  dirname = pad(date.getDate()) + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getFullYear());
  if (!fs.existsSync("records/" + dirname)) {
    fs.mkdirSync("records/" + dirname);
  }
  child = spawn('"' + process.cwd() + '\\ffmpeg.exe" -f gdigrab -framerate ' + config.fps + ' -i title="' + config.window + '" -b:v ' + config.bitrate + ' -c:v ' + config.codec + ' -qp 0 records/' + dirname + "/" + filename);

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', function (data) {
    data = data.toString();
    scriptOutput += data;
    fs.writeFileSync(process.cwd() + "\\ffmpeg-logs\\" + path.parse(filename).name + ".log", scriptOutput);
  });
  child.stderr.on('data', function (data) {
    data = data.toString();
    scriptOutput += data;
    fs.writeFileSync(process.cwd() + "\\ffmpeg-logs\\" + path.parse(filename).name + ".log", scriptOutput);
  });
  child.on('close', function (code) {
    scriptOutput += '\nclosing code: ' + code;
    fs.writeFileSync(process.cwd() + "\\ffmpeg-logs\\" + path.parse(filename).name + ".log", scriptOutput);
  });

  console.log(colors.blue("[+]"), "File " + dirname + "/" + filename + " started");
  tmo = setTimeout(function () {
    child.stdin.write("q\n");
    console.log(colors.blue("[+]"), "File " + dirname + "/" + filename + " completed");
    startChild();
  }, config.duration * 1000);
}