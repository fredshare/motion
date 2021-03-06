/* @flow */

export const MESSAGES = {
  ENOENT: 'File or directory not found',
  NOT_MOTION_APP: 'Unable to run, directory is not a motion app',
  ALREADY_EXECUTING: 'Another instance of motion is already running that directory in the same process',
  ALREADY_MOTION_APP: 'Directory is already a motion app'
}

// Note: This is generating automatically from MESSAGES
export const ERROR_CODE = {}
for (const name of Object.keys(MESSAGES)) {
  ERROR_CODE[name] = name
}

export class MotionError extends Error {
  code: string;
  motion: boolean;

  constructor(code: string) {
    super(MESSAGES[code])
    this.code = code
    this.motion = true
  }
}
