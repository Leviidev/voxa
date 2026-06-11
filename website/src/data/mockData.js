export const MOCK_SERVERS = [
  {
    id: 'srv_general',
    name: 'Voxa HQ',
    icon: null,
    acronym: 'VHQ',
    color: '#E53935',
    unread: true,
    categories: [
      {
        id: 'cat_info',
        name: 'Information',
        channels: [
          { id: 'ch_welcome', name: 'welcome', type: 'text', unread: false, locked: true },
          { id: 'ch_rules', name: 'rules', type: 'text', unread: false, locked: true },
          { id: 'ch_announce', name: 'announcements', type: 'text', unread: true, locked: true },
        ]
      },
      {
        id: 'cat_general',
        name: 'General',
        channels: [
          { id: 'ch_chat', name: 'general', type: 'text', unread: true },
          { id: 'ch_off', name: 'off-topic', type: 'text', unread: false },
          { id: 'ch_media', name: 'media', type: 'text', unread: false },
          { id: 'ch_vc1', name: 'Lounge', type: 'voice', unread: false, members: ['Alex', 'Sam'] },
          { id: 'ch_vc2', name: 'Gaming', type: 'voice', unread: false, members: [] },
        ]
      },
      {
        id: 'cat_dev',
        name: 'Development',
        channels: [
          { id: 'ch_dev', name: 'dev-chat', type: 'text', unread: false },
          { id: 'ch_bugs', name: 'bug-reports', type: 'text', unread: true },
          { id: 'ch_ideas', name: 'ideas', type: 'text', unread: false },
        ]
      }
    ],
    members: [
      { id: 'm1', username: 'Alex', discriminator: '0001', status: 'online', role: 'Admin' },
      { id: 'm2', username: 'Sam', discriminator: '0234', status: 'online', role: 'Member' },
      { id: 'm3', username: 'Jordan', discriminator: '1337', status: 'idle', role: 'Member' },
      { id: 'm4', username: 'Casey', discriminator: '4242', status: 'dnd', role: 'Moderator' },
      { id: 'm5', username: 'Morgan', discriminator: '8888', status: 'offline', role: 'Member' },
      { id: 'm6', username: 'Taylor', discriminator: '5555', status: 'offline', role: 'Member' },
    ]
  },
  {
    id: 'srv_gaming',
    name: 'Gaming Zone',
    icon: null,
    acronym: 'GZ',
    color: '#1565C0',
    unread: false,
    categories: [
      {
        id: 'cat_g1',
        name: 'General',
        channels: [
          { id: 'ch_g1', name: 'general', type: 'text', unread: false },
          { id: 'ch_g2', name: 'clips', type: 'text', unread: false },
          { id: 'ch_gvc', name: 'Squad Up', type: 'voice', unread: false, members: ['Morgan'] },
        ]
      }
    ],
    members: [
      { id: 'm2', username: 'Sam', discriminator: '0234', status: 'online', role: 'Admin' },
      { id: 'm5', username: 'Morgan', discriminator: '8888', status: 'online', role: 'Member' },
    ]
  },
  {
    id: 'srv_music',
    name: 'Music Lovers',
    icon: null,
    acronym: 'ML',
    color: '#6A1B9A',
    unread: true,
    categories: [
      {
        id: 'cat_m1',
        name: 'Main',
        channels: [
          { id: 'ch_m1', name: 'share-tracks', type: 'text', unread: true },
          { id: 'ch_m2', name: 'recommendations', type: 'text', unread: false },
        ]
      }
    ],
    members: [
      { id: 'm3', username: 'Jordan', discriminator: '1337', status: 'idle', role: 'Admin' },
    ]
  }
]

export const MOCK_MESSAGES = {
  ch_chat: [
    { id: 'msg1', author: 'Alex', discriminator: '0001', content: 'Welcome to Voxa HQ everyone! 🎉', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), avatar: null },
    { id: 'msg2', author: 'Sam', discriminator: '0234', content: 'This is awesome! Love the red theme 🔴', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString(), avatar: null },
    { id: 'msg3', author: 'Jordan', discriminator: '1337', content: 'Finally a Discord alternative that actually looks good', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), avatar: null },
    { id: 'msg4', author: 'Casey', discriminator: '4242', content: 'The voice quality is incredible btw', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), avatar: null },
    { id: 'msg5', author: 'Alex', discriminator: '0001', content: 'Yeah we put a lot of work into the audio stack. Sub-50ms latency globally 🚀', timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(), avatar: null },
    { id: 'msg6', author: 'Sam', discriminator: '0234', content: 'When are you adding bots?', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), avatar: null },
    { id: 'msg7', author: 'Alex', discriminator: '0001', content: 'Bot API is next on the roadmap! Should be live in a few weeks', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), avatar: null },
  ],
  ch_dev: [
    { id: 'dmsg1', author: 'Casey', discriminator: '4242', content: 'Working on the mobile app right now', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), avatar: null },
    { id: 'dmsg2', author: 'Alex', discriminator: '0001', content: 'iOS first, Android to follow', timestamp: new Date(Date.now() - 1000 * 60 * 28).toISOString(), avatar: null },
  ],
  ch_welcome: [
    { id: 'wmsg1', author: 'Voxa', discriminator: '0000', content: '👋 Welcome to Voxa HQ! Please read #rules before chatting.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), avatar: null },
  ],
  ch_bugs: [
    { id: 'bmsg1', author: 'Morgan', discriminator: '8888', content: 'The emoji picker sometimes clips on small screens', timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(), avatar: null },
  ],
}

export const MOCK_DMS = [
  { id: 'dm1', username: 'Alex', discriminator: '0001', status: 'online', lastMessage: 'Hey, are you free to call later?' },
  { id: 'dm2', username: 'Sam', discriminator: '0234', status: 'idle', lastMessage: 'Check out this clip lol' },
  { id: 'dm3', username: 'Jordan', discriminator: '1337', status: 'dnd', lastMessage: 'Working on something cool' },
]
