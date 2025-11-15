const express = require('express');
const fs = require('fs');
const http = require('http');
const { program } = require('commander');
const multer = require('multer');

program
  .requiredOption('-h, --host <host>', 'адреса сервера')
  .requiredOption('-p, --port <port>', 'порт сервера')
  .requiredOption('-c, --cache <path>', 'шлях до кеш директорії');

program.parse(process.argv);
const { host, port, cache } = program.opts();

if (!fs.existsSync(cache)) fs.mkdirSync(cache, { recursive: true });

const upload = multer({ dest: cache });
const app = express();
app.use(express.json()); 

let devices = [];
let Id = 1;

app.post('/register', upload.single('photo'), (req, res) => {
  const { inventory_name, description } = req.body;
  const photo = req.file;

  if (!inventory_name || inventory_name.trim() === '') {
    return res.status(400).end('Поле "inventory_name" є обов’язковим');
  }

  const device = {
    id: Id++,
    inventory_name,
    description: description || '',
    photo: photo ? photo.path : null
  };

  devices.push(device);

  res.status(201).json({
    message: 'Пристрій успішно зареєстровано',
    device
  });
});

app.get('/inventory', (req, res) => {
  res.json(devices);
});

app.get('/inventory/:id', (req, res) => {
  const id = Number(req.params.id);
  const device = devices.find(d => d.id === id);

  if (!device) {
    return res.status(404).end('Немає речі з таким ID');
  }
  res.json(device);
});

app.put('/inventory/:id', (req, res) => {
  const id = Number(req.params.id);
  const { inventory_name, description } = req.body;

  const device = devices.find(function (device) {return device.id === id;});

  if (!device) {
    return res.status(404).end('Немає речі з таким ID');
  }

  if (inventory_name) device.inventory_name = inventory_name;
  if (description) device.description = description;

  res.json({
    message: "Річ оновлено",
    device
  });
});

const server = http.createServer(app);
server.listen(port, host, () => {console.log(`Сервер запущено: http://${host}:${port}`);});
 
