# Identity Resolution Visualizer

A comprehensive React application for building, simulating, and analyzing event processing workflows using Segment's API specifications. This tool helps developers understand identity resolution processes and profile data management.

## Features

### 🎯 Event Simulation
- **Interactive Event Builder**: Create custom events with dynamic payloads
- **Pre-built Event Templates**: Core events (Track, Page, Screen, Identify, Alias) and Product events (Product Viewed, Cart Updated, Order Completed, etc.)
- **Real-time Event Processing**: Simulate event sequences with configurable timing
- **Event History Management**: Track, edit, and remove events from your simulation

### 👤 Identity Management
- **Current User Tracking**: Monitor active user state and identity changes
- **Unique Users Display**: Visual representation of all users across events
- **User Context Switching**: Switch between different user profiles seamlessly
- **Identity Resolution Visualization**: See how events link users together

### 📊 Analytics & Insights  
- **Interactive Statistics**: Real-time event counts, user metrics, and data analysis
- **Visual Dashboards**: Collapsible cards with detailed event information
- **Smart Tooltips**: Hover effects and contextual information display
- **Data Export**: JSON payload inspection and debugging tools

### 🔌 Segment Profile API Integration
- **Profile API Lookup Tool**: Query Segment Profile API endpoints directly from the UI
- **Multi-endpoint Support**: Access traits, external_ids, events, metadata, and links
- **Configuration Management**: Secure API credential storage and management
- **Query Parameter Control**: Fine-tune API requests with filters and pagination

### 🎨 Modern UI/UX
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dark Mode Support**: Automatic theme switching based on system preferences
- **Smooth Animations**: Polished interactions and transitions
- **Grid-based Layouts**: Flexible, adaptive component arrangement

## Getting Started

