export default (window, Date) => {
    if (!('performance' in window)) {
        window.performance = {};
    }

    if (!('now' in window.performance)) {
        const now = Date.now || (() => (new Date).getTime());

        let nowOffset = now();

        if (performance.timing && performance.timing.navigationStart) {
            nowOffset = performance.timing.navigationStart;
        }

        window.performance.now = () => now() - nowOffset;
    }
};
