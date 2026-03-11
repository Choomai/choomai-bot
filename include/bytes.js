/**
 * Convert bytes to human-readable size string
 * @param {number} bytes 
 * @param {number} decimals 
 * @returns {string}
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return "0 bytes";
    const k = 1024;
    const dm = decimals || 2;
    const sizes = ["bytes", "KiB", "MiB", "GiB", "TiB", "PiB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(dm) + " " + sizes[i];
}

module.exports = {
    formatBytes
};
