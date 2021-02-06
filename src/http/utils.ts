export const isGreaterMinVersion = function(minimal_version: string, current_version: string): boolean {
    if (minimal_version === undefined)
        minimal_version = "";
    if (current_version === undefined)
        current_version = "";

    minimal_version = minimal_version.replace(/\D+/g, "");
    current_version = current_version.replace(/\D+/g, "");

    if (minimal_version === "")
        return false;
    if (current_version === "")
        return false;

    let min_version = 0;
    let curr_version = 0;

    try {
        min_version = Number.parseInt(minimal_version);
    } catch (error) {
    }
    try {
        curr_version = Number.parseInt(current_version);
    } catch (error) {
    }

    if (curr_version === 0 || min_version === 0 || curr_version < min_version) {
        return false;
    }
    return true;
}

export const pad = function(num: number): string {
    const norm = Math.floor(Math.abs(num));
    return (norm < 10 ? "0" : "") + norm;
};

export const getTimezoneGMTString = function(): string {
    const tzo = -new Date().getTimezoneOffset();
    const dif = tzo >= 0 ? "+" : "-";
    return `GMT${dif}${pad(tzo / 60)}:${pad(tzo % 60)}`
}