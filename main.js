const express = require('express');
const fs = require('fs');
const http = require('http');
const { program } = require('commander');
const multer = require('multer');
const path = require('path');

program
  .requiredOption('-h, --host <host>')
  .requiredOption('-p, --port <port>')
  .requiredOption('-c, --cache <path>');

program.parse(process.argv);
const { host, port, cache } = program.opts();

if (!fs.existsSync(cache)) fs.mkdirSync(cache, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, cache); 
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

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

app.all('/register', (req, res) => {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
});

app.get('/inventory', (req, res) => {
    const result = devices.map(d => ({
        ...d,
        photo_url: d.photo ? `/inventory/${d.id}/photo` : null
    }));
    res.json(result);
});

app.all('/inventory', (req, res) => {
    res.setHeader('Allow', 'GET');
    res.status(405).end('Method Not Allowed');
});

app.route('/inventory/:id')
    .get((req, res) => {
        const id = Number(req.params.id);
        const device = devices.find(d => d.id === id);
        if (!device) {
            return res.status(404).end('Немає речі з таким ID');
        }
        res.json({
            ...device,
            photo_url: device.photo ? `/inventory/${device.id}/photo` : null
        });
    })
    .put((req, res) => {
        const id = Number(req.params.id);
        const { inventory_name, description } = req.body;
        const device = devices.find(d => d.id === id);
        if (!device) {
            return res.status(404).end('Немає речі з таким ID');
        }
        if (inventory_name) device.inventory_name = inventory_name;
        if (description) device.description = description;
        res.json(device);
    })
    .delete((req, res) => {
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
        res.json({ deleted: device });
    })
    .all((req, res) => {
        res.setHeader('Allow', 'GET, PUT, DELETE');
        res.status(405).end('Method Not Allowed');
    });

app.route('/inventory/:id/photo')
    .get((req, res) => {
        const id = Number(req.params.id);
        const device = devices.find(d => d.id === id);
        if (!device) {
            return res.status(404).end('Річ не знайдена');
        }
        if (!device.photo || !fs.existsSync(device.photo)) {
            return res.status(404).end('Фото не знайдено');
        }
        res.setHeader('Content-Type', 'image/jpeg'); 
        res.sendFile(path.resolve(device.photo));
    })
    .put(upload.single('photo'), (req, res) => {
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
    })
    .all((req, res) => {
        res.setHeader('Allow', 'GET, PUT');
        res.status(405).end('Method Not Allowed');
    });

app.post('/search', (req, res) => {
    const { id, has_photo } = req.body;
    const numericId = Number(id);
    if (isNaN(numericId)) {
        return res.status(400).end('Некоректний ID');
    }

    const device = devices.find(d => d.id === numericId);
    if (!device) {
        return res.status(404).end('Річ не знайдена');
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

const server = http.createServer(app);
server.listen(port, host, () => {console.log(`Сервер запущено: http://${host}:${port}`);});
