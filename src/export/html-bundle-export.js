// CHANGE the export method signature:
// FROM:
async export(options = {}) {

// TO:
async export(format, options = {}) {
  // format is 'html' - kept for interface consistency
  const {
    inlineAssets = true,
    // ... rest of options