// Runs before the test workers start, so every worker inherits a fixed timezone.
// Europe/London has daylight saving changes, which the date tests rely on.
module.exports = () => {
  process.env.TZ = 'Europe/London';
};
