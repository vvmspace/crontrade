function mockLog(): void {
  return;
}

export const clog = (process.env.CONSOLE && console.log) || mockLog;
