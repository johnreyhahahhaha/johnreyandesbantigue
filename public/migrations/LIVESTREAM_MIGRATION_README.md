# Livestream System Migration Documentation

## Overview
This migration adds a complete livestream system to the St. Joseph Parish Management System. The purpose is to allow parishioners who cannot physically attend weddings, masses, baptisms, and other church events to participate remotely via live streaming.

## Files Included
- `2026_05_19_add_livestream_system.sql` - Database schema and table creation
- `LivestreamMigrationHelper.php` - PHP helper class for managing livestream operations

## Database Tables Created

### 1. **livestream_events**
Main table for storing livestream event information.

**Key Columns:**
- `livestream_id` - Primary key
- `event_type` - Type of event (Wedding, Mass, Baptism, Confirmation, Funeral, Community_Activity, Other)
- `event_reference_id` - Link to specific event record (e.g., marriage_records.marriage_id)
- `event_reference_type` - Type of reference (e.g., 'marriage_records')
- `title` - Event title
- `description` - Event description
- `scheduled_start` / `scheduled_end` - Event timing
- `actual_start` / `actual_end` - Actual event timing
- `status` - Current status (Scheduled, Live, Ended, Cancelled)
- `streaming_url` - Primary streaming URL (YouTube, Facebook, etc.)
- `backup_streaming_url` - Backup URL for redundancy
- `location` - Physical location of event
- `current_viewers` - Real-time viewer count

---

### 2. **livestream_viewers**
Track individual viewers of livestream events.

**Key Columns:**
- `viewer_id` - Primary key
- `livestream_id` - Reference to livestream_events
- `viewer_email` - Email of viewer (for guests)
- `user_id` - ID if viewer is registered user
- `ip_address` - Viewer's IP address
- `device_type` - Type of device (Desktop, Mobile, Tablet, Unknown)
- `join_time` - When viewer joined
- `leave_time` - When viewer left
- `watch_duration_seconds` - Total watch time

---

### 3. **livestream_chat**
Chat messages during livestreams with moderation support.

**Key Columns:**
- `chat_id` - Primary key
- `livestream_id` - Reference to livestream_events
- `sender_user_id` - ID of message sender (if registered)
- `sender_name` - Sender name (for guests)
- `sender_email` - Sender email
- `message` - Chat message content
- `is_moderated` - Whether message was reviewed
- `is_approved` - Whether message is approved to display
- `moderated_by` - User who moderated (if applicable)
- `moderation_reason` - Reason for moderation

---

### 4. **livestream_access_control**
Control access permissions for each livestream.

**Key Columns:**
- `access_id` - Primary key
- `livestream_id` - Reference to livestream_events
- `access_type` - Public, Private, Members_Only, or Invited
- `is_password_protected` - Requires password to view
- `password_hash` - Hashed password
- `allow_chat` - Enable/disable chat during event
- `allow_guest_viewers` - Allow non-registered users
- `require_email_registration` - Require email to view

---

### 5. **livestream_invitations**
Track invitations sent to specific people for private livestreams.

**Key Columns:**
- `invitation_id` - Primary key
- `livestream_id` - Reference to livestream_events
- `recipient_email` - Email address of invitee
- `invitation_code` - Unique code for accepting invitation
- `status` - Pending, Accepted, Viewed, Rejected, Expired
- `expires_at` - When invitation expires (default: 30 days)

---

### 6. **livestream_recordings**
Store information about recorded livestreams for replay.

**Key Columns:**
- `recording_id` - Primary key
- `livestream_id` - Reference to livestream_events
- `recording_url` - URL to access the recording
- `thumbnail_url` - Recording preview image
- `file_size_bytes` - Size of recording file
- `duration_seconds` - Total duration
- `recording_quality` - Quality level (360p, 480p, 720p, 1080p, 2k, 4k)
- `access_level` - Public, Private, or Members_Only
- `view_count` - Number of times recording viewed
- `recording_started_at` / `recording_ended_at` - Recording timestamps

