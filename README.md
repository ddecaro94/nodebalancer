# nodebalancer

### A simple load balancer and reverse proxy to be used in a mirrored/distributed microservices and RESTful architectures.

Balances and proxies HTTP requests addressed to a web service provider host towards a list of mirror servers; upon receiving HTTP or socket errors redirects the request to the next host in the stack, in order to provide high availability and uptime of services and REST APIs.
Can be run on the same machine on different configurations passing by argument a JSON file containing a list of servers to be proxied and the port to be run on.
