
/**
 * Module dependencies.
 */

var url = require('url');
var HttpProxyAgent = require('http-proxy-agent');
var HttpsProxyAgent = require('https-proxy-agent');
var SocksProxyAgent = require('socks-proxy-agent');

/**
 * Module exports.
 */

module.exports = setup;

/**
 * Adds a `.proxy(uri)` function to the "superagent" module's Request class.
 * No `proxyAgents` are added by default. You must add an `http.Agent` subclass
 * (like HTTP proxy, HTTPS proxy, and SOCKS) to handle the connection internally.
 *
 * @param {Object} superagent The `superagent` exports object
 * @api public
 */

function setup (superagent) {
  var Request = superagent.Request;
  superagent.proxies = Request._proxies = {
    'http': httpOrHttpsProxy,
    'https': httpOrHttpsProxy,
    'socks': socksProxy
  };
  Request.prototype.proxy = proxy;
}

/**
 * Sets the proxy server to use for this HTTP(s) request.
 *
 * @param {String} uri proxy url
 * @api public
 */

function proxy (uri) {
  var proxies = this.constructor._proxies;

  // parse the URI into an opts object if it's a String
  var proxyParsed = uri;
  if ('string' == typeof uri) {
    proxyParsed = url.parse(uri);
  }

  // get the requested "protocol"
  var protocol = proxyParsed.protocol;
  if (!protocol) {
    var types = Object.keys(proxies);
    throw new TypeError('you must specify a string "protocol" for the proxy type (' + types.join(', ') + ')');
  }

  // strip the trailing ":" if present
  if (':' == protocol[protocol.length - 1]) {
    protocol = protocol.substring(0, protocol.length - 1);
  }

  // get the proxy Agent creation function
  var proxyFn = proxies[protocol];
  if ('function' != typeof proxyFn) {
    throw new TypeError('unsupported proxy protocol: "' + protocol + '"');
  }

  // format the proxy info back into a URI, since an opts object
  // could have been passed in originally. This generated URI will
  // be used for caching soon
  var proxyUri = url.format({
    protocol: protocol,
    slashes: true,
    hostname: proxyParsed.hostname || proxyParsed.host,
    port: proxyParsed.port
  });

  // get an `http.Agent` instance from protocol-specific agent function
  // TODO: implement caching based on the proxyUri
  var agent = proxyFn(this, proxyParsed, proxyUri);
  if (agent) {
    this._proxy = proxyParsed;
    this._proxyUri = proxyUri;
    this.agent(agent);
  }

  return this;
}


/**
 * Default "http" and "https" proxy URI handlers.
 *
 * @api protected
 */

function httpOrHttpsProxy (req, proxy) {
  var url = req.url;
  if (0 == url.indexOf('https:')) {
    // HTTPS
    return new HttpsProxyAgent(proxy);
  } else {
    // HTTP
    return new HttpProxyAgent(proxy);
  }
}

/**
 * Default "socks" proxy URI handler.
 *
 * @api protected
 */

function socksProxy (req, proxy) {
  var url = req.url;
  var secure = 0 == url.indexOf('https:');
  return new SocksProxyAgent(proxy, secure);
}
