export const IpcChannels = {
  getState: 'xueke:getState',
  timerStart: 'xueke:timer:start',
  timerPause: 'xueke:timer:pause',
  timerResume: 'xueke:timer:resume',
  timerSkip: 'xueke:timer:skip',
  tasksList: 'xueke:tasks:list',
  tasksCreate: 'xueke:tasks:create',
  tasksUpdate: 'xueke:tasks:update',
  tasksDelete: 'xueke:tasks:delete',
  tasksSetCurrent: 'xueke:tasks:setCurrent',
  settingsGet: 'xueke:settings:get',
  settingsUpdate: 'xueke:settings:update',
  statsToday: 'xueke:stats:today',
  timerTick: 'xueke:timer:tick',
  timerPhaseEnded: 'xueke:timer:phaseEnded',
  dataChanged: 'xueke:data:changed',
  storeError: 'xueke:store:error',
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
