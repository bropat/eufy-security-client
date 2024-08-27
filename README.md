# eufy-security-client

![Logo](docs/_media/eufy-security-client.png)

[![node](https://img.shields.io/node/v/eufy-security-client.svg)](https://www.npmjs.com/package/eufy-security-client)
[![NPM version](http://img.shields.io/npm/v/eufy-security-client.svg)](https://www.npmjs.com/package/eufy-security-client)
[![Downloads](https://img.shields.io/npm/dm/eufy-security-client.svg)](https://www.npmjs.com/package/eufy-security-client)
[![Total Downloads](https://img.shields.io/npm/dt/eufy-security-client.svg)](https://www.npmjs.com/package/eufy-security-client)
[![Dependency Status](https://img.shields.io/librariesio/release/npm/eufy-security-client)](https://libraries.io/npm/eufy-security-client)
[![Known Vulnerabilities](https://snyk.io/test/github/bropat/eufy-security-client/badge.svg)](https://snyk.io/test/github/bropat/eufy-security-client)

[![NPM](https://nodei.co/npm/eufy-security-client.png?downloads=true)](https://nodei.co/npm/eufy-security-client/)

The development of this shared library was inspired by the work of the following people:

* FuzzyMistborn (<https://github.com/FuzzyMistborn/python-eufy-security>)
* keshavdv (<https://github.com/keshavdv/python-eufy-security>)
* JanLoebel (<https://github.com/JanLoebel/eufy-node-client>)

Credits go to them as well.

If you appreciate my work and progress and want to support me, you can do it here:

[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/E1E332Q6Z)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://www.paypal.me/pbroetto)

**This project is not affiliated with Anker and Eufy (Eufy Security). It is a personal project that is maintained in spare time.**

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
    * And many more, check it out...

## Documentation

Look [here](https://bropat.github.io/eufy-security-client/).

*As an example, you can look at the following projects: [ioBroker.eufy-security](https://github.com/bropat/ioBroker.eufy-security), [eufy-security-ws](https://github.com/bropat/eufy-security-ws), [eufy_security](https://github.com/fuatakgun/eufy_security)*

## Known working devices

For a list of supported devices, please see [here](https://bropat.github.io/eufy-security-client/#/supported_devices).

If more devices work (or also not) please report them by opening a GitHub issue.

## How to report issues and feature requests

Please use GitHub issues for this.

## Changelog

### 3.1.0 (2024-08-27)

* (bropat) **Breaking Change** Requires node version >= 20.0.0
* (martijnpoppen) NEW: add deviceConfig with simultaneousDetections option (#494)
* (PhilippEngler) added StationTimeZoneProperty (#472)
* (martijnpoppen) FIX: HB3 Doorbell Known Face detection not coming trough and Doorbell Ringing (#495)
* (bropat/lenoxys) Added ability to disable automatic cloud polling (#533)
* (bropat/PhilippEngler) Added ability to choose listening port of p2p station communication (#473)
* (bropat) Added vehicleDetected property to Floodlight Cam E340 (T8425)
* (bropat) Implemented runaway limit during parsing of p2p message data (infinite loop detection)
* (bropat) Added new EufySecurity options enableEmbeddedPKCS1Support (possible workaround for issue #487)
* (bropat) Added more logging about the initiation of P2P connections
* (bropat) Added more authentication log for info level
* (bropat) Improved livestream handling
* (PhilippEngler) update T8416 support (#535)
* (PhilippEngler) update T8170 support (#536)
* (bassrock) fix(bool): convert numeric to boolean (#523)
* (bropat) Fixed issue #482
* (bropat) Fixed an unhandled case that led to a infinite loop when parsing p2p messages
* (bropat) Fixed possible incorrect initiation of a P2P reconnection
* (bropat) Fixed some more property parsing
* (bropat) Possible fix for some locks missing some metadata
* (bropat) Updated versions of the package dependencies

### 3.0.0 (2024-03-03)

* (bropat) **Breaking Change** New modular logging implementation
* (bropat) Added support for Video Smart Lock S330 (T8530; #220)
* (bropat) Added support for Smart Lock C210 (T8502; #291)
* (bropat) Added support for Smart Lock C220 (T8506; #377 #356)
* (bropat) Added support for Smart Lock S230 (T8510P; #458)
* (bropat) Added support for Smart Lock S231 (T8520P; untested)
* (bropat) Added support for Retrofit Smart Lock E110 (T8503; #208)
* (bropat) Added support for Retrofit Smart Lock E130 (T8504; untested)
* (bropat) Added support for Smart Drop S300 (T8790; #261 #364)
* (bropat/martijnpoppen) Added support for Video Doorbell E340 (T8214; #406)
* (martijnpoppen) Added support for MiniBase Chime (T8023)
* (bropat/martijnpoppen) Added support for eufyCam E330 (Professional; T8600; #408)
* (bropat/martijnpoppen) Added support for Solar Wall Light Cam S120 (T84A0; #409)
* (bropat/martijnpoppen) Added support for SoloCam S340 (T8170; #410)
* (bropat) Added support for Indoor Cam S350 (T8416; #398)
* (bropat) Added support for Floodlight Cam E340 (T8425; #388)
* (bropat) Added support for SoloCam C210 (T8B00; #369)
* (bropat) Outdated, no longer functioning cloud livestream has been removed
* (bropat) Improved cloud device lookup
* (bropat) Implemented new image gathering from p2p initiated by push notifications
* (bropat) Implemented new p2p parameter format
* (bropat) Implemented calibrate command for Floodlight T8423 (#280)
* (martijnpoppen) OPT: persistentData via config instead of JSON file (#416)
* (PhilippEngler) changed description of state of DualCamWatchViewMode (#402)
* (PhilippEngler) Added support for storage info on HomeBase 3 (#405)
* (bropat) Added default values for some properties
* (bropat) Lowered p2p keepalive interval for battery saving devices
* (bropat) Added name of the person who locked/unlocked the lock
* (bropat) Added origin who locked/unlocked the lock
* (bropat) Changed to simultaneous triggering of different detection types by receiving of a single type of push notification
* (PhilippEngler) Updated device types (#478)
* (PhilippEngler) Add DeviceNotificationIntervalTimeProperty to indoor cams (#471)
* (PhilippEngler) Added storage info fpr S100 (#412)
* (martijnpoppen) FIX: vehicle detection S340 (#475)
* (PhilippEngler) Make StationStorageInfoProperties readonly (#474)
* (PhilippEngler) Solve TypeError in handleMsg (#469)
* (PhilippEngler) Fixed description of state of DualCamWatchViewMode (#402)
* (martijnpoppen) FIX: Eufy e330 remove battery (#445)
* (bropat) Fixed issue #380
* (bropat) Fixed issue #323
* (bropat) Fixed issue #452
* (bropat) Fixed decode of parameters
* (bropat) Fixed: not all types of motion detection can be deactivated at the same time (fallback to last value)
* (bropat) Fixed issue that caused long running p2p livestreams to be interrupted (#431)
* (bropat/PhilippEngler) Fixed possible double api connect event (#439)
* (bropat) Fixed possible issue with loading persistent data for cloud api
* (bropat) Fixed api internal session invalidation
* (bropat) Fixed update processing and persistent data consistency
* (bropat) Fixed persistent data saving
* (bropat) Fixed push notification in connection with HomeBase 3

### 2.9.1 (2023-11-04)

* (bropat) Fixed data decryption for p2p command responses

### 2.9.0 (2023-11-04)

* (bropat) **Breaking Change** Requires node version >= 18.0.0
* (bropat) Added support for SmartTrack Link (T87B0; #385) and SmartTrack Card (T87B2; untested)
* (bropat/martijnpoppen) NEW: add support for S220 (T8134; #353)
* (bropat) Implemented data decryption for p2p command responses
* (bropat) Migrated API getCiphers method to v2 endpoint
* (bropat) Migrated API getInvites method to v2 endpoint
* (bropat) Migrated to Buffer.subarray from deprecated Buffer.slice method
* (bropat) Migrated to new sdcard info gathering over p2p (#373)
* (bropat) Fixed parsing of push notification for sensor open status (#372)
* (bropat) Fixed API getHouseInviteList method (removed encryption)
* (bropat) Fixed device type for lock T8506
* (PhilippEngler) Fixed StatusLed property for doorbell dual (#374)
* (bropat) Updated docs with new device names
* (bropat) Updated versions of the package dependencies

### 2.8.1 (2023-08-31)

* (bropat) Automatic detection of supported P2P encryption (none, type1, type2)
* (bropat) Fixed regression introduced with activating p2p encryption for all devices (some older devices do not support it!)
* (bropat) Updated versions of the package dependencies

### 2.8.0 (2023-08-20)

* (bropat) Implemented p2p data encryption for all supported commands
* (bropat) Improved updating of properties taking into account the priority/quality of the value source (http, p2p, push, mqtt)
* (bropat) API request throttling optimised
* (bropat) Fixed updating of the image property

### 2.7.1 (2023-08-08)

* (bropat) Fixed regression introduced by commit 7471fbf (Fixed possible MaxListenersExceededWarning)
* (bropat) Fixed issue not loading p2p properties over p2p connection for stations (HB2 and HB3)

### 2.7.0 (2023-08-01)

* (bropat) Added support for Wired Wall Light Cam S100 (T84A1; #318)
* (bropat) Added support for Garage-Control Cam (T8452; #219)
* (bropat) Implemented entry sensor status update over p2p connection
* (bropat) Improved cloud device lookup
* (bropat) Improved error handling
* (bropat/witold-gren) Added missing station command support for 4G LTE Starlight (T8151; #333)
* (bropat/witold-gren) Added missing push notification support for 4G LTE Starlight (T8151; #333)
* (bropat/witold-gren) Fixed issue handling push notification alarm events (#333)
* (bropat) Fixed image property not updating correctly
* (bropat) Fixed issue of executing the download image command only if supported
* (PhilippEngler) fix DeviceChargingStatus for eufyCam3 (#330)
* (PhilippEngler) handle incomplete JSON for parameter (#347)
* (bropat) Initiate p2p connection for supported devices only
* (bropat) Updated versions of the package dependencies

### 2.6.2 (2023-05-16)

* (bropat) Fixed issue waiting for device/station loading event in some cases
* (martijnpoppen) FIX: doorbell push not parsed when connected to HB3 #325

### 2.6.1 (2023-05-13)

* (bropat) Fixed an issue that caused the event "livestream started" to be emit twice
* (bropat) Added some missing properties (package detection) for doorbell solo (T8203)
* (bropat) Migrated from dependency protobuf-typescript to protobufjs

### 2.6.0 (2023-05-12)

* (bropat) Implemented access to local event history (database on station)
* (bropat) Implemented download of first picture from local database for supported devices
* (martijnpoppen) FIX: HB3 notifications - (exclude sensors) #324

### 2.5.1 (2023-05-07)

* (bropat) Fixed issue in downloading `cover_path` picture for supported devices

### 2.5.0 (2023-05-07)

* (bropat) **Breaking Change** `picture_url` property is now hidden and was replaced by `picture` property for supported devices
* (bropat) Implemented new push notification picture gathering and decryption
* (bropat) Fixed sdcard info gathering for devices without sdcard inserted

### 2.4.4 (2023-04-21)

* (bropat) Implemented feature request #313
* (bropat) Fixed issue #316
* (bropat) Updated versions of the package dependencies

### 2.4.3 (2023-04-11)

* (martijnpoppen) FIX: HB3 connected sensors not reporting (#314)
* (PhilippEngler) Fix problem when the P2PDID number is starting with zeros
* (bropat) Updated versions of the package dependencies

### 2.4.2 (2023-02-23)

* (bropat) Improved local discovery of stations over p2p
* (bropat) Fixed issue in API communication when no stations and devices are found

### 2.4.1 (2023-02-19)

* (bropat) Added support for configuring a suggested IP address for a station
* (bropat) Fixed json parse issue with null-terminated strings
* (bropat) Fixed p2p keepalive issue
* (bropat/martijnpoppen) Fixed Invalid Property personDetected error for some floodlight cams
* (PhilippEngler) Finished implementation of getStorageInfo
* (bropat) Removed dependency mediainfo.js

### 2.4.0 (2022-12-24)

* (bropat) Implemented new encrypted cloud API communication (v2)
* (bropat) Added support for 4G LTE Starlight camera (T8150; #209; #231)
* (bropat) Implemented client-side termination of the stream (live/download; #258)
* (bropat) Fixed issue #271
* (bropat) Fixed issue #283
* (bropat) Fixed issue #287
* (martijnpoppen) FIX: webAPi stream request (#275)
* (martijnpoppen) FIX: support V2 for getPassportProfile (V1 deprecated; #282)
* (martijnpoppen) FIX: always encrypt login with server key. (#285)
* (PhilippEngler) update _getEvents for v2 (#286)
* (bropat) Fixed wrong variable names in pull request (#286)
* (bropat) Updated versions of the package dependencies

### 2.3.0 (2022-11-26)

* (bropat) Added support for Wired Doorbell (T8200X)
* (bropat) Added new property `snoozeStartTime`, `snoozeHomebase`, `snoozeChime` and `snoozeMotion` to supported devices
* (bropat) Added debug information for analysed audio and video codecs at start of livestream
* (bropat/martijnpoppen) Added new command `stationChime` for supported stations
* (bropat) Implemented fallback for configured empty string for setting `trustedDeviceName`
* (bropat) Implemented missing Homebase 3 notification events
* (bropat) Fixed unknown video codec issue
* (bropat) Fixed issue #240
* (smitty078) Fixed issue #251
* (thieren) Fixed issue #256 (#255)
* (tyware) Fixed issue #257
* (bropat) Fixed issue #258
* (PhilippEngler) Change DeviceChargingStatusProperty value for eufyCam 3c (#254)
* (PhilippEngler) Fixed doubled property labels (#253)
* (martijnpoppen) FIX: keypad wifiSignalLevel property error (#245)
* (martijnpoppen) FIX: issue when params are not available for rawDevice/rawStation (#246)

### 2.2.3 (2022-11-12)

* (bropat) Added Station alarm properties
* (bropat) Added `connection error` event to HTTPApi and EufySecurity
* (bropat) Changed default value of `trustedDeviceName`
* (martijnpoppen) NEW: HB3 Vehicle Detection (#241)

### 2.2.2 (2022-11-06)

* (bropat) Fixed issue identifying alarm delay

### 2.2.1 (2022-11-05)

* (bropat) Added support for Floodlight Cam (T8420X)
* (Palmke) Implemented Homebase 3 familiar faces (#237)
* (bropat) Fixed regression in Station.startDownload
* (Palmke) Fixed issue #236
* (bropat) Fixed issue #233
* (bropat) Small bugfixes

### 2.2.0 (2022-11-01)

* (bropat) **Breaking Change** Renamed all lock settings parameters according to standard
* (bropat) **Breaking Change** Station class initialization is now async
* (bropat) Renewed p2p device address discovery (now also includes local discovery via broadcast; cloud discovery optimised)
* (bropat) Added support for Doorbell Dual notification types (package delivered, package taken, package stranded, someone loitering, radar motion detected)
* (bropat) Added support for eufyCam 3C (#233)
* (bropat) Added support for eufyCam 3 (#228)
* (bropat) Added support for Homebase 3 (#228)
* (bropat) Added support to programmatically add access to lock (#204)
* (thieren) Added station event for connection timeout (#202)
* (bropat) Added Smart Safe support (tested only T7400; #182)
* (bropat) Added snooze command for supported devices (#173, #176)
* (bropat) Added support for video type store to NAS for indoor cameras (#147)
* (bropat) Switched API login to new login_sec endpoint
* (bropat) Incremented p2p disconnect timeout for energy saving device to 30 seconds
* (bropat) Implemented new resend of not acknowledged p2p commands
* (bropat) Fixed issue with energy saving measures interrupting running streams
* (bropat) Better error handling for not supported p2p commands
* (bropat) Fixed signalling of event `station command result`
* (bropat) Fixed local device discovery exception (udp broadcast)
* (bropat) Fixed checking of valid property values (function validValues)
* (bropat) Fixed regression in parsing lock push notifications
* (bropat) Fixed updating of device properties on p2p command result event for some devices
* (bropat) Fixed parsing of raw values of property `motionDetectionSensitivity`
* (bropat) Fixed MQTT certification verification for some eufy servers (disabled certification verrification, since some server have expired certs)
* (bropat) Fixed emitting of event "locked" for lock devices
* (bropat) Fixed issue #227
* (bropat) Fixed issue #215
* (bropat) Fixed issue #212
* (bropat) Fixed issue #207
* (bropat) Fixed issue #201
* (bropat) Fixed issue #196
* (martijnpoppen) FIX: set DevicePictureUrl for sound and crying (#234)
* (bropat) Small bugfixes and optimizations
* (bropat) Updated docs - Added partial supported device HomeBase 3 (T8030, S380)
* (bropat) Updated docs - Added supported devices eufyCam 3 (T8160, S330), eufyCam 3C (T8161, S300)
* (bropat) Updated docs - Added supported devices Smart Safe S10 (T7400), Smart Safe S12 (T7401)
* (bropat) Updated docs - Added supported devices SoloCam L20 (T8122), SoloCam L40 (T8123), SoloCam S40 (T8124), SoloCam E20 (T8130)
* (bropat) Changed default persistent directory path for saving persistent data

### 2.1.2 (2022-07-30)

* (Palmke) Dual Doorbell family detection (#177)
* (Palmke) Fixed issue #187
* (bropat) Fixed issue #186

### 2.1.1 (2022-07-16)

* (Palmke) Add alarm arm delay event (#180)
* (thieren) Fix: stream command for T8420 (#171)
* (Palmke) Don't send the alarm armed p2p events as alarm events (#169)
* (bropat) Fixed issue #167
* (bropat) Fixed issue #161
* (bropat) Updated versions of the package dependencies

### 2.1.0 (2022-06-12)

* (bropat) Added toggle for Spotlight for Outdoor Cam Pro (T8441; #123)
* (bropat & thieren) Added talkback commands for supported devices (#38, #153; thanks @thieren)
* (fabianluque) Added missing RTSP properties for Floodlight T8423 (#146)
* (Palmke) Add alarm delay event (#88, #155)
* (Palmke) P&T T8410: Set motion zone and image mirror (#156)
* (Palmke) Send an event when the alarm is armed and alarm events from p2p (#105, #157)
* (bropat) Implemented simple request throttling for Eufy Cloud
* (bropat) Fixed push notification token renewal
* (bropat) Fixed issue #161

### 2.0.1 (2022-05-03)

* (bropat) **Breaking Change** Fixed regression in device data loading
* (bropat) Target set back to ES2019

### 2.0.0 (2022-04-30)

* (bropat) **Breaking Change** Requires node version >= 14.17
* (bropat) **Breaking Change** HTTPApi class, EufySecurity class and Device classes instantiation changed
* (bropat) **Breaking Change** Timestamp for device and station properties has been removed
* (bropat) Added support for Battery Doorbell Dual (T8213; #126)
* (bropat) Added support for Video Doorbell Dual (T8203; #141)
* (bropat) Added support for IndoorCam Mini (T8414; #143)
* (bropat) Added continuos recording setting for some supported cameras
* (bropat) Added continuos recording type setting for some supported cameras
* (bropat) Added default angle setting for IndoorCam Mini (T8414)
* (bropat) Added default angle idle time setting for IndoorCam Mini (T8414)
* (bropat) Added notification interval time setting for some supported cameras
* (bropat) Added calibrate command for some supported cameras
* (bropat) Added set default angle command for IndoorCam Mini (T8414
* (bropat) Added set privacy angle command for IndoorCam Mini (T8414)
* (bropat) Removed PREFER_LOCAL P2P connectivity mode. Default mode is now QUICKEST.
* (bropat) Added new charging status "solar charging" (value: 4; issue #127)
* (bropat) Fixed Eufy cloud authentication token renewal
* (bropat) Fixed some Eufy cloud authentication issues
* (bropat) Fixed authentication issues when changing country setting
* (bropat) Fixed possible wrong battery values on some devices
* (bropat) Fixed issue if device doesn't support P2P communication
* (bropat) Fixed issue #136
* (bropat) Fixed issue #122
* (bropat) Updated versions of the package dependencies

### 1.6.6 (2022-02-12)

* (bropat) Fixed issue where no devices/stations are found (#116)

### 1.6.5 (2022-02-08)

* (bropat) Fixed regression in authentication flow introduced when fixing issue #116
* (bropat) Updated versions of the package dependencies

### 1.6.4 (2022-02-07)

* (bropat) Fixed issue #116 (choosing the correct country as in the Eufy App is esentially)

**Note:** Selecting the correct country is essential for the devices to be found (should match the setting in the Eufy app).

### 1.6.3 (2022-02-06)

* (bropat) Initialize MQTT connection only if supported devices are found

### 1.6.2 (2022-02-05)

* (bropat) Fixed MQTT connection issue (error: 5)

### 1.6.1 (2022-02-05)

* (bropat) Fixed small issue on driver upgrade of persistence data (has no impact; error entry in log on first startup)

### 1.6.0 (2022-02-05)

* (bropat) Supports new [Home Management](https://communitysecurity.eufylife.com/t/tips-for-eufy-security-app-v4-0/2420747) feature of Eufy Security 4.0
* (bropat) Added support for Smart Lock Touch & Wifi (T8520; #89)
* (bropat) Implemented Eufy MQTT notification subscription for Smart Lock Touch & Wifi (T8520)
* (bropat) Added auto lock setting for Smart Lock Touch & Wifi (T8520)
* (bropat) Added auto lock schedule setting for Smart Lock Touch & Wifi (T8520)
* (bropat) Added auto lock schedule start time setting for Smart Lock Touch & Wifi (T8520)
* (bropat) Added auto lock schedule end time setting for Smart Lock Touch & Wifi (T8520)
* (bropat) Added auto lock timer setting for Smart Lock Touch & Wifi (T8520)
* (bropat) Added notification setting for Smart Lock Touch & Wifi (T8520)
* (bropat) Added notification locked setting for Smart Lock Touch & Wifi (T8520)
* (bropat) Added notification unlocked setting for Smart Lock Touch & Wifi (T8520)
* (bropat) Added one touch locking setting for Smart Lock Touch & Wifi (T8520)
* (bropat) Added scramble passcode setting for Smart Lock Touch & Wifi (T8520)
* (bropat) Added sound setting for Smart Lock Touch & Wifi (T8520)
* (bropat) Added wrong try protection setting for Smart Lock Touch & Wifi (T8520)
* (bropat) Added wrong try attempts setting for Smart Lock Touch & Wifi (T8520)
* (bropat) Added wrong try lockdown time setting for Smart Lock Touch & Wifi (T8520)
* (bropat) Added lock/unlock command for Smart Lock Touch & Wifi (T8520)
* (bropat) Added lock calibration command for Smart Lock Touch & Wifi (T8520)
* (bropat) Improved p2p communication with energy saving devices
* (bropat) Added new HTTPApi methods supporting Eufy Security 4.0
* (bropat) Some small improvements were made to the HTTPApi
* (bropat) Fixed issue #97
* (bropat) Fixed issue #102
* (bropat) Fixed issue #109
* (bropat) Updated versions of the package dependencies

### 1.5.0 (2021-12-19)

* (bropat) Added support for floodlight cam 2 pro (T8423)
* (bropat) Added motion detection range setting for floodlight cam 2 pro (T8423)
* (bropat) Added motion detection range standard sensitivity setting for floodlight cam 2 pro (T8423)
* (bropat) Added motion detection range advanced left sensitivity setting for floodlight cam 2 pro (T8423)
* (bropat) Added motion detection range advanced middle sensitivity setting for floodlight cam 2 pro (T8423)
* (bropat) Added motion detection range advanced right sensitivity setting for floodlight cam 2 pro (T8423)
* (bropat) Added motion detection range test mode setting for floodlight cam 2 pro (T8423)
* (bropat) Added motion tracking sensitivity setting for floodlight cam 2 pro (T8423)
* (bropat) Added motion auto-cruise setting for floodlight cam 2 pro (T8423)
* (bropat) Added motion out-of-view detection setting for floodlight cam 2 pro (T8423)
* (bropat) Added light setting color temperature manual setting for floodlight cam 2 pro (T8423)
* (bropat) Added light setting color temperature mamotion setting for floodlight cam 2 pro (T8423)
* (bropat) Added light setting color temperature schedule setting for floodlight cam 2 pro (T8423)
* (bropat) Added light setting motion activation mode setting for floodlight cam 2 pro (T8423)
* (bropat) Added video nightvision image adjustment setting for floodlight cam 2 pro (T8423)
* (bropat) Added video color nightvision setting for floodlight cam 2 pro (T8423)
* (bropat) Added auto calibration setting for floodlight cam 2 pro (T8423)
* (bropat) Added start/stop rtsp livestream command for floodlight cam 2 pro (T8423)
* (bropat) Added battery and wifi rssi properties to eufycam 1/E
* (bropat) Implemented another p2p-keepalive mechanism found in some floodlights (e.g. T8420)
* (bropat) Fixed support for floodlight (T8420) - tested with FW: 1.0.0.35 HW: 2.2
* (bropat) Fixed status led setting for floodlight (T8420)
* (bropat) Fixed motion detected setting for floodlight (T8420)
* (bropat) Fixed motion detected sensitivity setting for floodlight (T8420)
* (bropat) Fixed audio recording setting for floodlight (T8420)
* (bropat) Fixed enable/disable device for floodlight (T8420)
* (bropat) Fixed start livestream command for floodlight (T8420)
* (bropat) Fixed issue #79
* (bropat) Fixed issue #66
* (bropat) Fixed some other minor issues
* (bropat) Added docs (:construction:)
* (bropat) Updated versions of the package dependencies

### 1.4.0 (2021-11-22)

* (bropat) Implemented captcha authentication mechanism (API v2)
* (bropat) Fixed issue #69

### 1.3.0 (2021-11-20)

* (bropat) Implemented new encrypted authentication mechanism (API v2)
* (bropat) Dropped old plaintext authentication mechanism (API v1)
* (bropat) Fixed issue #67
* (bropat) Exchanged axios with got for HTTP/2 support

**Note:** If you have 2FA enabled, you will need to authenticate again after this update.

### 1.2.4 (2021-11-17)

* (bropat) Fixed issue #63

### 1.2.3 (2021-11-16)

* (bropat) Fixed issue #64
* (bropat) Fixed issue #65
* (bropat) Updated versions of the package dependencies

### 1.2.2 (2021-11-06)

* (bropat) Fixed issue of wrong channel value on event rtsp livestream stopped
* (bropat) Updated versions of the package dependencies

### 1.2.1 (2021-10-23)

* (bropat) Changed event detection for start/stop local RTSP streaming
* (bropat) Fixed regression introduced by fixing issue #51
* (bropat) Fixed new implementation that detects interrupted p2p streams
* (bropat) Fixed missing start/stop local RTSP streaming commands to hasCommand and getCommands

### 1.2.0 (2021-10-17)

* (bropat) Extended p2p implementation to better support solo cameras and other battery powered devices
* (bropat) Revised p2p implementation to send commands sequentially
* (bropat) Added support for Floodlight T8422
* (bropat) Added support for SoloCam E40 (T8131)
* (bropat) Added experimental feature for supported devices: start/stop local RTSP streaming
* (bropat) Added new properties for solo cameras: battery, batteryTemperature, wifiSignalLevel, state, chargingStatus, lastChargingDays, lastChargingRecordedEvents, lastChargingTotalEvents, batteryUsageLastWeek
* (bropat) Implemented interrupted p2p stream detection
* (bropat) Fixed issue #51
* (bropat) Fixed push notifications for solo cameras (motion and person detection)
* (bropat) Fixed "livestream stopped" if live stream is started for multiple devices of the same station (1 p2p session could start only 1 live stream at a time)
* (bropat) Fixed "download finished" if download is started for multiple devices of the same station (1 p2p session could start only 1 download at a time)
* (bropat) Fixed an issue where the P2P connection type PREFER_LOCAL did not attempt to connect if no local IP address was found
* (bropat) Updated versions of the package dependencies

### 1.1.2 (2021-08-19)

* (bropat) Fixed push notification issue on new indoor outdoor camera device (thx to @lenoxys)
* (bropat) Fixed issue where device doesn't support p2p connection

### 1.1.1 (2021-08-13)

* (bropat) Fixed p2p video streaming for some devices (fallback mechanism implemented)
* (bropat) Fixed p2p audio codec detection

### 1.1.0 (2021-08-11)

* (bropat) Added brightness light setting for 2c/2c pro cameras, new solo cameras and new outdoor cameras
* (bropat) Added enable/disable light setting for 2c/2c pro cameras, new solo cameras and new outdoor cameras
* (bropat) Added trigger/reset alarm sound for indoor cameras, solo cameras and floodlight cameras
* (bropat) Added video streaming quality setting for 2c pro cameras
* (bropat) Added video recording quality setting for 2c pro cameras
* (bropat) Added trigger alarm sound for indoor cameras, solo cameras (incl. new) and floodlight cameras
* (bropat) Added reset alarm sound for indoor cameras, solo cameras (incl. new) and floodlight cameras
* (bropat) Added battery charging state for keypad devices
* (bropat) Added new property "batteryIsCharging" for keypad devices
* (bropat) Added property "wifiRssi" for keypad devices
* (bropat) Added new property "nightvision" for devices supporting the "light" nightvision mode
* (bropat) Added new properties "switchModeWithAccessCode", "autoEndAlarm" and "turnOffAlarmWithButton" for station with registered keypad
* (bropat) Added default values for some properties that, if not set first, were not listed in the cloud response
* (bropat) Fixed issue with guard mode setting where the "Off" state was not handled correctly (only supported with keypad) (#27)
* (bropat) Fixed issue in class EufySecurity if start cloud stream command fails
* (bropat) Fixed issue with "locked" event for locks
* (bropat) Fixed issue with nightvision setting for devices with light (b&w, light, off)
* (bropat) Fixed issue in station property value conversion for number or boolean types
* (bropat) Fixed issue where "motionDetection" property was incorrectly updated instead of "motionDetected" when a push notification arrived
* (lenoxys) Handle Lock Push Event for Lock / Unlock #36

### 1.0.0 (2021-08-07)

* (bropat) Added new method "getSensorHistory" to HTTPApi class for getting entry sensor history data
* (bropat) Added new events "station connect" and "station close" to EufySecurity class
* (bropat) Added new "chargingStatus", "wifiSignalLevel", "rtspStreamUrl", "chirpVolume", "chirpTone", "videoHdr", "videoDistortionCorrection" and "videoRingRecord" properties for supported devices
* (bropat) Added enable/disable led setting for camera 1 products
* (bropat) Added motion detection sensitivity setting for camera 1 products and wired doorbell
* (bropat) Added motion detection type setting for camera 1 products
* (bropat) Added motion audio recording setting for camera 1 products and wired doorbell
* (bropat) Added ringtone volume setting for wired doorbell
* (bropat) Added enable/disable indoor chime setting for wired doorbell
* (bropat) Added notification ring setting for wired doorbell
* (bropat) Added notification motion setting for wired doorbell
* (bropat) Added video streaming quality setting for wired doorbell
* (bropat) Added video recording quality setting for wired doorbell
* (bropat) Added video HDR setting for wired doorbell
* (bropat) Added video distortion correction setting for wired doorbell
* (bropat) Added video ring recording setting for wired doorbell
* (bropat) Added notification type setting for camera 1 products, solo cameras and wired doorbell
* (bropat) Added chirp volume setting for entry sensor
* (bropat) Added chirp tone setting for entry sensor
* (bropat) Implemented queuing of p2p commands in class P2PClientProtocol if connection to station isn't already present
* (bropat) Renamed some properties for typo issues
* (bropat) Renamed some properties to correct the use of camelcase
* (bropat) Fixed issue where data was not updated (cloud and p2p polling)
* (bropat) Fixed issue with resetting api_base when changing credentials
* (bropat) Fixed some issues with clearing timeouts in class P2PClientProtocol
* (bropat) Fixed issue in class P2PClientProtocol not detecting video codec for some devices (#)
* (bropat) Fixed event "rtsp url" returning the url value containing nulls "\0"
* (bropat) Updated versions of the package dependencies

### 0.9.4 (2021-07-23)

* (bropat) Fixed regression on p2p connection timeout and reconnect tentatives
* (bropat) Updated versions of the package dependencies

### 0.9.3 (2021-07-20)

* (bropat) Fixed p2p livestream video regression
* (bropat) Merged #22 - Add custom modes in alarm mode (thx to @piitaya)

### 0.9.1 (2021-07-17)

* (bropat) Exported some missing error classes and types
* (bropat) Checking valid direction values for panAndTilt command

### 0.9.0 (2021-07-16)

* (bropat) **Breaking Change** Station/EufySecurity "guard mode" event changed to emit only the guard mode
* (bropat) Added Station/EufySecurity "current mode" event that emits only the current mode change
* (bropat) Added more Eufy Cloud error codes to "ResponseErrorCode"
* (bropat) Added more server push notification types to "ServerPushEvent"
* (bropat) Added pan an tilt functionality to supported indoor cameras
* (bropat) Added functionality to handle invitations on "HTTPApi"
* (bropat) Added error detection if stopping or starting stream that isn't running or already running
* (bropat) Added new setting "acceptInvitations" to "EufySecurity" to accept invitations automatically
* (bropat) Added floodlight camera light switch
* (bropat) Added motion detection sensitivity for indoor cameras, solo cameras, floodlight cameras, camera 2 products and battery doorbells
* (bropat) Added motion detection type for indoor cameras, solo cameras, floodlight cameras, camera 2 products and battery doorbells
* (bropat) Added motion tracking for indoor camera pan & tilt cameras
* (bropat) Added video stream quality setting for indoor cameras, solo cameras, floodlight cameras and battery doorbell
* (bropat) Added video recording quality setting for indoor cameras
* (bropat) Added WDR setting for battery doorbells
* (bropat) Added microphone mute setting for indoor cameras, solo cameras, floodlight cameras, camera 2 products and battery doorbells
* (bropat) Added audio recording setting for indoor cameras, solo cameras, floodlight cameras, camera 2 products and battery doorbells
* (bropat) Added enable/disable speaker setting for indoor cameras, solo cameras, floodlight cameras, camera 2 products
* (bropat) Added speaker volume setting for indoor cameras, solo cameras, floodlight cameras, camera 2 products and battery doorbells
* (bropat) Added power source setting for camera 2 products cameras, eufy cameras and eufy E cameras
* (bropat) Added power working mode setting for solo cameras, camera 2 products, battery doorbells, eufy cameras and eufy E cameras
* (bropat) Added power custom working mode recording clip length setting for solo cameras, floodlight cameras, camera 2 products, battery doorbells, eufy cameras and eufy E cameras
* (bropat) Added power custom working mode recording retrigger interval setting for solo cameras, floodlight cameras, camera 2 products, battery doorbells, eufy cameras and eufy E cameras
* (bropat) Added power custom working mode recording ends if motion stops setting for solo cameras, floodlight cameras, camera 2 products, battery doorbells, eufy cameras and eufy E cameras
* (bropat) Added video streaming quality setting for indoor cameras, solo cameras, floodlight cameras and battery doorbells
* (bropat) Added video recording quality setting for indoor 2k cameras
* (bropat) Added motion detection sensitivity setting for indoor cameras, floodlight cameras and camera 2 products
* (bropat) Added enable/disable motion tracking setting for indoor pan & tilt cameras
* (bropat) Added motion detection type setting for indoor cameras, solo cameras, floodlight cameras, camera 2 products and battery doorbells
* (bropat) Added enable/disable WDR setting for battery doorbells
* (bropat) Added ringtone volume setting for battery doorbells
* (bropat) Added enable/disable chime indoor setting for battery doorbells
* (bropat) Added enable/disable chime homebase setting for battery doorbells
* (bropat) Added chime homebase ringtone volume setting for battery doorbells
* (bropat) Added chime homebase ringtone type setting for battery doorbells
* (bropat) Added notification type setting for solo cameras, floodlight cameras, camera 2 products, battery doorbells, eufy cameras and eufy E cameras
* (bropat) Added enable/disable person notification setting for indoor cameras
* (bropat) Added enable/disable pet notification setting for indoor cameras
* (bropat) Added enable/disable all other motion notification setting for indoor cameras
* (bropat) Added enable/disable all sound notification setting for indoor cameras
* (bropat) Added enable/disable crying notification setting for indoor cameras
* (bropat) Added enable/disable motion notification setting for battery doorbells
* (bropat) Added enable/disable ring notification setting for battery doorbells
* (bropat) Added trigger alarm sound for camera 2 products
* (bropat) Added reset alarm sound for camera 2 products
* (bropat) Added trigger alarm sound for homebase 1+2
* (bropat) Added reset alarm sound for homebase 1+2
* (bropat) Added alarm tone setting for homebase 1+2
* (bropat) Added alarm volume setting for homebase 1+2
* (bropat) Added prompt volume setting for homebase 1+2
* (bropat) Added time format setting for homebase 1+2
* (bropat) Added enable/disable switch mode app notification setting for homebase 1+2
* (bropat) Added enable/disable switch mode geofence notification setting for homebase 1+2
* (bropat) Added enable/disable switch mode schedule notification setting for homebase 1+2
* (bropat) Added enable/disable switch mode keypad notification setting for homebase 1+2
* (bropat) Added enable/disable start alarm delay notification setting for homebase 1+2
* (bropat) Added new floodlight, solo and outdoor cameras (untested!)
* (bropat) Added alarm event for Station
* (bropat) Picture url attribute is now also updated via push notifications
* (bropat) Fixed issue where the "pollingIntervalMinutes" setting of "EufySecurity" was not respected
* (bropat) Fixed p2p livestream for floodlight camera
* (bropat) Fixed p2p enable/disable device for floodlight camera
* (bropat) Fixed p2p enable/disable autonightvision for floodlight camera
* (bropat) Fixed p2p download video
* (bropat) Fixed P2PClientProtocol "close" event that was emitted even if there was no connection and a reconnection was attempted
* (bropat) Fixed "guard mode" and "current mode" event not emittet in some conditions
* (bropat) Fixed possible race conditions processing unordered p2p packets
* (bropat) Optimized p2p lookup functionality
* (bropat) Other small bugfixes and code cleanup
* (bropat) Updated versions of the package dependencies

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

Copyright (c) 2021-2024 bropat <patrick.broetto@gmail.com>

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
