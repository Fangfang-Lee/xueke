export const zhCN = {
  appName: '学刻',
  nav: { focus: '专注台', tasks: '任务', today: '今日', settings: '设置' },
  timer: { start: '开始', pause: '暂停', resume: '继续', skip: '跳过', noTask: '未绑定任务', cycleProgress: '本轮已完成 {completed} / {interval} 次专注', ready: '准备好后开始这一段专注。', paused: '计时已暂停。', running: '保持专注，稳步推进。', currentTask: '当前任务：{title}' },
  task: { create: '新建任务', edit: '编辑', unbind: '取消当前任务', title: '任务名称', note: '备注（可选）', save: '保存', cancel: '取消', empty: '还没有任务，先创建一个吧。' },
  today: { completed: '完成番茄', minutes: '专注分钟', empty: '完成一次专注后，这里会显示统计。', summary: '{count} 个番茄 · {minutes} 分钟' },
  settings: { title: '设置', focus: '专注时长（分钟）', shortBreak: '短休时长（分钟）', longBreak: '长休时长（分钟）', interval: '长休间隔（完成番茄数）', notification: '阶段结束时通知', sound: '阶段结束时提示音', save: '保存设置' },
} as const
