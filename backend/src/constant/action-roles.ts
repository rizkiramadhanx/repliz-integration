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
    name: 'item',
    actions: ['item:create', 'item:read', 'item:update', 'item:delete'],
  },
  {
    name: 'category',
    actions: [
      'category:create',
      'category:read',
      'category:update',
      'category:delete',
    ],
  },
  {
    name: 'brand',
    actions: ['brand:create', 'brand:read', 'brand:update', 'brand:delete'],
  },
];

export default ACTION_ROLES;
