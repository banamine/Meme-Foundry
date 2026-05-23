/**
 * Meme Foundry - Custom Error Classes
 */

class MemeFoundryError extends Error {
  constructor(message, code = 'UNKNOWN') {
    super(message);
    this.name = 'MemeFoundryError';
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

class StorageError extends MemeFoundryError {
  constructor(message, code = 'STORAGE_ERROR') {
    super(message, code);
    this.name = 'StorageError';
  }
}

class ExportError extends MemeFoundryError {
  constructor(message, code = 'EXPORT_ERROR') {
    super(message, code);
    this.name = 'ExportError';
  }
}

class RenderError extends MemeFoundryError {
  constructor(message, code = 'RENDER_ERROR') {
    super(message, code);
    this.name = 'RenderError';
  }
}

class WorkerError extends MemeFoundryError {
  constructor(message, code = 'WORKER_ERROR') {
    super(message, code);
    this.name = 'WorkerError';
  }
}

class ValidationError extends MemeFoundryError {
  constructor(message, code = 'VALIDATION_ERROR', details = []) {
    super(message, code);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class MediaError extends MemeFoundryError {
  constructor(message, code = 'MEDIA_ERROR', mediaType = null) {
    super(message, code);
    this.name = 'MediaError';
    this.mediaType = mediaType;
  }
}

class NetworkError extends MemeFoundryError {
  constructor(message, code = 'NETWORK_ERROR', statusCode = null) {
    super(message, code);
    this.name = 'NetworkError';
    this.statusCode = statusCode;
  }
}

export {
  MemeFoundryError,
  StorageError,
  ExportError,
  RenderError,
  WorkerError,
  ValidationError,
  MediaError,
  NetworkError
};