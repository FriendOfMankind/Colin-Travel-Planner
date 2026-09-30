/* dates.mjs — calendar arithmetic on ISO dates (YYYY-MM-DD), in UTC so a
   time zone can never move a day. */

/** Same day-of-month, n months earlier, clamped to that month's last day
    (Mar 31 minus 1 month is Feb 28, not Mar 3). This is how a rolling
    N-month booking window is counted back from the first night. */
export function monthsBefore(iso, n) {
  const y = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1 - n, d = +iso.slice(8, 10);
  const first = new Date(Date.UTC(y, m, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d, last))).toISOString().slice(0, 10);
}
