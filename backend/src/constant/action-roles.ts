const ACTION_ROLES = [
  {
    name: 'role',
    actions: ['role:create', 'role:read', 'role:update', 'role:delete'],
  },
  {
    name: 'user',
    actions: ['user:create', 'user:read', 'user:update', 'user:delete'],
  },
  {
    // log
    name: 'log',
    actions: ['log:read'],
  },
  {
    name: 'account',
    actions: [
      'account:create',
      'account:read',
      'account:update',
      'account:delete',
      'account:publish',
    ],
  },
  {
    name: 'repliz',
    actions: ['repliz:read', 'repliz:delete'],
  },
  {
    name: 'repliz-sync',
    actions: [
      'repliz-sync:create',
      'repliz-sync:read',
      'repliz-sync:update',
      'repliz-sync:delete',
      'repliz-sync:run',
    ],
  },
];

export default ACTION_ROLES;
