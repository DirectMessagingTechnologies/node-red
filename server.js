/**
 * Custom Node-RED server entry point.
 *
 * Replaces the default red.js to configure HTTP server timeouts.
 * Node.js 18 introduced a default server.requestTimeout of 300s (5 min)
 * which kills deploy requests if the full POST body isn't received in time.
 * Railway's reverse proxy already manages connection timeouts, so we
 * disable the Node.js-level requestTimeout here.
 *
 * See: SKW-703
 */

var http = require('http');
var express = require('express');
var RED = require('node-red');
var settings = require('./settings');

// Create Express app and HTTP server
var app = express();
var server = http.createServer(app);

// SKW-703: Disable Node.js 18 requestTimeout (default 300s / 5 min).
// Railway's proxy handles connection timeouts externally.
// Without this, large deploy POST bodies trigger "request aborted" errors.
server.requestTimeout = 0;
server.headersTimeout = 0;
server.keepAliveTimeout = 65000; // slightly above typical proxy keep-alive (60s)

// Diagnostic: log deploy requests to trace body reception
app.use(function (req, res, next) {
    if (req.method === 'POST' && req.url.indexOf('/flows') !== -1) {
        var contentLength = req.headers['content-length'] || 'unknown';
        console.log('[deploy-diag] POST ' + req.url + ' Content-Length: ' + contentLength);
        var start = Date.now();
        res.on('finish', function () {
            console.log('[deploy-diag] Response sent: ' + res.statusCode + ' (' + (Date.now() - start) + 'ms)');
        });
        res.on('close', function () {
            if (!res.writableFinished) {
                console.log('[deploy-diag] Connection closed before response (' + (Date.now() - start) + 'ms)');
            }
        });
    }
    next();
});

// Initialise Node-RED
RED.init(server, settings);

// Serve the editor UI and admin API
app.use(settings.httpAdminRoot || '/', RED.httpAdmin);

// Serve HTTP-in node endpoints
app.use(settings.httpNodeRoot || '/', RED.httpNode);

// Serve static content
if (settings.httpStatic) {
    app.use('/', express.static(settings.httpStatic));
}

var port = settings.uiPort || 1880;
server.listen(port, '0.0.0.0', function () {
    console.log('Node-RED server listening on port ' + port);
    RED.start().then(function () {
        console.log('Node-RED started');
    }).catch(function (err) {
        console.error('Node-RED failed to start:', err);
    });
});
