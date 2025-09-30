require('dotenv').config();
const express = require('express');
const nano = require('nano')('http://ela7ne:bunnycat@353a5-couchdb-1:5984');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const dbName = 'postsdb';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' })); 


let db; // Global DB reference

// Middleware for authentication
const authenticate = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.sendStatus(401);

  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    res.sendStatus(403);
  }
};


async function waitForCouchDB(retries = 5, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      // Check/create system databases
      const systemDbs = ['_users', '_replicator', '_global_changes'];
      for (const db of systemDbs) {
        try {
          await nano.db.get(db);
        } catch {
          await nano.db.create(db);
          console.log(`✓ Created system database: ${db}`);
        }
      }

      // Then handle your application database
      const dbList = await nano.db.list();
      if (!dbList.includes(dbName)) {
        await nano.db.create(dbName);
        console.log(`✓ Created database: ${dbName}`);
      }
      
      db = nano.db.use(dbName);
      return true;
      
    } catch (err) {
      console.error(`Attempt ${i+1} failed:`, err.message);
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

async function init() {
  try {
    await waitForCouchDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to initialize app:', err.message);
    process.exit(1); // optional: stop container if it fails repeatedly
  }
}

init();

// ====================== ROUTES ======================

// Register a new user
app.post('/register', async (req, res) => {
  const { username, password, displayName, avatar } = req.body;
  if (!username || !password || !displayName) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const existing = await db.find({ selector: { type: 'user', username } });
    if (existing.docs.length > 0) return res.status(400).json({ error: 'User exists' });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = {
      _id: username,
      type: 'user',
      username,
      password: hashed,
      displayName,
      avatar, 
      role: username === 'admin' ? 'admin' : 'user',
      timestamp: new Date().toISOString()
    };
    

    const saved = await db.insert(newUser);
    res.json({ success: true, id: saved.id });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.find({ selector: { type: 'user', username } });
    const user = result.docs[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      {
        id: user._id, 
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );    

    res.json({ token, displayName: user.displayName, avatar: user.avatar, role: user.role });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Create post
app.post('/postmessage', authenticate, async (req, res) => {
  try {
    const { topic, data, channelId, image, avatar } = req.body;
    if (!topic || !data || !channelId) {
      return res.status(400).json({ success: false, error: 'Missing topic, data, or channelId' });
    }

    const user = await db.get(req.user.id);

    const doc = {
      type: 'post',
      topic,
      data,
      channelId,
      image: image || null,
      author: user.username,
      displayName: user.displayName,
      avatar: avatar || user.avatar,
      skillLevel: user.skillLevel || 'Unrated', 
      timestamp: new Date().toISOString()
    };

    const response = await db.insert(doc);
    res.json({ success: true, id: response.id });
  } catch (err) {
    console.error('❌ Error in /postmessage:', err.message);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


// Create response
app.post('/postresponse', authenticate, async (req, res) => {
  const { parentId, data, image, avatar } = req.body;

  if (!parentId || !data) {
    return res.status(400).json({ success: false, error: 'Missing parentId or data' });
  }

  const doc = {
    type: 'response',
    parentId,
    data,
    image,
    author: req.user.username,
    displayName: req.user.displayName,
    avatar: avatar || req.user.avatar,
    timestamp: new Date().toISOString()
  };

  try {
    const response = await db.insert(doc);
    res.json({ success: true, id: response.id });
  } catch (err) {
    console.error('Error inserting response:', err);
    res.status(500).json({ success: false, error: 'Failed to create response' });
  }
});

// Get all channels
app.get('/channels', async (req, res) => {
  try {
    const result = await db.find({ selector: { type: 'channel' } });
    res.json({ channels: result.docs });
  } catch (err) {
    console.error('Error fetching channels:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch channels' });
  }
});

// Create a new channel
app.post('/createchannel', authenticate, async (req, res) => {
  const { name, description } = req.body;
  if (!name || !description) {
    return res.status(400).json({ success: false, error: 'Missing name or description' });
  }

  const doc = {
    type: 'channel',
    name,
    description,
    author: req.user.username, 
    timestamp: new Date().toISOString()
  };

  try {
    const response = await db.insert(doc);
    res.json({ success: true, id: response.id });
  } catch (err) {
    console.error('Error creating channel:', err);
    res.status(500).json({ success: false, error: 'Failed to create channel' });
  }
});



// Admin delete route
app.delete('/admin/delete/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);

  const docId = req.params.id;
  try {
    const doc = await db.get(docId);
    await db.destroy(docId, doc._rev);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Deletion failed' });
  }
});

app.get('/alldata', async (req, res) => {
  try {
    const result = await db.find({
      selector: { type: { $in: ['post', 'response'] } }
    });

    const posts = result.docs.filter(doc => doc.type === 'post');
    const responses = result.docs.filter(doc => doc.type === 'response');

    res.json({ posts, responses });
  } catch (err) {
    console.error('Error in /alldata:', err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// upvote and downvote
app.post('/rate', authenticate, async (req, res) => {
  const { id, vote } = req.body;
  const username = req.user.username;

  if (!['up', 'down'].includes(vote)) {
    return res.status(400).json({ error: 'Invalid vote type' });
  }

  try {
    const doc = await db.get(id);

    if (!doc.votes) doc.votes = {};

    const currentVote = doc.votes[username];

    if (currentVote === vote) {
      // If clicking the same vote again → remove the vote (toggle off)
      delete doc.votes[username];
    } else {
      // Otherwise, set the new vote
      doc.votes[username] = vote;
    }

    const voteValues = Object.values(doc.votes);
    doc.upvotes = voteValues.filter(v => v === 'up').length;
    doc.downvotes = voteValues.filter(v => v === 'down').length;

    const updated = await db.insert(doc);
    res.json({ success: true, upvotes: doc.upvotes, downvotes: doc.downvotes });
  } catch (err) {
    console.error('Vote error:', err);
    res.status(500).json({ error: 'Failed to update vote' });
  }
});

// search by string
app.get('/search/content', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });

  try {
    const result = await db.find({
      selector: { type: { $in: ['post', 'response'] } }
    });

    const filtered = result.docs.filter(doc =>
      doc.data && doc.data.toLowerCase().includes(q.toLowerCase())
    );

    res.json({ results: filtered }); 
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// search by user
app.get('/search/user', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Missing username' });

  try {
    const result = await db.find({
      selector: {
        author: username
      }
    });
    res.json({ results: result.docs });
  } catch (err) {
    console.error('User content search failed:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// filter user most/least posts
app.get('/stats/most-posts', async (req, res) => {
  try {
    const result = await db.find({ selector: { type: { "$in": ["post", "response"] } } });

    const counts = {};
    result.docs.forEach(doc => {
      if (doc.author) {
        counts[doc.author] = (counts[doc.author] || 0) + 1;
      }
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    res.json({
      mostPosts: sorted[0],
      leastPosts: sorted[sorted.length - 1]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to calculate stats' });
  }
});

// filter user most/least voted
app.get('/stats/top-users', async (req, res) => {
  try {
    const posts = await db.find({ selector: { type: 'post' } });
    const replies = await db.find({ selector: { type: 'response' } });

    const stats = {};

    for (const doc of [...posts.docs, ...replies.docs]) {
      const user = doc.author;
      if (!user) continue;

      if (!stats[user]) {
        stats[user] = {
          posts: 0,
          upvotes: 0,
          downvotes: 0
        };
      }

      stats[user].posts += 1;
      stats[user].upvotes += doc.upvotes || 0;
      stats[user].downvotes += doc.downvotes || 0;
    }

    const topByPosts = Object.entries(stats).sort((a, b) => b[1].posts - a[1].posts);

    res.json({ topByPosts });
  } catch (err) {
    console.error('❌ /stats/top-users error:', err.message);
    res.status(500).json({ error: 'Failed to compute stats' });
  }
});

// account
app.post('/account/update', authenticate, async (req, res) => {
  try {
    console.log('Incoming update request from user:', req.user);

    const { displayName, avatar, skillLevel } = req.body;
    const userId = req.user.id;
    console.log('Attempting to fetch user with ID:', userId);

    const user = await db.get(userId);
    console.log('Fetched user:', user);

    user.displayName = displayName || user.displayName;
    user.avatar = avatar || user.avatar;
    user.skillLevel = skillLevel || user.skillLevel;
  

    const updated = await db.insert(user);
    console.log('Successfully updated user:', updated);

    res.json({
      success: true,
      displayName: user.displayName,
      avatar: user.avatar,
      skillLevel: user.skillLevel
    });
  } catch (err) {
    console.error('Error updating account:', err);
    res.status(500).json({ success: false, error: 'Failed to update account' });
  }
});

app.get('/user/:username', async (req, res) => {
  try {
    const result = await db.find({
      selector: {
        _id: req.params.username,
        type: 'user'
      },
      limit: 1
    });

    if (result.docs.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.docs[0]);
  } catch (err) {
    console.error('❌ Error fetching user profile:', err.message);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

