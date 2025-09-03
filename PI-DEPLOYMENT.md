# Raspberry Pi Deployment Guide

This guide will help you deploy FjosetInfo on a Raspberry Pi and access it from other devices on your local network.

## Quick Setup

1. **Run the setup script:**
   ```bash
   chmod +x setup-pi.sh
   ./setup-pi.sh
   ```

2. **Configure your admin password:**
   ```bash
   nano .env
   # Set ADMIN_PASSWORD=your-secure-password
   ```

3. **Start the application:**
   ```bash
   npm run dev
   ```

4. **Find your Pi's IP address:**
   ```bash
   hostname -I
   ```

5. **Access from any device:**
   - Main app: `http://YOUR_PI_IP:8787`
   - Admin panel: `http://YOUR_PI_IP:8787/#admin`

## Detailed Setup

### Prerequisites

- Raspberry Pi with Raspberry Pi OS
- Node.js 18+ installed
- Internet connection (for initial setup and external APIs)

### Installation

1. **Clone or transfer the repository to your Pi:**
   ```bash
   cd /home/pi
   git clone https://github.com/eskbak/FjosetInfo.git
   cd FjosetInfo
   ```

2. **Run the automated setup:**
   ```bash
   ./setup-pi.sh
   ```

   This script will:
   - Create all required directories (`avatars/`, `logs/`)
   - Initialize JSON files with defaults
   - Create a `.env` template
   - Install dependencies
   - Build the frontend
   - Set proper file permissions

3. **Configure environment variables:**
   ```bash
   nano .env
   ```
   
   Essential settings:
   ```bash
   ADMIN_PASSWORD=your-secure-password-here
   PORT=8787
   DEFAULT_LAT=your-latitude
   DEFAULT_LON=your-longitude
   ```

   Optional settings (for full functionality):
   ```bash
   # Google Calendar integration
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REFRESH_TOKEN=your-refresh-token
   GOOGLE_CALENDAR_ID=your-calendar-id

   # Azure Text-to-Speech
   AZURE_TTS_REGION=westeurope
   AZURE_TTS_KEY=your-tts-key
   ```

### Running the Application

#### Development Mode (Manual)
```bash
npm run dev
```

#### Production Mode (Manual)
```bash
npm run build
npm start
```

#### As a System Service (Automatic startup)

1. **Copy the service file:**
   ```bash
   sudo cp fjosetinfo.service /etc/systemd/system/
   ```

2. **Edit the service file if needed:**
   ```bash
   sudo nano /etc/systemd/system/fjosetinfo.service
   # Adjust paths and user as needed
   ```

3. **Enable and start the service:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable fjosetinfo
   sudo systemctl start fjosetinfo
   ```

4. **Check service status:**
   ```bash
   sudo systemctl status fjosetinfo
   ```

5. **View logs:**
   ```bash
   sudo journalctl -u fjosetinfo -f
   ```

## Network Access

### Finding Your Pi's IP Address

```bash
# Method 1: hostname command
hostname -I

# Method 2: ip command
ip route get 1.1.1.1 | awk '{print $7}'

# Method 3: ifconfig (if available)
ifconfig | grep -Eo 'inet [0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}' | grep -v 127.0.0.1
```

### Accessing from Other Devices

Once the server is running, access it from any device on your local network:

- **Main display:** `http://192.168.1.XXX:8787`
- **Admin panel:** `http://192.168.1.XXX:8787/#admin`

Replace `192.168.1.XXX` with your Pi's actual IP address.

### Firewall Configuration

If you have firewall enabled, allow the port:

```bash
# For ufw (Ubuntu/Debian)
sudo ufw allow 8787

# For iptables
sudo iptables -A INPUT -p tcp --dport 8787 -j ACCEPT
```

## Troubleshooting

### Common Issues

#### 1. White Screen / App Won't Load

**Symptoms:** Browser shows white screen or "Loading..." indefinitely

**Solutions:**
- Check if server is running: `curl http://localhost:8787/api/settings`
- Verify JSON files exist and are valid
- Check browser console for errors
- Restart the application

```bash
# Check server status
sudo systemctl status fjosetinfo

# Restart service
sudo systemctl restart fjosetinfo

# View recent logs
sudo journalctl -u fjosetinfo --since "10 minutes ago"
```

#### 2. External APIs Failing

**Symptoms:** Weather, transport, or news data not loading

**Solutions:**
- Check internet connection
- Verify API endpoints are accessible
- Review server logs for specific errors

```bash
# Test internet connectivity
ping -c 3 google.com

# Test specific APIs
curl -s "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=63.4305&lon=10.3951"
```

#### 3. Can't Access from Other Devices

**Symptoms:** Works on Pi but not from phones/tablets

**Solutions:**
- Verify Pi's IP address
- Check firewall settings
- Ensure server is listening on all interfaces (0.0.0.0)
- Try from Pi: `curl http://YOUR_PI_IP:8787`

#### 4. Permission Errors

**Symptoms:** Cannot write files, avatar upload fails

**Solutions:**
```bash
# Fix file permissions
chmod 755 avatars/
chmod 666 *.json
chown -R pi:pi /home/pi/FjosetInfo
```

#### 5. Node.js/NPM Issues

**Symptoms:** Module not found, build failures

**Solutions:**
```bash
# Update Node.js (if needed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clear and reinstall dependencies
rm -rf node_modules package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json
npm install
cd frontend && npm install && npm run build
```

### Logs and Debugging

#### Application Logs
```bash
# If running as service
sudo journalctl -u fjosetinfo -f

# If running manually
npm run dev  # Shows logs in terminal
```

#### System Resources
```bash
# Check memory usage
free -h

# Check disk space
df -h

# Check running processes
ps aux | grep node
```

### Performance Optimization

#### For Raspberry Pi 3/4:
- Consider using PM2 for process management
- Enable GPU memory split for display applications
- Use SSD instead of SD card for better I/O performance

#### PM2 Setup (Alternative to systemd):
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start "npm start" --name fjosetinfo

# Save PM2 configuration
pm2 save

# Enable PM2 at startup
pm2 startup
```

## File Structure

After setup, your Pi should have:

```
/home/pi/FjosetInfo/
├── .env                    # Your configuration
├── setup-pi.sh           # Setup script
├── fjosetinfo.service     # Systemd service file
├── server.ts              # Backend server
├── package.json           # Dependencies
├── frontend/              # React frontend
├── avatars/               # User uploaded images
├── settings.json          # App settings
├── birthdays.json         # Birthday data
├── known-devices.json     # Device presence data
├── notifications.json     # Custom notifications
└── overlays.json          # Overlay configurations
```

## Getting Help

If you continue to have issues:

1. Check the GitHub repository for known issues
2. Review the server logs carefully
3. Test individual API endpoints manually
4. Verify network connectivity and permissions
5. Try running in development mode for more detailed error messages

Remember: The app is designed to work offline with fallback data, so even if external APIs fail, the basic functionality should still work.