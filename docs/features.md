# Features

* Connects to Eufy cloud (supports 2fa)
* Connects to station/devices using p2p communication (supported: local and remote connectivity)
* Connects to Eufy MQTT broker for event notification for some devices
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
