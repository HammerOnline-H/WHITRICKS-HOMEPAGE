export type LogType = 'info' | 'error';

export const addLog = (msg: string, type: LogType = 'info') => {
  const event = new CustomEvent('app-log', { detail: { msg, type } });
  window.dispatchEvent(event);
  if (type === 'error') console.error(`[DEBUG] ${msg}`);
  else console.log(`[DEBUG] ${msg}`);
};
