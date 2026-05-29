import { describe, test, expect } from "vitest";
import { parseTime, formatTime } from "../include/time.js";
import { formatBytes } from "../include/bytes.js";

describe("Time", () => {
    test("Parse time strings", () => {
        expect(parseTime("30m")).toBe(30 * 60 * 1000);
        expect(parseTime("2h")).toBe(2 * 60 * 60 * 1000);
        expect(parseTime("30m10s")).toBe(30 * 60 * 1000 + 10 * 1000);
        expect(parseTime("1h15m")).toBe(1 * 60 * 60 * 1000 + 15 * 60 * 1000);
        expect(parseTime("13h8m7s")).toBe(13 * 60 * 60 * 1000 + 8 * 60 * 1000 + 7 * 1000);
    });
    test("Throw on invalid input", () => {
        expect(() => parseTime("invalid")).toThrow();
        expect(() => parseTime("10x")).toThrow();
    });
    test("Format milliseconds to readable time", () => {
        expect(formatTime(1 * 60 * 60 * 1000)).toBe("1h");
        expect(formatTime(30 * 60 * 1000 + 30 * 1000)).toBe("30m 30s");
        expect(formatTime(2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000)).toBe("2d 3h");
    });
});

describe("Bytes", () => {
    test("Format bytes to readable size", () => {
        expect(formatBytes(1024)).toBe("1.00 KiB");
        expect(formatBytes(1048576)).toBe("1.00 MiB");
        expect(formatBytes(1073741824)).toBe("1.00 GiB");
        expect(formatBytes(1429365116109)).toBe("1.30 TiB");
        expect(formatBytes(0)).toBe("0 bytes");
        expect(formatBytes(13082007)).toBe("12.48 MiB");
    });
});