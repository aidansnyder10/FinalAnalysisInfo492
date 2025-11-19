# Phishing Coverage Metric Implementation

## Overview
This document describes the implementation of the Phishing Coverage Metric feature for Demo 3. The coverage metric tracks how many people interact with or see phishing emails within a network, providing insights into campaign reach and effectiveness.

## Components

### 1. Phishing Coverage Tracker (`phishing-coverage-tracker.js`)
A client-side module that tracks email events and calculates coverage metrics:
- **Tracks Events**: delivered, opened, clicked, reported
- **Calculates Metrics**: 
  - Coverage percentage (% of targets who opened emails)
  - Click rate (% who clicked links)
  - Report rate (% who reported emails)
  - Time-to-open and time-to-click averages
  - Department and company breakdowns
- **Storage**: Uses localStorage for persistence
- **Snapshots**: Creates historical snapshots for trend analysis

### 2. API Endpoints (`local-server.js`)
Server-side endpoints for coverage tracking:
- **GET `/coverage/metrics`**: Returns current coverage metrics
  - Query params: `campaignId` (optional), `timeWindow` (optional, in hours)
  - Returns: total, delivered, opened, clicked, reported, coverage%, department breakdown
- **POST `/coverage/track`**: Tracks email interaction events
  - Body: `{ emailId, event, emailData }`
  - Events: 'delivered', 'opened', 'clicked', 'reported'

### 3. Hacker Dashboard Integration (`demo3-hacker-dashboard.js`)
- **Coverage Display**: Shows coverage metrics panel with:
  - Overall coverage percentage
  - Total sent, opened, clicked, reported counts
  - Department breakdown with coverage percentages
  - Color-coded indicators (green = good coverage, yellow = moderate, red = low)
- **Auto-tracking**: Automatically tracks email delivery when emails are generated
- **Real-time Updates**: Polls coverage metrics every 5 seconds

### 4. Bank Admin Dashboard Integration (`demo3-bank-admin-dashboard.js`)
- **Coverage Analysis Panel**: Shows coverage metrics from defense perspective:
  - Coverage status (High/Moderate/Low Risk)
  - Department heatmap with visual bars
  - Alert system when coverage drops below threshold (40%)
- **Activity Logging**: Logs coverage alerts to activity log
- **Real-time Updates**: Polls coverage metrics every 5 seconds

## Features

### Coverage Calculation
- **Coverage %**: (Opened emails / Total sent) × 100
- **Click Rate**: (Clicked emails / Total sent) × 100
- **Click-Through Rate**: (Clicked emails / Opened emails) × 100
- **Report Rate**: (Reported emails / Total sent) × 100

### Department Breakdown
- Tracks coverage by department (IT, Security, Operations, etc.)
- Shows department-specific metrics:
  - Total emails sent to department
  - Number opened, clicked, reported
  - Coverage percentage per department

### Time Metrics
- **Time to Open**: Average time from delivery to open (in minutes)
- **Time to Click**: Average time from open to click (in minutes)

### Alerting
- **Threshold**: Alerts when coverage drops below 40%
- **Location**: Bank Admin Dashboard activity log
- **Format**: Warning message with current coverage percentage

## Usage

### For Hackers (Attack Side)
1. Generate phishing emails as usual
2. Coverage metrics automatically appear in the "Phishing Coverage Metrics" panel
3. View:
   - Overall campaign reach
   - Department-specific coverage
   - Click rates and engagement metrics
4. Use insights to:
   - Adjust targeting strategy
   - Identify which departments are most vulnerable
   - Optimize campaign effectiveness

### For Bank Admins (Defense Side)
1. View coverage metrics in the sidebar "Phishing Coverage Analysis" panel
2. Monitor:
   - How many employees are seeing phishing emails
   - Which departments have highest coverage (risk)
   - Report rates (security awareness)
3. Receive alerts when coverage is high (indicating many employees are seeing emails)
4. Use data to:
   - Identify departments needing security training
   - Measure effectiveness of security awareness programs
   - Track improvements over time

## Integration with Existing Systems

### Event System
- Integrates with existing user engagement simulation (`local-server.js`)
- Syncs with email events (sent, opened, clicked, reported)
- Uses same event data for coverage calculations

### Email Portals
- Coverage tracking is automatic when emails are generated
- No manual tracking needed in email portals
- Events are captured from the engagement simulation system

## Data Flow

1. **Email Generation** (Hacker Dashboard)
   - Email created → `trackEmailDelivery()` called
   - Coverage tracker records delivery event
   - API endpoint `/coverage/track` notified

2. **User Engagement** (Simulation System)
   - Events generated: sent, opened, clicked, reported
   - Coverage tracker syncs with events
   - Metrics updated in real-time

3. **Metrics Display** (Both Dashboards)
   - Polls `/coverage/metrics` every 5 seconds
   - Updates UI with latest metrics
   - Shows department breakdown and trends

## Configuration

### Coverage Threshold
Default threshold for alerts: **40%**
- Can be adjusted in `checkCoverageAlerts()` method
- Lower threshold = fewer alerts
- Higher threshold = more alerts

### Polling Interval
Default polling: **5 seconds**
- Can be adjusted in `setupCoverageTracking()` methods
- Shorter interval = more real-time updates (more server load)
- Longer interval = less frequent updates (less server load)

## Future Enhancements

Potential improvements:
1. **Historical Trends**: Chart showing coverage over time
2. **Campaign Comparison**: Compare coverage across multiple campaigns
3. **Export Functionality**: Export coverage reports to CSV/PDF
4. **Custom Thresholds**: Per-department or per-campaign thresholds
5. **Real-time Notifications**: Browser notifications for coverage alerts
6. **Database Integration**: Store coverage data in database instead of localStorage
7. **Advanced Analytics**: Predictive coverage modeling, A/B testing insights

## Technical Notes

- Coverage data is stored in localStorage (client-side)
- Server-side coverage data is stored in `coverage-data.json` (file system)
- In production, should use a proper database (PostgreSQL, MongoDB, etc.)
- Coverage calculations are performed client-side for real-time updates
- API endpoints provide server-side aggregation for consistency

## Testing

To test the coverage metric:
1. Generate emails from Hacker Dashboard
2. Wait for engagement simulation to run (emails will be "opened" and "clicked" automatically)
3. Check coverage metrics in both dashboards
4. Verify department breakdown shows correct data
5. Test alerting by checking if alerts appear when coverage is low

## Troubleshooting

**Coverage metrics not showing:**
- Check browser console for errors
- Verify `phishing-coverage-tracker.js` is loaded
- Check API endpoint `/coverage/metrics` is accessible
- Verify localStorage is enabled

**Coverage percentage seems incorrect:**
- Check that emails are being tracked on delivery
- Verify events are being generated by engagement simulation
- Check that coverage tracker is syncing with events

**Alerts not appearing:**
- Verify threshold is set correctly (default: 40%)
- Check activity log in Bank Admin Dashboard
- Ensure `checkCoverageAlerts()` is being called

