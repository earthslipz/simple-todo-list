// API endpoints
const API_BASE = '/api/todos';
const LIST_API = '/api/list';

// DOM elements
const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const totalCount = document.getElementById('totalCount');
const completedCount = document.getElementById('completedCount');
const listNameEl = document.getElementById('listName');
const editNameBtn = document.getElementById('editNameBtn');
const editNameContainer = document.getElementById('editNameContainer');
const listNameInput = document.getElementById('listNameInput');
const saveNameBtn = document.getElementById('saveNameBtn');
const cancelNameBtn = document.getElementById('cancelNameBtn');

// State
let todos = [];

// Fetch all todos
async function fetchTodos() {
    try {
        const response = await fetch(API_BASE);
        todos = await response.json();
        renderTodos();
    } catch (error) {
        console.error('Error fetching todos:', error);
        alert('Failed to load todos');
    }
}

// Fetch list name
async function fetchListName() {
    try {
        const res = await fetch(LIST_API);
        if (!res.ok) return;
        const data = await res.json();
        listNameEl.textContent = data.name;
    } catch (e) {
        console.error('Failed to fetch list name', e);
    }
}

// Update list name
async function updateListName(newName) {
    try {
        const res = await fetch(LIST_API, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.error || 'Failed to update list name');
            return false;
        }

        const data = await res.json();
        listNameEl.textContent = data.name;
        return true;
    } catch (e) {
        console.error('Failed to update list name', e);
        alert('Failed to update list name');
        return false;
    }
}

// Add a new todo
async function addTodo() {
    const text = todoInput.value.trim();
    
    if (!text) {
        alert('Please enter a todo');
        return;
    }
    
    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });
        
        if (response.ok) {
            const newTodo = await response.json();
            todos.push(newTodo);
            todoInput.value = '';
            renderTodos();
        } else {
            alert('Failed to add todo');
        }
    } catch (error) {
        console.error('Error adding todo:', error);
        alert('Failed to add todo');
    }
}

// Toggle todo completion
async function toggleTodo(id) {
    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'PUT',
        });
        
        if (response.ok) {
            const updatedTodo = await response.json();
            const index = todos.findIndex(t => t.id === id);
            if (index !== -1) {
                todos[index] = updatedTodo;
                renderTodos();
            }
        } else {
            alert('Failed to update todo');
        }
    } catch (error) {
        console.error('Error toggling todo:', error);
        alert('Failed to update todo');
    }
}

// Delete a todo
async function deleteTodo(id) {
    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE',
        });
        
        if (response.ok) {
            todos = todos.filter(t => t.id !== id);
            renderTodos();
        } else {
            alert('Failed to delete todo');
        }
    } catch (error) {
        console.error('Error deleting todo:', error);
        alert('Failed to delete todo');
    }
}

// Render todos to the DOM
function renderTodos() {
    if (todos.length === 0) {
        todoList.innerHTML = '<div class="empty-state">No todos yet. Add one above!</div>';
    } else {
        todoList.innerHTML = todos.map(todo => `
            <div class="todo-item ${todo.completed ? 'completed' : ''}">
                <input 
                    type="checkbox" 
                    class="todo-checkbox" 
                    ${todo.completed ? 'checked' : ''} 
                    onchange="toggleTodo(${todo.id})"
                />
                <span class="todo-text">${escapeHtml(todo.text)}</span>
                <button class="delete-btn" onclick="deleteTodo(${todo.id})">Delete</button>
            </div>
        `).join('');
    }
    
    updateStats();
}

// Update statistics
function updateStats() {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    totalCount.textContent = `Total: ${total}`;
    completedCount.textContent = `Completed: ${completed}`;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listeners
addBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// List name edit handlers
editNameBtn.addEventListener('click', () => {
    listNameInput.value = listNameEl.textContent || '';
    editNameContainer.style.display = 'block';
    listNameInput.focus();
});

cancelNameBtn.addEventListener('click', () => {
    editNameContainer.style.display = 'none';
});

saveNameBtn.addEventListener('click', async () => {
    const newName = listNameInput.value.trim();
    if (!newName) {
        alert('Please enter a list name');
        return;
    }

    const ok = await updateListName(newName);
    if (ok) editNameContainer.style.display = 'none';
});

// Initialize
fetchTodos();
fetchListName();
