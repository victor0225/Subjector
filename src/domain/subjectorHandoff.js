export function applyTaskToSubjector({ task }) {
  return {
    taskId: task.id,
    title: task.title,
    assignee: task.assignee,
    importance: task.importance,
    target: 'Subjector in-process',
    status: 'applied',
    appliedAt: new Date().toISOString()
  };
}
