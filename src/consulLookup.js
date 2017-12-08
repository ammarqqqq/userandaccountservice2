var got = require('got-promise');
var sample =  require('lodash.sample');

var CONSUL_ADDRESS = process.env.CONSUL_ADDRESS;

var serviceLookupHandler = (function() {
  var deps = {};

  function serviceLookup(serviceName, routePath) {
    return deps.serviceLookup(serviceName, routePath);
  }

  deps.serviceLookup = function(serviceName, routePath) {
    const serviceHealthUrl = 'http://' + CONSUL_ADDRESS + '/v1/health/service/' + serviceName + '?passing'; // jshint ignore:line
    function composeServiceUrl(response) {
      var service = sample(response.body).Service;
      if (!service) throw "Service not found " + serviceName;
      return {
        address: service.Address,
        port: service.Port,
        routePath: routePath
      }
    }

    return got
      .get(serviceHealthUrl, {json: true})
      .then(composeServiceUrl)
      .catch(error => {
        console.error("Could not look up service dependency. Critical error!!!! " + error + " " + serviceName);
        process.exit(1);
      })
  }

  return {
    "serviceLookup": serviceLookup,
    "deps": deps
  };
})();


module.exports = serviceLookupHandler;
