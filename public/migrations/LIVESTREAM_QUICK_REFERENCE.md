# LIVESTREAM SYSTEM - QUICK REFERENCE GUIDE

## 📁 Files Location
All files are located in: `c:\xampp\htdocs\josephus\st.joseph\public\migrations\`

```
migrations/
├── 2026_05_19_add_livestream_system.sql        (Database schema)
├── LivestreamMigrationHelper.php               (PHP API helper)
├── install_livestream.php                      (Installation script)
├── LIVESTREAM_MIGRATION_README.md              (Full documentation)
├── INSTALLATION_SUMMARY.md                     (Setup guide)
└── LIVESTREAM_QUICK_REFERENCE.md              (This file)
```

---

## 🚀 Quick Start (3 Steps)

### Step 1: Run Installation
```bash
php c:\xampp\htdocs\josephus\st.joseph\public\migrations\install_livestream.php
```

### Step 2: Verify in phpMyAdmin
- Open phpMyAdmin → josephus_parish_system
- Check tables list - should show 8 new livestream_* tables

### Step 3: Start Creating Livestreams!
```php
require_once 'migrations/LivestreamMigrationHelper.php';
$helper = new LivestreamMigrationHelper($connection);
$id = $helper->createLivestream($data);
```

---

## 🗂️ Database Tables (Quick View)

| Table | Purpose |
|-------|---------|
| livestream_events | Main event records |
| livestream_viewers | Track who watched |
| livestream_chat | Chat messages & moderation |
| livestream_access_control | Who can view |
| livestream_invitations | Send invites |
| livestream_recordings | Archive videos |
| livestream_statistics | View analytics |
| livestream_notifications | Send alerts |

---

## 🎬 Create a Livestream (Code Example)

```php
<?php
require_once 'migrations/LivestreamMigrationHelper.php';

$helper = new LivestreamMigrationHelper($connection);

// Create livestream
$livestream_id = $helper->createLivestream([
    'event_type' => 'Wedding',                    // Required
    'title' => 'John & Maria Wedding',           // Required
    'scheduled_start' => '2026-06-15 14:00:00', // Required
    'description' => 'Wedding ceremony',
    'streaming_url' => 'https://youtube.com/...',
    'location' => 'St. Joseph Church',
    'created_by' => 1                            // User ID - Required
]);

// Set access (private with password)
$helper->setAccessControl($livestream_id, [
    'access_type' => 'Private',
    'password' => 'password123',
    'allow_chat' => true,
    'created_by' => 1
]);

// Send invitations
$helper->sendInvitation($livestream_id, 'guest@example.com', 1);

// Start livestream
$helper->updateLivestreamStatus($livestream_id, 'Live');

// End livestream
$helper->updateLivestreamStatus($livestream_id, 'Ended');
?>
```

---

## 🔐 Access Types

| Type | Description | Who Can View |
|------|-------------|--------------|
| **Public** | Open to everyone | Anyone with link |
| **Private** | Restricted access | Only invited guests |
| **Members_Only** | Members only | Registered members |
| **Invited** | By invitation code | Those with valid code |

---

## 📊 Get Analytics

```php
$stats = $helper->getLivestreamStats($livestream_id);
echo $stats['total_viewers'];          // 156
echo $stats['peak_viewers'];            // 42 (max concurrent)
echo $stats['average_watch_duration_seconds']; // 1245 seconds
echo $stats['total_messages'];          // 89 chat messages
echo $stats['engagement_score'];        // 8.5/10
```

---

## 💬 Chat Features

### Add a Message
```php
$helper->addChatMessage($livestream_id, [
    'sender_user_id' => 42,
    'message' => 'Congratulations!',
    'is_approved' => 1  // 1=show, 0=pending moderation
]);
```

### Moderation
- Messages auto-approved by default
- Set `is_approved = 0` for pending review
- Moderator reviews before display

---

## 👥 Track Viewers

```php
// Record when viewer joins
$viewer_id = $helper->recordViewer($livestream_id, [
    'user_id' => 42,
    'ip_address' => '192.168.1.1',
    'device_type' => 'Mobile'
]);

// Viewer data automatically collected:
// - Join/leave times
// - Watch duration
// - Device info
```

---

## 🎥 Recording & Archives

```php
// Recordings automatically created when livestream ends
// Access via livestream_recordings table

