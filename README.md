# eufy-security-client

![Logo](img/eufy-security.png)

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

This shared library allows to control Eufy security devices by connecting to the Eufy cloud servers.

You need to provide your Cloud login credentials.

One client instance will show all devices from one Eufy Cloud account and allows to control them.

## Features

* Connects to Eufy cloud (supports 2fa)
* Connects to station/devices using p2p communication (supported: local and remote connectivity)
* Supports receiving push notification (unified push messages interface)
* Basic P2P implementation that supports also commands not already implemented
* Get info and parameters from stations/devices over https/p2p
* P2P functionality already implemented:
  * Station:
    * Change guard mode
    * Reboot station
  * Devices:
    * Start livestream (p2p or rtmp over cloud)
    * Stop livestream (p2p or rtmp over cloud)
    * Enable/disable device
    * Enable/disable auto night vision (only camera products)
    * Enable/disable led (only camera 2 products, indoor cameras, floodlight camera and solo cameras)
    * Enable/disable anti-theft detection (only camera 2 products)
    * Change video watermark setting (only camera products)

## Documentation

* WIP

## Known working devices

* HomeBase (T8001)
* HomeBase E (T8002)
* HomeBase 2 (T8010)
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

If more devices work (or also not) please report them by opening a GitHub issue.

## How to report issues and feature requests

Please use GitHub issues for this.

## Changelog

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
