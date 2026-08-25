const PREFIX = ":";

export function isRemotePath(path) {
  return path.startsWith(PREFIX);
}

export function unwrapRemotePath(path) {
  return path.slice(PREFIX.length);
}

export function validateRemotePath(path) {
  if (!isRemotePath(path)) {
    throw new Error("path must be remote (prefix it with :)");
  }

  const remote = unwrapRemotePath(path);
  if (remote.split("/").includes("..")) {
    throw new Error("remote path must not contain ..");
  }
  if (remote.includes("\0")) {
    throw new Error("remote path must not contain a null byte");
  }
  return remote;
}
