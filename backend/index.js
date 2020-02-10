const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const env = app.get("env");
const path = require("path");
const vote = require("./vote");
const routes = require("./routes");
console.log("env", env);

// Security best practices.
app.disable("x-powered-by");

// Start the voting server.
vote.init(env);

// The path from which the frontend assets are served from.
const frontend_path = path.join("..", "frontend", "www");
console.log("front end path", frontend_path); // debug

// Serve the app.
// if (env === "development") app.use(express.static("../frontend"));
/*else*/ app.use(express.static(frontend_path));

// Register routes.
routes(app);

// Fire up the server.
app.listen(port, () => console.log(`Lounas is being served at port ${port}!`));
