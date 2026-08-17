/**
 * Reads an error message out of react-hook-form's nested errors object by dotted
 * path, since the library does not export its own path getter. Used for errors that
 * sit on a container (an array or object) rather than on a registered input, which
 * `useController` would otherwise never surface.
 */
export const messageAtPath = (
  errors: unknown,
  path: string,
): string | undefined => {
  let node: unknown = errors

  for (const segment of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[segment]
  }

  if (typeof node !== 'object' || node === null || !('message' in node)) {
    return undefined
  }

  const { message } = node as { message?: unknown }
  return typeof message === 'string' ? message : undefined
}
