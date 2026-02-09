const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const {
  createUser,
  getUserByEmail,
  getUserById,
  SqliteStore,
  listUsers,
  updateUserRolePlan,
  listDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  listIdeas,
  getIdeaById,
  createIdea,
  updateIdea,
  listCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  listTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  listDocs,
  getDocById,
  getDocBySlug,
  createDoc,
  updateDoc,
  deleteDoc,
  listBlogPosts,
  getBlogPostById,
  getBlogPostBySlug,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
} = require('./db');

let markedParse = null;
function getMarked() {
  if (markedParse) return Promise.resolve(markedParse);
  return import('marked').then((m) => {
    markedParse = m.marked.parse;
    return markedParse;
  });
}

const app = express();
const PORT = process.env.PORT || 3000;
const DEFAULT_SECRET = 'change-me-in-production';
const SESSION_SECRET = process.env.SESSION_SECRET || DEFAULT_SECRET;

if (process.env.NODE_ENV === 'production') {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === DEFAULT_SECRET) {
    console.error('Fatal: SESSION_SECRET must be set to a strong random value in production.');
    console.error('Generate one with: openssl rand -hex 32');
    console.error('Then set it in your host (e.g. Railway: Variables tab, or VPS .env/systemd).');
    process.exit(1);
  }
}

const UPLOADS_DIR = process.env.UPLOADS_PATH
  ? path.resolve(process.env.UPLOADS_PATH)
  : path.join(__dirname, 'uploads', 'documents');
try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch (e) {}

const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/gif',
];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const base = (file.originalname || 'file').replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 80) || 'file';
    const name = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${base}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error('File type not allowed. Use PDF, Word, Excel, text, CSV, or images.'));
  },
});

function requireLogin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  const user = getUserById(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'Not logged in' });
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new SqliteStore(),
    name: 'arguspage.sid',
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    },
  })
);

// Serve static files (HTML, CSS, JS, etc.)
app.use(express.static(__dirname, { index: false }));

// SPA-style: serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Rate limit auth endpoints (brute force / abuse)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth API

// POST /api/register — create account and log in
app.post('/api/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedName = String(name).trim();
    if (trimmedName.length < 1) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = getUserByEmail(trimmedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = createUser(trimmedEmail, passwordHash, trimmedName);
    const user = getUserById(userId);
    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) return res.status(500).json({ error: 'Session error.' });
      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'user',
          plan: user.plan || 'free',
        },
      });
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// POST /api/login
app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = getUserByEmail(String(email).trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) return res.status(500).json({ error: 'Session error.' });
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'user',
          plan: user.plan || 'free',
        },
      });
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed.' });
    res.clearCookie('arguspage.sid');
    res.status(204).end();
  });
});

// GET /api/me — current user (for nav on every page)
app.get('/api/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  const user = getUserById(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'Not logged in' });
  }
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      plan: user.plan || 'free',
    },
  });
});

// ——— Documents (require login; admin for write) ———
app.get('/api/documents', requireLogin, (req, res) => {
  try {
    const list = listDocuments();
    res.json({ documents: list });
  } catch (err) {
    console.error('List documents:', err);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

// Safe download path: must stay under UPLOADS_DIR
const UPLOADS_ROOT = path.resolve(UPLOADS_DIR);
function isPathUnder(base, candidate) {
  const n = path.normalize(path.resolve(candidate));
  const b = path.normalize(path.resolve(base));
  return n === b || n.startsWith(b + path.sep);
}
// Safe filename for Content-Disposition: no control chars, no CRLF
function safeDispositionFilename(name) {
  const s = (name || 'download').replace(/[\x00-\x1f\x7f\r\n]/g, '').replace(/"/g, "'").trim() || 'download';
  return s.slice(0, 200);
}

app.get('/api/documents/:id/download', requireLogin, (req, res) => {
  try {
    const doc = getDocumentById(Number(req.params.id));
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const rawPath = path.join(UPLOADS_DIR, doc.file_name);
    const resolvedPath = path.resolve(rawPath);
    if (!isPathUnder(UPLOADS_ROOT, resolvedPath)) return res.status(403).json({ error: 'Invalid document path' });
    if (!fs.existsSync(resolvedPath)) return res.status(404).json({ error: 'File not found' });
    const filename = safeDispositionFilename(doc.original_name || doc.file_name);
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/\\/g, '\\\\')}"`);
    if (doc.mime_type) res.setHeader('Content-Type', doc.mime_type);
    res.sendFile(resolvedPath);
  } catch (err) {
    console.error('Download document:', err);
    res.status(500).json({ error: 'Download failed' });
  }
});

app.post('/api/documents', requireLogin, requireAdmin, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large (max 20 MB)' });
      }
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      const title = (req.body.title && String(req.body.title).trim()) || req.file.originalname || 'Untitled';
      const description = (req.body.description && String(req.body.description).trim()) || null;
      const id = createDocument(title, description, req.file.filename, req.file.originalname || req.file.filename, req.file.mimetype);
      const doc = getDocumentById(id);
      res.status(201).json({ document: doc });
    } catch (e) {
      fs.unlink(path.join(UPLOADS_DIR, req.file.filename), () => {});
      res.status(500).json({ error: 'Failed to save document' });
    }
  });
});

