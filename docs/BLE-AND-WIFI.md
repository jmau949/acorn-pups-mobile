# BLE and WiFi Provisioning Guide

This document explains how the Bluetooth Low Energy (BLE) and WiFi provisioning system works in the Acorn Pups mobile app. This system allows users to scan QR codes, connect to ESP32 devices via BLE, provision WiFi credentials, and automatically register devices with authentication.

## 🎯 Overview

The app follows this enhanced flow:

1. **QR Code Scanning** → Get device name from QR code
2. **BLE Discovery** → Find the ESP32 device advertising over Bluetooth
3. **BLE Connection** → Connect to the device
4. **Enhanced WiFi Provisioning** → Send WiFi credentials + authentication token + device metadata
5. **Status Monitoring** → Track provisioning progress
6. **Device Registration** → ESP32 automatically registers with backend using provided auth token
7. **Completion** → Device restarts and connects to WiFi

## 📱 User Experience Flow

```
Camera Screen → QR Scan → BLE Search → WiFi Setup → Success
     ↓              ↓           ↓           ↓          ↓
   Scan QR     Find Device   Connect    Send WiFi   Complete
```

## 🔍 QR Code System

### QR Code Format

```json
{
  "deviceName": "AcornPups-B901"
}
```

### Device Name Validation

- Must follow exact pattern: `AcornPups-{deviceid}`
- Example valid names: `AcornPups-1234`, `AcornPups-B901`
- Case-sensitive matching

### Implementation

- **File**: `src/utils/qrCodeParser.ts`
- **Camera**: `src/screens/CameraScreen.tsx`
- **Throttling**: 2-second minimum between scans to prevent spam

## 📡 BLE (Bluetooth Low Energy) System

### Core Library

- **Library**: `react-native-ble-plx`
- **Service**: `src/services/bleService.ts`
- **Types**: `src/types/ble.ts`

### Permissions

#### Android

```xml
<!-- Required for BLE scanning -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" android:usesPermissionFlags="neverForLocation" />
```

#### iOS

```xml
<!-- Bluetooth usage description -->
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app uses Bluetooth to connect to Acorn Pups devices for setup</string>
```

### Device Discovery Process

#### 1. Start Scanning

```typescript
// Scan for devices with "AcornPups" in their name
await bleService.startScanning("AcornPups", onDeviceFound, onError);
```

#### 2. Device Filtering

- Only devices with names matching `AcornPups-*` pattern
- Real-time RSSI signal strength monitoring
- Automatic duplicate handling

#### 3. Auto-Connection

- When QR scanned device is found → automatic connection
- Connection state monitoring via callbacks
- Timeout handling (15 seconds)

### BLE Connection Management

#### Connection States

```typescript
interface BleDevice {
  id: string; // UUID
  name: string; // "AcornPups-B901"
  rssi: number; // Signal strength
  isConnectable: boolean;
}
```

#### Error Handling

- **Device not found**: 15-second timeout
- **Connection failed**: Automatic retry options
- **Signal too weak**: RSSI monitoring
- **Permission denied**: Platform-specific handling

## 🛜 WiFi Provisioning System

### Service Architecture

- **Service**: `src/services/wifiProvisioningService.ts`
- **Screen**: `src/screens/WiFiProvisioningScreen.tsx`
- **Types**: `src/types/wifi.ts`

### BLE Service Discovery

#### Service UUID

```typescript
const WIFI_SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
```

#### Characteristics

```typescript
// For sending WiFi credentials
const SSID_CHAR_UUID = "12345678-1234-1234-1234-123456789abd";

// For receiving status updates
const STATUS_CHAR_UUID = "12345678-1234-1234-1234-123456789abf";
```

### WiFi Credential Format

#### Enhanced JSON Structure (v2.0)

```json
{
  "ssid": "your-wifi-name",
  "password": "your-wifi-password",
  "auth_token": "eyJraWQiOiI0eEdGUjRMaH...",
  "device_name": "Living Room Receiver",
  "user_timezone": "America/Los_Angeles"
}
```

#### Legacy JSON Structure (v1.0 - Deprecated)

```json
{
  "ssid": "your-wifi-name",
  "password": "your-wifi-password"
}
```

#### Transmission Protocol

1. **JSON** → Convert enhanced credentials to JSON string with auth token and metadata
2. **Base64** → Encode for BLE transmission (React Native compatible)
3. **BLE Write** → Send to SSID characteristic with response
4. **Confirmation** → Wait for status updates

#### Enhanced Data Fields

- **`ssid`**: WiFi network name (required)
- **`password`**: WiFi network password (required)
- **`auth_token`**: JWT authentication token from the authenticated user (required)
  - Used by ESP32 for automatic device registration with backend
  - Ensures only authenticated users can provision devices
- **`device_name`**: User-friendly device name (required)
  - Allows users to customize device names during setup
  - Defaults to the BLE advertised name if not specified
- **`user_timezone`**: User's timezone in IANA format (required)
  - Automatically detected from user's device/browser
  - Used for proper timestamp handling and scheduling features

### Status Updates from ESP32

The device sends real-time status updates during WiFi provisioning:

#### Status Flow

```
RECEIVED → PROCESSING → STORED → SUCCESS
```

#### Status Meanings

- **RECEIVED**: Device got the WiFi credentials
- **PROCESSING**: Device is validating and processing credentials
- **STORED**: Credentials saved to device memory (NVS)
- **SUCCESS**: WiFi provisioning completed successfully

#### Status Handling

```typescript
interface WiFiProvisioningStatus {
  phase: "processing" | "complete" | "error";
  progress: number; // 0-100%
  message: string; // User-friendly message
  isComplete: boolean;
  isError: boolean;
  warning?: string; // Optional warnings
}
```

