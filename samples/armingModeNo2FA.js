'use strict';
const { GuardMode } = require('eufy-security-client/build/http/types');
const { EufySecurity } = require('eufy-security-client');

class armingModeNo2FA {
    constructor() {}

    async setGuardState(armMode) {
        console.log('waf');

        const config = {
            country: 'nl',
            username: 'xxxx',
            password: 'xxxx',
        };
        const stationSN = 'xxxxx';

        const eufy = new EufySecurity(config);
        let resultMessage = 'resultMessage';
        if (await eufy.connect()) {
            await eufy.refreshData();
            return new Promise((resolve) => {
                eufy
                    .getStation(stationSN) //get SN from use eufy.getStations
                    .on('connect', (station) => {
                        let currentMode = station.getGuardMode().value;
                        if (currentMode === armMode) {
                            resultMessage = 'Nothing to change, eufy guard mode already: ' + armMode;
                            station.close();
                        } else {
                            station.setGuardMode(armMode);
                        }
                    })
                    .on('guard mode', (station) => {
                        let currentModeInt = station.getGuardMode().value;
                        let currentModeName = GuardMode[currentModeInt];
                        resultMessage = 'guard mode changed to:' + currentModeName;
                        console.log(resultMessage);
                        station.close();
                    })
                    .on('close', () => {
                        console.log(resultMessage);
                        resolve(resultMessage);
                    });
            });
        }
    }
}

module.exports = armingModeNo2FA;

let run = new armingModeNo2FA();
run.setGuardState(GuardMode.DISARMED);
