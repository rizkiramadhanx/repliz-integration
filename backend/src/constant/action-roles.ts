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
    actions: ['repliz:read'],
  },
];

export default ACTION_ROLES;
