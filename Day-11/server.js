const http = require("http");
const moment = require("moment");

const server = http.createServer((req, res) => {
    if (req.url === "/") {
        res.writeHead(200, {"Content-Type": "text/plain"});
        res.end("Welcome to My First Node.js Server");
    } else if (req.url === "/about") {
        res.writeHead(200, {"Content-Type": "text/plain"});
        res.end("About Page");
    } else if (req.url === "/contact") {
        res.writeHead(200, {"Content-Type": "text/plain"});
        res.end("Contact Page");
    } else if (req.url === "/time") {
        res.writeHead(200, {"Content-Type": "text/plain"});
        res.end("Current Date and Time: " + moment().format('YYYY-MM-DD HH:mm:ss'));
    } else if (req.url === "/api") {
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify({ message: "Hello from API", success: true }));
    } else {
        res.writeHead(404, {"Content-Type": "text/plain"});
        res.end("404 Not Found");
    }
});

server.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});
