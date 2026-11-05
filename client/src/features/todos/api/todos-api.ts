import { request } from '../../../shared/api/api-client';
import type {
  BulkCreateTodosRequest,
  BulkCreateTodosResponse,
  CreateTodoRequest,
  MoveTodoRequest,
  Todo,
  TodoListQuery,
  TodoListResponse,
  UpdateTodoRequest,
} from '../../../shared/types/api';

export const listTodos = (projectId: string, query: TodoListQuery = {}) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const suffix = search.size ? `?${search.toString()}` : '';
  return request<TodoListResponse>(`/projects/${projectId}/todos${suffix}`);
};

export const createTodo = (projectId: string, input: CreateTodoRequest) =>
  request<{ todo: Todo }>(`/projects/${projectId}/todos`, { method: 'POST', body: input });

export const createTodosBulk = (projectId: string, input: BulkCreateTodosRequest) =>
  request<BulkCreateTodosResponse>(`/projects/${projectId}/todos/bulk`, { method: 'POST', body: input });

export const getTodo = (todoId: string) => request<{ todo: Todo }>(`/todos/${todoId}`);

export const updateTodo = (todoId: string, input: UpdateTodoRequest) =>
  request<{ todo: Todo }>(`/todos/${todoId}`, { method: 'PATCH', body: input });

export const moveTodo = (todoId: string, input: MoveTodoRequest) =>
  request<{ todo: Todo }>(`/todos/${todoId}/move`, { method: 'POST', body: input });

export const deleteTodo = (todoId: string) => request<void>(`/todos/${todoId}`, { method: 'DELETE' });