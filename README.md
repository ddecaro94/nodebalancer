# nodebalancer

### A simple node.js load balancer and reverse proxy to be used in a RESTful or mirrored/distributed microservices architecture.

Balances and proxies HTTP requests addressed to a web service provider host towards a list of mirror servers; upon receiving HTTP or socket errors redirects the request to the next host in the stack, in order to provide high availability and uptime of services and REST APIs.
Can be run on the same machine on different configurations passing by argument a JSON file containing a list of servers to be proxied and the port to be run on.
## Usage
A new proxy instance can be run using the command:
##### node nodebalancer.js ./config.json 1234
A new listener will be opened on port 1234, using the server list read from the file config.json, on the local machine under the application path. If a port number is not provided, port 8000 is used as a default.
If the file is not a valid JSON or is not present under the path an error will be raised.
