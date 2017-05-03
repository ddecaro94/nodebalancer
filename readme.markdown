nodebalancer
============

**A simple node.js load balancer and reverse proxy to be used in a RESTful or mirrored/distributed microservices architecture.**

Balances and proxies HTTP requests addressed to a web service provider host towards a list of mirror servers; upon receiving HTTP or socket errors redirects the request to the next host in the stack, in order to provide high availability and uptime of services and REST APIs.
Can be run on the same machine on different configurations passing by argument a JSON file containing a list of servers to be proxied and the port to be run on.

# Install
With [npm](https://www.npmjs.com/) do:

```
npm install nodebalancer
```

# Usage
A new proxy instance can be run using the command:
```
node nodebalancer.js ./config.json 1234
```

A new listener will be opened on port 1234, using the server list read from the file config.json, on the local machine under the application path. If a port number is not provided, port 8000 is used as a default.
If the file is not a valid JSON or is not present under the path an error will be raised.

# Configuration file

A configuration file is a JSON file containing in a JSON array a list of JSON objects, each containing hosts and ports to be mirrored, in this form:
```
[{
		"host": "localhost",
		"port": 7800
	},
	{
		"host": "testserver1",
		"port": 4444
	},
	{
		"host": "abc.test.com",
		"port": 1234
	}
]
```

# Behavior

Assuming that each proxied host contains the same resources, invoking an HTTP verb on the machine running nodebalancer results in a round-robin load balancing of the requests. In case an error occurs, for example because the invoked resource does not exist on the host, or the socket connection cannot be established because of a downtime due to failure or mantainance, the request in redirected to the next host in the list.

It is supposed that the requests are completely stateless, hence sessionization should be provided server-side, having knowledge of the high availability tool used on top of the stack.

Running the module different times, using different configuration files and/or different ports is useful in order to have a reverse proxy for each resource that should be kept in high availability.

# Contribution

If you want to contribute or if you spot a bug (or just have questions) please feel free to open an issue on github or email me at danieledecaro113@gmail.com

# Changelog

v0.1.6 02/05/17 - first stable release including descriptions

v0.2.1 03/05/17 - added TTL to avoid endless loops
