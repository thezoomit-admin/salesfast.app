// Records what the API client reports about reachability.
export const reports = [];
export const reportReachable = () => reports.push('reachable');
export const reportUnreachable = () => reports.push('unreachable');
