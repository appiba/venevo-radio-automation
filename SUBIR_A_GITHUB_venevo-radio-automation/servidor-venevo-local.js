const childProcess = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const root = __dirname;
const firstPort = 5173;
const lastPort = 5183;

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".mp3", "audio/mpeg"],
  [".wav", "audio/wav"],
  [".ogg", "audio/ogg"],
  [".m4a", "audio/mp4"],
  [".aac", "audio/aac"],
]);

function contentType(filePath) {
  return contentTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
}

function send(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, {
    "Referrer-Policy": "strict-origin-when-cross-origin",
    ...headers,
  });
  response.end(body);
}

function handleRequest(request, response) {
  let requestPath = "/";
  try {
    requestPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    send(response, 400, "Solicitud no valida");
    return;
  }

  const cleanPath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const target = path.resolve(root, cleanPath);

  if (!target.startsWith(root) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    send(response, 404, "No encontrado");
    return;
  }

  fs.readFile(target, (error, data) => {
    if (error) {
      send(response, 500, "No se pudo leer el archivo");
      return;
    }

    send(response, 200, data, {
      "Content-Type": contentType(target),
      "Content-Length": data.length,
    });
  });
}

function openBrowser(url) {
  const command = process.platform === "win32" ? `start "" "${url}"` : `open "${url}"`;
  childProcess.exec(command, () => {});
}

function listenOnPort(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handleRequest);

    server.once("error", (error) => {
      server.close();
      reject(error);
    });

    server.listen(port, "127.0.0.1", () => {
      resolve({ server, port });
    });
  });
}

(async () => {
  for (let port = firstPort; port <= lastPort; port += 1) {
    try {
      const { port: readyPort } = await listenOnPort(port);
      const url = `http://localhost:${readyPort}/`;
      console.log(`Venevo Radio Automation esta en ${url}`);
      console.log("No cierres esta ventana mientras estes usando la radio.");
      openBrowser(url);
      return;
    } catch (error) {
      if (port === lastPort) {
        console.error("No se pudo iniciar Venevo Radio Automation.");
        console.error(error.message || error);
        process.exit(1);
      }
    }
  }
})();
