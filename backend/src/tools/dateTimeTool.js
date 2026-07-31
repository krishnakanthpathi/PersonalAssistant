export const getCurrentTimeTool = {
  definition: {
    name: 'get_current_time',
    description: 'Get the exact current system date, day of the week, local time, and timezone.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  async execute() {
    const now = new Date();
    return {
      success: true,
      iso: now.toISOString(),
      local: now.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'full' }),
      date: now.toDateString(),
      time: now.toTimeString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }
};
