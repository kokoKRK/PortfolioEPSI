const AUDIO_EXTENSION = /\.(mp3|wav)$/i;

export function isAudioFile(file: File): boolean {
  return (
    AUDIO_EXTENSION.test(file.name) ||
    file.type === "audio/mpeg" ||
    file.type === "audio/wav" ||
    file.type === "audio/x-wav"
  );
}

async function readAllDirectoryEntries(
  reader: FileSystemDirectoryReader
): Promise<FileSystemEntry[]> {
  const entries: FileSystemEntry[] = [];
  let batch: FileSystemEntry[];

  do {
    batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    entries.push(...batch);
  } while (batch.length > 0);

  return entries;
}

async function traverseFileTree(
  entry: FileSystemEntry,
  files: File[]
): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      (entry as FileSystemFileEntry).file(resolve, reject);
    });
    if (isAudioFile(file)) {
      files.push(file);
    }
    return;
  }

  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const children = await readAllDirectoryEntries(reader);
    await Promise.all(children.map((child) => traverseFileTree(child, files)));
  }
}

export async function collectAudioFilesFromDataTransfer(
  dataTransfer: DataTransfer
): Promise<File[]> {
  const files: File[] = [];
  const items = dataTransfer.items;

  if (items && items.length > 0) {
    const entries = Array.from(items)
      .map((item) => item.webkitGetAsEntry())
      .filter((entry): entry is FileSystemEntry => entry !== null);

    await Promise.all(entries.map((entry) => traverseFileTree(entry, files)));
  } else {
    for (const file of Array.from(dataTransfer.files)) {
      if (isAudioFile(file)) {
        files.push(file);
      }
    }
  }

  return dedupeFiles(files);
}

export function collectAudioFilesFromFileList(fileList: FileList | null): File[] {
  if (!fileList) return [];
  return dedupeFiles(
    Array.from(fileList).filter(isAudioFile)
  );
}

function dedupeFiles(files: File[]): File[] {
  const seen = new Set<string>();
  return files.filter((file) => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
