import {libVersion} from "../index";
import { version } from '../../package.json';


describe('Test index file', () => {


    test('Ensure the version is extracted', () => {
        expect(libVersion).toBe(version);
    });
});