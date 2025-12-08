import { useState } from 'react';
import { useTodos } from '../hooks/useTodos';

export function TodoList() {
  const { todos, loading, error, addTodo, toggleTodo, removeTodo } = useTodos();
  const [newTitle, setNewTitle] = useState('');
  const [priority, setPriority] = useState('medium');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    try {
      await addTodo(newTitle, priority);
      setNewTitle('');
      setPriority('medium');
    } catch (err) {
      alert('Failed to create todo');
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading todos...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <p>Make sure the API server is running on port 3001</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>📝 Todo List (Postgres Test)</h1>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a new todo..."
            style={{ flex: 1, padding: '10px', fontSize: '16px' }}
          />
          <select 
            value={priority} 
            onChange={(e) => setPriority(e.target.value)}
            style={{ padding: '10px' }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button type="submit" style={{ padding: '10px 20px', fontSize: '16px' }}>
            Add
          </button>
        </div>
      </form>

      <div>
        <p><strong>Total: {todos.length} todos</strong></p>
        
        {todos.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>
            No todos yet. Add one above!
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {todos.map(todo => (
              <li 
                key={todo.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px',
                  marginBottom: '5px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  backgroundColor: todo.completed ? '#f0f0f0' : 'white'
                }}
              >
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  style={{ cursor: 'pointer' }}
                />
                <span 
                  style={{ 
                    flex: 1, 
                    textDecoration: todo.completed ? 'line-through' : 'none',
                    color: todo.completed ? '#666' : 'black'
                  }}
                >
                  {todo.title}
                </span>
                <span 
                  style={{ 
                    padding: '2px 8px', 
                    borderRadius: '3px', 
                    fontSize: '12px',
                    backgroundColor: 
                      todo.priority === 'high' ? '#ffcccc' : 
                      todo.priority === 'low' ? '#ccffcc' : '#ffffcc'
                  }}
                >
                  {todo.priority}
                </span>
                <button 
                  onClick={() => removeTodo(todo.id)}
                  style={{ 
                    padding: '5px 10px', 
                    backgroundColor: '#ff4444', 
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

