import type { TodoType } from '../types/api';

export function todoTypeAccentSx(type: TodoType) {
  return { borderInlineStart: `3px solid var(--todo-type-${type}-accent)` };
}