app.patch('/api/documents/:id', requireLogin, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const doc = getDocumentById(id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const { title, description } = req.body || {};
  const ok = updateDocument(id, {
    title: title !== undefined ? String(title).trim() : undefined,
    description: description !== undefined ? (description === '' ? null : String(description).trim()) : undefined,
  });
  if (!ok) return res.status(500).json({ error: 'Update failed' });
  res.json({ document: getDocumentById(id) });
});

app.delete('/api/documents/:id', requireLogin, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const doc = getDocumentById(id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const rawPath = path.join(UPLOADS_DIR, doc.file_name);
  const resolvedPath = path.resolve(rawPath);
  if (isPathUnder(UPLOADS_ROOT, resolvedPath)) {
    try {
      if (fs.existsSync(resolvedPath)) fs.unlinkSync(resolvedPath);
    } catch (e) {}
  }
  deleteDocument(id);
  res.status(204).end();
});

// ——— Admin: users ———
app.get('/api/admin/users', requireLogin, requireAdmin, (req, res) => {
  try {
    const users = listUsers();
    res.json({ users });
  } catch (err) {
    console.error('List users:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

const ALLOWED_ROLES = ['user', 'admin'];
const ALLOWED_PLANS = ['free', 'pro'];
app.patch('/api/admin/users/:id', requireLogin, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const user = getUserById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { role, plan } = req.body || {};
  if (role !== undefined && !ALLOWED_ROLES.includes(String(role))) {
    return res.status(400).json({ error: 'Invalid role. Use user or admin.' });
  }
  if (plan !== undefined && !ALLOWED_PLANS.includes(String(plan))) {
    return res.status(400).json({ error: 'Invalid plan. Use free or pro.' });
  }
  const ok = updateUserRolePlan(id, role, plan);
  if (!ok) return res.status(500).json({ error: 'Update failed' });
  res.json({ user: getUserById(id) });
});

// ——— Ideas ———
app.post('/api/ideas', requireLogin, (req, res) => {
  try {
    const { title, description } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: 'Title is required' });
    const id = createIdea(req.session.userId, String(title).trim(), description ? String(description).trim() : null);
    const idea = getIdeaById(id);
    res.status(201).json({ idea });
  } catch (err) {
    console.error('Create idea:', err);
    res.status(500).json({ error: 'Failed to submit idea' });
  }
});

app.get('/api/ideas', requireLogin, (req, res) => {
  try {
    const user = getUserById(req.session.userId);
    const adminView = user && user.role === 'admin';
    const status = req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : null;
    const ideas = listIdeas({
      userId: req.session.userId,
      adminView,
      status,
    });
    res.json({ ideas });
  } catch (err) {
    console.error('List ideas:', err);
    res.status(500).json({ error: 'Failed to list ideas' });
  }
});

const ALLOWED_IDEA_STATUSES = ['pending', 'approved', 'rejected'];
app.patch('/api/ideas/:id', requireLogin, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const idea = getIdeaById(id);
  if (!idea) return res.status(404).json({ error: 'Idea not found' });
  const { status, admin_notes } = req.body || {};
  if (status !== undefined && !ALLOWED_IDEA_STATUSES.includes(String(status))) {
    return res.status(400).json({ error: 'Invalid status. Use pending, approved, or rejected.' });
  }
  const ok = updateIdea(id, {
    status: status !== undefined ? status : undefined,
    admin_notes: admin_notes !== undefined ? (admin_notes === '' ? null : String(admin_notes)) : undefined,
  });
  if (!ok) return res.status(500).json({ error: 'Update failed' });
  res.json({ idea: getIdeaById(id) });
});

