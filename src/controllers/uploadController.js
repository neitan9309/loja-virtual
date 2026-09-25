// ======================================================
// src/controllers/uploadController.js
// Upload de imagens + remoção segura
// ======================================================
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// ======================================================
// CONFIGURAÇÃO DO MULTER
// ======================================================
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');

// Garante que a pasta existe
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Extensões e mimetypes permitidos (defesa em profundidade)
const ALLOWED_MIMETYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        // Sanitiza a extensão e gera nome único
        const rawExt = path.extname(file.originalname).toLowerCase();
        const ext = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : '.jpg';
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, uniqueName);
    },
});

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato inválido. Envie JPG, PNG, WEBP ou GIF.'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const uploadSingle = upload.single('image');

// ======================================================
// HELPERS
// ======================================================

/**
 * Verifica se um nome de arquivo é seguro (sem path traversal)
 */
function isSafeFilename(filename) {
    if (!filename || typeof filename !== 'string') return false;
    if (filename.includes('/') || filename.includes('\\')) return false;
    if (filename.includes('..')) return false;
    if (filename.startsWith('.')) return false;
    // Apenas caracteres alfanuméricos, hífen, underscore e ponto
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) return false;
    return true;
}

/**
 * Resolve o caminho de um arquivo garantindo que está DENTRO de UPLOADS_DIR
 */
function safeFilePath(filename) {
    const resolved = path.resolve(UPLOADS_DIR, filename);
    const uploadsResolved = path.resolve(UPLOADS_DIR);

    // Precisa começar com UPLOADS_DIR + separador (evita /uploads-fake)
    if (!resolved.startsWith(uploadsResolved + path.sep)) {
        return null;
    }
    return resolved;
}

// ======================================================
// CONTROLLER
// ======================================================
const uploadController = {
    // POST /api/upload
    uploadImage(req, res) {
        uploadSingle(req, res, (err) => {
            if (err) {
                return res.status(400).json({ error: err.message });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado' });
            }

            // URL pública: /uploads/<filename>
            const url = `/uploads/${req.file.filename}`;

            res.status(201).json({
                message: 'Upload realizado com sucesso',
                url,
                filename: req.file.filename,
                size: req.file.size,
                mimetype: req.file.mimetype,
            });
        });
    },

    // DELETE /api/upload/:filename
    deleteFile(req, res) {
        try {
            const { filename } = req.params;

            // ✅ Validação 1: nome seguro
            if (!isSafeFilename(filename)) {
                return res.status(400).json({ error: 'Nome de arquivo inválido' });
            }

            // ✅ Validação 2: caminho resolvido dentro de UPLOADS_DIR
            const filePath = safeFilePath(filename);
            if (!filePath) {
                return res.status(400).json({ error: 'Caminho inválido' });
            }

            // ✅ Validação 3: existe?
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'Arquivo não encontrado' });
            }

            // ✅ Validação 4: é um arquivo (não diretório)
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) {
                return res.status(400).json({ error: 'Caminho não é um arquivo' });
            }

            fs.unlinkSync(filePath);
            res.json({ message: 'Arquivo removido', filename });
        } catch (error) {
            console.error('Erro ao remover arquivo:', error);
            res.status(500).json({ error: 'Erro ao remover arquivo' });
        }
    },
};

module.exports = uploadController;