// Retrieve recording info
$recording = $mysqli->query(
    "SELECT * FROM livestream_recordings 
     WHERE livestream_id = $livestream_id"
)->fetch_assoc();

echo $recording['recording_url'];        // Link to video
echo $recording['view_count'];           // Times viewed
echo $recording['recording_quality'];    // 720p, 1080p, etc.
```

---

## 📧 Send Notifications

```php
// Notifications created and sent to parishioners
INSERT INTO livestream_notifications (
    livestream_id, recipient_user_id, 
    notification_type, title, message,
    notification_method, created_at
) VALUES ($id, $user_id, 'Upcoming_Livestream', 
    'Wedding Livestream', 'Join us tomorrow...', 
    'Email', NOW());
```

---

## 🔑 Permissions to Assign

When setting up roles, assign these permissions:

```sql
-- For Administrators/Priests
INSERT INTO role_permissions (role_id, permission_id) 
SELECT r.role_id, p.permission_id 
FROM roles r, permissions p 
WHERE r.role_name = 'Admin' 
  AND p.permission_name IN (
    'manage_livestreams',
    'view_all_livestreams',
    'moderate_livestream_chat',
    'view_livestream_analytics'
);

-- For Parish Secretary
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.role_name = 'Secretary'
  AND p.permission_name IN (
    'manage_livestreams',
    'send_livestream_invitations',
    'moderate_livestream_chat'
);
```

---

## ⚙️ System Configuration

Update these in `parish_config` table:

```sql
UPDATE parish_config SET config_value = 'true' 
WHERE config_key = 'livestream_enabled';

UPDATE parish_config SET config_value = 'youtube' 
WHERE config_key = 'livestream_platform';

UPDATE parish_config SET config_value = '5000' 
WHERE config_key = 'max_concurrent_viewers';
```

---

## 📋 Event Types Supported

- Wedding
- Mass
- Baptism
- Confirmation
- Funeral
- Community_Activity
- Other

---

## 🔗 Link to Existing Events

You can link livestreams to existing event records:

```php
// For a wedding
[
    'event_type' => 'Wedding',
    'event_reference_id' => 42,           // From marriage_records.marriage_id
    'event_reference_type' => 'marriage_records'
]

// For a baptism
[
    'event_type' => 'Baptism',
    'event_reference_id' => 15,           // From baptismal_records.baptism_id
    'event_reference_type' => 'baptismal_records'
]
```

---

## 🧪 Test Query

Quick verification that tables exist:

```sql
SELECT 
    (SELECT COUNT(*) FROM livestream_events) as events,
    (SELECT COUNT(*) FROM livestream_viewers) as viewers,
    (SELECT COUNT(*) FROM livestream_chat) as messages,
    (SELECT COUNT(*) FROM livestream_statistics) as stats;
```

Should return: events=0, viewers=0, messages=0, stats=0 (if new)

---

## 🎯 Common Tasks

### Create & Go Live
```php
$id = $helper->createLivestream($data);
$helper->setAccessControl($id, ['access_type' => 'Public', 'created_by' => 1]);
$helper->updateLivestreamStatus($id, 'Live');
```

### End Event & Record
```php
$helper->updateLivestreamStatus($id, 'Ended');
// Recording auto-created, stats auto-calculated
```

### Get List of Upcoming Events
```php
$upcoming = $helper->getUpcomingLivestreams(30); // Next 30 days
```

### Get Active Livestreams
```php
$live = $helper->getLivestreamsByStatus('Live');
```

### Monitor Activity
```php
$status = $helper->getSystemStatus();
// Returns: total_livestreams, active_livestreams, total_viewers
```

---

## 📞 Support

**Issues?** Check these in order:
1. LIVESTREAM_MIGRATION_README.md (detailed docs)
2. LivestreamMigrationHelper.php (code comments)
3. INSTALLATION_SUMMARY.md (troubleshooting)
4. MySQL error logs

**Questions?** Ask your system administrator or IT department.

---

## 🎓 Learn More

- **Full API Docs:** LivestreamMigrationHelper.php (153 lines of documented code)
- **Database Guide:** LIVESTREAM_MIGRATION_README.md
- **Setup Guide:** INSTALLATION_SUMMARY.md
- **This File:** LIVESTREAM_QUICK_REFERENCE.md

---

**Ready to livestream your church events!** 🎬✨

*Migration created: 2026-05-19*
