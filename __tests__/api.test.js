const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../index');

// Mock file path for testing
const TEST_TODOS_FILE = path.join(__dirname, '../todos.test.json');

describe('Todo API Endpoints', () => {
  beforeEach(() => {
    // Reset the todos file before each test
    if (fs.existsSync(TEST_TODOS_FILE)) {
      fs.unlinkSync(TEST_TODOS_FILE);
    }
    // Clear the default todos.json file as well
    const defaultTodosFile = path.join(__dirname, '../todos.json');
    if (fs.existsSync(defaultTodosFile)) {
      fs.writeFileSync(defaultTodosFile, JSON.stringify([]));
    }
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(TEST_TODOS_FILE)) {
      fs.unlinkSync(TEST_TODOS_FILE);
    }
  });

  describe('GET /api/todos', () => {
    test('should return an empty array initially', async () => {
      const response = await request(app).get('/api/todos');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('should return all todos', async () => {
      // Add a todo first
      await request(app)
        .post('/api/todos')
        .send({ text: 'Test todo' });

      const response = await request(app).get('/api/todos');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('text', 'Test todo');
    });
  });

  describe('POST /api/todos', () => {
    test('should create a new todo', async () => {
      const newTodo = { text: 'Buy groceries' };
      
      const response = await request(app)
        .post('/api/todos')
        .send(newTodo);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('text', 'Buy groceries');
      expect(response.body).toHaveProperty('completed', false);
      expect(response.body).toHaveProperty('createdAt');
    });

    test('should trim whitespace from todo text', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ text: '  Spaced out todo  ' });
      
      expect(response.status).toBe(201);
      expect(response.body.text).toBe('Spaced out todo');
    });

    test('should return 400 if text is missing', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Todo text is required');
    });

    test('should return 400 if text is empty', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ text: '' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Todo text is required');
    });

    test('should return 400 if text is only whitespace', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ text: '   ' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Todo text is required');
    });

    test('should generate unique IDs for todos', async () => {
      const response1 = await request(app)
        .post('/api/todos')
        .send({ text: 'First todo' });
      
      const response2 = await request(app)
        .post('/api/todos')
        .send({ text: 'Second todo' });
      
      expect(response1.body.id).not.toBe(response2.body.id);
    });
  });

  describe('PUT /api/todos/:id', () => {
    test('should toggle todo completion status', async () => {
      // Create a todo first
      const createResponse = await request(app)
        .post('/api/todos')
        .send({ text: 'Test todo' });
      
      const todoId = createResponse.body.id;
      
      // Toggle completion
      const response = await request(app)
        .put(`/api/todos/${todoId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.completed).toBe(true);
    });

    test('should toggle back to incomplete', async () => {
      // Create a todo
      const createResponse = await request(app)
        .post('/api/todos')
        .send({ text: 'Test todo' });
      
      const todoId = createResponse.body.id;
      
      // Toggle to complete
      await request(app).put(`/api/todos/${todoId}`);
      
      // Toggle back to incomplete
      const response = await request(app).put(`/api/todos/${todoId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.completed).toBe(false);
    });

    test('should return 404 if todo not found', async () => {
      const response = await request(app)
        .put('/api/todos/999999');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Todo not found');
    });
  });

  describe('PATCH /api/todos/:id', () => {
    test('should edit todo text', async () => {
      const createResponse = await request(app)
        .post('/api/todos')
        .send({ text: 'Original text' });

      const todoId = createResponse.body.id;

      const response = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ text: 'Updated text' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('text', 'Updated text');
      expect(response.body).toHaveProperty('id', todoId);
    });

    test('should return 400 if new text is missing', async () => {
      const createResponse = await request(app)
        .post('/api/todos')
        .send({ text: 'Will fail' });

      const todoId = createResponse.body.id;

      const response = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Todo text is required');
    });

    test('should return 400 if new text is only whitespace', async () => {
      const createResponse = await request(app)
        .post('/api/todos')
        .send({ text: 'Will fail too' });

      const todoId = createResponse.body.id;

      const response = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ text: '   ' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Todo text is required');
    });

    test('should return 404 if todo not found', async () => {
      const response = await request(app)
        .patch('/api/todos/999999')
        .send({ text: 'Does not matter' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Todo not found');
    });
  });

  describe('DELETE /api/todos/:id', () => {
    test('should delete a todo', async () => {
      // Create a todo
      const createResponse = await request(app)
        .post('/api/todos')
        .send({ text: 'Todo to delete' });
      
      const todoId = createResponse.body.id;
      
      // Delete the todo
      const deleteResponse = await request(app)
        .delete(`/api/todos/${todoId}`);
      
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toHaveProperty('message', 'Todo deleted successfully');
      
      // Verify it's deleted
      const getResponse = await request(app).get('/api/todos');
      expect(getResponse.body).toHaveLength(0);
    });

    test('should return 404 if todo not found', async () => {
      const response = await request(app)
        .delete('/api/todos/999999');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Todo not found');
    });

    test('should only delete the specified todo', async () => {
      // Create multiple todos
      const todo1 = await request(app)
        .post('/api/todos')
        .send({ text: 'First todo' });
      
      const todo2 = await request(app)
        .post('/api/todos')
        .send({ text: 'Second todo' });
      
      // Delete first todo
      await request(app).delete(`/api/todos/${todo1.body.id}`);
      
      // Verify only second todo remains
      const response = await request(app).get('/api/todos');
      expect(response.body).toHaveLength(1);
      expect(response.body[0].text).toBe('Second todo');
    });
  });

  describe('Integration tests', () => {
    test('should handle complete CRUD workflow', async () => {
      // Create a todo
      const createResponse = await request(app)
        .post('/api/todos')
        .send({ text: 'Complete workflow test' });
      
      const todoId = createResponse.body.id;
      expect(createResponse.status).toBe(201);
      
      // Read todos
      const getResponse = await request(app).get('/api/todos');
      expect(getResponse.body).toHaveLength(1);
      
      // Update (toggle) todo
      const updateResponse = await request(app).put(`/api/todos/${todoId}`);
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.completed).toBe(true);
      
      // Delete todo
      const deleteResponse = await request(app).delete(`/api/todos/${todoId}`);
      expect(deleteResponse.status).toBe(200);
      
      // Verify deletion
      const finalResponse = await request(app).get('/api/todos');
      expect(finalResponse.body).toHaveLength(0);
    });

    test('should persist todos across requests', async () => {
      // Create multiple todos
      await request(app).post('/api/todos').send({ text: 'Todo 1' });
      await request(app).post('/api/todos').send({ text: 'Todo 2' });
      await request(app).post('/api/todos').send({ text: 'Todo 3' });
      
      // Get todos
      const response = await request(app).get('/api/todos');
      
      expect(response.body).toHaveLength(3);
      expect(response.body[0].text).toBe('Todo 1');
      expect(response.body[1].text).toBe('Todo 2');
      expect(response.body[2].text).toBe('Todo 3');
    });
  });

  describe('List name endpoints', () => {
    test('should return default list name when none set', async () => {
      const response = await request(app).get('/api/list');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'My Todo List');
    });

    test('should update the list name', async () => {
      const update = await request(app)
        .patch('/api/list')
        .send({ name: 'Work Todos' });

      expect(update.status).toBe(200);
      expect(update.body).toHaveProperty('name', 'Work Todos');

      const get = await request(app).get('/api/list');
      expect(get.body).toHaveProperty('name', 'Work Todos');
    });

    test('should return 400 for empty name', async () => {
      const response = await request(app)
        .patch('/api/list')
        .send({ name: '   ' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'List name is required');
    });
  });
});
