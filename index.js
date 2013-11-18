
/**
 * Module dependencies.
 */

var url = require('url');
var LRU = require('lru-cache');
var HttpProxyAgent = require('http-proxy-agent');
var HttpsProxyAgent = require('https-proxy-agent');
var SocksProxyAgent = require('socks-proxy-agent');

/**
 * Module exports.
 */

module.exports = setup;

/**
 * Number of `http.Agent` instances to cache.
 * This value was arbitrarily chosen... a better value could
 * be conceived with some benchmarks.
 */

var cacheSize = 50;

/**
 * Cache for `http.Agent` instances.
 */

var defaultCache = new LRU(cacheSize);

/**
 * The built-in proxy types.
 */

var defaultProxies = {
  http: httpOrHttpsProxy,
  https: httpOrHttpsProxy,
  socks: socksProxy
};

/**
 * Adds a `.proxy(uri)` function to the "superagent" module's Request class.
 * No `proxyAgents` are added by default. You must add an `http.Agent` subclass
 * (like HTTP proxy, HTTPS proxy, and SOCKS) to handle the connection internally.
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
 * proxy function on it without extending the prototype:
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
    superagent.proxies = Request._proxies = Object.create(defaultProxies);
    Request._proxiesCache = LRU(cacheSize);
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
  var proxies = defaultProxies;
  var cache = defaultCache;
  var Request = this.constructor;
  if (Request && Request._proxies) proxies = Request._proxies;
  if (Request && Request._proxiesCache) cache = Request._proxiesCache;

  if (!uri) {
    return this;
  }

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
  // could have been passed in originally. This generated URI is used
  // as part of the "key" for the LRU cache
  var proxyUri = url.format({
    protocol: protocol + ':',
    slashes: true,
    hostname: proxyParsed.hostname || proxyParsed.host,
    port: proxyParsed.port
  });

  // determine if the `http` or `https` node-core module are going to be used.
  // This information is useful to the proxy agents being created
  var secure = 0 == this.url.indexOf('https:');

  // create the "key" for the LRU cache
  var key = proxyUri;
  if (secure) key += ' secure';

  // attempt to get a cached `http.Agent` instance first
  var agent = cache.get(key);
  if (!agent) {
    // get an `http.Agent` instance from protocol-specific agent function
    agent = proxyFn(this, proxyParsed, secure);
    if (agent) cache.set(key, agent);
  } else {
    //console.error('cache hit! %j', key);
  }

  // if we have an `http.Agent` instance, either from the LRU cache or directly
  // from the proxy agent creation function, then call the .agent() function
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

function httpOrHttpsProxy (req, proxy, secure) {
  if (secure) {
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

function socksProxy (req, proxy, secure) {
  return new SocksProxyAgent(proxy, secure);
}