### Prerequisites
- **Node.js** (v16+ recommended)
- **npm** package manager
- **Segment workspace** with Profile API access (optional, for API features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lizkane222/identity-resolution-visualizer.git
   cd identity_resolution_visualizer
   ```

2. **Install dependencies with automatic setup**
   ```bash
   npm install
   ```
   
   > 🎉 **NEW: Automatic Environment Setup**: 
   > - The `.env` file is **automatically created** from `.env.example` during installation
   > - **No manual file copying required** - the postinstall script handles everything
   > - Perfect for **forked repositories** - eliminates setup friction for new contributors
   > - Includes helpful next-steps guidance after environment file creation

3. **Configure environment variables**
   
   A `.env` file is automatically created during `npm install`. Open it and replace the placeholder values:
   
   **Required Environment Variables:**
   ```env
   # React Development Configuration
   SKIP_PREFLIGHT_CHECK=true
   
   # Segment Profile API Configuration (Required for API features)
   SEGMENT_SPACE_ID=your_segment_space_id_here
   SEGMENT_ACCESS_TOKEN=your_segment_access_token_here
   
   # Optional: Advanced Segment Configuration
   SEGMENT_UNIFY_WORKSPACE_SLUG=your_workspace_slug
   SEGMENT_UNIFY_SPACE_SLUG=your_unify_space_slug
   SEGMENT_UNIFY_SPACE_FULL_URL=https://app.segment.com/your-workspace/unify/spaces/your-space/settings/api-access
   
   # Optional: Source Configuration (JSON string)
   SEGMENT_SOURCES_CONFIG=[{"id":"javascript-source-1","name":"Your Source Name","type":"javascript","enabled":true,"settings":{"writeKey":"your_write_key"}}]
   
   # Optional: Integrations Configuration (JSON string)
   SEGMENT_INTEGRATIONS_CONFIG={"personas":true}
   ```

   > 💡 **Manual Setup Options**: 
   > - **Automatic**: Environment setup runs automatically during `npm install` (recommended)
   > - **Manual Script**: Run `npm run setup` if you need to recreate the `.env` file
   > - **Manual Copy**: Copy `.env.example` to `.env` manually if scripts fail

### Development

#### 🆕 Installation & Setup Scripts

**NEW: Automated Environment Setup**
```bash
# Automatic setup (runs during npm install)
npm install                    # Automatically creates .env from .env.example

# Manual environment setup
npm run setup                  # Creates .env file with guided setup instructions

# Setup verification
ls -la .env                    # Verify .env file was created successfully
```

> 🎯 **What's New in Setup**:
> - **Zero-friction installation**: No manual file copying required
> - **Postinstall automation**: Environment file created automatically after `npm install`  
> - **Fork-friendly**: Eliminates setup barriers for repository forks and new contributors
> - **Guided setup**: Helpful next-steps provided after environment file creation
> - **Error handling**: Robust setup script with clear success/failure messaging

#### 🚀 Quick Start - Run Full Application
```bash
npm run dev
```
This command starts both the React frontend and Express backend server concurrently:
- **Frontend**: [http://localhost:3000](http://localhost:3000) 
- **Backend**: [http://localhost:8888](http://localhost:8888)

#### Individual Component Commands

**Frontend only (React development server):**
```bash
npm start
```
Runs the React app at [http://localhost:3000](http://localhost:3000)

**Backend only (Express server):**
```bash
npm run server  
```
Starts the Express server at [http://localhost:8888](http://localhost:8888)

**Production build serving:**
```bash
npm run dev-prod
```
Serves the built React app with the backend server

#### 🛑 Stop Commands
```bash
# Stop all processes (React + Backend)
npm run stop

# Stop only the backend server
npm run stop-server

# Stop only the React development server  
npm run stop-client
```

### Environment Variables Guide

#### Core Variables (Required for API Features)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `SEGMENT_SPACE_ID` | Your Segment space identifier | `spa_8hTmsKx9TQPcw2nRsKWB1D` | Yes* |
| `SEGMENT_ACCESS_TOKEN` | Segment Profile API access token | `kuCb6ceAj0D3Sws8Bso2cVueFNlTqjWc...` | Yes* |
| `SKIP_PREFLIGHT_CHECK` | Prevents React build warnings | `true` | Recommended |

*Required only if you want to use the Profile API lookup features

#### Optional Configuration Variables

| Variable | Description | Format |
|----------|-------------|--------|
| `SEGMENT_UNIFY_WORKSPACE_SLUG` | Your Segment workspace identifier | String |
| `SEGMENT_UNIFY_SPACE_SLUG` | Your Unify space slug | String |
| `SEGMENT_UNIFY_SPACE_FULL_URL` | Direct link to your space settings | URL |
| `SEGMENT_SOURCES_CONFIG` | Source configuration for event simulation | JSON Array |
| `SEGMENT_INTEGRATIONS_CONFIG` | Integration settings | JSON Object |

#### Getting Your Segment Credentials

1. **Space ID**: Found in your Segment workspace URL or API settings
2. **Access Token**: 
   - Go to your Segment workspace
   - Navigate to Settings → API Access
   - Create a new access token with Profile API permissions
   - Copy the token (it will only be shown once)

### Port Configuration

The application uses the following ports by default:

- **React Frontend**: `3000`
- **Express Backend**: `8888` 
- **Proxy Configuration**: React proxies API calls to port `8888`

**Note**: Port `8888` is configured in `server/server.js` and the React proxy in `package.json`

### Configuration

#### Segment Profile API Setup
1. Click the **⚙️ Config** button in the application header
2. Enter your Segment Space ID and Access Token
3. Click **Save Configuration** to enable Profile API features
4. Use the **🔍 Lookup** button to access the Profile API Lookup tool

#### Environment Management
- Configuration is stored in a local `.env` file
- Settings persist between application restarts  
- API credentials are securely managed and masked in the UI

## Usage Guide

### Building Events
1. **Select Event Type**: Choose from Core Events or Product Events buttons
2. **Customize Payload**: Modify the JSON payload in the Event Builder
3. **Set User Context**: Configure user identity in the Current User section
4. **Save Event**: Click "Save Event" to add to your simulation

### Profile API Lookups
1. **Configure API Access**: Set up your Segment credentials via the Config modal
2. **Open Lookup Tool**: Click the 🔍 Lookup button in the header
3. **Enter Identifier**: Format as `id_type:value` (e.g., `user_id:12345`)
4. **Select Endpoint**: Choose from traits, external_ids, events, metadata, or links
5. **Configure Parameters**: Set query limits, filters, and pagination options
6. **Execute Lookup**: View formatted JSON results

### Event Analysis
- **Statistics Dashboard**: Monitor real-time metrics in the collapsible cards
- **Unique Users Panel**: See all users identified across your events
- **Event History**: Review, edit, and manage your event sequence in the sidebar
- **Interactive Elements**: Hover over elements for additional context and information

## Architecture

### Frontend (React)
- **Component Structure**: Modular, reusable components with clear separation of concerns
- **State Management**: React hooks (useState, useEffect, useCallback) for optimal performance
- **Styling**: CSS Grid and Flexbox with responsive design patterns
- **API Integration**: Fetch API for backend communication with error handling

### Backend (Express.js)
- **RESTful API**: Clean endpoints for Segment Profile API proxy
- **Authentication**: Base64 encoded headers for Segment API access  
- **CORS Support**: Cross-origin requests enabled for frontend integration
- **Environment Management**: Dynamic .env file updates and secure credential storage
- **Error Handling**: Comprehensive error responses and logging

### Key Components
- **App.jsx**: Main application orchestrator and layout manager
- **EventBuilder**: Dynamic event creation with JSON editing
- **ProfileLookup**: Segment Profile API query interface
- **SegmentConfig**: API credential management modal
- **EventList**: Event history sidebar with statistics
- **UniqueUsersList**: Horizontal user card display
- **CurrentUser**: Active user state management

## API Endpoints

### Configuration Management
- `GET /api/config` - Check current configuration status
- `POST /api/config` - Update Segment API credentials

### Profile API Proxy
- `GET /api/profiles/:identifier/traits` - Get user traits
- `GET /api/profiles/:identifier/external_ids` - Get external identifiers  
- `GET /api/profiles/:identifier/events` - Get user events
- `GET /api/profiles/:identifier/metadata` - Get profile metadata
- `GET /api/profiles/:identifier/links` - Get profile links

All endpoints support query parameters for filtering, pagination, and result customization.

## Development

### Project Structure
```
src/
├── components/           # React components
│   ├── EventBuilder/    # Event creation interface
│   ├── ProfileLookup/   # API lookup tool  
│   ├── SegmentConfig/   # Configuration modal
│   ├── CurrentUser/     # User state management
│   ├── EventList/       # Event history sidebar
│   └── UniqueUsersList/ # User visualization
├── utils/               # Helper functions and utilities
└── App.jsx             # Main application component

server/
└── server.js           # Express backend server
```

### Build Commands
- `npm run build` - Production build
- `npm test` - Run test suite  
- `npm run eject` - Eject from Create React App (irreversible)

#### 🆕 New Setup & Environment Scripts
- **`npm run setup`** - Manually create `.env` file from `.env.example` with guided instructions
- **`npm run postinstall`** - Automatic environment setup (runs after `npm install`)

> 📦 **Package.json Updates**: 
> - Added `"postinstall": "node scripts/setup-env.js"` for automatic setup
> - Added `"setup": "node scripts/setup-env.js"` for manual environment configuration
> - Created `scripts/setup-env.js` utility for robust environment file management

### Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)  
3. Make your changes and test thoroughly
4. Commit your changes (`git commit -am 'Add new feature'`)
5. Push to the branch (`git push origin feature/new-feature`)
6. Create a Pull Request

## Troubleshooting

### Environment File Issues

**🆕 IMPROVED: Automatic Environment Setup**

**Problem**: `.env` file wasn't created automatically
```bash
# NEW: Preferred solution - Use automated setup script
npm run setup

# Alternative: Re-run the postinstall script manually
npm run postinstall

# Fallback: Manual copy (if scripts fail)
cp .env.example .env
```

**Problem**: Application fails to start with environment variable errors
```bash
# Step 1: Check if .env file exists
ls -la .env

# Step 2: If missing, use automated setup (NEW)
npm run setup

# Step 3: Verify .env file structure
cat .env

# Step 4: If still having issues, reinstall with automatic setup
rm .env && npm install
```

**🎯 NEW: Forked Repository Setup**
The repository now includes **automatic environment setup** for forked repositories:

1. **Automatic Setup** (runs during `npm install`):
   - ✅ Creates `.env` file from `.env.example` template
   - ✅ Provides guided next-steps for credential configuration
   - ✅ No manual file copying required

2. **Manual Setup** (if automatic setup fails):
   ```bash
   npm run setup              # Run the setup script manually
   ```

3. **Verification Steps**:
   ```bash
   # Check if setup was successful
   ls -la .env                # Should show .env file exists
   head -5 .env              # Should show environment variables
   ```

**Problem**: Repository fork has missing environment configuration
1. ✅ **Automatic**: Run `npm install` (environment setup is now automatic)
2. ✅ **Manual backup**: If automatic setup fails, run `npm run setup`
3. ✅ **Verification**: Check that `.env.example` exists and `.env` was created
4. ✅ **Configuration**: Edit `.env` file with your actual Segment credentials

### Common Issues
- **API Configuration**: Ensure valid Segment Space ID and Access Token
- **Port Conflicts**: Default ports are 3000 (frontend) and 8888 (backend)
- **CORS Errors**: Make sure both frontend and backend are running for API features
- **Build Failures**: Clear node_modules and run `npm install` if experiencing dependency issues

### Port Management & Conflicts

**Problem**: Port conflicts when starting the application
```bash
# Quick port cleanup
npm run stop                   # Use built-in stop commands

# Manual port cleanup (if stop commands fail)
lsof -ti:3000 | xargs kill     # Kill processes on port 3000
lsof -ti:8888 | xargs kill     # Kill processes on port 8888
```

🛡️ **Future Prevention Tip**:

Use a tool like `concurrently` with proper error handling, or check for running servers before starting new ones. You could also add a script like:

```json
"scripts": {
  "kill-ports": "fuser -k 3000/tcp || true && fuser -k 8888/tcp || true"
}
```

> 💡 **Pro Tip**: The `|| true` ensures the script doesn't fail if no processes are running on those ports, making it safe to run anytime.

### Support
For issues and questions:
1. Check the browser console for error messages
2. Verify your Segment API credentials and permissions
3. Ensure all dependencies are properly installed
4. Review the server logs for backend-related issues

---

Built with React, Express.js, and the Segment Profile API for comprehensive identity resolution visualization and testing.
