function parseTime(timeStr) {
    if (!timeStr) return;
    let time = 0;
    let match = timeStr.match(/(\d+)(s|m|h|d)/g);
    for (let i = 0; i < match.length; i++) {
        let value = parseInt(match[i].slice(0, -1));
        let unit = match[i].slice(-1);
        switch (unit) {
            case 's': time += value; break;
            case 'm': time += value * 60; break;
            case 'h': time += value * 60 * 60; break;
            case 'd': time += value * 60 * 60 * 24; break;
        }
    }
    return time * 1000;
}
function formatTime(ms) {
    let seconds = ms / 1000;
    const days = Math.floor(seconds / (24*60*60));
    seconds -= days * 24 * 60 * 60;
    const hours = Math.floor(seconds / (60*60));
    seconds -= hours * 60 * 60;
    const minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;
    return [
        (days ? days + "d" : null),
        (hours ? hours + "h" : null),
        (minutes ? minutes + "m" : null),
        (seconds ? seconds.toFixed() + "s" : null)
    ].join(" ").trim();
}

module.exports = {
    parseTime, formatTime
};
