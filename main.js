const { program } = require('commander');
const http = require('http');
const fs = require('fs');

program
  .option('-h, --host <host>')
  .option('-p, --port <port>')
  .option('-c, --cache <cache>');

program.parse();
const options = program.opts();

if (!options.host || !options.port || !options.cache) {
  console.log('Потрібно вказати потрібні параметри -h, -p, -c');
  process.exit(1);
}

if (!fs.existsSync(options.cache)) {
  fs.mkdirSync(options.cache, { recursive: true });
}

const server = http.createServer((req, res) => {
  res.end('Сервер запущено');
});

server.listen(options.port, options.host, () => {
  console.log(`Сервер запущено на адресі: http://${options.host}:${options.port}`);
});
