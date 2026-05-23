/**
 * Execute export based on format
 */
async executeExport(job) {
  const { format, options = {} } = job.config;
  
  // Create abort controller
  const controller = new AbortController();
  this.abortControllers.set(job.id, controller);
  
  try {
    let result;
    
    switch (format) {
      case 'png':
      case 'jpeg':
      case 'webp':
        result = await this.imageExport.export(format, {
          ...options,
          signal: controller.signal,
          onProgress: (progress) => {
            job.progress = progress;
            this.emit('export:progress', job);
          }
        });
        break;
        
      case 'mp4':
      case 'webm':
        result = await this.videoExport.export(format, {
          ...options,
          signal: controller.signal,
          onProgress: (progress) => {
            job.progress = progress;
            this.emit('export:progress', job);
          }
        });
        break;
        
      case 'html':
        result = await this.htmlExport.export({
          ...options,
          onProgress: (progress) => {
            job.progress = progress;
            this.emit('export:progress', job);
          }
        });
        break;
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    // Generate filename
    result.filename = this.filenameGen.generate(job.config);
    
    // Trigger download if requested
    if (options.download !== false) {
      await this.downloadExport(result);
    }
    
    return result;
    
  } finally {
    this.abortControllers.delete(job.id);
  }
}