---

### 7. **livestream_statistics**
Analytics and engagement metrics for livestreams.

**Key Columns:**
- `stat_id` - Primary key
- `livestream_id` - Reference to livestream_events
- `total_viewers` - Total unique viewers
- `peak_viewers` - Maximum concurrent viewers
- `peak_viewers_time` - Time of peak viewership
- `average_watch_duration_seconds` - Average viewing duration
- `total_messages` - Total chat messages
- `engagement_score` - Calculated engagement metric
- `tech_issues_reported` - Number of technical issues reported

---

### 8. **livestream_notifications**
Send notifications to parishioners about upcoming and ongoing livestreams.

**Key Columns:**
- `notif_id` - Primary key
- `livestream_id` - Reference to livestream_events
- `recipient_user_id` - Recipient of notification
- `notification_type` - Type of notification
- `title` - Notification title
- `message` - Notification message
- `is_sent` - Whether notification was sent
- `is_read` - Whether recipient read it
- `notification_method` - Email, In-System, SMS, or Push

---

## Permissions Added
The following permissions are available for role-based access control:

- `manage_livestreams` - Create and manage livestreams
- `view_all_livestreams` - View all livestreams
- `moderate_livestream_chat` - Moderate chat messages
- `send_livestream_invitations` - Send invitations to viewers
- `view_livestream_analytics` - View statistics and analytics
- `manage_livestream_recordings` - Manage recorded videos
- `access_private_livestreams` - Access private/restricted livestreams

---

## Configuration Settings
The following configuration keys are added to `parish_config`:

| Config Key | Default | Description |
|-----------|---------|-------------|
| `livestream_enabled` | `true` | Enable/disable livestream feature |
| `livestream_platform` | `youtube` | Primary platform (youtube, facebook, custom) |
| `max_concurrent_viewers` | `1000` | Maximum viewers allowed simultaneously |
| `enable_chat` | `true` | Enable chat during livestreams |
| `enable_recordings` | `true` | Enable automatic recording |
| `recording_retention_days` | `90` | Days to keep recordings |
| `default_access_level` | `public` | Default access for new livestreams |
| `require_viewer_email` | `false` | Require email from guest viewers |

---

## How to Run the Migration

### Option 1: Using PHP Script
```php
<?php
// Include the helper class
require_once 'migrations/LivestreamMigrationHelper.php';

// Create database connection
$mysqli = new mysqli("localhost", "user", "password", "josephus_parish_system");

if ($mysqli->connect_error) {
    die("Connection failed: " . $mysqli->connect_error);
}

// Run migration
$helper = new LivestreamMigrationHelper($mysqli);
if ($helper->runMigration()) {
    echo "Migration completed successfully!";
    
    // Check system status
    $status = $helper->getSystemStatus();
    print_r($status);
} else {
    echo "Migration failed!";
}

$mysqli->close();
?>
```

### Option 2: Using phpMyAdmin
1. Open phpMyAdmin
2. Select the `josephus_parish_system` database
3. Click "SQL" tab
4. Copy and paste the contents of `2026_05_19_add_livestream_system.sql`
5. Click "Go" to execute

### Option 3: Using MySQL Command Line
```bash
mysql -u username -p josephus_parish_system < 2026_05_19_add_livestream_system.sql
```

---

## API Usage Examples

### Create a New Livestream Event
```php
$helper = new LivestreamMigrationHelper($connection);

$livestream_data = [
    'event_type' => 'Wedding',
    'event_reference_id' => 5, // ID from marriage_records
    'event_reference_type' => 'marriage_records',
    'title' => 'John & Maria Wedding Ceremony',
    'description' => 'Join us as John and Maria exchange vows',
    'scheduled_start' => '2026-06-15 14:00:00',
    'scheduled_end' => '2026-06-15 16:00:00',
    'status' => 'Scheduled',
    'streaming_url' => 'https://youtube.com/watch?v=xxxxx',
    'location' => 'St. Joseph Church Main Hall',
    'created_by' => 1 // User ID of creator
];

$livestream_id = $helper->createLivestream($livestream_data);
echo "Livestream created with ID: $livestream_id";
```

