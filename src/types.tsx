export type blobDict = {
    [key: string]: { chunks: { blob: Blob; chunkOrder: number }[] };
  };