// ——— Public: companies & testimonials (homepage) ———
app.get('/api/companies', (req, res) => {
  try {
    const companies = listCompanies();
    res.json({ companies });
  } catch (err) {
    console.error('List companies:', err);
    res.status(500).json({ error: 'Failed to load companies' });
  }
});

app.get('/api/testimonials', (req, res) => {
  try {
    const testimonials = listTestimonials();
    res.json({ testimonials });
  } catch (err) {
    console.error('List testimonials:', err);
    res.status(500).json({ error: 'Failed to load testimonials' });
  }
});

// ——— Admin: companies ———
app.get('/api/admin/companies', requireLogin, requireAdmin, (req, res) => {
  try {
    const companies = listCompanies();
    res.json({ companies });
  } catch (err) {
    console.error('List companies:', err);
    res.status(500).json({ error: 'Failed to list companies' });
  }
});

app.post('/api/admin/companies', requireLogin, requireAdmin, (req, res) => {
  try {
    const { name, logo_url, sort_order } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
    const id = createCompany(String(name).trim(), logo_url ? String(logo_url).trim() || null : null, Number(sort_order) || 0);
    res.status(201).json({ company: getCompanyById(id) });
  } catch (err) {
    console.error('Create company:', err);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

app.put('/api/admin/companies/:id', requireLogin, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!getCompanyById(id)) return res.status(404).json({ error: 'Company not found' });
  const { name, logo_url, sort_order } = req.body || {};
  const fields = {};
  if (name !== undefined) fields.name = String(name).trim();
  if (logo_url !== undefined) fields.logo_url = logo_url ? String(logo_url).trim() || null : null;
  if (sort_order !== undefined) fields.sort_order = Number(sort_order) || 0;
  const ok = updateCompany(id, fields);
  if (!ok) return res.status(500).json({ error: 'Update failed' });
  res.json({ company: getCompanyById(id) });
});

app.delete('/api/admin/companies/:id', requireLogin, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!getCompanyById(id)) return res.status(404).json({ error: 'Company not found' });
  deleteCompany(id);
  res.status(204).end();
});

// ——— Admin: testimonials ———
app.get('/api/admin/testimonials', requireLogin, requireAdmin, (req, res) => {
  try {
    const testimonials = listTestimonials();
    res.json({ testimonials });
  } catch (err) {
    console.error('List testimonials:', err);
    res.status(500).json({ error: 'Failed to list testimonials' });
  }
});

app.post('/api/admin/testimonials', requireLogin, requireAdmin, (req, res) => {
  try {
    const { quote, author_name, author_title, avatar_url, sort_order } = req.body || {};
    if (!quote || !String(quote).trim()) return res.status(400).json({ error: 'Quote is required' });
    if (!author_name || !String(author_name).trim()) return res.status(400).json({ error: 'Author name is required' });
    const id = createTestimonial(
      String(quote).trim(),
      String(author_name).trim(),
      author_title ? String(author_title).trim() : '',
      avatar_url ? String(avatar_url).trim() || null : null,
      Number(sort_order) || 0
    );
    res.status(201).json({ testimonial: getTestimonialById(id) });
  } catch (err) {
    console.error('Create testimonial:', err);
    res.status(500).json({ error: 'Failed to create testimonial' });
  }
});

app.put('/api/admin/testimonials/:id', requireLogin, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!getTestimonialById(id)) return res.status(404).json({ error: 'Testimonial not found' });
  const { quote, author_name, author_title, avatar_url, sort_order } = req.body || {};
  const fields = {};
  if (quote !== undefined) fields.quote = String(quote).trim();
  if (author_name !== undefined) fields.author_name = String(author_name).trim();
  if (author_title !== undefined) fields.author_title = String(author_title).trim();
  if (avatar_url !== undefined) fields.avatar_url = avatar_url ? String(avatar_url).trim() || null : null;
  if (sort_order !== undefined) fields.sort_order = Number(sort_order) || 0;
  const ok = updateTestimonial(id, fields);
  if (!ok) return res.status(500).json({ error: 'Update failed' });
  res.json({ testimonial: getTestimonialById(id) });
});

