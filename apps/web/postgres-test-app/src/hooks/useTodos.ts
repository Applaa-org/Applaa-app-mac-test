import { useState, useEffect } from 'react';
import { getTodos, createTodo, updateTodo, deleteTodo, type Todo } from '../lib/api';

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTodos();
  }, []);

  async function loadTodos() {
    try {
      setLoading(true);
      setError(null);
      const data = await getTodos();
      setTodos(data);
    } catch (err: any) {
      console.error('Failed to load todos:', err);
      setError(err.message || 'Failed to load todos');
    } finally {
      setLoading(false);
    }
  }

  async function addTodo(title: string, priority: string = 'medium') {
    try {
      const newTodo = await createTodo(title, priority);
      setTodos([newTodo, ...todos]);
    } catch (err: any) {
      console.error('Failed to add todo:', err);
      throw err;
    }
  }

  async function toggleTodo(id: number) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    try {
      const updated = await updateTodo(id, { completed: !todo.completed });
      setTodos(todos.map(t => t.id === id ? updated : t));
    } catch (err: any) {
      console.error('Failed to toggle todo:', err);
      throw err;
    }
  }

  async function removeTodo(id: number) {
    try {
      await deleteTodo(id);
      setTodos(todos.filter(t => t.id !== id));
    } catch (err: any) {
      console.error('Failed to delete todo:', err);
      throw err;
    }
  }

  return { todos, loading, error, addTodo, toggleTodo, removeTodo, refresh: loadTodos };
}

