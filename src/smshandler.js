const express = require('express');
const router = express.Router();
const request = require('request');
const Config = require('./config'),
  config = new Config();
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var btoa = require('btoa');


var smshandler = (function() {
  var deps = {};

  function sendSmsNew(phone, code) {
    console.log("On environment: "  + process.env.NODE_ENV);
    var useSMSService = config.useSMSService;
    console.log("Using SMS service: " + useSMSService);
    if (useSMSService) {
      return deps.sendSmsNew(phone, code)
    } else {
      return deps.sendMockSms(phone, code);
    }
  }

  deps.sendSmsNew = function(phone, code) {

    return new Promise(
      function(resolve , reject) {

        var data = JSON.stringify({
          from: "Fintech1",
          to: phone,
          text: code
        });

        var apitoken = "Fintech1";
        var secret = "K232500w";

        var conjson = 'Basic ' + btoa(unescape(encodeURIComponent(apitoken + ':' + secret)).trim())

        var xhr = new XMLHttpRequest();
        xhr.withCredentials = false;

        xhr.addEventListener("readystatechange", function () {
                if (this.readyState === this.DONE) {
                  console.log(this.responseText);
                  if (xhr.status == 200) {
                    var jsonObject = JSON.parse(this.responseText);
                    if (jsonObject.messages[0].status.groupName === "REJECTED") {
                      reject("REJECTED");
                    } else {
                      resolve(code);
                    }

                  } else {
                    reject();
                  }
                }
              });

        xhr.open("POST", "https://api.infobip.com/sms/1/text/single");
        xhr.setRequestHeader("Authorization", conjson);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("Accept", "application/json");
        xhr.send(data);

      }
    )
  }

  deps.sendMockSms = function(phone, code) {
    return new Promise(
        function(resolve , reject) {
         console.log("Sending MOCK SMS to phone number " + phone);
         resolve(code);
        }
    )
  }

  return {
    "sendSmsNew": sendSmsNew,
    "deps": deps
  };
})();

module.exports = smshandler;
