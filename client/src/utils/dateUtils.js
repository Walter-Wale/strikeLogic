/**
 * Date utility helpers
 */

/**
 * Format a dayjs object to YYYY-MM-DD string
 * @param {import('dayjs').Dayjs} date
 * @returns {string}
 */
export function formatDate(date) {
  return date.format("YYYY-MM-DD");
}
