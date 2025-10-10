const express = require("express");
const app = express();

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send(`Hello from FluxCD! Version: ${process.env.APP_VERSION || "1.0.0"} | Host: ${require("os").hostname()}`);
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
