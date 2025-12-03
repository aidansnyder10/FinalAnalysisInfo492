<Project Title> — <Industry> — <Defense/Offense>
Course: INFO 498B — Agentic Cybersecurity with AI & LLMs
Team: <Team # — names/NetIDs>
One-line pitch: <What it does, for whom, why it matters>
1) Live Demo
Synthetic Industry: <URL> — status: <Up/Down> — test creds (fake): <user / pass>


Agentic System: <URL> — status: <Up/Down> — notes: <brief>


Logs/Observability (optional): <URL or path>


2) Thesis & Outcome
Original thesis (week 2): <1–2 sentences>


Final verdict: <True / False / Partially true>


Why (top evidence):


<Evidence 1>


<Evidence 2>


<Evidence 3>


3) What We Built
Synthetic industry: <APIs/services, roles, data generator>


Agentic system: <agents, tools, model providers, memory/eval>


Key risks addressed (or exercised): <bullets>


4) Roles, Auth, Data
Roles & permissions: <Role → capabilities>


Authentication: <how roles are authenticated and scoped>


Data: synthetic only; generator + brief schema description


5) Experiments Summary (Demos #3 - #5)
Demo #3: <hypothesis> — <setup> — Result: <pass/fail + one sentence> — Evidence: <link/note>


Demo #4 (continuous run): uptime <xx.x%>, incidents <n>, Improvement observed: <yes/no + brief>


Demo #5 (final): <what was validated> — Result: <one sentence> — Evidence: <link/note>


6) Key Results (plain text)
Effectiveness: <e.g., detection/attack success %, MTTR trend>


Reliability: <uptime / error patterns>


Safety: <policy violations blocked, guardrails that mattered>


7) How to Use / Deploy
Prereqs: <accounts, env vars, keys (fake for lab), storage>


Deploy steps: see docs/deploy.md


Test steps: see docs/test-plan.md


8) Safety, Ethics, Limits
Synthetic data only; no real credentials or org systems.


Controls: <role gating, throttling, sandboxing, policy checks>.


Known limits/failure modes: <brief list>.


9) Final Deliverables
1000-word paper: <link>


Slides: <link>


Evidence folder (logs/screens): /evidence/


10) Next Steps
<Top improvement 1>


<Top improvement 2>


<Top improvement 3>


Maintainers: <names> • Contact: <email>


# SecureBank Admin Portal

A realistic fake digital bank admin dashboard built with HTML, CSS, JavaScript, and Supabase integration.

## Features

- **Secure Login System** with fake credentials
- **Comprehensive Admin Dashboard** with real banking metrics
- **Customer Management** - View and manage customer accounts
- **Transaction Monitoring** - Real-time transaction tracking
- **Fraud Detection** - Advanced fraud alert system
- **System Health Monitoring** - Server and database metrics
- **Real-time Updates** via Supabase
- **Responsive Design** - Works on desktop and mobile

## Demo Login Credentials

### Admin Portal
- **Email**: admin@securebank.com
- **Password**: AdminSecure2024!
- **2FA Code**: 123456

### Customer Portal
- **Email:** user@securebank.com  
- **Password:** UserSecure2024!  
- **2FA Code:** 654321

### Business Customer Portal
- **Email:** business@securebank.com
- **Password:** BusinessSecure2024!
- **2FA Code:** 246810

### Support Representative Portal
- **Email:** support@securebank.com
- **Password:** SupportSecure2024!
- **2FA Code:** 789012 

## Quick Start

1. **Clone or download** the project files
2. **Open `index.html`** in your web browser
3. **Use the demo credentials** above to login
4. **Explore the admin dashboard**

## Supabase Integration (Optional)

To use real database functionality:

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### 2. Set Up the Database

1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the SQL to create all tables and sample data

### 3. Configure the Application

1. Open `script.js`
2. Replace the placeholder values:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL'
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'
   ```
3. Replace with your actual Supabase credentials

### 4. Enable Real-time Features

The application will automatically:
- Load real data from Supabase
- Update in real-time when data changes
- Log admin activities
- Provide live fraud monitoring

## Project Structure

```
├── index.html          # Main HTML file
├── styles.css          # All CSS styling
├── script.js           # JavaScript functionality
├── supabase-schema.sql # Database schema
└── README.md          # This file
```

## Dashboard Sections

### 1. Overview
- Total customers, assets, and transactions
- Daily metrics and growth indicators
- Recent activity feed
- Visual charts (placeholder for now)

### 2. Customer Management
- Customer directory with search
- Account balances and status
- Quick actions (view, edit, suspend)
- Customer registration tools

### 3. Transaction Monitoring
- Real-time transaction feed
- Filter by status, date, amount
- Transaction approval workflow
- Detailed transaction history

### 4. Fraud Detection
- Risk-based alert system
- Automated fraud scoring
- Manual review workflow
- Fraud prevention statistics

### 5. System Health
- Database performance metrics
- API response times
- Server resource usage
- System event logs

## Security Features

- **Multi-factor Authentication** (2FA)
- **Session Management** with localStorage
- **Activity Logging** for audit trails
- **Role-based Access** (admin-only)
- **Secure Credential Validation**

## Technologies Used

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with gradients and animations
- **JavaScript (ES6+)** - Interactive functionality
- **Supabase** - Backend database and real-time features
- **Font Awesome** - Professional icons
- **Responsive Design** - Mobile-first approach

## Customization

### Changing Login Credentials

Edit the `FAKE_ADMIN_CREDENTIALS` object in `script.js`:

```javascript
const FAKE_ADMIN_CREDENTIALS = {
    email: 'your-email@domain.com',
    password: 'YourPassword123!',
    mfa: '654321'
}
```

### Adding New Dashboard Sections

1. Add navigation item in HTML
2. Create section content
3. Add JavaScript functionality
4. Update navigation handlers

### Styling Customization

The CSS uses CSS custom properties for easy theming:

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --success-color: #28a745;
    --warning-color: #ffc107;
    --danger-color: #dc3545;
}
```

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

This is a demo project for educational purposes. Feel free to use and modify as needed.

## Support

For issues or questions:
1. Check the browser console for errors
2. Ensure Supabase credentials are correct
3. Verify database schema is properly set up
4. Check network connectivity

## Future Enhancements

- [ ] Chart.js integration for data visualization
- [ ] Advanced search and filtering
- [ ] Export functionality for reports
- [ ] Email notifications for alerts
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Advanced user permissions
- [ ] API rate limiting
- [ ] Data encryption at rest
- [ ] Audit trail improvements