app.delete('/api/admin/testimonials/:id', requireLogin, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!getTestimonialById(id)) return res.status(404).json({ error: 'Testimonial not found' });
  deleteTestimonial(id);
  res.status(204).end();
});

// ——— Docs (CMS) ———
app.get('/api/docs', (req, res) => {
  try {
    res.json({ docs: listDocs() });
  } catch (err) {
    console.error('List docs:', err);
    res.status(500).json({ error: 'Failed to list docs' });
  }
});

app.get('/api/docs/:slug', (req, res) => {
  const doc = getDocBySlug(req.params.slug);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json({ doc });
});

app.post('/api/admin/docs', requireLogin, requireAdmin, (req, res) => {
  const { title, slug, body, sort_order } = req.body || {};
  const titleStr = title != null ? String(title).trim() : '';
  if (!titleStr) return res.status(400).json({ error: 'Title is required' });
  try {
    const id = createDoc(titleStr, slug, body != null ? String(body) : '', Number(sort_order) || 0);
    res.status(201).json({ doc: getDocById(id) });
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: 'Slug already in use' });
    console.error('Create doc:', err);
    res.status(500).json({ error: 'Failed to create doc' });
  }
});

app.patch('/api/admin/docs/:id', requireLogin, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!getDocById(id)) return res.status(404).json({ error: 'Doc not found' });
  const { title, slug, body, sort_order } = req.body || {};
  const fields = {};
  if (title !== undefined) fields.title = String(title).trim();
  if (slug !== undefined) fields.slug = String(slug).trim();
  if (body !== undefined) fields.body = String(body);
  if (sort_order !== undefined) fields.sort_order = Number(sort_order) || 0;
  try {
    const ok = updateDoc(id, fields);
    if (!ok) return res.status(500).json({ error: 'Update failed' });
    res.json({ doc: getDocById(id) });
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: 'Slug already in use' });
    console.error('Update doc:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

app.delete('/api/admin/docs/:id', requireLogin, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!getDocById(id)) return res.status(404).json({ error: 'Doc not found' });
  deleteDoc(id);
  res.status(204).end();
});

// ——— Blog (CMS) ———
app.get('/api/blog', (req, res) => {
  try {
    res.json({ posts: listBlogPosts() });
  } catch (err) {
    console.error('List blog:', err);
    res.status(500).json({ error: 'Failed to list posts' });
  }
});

app.get('/api/blog/:slug', (req, res) => {
  const post = getBlogPostBySlug(req.params.slug);
  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json({ post });
});

