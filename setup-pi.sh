#!/bin/bash

# Raspberry Pi Setup Script for FjosetInfo
# This script initializes all required files and configurations for Pi deployment

set -e

echo "🍓 Setting up FjosetInfo for Raspberry Pi..."

# Create required directories
echo "📁 Creating required directories..."
mkdir -p avatars
mkdir -p logs

# Initialize settings.json with defaults if it doesn't exist
if [ ! -f "settings.json" ]; then
    echo "⚙️ Creating default settings.json..."
    cat > settings.json << 'EOF'
{
  "viewsEnabled": {
    "dashboard": true,
    "news": true,
    "calendar": true
  },
  "dayHours": {
    "start": 6,
    "end": 18
  },
  "calendarDaysAhead": 4,
  "rotateSeconds": 45
}
EOF
fi

# Initialize birthdays.json if it doesn't exist
if [ ! -f "birthdays.json" ]; then
    echo "🎂 Creating empty birthdays.json..."
    echo "[]" > birthdays.json
fi

# Initialize known-devices.json if it doesn't exist
if [ ! -f "known-devices.json" ]; then
    echo "📱 Creating empty known-devices.json..."
    echo "[]" > known-devices.json
fi

# Initialize notifications.json if it doesn't exist
if [ ! -f "notifications.json" ]; then
    echo "📢 Creating empty notifications.json..."
    echo "[]" > notifications.json
fi

# Initialize overlays.json if it doesn't exist
if [ ! -f "overlays.json" ]; then
    echo "📋 Creating empty overlays.json..."
    cat > overlays.json << 'EOF'
{
  "overlays": []
}
EOF
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "🔐 Creating .env template..."
    cat > .env << 'EOF'
# Admin password for /admin access
ADMIN_PASSWORD=your-secure-password-here

# Optional: Set specific port (default is 8787)
# PORT=8787

# Optional: Configure API endpoints
# ET_CLIENT_NAME=pi-infoscreen/1.0 (your-email@example.com)
# MET_USER_AGENT=pi-infoscreen/1.0 (your-email@example.com)

# Optional: Set default coordinates for weather
# DEFAULT_LAT=63.4305
# DEFAULT_LON=10.3951

# Optional: Google Calendar integration
# GOOGLE_CLIENT_ID=your-client-id
# GOOGLE_CLIENT_SECRET=your-client-secret
# GOOGLE_REFRESH_TOKEN=your-refresh-token
# GOOGLE_CALENDAR_ID=your-calendar-id

# Optional: Presence detection settings
# PRESENCE_MODE=auto
# PRESENCE_SCAN_INTERVAL_SEC=10
# ARP_PRESENT_TTL_SEC=20

# Optional: Azure TTS settings
# AZURE_TTS_REGION=westeurope
# AZURE_TTS_KEY=your-tts-key
# AZURE_TTS_VOICE=nb-NO-FinnNeural
EOF
    echo "⚠️  Please edit .env file and set ADMIN_PASSWORD before running the app!"
fi

# Set proper permissions
echo "🔒 Setting file permissions..."
chmod 644 *.json
chmod 755 avatars
chmod 644 .env

# Check Node.js version
echo "🔍 Checking Node.js version..."
NODE_VERSION=$(node --version 2>/dev/null || echo "not installed")
if [[ "$NODE_VERSION" == "not installed" ]]; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Extract major version
NODE_MAJOR=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "⚠️  Warning: Node.js version $NODE_VERSION detected. Version 18+ recommended."
fi

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build frontend if it exists
if [ -d "frontend" ]; then
    echo "🏗️ Building frontend..."
    cd frontend
    npm install
    npm run build
    cd ..
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file and set your ADMIN_PASSWORD"
echo "2. Configure any optional settings in .env"
echo "3. Run: npm run dev (for development) or npm start (for production)"
echo "4. Access the app at: http://your-pi-ip:8787"
echo "5. Access admin panel at: http://your-pi-ip:8787/#admin"
echo ""
echo "🔍 To find your Pi's IP address: hostname -I"
echo ""