# Description

This adapter allows to control [Eufy security devices](https://us.eufylife.com/collections/security) by connecting to the Eufy cloud servers and local/remote stations.

You need to provide your Cloud login credentials. The adapter connects to your cloud account and polls for all device data via HTTPS. Now a local or remote P2P connection to the Eufy stations/devices is also supported, as well as an MQTT event notification subscription for some devices. However, a connection to the Eufy Cloud is always a prerequisite.

One Adapter instance will show all devices from one Eufy Cloud account and allows to control them.
