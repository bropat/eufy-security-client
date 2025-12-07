import { Category } from "typescript-logging-category-style";
export declare class ParameterHelper {
    static readValue(serialNumber: string, type: number, value: string, log: Category): string | undefined;
    static writeValue(type: number, value: string): string;
}