app.post('/api/admin/blog', requireLogin, requireAdmin, (req, res) => {
  const { title, slug, excerpt, body, author_name, published_at } = req.body || {};
  const titleStr = title != null ? String(title).trim() : '';
  if (!titleStr) return res.status(400).json({ error: 'Title is required' });
  try {
    const id = createBlogPost(
      titleStr,
      slug,
      excerpt != null ? String(excerpt).trim() : null,
      body != null ? String(body) : '',
      author_name != null ? String(author_name).trim() : '',
      published_at || null
    );
    res.status(201).json({ post: getBlogPostById(id) });
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: 'Slug already in use' });
    console.error('Create blog post:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.patch('/api/admin/blog/:id', requireLogin, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!getBlogPostById(id)) return res.status(404).json({ error: 'Post not found' });
  const { title, slug, excerpt, body, author_name, published_at } = req.body || {};
  const fields = {};
  if (title !== undefined) fields.title = String(title).trim();
  if (slug !== undefined) fields.slug = String(slug).trim();
  if (excerpt !== undefined) fields.excerpt = excerpt == null ? null : String(excerpt).trim();
  if (body !== undefined) fields.body = String(body);
  if (author_name !== undefined) fields.author_name = String(author_name).trim();
  if (published_at !== undefined) fields.published_at = published_at;
  try {
    const ok = updateBlogPost(id, fields);
    if (!ok) return res.status(500).json({ error: 'Update failed' });
    res.json({ post: getBlogPostById(id) });
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(400).json({ error: 'Slug already in use' });
    console.error('Update blog post:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

app.delete('/api/admin/blog/:id', requireLogin, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!getBlogPostById(id)) return res.status(404).json({ error: 'Post not found' });
  deleteBlogPost(id);
  res.status(204).end();
});

// Dynamic doc and blog post pages (must be before catch-all)
function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

app.get('/docs/:slug', (req, res) => {
  const doc = getDocBySlug(req.params.slug);
  if (!doc) return res.status(404).end();
  const templatePath = path.join(__dirname, 'views', 'doc-show.html');
  if (!fs.existsSync(templatePath)) return res.status(500).send('Template not found');
  getMarked()
    .then((parse) => parse(doc.body || '', { async: false }))
    .then((bodyHtml) => {
      let html = fs.readFileSync(templatePath, 'utf8');
      html = html.replace(/\{\{TITLE\}\}/g, escapeHtml(doc.title));
      html = html.replace(/\{\{BODY\}\}/, bodyHtml);
      html = html.replace(/\{\{META_TITLE\}\}/g, escapeHtml(doc.title) + ' – Documentation – ArgusPage');
      res.type('html').send(html);
    })
    .catch((err) => {
      console.error('Markdown parse (doc):', err);
      res.status(500).send('Error rendering doc');
    });
});

app.get('/blog/:slug', (req, res) => {
  const post = getBlogPostBySlug(req.params.slug);
  if (!post) return res.status(404).end();
  const templatePath = path.join(__dirname, 'views', 'blog-show.html');
  if (!fs.existsSync(templatePath)) return res.status(500).send('Template not found');
  getMarked()
    .then((parse) => parse(post.body || '', { async: false }))
    .then((bodyHtml) => {
      let html = fs.readFileSync(templatePath, 'utf8');
      html = html.replace(/\{\{TITLE\}\}/g, escapeHtml(post.title));
      html = html.replace(/\{\{BODY\}\}/, bodyHtml);
      html = html.replace(/\{\{META_TITLE\}\}/g, escapeHtml(post.title) + ' – Blog – ArgusPage');
      html = html.replace(/\{\{AUTHOR\}\}/g, escapeHtml(post.author_name || ''));
      html = html.replace(/\{\{DATE\}\}/g, escapeHtml(post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''));
      res.type('html').send(html);
    })
    .catch((err) => {
      console.error('Markdown parse (blog):', err);
      res.status(500).send('Error rendering post');
    });
});

// Catch-all: serve requested file or 404 (path traversal safe)
const APP_ROOT = path.resolve(__dirname);
const ALLOWED_EXT = ['.html', '.css', '.js', '.ico', '.svg', '.png', '.jpg', '.json'];
app.get('*', (req, res, next) => {
  const ext = path.extname(req.path);

  // If no extension, try to serve as .html file (e.g., /features -> features.html)
  if (!ext) {
    const htmlPath = path.resolve(APP_ROOT, req.path.replace(/^\//, '') + '.html');
    const normalizedHtmlPath = path.normalize(htmlPath);
    const normalizedRoot = path.normalize(APP_ROOT);

    // Path traversal check
    if (normalizedHtmlPath === normalizedRoot || !normalizedHtmlPath.startsWith(normalizedRoot + path.sep)) {
      return res.status(404).end();
    }

    // Try serving the .html file
    if (fs.existsSync(htmlPath)) {
      return res.sendFile(htmlPath);
    }
    return res.status(404).end();
  }

  // If has extension but not allowed, skip
  if (!ALLOWED_EXT.includes(ext)) return next();

  // Serve file with allowed extension
  const resolved = path.resolve(APP_ROOT, req.path.replace(/^\//, ''));
  const normalizedResolved = path.normalize(resolved);
  const normalizedRoot = path.normalize(APP_ROOT);
  if (normalizedResolved !== normalizedRoot && !normalizedResolved.startsWith(normalizedRoot + path.sep)) {
    return res.status(403).end();
  }
  res.sendFile(resolved, (err) => {
    if (err && err.code === 'ENOENT') res.status(404).end();
  });
});

app.listen(PORT, () => {
  console.log(`ArgusPage server running at http://localhost:${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    try {
      const users = listUsers();
      if (users.length === 0) {
        console.warn(
          'Warning: Database has no users. On Railway (and similar), the container filesystem is replaced on every deploy, ' +
          'so without a persistent volume your database (and all users) will be lost on redeploy. ' +
          'Add a Volume, mount it (e.g. at /data), and set DATABASE_PATH to a path inside it (e.g. /data/arguspage.db). See DEPLOY.md.'
        );
      }
    } catch (e) {}
  }
});
