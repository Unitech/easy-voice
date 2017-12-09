var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var urlParse  = require('url').parse;
var googleTTS = require('google-tts-api');
var exec = require('child_process').exec;
var os = require('os');

function downloadFile (url, dest, cb) {
  var info = urlParse(url);
  var httpClient = info.protocol === 'https:' ? https : http;
  var options = {
    host: info.host,
    path: info.path,
    headers: {
      'user-agent': 'Mozilla'
    }
  };

  httpClient.get(options, function(res) {
    if (res.statusCode !== 200) {
      var e = new Error('request to ' + url + ' failed, status code = ' + res.statusCode + ' (' + res.statusMessage + ')');
      return cb(e);
    }

    var file = fs.createWriteStream(dest);

    file.on('finish', function() {
      file.close(cb);
    });

    file.on('error', function (err) {
      fs.unlink(dest);
      cb(err);
    });

    res.pipe(file);
  }).end();
}

module.exports= function(text, lang, cb) {
  if (typeof(lang) == 'function') {
    cb = lang;
    lang = 'en';
  }
  if (!cb)
    cb = function() {}

  var sound_path = path.resolve(os.tmpdir(), path.normalize(text).replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.mp3');

  function play(sound_path) {
    exec('mpg123 ' + sound_path, function() {
    });
  }

  // Check if message voice has not been already downloaded
  fs.stat(sound_path, function(e) {
    if (!e) {
      return play(sound_path, function(e) {
        if (e)
          return cb(e);
        return cb(null, {
          path : sound_path
        });
      });
    }

    googleTTS(text, lang)
      .then(function (url) {
        var dest = sound_path;

        downloadFile(url, sound_path, function(err) {
          if (err) return cb(err);
          play(sound_path, function(e) {
            if (e)
              return cb(e);
            return cb(null, {
              path : sound_path
            });
          });

        });
      })
      .catch(function (err) {
        cb(err);
      });
  });
}
