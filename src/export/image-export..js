// All export methods should return:
return {
  blob,           // Blob
  filename,       // string
  format,         // mime type string
  width,          // number
  height,         // number
  size,           // bytes
  thumbnail: {    // optional
    blob,
    width,
    height,
    dataUrl
  }
};