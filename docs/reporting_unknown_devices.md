# Reporting Unknown Devices

When eufy-security-client encounters a device type it does not recognize, it logs a warning message:

```
New unknown device detected
```

This log entry contains important information needed to add support for your device. If you see this message, please open a [GitHub issue](https://github.com/max246/eufy-security-client/issues/new?template=unknown_device.yml) and include the details below.

## How to extract the log

1. **Restart the integration** so the device discovery runs again and the log message is emitted.

2**Search your logs** for the text `New unknown device detected`. The log line will include a JSON object with the following fields:

   | Field              | Description                          |
   |--------------------|--------------------------------------|
   | `device_type`      | Numeric device type identifier       |
   | `device_sn`        | Device serial number                 |
   | `device_name`      | Device name as shown in the eufy app |
   | `device_model`     | Device model string                  |
   | `station_sn`       | Serial number of the base station    |
   | `main_sw_version`  | Firmware / software version          |
   | `main_hw_version`  | Hardware version                     |
   | `params`           | Raw device parameters                |

Example of logs:

```
eufy_dev  | 2026-02-28 17:35:16.837	WARN	eufy-security-ws:eufy-security-client	[main] [EufySecurity.handleDevices] New unknown device detected {
eufy_dev  |   device_type: 94,
eufy_dev  |   device_sn: 'T82145xxxxx',
eufy_dev  |   device_name: 'Doorbell',
eufy_dev  |   device_model: 'T8214',
eufy_dev  |   station_sn: 'T803xxxx',
eufy_dev  |   main_sw_version: '3.2.3.0',
eufy_dev  |   main_hw_version: 'P2',
eufy_dev  |   params: 
eufy_dev  |    [
eufy_dev  |      {
eufy_dev  |        param_id: 0,
eufy_dev  |        device_sn: 'T82145xxxxx',
eufy_dev  |        param_type: 1202,
eufy_dev  |        param_value: '0',
eufy_dev  |        create_time: 1772299070,
eufy_dev  |        update_time: 1772299070,
eufy_dev  |        status: 1 
eufy_dev  |      },


```

4. **Copy the full log entry** including all the fields listed above.

## What to include in the GitHub issue

When opening an issue, please provide:

- The **full log line** containing `New unknown device detected` and all the associated fields.
- The **device name and model** as shown in the eufy Security app.
- A **brief description** of the device (e.g. "Indoor camera", "Video doorbell", "Floodlight camera").
- The **eufy-security-client version** you are using.

> **Privacy note:** The `device_sn` and `station_sn` fields contain serial numbers. You may redact part of them (e.g. `T8010N23********`) if you prefer, but please keep enough characters to identify the device series.

## Example log output

```
[main] New unknown device detected {
  device_type: 180,
  device_sn: "T8010N2300000000",
  device_name: "My New Camera",
  device_model: "T8010",
  station_sn: "T8010P0000000000",
  main_sw_version: "2.2.2.6",
  main_hw_version: "2.2",
  params: { ... }
}
```