var http = require('http');
var fs = require('fs');
var args = process.argv.slice(2);
var addresses = require(args[0]);
var configFile = null;
var serverPort = 8000;

if(args[0]!==undefined){
    configFile=args[0];
}

if(args[1]!==undefined){
    serverPort=args[1];
}

var balancer = http.createServer(function (req, res) {
    if (req.url === '/favicon.ico') {
        //console.log('Favicon requested');
    } else {
        sendRequest(req, res, addresses.length-1);
    }
    
});

balancer.listen(serverPort)
.on('error', (e) => {
  if (e.code == 'EADDRINUSE') {
    console.log(new Date(),'Port',serverPort,'in use, retry with another one');
  }
    balancer.close();
    return;
}).on('listening', function(){
    console.log(new Date(),'nodebalancer listening on port',serverPort,'using configuration file',configFile);
});

function nextTarget() {
    var target = { target: addresses.shift() };
    addresses.push(target.target);
    return target;
}

function getOptions(req) {
    var target = nextTarget();
    var options = {
        host: target.target.host,
        path: req.url,
        port: target.target.port
    };
    return options;
}

function sendRequest(serverRequest, serverResponse, ttl) {
    
    var request = http.request(getOptions(serverRequest), function (response) {
        var str = ''
        response.on('data', function (chunk) {
            str += chunk;
        });

        response.on('end', function (res) {
            console.log( new Date(),"Request sent to", request._headers.host);
            if (response.statusCode >= 400 && response.statusCode < 500 && ttl>0) {
                console.log(new Date(), 'Error: code', response.statusCode, response.statusMessage);
                sendRequest(serverRequest, serverResponse, ttl-1);
            } else {
                var headers = response.headers;
                serverResponse.writeHead(response.statusCode, response.statusMessage, headers);
                serverResponse.write(str);
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
        console.log( new Date(),"Request sent to", request._headers.host);
        console.log(new Date(), 'Error:', e.message);
        if (ttl>0){
            sendRequest(serverRequest, serverResponse,ttl-1);
        }
    });
    request.end();
}
