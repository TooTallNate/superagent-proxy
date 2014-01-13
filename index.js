
/**
 * Module dependencies.
 */

var proxyAgent = require('proxy-agent');
var debug = require('debug')('superagent-proxy');

/**
 * Module exports.
 */

module.exports = setup;

/**
 * Adds a `.proxy(uri)` function to the "superagent" module's Request class.
 *
 * ``` js
 * var request = require('superagent');
 * require('superagent-proxy')(request);
 *
 * request
 *   .get(uri)
 *   .proxy(uri)
 *   .end(fn);
 * ```
 *
 * Or, you can pass in a `superagent.Request` instance, and it's like calling the
 * `.proxy(uri)` function on it, but without extending the prototype:
 *
 * ``` js
 * var request = require('superagent');
 * var proxy = require('superagent-proxy');
 *
 * proxy(request.get(uri), uri).end(fn);
 * ```
 *
 * @param {Object} superagent The `superagent` exports object
 * @api public
 */

function setup (superagent, uri) {
  var Request = superagent.Request;
  if (Request) {
    // the superagent exports object - extent Request with "proxy"
    Request.prototype.proxy = proxy;
    return superagent;
  } else {
    // assume it's a `superagent.Request` instance
    return proxy.call(superagent, uri);
  }
}

/**
 * Sets the proxy server to use for this HTTP(s) request.
 *
 * @param {String} uri proxy url
 * @api public
 */

function proxy (uri) {
  debug('Request#proxy(%j)', uri);

  // determine if the `http` or `https` node-core module are going to be used.
  // This information is useful to the proxy agents being created
  var secure = 0 == this.url.indexOf('https:');
  debug('url is secure? %s', secure);

  // attempt to get a proxying `http.Agent` instance
  var agent = proxyAgent(uri, secure);

  // if we have an `http.Agent` instance then call the .agent() function
  if (agent) this.agent(agent);

  return this;
}
