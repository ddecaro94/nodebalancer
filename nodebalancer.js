var http = require('http');
var args = process.argv.slice(2); //accept as argument the file name and the port number to listen on

if (args[0] == undefined || args[0] == null) {
    console.log(new Date() + ' Usage: nodebalancer.js [/path/to/configuration/file] [*portnumber]');
    return;
}

var configFile = args[0]; //parse the argument
var serverPort = 8000; //default port number

try {
    var addresses = require(configFile); //load and parse configuration file
} catch (err) {
    console.log(new Date() + ' Cannot load configuration file ' + configFile);
    return;
}

if (args[1] !== undefined) {
    serverPort = args[1]; //parse port
}


var balancer = http.createServer(function (req, res) {
    if (req.url === '/favicon.ico') {
        //console.log('Favicon requested');
    } else {
        sendRequest(req, res, addresses.length - 1); //send request to next endpoint using addresses list length as ttl
    }
});

balancer.listen(serverPort)
    .on('error', (e) => {
        if (e.code == 'EADDRINUSE') { //wrong port - already used
            console.log(new Date() + ' Port ' + serverPort + ' in use, retry with another one');
        }
        balancer.close();
        return;
    }).on('listening', function () {
        console.log(new Date() + ' nodebalancer listening on port ' + serverPort + ' using configuration file ' + configFile);
    });

function nextTarget() {
    //function returning the next address to be called
    //change this function to implement algorithms different than round robin
    var target = { target: addresses.shift() }; //first address is fetched
    addresses.push(target.target); //and inserted at the bottom of the array
    return target;
}

function getOptions(req) {
    //function that returns http request options
    var target = nextTarget();
    var options = {
        host: target.target.host,
        path: req.url,
        port: target.target.port
    };
    return options;
}

function sendRequest(serverRequest, serverResponse, ttl) {
    //perform a request to the next endpoint
    var request = http.request(getOptions(serverRequest), function (response) {
        //collect response data
        var data = [];
        response.on('data', function (chunk) {
            data.push(chunk);
        });
        //on response end check the code: if client error perform request again
        response.on('end', function (res) {
            console.log(new Date() + ' Request sent to ' + request._headers.host+request.path);
            if (response.statusCode >= 400 && response.statusCode < 500 && ttl > 0) {
                console.log(new Date() + ' Error: code ' + response.statusCode + ' ' + response.statusMessage);
                sendRequest(serverRequest, serverResponse, ttl - 1);
                return;
            } else {
                //else send back the response
                var headers = response.headers;
                serverResponse.writeHead(response.statusCode, response.statusMessage, headers);
                //this way data is always written in binary
                var binary = Buffer.concat(data);
                serverResponse.write(binary);
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
        console.log(new Date() + ' Request sent to ' + request._headers.host+request.path);
        console.log(new Date() + ' Error: ' + e.message);
        if (ttl > 0) {
            //handling errors not from http protocol
            sendRequest(serverRequest, serverResponse, ttl - 1);
            return;
        }
    });
    request.end();
}
