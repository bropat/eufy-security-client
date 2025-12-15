import {ensureError, BaseError} from "../error";

describe('Error file', () => {
    test('Try to ensure error from string to error object', () => {
        const errorObject = ensureError("Error message")
        expect(errorObject).toBeInstanceOf(Error);
        expect(errorObject.message).toBe("This value was thrown as is, not through an Error: \"Error message\"");
    });

    test('Pass a base error and return it the same', () => {
            const testError = new BaseError("my error");
            const errorObject = ensureError(testError);
            expect(errorObject).toBe(testError);
            expect(errorObject.message).toBe("my error");
        }
    )
});