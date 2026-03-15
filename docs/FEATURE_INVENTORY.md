## ForgeBook Feature Inventory

This inventory was generated before the refactor so no existing behavior is lost.

### Root Surfaces

- `Library view`
  - Vault header actions
  - Vault search
  - Quick switch
  - Profile
  - Settings
  - Friends
  - Messages
  - Notifications
  - Market entry
  - Import / export
  - New vault
  - New category
- `Workspace view`
  - Top bar
  - Vault identity / rename
  - Sidebar toggle
  - Quick create
  - Friends / messages / notifications / market / share / profile / settings
  - Context panel
  - Status bar
- `Market view`
  - Search
  - Role / availability / experience filters
  - Developer cards
  - Market detail modal
  - Create / edit market post
  - Return to library / workspace

### Vault System

- Vault creation
- Vault duplication
- Vault delete
- Vault rename
- Vault cover image
- Vault categories
- Vault drag into category
- Vault card metadata
- Vault tree / explorer
- Vault share members
- Vault import / export persistence

### File System / Explorer

- Folders
- Text notes
- Canvas files
- Balancing sheets
- Manager boards
- Drag and drop file moves
- Folder collapse state
- File rename
- File duplicate
- File delete
- Context menu actions
- Search inside vault

### Text Editor

- Editable note body
- Persistent formatting toolbar
- Formatting commands
- Inline code / code block
- Headings
- Lists
- Alignment
- Text color
- Highlight color
- Links
- Image insert
- Floating note images
- Image drag / resize
- Writing templates
- Outline
- Word / block stats
- Remove latest writing block

### Canvas

- Canvas panel
- Brush color
- Brush size
- Clear canvas
- Pan / zoom runtime data

### Balancing Sheets

- Multi-table sheet documents
- Table presets
  - Weapon
  - Enemy
  - Economy
  - Progression
  - Loot
- Add / delete row
- Add / delete column
- Add / delete table
- Table reorder
- Table width span
- Column resize
- Row resize
- Formula bar
- Formula suggestions
- Formula helpers
- Sticky headers
- Referenced column highlighting
- Analysis panel

### Manager Boards

- Board presets
  - Production
  - Sprint
  - Review
- Add column
- Delete column
- Add card
- Checklist card
- Drag cards
- Card title / body / owner / due date
- Checklist items
- Card details overlay
- Comments
- Attachments placeholders
- Board stats

### Graph

- Graph view shell
- Note link extraction from `[[links]]`

### Profile

- Avatar upload
- Banner upload
- Name / role / tagline / status / bio / private note
- Accent color
- Theme variant
- Layout style
- Badges
- Portfolio blocks
- Block reorder
- Copy profile ID
- Generated stats

### Friends

- Friends tab
- Requests tab
- Sent requests tab
- Blocked tab
- Friend search by name
- ID invite search
- Add mock friend
- Remove friend
- Block friend
- Accept / decline request

### Messages

- Direct messages
- Team chats
- Conversation list
- Friend search inside messages
- Start DM from friend list
- Send message
- Quick update
- Share active file into chat
- Members panel

### Notifications

- Notification feed
- Notification tabs
  - All
  - Messages
  - Friends
  - Projects
- Notification badge count
- Notification creation from friend, message, vault share, market events

### Developer Market

- Separate page surface
- Developer feed
- Search and filters
- Add developer as friend
- Message developer
- Open developer detail modal
- Create / edit own market post

### Settings / Utility

- Theme switch
- Glow mode
- Modal system
- Overlay system
- Toast system
- Quick switch overlay
- Keyboard shortcuts
  - Save
  - Quick switch
  - New file / vault
  - Search
  - Quick insert

### Persistence / Data

- Local storage save / backup keys
- Recovery path
- URL state write / restore
- Recent work
- Last opened tracking

### Legacy / Transitional Behaviors To Preserve

- Any overlay or toolbar button currently wired in the runtime
- Hidden panels and partial features
- Incomplete systems that still exist in DOM or state
- Existing modal / context menu flows
