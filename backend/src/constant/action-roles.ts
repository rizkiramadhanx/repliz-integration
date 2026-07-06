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
    name: 'auto-post-rule',
    actions: [
      'auto-post-rule:create',
      'auto-post-rule:read',
      'auto-post-rule:update',
      'auto-post-rule:delete',
      'auto-post-rule:run',
    ],
  },
  {
    name: 'post-history',
    actions: ['post-history:read'],
  },
  {
    name: 'scheduled-post',
    actions: [
      'scheduled-post:create',
      'scheduled-post:read',
      'scheduled-post:update',
      'scheduled-post:delete',
      'scheduled-post:run',
    ],
  },
];

export default ACTION_ROLES;
