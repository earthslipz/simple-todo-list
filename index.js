const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const TODOS_FILE = path.join(__dirname, 'todos.json');

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize todos file if it doesn't exist
function initTodosFile() {
  if (!fs.existsSync(TODOS_FILE)) {
    const initial = {
      name: 'My Todo List',
      todos: []
    };
    fs.writeFileSync(TODOS_FILE, JSON.stringify(initial, null, 2));
  }
}

// Read todos from file
function readTodos() {
  try {
    initTodosFile();
    const data = fs.readFileSync(TODOS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) return parsed; // legacy format
    if (parsed && Array.isArray(parsed.todos)) return parsed.todos;
    return [];
  } catch (error) {
    console.error('Error reading todos:', error);
    return [];
  }
}

// Write todos to file
function writeTodos(todos) {
  try {
    // Preserve list name if present, write storage as object { name, todos }
    let name = 'My Todo List';
    try {
      const data = fs.readFileSync(TODOS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.name) {
        name = parsed.name;
      }
    } catch (e) {
      // ignore and use default name
    }

    const storage = { name, todos };
    fs.writeFileSync(TODOS_FILE, JSON.stringify(storage, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing todos:', error);
    return false;
  }
}

// Read list name
function readListName() {
  try {
    initTodosFile();
    const data = fs.readFileSync(TODOS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.name) {
      return parsed.name;
    }
    return 'My Todo List';
  } catch (error) {
    return 'My Todo List';
  }
}

// Write list name (preserve todos)
function writeListName(name) {
  try {
    const todos = readTodos();
    const storage = { name, todos };
    fs.writeFileSync(TODOS_FILE, JSON.stringify(storage, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing list name:', error);
    return false;
  }
}

// API Routes

// Get all todos
app.get('/api/todos', (req, res) => {
  const todos = readTodos();
  res.json(todos);
});

// Add a new todo
app.post('/api/todos', (req, res) => {
  const { text } = req.body;
  
  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Todo text is required' });
  }
  
  const todos = readTodos();
  const newTodo = {
    id: Date.now(),
    text: text.trim(),
    completed: false,
    createdAt: new Date().toISOString()
  };
  
  todos.push(newTodo);
  
  if (writeTodos(todos)) {
    res.status(201).json(newTodo);
  } else {
    res.status(500).json({ error: 'Failed to save todo' });
  }
});

// Toggle todo completion (ส่วนที่แก้ไข)
app.put('/api/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const todos = readTodos();
  const todoIndex = todos.findIndex(t => t.id === id);
  
  if (todoIndex === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  
  // Toggle status (สลับค่า true/false)
  todos[todoIndex].completed = !todos[todoIndex].completed;
  
  // Save changes to file and return response
  if (writeTodos(todos)) {
    res.json(todos[todoIndex]);
  } else {
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// Edit todo text
app.patch('/api/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { text } = req.body;
  const todos = readTodos();
  const todoIndex = todos.findIndex(t => t.id === id);

  if (todoIndex === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Todo text is required' });
  }

  todos[todoIndex].text = text.trim();
  // Optionally update modifiedAt
  todos[todoIndex].updatedAt = new Date().toISOString();

  if (writeTodos(todos)) {
    res.json(todos[todoIndex]);
  } else {
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// Get list name
app.get('/api/list', (req, res) => {
  const name = readListName();
  res.json({ name });
});

// Update list name
app.patch('/api/list', (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'List name is required' });
  }

  if (writeListName(name.trim())) {
    res.json({ name: name.trim() });
  } else {
    res.status(500).json({ error: 'Failed to update list name' });
  }
});

// Delete a todo
app.delete('/api/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const todos = readTodos();
  const filteredTodos = todos.filter(t => t.id !== id);
  
  if (todos.length === filteredTodos.length) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  
  if (writeTodos(filteredTodos)) {
    res.json({ message: 'Todo deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// Initialize todos file on startup
initTodosFile();

// Only start the server if this file is run directly (not imported as a module)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export for testing and deployment
module.exports = app;
