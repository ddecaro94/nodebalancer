const fs = require('fs');
const http = require('http');
const https = require('https');
const args = process.argv.slice(2); //accept as argument the file name and the port number to listen on

if (args[0] == undefined || args[0] == null) {
    console.log(new Date() + ' Usage: nodebalancer.js [/path/to/configuration/file] [*portnumber] [*-s /path/to/key /path/to/crt]');
    process.exit(1);
}
var config = {
    file: args[0], //parse the argument
    serverPort: 8000, //default port number
    secure: false,
    options: undefined
}

try {
    var addresses = require(config.file); //load and parse configuration file
} catch (err) {
    console.log(new Date() + ' Cannot load configuration file ' + config.file);
    process.exit(1);
}

if (args[1] !== undefined) {
    config.serverPort = args[1]; //parse port
}

for(var i = 2; i < args.length; i++) {
    switch (args[i]) {
        case '-s':
            config.secure = true;
            config.options = {
                key: "key.pem",
                cert: "cert.pem"
            }
            break;
        case '-k':
            config.options.key = args[(i++)+1];
            break;
        case '-c':
            config.options.cert = args[(i++)+1];
            break;
        default:
            break;
    }
}

if (config.secure) {
    config.options.key = fs.readFileSync(config.options.key);
    config.options.cert = fs.readFileSync(config.options.cert);
}

var balancer = (config.secure) ? https.createServer(config.options, reqListener) : http.createServer(reqListener);

function reqListener(req, res) {
    var data = [];
    var size = 0;
    req.on('data', function (chunk) {
        data.push(chunk);
        size += chunk.length;
        if(size > 1e9) {
            //pow(10, 9) ~ 1000 MB request, definitely too big
            req.pause();
            res.writeHead(413, {'Content-Type': 'text/plain'});
            res.end();
        }
    }).on('end', function () {
        //
        var body = new Buffer.concat(data);
        sendRequest(req, res, body, addresses.length - 1);
    }).on('error', function (e) {
        req.connection.destroy();
    }); //send request to next endpoint using addresses list length as ttl)
}

balancer.listen(config.serverPort)
    .on('error', (e) => {
        if (e.code == 'EADDRINUSE') { //wrong port - already used
            console.log(new Date() + ' Port ' + config.serverPort + ' in use, retry with another one');
        } else {
            console.log(new Date() + ' Error: ' + e.message);
        }
        balancer.close();
        process.exit(2);
    }).on('listening', function () {
        console.log(new Date() + ' nodebalancer listening using', (config.secure)? 'https':'http', 'on port ' + config.serverPort + ' using configuration file ' + config.file);
    });

function nextTarget() {
    //function returning the next address to be called
    //change this function to implement algorithms different than round robin
    var target = addresses.shift(); //first address is fetched
    addresses.push(target); //and inserted at the bottom of the array
    return target;
}

function getProperties(req) {
    //function that returns http request options
    var target = nextTarget();
    var options = {
        headers: req.headers,
        hostname: target.host,
        path: req.url,
        port: target.port,
        method: req.method
    };
    delete (options.headers.host);
    return {target, options};
}

function sendRequest(serverRequest, serverResponse, body, ttl) {
    //perform a request to the next endpoint
    var properties = getProperties(serverRequest);
    var protocol = (properties.target.protocol == 'https') ? https : http;
    var request = protocol.request(properties.options, function (response) {
        //collect response data
        var data = [];
        response.on('data', function (chunk) {
            data.push(chunk);
        });
        //on response end check the code: if client error perform request again
        response.on('end', function (res) {
            console.log(new Date() + ' Request sent to ' + request._headers.host + request.path);
            if (response.statusCode >= 400 && response.statusCode < 500 && ttl > 0) {
                console.log(new Date() + ' Error: code ' + response.statusCode + ' ' + response.statusMessage);
                sendRequest(serverRequest, serverResponse, body, ttl - 1);
                return;
            } else {
                //else send back the response
                var headers = response.headers;
                serverResponse.writeHead(response.statusCode, response.statusMessage, headers);
                //this way data is always written in binary
                serverResponse.write(Buffer.concat(data));
                serverResponse.end();
            }
        });
    });

    request.on('error', function (e) {
        // General error, i.e.
        //  - ECONNRESET - server closed the socket unexpectedly
        //  - ECONNREFUSED - server did not listen
        //  - HPE_INVALID_VERSION
        //  - HPE_INVALID_STATUS
        //  - ... (other HPE_* codes) - server returned garbage
        console.log(new Date() + ' Request sent to ' + request._headers.host + request.path);
        console.log(new Date() + ' Error: ' + e.message);
        if (ttl > 0) {
            //handling errors not from http protocol
            sendRequest(serverRequest, serverResponse, body, ttl - 1);
            return;
        } else {
            serverRequest.emit('error', e);
        }
    });
    request.write(body);
    request.end();
}