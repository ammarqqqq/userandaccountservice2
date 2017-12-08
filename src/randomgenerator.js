var crypto = require('crypto');

var randomhandler = (function() {
  var deps = {};

  function generateCode(howMany, chars) {
    return deps.generateCode(howMany, chars);
  }

  deps.generateCode = function(howMany, chars) {
    chars = chars
        || "abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789";
    var rnd = crypto.randomBytes(howMany)
        , value = new Array(howMany)
        , len = chars.length;

    for (var i = 0; i < howMany; i++) {
        value[i] = chars[rnd[i] % len]
    };

    return value.join('');
  }

  return {
    "generateCode": generateCode,
    "deps": deps
  };
})();

module.exports = randomhandler;
