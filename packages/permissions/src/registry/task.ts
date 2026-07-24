import { FeatureDefinition, id } from '../types';

const viewTasks = {
  id: id('view-tasks'),
  feature: 'task' as const,
  label: 'View all tasks',
  kind: 'view' as const,
  ownership: 'all' as const,
  ownershipFor: 'task',
};

const viewOwnTasks = {
  id: id('view-own-tasks'),
  feature: 'task' as const,
  label: 'View own tasks',
  kind: 'view-own' as const,
  ownership: 'own' as const,
  ownershipFor: 'task',
};

const createTasks = {
  id: id('create-tasks'),
  feature: 'task' as const,
  label: 'Create tasks',
  kind: 'create' as const,
};

const editTasks = {
  id: id('edit-tasks'),
  feature: 'task' as const,
  label: 'Edit tasks',
  kind: 'edit' as const,
};

const deleteTasks = {
  id: id('delete-tasks'),
  feature: 'task' as const,
  label: 'Delete tasks',
  kind: 'delete' as const,
};

const assignTasks = {
  id: id('assign-tasks'),
  feature: 'task' as const,
  label: 'Assign tasks',
  kind: 'custom' as const,
};

const allTask = {
  id: id('all-task'),
  feature: 'task' as const,
  label: 'All task permissions',
  kind: 'all' as const,
  grants: [
    viewTasks.id,
    viewOwnTasks.id,
    createTasks.id,
    editTasks.id,
    deleteTasks.id,
    assignTasks.id,
  ],
};

export const taskFeature: FeatureDefinition = {
  key: 'task',
  title: 'Tasks',
  iconName: 'check-square',
  editorCategory: 'Delivery',
  all: allTask,
  permissions: {
    [allTask.id]: allTask,
    [viewTasks.id]: viewTasks,
    [viewOwnTasks.id]: viewOwnTasks,
    [createTasks.id]: createTasks,
    [editTasks.id]: editTasks,
    [deleteTasks.id]: deleteTasks,
    [assignTasks.id]: assignTasks,
  },
};
