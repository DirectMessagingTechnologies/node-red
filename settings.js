/**
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var path = require("path");
var when = require("when");
var pgutil = require('./pgutil');

process.env.NODE_RED_HOME = __dirname;

var settings = module.exports = {
    uiPort: process.env.PORT || 1880,
    mqttReconnectTime: 15000,
    serialReconnectTime: 15000,
    debugMaxLength: 10000000,

    //SKW-703/BUG-NR-RW-deploy-timeout; 4th or 5th attempt:
    userDir: path.join(__dirname, 'data'),

    // SKW-703/BUG-nr-rw-502-flows-save-attempt
    // proposed initial fix
    apiMaxLength: '20mb',

    // SKW-703/BUG-nr-rw-502-flows-save-attempt
    // proposed followup fix
    // functionExternalModules: true, - removed this for SKW-703 as externalModules below handles this

    // Blacklist the non-bluemix friendly nodes
    nodesExcludes:[ '66-mongodb.js','75-exec.js','35-arduino.js','36-rpi-gpio.js','25-serial.js','28-tail.js','50-file.js','31-tcpin.js','32-udp.js','23-watch.js' ],

    // Enable module reinstalls on start-up; this ensures modules installed
    // post-deploy are restored after a restage
    // autoInstallModules: true, 
    // SKW-703 - changing true to false, this is also flagged as deprecated by NR/RW deploy logs
    // SKW-703 - commented this out, using the externalModules kvp

    // SKW-703 externalModules definition below

    // External module handling (modern replacement for autoInstallModules)
    externalModules: {
        autoInstall: false,           // Allow Node-RED to auto-install missing modules at runtime
        // modulesDir: '/data/node_modules', // Where to install external modules
        // allowList: [ // Removing this for now to explicitly not have to white-list npm modules
        //     'node-red-node-email',
        //     'jsforce',
        //     'keyword-extractor'
        //     // Add any other modules your function nodes require
        // ],
        palette: {
            allowInstall: true,      // Allow installing nodes via the editor's "Manage palette"
            allowUpdate: true,
            allowUpload: false       // If you want to prevent uploading zips of nodes via UI
        }
    },

    functionGlobalContext: {
        // If you want your function nodes to reference common libraries via global context
        // jsforce:require('jsforce') -- this was a chatgpt example, we'll keep this empty for now
        // add others as needed
    },

    // Optional: log verbosity for debugging module issues
    logging: {
        console: {
            level: 'info', // can be 'debug' if you want more module install info
        }
    },


    // Move the admin UI
    httpAdminRoot: '/red',

    // You can protect the user interface with a userid and password by using the following property
    // the password must be an md5 hash  eg.. 5f4dcc3b5aa765d61d8327deb882cf99 ('password')
    //httpAdminAuth: {user:"user",pass:"5f4dcc3b5aa765d61d8327deb882cf99"},

    // Serve up the welcome page
    httpStatic: path.join(__dirname,"public"),

    functionGlobalContext: { },

    storageModule: require("./pgstorage"),

    httpNodeCors: {
        origin: "*",
        methods: "GET,PUT,POST,DELETE"
    },
    
    // Disbled Credential Secret
    credentialSecret: false
}

if (process.env.NODE_RED_USERNAME && process.env.NODE_RED_PASSWORD) {
    settings.adminAuth = {
        type: "credentials",
        users: function(username) {
            if (process.env.NODE_RED_USERNAME == username) {
                return when.resolve({username:username,permissions:"*"});
            } else {
                return when.resolve(null);
            }
        },
        authenticate: function(username, password) {
            if (process.env.NODE_RED_USERNAME == username &&
                process.env.NODE_RED_PASSWORD == password) {
                return when.resolve({username:username,permissions:"*"});
            } else {
                return when.resolve(null);
            }
        }
    }
}

settings.pgAppname = 'nodered';
pgutil.initPG();
pgutil.createTable();