### Start a Livestream
```php
$helper->updateLivestreamStatus($livestream_id, 'Live');
```

### Record a Viewer
```php
$viewer_data = [
    'user_id' => 42,
    'device_type' => 'Mobile'
];

$viewer_id = $helper->recordViewer($livestream_id, $viewer_data);
```

### Add Chat Message
```php
$message_data = [
    'sender_user_id' => 42,
    'message' => 'Congratulations to the happy couple!',
    'is_approved' => 1
];

$chat_id = $helper->addChatMessage($livestream_id, $message_data);
```

### Get Upcoming Livestreams
```php
$upcoming = $helper->getUpcomingLivestreams(30); // Next 30 days
foreach ($upcoming as $event) {
    echo $event['title'] . " - " . $event['scheduled_start'] . "\n";
}
```

### Send Invitation
```php
$invitation_code = $helper->sendInvitation(
    $livestream_id,
    'parishioner@example.com',
    1 // sender user_id
);
echo "Invitation code: " . $invitation_code;
```

### Get Livestream Statistics
```php
$stats = $helper->getLivestreamStats($livestream_id);
echo "Total viewers: " . $stats['total_viewers'];
echo "Peak viewers: " . $stats['peak_viewers'];
echo "Engagement score: " . $stats['engagement_score'];
```

---

## Use Cases

### 1. **Weddings**
- Stream wedding ceremony live so distant relatives can participate
- Record for those who couldn't watch live
- Access control: Private (for invited guests only)

### 2. **Sunday Masses**
- Live stream all Sunday services
- Access control: Public (anyone can watch)
- Enable chat for prayer requests and communion

### 3. **Baptisms & Confirmations**
- Stream sacramental celebrations
- Link to related sacramental records
- Send notifications to godparents and sponsors

### 4. **Community Activities**
- Stream community meetings, seminars, workshops
- Interactive chat for Q&A sessions
- Record for future reference

### 5. **Funeral Masses**
- Stream funeral masses for remote family members
- Private access for invited attendees
- Archive for family remembrance

---

## Best Practices

1. **Set Clear Policies**: Define which events will be livestreamed and access rules
2. **Respect Privacy**: Use private access for intimate ceremonies
3. **Moderate Chat**: Keep chat moderated to maintain respectful environment
4. **Record Important Events**: Archive significant events for parish records
5. **Notify Parishioners**: Send notifications about upcoming livestreams
6. **Monitor Technical Issues**: Track and resolve streaming problems quickly
7. **Manage Recordings**: Maintain appropriate retention period for archived videos

---

## System Requirements

- MySQL 5.7 or higher (MariaDB 10.0+)
- PHP 7.4 or higher with MySQLi extension
- Streaming platform account (YouTube, Facebook, etc.)
- Adequate storage for recordings
- Stable internet connection for streaming

---

## Support and Troubleshooting

### Tables Not Created?
- Verify database connection
- Check MySQL user permissions
- Ensure SQL syntax compatibility

### Performance Issues?
- Add indexes on frequently queried fields
- Archive old livestream records
- Optimize recording storage

### Chat Moderation?
- Set up automated word filters if needed
- Train moderators on community guidelines
- Review moderation logs regularly

---

## Future Enhancements

- Integration with Zoom, OBS Studio
- Automated subtitle/caption generation
- Multi-language support
- Advanced analytics dashboard
- Mobile app notifications
- Social media sharing integration
- Virtual giving during livestreams
- Interactive polls and surveys

---

## Contact & Support

For issues or questions about the livestream system, contact the IT department or system administrator.

---

**Migration Date:** May 19, 2026  
**Version:** 1.0  
**Status:** Production Ready