### Error Scenarios & Handling

#### Expected Behaviors (Not Errors)

1. **BLE Notification Failures**

   - Common on some devices/platforms
   - App continues with timeout fallback
   - Logged as INFO, not ERROR

2. **Device Disconnection After Success**
   - ESP32 restarts to connect to WiFi
   - Treated as success indicator
   - Shows "Device restarted to connect to WiFi"

#### Real Error Conditions

- **Service not found**: Device doesn't support WiFi provisioning
- **Characteristic missing**: Incompatible firmware
- **Write failures**: Connection issues during transmission
- **Timeout**: No response after 30 seconds

### Timeout & Fallback Strategy

#### 30-Second Timeout

- Matches ESP32 firmware timeout
- Automatic fallback to optimistic completion
- Assumes success if credentials were sent successfully

#### Graceful Degradation

```typescript
// If notifications fail, continue with timeout
// If device disconnects after sending, treat as success
// If status updates don't arrive, assume success after timeout
```

## 🏗️ Code Architecture

### Navigation Structure

```
MainTabs
  └── DeviceSetupModal (fullScreenModal)
      ├── Camera              // QR scanning
      ├── BluetoothSearch     // Manual device selection
      └── WiFiProvisioning    // Credential setup
```

### Key Components

#### BLE Service (`src/services/bleService.ts`)

```typescript
class BleService {
  startScanning(); // Begin device discovery
  stopScanning(); // Stop discovery
  connectToDevice(); // Establish BLE connection
  getConnectedDevice(); // Get current connection
  disconnect(); // Clean disconnect
}
```

#### WiFi Service (`src/services/wifiProvisioningService.ts`)

```typescript
class WiFiProvisioningService {
  initialize(); // Setup BLE services
  subscribeToStatus(); // Listen for device updates
  sendWiFiCredentials(); // Transmit credentials
  cleanup(); // Clean up resources
}
```

### State Management

#### Camera Screen State

```typescript
interface ScanState {
  isScanning: boolean; // BLE discovery active
  isConnecting: boolean; // Connection in progress
  isConnected: boolean; // Successfully connected
  error: string | null; // Error message
  targetDeviceName: string | null; // From QR code
  foundDevice: BleDevice | null; // Discovered device
}
```

#### WiFi Screen State

```typescript
interface WiFiState {
  isProvisioning: boolean;
  status: WiFiProvisioningStatus | null;
  error: string | null;
}
```

## 🔧 Platform Differences

### Android

- **API 31+**: Requires `BLUETOOTH_SCAN`/`BLUETOOTH_CONNECT` permissions
- **Older Android**: Uses legacy `ACCESS_FINE_LOCATION`
- **Location Flag**: `neverForLocation` to avoid location permission

### iOS

- **No Location Permission**: BLE works without location access
- **Background Limitations**: Scanning only works in foreground
- **Permission Timing**: Requested automatically on first BLE operation

## 🐛 Common Issues & Solutions

### Issue: "Device not found"

**Cause**: ESP32 not advertising or out of range
**Solution**:

- Check device is powered on
- Ensure device is in provisioning mode (blue LED)
- Move closer to device
- Check QR code matches exact device name

### Issue: "Connection failed"

**Cause**: BLE connection unstable
**Solution**:

- Retry connection
- Check signal strength (RSSI)
- Ensure no other apps connected to device

### Issue: "Notification errors"

**Cause**: Platform-specific BLE notification issues
**Solution**:

- App automatically falls back to timeout method
- This is normal behavior, not a real error

### Issue: "Device disconnected after sending credentials"

**Cause**: ESP32 restarting to connect to WiFi (normal behavior)
**Solution**:

- This indicates success
- App shows completion message
- Device will connect to WiFi network

## 🔄 Complete Flow Example

1. **User scans QR code**: `{"deviceName": "AcornPups-B901"}`
2. **App starts BLE scan** for devices matching "AcornPups"
3. **Device discovered**: "AcornPups-B901" found with good signal
4. **Auto-connection**: App connects to exact matching device
5. **Service discovery**: Find WiFi provisioning service
6. **Enhanced credential transmission**: Send:
   ```json
   {
     "ssid": "MyHomeWiFi",
     "password": "secretpassword123",
     "auth_token": "eyJraWQiOiI0eEdGUjRMaH...",
     "device_name": "Living Room Receiver",
     "user_timezone": "America/Los_Angeles"
   }
   ```
7. **Status monitoring**: Receive RECEIVED → PROCESSING → STORED → SUCCESS
8. **Device restart**: ESP32 disconnects and reboots to WiFi mode
9. **Device registration**: ESP32 automatically registers with backend using provided auth token
10. **Completion**: User sees success message and modal closes

## 📝 Logging & Debugging

### Log Prefixes

- `📷 [Camera]`: QR scanning events
- `🔍 [BLE]`: Bluetooth operations
- `📡 [WiFi]`: WiFi provisioning events
- `🔄 [Navigation]`: Screen transitions

### Important Logs to Monitor

```
✅ Valid QR code parsed
📱 Device discovered
🔗 Device connected successfully
📤 WiFi credentials sent successfully
📡 Status from ESP32: SUCCESS
🔌 Device disconnected (normal behavior)
```

## 🚀 Getting Started

1. **Install dependencies**: `npm install react-native-ble-plx`
2. **Configure permissions**: Update `app.json` with BLE permissions
3. **Test with real device**: Use physical device (BLE doesn't work in simulator)
4. **Monitor logs**: Watch console for flow progression
5. **Test edge cases**: Try poor signal, interruptions, etc.

---

This system provides robust, real-world BLE and WiFi provisioning with comprehensive error handling and graceful fallbacks for a smooth user experience.
