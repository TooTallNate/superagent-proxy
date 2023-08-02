
/**
 * Module dependencies.
 */

var net = require('net');
var url = require('url');
var assert = require('assert');
var request = require('superagent');

// extend with .proxy()
require('../')(request);

describe('superagent-proxy', function () {

  this.slow(5000);
  this.timeout(10000);

  var httpLink = 'http://neverssl.com/';
  var httpsLink = 'https://google.com';

  describe('superagent.Request#proxy()', function () {
    it('should be a function', function () {
      assert.equal('function', typeof request.Request.prototype.proxy);
    });
    it('should accept a "string" proxy URI', function () {
      var req = request.get('http://foo.com');
      req.proxy('http://example.com');
    });
    it('should accept an options "object" with proxy info', function () {
      var req = request.get('http://foo.com');
      req.proxy({
        protocol: 'https',
        host: 'proxy.org',
        port: 8080
      });
    });
    it('should throw on an options "object" without "protocol"', function () {
      var req = request.get('http://foo.com');
      try {
        req.proxy({
          host: 'proxy.org',
          port: 8080
        });
        assert(false, 'should be unreachable');
      } catch (e) {
        assert.equal('TypeError', e.name);
        assert(/\bhttp\b/.test(e.message));
        assert(/\bhttps\b/.test(e.message));
        assert(/\bsocks\b/.test(e.message));
      }
    });
  });

  describe('http: - HTTP proxy', function () {
    var proxy = process.env.HTTP_PROXY || process.env.http_proxy;

    before(function () {
      if (proxy == undefined) {
        console.log('Skipped: http_proxy env var must be set to an operational proxy endpoint to enable these tests.')
        this.skip();
      }
    });

    it('should work against an HTTP endpoint', function (done) {
      request
      .get(httpLink)
      .proxy(proxy)
      .end(function (err, res) {
        if (err) throw err;
        assert.match(res.text, /NeverSSL/);
        assert.match(res.headers['via'], /squid/, 'Squid sets a via header in the response returned for HTTP requests.');
        done();
      });
    });

    it('should work against an HTTPS endpoint', function (done) {
      request
      .get(httpsLink)
      .proxy(proxy)
      .end(function (err, res) {
        if (err) throw err;
        assert.match(res.text, /doctype/);
        done();
      });
    });
  });

  describe('https: - HTTPS proxy', function () {
    var proxy = process.env.HTTPS_PROXY || process.env.https_proxy;

    before(function () {
      if (proxy == undefined) {
        console.log('Skipped: https_proxy env var must be set to an operational proxy endpoint to enable these tests.')
        this.skip();
      }
    });

    it('should work against an HTTP endpoint', function (done) {
      var p = url.parse(proxy);
      p.rejectUnauthorized = false;

      request
      .get(httpLink)
      .proxy(proxy)
      .end(function (err, res) {
        if (err) throw err;
        assert.match(res.text, /NeverSSL/);
        assert.match(res.headers['via'], /squid/, 'Squid sets a via header in the response returned for HTTP requests.');
        done();
      });
    });

    it('should work against an HTTPS endpoint', function (done) {
      var p = url.parse(proxy);
      p.rejectUnauthorized = false;

      request
      .get(httpsLink)
      .proxy(proxy)
      .end(function (err, res) {
        if (err) throw err;
        assert.match(res.text, /doctype/);
        done();
      });
    });
  });

  describe('socks: - SOCKS proxy', function () {
    var proxy = process.env.SOCKS_PROXY || process.env.socks_proxy;

    before(function () {
      if (proxy == undefined) {
        console.log('Skipped. socks_proxy env var must be set to an operational proxy endpoint to enable these tests.')
        this.skip();
      }
    });

    it('should work against an HTTP endpoint', function (done) {
      request
      .get(httpLink)
      .proxy(proxy)
      .end(function (err, res) {
        if (err) throw err;
        assert.match(res.text, /NeverSSL/);
        done();
      });
    });

    it('should work against an HTTPS endpoint', function (done) {
      request
      .get(httpsLink)
      .proxy(proxy)
      .end(function (err, res) {
        if (err) throw err;
        assert.match(res.text, /doctype/);
        done();
      });
    });
  });

});
