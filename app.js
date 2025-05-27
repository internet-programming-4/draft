const express = require('express');
const app = express();
const path = require('path');
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// 정적 파일 경로 설정
const staticPath = path.join(__dirname, 'public');
app.use(express.static(staticPath));

// 정적 파일 경로 확인 미들웨어
app.use((req, res, next) => {
  console.log(`[Static Check] Request URL: ${req.url}`);
  console.log(`[Static Check] Static Path: ${staticPath}`);
  next();
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// 임시 데이터 - 추후 DB 연결 예정
let posts = [];
let chats = {};

// 메인 페이지 (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// 카테고리별 게시판 리스트 페이지 라우트
app.get('/board/:category', (req, res) => {
  res.sendFile(path.join(staticPath, 'board.html'));
});

// 게시글 리스트 API (카테고리별 필터링)
app.get('/api/posts', (req, res) => {
  const category = req.query.category;
  if (category) {
    const filtered = posts.filter(p => p.category === category);
    res.json(filtered);
  } else {
    res.json(posts);
  }
});

// 글 상세 API
app.get('/api/posts/:id', (req, res) => {
  const post = posts.find(p => p.id == req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json(post);
});

// 글 작성 페이지
app.get('/posts/write', (req, res) => {
  res.sendFile(path.join(staticPath, 'write.html'));
});

// 글 작성 처리 (POST)
app.post('/posts', (req, res) => {
  const { category, title, content, author } = req.body;
  // id를 유니크하게 Date.now() + 랜덤값 조합으로 생성
  const id = Date.now().toString() + Math.floor(Math.random() * 1000);
  posts.push({ id, category, title, content, author, createdAt: new Date() });
  // 작성 후 카테고리 게시판으로 리다이렉트
  res.redirect(`/board/${category}`);
});

// 글 상세 페이지 (HTML)
app.get('/posts/:id', (req, res) => {
  res.sendFile(path.join(staticPath, 'post.html'));
});

// 채팅 목록 페이지
app.get('/chat', (req, res) => {
  res.sendFile(path.join(staticPath, 'chat_list.html'));
});

// 특정 채팅방 페이지
app.get('/chat/:room', (req, res) => {
  res.sendFile(path.join(staticPath, 'chat_room.html'));
});

// 소켓 연결
io.on('connection', socket => {
  console.log('user connected:', socket.id);

  socket.on('joinRoom', room => {
    socket.join(room);
    if (!chats[room]) chats[room] = [];
    socket.emit('chatHistory', chats[room]);
  });

  socket.on('chatMessage', ({ room, user, message }) => {
    const msg = { user, message, time: new Date() };
    chats[room].push(msg);
    io.to(room).emit('chatMessage', msg);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
