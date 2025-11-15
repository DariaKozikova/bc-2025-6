const express = require('express');
const fs = require('fs');
const http = require('http');
const { program } = require('commander');
const multer = require('multer');
const path = require('path');

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
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

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
  res.status(201).json(device);
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
  res.json(device);
});

app.get('/inventory/:id/photo', (req, res) => {
    const id = Number(req.params.id);
    const device = devices.find(d => d.id === id);
    if (!device) {
        return res.status(404).end('Річ не знайдена');
    }
    if (!device.photo || !fs.existsSync(device.photo)) {
        return res.status(404).end('Фото не знайдено');
    }
    res.sendFile(path.resolve(device.photo));
});

app.put('/inventory/:id/photo', upload.single('photo'), (req, res) => {
    const id = Number(req.params.id);
    const device = devices.find(d => d.id === id);
    if (!device) {
        return res.status(404).end('Річ не знайдена');
    }
    if (!req.file) {
        return res.status(400).end('Фото не надіслано');
    }
    if (device.photo && fs.existsSync(device.photo)) {
        fs.unlinkSync(device.photo);
       }
    device.photo = req.file.path;
    res.json(device);
});

app.delete('/inventory/:id', (req, res) => {
    const id = Number(req.params.id);
    const index = devices.findIndex(device => device.id === id);

    if (index === -1) {
        return res.status(404).end('Річ не знайдена');
    }

    const device = devices[index];
    if (device.photo && fs.existsSync(device.photo)) {
        fs.unlinkSync(device.photo);
    }

    devices.splice(index, 1);

    res.json({
        deleted: device
    });
});

app.post('/search', (req, res) => {
    const { id, has_photo } = req.body;
    const numericId = Number(id);
    if (isNaN(numericId)) {
        return res.status(400).end('Некоректний ID');
    }

    const device = devices.find(d => d.id === numericId);
    if (!device) {return res.status(404).end('Річ не знайдена');
    }

    const result = {
        id: device.id,
        inventory_name: device.inventory_name,
        description: device.description
    };

    if (has_photo && device.photo) {
        result.photo_url = `/inventory/${device.id}/photo`;
    }

    res.json(result);
});

app.all('/inventory/:id', (req, res) => {
    res.status(405).end('Method Not Allowed');
});

const server = http.createServer(app);
server.listen(port, host, () => {console.log(`Сервер запущено: http://${host}:${port}`);});
 
