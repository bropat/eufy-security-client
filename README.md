# eufy-security-client

![Logo](img/eufy-security.png)

[![node](https://img.shields.io/node/v/eufy-security-client.svg)](https://www.npmjs.com/package/eufy-security-client)
[![NPM version](http://img.shields.io/npm/v/eufy-security-client.svg)](https://www.npmjs.com/package/eufy-security-client)
[![Downloads](https://img.shields.io/npm/dm/eufy-security-client.svg)](https://www.npmjs.com/package/eufy-security-client)
[![Dependency Status](https://img.shields.io/david/bropat/eufy-security-client.svg)](https://david-dm.org/bropat/eufy-security-client)
[![Known Vulnerabilities](https://snyk.io/test/github/bropat/eufy-security-client/badge.svg)](https://snyk.io/test/github/bropat/eufy-security-client)

[![NPM](https://nodei.co/npm/eufy-security-client.png?downloads=true)](https://nodei.co/npm/eufy-security-client/)

The development of this shared library was inspired by the work of the following people:

* FuzzyMistborn (<https://github.com/FuzzyMistborn/python-eufy-security>)
* keshavdv (<https://github.com/keshavdv/python-eufy-security>)
* JanLoebel (<https://github.com/JanLoebel/eufy-node-client>)

Credits go to them as well.

If you appreciate my work and progress and want to support me, you can do it here:

[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/E1E332Q6Z)

## Description

This shared library allows to control [Eufy security devices](https://us.eufylife.com/collections/security) by connecting to the Eufy cloud servers and local/remote stations over p2p.

You need to provide your Cloud login credentials.

One client instance will show all devices from one Eufy Cloud account and allows to control them.

## Features

* Connects to Eufy cloud (supports 2fa)
* Connects to station/devices using p2p communication (supported: local and remote connectivity)
* Supports receiving push notification (unified push messages interface)
* Basic P2P implementation that supports also commands not already implemented
* Get info and parameters from stations/devices over https and/or p2p
* P2P functionality already implemented:
  * Station:
    * Change guard mode
    * Reboot station
  * Devices:
    * Start livestream (local/remote p2p or rtmp over cloud)
    * Stop livestream (local/remote p2p or rtmp over cloud)
    * Enable/disable device
    * Enable/disable auto night vision (only camera products)
    * Enable/disable led (only camera 2 products, indoor cameras, floodlight camera, solo cameras and doorbells)
    * Enable/disable anti-theft detection (only camera 2 products)
    * Enable/disable motion detection
    * Enable/disable pet detection (only indoor cameras)
    * Enable/disable sound detection (only indoor cameras)
    * Enable/disable RTSP stream (only camera2 products, indoor cameras and solo cameras)
    * Change video watermark setting (only camera products)
    * Start/cancel download video
    * Quick response (only doorbells)
    * Lock/unlock (only smart lock products)

## Documentation

### Sample projects
*As an example, you can look at the following projects: [ioBroker.eufy-security](https://github.com/bropat/ioBroker.eufy-security), [eufy-security-ws](https://github.com/bropat/eufy-security-ws)*

### Getting started without 2FA
Setting up EufySecurity
```
const { EufySecurity } = require('eufy-security-client');

const config = {
  country: 'nl',
  username: 'xxxx,
  password: xxxx,
};
const eufy = new EufySecurity(config);
await eufy.connect()
```
todo: list of config params

### Getting data from API
To get data first the the data need to be refreshed.
```
await eufy.refreshData();
const stations = await eufy.getStations();
```
### Working with (base)stations
To update a basestation to change arming mode first we need to retrieve the serial number of the base station.
```
await eufy.refreshData();
const stations = await eufy.getStations();
const targetStationSerialNumber = stations[0].properties.serialNumber.value;
```

With the serialnumber you can start a P2P(local network) connection to the  basestation to send commands.

```
 eufy
  .getStation(targetStationSerialNumber) //get SN from use eufy.getStations
  .on('connect', (station) => {
    //work with the connected station
    let currentMode = station.getGuardMode().value;
    console.log(currentMode)
    station.close(); 
  });
```

#### set arming mode
when connected to the station you can send commands, eg change arming mode

To get correct arming mode commands:
```
const { GuardMode } = require('eufy-security-client/build/http/types');'
```

```
 const armMode = GuardMode.AWAY; 
  
 eufy
  .getStation(targetStationSerialNumber) 
  .on('connect', (station) => {
    let currentMode = station.getGuardMode().value;
    if (currentMode === armMode) { //nothing to change
      station.close();
    } else {
      station.setGuardMode(armMode);
    }
  })
  .on('guard mode', (station) => {
    let currentModeInt = station.getGuardMode().value;
    let currentModeName = GuardMode[currentModeInt];
    console.log('guard mode changed to:' + currentModeName;);
    station.close();
  })
  .on('close', () => 
    console.log(connection to '+targetStationSerialNumber+' is closed');          
  });
  
```






## Known working devices

* HomeBase (T8001)
* HomeBase E (T8002)
* HomeBase 2 (T8010)
* Smart Lock Wi-Fi Bridge (T8021)
* eufyCam (T8111)
* eufyCam E (T8112)
* eufyCam 2 (T8114)
* eufyCam 2C (T8113)
* eufyCam 2 Pro (T8140)
* eufyCam 2C Pro (T8141)
* Floodlight (T8420)
* Wired Doorbell 2k (T8200)
* Wired Doorbell 1080p (T8201)
* Battery Doorbell 2K (T8210)
* Battery Doorbell 1080p (T8222)
* Entry Sensor (T8900)
* Motion sensor (T8910)
* Indoor Cam Pan&Tilt 2K (T8410)
* Indoor Cam 2K (T8400)
* Indoor Cam Pan&Tilt 1080p (T8411)
* Indoor Cam 1080p (T8401)
* Smart Lock Front Door (T8500)

If more devices work (or also not) please report them by opening a GitHub issue.

## How to report issues and feature requests

Please use GitHub issues for this.

## Changelog

### 0.8.3 (2021-06-01)

* (bropat) Fixed regression in p2p protocol

### 0.8.2 (2021-05-26)

* (bropat) Fixed issue [#2](https://github.com/bropat/eufy-security-client/issues/2)
* (bropat) Added new high level property "type" for devices/stations
* (bropat) Updated versions of the package dependencies

### 0.8.1 (2021-05-14)

* (bropat) Fixed (raw) property value refresh for devices and stations
* (bropat) Fixed "enabled" property for standalone devices
* (bropat) Fixed "lanIpAddress" property for standalone devices
* (bropat) Fixed "macAddress" property for standalone devices
* (bropat) Added "station raw property changed" and "device raw property changed" event for high level class EufySecurity

### 0.8.0 (2021-05-12)

* (bropat) **Breaking Changes** (renamed emitter, renamed some functions etc.)
* (bropat) Added high level class EufySecurity
* (bropat) Added high level properties with metadata information
* (bropat) Better error handling
* (bropat) Fixed Guard Mode Emitter
* (bropat) Fixed push notification for indoor and floodlight cams
* (bropat) Cleanup code
* (bropat) Updated versions of the package dependencies

### 0.7.2 (2021-04-10)

* (bropat) Added new HTTP API methods: getVideoEvents, getAlarmEvents, getHistoryEvents, getAllVideoEvents, getAllAlarmEvents, getAllHistoryEvents
* (bropat) P2P session: Added station serial number to logging entries for debugging purposes
* (bropat) Updated versions of the package dependencies

### 0.7.1 (2021-04-02)

* (bropat) Lowered UDP receive buffer size for FreeBSD
* (bropat) Fixed lookup timeout issue on "local prefered" connection establishment

### 0.7.0 (2021-03-30)

* (bropat) Added support for smart locks
* (bropat) Added new P2P feature: lock/unlock smart lock products
* (bropat) Optimized speed of P2P connection establishment
* (bropat) Implemented P2P connection setup preference: local prefered, local only or quickest connection
* (bropat) Trying to solve issue [#2](https://github.com/bropat/eufy-security-client/issues/2)
* (bropat) Dropped support for NodeJS 10.x (min. requirement 12)
* (bropat) Updated versions of the package dependencies

### 0.6.0 (2021-03-11)

* (bropat) Added new command types to enum CommandType
* (bropat) Added new P2P feature: enable/disable pet detection for indoor cameras
* (bropat) Added new P2P feature: enable/disable sound detection for indoor cameras
* (bropat) Added new P2P feature: enable/disable led for wired doorbells
* (bropat) Added some functions to p2p station class: getLANIPAddress, getGuardMode, getCurrentMode
* (bropat) Added new device class: BatteryDoorbellCamera, IndoorCamera, SoloCamera
* (bropat) Added new functions to some device classes returning specific parameter values
* (bropat) Renamed interface ParameterValue to StringValue and added new: BooleanValue, NumberValue
* (bropat) All functions of the Device base class that return parameter values, return now the value and timestamp of the last modification
* (bropat) Fixed enable/disable led (for battery doorbells, indoor cameras, floodlight camera and solo cameras)
* (bropat) Fixed enable/disable motion detection (for wired doorbells, indoor cameras, floodlight camera and solo cameras)
* (bropat) Fixed change video watermark setting (for wired doorbells, battery doorbells, indoor cameras and floodlight camera)
* (bropat) Fixed issue with multibyte string with function buildCommandWithStringTypePayload
* (bropat) Fixed issue on PushMessage interface (fixed parsing of file_path)

### 0.5.1 (2021-03-05)

* (bropat) Fixed download of videos via p2p (wrong channel value in callback)
* (bropat) Updated versions of the dev package dependencies

### 0.5.0 (2021-03-03)

* (bropat) Added new P2P feature: enable/disable motion detection for camera products
* (bropat) Added new P2P feature: enable/disable rtsp stream for camera2 products, indoor and solo cameras
* (bropat) Added option to P2P session to enable quick start livestream (after receiving first video frame)
* (bropat) Added new methods to HTTPApi for setting custom HTTP session headers: PhoneModel, Country, Language
* (bropat) Changed return type of HTTPApi authenticate function
* (bropat) Fixed issue during livestreaming if p2p connection is lost

### 0.4.4 (2021-02-20)

* (bropat) Fixed possible race condition that sometimes interrupts the livestream

### 0.4.3 (2021-02-18)

* (bropat) Added new P2P feature: quick response for doorbell products
* (bropat) Fixed wired doorbell p2p livestream (should fix also indoor, floodlight and solo cameras)
* (bropat) Fixed issue on new PushMessage interface
* (bropat) Updated versions of the package dependencies

### 0.4.2 (2021-02-15)

* (bropat) Fixed battery doorbell start livestream P2P command
* (bropat) Added CMD_DOORBELL_SET_PAYLOAD as nested command type

### 0.4.1 (2021-02-14)

* (bropat) Fixed small typo
* (bropat) Uniform debug messages

### 0.4.0 (2021-02-13)

* (bropat) Added new P2P feature: Enable/disable device (for camera products)
* (bropat) Added new P2P feature: Enable/disable auto night vision (for camera products)
* (bropat) Added new P2P feature: Enable/disable led (for camera 2 products, indoor cameras, floodlight camera and solo cameras)
* (bropat) Added new P2P feature: Enable/disable anti-theft detection (for camera 2 products)
* (bropat) Added new P2P feature: Change video watermark setting (for camera products)
* (bropat) Fixed P2P command retry on error 503
* (bropat) Fixed issue on new PushMessage interface
* (bropat) Fixed issue with handling unencrypted video data

### 0.3.0 (2021-02-11)

* (bropat) Added new P2P feature: Download video
* (bropat) Implemented refreshing of device and station parameters via P2P
* (bropat) Migrated to TypedEmitter (tiny-typed-emitter)
* (bropat) Implemented new managed push notification class: PushNotificationService
* (bropat) Removed old push notification class: PushRegisterService
* (bropat) Renamed previous PushMessage interface to RawPushMessage
* (bropat) Introduced new PushMessage interface that normalizes all push notification types into one
* (bropat) Fixed issue where readable streams were not correctly destroyed when terminating p2p video streams
* (bropat) Fixed P2P start livestream command for Floodlight / Indoor / Solo cameras
* (bropat) Implemented refresh of GUARD_MODE on change of SCHEDULE_MODE over p2p (instantly)

### 0.2.2 (2021-02-06)

* (bropat) Exported missing P2P interface: StreamMetadata

### 0.2.1 (2021-02-06)

* (bropat) Added typescript declaration files

### 0.2.0 (2021-02-06)

* (bropat) initial release

## License

MIT License

Copyright (c) 2021 bropat <patrick.broetto@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
