export const zhCN = {
  appName: '学刻',
  nav: { focus: '专注台', tasks: '任务', today: '今日', settings: '设置' },
  timer: { start: '开始', pause: '暂停', resume: '继续', skip: '跳过', mini: '悬浮小窗', expand: '展开主窗口', noTask: '未绑定任务', cycleProgress: '本轮已完成 {completed} / {interval} 次专注', ready: '准备好后开始这一段专注。', paused: '计时已暂停。', running: '保持专注，稳步推进。', currentTask: '当前任务：{title}' },
  rest: { shortTitle: '短休时间', longTitle: '长休时间', shortHint: '离开屏幕、活动一下肩颈，稍后再继续。', longHint: '让大脑真正放松一会儿，再回来继续推进。', paused: '休息已暂停。', skip: '跳过并开始专注', continue: '继续休息' },
  task: { create: '新建任务', edit: '编辑', unbind: '取消当前任务', title: '任务名称', note: '备注（可选）', save: '保存', cancel: '取消', empty: '还没有任务，先创建一个吧。' },
  today: { completed: '完成番茄', minutes: '专注分钟', empty: '完成一次专注后，这里会显示统计。', summary: '{count} 个番茄 · {minutes} 分钟' },
  settings: { title: '设置', focus: '专注时长（分钟）', shortBreak: '短休时长（分钟）', longBreak: '长休时长（分钟）', interval: '长休间隔（完成番茄数）', notification: '阶段结束时通知', sound: '阶段结束时提示音', restSound: '休息期间声音', quiet: '安静', music: '背景音乐', save: '保存设置', presets: '专注方案', presetsHint: '选择一个方案即可同时设置专注和休息节奏；之后仍可按你的习惯调整。', builtin: '内置方案', mine: '我的方案', apply: '应用', current: '当前使用', savePreset: '保存当前设置为方案', updatePreset: '更新方案', presetName: '方案名称', cancelEdit: '取消编辑', edit: '编辑', delete: '删除', noPresets: '还没有自定义方案。', presetSummary: '每次专注 {focus} 分钟 · 短休 {shortBreak} 分钟 · 长休 {longBreak} 分钟 · 每完成 {interval} 次专注后长休', deepWork: '深度开发 / AI 项目', development: '日常开发', learning: '课程学习 / 跟练', writing: '写作与整理', errands: '碎片事务', lowEnergy: '低精力启动' },
  feedback: { timerUpdated: '计时状态已更新。', taskCreated: '任务已创建。', taskUpdated: '任务已更新。', taskDeleted: '任务已删除。', currentTaskSet: '已设为当前任务。', currentTaskCleared: '已取消当前任务。', settingsSaved: '设置已保存。', presetApplied: '方案已应用到当前设置。', presetCreated: '自定义方案已保存。', presetUpdated: '自定义方案已更新。', presetDeleted: '自定义方案已删除。' },
} as const
